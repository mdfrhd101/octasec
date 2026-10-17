// Test-only fixtures on top of `npm run seed`: a self-serve client with an
// already-verified domain (verification needs a real public host, so it is
// written straight to the test DB).
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Domain from "../src/models/Domain.js";

await mongoose.connect(process.env.MONGO_URI);
const dash = await User.findOneAndUpdate(
  { email: "dash@demo.com" },
  { $set: { passwordHash: await bcrypt.hash("dash12345", 12), role: "client", companyId: null, name: "Dash User", orgName: "Acme io" } },
  { upsert: true, new: true }
);
await Domain.updateOne(
  { userId: dash._id, name: "acme.io" },
  { $setOnInsert: { userId: dash._id, name: "acme.io", verified: true, verifiedAt: new Date(), verifyToken: Domain.freshToken(), verifyFile: Domain.freshFile() } },
  { upsert: true }
);
console.log("fixtures: dash@demo.com + verified acme.io");
await mongoose.disconnect();
