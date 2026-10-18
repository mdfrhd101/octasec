import { useEffect, useRef, useState } from "react";
import { auth } from "../services/index.js";
import { useAuth } from "../auth.jsx";
import BrandLockup from "../components/BrandLockup.jsx";

// Opened from the emailed confirmation link: /portal/verify-email#token=…
export default function VerifyEmail() {
  const { adoptSession } = useAuth();
  const [state, setState] = useState("working"); // working | done | failed
  const [err, setErr] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode double-invoke: the token is single-use
    ran.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("token") || "";
    window.history.replaceState(null, "", window.location.pathname); // token never stays in the address bar
    if (!token) { setState("failed"); setErr("This confirmation link is incomplete. Open it from your email again."); return; }
    (async () => {
      try {
        const { token: session, user } = await auth.verifyEmail(token);
        setState("done");
        adoptSession(session, user);
        setTimeout(() => window.location.replace(import.meta.env.BASE_URL || "/"), 900);
      } catch (e) { setState("failed"); setErr(e.message); }
    })();
  }, [adoptSession]);

  return (
    <div className="login">
      <div className="login-card card">
        <div className="brand"><BrandLockup height={26} /> <span>PORTAL</span></div>
        {state === "working" && <p className="login-sub">Confirming your email…</p>}
        {state === "done" && <p className="login-sub" style={{ color: "var(--green)" }}>Email confirmed — your account is active. Taking you to the portal…</p>}
        {state === "failed" && (
          <>
            <p className="login-sub">{err}</p>
            <button className="btn gold" onClick={() => window.location.replace(import.meta.env.BASE_URL || "/")}>Go to sign in</button>
          </>
        )}
      </div>
    </div>
  );
}
