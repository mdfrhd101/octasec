import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { ChangePasswordModal } from "./ChangePassword.jsx";
import BrandMark from "./BrandMark.jsx";

export const NAV = {
  client: [["/", "Dashboard"], ["/domains", "Domains"], ["/assets", "Assets"], ["/scans", "Scans"], ["/reports", "Reports"], ["/support", "Support"], ["/organization", "Organisation"]],
  employee: [["/", "Dashboard"], ["/clients", "Clients"], ["/domains", "Domains"], ["/assets", "Assets"], ["/scans", "Scans"], ["/reports", "Reports"], ["/support", "Support"], ["/organization", "Organisation"]],
  company_admin: [["/", "Dashboard"], ["/employees", "Employees"], ["/clients", "Clients"], ["/domains", "Domains"], ["/assets", "Assets"], ["/scans", "Scans"], ["/reports", "Reports"], ["/support", "Support"], ["/organization", "Organisation"], ["/api", "API & integrations"]],
  super_admin: [["/", "Overview"], ["/admin/companies", "Companies"], ["/admin/users", "Users"], ["/admin/engagements", "Engagements"], ["/admin/tickets", "Tickets"], ["/admin/leads", "Leads"], ["/admin/audit", "Audit log"]],
};
const ROLE_LABEL = { client: "CLIENT", employee: "EMPLOYEE", company_admin: "COMPANY ADMIN", super_admin: "SUPER ADMIN" };

export default function Shell({ title, children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = NAV[user.role] || NAV.client;
  const [pwOpen, setPwOpen] = useState(false);
  const doLogout = () => { logout(); nav("/"); };
  return (
    <div className="app">
      <aside className="side">
        <div className="brand sm"><BrandMark /> OCTASEC</div>
        <span className="rolebadge">{ROLE_LABEL[user.role] || user.role}</span>
        <nav id="sideNav">
          {items.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "on" : "")}>{label}</NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who">{user.email}<br />{user.orgName || ""}</div>
          <button className="signout" onClick={() => setPwOpen(true)}>Change password</button>
          <button className="signout" onClick={doLogout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><h1>{title}</h1><span className="demo-chip">PREVIEW</span></header>
        <div className="view">{children}</div>
      </main>
      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}
