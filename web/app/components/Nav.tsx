"use client";

import Link from "next/link";
import BrandLockup from "./BrandLockup";
import { useState } from "react";

const NAVITEMS: [string, string][] = [
  ["/how-it-works", "How it works"],
  ["/services", "Services"],
  ["/website-check", "Free website check"],
  ["/php2shell", "PHP2Shell patch"],
  ["/benchmarks", "Benchmarks"],
  ["/blog", "Blog"],
  ["/pricing", "Pricing"],
  ["/faq", "FAQ"],
  ["/about", "About"],
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <a className="annbar" href="/php2shell/">
        <b>ACTIVE EXPLOITATION</b> PHP2Shell pre-auth RCE in PHP core &mdash;
        emergency patching from $10/site, EOL PHP covered <span className="ar">&rarr;</span>
      </a>
      <header className="nav">
        <div className="wrap">
          <div className="navbar">
            <Link className="brand" href="/" aria-label="OctaSec home">
              <BrandLockup height={26} />
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
            <Link href="/contact" style={{ color: "#9a1f18" }}>
              Book a scoping call
            </Link>
          </div>
        </div>
      </header>
      <a id="top" />
    </>
  );
}
