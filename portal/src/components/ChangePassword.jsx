import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { Modal } from "../ui.jsx";
import BrandMark from "./BrandMark.jsx";

function PasswordForm({ onDone, onCancel, submitLabel = "Change password" }) {
  const { changePassword } = useAuth();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (f.next.length < 8) return setErr("New password must be at least 8 characters");
    if (f.next !== f.confirm) return setErr("The new passwords do not match");
    setBusy(true);
    try { await changePassword(f.current, f.next); onDone && onDone(); }
    catch (e2) { setErr(e2.message || "Could not change password"); setBusy(false); }
  };

  return (
    <form onSubmit={submit}>
      <label>Current password<input type="password" value={f.current} onChange={set("current")} autoComplete="current-password" required autoFocus /></label>
      <label>New password<input type="password" value={f.next} onChange={set("next")} autoComplete="new-password" placeholder="min 8 characters" minLength={8} required /></label>
      <label>Confirm new password<input type="password" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" minLength={8} required /></label>
      {err && <div className="form-err">{err}</div>}
      <div className="mrow">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
        <button className="btn gold" type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}

// shown instead of the app after an admin reset — nothing else is reachable until it's done
export function ForcePasswordChange() {
  const { user, logout } = useAuth();
  return (
    <div className="login">
      <div className="login-card card">
        <div className="brand"><BrandMark /> OCTASEC <span>PORTAL</span></div>
        <p className="login-sub">Your password was reset by an administrator. Choose a new password to continue, {user.email}.</p>
        <PasswordForm submitLabel="Set new password" />
        <p className="login-note"><a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Sign out</a></p>
      </div>
    </div>
  );
}

export function ChangePasswordModal({ onClose }) {
  const [done, setDone] = useState(false);
  return (
    <Modal title="Change password" sub={done ? undefined : "Other signed-in sessions will be signed out."} onClose={onClose}>
      {done ? (
        <>
          <p style={{ color: "var(--green)", fontSize: 14 }}>Password changed.</p>
          <div className="mrow"><button className="btn gold" onClick={onClose}>Done</button></div>
        </>
      ) : (
        <PasswordForm onDone={() => setDone(true)} onCancel={onClose} />
      )}
    </Modal>
  );
}
