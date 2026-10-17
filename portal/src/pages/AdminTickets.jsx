import { useEffect, useState, useCallback } from "react";
import { tickets } from "../services/index.js";
import { useAuth } from "../auth.jsx";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty, LoadError, useUI } from "../ui.jsx";
import { TicketStatus, TicketThread } from "../components/Ticket.jsx";

const FILTERS = ["all", "open", "in_progress", "resolved", "closed"];

export default function AdminTickets() {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState("all");
  const [viewId, setViewId] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try { setList((await tickets.list(filter === "all" ? "" : filter)).tickets); } catch (e) { setErr(e.message); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell title="Tickets">
      <div className="card panel">
        <h3>Support queue<span className="sp">
          <select className="minisel" value={filter} onChange={(e) => { setList(null); setFilter(e.target.value); }} aria-label="Status">
            {FILTERS.map((f) => <option key={f} value={f}>{f === "all" ? "All" : f.replace("_", " ")}</option>)}
          </select>
        </span></h3>
        {err ? <LoadError msg={err} onRetry={load} /> : !list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? <Empty>No tickets.</Empty> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Subject</th><th>Company</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="frow" onClick={() => setViewId(t.id)}>
                  <td>{t.subject}</td>
                  <td className="mono dim">{t.company}</td>
                  <td><span className="chip">{t.priority}</span></td>
                  <td><TicketStatus status={t.status} /></td>
                  <td className="mono dim">{new Date(t.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {viewId && <AdminTicketView id={viewId} onClose={() => { setViewId(null); load(); }} />}
    </Shell>
  );
}

function AdminTicketView({ id, onClose }) {
  const { user } = useAuth();
  const ui = useUI();
  const [ticket, setTicket] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setTicket((await tickets.get(id)).ticket); } catch (e) { setErr(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const reply = async (body) => { await tickets.reply(id, body); await load(); };
  const setStatus = async (status) => {
    if (busy) return;
    setBusy(true); setErr("");
    try { await tickets.setStatus(id, status); ui.toast("Status: " + status.replace("_", " ")); await load(); }
    catch (e) { setErr(e.message); ui.toast(e.message, "err"); } finally { setBusy(false); }
  };

  const controls = ticket && (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 14px" }}>
      {["open", "in_progress", "resolved", "closed"].map((s) => (
        <button key={s} className={"btn sm " + (ticket.status === s ? "gold" : "ghost")} disabled={busy} onClick={() => setStatus(s)}>{s.replace("_", " ")}</button>
      ))}
    </div>
  );

  return (
    <Modal title={ticket ? ticket.subject : "Ticket"} sub={ticket ? ticket.openedByEmail : "Loading…"} onClose={onClose}>
      {err && !ticket && <div className="form-err">{err}</div>}
      {!ticket && !err ? <Spinner /> : null}
      {ticket && <TicketThread ticket={ticket} meRole={user.role} onReply={reply} extra={controls} />}
    </Modal>
  );
}
