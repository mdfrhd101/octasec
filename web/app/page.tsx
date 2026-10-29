import BreachIntro from "./components/BreachIntro";
import JsonLd from "./components/JsonLd";
import HudHero from "./components/hud/HudHero";
import { HudCompare, HudFinal, HudNumbers, HudPath, HudPricing, HudProblem, HudRules, HudWorldBand } from "./components/hud/HudSections";
import { serviceLd } from "./lib/seo";

// "Mission control" homepage (design fork). Styles: hud.css (+ hud-site.css for the shared
// parts); main.hud in layout.tsx carries the design to every page.
export default function HomePage() {
  return (
    <div className="hud-home">
      <JsonLd data={serviceLd} />
      {/* autoplay intro film, ~6.5 s on every load (no Skip button, no captions; a click,
          scroll or Esc still skips it). Its mark now lands on the globe's core, and the
          sphere forms outward from there. Off with reduced motion. */}
      <BreachIntro target=".hud-hero .hud-core" once={false} skipButton={false} captions={false} />
      <HudHero />
      <HudNumbers />
      <HudProblem />
      <HudRules />
      <HudWorldBand />
      <HudPath />
      <HudCompare />
      <HudPricing />
      <HudFinal />
    </div>
  );
}
