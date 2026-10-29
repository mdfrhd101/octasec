import type { ReactNode } from "react";
import HudField from "./hud/HudField";
import HudMini from "./hud/HudMini";

/**
 * Inner-page hero in the HUD style: a status tag, the title rising word by word, copy and
 * calls to action on the left; the dotted attack-surface globe on the right; the drifting
 * network behind. (HudMotion splits .h-split into words and reveals [data-rv].)
 */
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
    <section className="h-phero" data-rv>
      <HudField variant="hero" />
      <div className="h-phero-grid">
        <div className="h-phero-copy">
          <span className="h-tag ok"><i className="h-dot" />{eyebrow}</span>
          <h1 className="h-title h-split">{title}</h1>
          {sub ? <p className="h-sub">{sub}</p> : null}
          {ctas || null}
        </div>
        <div className="h-phero-viz" aria-hidden="true">
          <HudMini />
        </div>
      </div>
    </section>
  );
}
