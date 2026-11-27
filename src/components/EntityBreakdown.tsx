"use client";

import { ENTITY_META } from "@/src/components/DiffViewer";
import type {
  PiiType,
  RedactionMode,
  SanitizationResult,
} from "@/src/lib/pii/types";

const ENTITY_ORDER: readonly PiiType[] = [
  "EMAIL",
  "PHONE",
  "IP_ADDRESS",
  "PAN",
  "AADHAAR",
  "CREDIT_CARD",
];

interface EntityBreakdownProps {
  result: SanitizationResult;
  activeCategoryFilter: PiiType | null;
  onSelectCategoryFilter: (next: PiiType | null) => void;
}

export function EntityBreakdown({
  result,
  activeCategoryFilter,
  onSelectCategoryFilter,
}: EntityBreakdownProps) {
  return (
    <section
      aria-label="Detection telemetry and category filters"
      className="flex flex-col gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-slate-600">
            Entities Redacted
          </span>
          <span className="font-mono text-sm font-semibold text-slate-900">
            {result.totalMatches}
          </span>
        </div>

        <span aria-hidden="true" className="h-3.5 w-px bg-slate-200" />

        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-slate-600">
            False Positives Blocked (Luhn)
          </span>
          <span className="font-mono text-sm font-semibold text-emerald-800">
            {result.falsePositivesBlocked}
          </span>
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter diff highlights by PII category"
        className="flex flex-wrap items-center gap-1.5"
      >
        <button
          type="button"
          aria-pressed={activeCategoryFilter === null}
          onClick={() => onSelectCategoryFilter(null)}
          className={`min-h-7 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            activeCategoryFilter === null
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          }`}
        >
          All
        </button>

        {ENTITY_ORDER.map((type) => {
          const meta = ENTITY_META[type];
          const count = result.counts[type];
          const selected = activeCategoryFilter === type;

          return (
            <button
              key={type}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onSelectCategoryFilter(selected ? null : type)
              }
              className={`inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                selected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : `${meta.badgeClass} hover:brightness-95`
              }`}
            >
              <span>{meta.label}</span>
              <span className="font-mono font-semibold">{count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface PseudonymTableProps {
  result: SanitizationResult;
  onSwitchToPseudonymize: (mode: RedactionMode) => void;
}

export function PseudonymTable({
  result,
  onSwitchToPseudonymize,
}: PseudonymTableProps) {
  if (result.mode !== "PSEUDONYMIZE") {
    return (
      <div className="flex flex-col items-start justify-between gap-3 py-2 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold text-slate-900">
            Pseudonym mapping is active in Pseudonymize mode
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Switch to Pseudonymize to map recurring entities deterministically
            (e.g., <span className="font-mono">EMAIL_01</span>,{" "}
            <span className="font-mono">CARD_01</span>) while keeping original
            values strictly local.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSwitchToPseudonymize("PSEUDONYMIZE")}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50"
        >
          Switch to Pseudonymize
        </button>
      </div>
    );
  }

  if (result.pseudonymMap.length === 0) {
    return (
      <p className="py-2 text-xs text-slate-600">
        No PII entities detected yet to populate the local pseudonym mapping
        table.
      </p>
    );
  }

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Consistent pseudonym mapping table"
      className="max-h-56 overflow-auto rounded-lg border border-slate-200/90"
    >
      <table className="min-w-full border-collapse text-left text-xs">
        <caption className="sr-only">
          Local mapping between deterministic pseudonym tokens and original
          detected PII values
        </caption>
        <thead className="sticky top-0 bg-slate-50 text-slate-600">
          <tr className="border-b border-slate-200/90">
            <th scope="col" className="px-3.5 py-2 font-semibold">
              Token
            </th>
            <th scope="col" className="px-3.5 py-2 font-semibold">
              Category
            </th>
            <th scope="col" className="px-3.5 py-2 font-semibold">
              Original Value (Local Only)
            </th>
            <th scope="col" className="px-3.5 py-2 text-right font-semibold">
              Hits
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/80 bg-white">
          {result.pseudonymMap.map((entry) => {
            const meta = ENTITY_META[entry.type];
            return (
              <tr key={entry.token} className="hover:bg-slate-50/70">
                <th
                  scope="row"
                  className="px-3.5 py-2 font-mono font-semibold text-slate-900"
                >
                  {entry.token}
                </th>
                <td className="px-3.5 py-2">
                  <span
                    className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}
                  >
                    {meta.label}
                  </span>
                </td>
                <td className="px-3.5 py-2 font-mono text-slate-900 break-all">
                  {entry.sampleValue}
                </td>
                <td className="px-3.5 py-2 text-right font-mono font-medium text-slate-600">
                  {entry.occurrences}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
