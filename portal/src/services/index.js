// Portal API service layer — every backend endpoint the portal uses, grouped by area.
// Each function documents: METHOD /api/path · body → response.
// Full contract: docs/DEVELOPER_GUIDE.md §API and docs/PORTAL_FRONTEND_PLAN.md §3.
//
// HOW TO ADD AN ENDPOINT
//   1. add a function to the matching object below (or a new file + export here)
//   2. call it from the screen:  import { domains } from "../services";  await domains.update(id, {...})
//   3. errors are ApiError {message, status, code}; isNotImplemented(e) → show "not available yet"
import { http, seg, qs } from "./http.js";
export { ApiError, isNotImplemented, setToken, getToken, setAuthErrorHandler } from "./http.js";

/* ---------------- auth & own account ---------------- */
export const auth = {
  /** GET /auth/me → { user } */
  me: () => http.get("/auth/me"),
  /** POST /auth/login {email,password} → { token, user } */
  login: (email, password) => http.post("/auth/login", { email, password }),
  /** POST /auth/register {email,password,orgName,name,...} → { message } (account stays pending until email confirmed) */
  register: (payload) => http.post("/auth/register", payload),
  /** POST /auth/verify-email {token} → { token, user } */
  verifyEmail: (token) => http.post("/auth/verify-email", { token }),
  /** POST /auth/forgot-password {email} → { message } (always 200 — no account enumeration) */
  forgotPassword: (email) => http.post("/auth/forgot-password", { email }),
  /** POST /auth/reset-password {token,newPassword} → { ok } */
  resetPassword: (token, newPassword) => http.post("/auth/reset-password", { token, newPassword }),
  /** POST /auth/change-password {currentPassword,newPassword} → { token, user } */
  changePassword: (currentPassword, newPassword) => http.post("/auth/change-password", { currentPassword, newPassword }),
  /** POST /auth/logout → { ok } (revokes every session of this user) */
  logout: () => http.post("/auth/logout"),
  /** GET /auth/profile → { profile, completeness }  (self-serve client's organisation) */
  getProfile: () => http.get("/auth/profile"),
  /** PATCH /auth/profile {profile} → { profile, completeness } */
  updateProfile: (profile) => http.patch("/auth/profile", { profile }),
};

/* ---------------- dashboard ---------------- */
export const dashboard = {
  /** GET /dashboard → role-specific posture/ops payload (see DEVELOPER_GUIDE §Dashboards) */
  get: () => http.get("/dashboard"),
};

/* ---------------- domains ---------------- */
export const domains = {
  /** GET /domains?owner=all|self|<clientId> → { domains: [...{assetCount}] } */
  list: (owner = "all") => http.get("/domains" + qs({ owner })),
  /** POST /domains {name, ownerType, clientId?, label, env, criticality, contact, tags, notes} → 201 { domain } */
  create: (body) => http.post("/domains", body),
  /** PATCH /domains/:id {label?, env?, criticality?, contact?, tags?, notes?} → { domain } */
  update: (id, details) => http.patch(`/domains/${seg(id)}`, details),
  /** PATCH /domains/:id {ownerType:"self"|"client", clientId?} → { domain } (client → client needs company_admin + re-verify) */
  assignOwner: (id, ownerType, clientId) => http.patch(`/domains/${seg(id)}`, { ownerType, clientId }),
  /** POST /domains/:id/verify → { verified, domain } | 422 { verified:false, reason } */
  verify: (id) => http.post(`/domains/${seg(id)}/verify`),
  /** DELETE /domains/:id → { ok } (removes its assets, cancels open scans) */
  remove: (id) => http.del(`/domains/${seg(id)}`),
};

