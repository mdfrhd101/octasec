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
    <div
      className={"section-head" + (center ? " center" : "")}
      style={center ? { marginInline: "auto", textAlign: "center" } : undefined}
    >
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mh">{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}
