import { useState } from "react";

const STATUS_CLASS = { open: "warn", in_progress: "gold", resolved: "green", closed: "dim" };
const STATUS_LABEL = { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };

export function TicketStatus({ status }) {
  return <span className={"chip " + (STATUS_CLASS[status] || "dim")}>{STATUS_LABEL[status] || status}</span>;
}

const isStaff = (role) => role === "super_admin";

// Thread + reply box. `onReply(body)` posts a message. `extra` renders above the reply box (e.g. status controls).
export function TicketThread({ ticket, meRole, onReply, extra }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const send = async () => {
    if (!body.trim()) return;
    setBusy(true); setErr("");
    try { await onReply(body.trim()); setBody(""); }
    catch (e) { setErr(e.message || "Failed to send"); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <TicketStatus status={ticket.status} />
        <span className="chip">{ticket.priority}</span>
        <span className="chip dim">{ticket.company}</span>
      </div>
      <div className="thread">
        {ticket.messages.map((m) => {
          const staff = isStaff(m.authorRole);
          return (
            <div key={m._id} className={"msg " + (staff ? "staff" : "cust")}>
              <div className="who">{staff ? "OctaSec" : m.authorName || "You"} <span className="role">{m.authorRole}</span><span className="t">{new Date(m.createdAt).toLocaleString()}</span></div>
              <div className="body">{m.body}</div>
            </div>
          );
        })}
      </div>
      {extra}
      {ticket.status !== "closed" ? (
        <div className="replybox">
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" />
          {err && <div className="form-err">{err}</div>}
          <div className="mrow"><button className="btn gold" onClick={send} disabled={busy || !body.trim()}>{busy ? "Sending…" : "Send reply"}</button></div>
        </div>
      ) : <div className="chip dim" style={{ marginTop: 6 }}>This ticket is closed.</div>}
    </div>
  );
}
