import mongoose from "mongoose";
import net from "node:net";

// Wrap an async route handler so rejections reach Express's error middleware
// (Express 4 does not forward them; an unhandled rejection crashes Node 24).
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Reject invalid Mongo ObjectIds up front → clean 400 (never a CastError crash).
export const isId = (v) => typeof v === "string" && mongoose.isValidObjectId(v);

// Ensure a value is a plain string (defuses NoSQL operator-object injection
// like ?owner[$ne]= or {"clientId":{"$gt":""}}).
export const asString = (v) => (typeof v === "string" ? v : "");

// A param that was supplied but is not a plain string (e.g. qs parsed
// ?x[$gt]= into an object) — reject these outright as malformed.
export const isBadParam = (v) => v !== undefined && typeof v !== "string";

// Syntactic hostname check: a real dotted hostname with an ALPHABETIC TLD (or
// an IDN xn-- TLD), NOT an IP literal, no port/path/userinfo. This rejects
// decimal/hex/octal IP forms (e.g. 0x7f.0.0.1) whose last label isn't a letter.
// DNS-level public-IP validation still happens later at verification time.
const HOSTNAME_RE =
  /^(?=.{1,253}$)((?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/;
export const isHostname = (v) => typeof v === "string" && net.isIP(v) === 0 && HOSTNAME_RE.test(v);
