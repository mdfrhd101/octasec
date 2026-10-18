import PageHero from "../components/PageHero";
import ScopeCTA from "../components/ScopeCTA";
import FaqAccordion, { type FaqItem } from "../components/FaqAccordion";
import FinalCTA from "../components/FinalCTA";
import JsonLd from "../components/JsonLd";
import { breadcrumbLd, pageMeta } from "../lib/seo";

export const metadata = pageMeta({
  title: "Penetration Testing FAQ",
  description:
    "Straight answers about OctaSec's human-gated, AI-orchestrated penetration testing: scanning vs. real pentesting, production safety, pricing, compliance mapping and what you receive.",
  keywords: ["penetration testing FAQ", "AI pentest questions", "is AI pentest a scanner", "pentest compliance OWASP SOC 2", "pentest cost"],
  path: "/faq",
});

// Plain-text Q&A for the FAQPage rich result (mirrors the ITEMS below).
const FAQ_QA: [string, string][] = [
  ["Is this just an AI scanner?", "No. Scanners match known signatures. OctaSec reasons about your application's logic, chains weaknesses, and proves exploitability. A human operator verifies every finding."],
  ["Will testing break my production app?", "We use minimum-impact proofs by default, agree intensity limits in the rules of engagement, and can run against staging twins."],
  ["How is this so much cheaper than a traditional pentest?", "The engine does the thousands of hours of grinding; humans do the judgment. You pay for judgment, not grinding."],
  ["What compliance frameworks do reports map to?", "OWASP Top 10 / ASVS by default; SOC 2 / ISO 27001 / PCI DSS mapping available as a report add-on."],
  ["Do you test AI features (chatbots, agents)?", "Yes — it's a dedicated service line (S5): prompt injection, tool abuse and data leaks."],
  ["What do I actually receive?", "A case-file report per finding: severity, root cause, the chained attack path, raw request/response evidence, developer-ready fix guidance — and a free retest once you've shipped the fix."],
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_QA.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
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
      <JsonLd data={[faqLd, breadcrumbLd([{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq/" }])]} />
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
