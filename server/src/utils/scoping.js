// Pre-engagement scoping questionnaire (PTES pre-engagement / CREST scoping).
// Requirements: docs/PORTAL_DATA_AND_DASHBOARDS.md §3. We never accept test
// credentials here — only a flag that they will come via a secure channel.
import { phone } from "./profile.js";

export const TEST_TYPES = ["black", "grey", "white"];
export const ENVIRONMENTS = ["production", "staging", "development"];
export const TARGET_TYPES = ["web_app", "api", "external_network", "cloud", "mobile_backend"];
export const OBJECTIVES = ["compliance", "pre_launch", "periodic", "post_incident", "customer_requirement", "other"];

class Bad extends Error { constructor(m) { super(m); this.status = 400; } }

const text = (v, label, max, required = false) => {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw new Bad(`${label} must be text`);
  const s = v.trim();
  if (required && !s) throw new Bad(`${label} is required`);
  if (s.length > max) throw new Bad(`${label} must be at most ${max} characters`);
  return s;
};
const pick = (v, label, list) => {
  const s = text(v, label, 40, true);
  if (!list.includes(s)) throw new Bad(`${label} is not a valid option`);
  return s;
};
const bool = (v, label) => {
  if (v === undefined) return false;
  if (typeof v !== "boolean") throw new Bad(`${label} must be true or false`);
  return v;
};
const int = (v, label, max) => {
  if (v === undefined || v === null || v === "") return 0;
  const n = typeof v === "number" ? v : Number.NaN;
  if (!Number.isInteger(n) || n < 0 || n > max) throw new Bad(`${label} must be a whole number 0–${max}`);
  return n;
};
const date = (v, label, required = false) => {
  const s = text(v, label, 30, required);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s))) throw new Bad(`${label} must be a date (YYYY-MM-DD)`);
  return new Date(s);
};

export function parseScoping(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Bad("Scoping details are required");
  if (!Array.isArray(v.targetTypes) || !v.targetTypes.length) throw new Bad("Choose at least one target type");
  for (const t of v.targetTypes) if (typeof t !== "string" || !TARGET_TYPES.includes(t)) throw new Bad("Target type is not a valid option");
  let apiDocsUrl = text(v.apiDocsUrl, "API docs URL", 200);
  if (apiDocsUrl) {
    let u; try { u = new URL(apiDocsUrl); } catch { throw new Bad("API docs URL must be a full http(s) URL"); }
    if (!["http:", "https:"].includes(u.protocol)) throw new Bad("API docs URL must be a full http(s) URL");
  }
  const preferredStart = date(v.preferredStart, "Preferred start date", true);
  const deadline = date(v.deadline, "Required-by date");
  if (deadline && deadline < preferredStart) throw new Bad("Required-by date must be after the start date");
  const ec = v.emergencyContact && typeof v.emergencyContact === "object" && !Array.isArray(v.emergencyContact) ? v.emergencyContact : {};
  return {
    testType: pick(v.testType, "Test type", TEST_TYPES),
    environment: pick(v.environment, "Environment", ENVIRONMENTS),
    targetTypes: [...new Set(v.targetTypes)],
    userRoles: int(v.userRoles, "Number of user roles", 50),
    testAccountsViaSecureChannel: bool(v.testAccountsViaSecureChannel, "Test accounts"),
    apiDocsUrl,
    wafInPlace: bool(v.wafInPlace, "WAF in place"),
    ipAllowlistOk: bool(v.ipAllowlistOk, "IP allow-listing"),
    preferredStart, deadline,
    objective: pick(v.objective, "Objective", OBJECTIVES),
    maxRps: int(v.maxRps, "Max requests per second", 10000),
    emergencyContact: {
      name: text(ec.name, "Emergency contact name", 80, true),
      phone: phone(ec.phone, "Emergency contact phone", { required: true }),
    },
    notes: text(v.notes, "Scoping notes", 1000),
  };
}
