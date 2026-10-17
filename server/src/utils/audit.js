import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";

// Bound meta so a caller can never balloon a log entry; strip anything
// that looks sensitive even if a caller passes it by mistake.
const SENSITIVE = /pass|secret|token|hash|authorization|cookie|card|cvv/i;
function safeMeta(meta) {
  if (!meta || typeof meta !== "object") return {};
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(meta)) {
    if (n >= 12) break; // cap number of keys
    if (SENSITIVE.test(k)) continue; // never persist secret-looking fields
    if (v === null || ["string", "number", "boolean"].includes(typeof v)) {
      out[k] = typeof v === "string" ? v.slice(0, 300) : v;
      n++;
    }
  }
  return out;
}

const clientIp = (req) =>
  (req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").toString().slice(0, 60);

/**
 * Append one immutable audit entry. Best-effort: a logging failure is swallowed
 * (console.error) and MUST NOT break the user's action. Awaited for reliability
 * on the happy path.
 *
 * @param {object} req  Express request (for req.user, ip, user-agent)
 * @param {string} action  dotted verb, e.g. "company.create"
 * @param {object} [o]  { targetType, targetId, targetLabel, companyId, meta, actorEmail, actorRole }
 */
export async function audit(req, action, o = {}) {
  try {
    const u = req?.user || {};
    let actorEmail = o.actorEmail || "";
    const actorRole = o.actorRole || u.role || "";
    // JWT carries no email — resolve it best-effort for a useful panel.
    if (!actorEmail && u.id) {
      const doc = await User.findById(u.id).select("email").lean().catch(() => null);
      actorEmail = doc?.email || "";
    }
    await AuditLog.create({
      action: String(action).slice(0, 60),
      actorId: u.id || o.actorId || null,
      actorEmail: actorEmail.slice(0, 160),
      actorRole: String(actorRole).slice(0, 30),
      targetType: (o.targetType || "").toString().slice(0, 40),
      targetId: (o.targetId || "").toString().slice(0, 64),
      targetLabel: (o.targetLabel || "").toString().slice(0, 200),
      companyId: o.companyId || u.companyId || null,
      meta: safeMeta(o.meta),
      ip: clientIp(req),
      ua: (req?.headers?.["user-agent"] || "").toString().slice(0, 200),
    });
  } catch (e) {
    // Audit must never take down the real request.
    console.error("[audit] failed to write entry:", action, e?.message);
  }
}
