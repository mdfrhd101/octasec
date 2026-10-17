// BUG-003: self-serve clients get Support, isolated to their own tickets.
import { J, token, chk, done } from "./lib.mjs";

const admin = await token("admin@octasec.ai", "admin12345");
const ca = await token("corp@demo.com", "corp12345");
const cli = await token("client@demo.com", "client12345");
const dash = await token("dash@demo.com", "dash12345");

console.log("--- client opens + lists own tickets ---");
const t = await J("POST", "/tickets", { subject: "Report question", body: "Where is my PDF?", priority: "high" }, cli);
chk("client opens ticket 201", t.status, 201);
const tid = t.j.ticket._id;
chk("client ticket has no company", t.j.ticket.companyId, null);
const mine = (await J("GET", "/tickets", null, cli)).j.tickets;
chk("client sees own ticket", mine.some((x) => x.id === tid), true);
chk("client tickets labelled Self-serve", mine.every((x) => x.company === "Self-serve"), true);
chk("empty subject -> 400", (await J("POST", "/tickets", { subject: "", body: "x" }, cli)).status, 400);

console.log("--- isolation ---");
chk("other client cannot view 404", (await J("GET", `/tickets/${tid}`, null, dash)).status, 404);
chk("other client cannot reply 404", (await J("POST", `/tickets/${tid}/messages`, { body: "hi" }, dash)).status, 404);
chk("other client's list excludes it", (await J("GET", "/tickets", null, dash)).j.tickets.some((x) => x.id === tid), false);
chk("company_admin cannot view client ticket 404", (await J("GET", `/tickets/${tid}`, null, ca)).status, 404);
const ct = await J("POST", "/tickets", { subject: "Company ticket", body: "company only" }, ca);
chk("company ticket 201", ct.status, 201);
chk("client cannot view company ticket 404", (await J("GET", `/tickets/${ct.j.ticket._id}`, null, cli)).status, 404);
chk("client list excludes company ticket", (await J("GET", "/tickets", null, cli)).j.tickets.some((x) => x.id === ct.j.ticket._id), false);
chk("client cannot change status 403", (await J("PATCH", `/tickets/${tid}`, { status: "closed" }, cli)).status, 403);

console.log("--- super_admin handles it ---");
const all = (await J("GET", "/tickets", null, admin)).j.tickets;
chk("super_admin sees client ticket as Self-serve", all.find((x) => x.id === tid)?.company, "Self-serve");
chk("super_admin ticket view company Self-serve", (await J("GET", `/tickets/${tid}`, null, admin)).j.ticket.company, "Self-serve");
const rep = await J("POST", `/tickets/${tid}/messages`, { body: "Sending it today." }, admin);
chk("super_admin reply -> in_progress", rep.j.ticket.status, "in_progress");
const seen = (await J("GET", `/tickets/${tid}`, null, cli)).j.ticket;
chk("client sees the reply", seen.messages.length, 2);
chk("reply signed OctaSec Support", seen.messages[1].authorName, "OctaSec Support");
await J("PATCH", `/tickets/${tid}`, { status: "resolved" }, admin);
chk("client reply reopens resolved ticket", (await J("POST", `/tickets/${tid}/messages`, { body: "Still missing" }, cli)).j.ticket.status, "open");
await J("PATCH", `/tickets/${tid}`, { status: "closed" }, admin);
chk("reply on closed -> 409", (await J("POST", `/tickets/${tid}/messages`, { body: "late" }, cli)).status, 409);

await done("CLIENT SUPPORT");
