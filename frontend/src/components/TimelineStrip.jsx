import React from "react";

export default function TimelineStrip({ currentTp, events = [] }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
      {[1, 2, 3, 4].map((tp) => (
        <div
          key={tp}
          style={{
            padding: "0.35rem 0.6rem",
            borderRadius: 8,
            background:
              currentTp === tp ? "color-mix(in srgb, var(--ios-green) 20%, transparent)" : "var(--ios-fill)",
            border: currentTp === tp ? "1px solid var(--ios-green)" : "1px solid transparent",
            fontSize: "0.75rem",
          }}
        >
          TP{tp}
        </div>
      ))}
    </div>
  );
}
