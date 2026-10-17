import { useEffect } from "react";

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

export function Modal({ title, sub, children, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className="modal-card card">
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
