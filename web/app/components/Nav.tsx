"use client";

import Link from "next/link";
import BrandLockup from "./BrandLockup";
import ThemeToggle from "./ThemeToggle";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type DItem = { href: string; title: string; note?: string; lead?: boolean };
type NavItem = { label: string; href?: string; dropdown?: DItem[] };

// Primary bar. Services and About are dropdowns; everything else is a direct link.
const NAV: NavItem[] = [
  { label: "How it works", href: "/how-it-works" },
  {
    label: "Services",
    dropdown: [
      { href: "/services", title: "All services", note: "Six testing surfaces" },
      { href: "/php2shell", title: "PHP2Shell patch", note: "Emergency pre-auth RCE fix", lead: true },
    ],
  },
  { label: "Pricing", href: "/pricing" },
  { label: "Benchmarks", href: "/benchmarks" },
  {
    label: "About",
    dropdown: [
      { href: "/about", title: "About OctaSec" },
      { href: "/blog", title: "Blog" },
      { href: "/faq", title: "FAQ" },
      { href: "/contact", title: "Contact" },
    ],
  },
];

export default function Nav() {
  const [open, setOpen] = useState(false); // mobile panel
  const [dd, setDd] = useState<string | null>(null); // open desktop dropdown
  const [mdd, setMdd] = useState<string | null>(null); // open mobile accordion
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [tucked, setTucked] = useState(false); // phones/tablets: bar hidden while scrolling down
  const pathname = usePathname();

  // Back/forward (or any client-side navigation) closes every open menu — link clicks already
  // did; without this the mobile panel stayed open, scroll-locked, over the previous page.
  useEffect(() => {
    setOpen(false);
    setDd(null);
    setMdd(null);
  }, [pathname]);

  // Phones/tablets: slide the bar away on scroll down, bring it back on scroll up —
  // frees ~70px of a small screen (most of all in landscape). Small moves are ignored.
  useEffect(() => {
    const small = window.matchMedia("(max-width: 900px)");
    let lastY = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (!small.matches || y < 120) {
          setTucked(false);
          lastY = y;
          return;
        }
        if (Math.abs(y - lastY) < 8) return;
        setTucked(y > lastY);
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // While the mobile panel is open: lock background scroll, tag <body> (hides the
  // floating button), move focus into the panel and keep Tab inside it, close on
  // Esc or when the window grows to the desktop layout.
  useEffect(() => {
    const body = document.body;
    body.style.overflow = open ? "hidden" : "";
    body.classList.toggle("menu-open", open);
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
    window.__lenis?.stop(); // smooth scroll pauses too, or the wheel scrolls the page behind the panel
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtnRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [menuBtnRef.current, ...Array.from(panelRef.current.querySelectorAll<HTMLElement>("a,button"))]
        .filter((x): x is HTMLElement => !!x && !x.closest("[inert]"));
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 901px)");
    const onDesktop = () => desktop.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      body.style.overflow = "";
      body.classList.remove("menu-open");
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
      window.__lenis?.start();
    };
  }, [open]);

  // An open desktop dropdown closes on a tap/click outside it, or on Esc.
  useEffect(() => {
    if (!dd) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t?.closest?.(".nav-dd")) setDd(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // focus was on an item of the closing menu: hand it back to that menu's toggle, not to <body>
      const menu = document.activeElement?.closest(".nav-dd");
      setDd(null);
      menu?.querySelector<HTMLElement>(".nav-dd-btn")?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [dd]);

  const closeAll = () => {
    setOpen(false);
    setDd(null);
    setMdd(null);
  };

  return (
    <>
      <a className="annbar" href="/php2shell/">
        <b className="ann-tag">ACTIVE EXPLOITATION</b>
        <span className="ann-long">
          PHP2Shell pre-auth RCE in PHP core &mdash; emergency patching from $10/site, EOL PHP covered
        </span>
        {/* phones/tablets show this one-line version instead (mobile.css) */}
        <span className="ann-short">
          <b>PHP2Shell RCE</b> &mdash; patch from $10
        </span>
        <span className="ar">&rarr;</span>
      </a>
      <div className={"mp-backdrop" + (open ? " open" : "")} onClick={closeAll} aria-hidden="true" />
      <header className={"nav" + (tucked && !open ? " is-hidden" : "")} onFocus={() => setTucked(false)}>
        <div className="wrap">
          <div className="navbar">
            <Link className="brand" href="/" aria-label="OctaSec home" onClick={closeAll}>
              <BrandLockup height={26} />
            </Link>

            <nav className="nav-links" aria-label="Primary">
              {NAV.map((item) =>
                item.dropdown ? (
                  <div
                    key={item.label}
                    className={"nav-dd" + (dd === item.label ? " open" : "")}
                    // hover-open for a real mouse only: on touch screens the emulated
                    // mouseenter opened the menu and the click instantly toggled it shut
                    onPointerEnter={(e) => e.pointerType === "mouse" && setDd(item.label)}
                    onPointerLeave={(e) => e.pointerType === "mouse" && setDd(null)}
                    // keyboard: tabbing out of an open menu closes it
                    onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setDd((v) => (v === item.label ? null : v))}
                  >
                    <button
                      type="button"
                      className="nav-dd-btn"
                      aria-expanded={dd === item.label}
                      aria-controls={"dd-" + item.label.toLowerCase()}
                      onClick={() => setDd((v) => (v === item.label ? null : item.label))}
                    >
                      {item.label} <span className="cr" aria-hidden>&#9662;</span>
                    </button>
                    <div className="nav-dd-menu" id={"dd-" + item.label.toLowerCase()}>
                      {item.dropdown.map((it) => (
                        <Link
                          key={it.href}
                          href={it.href}
                          className={it.lead ? "dd-item dd-lead" : "dd-item"}
                          onClick={closeAll}
                        >
                          <span className="dd-t">{it.title}</span>
                          {it.note && <span className="dd-n">{it.note}</span>}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link key={item.label} href={item.href!}>
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            <div className="nav-right">
              <a className="portal-link" href="/portal/">
                Sign in
              </a>
              <Link className="btn btn-dark btn-sm" href="/contact">
                Book a scoping call
              </Link>
              <ThemeToggle />
              <button
                type="button"
                className="menu-btn"
                id="menuBtn"
                ref={menuBtnRef}
                aria-controls="mobilePanel"
                aria-label={open ? "Close menu" : "Menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                  {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
                </svg>
              </button>
            </div>
          </div>

          <div
            className={"mobile-panel" + (open ? " open" : "")}
            id="mobilePanel"
            ref={panelRef}
            tabIndex={-1}
            inert={!open}
            data-lenis-prevent
          >
            {NAV.map((item) =>
              item.dropdown ? (
                <div key={item.label}>
                  <button
                    type="button"
                    className={"mp-group" + (mdd === item.label ? " open" : "")}
                    aria-expanded={mdd === item.label}
                    onClick={() => setMdd((v) => (v === item.label ? null : item.label))}
                  >
                    {item.label} <span className="cr" aria-hidden>&#9662;</span>
                  </button>
                  <div className={"mp-sub" + (mdd === item.label ? " open" : "")} inert={mdd !== item.label}>
                    {item.dropdown.map((it) => (
                      <Link key={it.href} href={it.href} className={it.lead ? "dd-lead" : ""} onClick={closeAll}>
                        {it.title}
                        {it.note && <span className="dd-n"> &mdash; {it.note}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link key={item.label} href={item.href!} onClick={closeAll}>
                  {item.label}
                </Link>
              )
            )}

            <div className="mp-cta">
              <a href="/portal/" onClick={closeAll}>
                Sign in
              </a>
              <Link className="btn btn-white btn-sm" href="/contact" onClick={closeAll}>
                Book a scoping call
              </Link>
            </div>
          </div>
        </div>
      </header>
      <a id="top" />
    </>
  );
}
