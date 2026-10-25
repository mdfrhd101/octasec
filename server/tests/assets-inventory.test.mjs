// Asset inventory — www/apex canonicalisation, verification-seeded self-asset, and
// discovery dedupe. Spec: backend task 2 (asset model fixes). The verify ROUTE performs a
// real outbound ownership fetch, so the seeding/ingest it uses is driven here directly —
// the same pattern the engine suites use to exercise ingest without a live scanner.
import mongoose from "mongoose";
import { J, token, chk, done, db } from "./lib.mjs";
import { canonicalHost, hostAlias } from "../src/utils/canonicalHost.js";
import { dedupeByCanonical, upsertAssets } from "../src/utils/assetInventory.js";

const conn = await db();
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const dash = await token("dash@demo.com", "dash12345");
const ts = Date.now();
const hosts = (did) => J("GET", `/assets?domainId=${did}`, null, dash).then((r) => r.j.assets);

console.log("--- canonicalHost: www collapses to apex, other labels kept ---");
chk("www -> apex", canonicalHost("www.example.com"), "example.com");
chk("apex unchanged", canonicalHost("example.com"), "example.com");
chk("other subdomain kept", canonicalHost("api.example.com"), "api.example.com");
chk("www2 is not www", canonicalHost("www2.example.com"), "www2.example.com");
chk("bare www.<tld> kept intact", canonicalHost("www.com"), "www.com");
chk("case normalised", canonicalHost("WWW.Example.COM"), "example.com");
chk("alias is the www form", hostAlias("www.example.com"), "www.example.com");
chk("apex has no alias", hostAlias("example.com"), "");

console.log("--- dedupeByCanonical folds www + apex into one record ---");
const merged = dedupeByCanonical([
  { host: "example.com", tech: ["nginx"] },
  { host: "www.example.com", tech: ["nginx", "php"] },
  { host: "api.example.com", tech: [] },
]);
chk("one record per site", merged.length, 2);
const apexRec = merged.find((a) => a.host === "example.com");
chk("www kept as alias", apexRec.aliases.includes("www.example.com"), true);
chk("tech unioned", [...apexRec.tech].sort().join(","), "nginx,php");
chk("sibling subdomain stays separate", merged.some((a) => a.host === "api.example.com"), true);

console.log("--- domain create normalises www -> apex ---");
const nm = `inv${ts}.com`;
const created = await J("POST", "/domains", { name: "www." + nm }, dash);
chk("create 201", created.status, 201);
chk("stored as apex", created.j.domain.name, nm);
const did = created.j.domain._id;
// the verify route needs a real outbound fetch, so flip verified in the DB (as other suites do)
await conn.collection("domains").updateOne({ _id: oid(did) }, { $set: { verified: true, verifiedAt: new Date() } });
const dom = await conn.collection("domains").findOne({ _id: oid(did) });

console.log("--- verification seeds the apex self-asset ---");
const seeded = await upsertAssets(dom, { id: String(dom.userId) }, [{ host: dom.name, tech: [] }]);
chk("self-asset created", seeded.length, 1);
chk("self-asset is the apex host", seeded[0].host, nm);
chk("self-asset visible via API", (await hosts(did)).some((a) => a.host === nm), true);

console.log("--- discovery dedupe: www + apex -> one asset, www as alias ---");
await upsertAssets(dom, { id: String(dom.userId) }, [
  { host: nm, tech: ["nginx"] },
  { host: "www." + nm, tech: ["php"] },
  { host: "api." + nm, tech: [] },
]);
const list = await hosts(did);
chk("apex + api only (www folded in)", list.map((a) => a.host).sort().join(","), [nm, "api." + nm].sort().join(","));
const apexAsset = list.find((a) => a.host === nm);
chk("www stored as alias on apex asset", (apexAsset.aliases || []).includes("www." + nm), true);
chk("tech merged on apex asset", apexAsset.tech.includes("nginx") && apexAsset.tech.includes("php"), true);
chk("no standalone www asset", list.some((a) => a.host === "www." + nm), false);

console.log("--- manual add canonicalises + stores alias ---");
// a second fresh verified domain whose apex asset does not exist yet
const nm2 = `inv2-${ts}.com`;
const c2 = await J("POST", "/domains", { name: nm2 }, dash);
const did2 = c2.j.domain._id;
await conn.collection("domains").updateOne({ _id: oid(did2) }, { $set: { verified: true, verifiedAt: new Date() } });
const ma = await J("POST", "/assets", { domainId: did2, host: "www." + nm2 }, dash);
chk("manual add 201", ma.status, 201);
chk("stored as apex host", ma.j.asset.host, nm2);
chk("www recorded as alias", (ma.j.asset.aliases || []).includes("www." + nm2), true);

await done("ASSET INVENTORY (www/apex + seeding)");
