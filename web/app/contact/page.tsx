import { pageMeta } from "../lib/seo";
import PageHero from "../components/PageHero";
import ContactForm from "../components/ContactForm";

export const metadata = pageMeta({
  title: "Contact — Book a Scoping Call",
  description:
    "Book a free, honest penetration-testing scoping call with OctaSec. Tell us your target and scope; if a scanner is enough, we'll say so. Dhaka-based, serving clients worldwide.",
  keywords: ["book a penetration test", "pentest scoping call", "contact OctaSec", "request a pentest quote"],
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Tell us what you&apos;re
            <br />
            afraid of. We&apos;ll find it first.
          </>
        }
      />
      <section className="wrap rv" style={{ paddingTop: 10 }}>
        <ContactForm />
      </section>
    </>
  );
}
