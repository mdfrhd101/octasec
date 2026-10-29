"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import type { AnchorHTMLAttributes, HTMLAttributes, TableHTMLAttributes } from "react";

// Renders a Markdown article body inside a styled .prose wrapper. Internal links
// (href starting with "/") become client-side Next links; external links open
// in a new, safe tab.
function Anchor({ href = "", children, node: _node, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) {
  if (href.startsWith("/")) {
    return <Link href={href}>{children}</Link>;
  }
  const external = /^https?:/.test(href);
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
      {children}
    </a>
  );
}

// HUD reading layout (hud-pages-c.css): section heads, tables, call-outs and dividers carry
// [data-rv], so HudMotion reveals them as they scroll in. Only these small blocks: a reveal
// on the whole (very tall) article never reached the observer's threshold and stayed hidden.
type El = HTMLAttributes<HTMLElement> & { node?: unknown };
const H2 = ({ node: _n, ...p }: El) => <h2 data-rv="" {...p} />;
const Quote = ({ node: _n, className, ...p }: El) => <blockquote data-rv="" className={"h-edge" + (className ? " " + className : "")} {...p} />;
const Rule = ({ node: _n, ...p }: El) => <hr data-rv="" {...(p as HTMLAttributes<HTMLHRElement>)} />;
// wide tables scroll sideways inside their own frame instead of widening the page
const Table = ({ node: _n, ...p }: TableHTMLAttributes<HTMLTableElement> & { node?: unknown }) => (
  <div className="pc-tbl" data-rv="">
    <table {...p} />
  </div>
);

export default function Prose({ body }: { body: string }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: Anchor, h2: H2, blockquote: Quote, hr: Rule, table: Table }}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
