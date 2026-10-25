import SslAlert from "../models/SslAlert.js";
import Domain from "../models/Domain.js";
import User from "../models/User.js";
import { sendMail } from "../utils/mailer.js";
import { resolvePublicTarget } from "../utils/ssrfFetch.js";
import { inspectCertificate } from "./websiteCheck.js";

export function dueAlertThreshold(days) {
  if (days === null || days === undefined) return null;
  if (days < 0) return -1;
  const eligible = [30, 14, 7, 1].filter((t) => days <= t);
  return eligible.length ? Math.min(...eligible) : null;
}

async function checkHost(hostname) {
  const target = await resolvePublicTarget(`https://${hostname}`);
  return inspectCertificate(target);
}

let running = false;
export async function runSslAlerts({ checker = checkHost, mailer = sendMail } = {}) {
  if (running) return { skipped: true };
  running = true;
  let checked = 0;
  let sent = 0;
  try {
    const alerts = await SslAlert.find({ enabled: true }).limit(1000);
    for (const alert of alerts) {
      const domain = await Domain.findById(alert.domainId);
      if (!domain || !domain.verified) {
        alert.enabled = false;
        await alert.save();
        continue;
      }
      checked++;
      try {
        const cert = await checker(domain.name);
        const trustError = cert.checked && (!cert.authorized || !cert.hostnameMatch)
          ? cert.authorizationError || "Certificate hostname mismatch"
          : "";
        const error = cert.checked ? trustError : cert.error || "TLS inspection failed";
        alert.lastCheckedAt = new Date();
        alert.daysRemaining = cert.daysRemaining ?? null;
        alert.lastError = String(error || "").slice(0, 300);
        const threshold = error ? -2 : dueAlertThreshold(alert.daysRemaining);
        const key = threshold === null ? "" : threshold === -2 ? `error:${alert.lastError.slice(0, 80)}` : `expiry:${threshold}`;
        if (key && key !== alert.lastAlertKey) {
          const user = await User.findById(domain.userId).select("email").lean();
          const to = domain.contact && domain.contact.includes("@") ? domain.contact : user?.email;
          if (to) {
            const subject = threshold === -2 ? `[OctaSec] TLS problem on ${domain.name}` : `[OctaSec] SSL certificate alert for ${domain.name}`;
            const detail = threshold === -2
              ? `TLS validation failed: ${alert.lastError}`
              : threshold < 0
                ? "The certificate has expired. Renew and deploy it immediately."
                : `The certificate expires in ${alert.daysRemaining} day(s). Renew it before expiry.`;
            await mailer({ to, subject, text: `OctaSec SSL alert\n\nDomain: ${domain.name}\n${detail}\nChecked: ${alert.lastCheckedAt.toISOString()}\n\nDisable alerts in the OctaSec portal under Domains.` });
            alert.lastAlertKey = key;
            sent++;
          }
        }
        await alert.save();
      } catch (e) {
        alert.lastCheckedAt = new Date();
        alert.lastError = String(e.message || e).slice(0, 300);
        await alert.save();
      }
    }
    return { checked, sent };
  } finally {
    running = false;
  }
}

export function startSslAlertScheduler() {
  const timer = setInterval(() => runSslAlerts().catch((e) => console.error("[ssl-alerts]", e.message)), 24 * 60 * 60 * 1000);
  timer.unref();
  setTimeout(() => runSslAlerts().catch((e) => console.error("[ssl-alerts]", e.message)), 60000).unref();
}
