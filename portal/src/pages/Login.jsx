import { useState } from "react";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "", org: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (mode === "login") await login(f.email.trim(), f.password);
      else await register({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), password: f.password, orgName: f.org.trim() });
      // AuthProvider sets user → App swaps to the shell
    } catch (e2) {
      setErr(e2.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card card">
        <div className="brand">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16v-8L8 2.5Z" stroke="#e8c15a" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M8.5 12.2 11 14.8 15.6 9.4" stroke="#e8c15a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          OCTASEC <span>PORTAL</span>
        </div>
        <p className="login-sub">
          {mode === "login" ? "Sign in to manage your domains, assets and scans." : "Create your account to get started."}
        </p>
        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="fgrid">
              <label>Name<input type="text" value={f.name} onChange={set("name")} placeholder="Your name" required /></label>
              <label>Phone<input type="tel" value={f.phone} onChange={set("phone")} placeholder="+8801…" /></label>
            </div>
          )}
          <label>Email<input type="email" value={f.email} onChange={set("email")} placeholder="you@company.com" required /></label>
          <label>Password<input type="password" value={f.password} onChange={set("password")} placeholder="••••••••" minLength={8} required /></label>
          {mode === "register" && (
            <label>Company name<input type="text" value={f.org} onChange={set("org")} placeholder="Company name" /></label>
          )}
          {err && <div className="form-err">{err}</div>}
          <button className="btn gold" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="login-roles">
          <span className="lbl">{mode === "login" ? "No account?" : "Have an account?"}</span>
          <div className="rolebtns">
            <button type="button" onClick={() => { setErr(""); setMode(mode === "login" ? "register" : "login"); }}>
              {mode === "login" ? "Create one" : "Sign in instead"}
            </button>
          </div>
        </div>
        <p className="login-note">New accounts are client-tier. Corporate/admin access is granted by OctaSec · <a href="/">← octasec.ai</a></p>
      </div>
    </div>
  );
}
