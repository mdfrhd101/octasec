// Asset inventory ingest: the one place discovered/seeded hosts become Asset rows.
// Canonicalises www/apex (see canonicalHost.js), merges tech + aliases on re-discovery,
// respects the per-domain cap, and never throws on a duplicate host. Used by the asset
// routes and by domain verification (which seeds the self-asset + background discovery).
import Asset from "../models/Asset.js";
import { canonicalHost, hostAlias } from "./canonicalHost.js";

export const ASSETS_PER_DOMAIN_MAX = 500;

// an asset always lands in the tenant that owns the domain
export const ownerOf = (domain, user) =>
  domain.companyId ? { userId: user.id, companyId: domain.companyId } : { userId: domain.userId, companyId: null };

// Collapse www/apex duplicates within one batch: group hosts by their canonical form,
// union each group's tech list, and keep every www form as an alias on the survivor.
export function dedupeByCanonical(found) {
  const byHost = new Map();
  for (const a of found || []) {
    const host = canonicalHost(a?.host);
    if (!host) continue;
    const cur = byHost.get(host) || { host, tech: [], aliases: [] };
    for (const t of a.tech || []) if (!cur.tech.includes(t)) cur.tech.push(t);
    const alias = hostAlias(a?.host);
    if (alias && !cur.aliases.includes(alias)) cur.aliases.push(alias);
    byHost.set(host, cur);
  }
  return [...byHost.values()];
}

// Upsert a batch of in-scope hosts for one domain. Hosts already known to the domain get
// any new tech/aliases merged in; new hosts are created up to the per-domain cap. Returns
// the assets that were newly created (so callers can report a discovered count).
export async function upsertAssets(domain, user, found) {
  const owner = ownerOf(domain, user);
  const batch = dedupeByCanonical(found);
  let room = Math.max(0, ASSETS_PER_DOMAIN_MAX - (await Asset.countDocuments({ domainId: domain._id })));
  const created = [];
  for (const a of batch) {
    const add = {};
    if (a.tech.length) add.tech = { $each: a.tech };
    if (a.aliases.length) add.aliases = { $each: a.aliases };
    const known = await Asset.findOne({ domainId: domain._id, host: a.host }).select("_id").lean();
    if (known) {
      // already tracked — just fold in any newly-seen tech/aliases
      if (Object.keys(add).length) await Asset.updateOne({ _id: known._id }, { $addToSet: add });
      continue;
    }
    if (room <= 0) continue; // cap reached: stop creating, but keep merging known hosts
    try {
      created.push(await Asset.create({ ...owner, domainId: domain._id, host: a.host, tech: a.tech, aliases: a.aliases, status: "unscanned" }));
      room--;
    } catch (e) {
      if (!(e && e.code === 11000)) throw e; // lost a race to create the same host
      if (Object.keys(add).length) await Asset.updateOne({ domainId: domain._id, host: a.host }, { $addToSet: add });
    }
  }
  return created;
}
