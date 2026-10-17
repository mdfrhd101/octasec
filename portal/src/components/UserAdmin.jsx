export function UserStatus({ u }) {
  if (u.status === "disabled") return <span className="chip red">Disabled</span>;
  if (u.status === "pending") return <span className="chip warn">Email unverified</span>;
  if (u.mustChangePassword) return <span className="chip warn">Reset pending</span>;
  return <span className="chip green">Active</span>;
}
