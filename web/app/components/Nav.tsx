"use client";

import Link from "next/link";
import { useState } from "react";

const NAVITEMS: [string, string][] = [
  ["/how-it-works", "How it works"],
  ["/services", "Services"],
  ["/benchmarks", "Benchmarks"],
  ["/faq", "FAQ"],
  ["/about", "About"],
];

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16v-8L8 2.5Z"
        stroke="#0d1a12"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.2 11 14.8 15.6 9.4"
        stroke="#b78e22"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <a className="annbar" href="/about/">
        <b>OCTAGRAM</b> OctaSec is Octagram&apos;s AI-orchestrated offensive engine
        &mdash; every finding human-verified <span className="ar">&rarr;</span>
      </a>
      <header className="nav">
        <div className="wrap">
          <div className="navbar">
            <Link className="brand" href="/" aria-label="OctaSec home">
              <BrandMark /> OCTASEC
            </Link>
            <nav className="nav-links" aria-label="Primary">
              {NAVITEMS.map(([h, t]) => (
                <Link key={h} href={h}>
                  {t}
                </Link>
              ))}
            </nav>
            <div className="nav-right">
              <a className="portal-link" href="/portal/">
                Sign in
              </a>
              <Link className="btn btn-dark btn-sm" href="/contact">
                Book a scoping call
              </Link>
              <button
                className="menu-btn"
                id="menuBtn"
                aria-label="Menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
            </div>
          </div>
          <div
            className={"mobile-panel" + (open ? " open" : "")}
            id="mobilePanel"
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName === "A") setOpen(false);
            }}
          >
            {NAVITEMS.map(([h, t]) => (
              <Link key={h} href={h}>
                {t}
              </Link>
            ))}
            <a href="/portal/">Sign in</a>
            <Link href="/contact" style={{ color: "#b78e22" }}>
              Book a scoping call
            </Link>
          </div>
        </div>
      </header>
      <a id="top" />
    </>
  );
}
