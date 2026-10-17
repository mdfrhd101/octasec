// Emailed one-time links: password reset, admin-initiated reset, account
// invite and email verification. Tokens are 256-bit, stored as SHA-256 only,
// single-use, purpose-bound, and travel in the URL *fragment* (#token=…) so
// they never reach a server access log. docs/EMAIL_AND_PASSWORD_RESET.md
import crypto from "node:crypto";
import PasswordReset from "../models/PasswordReset.js";
import { sendMail, appUrl, esc } from "./mailer.js";

export const PURPOSE = {
  reset: { ttlMin: 30, page: "reset-password" },
  admin_reset: { ttlMin: 24 * 60, page: "reset-password" },
  invite: { ttlMin: 72 * 60, page: "reset-password" },
  verify: { ttlMin: 24 * 60, page: "verify-email" },
};
export const MAX_PER_HOUR = 3;
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

/** How many links of this purpose were issued to the user in the last hour (anti mail-bombing). */
export const recentCount = (userId, purpose) =>
  PasswordReset.countDocuments({ userId, purpose, createdAt: { $gte: new Date(Date.now() - 3600000) } });

/** Record a mail that carried no link (e.g. "already registered") so it counts toward the throttle. */
export const noteMailSent = (userId, purpose) => PasswordReset.create({
  userId, purpose, tokenHash: "note-" + crypto.randomBytes(16).toString("hex"), expiresAt: new Date(), usedAt: new Date(),
});

/** Kill every unused link of the given purposes for a user. */
export const revokeTokens = (userId, purposes = Object.keys(PURPOSE)) =>
  PasswordReset.updateMany({ userId, purpose: { $in: purposes }, usedAt: null }, { usedAt: new Date() });

/** Create a fresh link (older unused links of the same purpose die) and return its URL. */
export async function issueToken(user, purpose, ip = "") {
  const p = PURPOSE[purpose];
  await revokeTokens(user._id, [purpose]);
  const token = crypto.randomBytes(32).toString("base64url");
  await PasswordReset.create({
    userId: user._id, purpose, tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + p.ttlMin * 60000), ip: String(ip || "").slice(0, 60),
  });
  return `${appUrl()}/portal/${p.page}#token=${token}`;
}

/** Atomically burn a valid token of one of `purposes`; returns the token row or null. */
export async function consumeToken(token, purposes) {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return null;
  const rec = await PasswordReset.findOneAndUpdate(
    { tokenHash: sha256(token), purpose: { $in: purposes }, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  ).lean();
  return rec;
}

/** Is a token currently valid (without burning it)? */
export async function peekToken(token, purposes) {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return null;
  return PasswordReset.findOne({ tokenHash: sha256(token), purpose: { $in: purposes }, usedAt: null, expiresAt: { $gt: new Date() } }).lean();
}

/* ---------- message templates ---------- */
const hello = (u) => (u.name ? `Hi ${u.name},` : "Hi,");
const hours = (min) => (min >= 60 ? `${Math.round(min / 60)} hours` : `${min} minutes`);

function mail(user, subject, intro, link, linkText, ttlMin, outro) {
  return sendMail({
    to: user.email,
    subject,
    text: `${hello(user)}\n\n${intro}\n\n${linkText} (valid for ${hours(ttlMin)}, one use):\n${link}\n\n${outro}\n\n— OctaSec`,
    html: `<p>${esc(hello(user))}</p><p>${esc(intro)}</p><p><a href="${esc(link)}">${esc(linkText)}</a> — valid for ${hours(ttlMin)}, one use.</p><p>${esc(outro)}</p><p>— OctaSec</p>`,
  });
}

export const sendReset = (user, link) => mail(user, "Reset your OctaSec password",
  "Someone (hopefully you) asked to reset the password for your OctaSec account.", link, "Reset your password",
  PURPOSE.reset.ttlMin, "If you didn't ask for this, ignore this email — your password stays the same.");

export const sendAdminReset = (user, link) => mail(user, "Your OctaSec password was reset by an administrator",
  "An administrator reset your OctaSec password and signed out your sessions. Choose a new password to sign in again.", link, "Choose a new password",
  PURPOSE.admin_reset.ttlMin, "If you did not expect this, contact your administrator or OctaSec support.");

export const sendInvite = (user, link, orgName) => mail(user, "You're invited to OctaSec",
  `You have been given an OctaSec account${orgName ? ` for ${orgName}` : ""}. Set your password to activate it.`, link, "Set your password",
  PURPOSE.invite.ttlMin, "If you weren't expecting this, you can ignore this email.");

export const sendVerify = (user, link) => mail(user, "Confirm your email for OctaSec",
  "Thanks for signing up. Confirm this email address to activate your OctaSec account.", link, "Confirm my email",
  PURPOSE.verify.ttlMin, "If you didn't create an account, ignore this email — nothing will be activated.");

export const sendAlreadyRegistered = (user) => sendMail({
  to: user.email,
  subject: "Someone tried to sign up with your email",
  text: `${hello(user)}\n\nSomeone tried to create a new OctaSec account with this email address, but you already have one.\nIf this was you, sign in instead — or use "Forgot password?" on the sign-in page.\nIf it wasn't you, you can ignore this email.\n\n— OctaSec`,
  html: `<p>${esc(hello(user))}</p><p>Someone tried to create a new OctaSec account with this email address, but you already have one.</p><p>If this was you, sign in instead — or use “Forgot password?” on the sign-in page. If it wasn't you, you can ignore this email.</p><p>— OctaSec</p>`,
});
