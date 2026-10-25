import type { ReactNode } from "react";

/** Mirrors the head() helper in build-site.js. */
export default function SectionHead({
  eyebrow,
  title,
  text,
  center = false,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  center?: boolean;
}) {
  return (
    // centring lives in CSS (.section-head.center, globals.css) so phones can left-align it
    <div className={"section-head" + (center ? " center" : "")}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mh">{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}
