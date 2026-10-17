// Organisation profile — ONE schema for Company (B2B tenant), Client (MSSP
// sub-account) and the self-serve client user. Requirements and the reason for
// every field: docs/PORTAL_DATA_AND_DASHBOARDS.md §1.
// parseProfile() is the only way a profile gets written: whitelisted keys,
// type-checked, length-capped, enum-checked. Unknown keys are dropped.
import mongoose from "mongoose";

export const INDUSTRIES = [
  "banking_finance", "mfs_fintech", "insurance", "ecommerce_retail", "telecom", "healthcare",
  "education", "government", "ngo", "software_saas", "manufacturing", "logistics", "media", "other",
];
export const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
export const COMPLIANCE = ["iso27001", "pci_dss", "soc2", "bb_ict", "btrc", "gdpr", "hipaa", "nist_csf"];
export const DATA_TYPES = ["pii", "payment_card", "financial", "health", "credentials"];
export const LANGUAGES = ["en", "bn"];
export const CONTACT_KINDS = ["primary", "technical", "security", "billing"];

// strict: no %, ?, &, =, commas or angle brackets (they enable mailto / extra-recipient tricks)
export const EMAIL_RE = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,63}$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const TZ_RE = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/;

/* ---------- mongoose sub-schemas ---------- */
const S = (max) => ({ type: String, trim: true, default: "", maxlength: max });
const contactSchema = new mongoose.Schema(
  { name: S(80), title: S(80), email: S(160), phone: S(20) },
  { _id: false }
);
export const profileSchema = new mongoose.Schema(
  {
    legalName: S(160), tradeName: S(120), regNo: S(60), taxId: S(40),
    industry: { type: String, enum: [...INDUSTRIES, ""], default: "" },
    size: { type: String, enum: [...SIZES, ""], default: "" },
    website: S(200), country: { type: String, default: "BD", maxlength: 2 }, city: S(80), address: S(300),
    timezone: { type: String, default: "Asia/Dhaka", maxlength: 60 },
    contacts: {
      primary: { type: contactSchema, default: () => ({}) },
      technical: { type: contactSchema, default: () => ({}) },
      security: { type: contactSchema, default: () => ({}) },
      billing: { type: contactSchema, default: () => ({}) },
    },
    compliance: { type: [String], enum: COMPLIANCE, default: [] },
    dataTypes: { type: [String], enum: DATA_TYPES, default: [] },
    reportLanguage: { type: String, enum: LANGUAGES, default: "en" },
    notifyCritical: { type: Boolean, default: true },
    notes: S(1000),
  },
  { _id: false }
);

/* ---------- validation ---------- */
class Bad extends Error { constructor(m) { super(m); this.status = 400; } }

// a plain string field: objects/arrays/numbers are rejected (NoSQL-operator defence)
function str(v, label, max, { required = false, min = 0 } = {}) {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw new Bad(`${label} must be text`);
  const s = v.trim();
  if (required && !s) throw new Bad(`${label} is required`);
  if (s && s.length < min) throw new Bad(`${label} is too short`);
  if (s.length > max) throw new Bad(`${label} must be at most ${max} characters`);
  return s;
}
function oneOf(v, label, list, { required = false, fallback = "" } = {}) {
  const s = str(v, label, 40, { required });
  if (!s) return fallback;
  if (!list.includes(s)) throw new Bad(`${label} is not a valid option`);
  return s;
}
function setOf(v, label, list) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > list.length) throw new Bad(`${label} must be a list`);
  for (const x of v) if (typeof x !== "string" || !list.includes(x)) throw new Bad(`${label} has an invalid option`);
  return [...new Set(v)];
}
export function email(v, label, { required = false } = {}) {
  const s = str(v, label, 160, { required });
  if (s && !EMAIL_RE.test(s)) throw new Bad(`${label} is not a valid email`);
  return s.toLowerCase();
}
export function phone(v, label, { required = false } = {}) {
  const s = str(v, label, 20, { required });
  if (s && !PHONE_RE.test(s)) throw new Bad(`${label} is not a valid phone number`);
  return s;
}
function url(v, label) {
  const s = str(v, label, 200);
  if (!s) return "";
  let u;
  try { u = new URL(s); } catch { throw new Bad(`${label} must be a full http(s) URL`); }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Bad(`${label} must be a full http(s) URL`);
  return s;
}
function contact(v, label, { requireNameEmail = false } = {}) {
  if (v !== undefined && v !== null && (typeof v !== "object" || Array.isArray(v))) throw new Bad(`${label} is invalid`);
  const c = v || {};
  return {
    name: str(c.name, `${label} name`, 80, { required: requireNameEmail }),
    title: str(c.title, `${label} title`, 80),
    email: email(c.email, `${label} email`, { required: requireNameEmail }),
    phone: phone(c.phone, `${label} phone`),
  };
}

