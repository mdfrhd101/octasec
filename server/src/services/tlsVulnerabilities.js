import { execFile } from "node:child_process";

const PROTOCOLS = [
  ["ssl_3_0_cipher_suites", "SSL 3.0"],
  ["tls_1_0_cipher_suites", "TLS 1.0"],
  ["tls_1_1_cipher_suites", "TLS 1.1"],
];
const WEAK_CIPHER = /(?:^|_)(?:NULL|EXPORT|RC4|DES|3DES|MD5)(?:_|$)|anon/i;

export function parseSslyzeReport(json) {
  const server = json?.server_scan_results?.[0];
  if (!server || server.scan_status !== "COMPLETED") return { checked: false, error: "SSLyze did not complete" };
  const scan = server.scan_result || {};
  const hb = scan.heartbleed;
  const heartbleed = hb?.status === "COMPLETED" && typeof hb.result?.is_vulnerable_to_heartbleed === "boolean"
    ? hb.result.is_vulnerable_to_heartbleed
    : null;
  const legacy = [];
  for (const [key, label] of PROTOCOLS) {
    const item = scan[key];
    if (item?.status === "COMPLETED" && item.result?.is_tls_version_supported === true) legacy.push(label);
  }
  const weakCiphers = new Set();
  for (const key of ["tls_1_2_cipher_suites", "tls_1_3_cipher_suites"]) {
    const accepted = scan[key]?.result?.accepted_cipher_suites || [];
    for (const item of accepted) {
      const name = item?.cipher_suite?.name;
      if (name && WEAK_CIPHER.test(name)) weakCiphers.add(name);
    }
  }
  return { checked: true, heartbleed, legacy, weakCiphers: [...weakCiphers].slice(0, 8) };
}

export async function runTlsVulnerabilityScan(target) {
  if (target.u.protocol !== "https:") return { checked: false, error: "HTTPS unavailable" };
  const ip = target.addresses[0].address;
  const location = `${target.addresses[0].family === 6 ? `[${ip}]` : ip}:443`;
  const args = [
    "-m", "sslyze", "--heartbleed", "--sslv3", "--tlsv1", "--tlsv1_1", "--tlsv1_2", "--tlsv1_3",
    "--sni", target.hostname, "--json_out", "-", location,
  ];
  try {
    const { stdout } = await new Promise((resolve, reject) => {
      execFile("python3", args, { timeout: 45000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, env: { ...process.env, PYTHONUNBUFFERED: "1" } }, (error, stdout, stderr) => {
        if (error) reject(Object.assign(error, { stderr: String(stderr || "").slice(0, 300) }));
        else resolve({ stdout });
      });
    });
    return parseSslyzeReport(JSON.parse(stdout));
  } catch (e) {
    return { checked: false, error: String(e.message || e).slice(0, 300) };
  }
}
