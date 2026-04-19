import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { GlassFilter } from "@/components/ui/liquid-glass-button";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium duration-200 ease-out motion-safe:transition-[transform,box-shadow,background-color,opacity,color,filter] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        /** Terracotta + glass (blur + gradient + optional SVG filter on fill) */
        default:
          "group relative overflow-hidden border border-primary/45 text-primary-foreground shadow-[var(--card-shadow)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_color-mix(in_srgb,var(--primary)_40%,transparent),var(--card-shadow)] active:translate-y-0 active:scale-[0.98]",
        destructive:
          "bg-[#ef4444] text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#dc2626] hover:shadow-md border-0 focus-visible:ring-[#ef4444]/35 active:translate-y-0 active:scale-[0.98]",
        outline:
          "border border-border bg-transparent shadow-none hover:-translate-y-0.5 hover:bg-muted/80 hover:text-foreground hover:shadow-sm active:translate-y-0 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-secondary/80 hover:shadow-md border-0 active:translate-y-0 active:scale-[0.98]",
        ghost:
          "border-0 hover:-translate-y-px hover:bg-muted/60 hover:text-foreground active:translate-y-0",
        link: "text-primary underline-offset-4 hover:underline border-0 shadow-none hover:-translate-y-px",
        primary:
          "group relative overflow-hidden border border-primary/45 text-primary-foreground shadow-[var(--card-shadow)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_color-mix(in_srgb,var(--primary)_40%,transparent),var(--card-shadow)] active:translate-y-0 active:scale-[0.98]",
        soft: "border-0 bg-[var(--ios-fill)] text-sky-400 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-sm active:translate-y-0",
        solidPrimary:
          "border-0 bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-md active:translate-y-0 active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * Orange glass stack. `backdrop-filter: url(#id)` is unreliable across browsers.
 * We use gradient + `backdrop-blur` + `filter: url()` on the painted layer instead.
 */
function OrangeLiquidGlassLayers({ filterId }) {
  return (
    <>
      <GlassFilter filterId={filterId} />
      {/* Rim light */}
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(80,30,15,0.2),0_4px_16px_rgba(217,119,87,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.35),0_4px_20px_rgba(0,0,0,0.35)]"
        aria-hidden
      />
      {/* Base terracotta (always visible if SVG filter is unsupported) */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] rounded-lg bg-gradient-to-b from-primary via-primary/90 to-primary/75"
        aria-hidden
      />
      {/* Displaced “liquid” layer — `filter: url()` on paint; fails gracefully behind solid base */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] rounded-lg bg-gradient-to-b from-primary/80 to-primary/50 opacity-75 mix-blend-soft-light"
        style={{ filter: `url(#${filterId})` }}
        aria-hidden
      />
      {/* Frosted sheen + blur */}
      <div
        className="pointer-events-none absolute inset-0 z-[2] rounded-lg bg-gradient-to-br from-white/30 via-primary/10 to-transparent backdrop-blur-[2px] dark:from-white/15"
        aria-hidden
      />
    </>
  );
}

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, type = "button", children, ...props }, ref) => {
    const isLiquidOrange =
      !asChild && (variant === "default" || variant === "primary");

    const Comp = asChild ? Slot : "button";

    const variantForCva =
      asChild && (variant === "default" || variant === "primary") ? "solidPrimary" : variant;

    const filterId = React.useId().replace(/:/g, "");

    if (isLiquidOrange) {
      return (
        <button
          ref={ref}
          type={type}
          data-slot="button"
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          <OrangeLiquidGlassLayers filterId={filterId} />
          <span className="relative z-[4] inline-flex w-full min-w-0 items-center justify-center gap-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">
            {children}
          </span>
        </button>
      );
    }

    return (
      <Comp
        data-slot="button"
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant: variantForCva, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
