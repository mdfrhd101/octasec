// The ONE place the portal talks HTTP. Screens never call fetch or build API
// URLs themselves — they import a function from services/*.js.
// Adding / changing an endpoint = edit the matching services/<area>.js file.
//
// Same-origin by default: nginx, deploy/local-serve.mjs and the Vite dev proxy
// all route /api to the Express API.
const BASE = import.meta.env.VITE_API_URL || "/api";

let token = null;
try { token = localStorage.getItem("octasec_token"); } catch {}

export function setToken(t) {
  token = t;
  try { t ? localStorage.setItem("octasec_token", t) : localStorage.removeItem("octasec_token"); } catch {}
}
export function getToken() { return token; }

// AuthProvider registers this so a revoked/expired session (401) or a forced
// password change (403 PASSWORD_CHANGE_REQUIRED) updates the UI everywhere.
let onAuthError = null;
export function setAuthErrorHandler(fn) { onAuthError = fn; }

/** Error thrown for every failed request: message from the API, plus status + code. */
export class ApiError extends Error {
  constructor(message, status = 0, code = "", data = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/** True when the backend has not built this endpoint yet (501 NOT_IMPLEMENTED, or a route that 404s with no body). */
export const isNotImplemented = (e) => e instanceof ApiError && (e.code === "NOT_IMPLEMENTED" || e.status === 501);

/** encode one path segment (ids are user-visible in URLs) */
export const seg = (v) => encodeURIComponent(String(v));

/** build "?a=1&b=2" from an object, skipping empty values */
export function qs(params = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? "?" + s : "";
}

export async function request(method, path, body) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Network error — is the API running?", 0, "NETWORK");
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const code = (data && data.code) || "";
    const err = new ApiError((data && data.error) || `Request failed (${res.status})`, res.status, code, data);
    // a signed-in request that fails auth: let the provider sign out / force a password change
    if (token && onAuthError && !path.startsWith("/auth/login") && !path.startsWith("/auth/register")) {
      if (res.status === 401 || code === "ACCOUNT_DISABLED" || code === "COMPANY_SUSPENDED" || code === "PASSWORD_CHANGE_REQUIRED") {
        onAuthError(res.status, code, err.message);
      }
    }
    throw err;
  }
  return data;
}

export const http = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b),
  patch: (p, b) => request("PATCH", p, b),
  del: (p) => request("DELETE", p),
};
