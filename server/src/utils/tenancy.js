import mongoose from "mongoose";

const oid = (v) => new mongoose.Types.ObjectId(String(v));

// A filter that matches NOTHING — _id is always an ObjectId, never null, so
// this fails CLOSED (returns no rows) rather than leaking a whole tier.
const NO_MATCH = { _id: null };

// The query filter that isolates data to the caller's tenant.
//  super_admin            → {}            (sees everything, cross-tenant)
//  company_admin/employee → { companyId } (shared across the whole company)
//  client (self-serve)    → { userId }    (their own data only)
// companyId/id come ONLY from the signed JWT, never from the request body.
// A company user WITHOUT a companyId fails closed — { companyId: null } would
// otherwise match the entire self-serve client tier (companyId absent/null).
export function scopeFor(user) {
  if (user.role === "super_admin") return {};
  if (user.role === "company_admin" || user.role === "employee") {
    return user.companyId ? { companyId: oid(user.companyId) } : NO_MATCH;
  }
  return { userId: oid(user.id) };
}

// Fields to stamp onto a NEW record so it lands in the caller's tenant.
// A company user without a companyId must NOT create records (fail closed).
export function ownerStamp(user) {
  if (user.role === "company_admin" || user.role === "employee") {
    if (!user.companyId) { const e = new Error("No company context"); e.status = 403; throw e; }
    return { userId: oid(user.id), companyId: oid(user.companyId) };
  }
  return { userId: oid(user.id) };
}

export const isCompanyUser = (user) => user.role === "company_admin" || user.role === "employee";
