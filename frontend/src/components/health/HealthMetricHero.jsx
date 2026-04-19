import React from "react";
import { cn } from "@/lib/utils";

export default function HealthMetricHero({ value, unit = "%", subtitle, className }) {
  return (
    <div className={cn("health-metric", className)}>
      <div className="health-metric__inner">
        <span className="health-metric__num">{value}</span>
        {unit != null && unit !== "" ? <span className="health-metric__unit">{unit}</span> : null}
      </div>
      {subtitle ? <p className="health-metric__tagline">{subtitle}</p> : null}
    </div>
  );
}
