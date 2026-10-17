// Check the SMTP settings in .env:   npm run mail:test -- you@yourdomain.com
import "dotenv/config";
import { verifyMail, sendMail, mailConfigured } from "../src/utils/mailer.js";

const to = process.argv[2];
if (!mailConfigured()) { console.error("SMTP_HOST is not set in server/.env — see docs/EMAIL_AND_PASSWORD_RESET.md"); process.exit(1); }
try {
  await verifyMail();
  console.log("✓ SMTP login + TLS OK");
  if (to) {
    await sendMail({ to, subject: "OctaSec SMTP test", text: "If you can read this, OctaSec can send email.", html: "<p>If you can read this, OctaSec can send email.</p>" });
    console.log("✓ test email sent to", to);
  } else console.log("(pass an address to also send a test email)");
  process.exit(0);
} catch (e) {
  console.error("✗ SMTP failed:", e.message);
  process.exit(1);
}
