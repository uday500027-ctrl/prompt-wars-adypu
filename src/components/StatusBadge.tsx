"use client";

interface StatusBadgeProps {
  bytesSent?: number;
  processingTimeMs: number | null;
}

export function StatusBadge({
  bytesSent = 0,
  processingTimeMs,
}: StatusBadgeProps) {
  return (
    <header className="sticky top-0 z-30 h-[52px] border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth={1.9}
            >
              <path
                d="M12 3L19 6V11.5C19 16.2 16 20 12 21.2C8 20 5 16.2 5 11.5V6L12 3Z"
                strokeLinejoin="round"
              />
              <path d="M8.5 10.5H15.5" stroke="#10B981" strokeLinecap="round" />
              <path d="M8.5 14H13" stroke="#94A3B8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">
            RedactLocal
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-medium text-emerald-900">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-600"
              aria-hidden="true"
            />
            <span className="font-mono">
              Local-Only &bull; {bytesSent} Bytes Sent
            </span>
          </div>
          <span
            className="hidden min-w-[56px] rounded-md border border-slate-200/90 bg-slate-50 px-2 py-1 text-center font-mono text-[11px] text-slate-600 sm:inline-block"
            title="Client-side scan latency"
          >
            {processingTimeMs !== null
              ? `${processingTimeMs.toFixed(1)} ms`
              : "0.0 ms"}
          </span>
        </div>
      </div>
    </header>
  );
}
