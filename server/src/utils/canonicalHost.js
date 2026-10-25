// www.example.com and example.com are the same site. The CANONICAL host is the
// www-stripped (apex) form; the www form is kept as an alias so the inventory never
// holds two assets for one site. Shared by the domain/asset routes and the discovery
// ingest. The engine contract (engine/normalize.js inScope) is deliberately untouched —
// normalisation happens here, in the app's own ingest layer, not in the engine gateway.

/** The apex form of a host: a single leading `www.` label stripped. */
export function canonicalHost(host) {
  const h = String(host || "").trim().toLowerCase();
  if (h.startsWith("www.")) {
    const apex = h.slice(4);
    // keep oddities like "www.com" (a registrable domain in its own right) intact
    if (apex.includes(".")) return apex;
  }
  return h;
}

/** The alias a host collapses under (its www form), or "" when it is already canonical. */
export function hostAlias(host) {
  const h = String(host || "").trim().toLowerCase();
  return canonicalHost(h) === h ? "" : h;
}
