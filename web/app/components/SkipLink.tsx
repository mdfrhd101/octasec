"use client";

/**
 * "Skip to content": the first Tab stop on every page (visible only while focused, polish.css).
 * Moves keyboard focus into <main> explicitly: on desktop, Lenis handles #anchor clicks itself,
 * so the browser's own fragment navigation (which moves the focus start point) never runs.
 */
export default function SkipLink() {
  return (
    <a className="skip-link" href="#main" onClick={() => document.getElementById("main")?.focus({ preventScroll: true })}>
      Skip to content
    </a>
  );
}
