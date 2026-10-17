// Thin fetch wrapper around the OctaSec API. Attaches the JWT, parses JSON,
// and throws an Error carrying the server message + status on failure.
// same-origin by default (nginx / local-serve / the vite dev proxy all route /api to the API)
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

export async function api(method, path, body) {
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
    throw new Error("Network error — is the API running?");
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    // a signed-in request that fails auth: let the provider sign out / force a password change
    if (token && onAuthError && !path.startsWith("/auth/login") && !path.startsWith("/auth/register")) {
      const code = data && data.code;
      if (res.status === 401 || code === "ACCOUNT_DISABLED" || code === "COMPANY_SUSPENDED" || code === "PASSWORD_CHANGE_REQUIRED") {
        onAuthError(res.status, code, err.message);
      }
    }
    throw err;
  }
  return data;
}

export const get = (p) => api("GET", p);
export const post = (p, b) => api("POST", p, b);
export const patch = (p, b) => api("PATCH", p, b);
export const del = (p) => api("DELETE", p);
