// Thin fetch wrapper around the OctaSec API. Attaches the JWT, parses JSON,
// and throws an Error carrying the server message + status on failure.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";

let token = null;
try { token = localStorage.getItem("octasec_token"); } catch {}

export function setToken(t) {
  token = t;
  try { t ? localStorage.setItem("octasec_token", t) : localStorage.removeItem("octasec_token"); } catch {}
}
export function getToken() { return token; }

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
    throw err;
  }
  return data;
}

export const get = (p) => api("GET", p);
export const post = (p, b) => api("POST", p, b);
export const patch = (p, b) => api("PATCH", p, b);
export const del = (p) => api("DELETE", p);
