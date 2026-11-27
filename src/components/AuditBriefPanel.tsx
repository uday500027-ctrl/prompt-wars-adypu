"use client";

import type { AuditResponse, AuditRiskLevel } from "@/src/lib/pii/types";

const RISK_STYLES: Record<
  AuditRiskLevel,
  { badge: string; label: string }
> = {
  LOW: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-900",
    label: "Low Risk",
  },
  MODERATE: {
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    label: "Moderate Risk",
  },
  HIGH: {
    badge: "border-rose-200 bg-rose-50 text-rose-900",
    label: "High Risk",
  },
};

interface AuditBriefPanelProps {
  audit: AuditResponse | null;
  loading: boolean;
  error: string | null;
  hasText: boolean;
  onRunAudit: () => void;
}

export function AuditBriefPanel({
  audit,
  loading,
  error,
  hasText,
  onRunAudit,
}: AuditBriefPanelProps) {
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 py-3 text-xs text-slate-600"
      >
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 motion-reduce:animate-none"
        />
        <span>
          Auditing already-sanitized text and aggregate entity counts...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start justify-between gap-2 py-2 sm:flex-row sm:items-center">
        <p
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-900"
        >
          {error}
        </p>
        <button
          type="button"
          disabled={!hasText}
          onClick={onRunAudit}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-45"
        >
          Retry Audit
        </button>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex flex-col items-start justify-between gap-3 py-2 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold text-slate-900">
            Post-Redaction Compliance Audit (Optional)
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Sends only the already-sanitized text and aggregate entity counts to{" "}
            <span className="font-mono">/api/audit</span> &mdash; raw PII never
            leaves your browser.
          </p>
        </div>
        <button
          type="button"
          disabled={!hasText}
          onClick={onRunAudit}
          className="shrink-0 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Run Gemini Privacy Audit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 py-1">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
            RISK_STYLES[audit.riskLevel].badge
          }`}
        >
          {RISK_STYLES[audit.riskLevel].label}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
            audit.safeToShare
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {audit.safeToShare ? "Safe to Share Externally" : "Internal QA Only"}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-[11px] text-slate-600">
          {audit.source === "gemini"
            ? `Gemini (${audit.model ?? "2.5-flash"})`
            : "Deterministic Local Fallback"}
        </span>
      </div>

      <p className="text-xs leading-5 text-slate-900">{audit.summary}</p>

      <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-slate-700">
        {audit.complianceNotes.map((note, idx) => (
          <li key={`${idx}-${note.slice(0, 16)}`}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
