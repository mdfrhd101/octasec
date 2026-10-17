import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import ContactForm from "../components/ContactForm";

export const metadata: Metadata = {
  title: "OctaSec — Contact",
  description: "Book a free, honest scoping call.",
  alternates: { canonical: "/contact" },
};

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
