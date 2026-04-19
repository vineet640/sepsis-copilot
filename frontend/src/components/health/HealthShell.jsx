import React from "react";
import { cn } from "@/lib/utils";

/**
 * 21st.dev Magic MCP AppShell pattern:
 * sticky eyebrow + large title (iOS Health–style), then scrollable content.
 * @param {boolean} wide — full app frame width; when false, inner content is capped at max-w-2xl inside the frame
 */
export default function HealthShell({ eyebrow, title, subtitle, children, className, wide = false }) {
  return (
    <div className={cn("w-full", className)}>
      {/* Sticky title stack — pins under the global app header; width matches App header */}
      <div className="app-sticky-subheader">
        <div className="app-content-width pb-4 pt-10">
          {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
          <h1 className={cn("app-title-page", eyebrow ? "mt-2" : "pt-2")}>
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="app-content-width pb-12 pt-6">
        {wide ? children : <div className="mx-auto w-full max-w-2xl">{children}</div>}
      </div>
    </div>
  );
}