/* ---------------- assets ---------------- */
export const assets = {
  /** GET /assets?domainId= → { assets } */
  list: (domainId) => http.get("/assets" + qs({ domainId, limit: 200 })),
  /** POST /assets {domainId, host} → 201 { asset } (host must be the domain or a subdomain; domain verified) */
  create: (domainId, host) => http.post("/assets", { domainId, host }),
  /** POST /assets/discover {domainId} → { discovered, assets, mock } */
  discover: (domainId) => http.post("/assets/discover", { domainId }),
  /** DELETE /assets/:id → { ok } | 409 while a scan is open on the domain */
  remove: (id) => http.del(`/assets/${seg(id)}`),
};

/* ---------------- clients (company tier) ---------------- */
export const clients = {
  /** GET /clients → { clients } */
  list: () => http.get("/clients"),
  /** GET /clients/:id → { client, domains, ... } */
  get: (id) => http.get(`/clients/${seg(id)}`),
  /** POST /clients {name, profile, authorization, ...} → 201 { client } */
  create: (body) => http.post("/clients", body),
  /** PATCH /clients/:id {...} → { client } */
  update: (id, body) => http.patch(`/clients/${seg(id)}`, body),
};

/* ---------------- company (organisation + staff) ---------------- */
export const company = {
  /** GET /company/profile → { company, profile, completeness } */
  getProfile: () => http.get("/company/profile"),
  /** PATCH /company/profile {profile} → { company, profile, completeness } (company_admin) */
  updateProfile: (profile) => http.patch("/company/profile", { profile }),
  employees: {
    /** GET /company/employees → { employees } */
    list: () => http.get("/company/employees"),
    /** POST /company/employees {email,name,phone} → 201 { employee, inviteSent } */
    invite: (body) => http.post("/company/employees", body),
    /** PATCH /company/employees/:id {name?, phone?} → { employee } */
    update: (id, body) => http.patch(`/company/employees/${seg(id)}`, body),
    /** PATCH /company/employees/:id {status:"active"|"disabled"} → { employee } */
    setStatus: (id, status) => http.patch(`/company/employees/${seg(id)}`, { status }),
    /** POST /company/employees/:id/reset-password → { emailSent } */
    resetPassword: (id) => http.post(`/company/employees/${seg(id)}/reset-password`),
    /** DELETE /company/employees/:id → { ok } */
    remove: (id) => http.del(`/company/employees/${seg(id)}`),
  },
};

/* ---------------- engagements (scans & reports, tenant side) ---------------- */
export const engagements = {
  /** GET /engagements?status=open|delivered|... → { engagements } (counts only) */
  list: (status) => http.get("/engagements" + qs({ status })),
  /** GET /engagements/:id → { engagement } (findings only once delivered; includes retests[]) */
  get: (id) => http.get(`/engagements/${seg(id)}`),
  /** POST /engagements {domainId, roe, scoping} → 201 { engagement } */
  request: (body) => http.post("/engagements", body),
  /** POST /engagements/:id/cancel → { ok } (only while "requested") */
  cancel: (id) => http.post(`/engagements/${seg(id)}/cancel`),
  /** PATCH /engagements/:id/findings/:fid {state:"open"|"fixed"|"accepted_risk", note?} → { finding } */
  setFindingState: (id, fid, state, note = "") => http.patch(`/engagements/${seg(id)}/findings/${seg(fid)}`, { state, note }),
  /** POST /engagements/:id/retest {findingIds} → 201 { engagement:{id,kind:"retest"} } (findings must be "fixed") */
  requestRetest: (id, findingIds) => http.post(`/engagements/${seg(id)}/retest`, { findingIds }),
};

/* ---------------- support tickets ---------------- */
export const tickets = {
  /** GET /tickets?status= → { tickets } (super_admin: all tenants) */
  list: (status) => http.get("/tickets" + qs({ status })),
  /** GET /tickets/:id → { ticket } */
  get: (id) => http.get(`/tickets/${seg(id)}`),
  /** POST /tickets {subject, body, priority, category} → 201 { ticket } */
  open: (body) => http.post("/tickets", body),
  /** POST /tickets/:id/messages {body} → { ticket } */
  reply: (id, body) => http.post(`/tickets/${seg(id)}/messages`, { body }),
  /** PATCH /tickets/:id {status} → { ticket } (super_admin) */
  setStatus: (id, status) => http.patch(`/tickets/${seg(id)}`, { status }),
};

