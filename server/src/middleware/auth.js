import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Company from "../models/Company.js";

const ALG = ["HS256"]; // pin algorithm — never accept anything else

// While a user must change a temporary password, only these routes are reachable.
const PW_CHANGE_ALLOWED = new Set(["/api/auth/me", "/api/auth/change-password"]);

export function sign(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      companyId: user.companyId ? user.companyId.toString() : null,
      tv: user.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "12h", algorithm: "HS256" }
  );
}

// Verifies the JWT, then re-checks the user against the DB on EVERY request:
// role/companyId come from the DB (never the possibly-stale token), and
// deleted / disabled / revoked / suspended-company sessions are refused.
export async function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ALG });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  try {
    if (!mongoose.isValidObjectId(claims.id)) return res.status(401).json({ error: "Invalid or expired token" });
    const user = await User.findById(claims.id).select("role companyId status tokenVersion mustChangePassword").lean();
    if (!user) return res.status(401).json({ error: "Session no longer valid" });
    if (user.status === "disabled") return res.status(403).json({ error: "Your account is disabled", code: "ACCOUNT_DISABLED" });
    if ((user.status || "active") !== "active") return res.status(403).json({ error: "Confirm your email address first", code: "EMAIL_NOT_VERIFIED" });
    if ((user.tokenVersion || 0) !== (claims.tv || 0)) {
      return res.status(401).json({ error: "Session expired — please sign in again" });
    }
    if (user.companyId) {
      const company = await Company.findById(user.companyId).select("status").lean();
      if (!company) return res.status(401).json({ error: "Session no longer valid" });
      if (company.status === "suspended") {
        return res.status(403).json({ error: "Your company account is suspended. Contact OctaSec.", code: "COMPANY_SUSPENDED" });
      }
    }
    if (user.mustChangePassword && !PW_CHANGE_ALLOWED.has(req.originalUrl.split("?")[0])) {
      return res.status(403).json({ error: "You must change your temporary password first", code: "PASSWORD_CHANGE_REQUIRED" });
    }
    req.user = { id: String(user._id), role: user.role, companyId: user.companyId ? String(user.companyId) : null };
    next();
  } catch (e) {
    next(e);
  }
}

// role guard: requireRole("super_admin") or requireRole("company_admin","employee")
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
