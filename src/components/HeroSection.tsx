"use client";

import { FadeContent } from "@/src/components/motion/FadeContent";
import { RotatingText } from "@/src/components/motion/RotatingText";

const HERO_TARGETS = [
  "support tickets",
  "CSV exports",
  "clinical notes",
  "server logs",
] as const;

const PROOF_ITEMS = [
  {
    title: "100% Client-Side",
    body: "Detection & redaction run synchronously in browser memory.",
  },
  {
    title: "Luhn-Verified Accuracy",
    body: "Automatically blocks false positives on 16-digit Order IDs.",
  },
  {
    title: "3 Redaction Modes",
    body: "Full Mask, Partial Mask, and Deterministic Pseudonymization.",
  },
] as const;

interface HeroSectionProps {
  onLaunchDemo: () => void;
  onTriggerUpload: () => void;
}

export function HeroSection({
  onLaunchDemo,
  onTriggerUpload,
}: HeroSectionProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-slate-200/80 bg-[#F8FAFC]"
    >
      <div
        aria-hidden="true"
        className="hero-dot-grid pointer-events-none absolute inset-0"
      />

      <div className="relative mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-14">
        <FadeContent>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-slate-700 shadow-2xs">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-emerald-600"
              />
              <span>ZERO-TRUST BROWSER SANITIZER &bull; 0 BYTES SENT</span>
            </div>

            <h1
              id="hero-heading"
              className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.12]"
            >
              Scrub sensitive PII from{" "}
              <RotatingText
                phrases={HERO_TARGETS}
                intervalMs={3600}
                pauseOnHover
                className="rounded-sm border-b-2 border-emerald-500/60 bg-emerald-50 px-1.5 text-emerald-900"
              />{" "}
              &mdash; entirely in your browser.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Luhn-verified credit card detection, Indian PAN and Aadhaar
              patterns, and three live redaction modes with zero server uploads.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onLaunchDemo}
                className="min-h-10 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 sm:text-sm"
              >
                Launch Live Demo &darr;
              </button>

              <button
                type="button"
                onClick={onTriggerUpload}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 shadow-2xs transition-colors hover:border-slate-900 hover:bg-slate-50 sm:text-sm"
              >
                Upload .txt / .csv
              </button>
            </div>
          </div>
        </FadeContent>

        <FadeContent delayMs={100}>
          <div className="mt-8 grid grid-cols-1 gap-3 border-t border-slate-200/80 pt-6 sm:grid-cols-3">
            {PROOF_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200/90 bg-white/90 px-4 py-3"
              >
                <h2 className="text-xs font-semibold tracking-tight text-slate-950">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </FadeContent>
      </div>
    </section>
  );
}
