import { useEffect, useState, useCallback } from "react";
import { tickets } from "../services/index.js";
import { useAuth } from "../auth.jsx";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty, LoadError, useUI } from "../ui.jsx";
import { TicketStatus, TicketThread } from "../components/Ticket.jsx";

export default function Support() {
  const [list, setList] = useState(null);
  const [openNew, setOpenNew] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try { setList((await tickets.list()).tickets); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell title="Support">
      <div className="card panel">
        <h3>Support tickets<span className="sp"><button className="btn gold sm" onClick={() => setOpenNew(true)}>+ New ticket</button></span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Raise an issue with the OctaSec team. You'll see replies and status updates here.
        </p>
        {err ? <LoadError msg={err} onRetry={load} /> : !list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? (
          <Empty>No tickets yet.</Empty>
        ) : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Subject</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="frow" onClick={() => setViewId(t.id)}>
                  <td>{t.subject}</td>
                  <td><span className="chip">{t.priority}</span></td>
                  <td><TicketStatus status={t.status} /></td>
                  <td className="mono dim">{new Date(t.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {openNew && <NewTicket onClose={() => setOpenNew(false)} onDone={() => { setOpenNew(false); load(); }} />}
      {viewId && <TicketView id={viewId} onClose={() => { setViewId(null); load(); }} />}
    </Shell>
  );
}

function NewTicket({ onClose, onDone }) {
  const ui = useUI();
  const [f, setF] = useState({ subject: "", body: "", priority: "normal" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { await tickets.open(f); ui.toast("Ticket opened — we'll reply here"); onDone(); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title="New support ticket" sub="Describe the issue — the OctaSec team will respond here." onClose={onClose}>
      <form onSubmit={submit}>
      <label>Subject<span className="req">*</span><input required maxLength={140} value={f.subject} onChange={set("subject")} placeholder="Short summary" autoFocus /></label>
      <label>Priority
        <select value={f.priority} onChange={set("priority")}>
          <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
        </select>
      </label>
      <label>Message<span className="req">*</span><textarea required rows={5} value={f.body} onChange={set("body")} placeholder="What's happening?" /></label>
      {err && <div className="form-err">{err}</div>}
      <div className="mrow"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" disabled={busy || !f.subject.trim() || !f.body.trim()}>{busy ? "Sending…" : "Open ticket"}</button></div>
      </form>
    </Modal>
  );
}

function TicketView({ id, onClose }) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try { setTicket((await tickets.get(id)).ticket); } catch (e) { setErr(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const reply = async (body) => { await tickets.reply(id, body); await load(); };
  return (
    <Modal title={ticket ? ticket.subject : "Ticket"} sub={ticket ? undefined : "Loading…"} onClose={onClose}>
      {err && !ticket && <div className="form-err">{err}</div>}
      {!ticket && !err ? <Spinner /> : null}
      {ticket && <TicketThread ticket={ticket} meRole={user.role} onReply={reply} />}
    </Modal>
  );
}
