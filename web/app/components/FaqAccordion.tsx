import type { ReactNode } from "react";

export type FaqItem = { q: string; a: ReactNode };

/** Native <details> accordion with the gold "+" marker (faqMain in build-site.js). */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <section className="wrap rv" id="faq">
      <div className="faq stagger">
        {items.map((it) => (
          <details key={it.q}>
            <summary>
              {it.q} <span className="pm">+</span>
            </summary>
            <p className="a">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
