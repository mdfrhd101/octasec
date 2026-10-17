import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import ScopeCTA from "../components/ScopeCTA";
import FaqAccordion, { type FaqItem } from "../components/FaqAccordion";
import FinalCTA from "../components/FinalCTA";

export const metadata: Metadata = {
  title: "OctaSec — FAQ",
  description:
    "Straight answers about OctaSec's human-gated, AI-orchestrated pentesting.",
  alternates: { canonical: "/faq" },
};

const ITEMS: FaqItem[] = [
  {
    q: "Is this just an AI scanner?",
    a: "No. Scanners match known signatures. OctaSec reasons about your application's logic, chains weaknesses, and proves exploitability. A human operator verifies every finding.",
  },
  {
    q: "Will testing break my production app?",
    a: "We use minimum-impact proofs by default, agree intensity limits in the rules of engagement, and can run against staging twins.",
  },
  {
    q: "How is this so much cheaper than a traditional pentest?",
    a: "The engine does the thousands of hours of grinding; humans do the judgment. You pay for judgment, not grinding.",
  },
  {
    q: "What compliance frameworks do reports map to?",
    a: "OWASP Top 10 / ASVS by default; SOC 2 / ISO 27001 / PCI DSS mapping available as a report add-on.",
  },
  {
    q: "Do you test AI features (chatbots, agents)?",
    a: <>Yes &mdash; it&apos;s a dedicated service line (S5): prompt injection, tool abuse and data leaks.</>,
  },
  {
    q: "What do I actually receive?",
    a: <>A case-file report per finding: severity, root cause, the chained attack path, raw request/response evidence, developer-ready fix guidance &mdash; and a free retest once you&apos;ve shipped the fix.</>,
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Questions, answered
            <br />
            straight.
          </>
        }
        ctas={<ScopeCTA />}
      />
      <FaqAccordion items={ITEMS} />
      <FinalCTA />
    </>
  );
}
