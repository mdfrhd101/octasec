import { useEffect, useState, useRef, useCallback, useMemo, createContext, useContext } from "react";

export const Tile = ({ k, v, gold }) => (
  <div className="card tile"><div className="k">{k}</div><div className="v">{gold ? <em>{v}</em> : v}</div></div>
);

export function StatusChip({ status }) {
  if (status === "clean") return <span className="chip green">Clean</span>;
  if (status === "findings") return <span className="chip warn">Findings</span>;
  if (status === "scanning") return <span className="chip gold">Scanning</span>;
  return <span className="chip dim">Unscanned</span>;
}

export const Sev = ({ s }) => (
  <span className={"sev " + s}>{s === "high" ? "High" : s === "medium" ? "Medium" : "Low"}</span>
);

export const Spinner = () => <span className="spin" aria-label="loading" />;

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

// open modals, innermost last — Escape closes only the top one (a dialog over a form)
const modalStack = [];
export function Modal({ title, sub, children, onClose, wide }) {
  const me = useRef({});
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const token = me.current;
    modalStack.push(token);
    const h = (e) => { if (e.key === "Escape" && modalStack[modalStack.length - 1] === token && closeRef.current) closeRef.current(); };
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); modalStack.splice(modalStack.indexOf(token), 1); };
  }, []);
  return (
    // long forms (wide) don't close on a stray backdrop click — use X / Cancel / Esc
    <div className="modal" onMouseDown={(e) => !wide && e.target === e.currentTarget && onClose && onClose()}>
      <div className={"modal-card card" + (wide ? " wide" : "")} role="dialog" aria-modal="true">
        {onClose && (
          <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        )}
        {title && <h3>{title}</h3>}
        {sub && <p className="sub">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

export function CopyBox({ label, value }) {
  const copy = (e) => {
    const btn = e.currentTarget;
    try { navigator.clipboard.writeText(value); } catch {}
    btn.textContent = "Copied"; setTimeout(() => (btn.textContent = "Copy"), 1200);
  };
  return (
    <div className="codebox">
      {label ? <span className="fn">{label}</span> : null}
      {label ? "=" : ""}{value}
      <button className="copy" onClick={copy}>Copy</button>
    </div>
  );
}

/* ---------- app-wide feedback: toasts + styled confirm / prompt dialogs ----------
   const ui = useUI();
   ui.toast("Saved");  ui.toast(err.message, "err");
   if (!(await ui.confirm({ title: "Remove x?", body: "…", confirmLabel: "Remove", danger: true }))) return;
   const reason = await ui.prompt({ title: "Reject", label: "Reason", required: true, multiline: true }); // null = cancelled
   await ui.run(() => domains.remove(id), "Domain removed");   // toast on success / failure, returns ok:boolean */
const UICtx = createContext(null);
export const useUI = () => useContext(UICtx);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const seq = useRef(0);

  const toast = useCallback((msg, kind = "ok") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" ? 6000 : 3200);
  }, []);
  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ type: "confirm", ...opts, resolve })), []);
  const prompt = useCallback((opts) => new Promise((resolve) => setDialog({ type: "prompt", ...opts, resolve })), []);
  const run = useCallback(async (fn, okMsg) => {
    try { await fn(); if (okMsg) toast(okMsg); return true; }
    catch (e) { toast(e.message || "Something went wrong", "err"); return false; }
  }, [toast]);
  const value = useMemo(() => ({ toast, confirm, prompt, run }), [toast, confirm, prompt, run]);

  const close = (v) => { dialog?.resolve(v); setDialog(null); };
  return (
    <UICtx.Provider value={value}>
      {children}
      {dialog && <Dialog d={dialog} onDone={close} />}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={"toast " + t.kind}>
            <span className="tic" aria-hidden="true">{t.kind === "err" ? "!" : "✓"}</span>{t.msg}
          </div>
        ))}
      </div>
    </UICtx.Provider>
  );
}

function Dialog({ d, onDone }) {
  const [v, setV] = useState(d.initial || "");
  const isPrompt = d.type === "prompt";
  const cancel = () => onDone(isPrompt ? null : false);
  const ok = (e) => {
    e.preventDefault();
    if (isPrompt) { if (d.required && !v.trim()) return; onDone(v.trim()); } else onDone(true);
  };
  return (
    <Modal title={d.title} onClose={cancel}>
      <form onSubmit={ok} className="dlg">
        {d.body && <p className="dlg-body">{d.body}</p>}
        {isPrompt && (
          <label>{d.label}{d.required && <span className="req">*</span>}
            {d.multiline
              ? <textarea rows={3} autoFocus value={v} maxLength={d.maxLength || 500} placeholder={d.placeholder || ""} onChange={(e) => setV(e.target.value)} />
              : <input autoFocus value={v} maxLength={d.maxLength || 200} placeholder={d.placeholder || ""} onChange={(e) => setV(e.target.value)} />}
          </label>
        )}
        <div className="dlg-act">
          <button type="button" className="btn ghost sm" onClick={cancel}>{d.cancelLabel || "Cancel"}</button>
          <button type="submit" autoFocus={!isPrompt} className={"btn sm " + (d.danger ? "danger solid" : "gold")} disabled={isPrompt && d.required && !v.trim()}>
            {d.confirmLabel || (isPrompt ? "Save" : "Confirm")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** horizontal-scroll container so wide tables never clip on phones */
export const TableWrap = ({ children }) => <div className="tbl-wrap">{children}</div>;

/** "Not available yet" panel for screens whose backend endpoint is still pending (501). */
export function Pending({ title = "Not available yet", children }) {
  return (
    <div className="pending">
      <b>{title}</b>
      <p>{children}</p>
    </div>
  );
}

/** inline error with a retry button (load failures) */
export function LoadError({ msg, onRetry }) {
  return (
    <div className="loaderr">
      <span>{msg}</span>
      {onRetry && <button className="btn ghost sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}
