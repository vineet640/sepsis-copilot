/** Shared risk ring colors, labels, and glow for patient + clinician gauge cards. */

/** Glowing drop-shadow for risk ring */
export function riskLevelGlow(level) {
  switch (level) {
    case "Critical":
      return "0 0 32px rgba(239, 68, 68, 0.5)";
    case "High":
      return "0 0 28px rgba(239, 68, 68, 0.4)";
    case "Moderate":
      return "0 0 26px rgba(245, 158, 11, 0.42)";
    case "Low":
      return "0 0 24px rgba(16, 185, 129, 0.38)";
    default:
      return "0 0 18px rgba(148, 163, 184, 0.22)";
  }
}

export function riskVisual(level) {
  switch (level) {
    case "Low":
      return {
        ring: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
        text: "text-green-700 dark:text-green-300",
        badge: "border-green-300 bg-green-50 text-green-800 dark:border-green-700",
        label: "Low risk",
      };
    case "Moderate":
      return {
        ring: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
        text: "text-amber-700 dark:text-amber-300",
        badge: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700",
        label: "Moderate risk",
      };
    case "High":
      return {
        ring: "border-red-300 bg-red-50 dark:border-red-600/50 dark:bg-red-950/80",
        text: "text-red-600 dark:text-red-400",
        badge: "border-red-400 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-950/50 dark:text-red-200",
        label: "High risk",
      };
    case "Critical":
      return {
        ring: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950",
        text: "text-red-600 dark:text-red-400",
        badge: "border-red-300 bg-red-50 text-red-800 dark:border-red-700",
        label: "Critical risk",
      };
    default:
      return {
        ring: "border-muted bg-muted/30",
        text: "text-foreground",
        badge: "border-border",
        label: "Risk",
      };
  }
}