/** Validate + normalise a profile. Throws an Error with status 400 on bad input. */
export function parseProfile(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Bad("Organisation profile is required");
  const c = input.contacts && typeof input.contacts === "object" && !Array.isArray(input.contacts) ? input.contacts : {};
  if (input.contacts !== undefined && c !== input.contacts) throw new Bad("Contacts are invalid");
  const country = str(input.country, "Country", 2) .toUpperCase() || "BD";
  if (!COUNTRY_RE.test(country)) throw new Bad("Country must be a 2-letter ISO code");
  const timezone = str(input.timezone, "Timezone", 60) || "Asia/Dhaka";
  if (!TZ_RE.test(timezone)) throw new Bad("Timezone is not valid");
  if (input.notifyCritical !== undefined && typeof input.notifyCritical !== "boolean") throw new Bad("Notify-on-critical must be true or false");
  return {
    legalName: str(input.legalName, "Legal name", 160, { required: true, min: 2 }),
    tradeName: str(input.tradeName, "Trade name", 120),
    regNo: str(input.regNo, "Registration no.", 60),
    taxId: str(input.taxId, "TIN / BIN", 40),
    industry: oneOf(input.industry, "Industry", INDUSTRIES, { required: true }),
    size: oneOf(input.size, "Company size", SIZES),
    website: url(input.website, "Website"),
    country,
    city: str(input.city, "City", 80),
    address: str(input.address, "Address", 300),
    timezone,
    contacts: {
      primary: contact(c.primary, "Primary contact", { requireNameEmail: true }),
      technical: contact(c.technical, "Technical contact"),
      security: contact(c.security, "Security contact"),
      billing: contact(c.billing, "Billing contact"),
    },
    compliance: setOf(input.compliance, "Compliance", COMPLIANCE),
    dataTypes: setOf(input.dataTypes, "Data handled", DATA_TYPES),
    reportLanguage: oneOf(input.reportLanguage, "Report language", LANGUAGES, { fallback: "en" }),
    notifyCritical: input.notifyCritical === undefined ? true : input.notifyCritical,
    notes: str(input.notes, "Notes", 1000),
  };
}

/** How complete a profile is — drives the onboarding nudges on dashboards. */
export function completeness(p) {
  const checks = [
    ["Legal name", p?.legalName], ["Industry", p?.industry], ["Website", p?.website],
    ["Primary contact email", p?.contacts?.primary?.email], ["Primary contact phone", p?.contacts?.primary?.phone],
    ["Technical contact email", p?.contacts?.technical?.email],
    ["Security / emergency contact name", p?.contacts?.security?.name], ["Security / emergency contact phone", p?.contacts?.security?.phone],
    ["Compliance frameworks", p?.compliance?.length ? "y" : ""],
  ];
  const missing = checks.filter(([, v]) => !v).map(([k]) => k);
  return { pct: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

/* ---------- client authorisation-to-test (MSSP sub-accounts) ---------- */
export const authorizationSchema = new mongoose.Schema(
  {
    onFile: { type: Boolean, default: false },
    authorizerName: S(80), authorizerTitle: S(80), documentRef: S(80),
    validUntil: { type: Date, default: null },
  },
  { _id: false }
);

export function parseAuthorization(v) {
  if (v === undefined || v === null) return { onFile: false, authorizerName: "", authorizerTitle: "", documentRef: "", validUntil: null };
  if (typeof v !== "object" || Array.isArray(v)) throw new Bad("Authorisation is invalid");
  if (v.onFile !== undefined && typeof v.onFile !== "boolean") throw new Bad("Authorisation on file must be true or false");
  const onFile = v.onFile === true;
  let validUntil = null;
  const raw = str(v.validUntil, "Valid until", 30);
  if (raw) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(raw) || isNaN(Date.parse(raw))) throw new Bad("Valid until must be a date (YYYY-MM-DD)");
    validUntil = new Date(raw);
  }
  return {
    onFile,
    authorizerName: str(v.authorizerName, "Authoriser name", 80, { required: onFile }),
    authorizerTitle: str(v.authorizerTitle, "Authoriser title", 80, { required: onFile }),
    documentRef: str(v.documentRef, "Document reference", 80),
    validUntil,
  };
}

/** "valid" | "expired" | "missing" — an MSSP may only test a client's assets while "valid". */
export function authorizationState(a, now = new Date()) {
  if (!a?.onFile) return "missing";
  const today = new Date(now); today.setUTCHours(0, 0, 0, 0); // dates are stored as UTC midnight
  if (a.validUntil && new Date(a.validUntil) < today) return "expired";
  return "valid";
}
