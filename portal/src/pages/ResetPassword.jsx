import { useEffect, useState } from "react";
import { auth } from "../services/index.js";
import BrandMark from "../components/BrandMark.jsx";

// Opened from the emailed link: /portal/reset-password?token=…
// The token is read once and immediately removed from the address bar/history.
let captured = null;
function takeToken() {
  if (captured === null) {
    // links carry the token in the #fragment (never sent to a server / access log)
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    captured = hash.get("token") || query.get("token") || "";
    if (captured) window.history.replaceState(null, "", window.location.pathname);
  }
  return captured;
}

export default function ResetPassword() {
  const [token] = useState(takeToken);
  const [f, setF] = useState({ next: "", confirm: "" });
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // the reset link must never leak through a Referer header
    const m = document.createElement("meta");
    m.name = "referrer"; m.content = "no-referrer";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (f.next.length < 8) return setErr("Password must be at least 8 characters");
    if (f.next !== f.confirm) return setErr("The passwords do not match");
    setBusy(true);
    try { await auth.resetPassword(token, f.next); setDone(true); }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  const toLogin = () => { window.location.href = (import.meta.env.BASE_URL || "/"); };

  return (
    <div className="login">
      <div className="login-card card">
        <div className="brand"><BrandMark /> OCTASEC <span>PORTAL</span></div>
        {done ? (
          <>
            <p className="login-sub" style={{ color: "var(--green)" }}>Password updated. Every other session has been signed out.</p>
            <button className="btn gold" onClick={toLogin}>Sign in</button>
          </>
        ) : !token ? (
          <>
            <p className="login-sub">This reset link is incomplete. Open the link from your email again, or request a new one.</p>
            <button className="btn gold" onClick={toLogin}>Back to sign in</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="login-sub">Choose a password for your account (at least 8 characters, not a common password).</p>
            <label>New password<input type="password" value={f.next} onChange={(e) => setF((s) => ({ ...s, next: e.target.value }))} autoComplete="new-password" minLength={8} maxLength={128} required autoFocus /></label>
            <label>Confirm new password<input type="password" value={f.confirm} onChange={(e) => setF((s) => ({ ...s, confirm: e.target.value }))} autoComplete="new-password" minLength={8} maxLength={128} required /></label>
            {err && <div className="form-err">{err}</div>}
            <button className="btn gold" type="submit" disabled={busy}>{busy ? "Saving…" : "Set new password"}</button>
            <p className="login-note"><a href="#" onClick={(e) => { e.preventDefault(); toLogin(); }}>Back to sign in</a></p>
          </form>
        )}
      </div>
    </div>
  );
}
