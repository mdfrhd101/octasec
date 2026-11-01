import Link from "next/link";

/** Primary scoping CTA pair used across sub-pages, as HUD buttons. How it works drops the link to itself. */
export default function ScopeCTA({ howLink = true }: { howLink?: boolean }) {
  return (
    <div className="h-cta">
      <Link className="h-btn h-btn-red" href="/contact">
        Book a scoping call <span aria-hidden="true">&rsaquo;</span>
      </Link>
      {howLink ? (
        <Link className="h-btn h-btn-line" href="/how-it-works">
          See how it works
        </Link>
      ) : null}
    </div>
  );
}
