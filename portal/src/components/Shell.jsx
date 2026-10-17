import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const BRAND = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16v-8L8 2.5Z" stroke="#e8c15a" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M8.5 12.2 11 14.8 15.6 9.4" stroke="#e8c15a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NAV = {
  client: [["/", "Dashboard"], ["/domains", "Domains"], ["/assets", "Assets"], ["/scans", "Scans"], ["/reports", "Reports"]],
  employee: [["/", "Dashboard"], ["/clients", "Clients"], ["/domains", "Domains"], ["/assets", "Assets"], ["/scans", "Scans"], ["/reports", "Reports"], ["/support", "Support"]],
  company_admin: [["/", "Dashboard"], ["/employees", "Employees"], ["/clients", "Clients"], ["/domains", "Domains"], ["/assets", "Assets"], ["/scans", "Scans"], ["/reports", "Reports"], ["/support", "Support"], ["/api", "API & integrations"]],
  super_admin: [["/", "Overview"], ["/admin/companies", "Companies"], ["/admin/users", "Admins & staff"], ["/admin/engagements", "Engagements"], ["/admin/tickets", "Tickets"], ["/admin/leads", "Leads"], ["/admin/audit", "Audit log"]],
};
const ROLE_LABEL = { client: "CLIENT", employee: "EMPLOYEE", company_admin: "COMPANY ADMIN", super_admin: "SUPER ADMIN" };

export default function Shell({ title, children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = NAV[user.role] || NAV.client;
  const doLogout = () => { logout(); nav("/"); };
  return (
    <div className="app">
      <aside className="side">
        <div className="brand sm">{BRAND} OCTASEC</div>
        <span className="rolebadge">{ROLE_LABEL[user.role] || user.role}</span>
        <nav id="sideNav">
          {items.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "on" : "")}>{label}</NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who">{user.email}<br />{user.orgName || ""}</div>
          <button className="signout" onClick={doLogout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><h1>{title}</h1><span className="demo-chip">PREVIEW</span></header>
        <div className="view">{children}</div>
      </main>
    </div>
  );
}
