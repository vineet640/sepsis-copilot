import React from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { cn } from "@/lib/utils";
import { riskLevelGlow, riskVisual } from "@/lib/riskVisual.js";

/**
 * Shared risk score gauge for patient ("How You're Doing") and clinician ("Risk Assessment") layouts.
 * Same dimensions, typography, glow, badge, and caption strip.
 */
export function RiskGaugeCard({
  title,
  riskLevel,
  riskScore,
  /** Line under the big number (e.g. "Risk Score" or patient-friendly attention label). Defaults to level label. */
  underScoreCaption,
  id,
  className,
  children,
}) {
  const rv = riskVisual(riskLevel);
  const display = riskScore != null && riskScore !== "" ? riskScore : "-";
  const subLine = underScoreCaption ?? rv.label;
  const showPulse = riskLevel === "High" || riskLevel === "Critical";

  return (
    <Card id={id} className={cn("scroll-mt-24 gap-0 overflow-hidden border-border py-0", className)}>
      <CardHeader className="pb-3 pt-6">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 pb-6">
        <div className="flex flex-col items-center justify-center py-2">
          <div
            className={cn(
              "flex h-[132px] w-[132px] items-center justify-center rounded-full border-8",
              rv.ring
            )}
            style={{ boxShadow: riskLevelGlow(riskLevel) }}
          >
            <div className="text-center">
              <div className={cn("font-display text-5xl font-semibold tabular-nums tracking-tight", rv.text)}>
                {display}
              </div>
              <div className={cn("mt-0.5 text-xs font-medium leading-tight", rv.text)}>{subLine}</div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "mt-4 transition-transform duration-200 ease-out motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-sm",
              rv.badge
            )}
          >
            {showPulse ? <span className="risk-badge__pulse mr-1 inline-block" aria-hidden /> : null}
            <AlertCircle className="mr-1 h-3 w-3" />
            {riskLevel ? `${riskLevel} · ${rv.label}` : rv.label}
          </Badge>
          <p className="mt-3 max-w-[16rem] text-center text-xs leading-snug text-muted-foreground">
            How closely we&apos;re watching
          </p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
