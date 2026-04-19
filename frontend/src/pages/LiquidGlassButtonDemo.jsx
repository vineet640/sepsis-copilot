import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { MetalButton } from "@/components/ui/liquid-glass-button";

/** Unsplash alpine landscape background for glass visibility */
const BG =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80";

export default function LiquidGlassButtonDemo() {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)]">
      <div className="app-content-width py-6">
        <p className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="text-primary underline-offset-2 hover:underline">
            ← Back to browse
          </Link>
        </p>
        <h1 className="app-title-page mb-2">Terracotta Liquid Glass</h1>
        <p className="app-meta-line mb-8 max-w-xl">
          Primary actions use the shared <code className="rounded bg-muted px-1 py-0.5 text-xs">Button</code> with
          orange tint and SVG glass displacement. The photo background shows the effect.
        </p>
      </div>

      <div
        className="relative mx-auto mb-10 h-[220px] w-full max-w-3xl overflow-hidden rounded-xl border border-border shadow-[var(--card-shadow)]"
        style={{
          backgroundImage: `url(${BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-background/20" aria-hidden />
        <Button
          type="button"
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        >
          Continue (glass)
        </Button>
      </div>

      <div className="app-content-width mb-10 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 p-6">
        <span className="text-sm text-muted-foreground">On app surface:</span>
        <Button type="button">Default</Button>
        <Button type="button" variant="primary">
          Primary
        </Button>
        <Button type="button" variant="outline">
          Outline
        </Button>
      </div>

      <div className="app-content-width pb-10">
        <h2 className="app-card-heading text-foreground">Metal Accent Buttons</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          <MetalButton variant="primary">Primary</MetalButton>
          <MetalButton variant="success">Success</MetalButton>
          <MetalButton variant="error">Error</MetalButton>
          <MetalButton variant="gold">Gold</MetalButton>
          <MetalButton variant="bronze">Bronze</MetalButton>
        </div>
      </div>
    </div>
  );
}
