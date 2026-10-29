"use client";

import { useEffect, useState } from "react";
import HudGlobe from "./HudGlobe";
import { SCENES } from "./hudData";

/** The attack-surface globe without assets or chain: the inner pages' hero motif. */
export default function HudMini() {
  const [still, setStill] = useState(false);
  useEffect(() => setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return (
    <div className="h-mini">
      <HudGlobe scene={SCENES[0]} step={0} formed still={still} mini />
    </div>
  );
}
