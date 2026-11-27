"use client";

import { useRef, useState, type ReactNode } from "react";
import { ENTITY_META } from "@/src/lib/pii/constants";
import type {
  PiiType,
  RedactionMode,
  SanitizationResult,
} from "@/src/lib/pii/types";

const MODE_LABELS: Record<RedactionMode, string> = {
  FULL_MASK: "Full Mask",
  PARTIAL_MASK: "Partial Mask",
  PSEUDONYMIZE: "Pseudonymize",
};

function LineNumbers({ text }: { text: string }) {
  const lineCount = Math.max(1, text.split("\n").length);
  return (
    <div
      aria-hidden="true"
      className="select-none border-r border-slate-200/80 bg-slate-50/70 px-2.5 py-3 text-right font-mono text-[11px] leading-6 text-slate-500"
    >
      {Array.from({ length: lineCount }, (_, idx) => (
        <div key={idx + 1}>{idx + 1}</div>
      ))}
    </div>
  );
}

interface DiffViewerProps {
  rawText: string;
  onChangeRawText: (next: string) => void;
  onClear: () => void;
  onDropFile: (file: File) => void;
  isReadingFile: boolean;
  fileError: string | null;
  result: SanitizationResult;
  activeCategoryFilter: PiiType | null;
}

/** Side-by-side raw vs. sanitized diff viewer with drag-and-drop upload and inline edit mode. */
export function DiffViewer({
  rawText,
  onChangeRawText,
  onClear,
  onDropFile,
  isReadingFile,
  fileError,
  result,
  activeCategoryFilter,
}: DiffViewerProps) {
  const [inputView, setInputView] = useState<"HIGHLIGHTED" | "EDIT">(
    "HIGHLIGHTED"
  );
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const hasText = rawText.trim().length > 0;
  const effectiveView = hasText ? inputView : "EDIT";

  const switchToEdit = () => {
    setInputView("EDIT");
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const originalNodes: ReactNode[] = [];
  const sanitizedNodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of result.matches) {
    if (match.start > cursor) {
      const unchanged = result.originalText.slice(cursor, match.start);
      originalNodes.push(
        <span key={`orig-txt-${cursor}`}>{unchanged}</span>
      );
      sanitizedNodes.push(
        <span key={`san-txt-${cursor}`}>{unchanged}</span>
      );
    }

    const meta = ENTITY_META[match.type];
    const isDimmed =
      activeCategoryFilter !== null && activeCategoryFilter !== match.type;

    originalNodes.push(
      <mark
        key={`orig-mark-${match.id}`}
        className={`rounded px-1 py-0.5 font-medium transition-colors ${
          isDimmed
            ? "border border-slate-300 bg-slate-100 text-slate-800"
            : meta.markClass
        }`}
      >
        <span className="sr-only">{meta.label}: </span>
        {match.value}
      </mark>
    );

    sanitizedNodes.push(
      <span
        key={`san-mark-${match.id}`}
        className={`inline-flex items-center gap-1 rounded border px-1 py-0.5 font-semibold transition-colors ${
          isDimmed
            ? "border-slate-300 bg-slate-100 text-slate-800"
            : meta.badgeClass
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
            isDimmed ? "bg-slate-500" : meta.dotClass
          }`}
        />
        {match.replacement}
      </span>
    );

    cursor = match.end;
  }

  if (cursor < result.originalText.length) {
    const tail = result.originalText.slice(cursor);
    originalNodes.push(<span key={`orig-tail-${cursor}`}>{tail}</span>);
    sanitizedNodes.push(<span key={`san-tail-${cursor}`}>{tail}</span>);
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {/* Left Pane: Raw Input — Local Only */}
      <section
        aria-labelledby="left-pane-heading"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onDropFile(file);
        }}
        className={`relative flex h-[360px] flex-col overflow-hidden rounded-xl border bg-white transition-colors lg:h-[420px] ${
          isDragging
            ? "border-slate-900 ring-2 ring-slate-900/15"
            : "border-slate-200/90"
        }`}
      >
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-slate-200/90 bg-slate-50/80 px-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2
              id="left-pane-heading"
              className="truncate text-xs font-semibold text-slate-900"
            >
              Raw Input &mdash; Local Only
            </h2>
            <span className="hidden font-mono text-[11px] text-slate-600 sm:inline">
              {rawText.length.toLocaleString()} chars
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              role="group"
              aria-label="Raw input display mode"
              className="inline-flex rounded-md border border-slate-200/90 bg-white p-0.5"
            >
              <button
                type="button"
                aria-pressed={effectiveView === "HIGHLIGHTED"}
                disabled={!hasText}
                onClick={() => setInputView("HIGHLIGHTED")}
                className={`min-h-7 rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                  effectiveView === "HIGHLIGHTED"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Highlighted
              </button>
              <button
                type="button"
                aria-pressed={effectiveView === "EDIT"}
                onClick={switchToEdit}
                className={`min-h-7 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  effectiveView === "EDIT"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Edit
              </button>
            </div>

            {hasText && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setInputView("EDIT");
                  window.requestAnimationFrame(() => {
                    textareaRef.current?.focus();
                  });
                }}
                className="min-h-7 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {fileError && (
          <div
            role="alert"
            aria-live="assertive"
            className="border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-900"
          >
            {fileError}
          </div>
        )}

        <div className="relative flex flex-1 overflow-auto">
          {isDragging && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-[1px]">
              <p className="rounded-lg border border-dashed border-slate-400 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900">
                Drop .txt or .csv file to sanitize locally
              </p>
            </div>
          )}

          {isReadingFile ? (
            <div
              role="status"
              className="flex flex-1 items-center justify-center p-6 text-xs text-slate-600"
            >
              Reading local file in memory...
            </div>
          ) : effectiveView === "HIGHLIGHTED" && hasText ? (
            <div className="flex min-h-full w-full items-start">
              <LineNumbers text={rawText} />
              <div
                tabIndex={0}
                aria-label="Raw input with detected PII highlights. Switch to Edit to modify."
                onDoubleClick={switchToEdit}
                className="flex-1 px-3.5 py-3 font-mono text-xs leading-6 whitespace-pre-wrap break-words text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-inset"
              >
                {originalNodes}
              </div>
            </div>
          ) : (
            <div className="flex min-h-full w-full items-stretch">
              <LineNumbers text={rawText || " "} />
              <div className="flex flex-1 flex-col">
                <label htmlFor="raw-pii-input" className="sr-only">
                  Raw text input for local PII sanitization
                </label>
                <textarea
                  ref={textareaRef}
                  id="raw-pii-input"
                  value={rawText}
                  onChange={(e) => onChangeRawText(e.target.value)}
                  spellCheck={false}
                  placeholder="Paste support tickets, clinical notes, logs, or drag & drop a .txt / .csv file here..."
                  className="h-full w-full flex-1 resize-none border-0 bg-transparent px-3.5 py-3 font-mono text-xs leading-6 text-slate-900 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-inset"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Right Pane: Sanitized Output — Live Diff */}
      <section
        aria-labelledby="right-pane-heading"
        className="flex h-[360px] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white lg:h-[420px]"
      >
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-slate-200/90 bg-slate-50/80 px-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2
              id="right-pane-heading"
              className="truncate text-xs font-semibold text-slate-900"
            >
              Sanitized Output &mdash; Live Diff
            </h2>
            <span className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600 sm:inline-block">
              {MODE_LABELS[result.mode]}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {result.counts.CREDIT_CARD > 0 && (
              <span className="rounded border border-slate-300/80 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#3B5B8A]">
                Luhn-verified
              </span>
            )}
            {result.falsePositivesBlocked > 0 && (
              <span className="rounded border border-slate-300/80 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                Order ID preserved
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-auto">
          {!hasText ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-xs font-medium text-slate-900">
                No input text loaded
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Load a sample preset, drop a .txt/.csv file, or paste text in
                the left pane.
              </p>
            </div>
          ) : (
            <div className="flex min-h-full w-full items-start">
              <LineNumbers text={result.sanitizedText} />
              <div
                tabIndex={0}
                aria-label="Sanitized output live diff"
                className="flex-1 px-3.5 py-3 font-mono text-xs leading-6 whitespace-pre-wrap break-words text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-inset"
              >
                {sanitizedNodes}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
