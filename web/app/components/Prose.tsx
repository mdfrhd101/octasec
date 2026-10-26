"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

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

export default function Prose({ body }: { body: string }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: Anchor }}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
