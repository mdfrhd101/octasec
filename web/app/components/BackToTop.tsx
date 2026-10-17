"use client";

export default function BackToTop() {
  return (
    <button
      type="button"
      className="to-top"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
    >
      Back to top <span aria-hidden="true">&uarr;</span>
    </button>
  );
}
