import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Domains from "./pages/Domains.jsx";
import Assets from "./pages/Assets.jsx";
import Reports from "./pages/Reports.jsx";
import Clients from "./pages/Clients.jsx";
import ApiKeys from "./pages/ApiKeys.jsx";
import Employees from "./pages/Employees.jsx";
import Support from "./pages/Support.jsx";
import AdminCompanies from "./pages/AdminCompanies.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminTickets from "./pages/AdminTickets.jsx";
import AdminLeads from "./pages/AdminLeads.jsx";
import AdminEngagements from "./pages/AdminEngagements.jsx";
import AdminAudit from "./pages/AdminAudit.jsx";
import Scans from "./pages/Scans.jsx";
import Organization from "./pages/Organization.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import { ForcePasswordChange } from "./components/ChangePassword.jsx";

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="login"><span className="spin" /></div>;
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path.endsWith("/reset-password")) return <ResetPassword />;
  if (path.endsWith("/verify-email")) return <VerifyEmail />;
  if (!user) return <Login />;
  if (user.mustChangePassword) return <ForcePasswordChange />;
  const role = user.role;
  const company = role === "company_admin" || role === "employee";
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      {role === "super_admin" ? (
        <>
          <Route path="/admin/companies" element={<AdminCompanies />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/engagements" element={<AdminEngagements />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
        </>
      ) : (
        <>
          <Route path="/domains" element={<Domains />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/scans" element={<Scans />} />
          <Route path="/reports" element={<Reports />} />
          {company && <Route path="/clients" element={<Clients />} />}
          <Route path="/support" element={<Support />} />
          <Route path="/organization" element={<Organization />} />
          {role === "company_admin" && <Route path="/employees" element={<Employees />} />}
          {role === "company_admin" && <Route path="/api" element={<ApiKeys />} />}
        </>
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
