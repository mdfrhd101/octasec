import type { ReactNode } from "react";

/** Centered page hero (phero helper in build-site.js). */
export default function PageHero({
  eyebrow,
  title,
  sub,
  ctas,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  ctas?: ReactNode;
}) {
  return (
    <section className="phero wrap">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {sub ? <p>{sub}</p> : null}
      {ctas || null}
    </section>
  );
}
