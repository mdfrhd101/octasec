// Single mail gateway. Connect a real mail server by setting SMTP_* in .env
// (see docs/EMAIL_AND_PASSWORD_RESET.md §4). Without SMTP (local dev) mail is
// printed to the API console instead of being sent; MAIL_DEV_OUTBOX=<file>
// additionally appends each message as a JSON line (used by the test suite).
import fs from "node:fs";
import nodemailer from "nodemailer";

const env = (k) => (process.env[k] || "").trim();
export const mailConfigured = () => !!env("SMTP_HOST");
export const appUrl = () => (env("APP_URL") || "http://127.0.0.1:3000").replace(/\/+$/, "");

let transport = null;
function smtp() {
  if (transport) return transport;
  const port = Number(env("SMTP_PORT") || 587);
  const secure = env("SMTP_SECURE") ? env("SMTP_SECURE") === "true" : port === 465;
  transport = nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port,
    secure,                         // 465: implicit TLS
    requireTLS: !secure,            // 587: STARTTLS is mandatory, never plaintext
    auth: env("SMTP_USER") ? { user: env("SMTP_USER"), pass: process.env.SMTP_PASS || "" } : undefined,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true, // message content can never pull local files / URLs
  });
  return transport;
}

const from = () => env("MAIL_FROM") || (env("SMTP_USER") ? `OctaSec <${env("SMTP_USER")}>` : "OctaSec <no-reply@localhost>");

/** Send one email. Throws on SMTP failure — callers decide whether that is fatal. */
export async function sendMail({ to, subject, text, html }) {
  if (mailConfigured()) {
    return smtp().sendMail({ from: from(), to, subject, text, html });
  }
  // never print live links on a real deployment: production, or any public https APP_URL
  if (process.env.NODE_ENV === "production" || env("APP_URL").startsWith("https://")) {
    throw new Error("SMTP is not configured — email not sent");
  }
  // development fallback — never in production
  console.log(`\n[mail:dev] (SMTP not configured — not sent)\n  to: ${to}\n  subject: ${subject}\n${text.split("\n").map((l) => "  | " + l).join("\n")}\n`);
  const outbox = env("MAIL_DEV_OUTBOX");
  if (outbox) fs.appendFileSync(outbox, JSON.stringify({ to, subject, text, at: new Date().toISOString() }) + "\n");
  return { dev: true };
}

/** Check SMTP login/TLS without sending. */
export async function verifyMail() {
  if (!mailConfigured()) throw new Error("SMTP_HOST is not set");
  return smtp().verify();
}

// escape for the HTML part (values are ours, but never trust a display name)
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
