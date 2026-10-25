"use client";

import { useState } from "react";

/**
 * Phones only (≤600px, mobile.css): the content is clipped to a short peek with a fade
 * and a "show all" button, so long reference blocks don't make the page endless.
 * Tablet/desktop: everything shows and the button is hidden. The clipped content stays
 * in the DOM, so screen readers still get all of it.
 */
export default function MobileCollapse({
  more,
  less = "Show less",
  children,
}: {
  more: string;
  less?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"mcol" + (open ? " open" : "")}>
      <div className="mcol-body">{children}</div>
      <button type="button" className="mcol-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? less : more}
        <span aria-hidden="true">{open ? "↑" : "↓"}</span>
      </button>
    </div>
  );
}