/* ---------------- API keys — BACKEND PENDING ----------------
   Contract (docs/PORTAL_FRONTEND_PLAN.md §3). Today the API answers 501
   NOT_IMPLEMENTED and the page shows "not available yet". When implemented:
     GET    /company/api-keys          → { keys: [{ id, name, prefix, scopes, createdAt, lastUsedAt }] }
     POST   /company/api-keys {name, scopes} → 201 { key: {...}, secret }   (secret shown ONCE)
     DELETE /company/api-keys/:id      → { ok }                               */
export const apiKeys = {
  list: () => http.get("/company/api-keys"),
  create: (name, scopes = ["read"]) => http.post("/company/api-keys", { name, scopes }),
  revoke: (id) => http.del(`/company/api-keys/${seg(id)}`),
};

/* ---------------- super admin ---------------- */
export const admin = {
  /** GET /admin/stats → platform counters */
  stats: () => http.get("/admin/stats"),
  companies: {
    /** GET /admin/companies → { companies } */
    list: () => http.get("/admin/companies"),
    /** GET /admin/companies/:id → { company, users, ... } */
    get: (id) => http.get(`/admin/companies/${seg(id)}`),
    /** POST /admin/companies {name, adminEmail, adminName, profile} → 201 { company, admin, inviteSent } */
    create: (body) => http.post("/admin/companies", body),
    /** PATCH /admin/companies/:id {status:"active"|"suspended"} → { company } */
    setStatus: (id, status) => http.patch(`/admin/companies/${seg(id)}`, { status }),
    /** PATCH /admin/companies/:id/profile {profile} → { company } */
    updateProfile: (id, profile) => http.patch(`/admin/companies/${seg(id)}/profile`, { profile }),
    /** DELETE /admin/companies/:id → { ok } (cascades all tenant data) */
    remove: (id) => http.del(`/admin/companies/${seg(id)}`),
  },
  users: {
    /** GET /admin/users?role= → { users } */
    list: (role) => http.get("/admin/users" + qs({ role })),
    /** PATCH /admin/users/:id {status} → { user } */
    setStatus: (id, status) => http.patch(`/admin/users/${seg(id)}`, { status }),
    /** POST /admin/users/:id/reset-password → { emailSent } */
    resetPassword: (id) => http.post(`/admin/users/${seg(id)}/reset-password`),
    /** DELETE /admin/users/:id → { ok } */
    remove: (id) => http.del(`/admin/users/${seg(id)}`),
  },
  engagements: {
    /** GET /admin/engagements?status=open|delivered|...&limit= → { engagements } */
    list: (status, limit) => http.get("/admin/engagements" + qs({ status, limit })),
    /** GET /admin/engagements/:id → { engagement } (full, incl. review state + retestFindings) */
    get: (id) => http.get(`/admin/engagements/${seg(id)}`),
    /** POST /admin/engagements/:id/<assign|run|sync|sign|reject> {reason?} → { engagement } */
    action: (id, verb, body) => http.post(`/admin/engagements/${seg(id)}/${seg(verb)}`, body),
    /** POST /admin/engagements/:id/findings/:fid {decision:"verified"|"rejected", note} → { engagement } */
    review: (id, fid, decision, note = "") => http.post(`/admin/engagements/${seg(id)}/findings/${seg(fid)}`, { decision, note }),
  },
  leads: {
    /** GET /admin/leads → { leads } */
    list: () => http.get("/admin/leads"),
    /** PATCH /admin/leads/:id {status} → { lead } */
    setStatus: (id, status) => http.patch(`/admin/leads/${seg(id)}`, { status }),
  },
  /** GET /admin/audit?action=&q=&from=&to=&page= → { logs, total, ... } */
  audit: (params) => http.get("/admin/audit" + qs(params)),
};
