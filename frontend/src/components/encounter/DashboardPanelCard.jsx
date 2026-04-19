import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { cn } from "@/lib/utils";

/** Matches ClinicianEncounterDashboard card styling (shadcn + compact header). */
export function DashboardPanelCard({
  title,
  description,
  children,
  className,
  contentClassName,
  headerClassName,
  titleClassName,
}) {
  return (
    <Card className={cn("gap-0 border-border py-0", className)}>
      {title ? (
        <CardHeader className={cn("px-6 pb-3 pt-6", headerClassName)}>
          <CardTitle className={titleClassName}>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("px-6 pb-6", title ? "pt-0" : "pt-6", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
