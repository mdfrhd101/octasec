// Labels for the organisation-profile + scoping enums (server: utils/profile.js, utils/scoping.js).
export const INDUSTRIES = {
  banking_finance: "Banking & finance", mfs_fintech: "MFS / fintech", insurance: "Insurance",
  ecommerce_retail: "E-commerce & retail", telecom: "Telecom", healthcare: "Healthcare", education: "Education",
  government: "Government", ngo: "NGO / development", software_saas: "Software / SaaS", manufacturing: "Manufacturing",
  logistics: "Logistics", media: "Media", other: "Other",
};
export const SIZES = { "1-10": "1–10", "11-50": "11–50", "51-200": "51–200", "201-1000": "201–1,000", "1000+": "1,000+" };
export const COMPLIANCE = {
  iso27001: "ISO 27001", pci_dss: "PCI DSS", soc2: "SOC 2", bb_ict: "Bangladesh Bank ICT Guideline",
  btrc: "BTRC", gdpr: "GDPR", hipaa: "HIPAA", nist_csf: "NIST CSF",
};
export const DATA_TYPES = { pii: "Personal data (PII)", payment_card: "Payment cards", financial: "Financial records", health: "Health records", credentials: "User credentials" };
export const CONTACTS = {
  primary: ["Primary contact", "Business owner of this relationship — required"],
  technical: ["Technical contact", "Who fixes the findings"],
  security: ["Security / emergency contact (24×7)", "Who we call to stop a test"],
  billing: ["Billing contact", "Invoices"],
};

export const TEST_TYPES = { black: "Black box — no prior knowledge", grey: "Grey box — user accounts provided", white: "White box — docs / code access" };
export const ENVIRONMENTS = { production: "Production", staging: "Staging", development: "Development" };
export const TARGET_TYPES = { web_app: "Web application", api: "API", external_network: "External network", cloud: "Cloud (AWS/Azure/GCP)", mobile_backend: "Mobile app backend" };
export const OBJECTIVES = {
  compliance: "Compliance requirement", pre_launch: "Pre-launch check", periodic: "Periodic assessment",
  post_incident: "After a security incident", customer_requirement: "A customer asked for it", other: "Other",
};

export const emptyContact = () => ({ name: "", title: "", email: "", phone: "" });
export const emptyProfile = () => ({
  legalName: "", tradeName: "", regNo: "", taxId: "", industry: "", size: "", website: "",
  country: "BD", city: "", address: "", timezone: "Asia/Dhaka",
  contacts: { primary: emptyContact(), technical: emptyContact(), security: emptyContact(), billing: emptyContact() },
  compliance: [], dataTypes: [], reportLanguage: "en", notifyCritical: true, notes: "",
});
// merge a stored (possibly partial / null) profile onto the empty shape
export const fillProfile = (p) => {
  const e = emptyProfile();
  if (!p) return e;
  const contacts = Object.fromEntries(Object.keys(e.contacts).map((k) => [k, { ...emptyContact(), ...(p.contacts?.[k] || {}) }]));
  return { ...e, ...p, contacts, compliance: p.compliance || [], dataTypes: p.dataTypes || [] };
};

export const AUTH_CHIP = {
  valid: ["green", "Authorised"],
  expired: ["red", "Authorisation expired"],
  missing: ["warn", "No authorisation"],
};
