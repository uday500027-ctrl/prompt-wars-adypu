"use client";

import type { ReactNode } from "react";

interface StarBorderProps {
  children: ReactNode;
  className?: string;
}

export function StarBorder({ children, className = "" }: StarBorderProps) {
  return (
    <div className={`relative inline-flex rounded-[7px] p-[1px] ${className}`}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[7px] bg-slate-400/20"
      >
        <span className="star-border-beam absolute -inset-[120%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#94A3B8_330deg,rgba(148,163,184,0.20)_355deg,transparent_360deg)] motion-reduce:hidden" />
      </span>
      <div className="relative z-10 inline-flex rounded-[6px] bg-slate-900">
        {children}
      </div>
    </div>
  );
}
