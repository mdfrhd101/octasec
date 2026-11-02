import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { auth } from "../services/index.js";
import AuthShell from "../components/AuthShell.jsx";

const COPY = {
  login: ["Sign in", "Manage your domains, assets and scans."],
  forgot: ["Reset your password", "Enter your account email and we will send you a password-reset link."],
  register: ["Create your account", "Get started with the OctaSec portal."],
};

export default function Login() {
  const { login, register, notice } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [sent, setSent] = useState("");
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "", org: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (mode === "forgot") { setSent((await auth.forgotPassword(f.email.trim())).message); return; }
      if (mode === "login") await login(f.email.trim(), f.password);
      else { setSent(await register({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), password: f.password, orgName: f.org.trim() })); setF((s) => ({ ...s, password: "" })); }
      // AuthProvider sets user → App swaps to the shell
    } catch (e2) {
      setErr(e2.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="login-title">{COPY[mode][0]}</h1>
      <p className="login-sub">{COPY[mode][1]}</p>
      <form onSubmit={submit}>
        {mode === "register" && (
          <div className="fgrid">
            <label>Name<input type="text" value={f.name} onChange={set("name")} placeholder="Your name" required /></label>
            <label>Phone<input type="tel" value={f.phone} onChange={set("phone")} placeholder="+8801…" /></label>
          </div>
        )}
        <label>Email<input type="email" value={f.email} onChange={set("email")} placeholder="you@company.com" required /></label>
        {mode !== "forgot" && <label>Password<input type="password" value={f.password} onChange={set("password")} placeholder="••••••••" minLength={8} required /></label>}
        {mode === "login" && (
          <div className="login-forgot">
            <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setErr(""); setSent(""); setMode("forgot"); }}>Forgot password?</a>
          </div>
        )}
        {sent && <div className="form-ok" role="status">{sent}</div>}
        {mode === "register" && (
          <label>Company name<input type="text" value={f.org} onChange={set("org")} placeholder="Company name" /></label>
        )}
        {err ? <div className="form-err" role="alert">{err}</div> : notice ? <div className="form-err" role="alert">{notice}</div> : null}
        <button className="btn gold" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset link" : "Create account"}
        </button>
      </form>
      <div className="login-roles">
        <span className="lbl">{mode === "login" ? "No account?" : "Have an account?"}</span>
        <div className="rolebtns">
          <button type="button" onClick={() => { setErr(""); setSent(""); setMode(mode === "login" ? "register" : "login"); }}>
            {mode === "login" ? "Create one" : "Sign in instead"}
          </button>
        </div>
      </div>
      <p className="login-note">New accounts are client-tier. Corporate/admin access is granted by OctaSec.</p>
    </AuthShell>
  );
}
