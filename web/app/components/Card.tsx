import type { CSSProperties, ReactNode } from "react";

export default function Card({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={"card" + (className ? " " + className : "")} style={style}>
      {children}
    </div>
  );
}
