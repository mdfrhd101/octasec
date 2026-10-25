// Seed demo accounts for LOCAL DEVELOPMENT ONLY: `ALLOW_SEED=true npm run seed`
// Refuses to run unless explicitly opted in, so it can never create weak
// accounts on a live DB — the file is also excluded from the prod image
// via the repo-root .dockerignore (belt and braces).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Company from "./models/Company.js";
import mongoose from "mongoose";

if (process.env.NODE_ENV === "production" || process.env.ALLOW_SEED !== "true") {
  console.error("[seed] refusing to run: requires ALLOW_SEED=true and NODE_ENV!=production. This script creates weak demo accounts for local dev only.");
  process.exit(1);
}

const run = async () => {
  await connectDB(process.env.MONGO_URI);

  const company = await Company.findOneAndUpdate(
    { name: "Octagram Ltd" }, { $setOnInsert: { name: "Octagram Ltd" } }, { upsert: true, new: true }
  );

  const DEMO = [
    { email: "admin@octasec.ai", password: "admin12345", role: "super_admin", orgName: "OctaSec", companyId: null, name: "Platform Admin" },
    { email: "corp@demo.com", password: "corp12345", role: "company_admin", orgName: "Octagram Ltd", companyId: company._id, name: "Company Admin" },
    { email: "emp@demo.com", password: "emp12345", role: "employee", orgName: "Octagram Ltd", companyId: company._id, name: "Employee One" },
    { email: "client@demo.com", password: "client12345", role: "client", orgName: "Acme io", companyId: null, name: "Client User" },
  ];

  for (const d of DEMO) {
    const passwordHash = await bcrypt.hash(d.password, 12);
    await User.updateOne(
      { email: d.email },
      { $set: { passwordHash, role: d.role, orgName: d.orgName, companyId: d.companyId, name: d.name } },
      { upsert: true }
    );
    console.log("seeded", d.role.padEnd(13), "->", d.email, "/", d.password);
  }
  await mongoose.connection.close();
  process.exit(0);
};
run().catch((e) => { console.error(e); process.exit(1); });
