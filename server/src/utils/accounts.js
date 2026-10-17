import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { revokeTokens } from "./emailTokens.js";

export const BCRYPT_COST = 12;
export const USER_STATUS = ["active", "disabled"];

// The most common breached passwords (≥ 8 chars) — refused outright.
const COMMON = new Set([
  "password", "password1", "password12", "password123", "password1234", "passw0rd", "p@ssw0rd", "p@ssword",
  "12345678", "123456789", "1234567890", "12345678910", "87654321", "11111111", "00000000", "88888888",
  "qwertyui", "qwerty123", "qwerty12", "qwertyuiop", "1q2w3e4r", "1q2w3e4r5t", "1qaz2wsx", "zaq12wsx", "asdfghjk",
  "iloveyou", "iloveyou1", "sunshine", "princess", "football", "baseball", "superman", "starwars", "whatever",
  "trustno1", "letmein1", "welcome1", "welcome123", "admin123", "administrator", "changeme", "changeme1",
  "abc12345", "abcd1234", "a1b2c3d4", "dragon12", "monkey12", "master12", "computer", "internet", "michael1",
  "bangladesh", "bangladesh1", "dhaka123", "octasec", "octasec1", "octasec123", "octagram", "octagram1",
]);

/**
 * One password policy for every place a password is chosen.
 * Returns an error message, or "" when acceptable.
 */
export function passwordProblem(pw, email = "") {
  if (typeof pw !== "string") return "Password is required";
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (pw.length > 128) return "Password is too long";
  if (Buffer.byteLength(pw, "utf8") > 72) return "Password is too long (max 72 bytes)"; // bcrypt input limit
  const lower = pw.toLowerCase();
  const e = String(email).toLowerCase();
  if (e && (lower === e || lower === e.split("@")[0])) return "Password must not be your email address";
  if (COMMON.has(lower)) return "That password is too common — choose another";
  if (/^(.)\1+$/.test(pw)) return "Password must not be one repeated character";
  return "";
}

// An unusable password for accounts that will set their own via an emailed link.
export const lockedPasswordHash = () => bcrypt.hash(crypto.randomBytes(32).toString("base64url"), BCRYPT_COST);

/** Revoke every live session of a user (atomic increment, no lost updates). */
export const revokeSessions = (userId) => User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });

// Enable / disable an account. Disabling also revokes every live token.
export function applyStatus(user, status) {
  user.status = status;
  if (status === "disabled") user.tokenVersion = (user.tokenVersion || 0) + 1;
}

// Admin reset: the current password stops working, every session ends, and the
// user picks a new password through an emailed link. The admin never sees it.
export async function applyAdminReset(user) {
  user.passwordHash = await lockedPasswordHash();
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await revokeTokens(user._id);
}
