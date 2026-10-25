"use client";

// Sticky "Free website check" widget — fixed to the right edge, always visible
// while scrolling (like a live-chat launcher). The lead-gen entry point.
// Not shown on /website-check itself; on phones/tablets it also fades out while the
// footer is on screen so it never covers the last content (mobile.css).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function FloatingCheck() {
  const path = usePathname();
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const foot = document.querySelector("footer");
    if (!foot) return;
    const io = new IntersectionObserver(([e]) => setAtEnd(e.isIntersecting), { threshold: 0.05 });
    io.observe(foot);
    return () => io.disconnect();
  }, [path]);

  if (path?.startsWith("/website-check")) return null;

  return (
    <Link className={"floatcheck" + (atEnd ? " is-end" : "")} href="/website-check" aria-label="Free website check">
      <span className="fc-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.6l7 2.6v5.2c0 4.4-3 7.8-7 9.2-4-1.4-7-4.8-7-9.2V5.2z" />
          <path d="M9 12l2 2 4-4.2" />
        </svg>
      </span>
      <span className="fc-txt">Free website check</span>
    </Link>
  );
}
