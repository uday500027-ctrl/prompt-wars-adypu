"use client";

import { useEffect, useState } from "react";

interface RotatingTextProps {
  phrases: readonly string[];
  intervalMs?: number;
  pauseOnHover?: boolean;
  className?: string;
  srFallback?: string;
}

/** Cycles through a list of phrases at a fixed interval with optional hover pause. */
export function RotatingText({
  phrases,
  intervalMs = 3600,
  pauseOnHover = true,
  className = "",
  srFallback,
}: RotatingTextProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (phrases.length <= 1 || isPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [phrases, intervalMs, isPaused]);

  const currentPhrase = phrases[index] ?? phrases[0] ?? "";

  return (
    <span
      onMouseEnter={pauseOnHover ? () => setIsPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setIsPaused(false) : undefined}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className={`inline-grid align-baseline overflow-hidden whitespace-nowrap ${className}`}
    >
      <span className="sr-only">{srFallback ?? phrases.join(", ")}</span>
      {phrases.map((phrase) => (
        <span
          key={`sizer-${phrase}`}
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 select-none pointer-events-none"
        >
          {phrase}
        </span>
      ))}
      <span
        key={currentPhrase}
        aria-hidden="true"
        className="animate-rotating-text col-start-1 row-start-1 text-center"
      >
        {currentPhrase}
      </span>
    </span>
  );
}
