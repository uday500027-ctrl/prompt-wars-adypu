"use client";

import type { ReactNode } from "react";

interface FadeContentProps {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}

export function FadeContent({
  children,
  delayMs = 0,
  className = "",
}: FadeContentProps) {
  return (
    <div
      className={`animate-fade-content ${className}`}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
