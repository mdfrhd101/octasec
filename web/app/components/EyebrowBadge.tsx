import type { ReactNode } from "react";

export default function EyebrowBadge({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}
