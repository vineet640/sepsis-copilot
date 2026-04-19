import React from "react";
import { cn } from "@/lib/utils";

export default function HealthGroupedSection({ title, footnote, children, className = "" }) {
  return (
    <section className={cn("health-grouped", className)}>
      {title ? <h2 className="health-grouped__heading">{title}</h2> : null}
      <div className="health-grouped__card">{children}</div>
      {footnote ? <p className="health-grouped__footnote">{footnote}</p> : null}
    </section>
  );
}
