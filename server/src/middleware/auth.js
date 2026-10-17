import jwt from "jsonwebtoken";

const ALG = ["HS256"]; // pin algorithm — never accept anything else

export function sign(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, companyId: user.companyId ? user.companyId.toString() : null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d", algorithm: "HS256" }
  );
}

export function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ALG });
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// role guard: requireRole("admin") or requireRole("corp","admin")
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
