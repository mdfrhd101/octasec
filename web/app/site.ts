// Site-wide settings, set at BUILD time (static export) — see web/.env.example.
// NEXT_PUBLIC_SITE_URL           canonical origin used in metadata, sitemap and social cards
// NEXT_PUBLIC_PLAUSIBLE_DOMAIN   enables Plausible analytics only when set (no account → no tag)
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://octasec.ai").replace(/\/+$/, "");
export const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "";
