"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AuditBriefPanel } from "@/src/components/AuditBriefPanel";
import { DiffViewer } from "@/src/components/DiffViewer";
import {
  EntityBreakdown,
  PseudonymTable,
} from "@/src/components/EntityBreakdown";
import { HeroSection } from "@/src/components/HeroSection";
import { FadeContent } from "@/src/components/motion/FadeContent";
import { StarBorder } from "@/src/components/motion/StarBorder";
import { StatusBadge } from "@/src/components/StatusBadge";
import { sanitizeText } from "@/src/lib/pii/engine";
import { SAMPLE_DATASETS } from "@/src/lib/pii/samples";
import type {
  AuditResponse,
  PiiType,
  RedactionMode,
} from "@/src/lib/pii/types";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const SAMPLE_SHORT_LABELS: Record<string, string> = {
  "support-ticket": "Support Ticket",
  "clinical-note": "Clinical Note",
  "customer-csv": "Customer CSV",
};

const MODE_OPTIONS: ReadonlyArray<{
  value: RedactionMode;
  label: string;
}> = [
  { value: "FULL_MASK", label: "Full Mask" },
  { value: "PARTIAL_MASK", label: "Partial Mask" },
  { value: "PSEUDONYMIZE", label: "Pseudonymize" },
];

const emptySubscribe = () => () => {};

type InspectionTab = "PSEUDONYMS" | "AUDIT";

export function RedactWorkspace() {
  const initialSample = SAMPLE_DATASETS[0];
  const [rawText, setRawText] = useState<string>(initialSample.content);
  const [mode, setMode] = useState<RedactionMode>("PSEUDONYMIZE");
  const [activeSampleId, setActiveSampleId] = useState<string | null>(
    initialSample.id
  );
  const [exportFilename, setExportFilename] = useState<string>(
    initialSample.filename
  );
  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<PiiType | null>(null);
  const [activeTab, setActiveTab] = useState<InspectionTab>("PSEUDONYMS");

  const [isReadingFile, setIsReadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Hydration-safe client check so SSR and initial client HTML match identically
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [auditBrief, setAuditBrief] = useState<AuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const workbenchRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pseudonymsTabRef = useRef<HTMLButtonElement | null>(null);
  const auditTabRef = useRef<HTMLButtonElement | null>(null);

  const result = useMemo(
    () => sanitizeText(rawText, mode),
    [rawText, mode]
  );

  const scrollToWorkbench = useCallback(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    workbenchRef.current?.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const handleLoadSample = useCallback((sampleId: string) => {
    const found = SAMPLE_DATASETS.find((s) => s.id === sampleId);
    if (!found) return;
    setRawText(found.content);
    setActiveSampleId(found.id);
    setExportFilename(found.filename);
    setActiveCategoryFilter(null);
    setFileError(null);
    setAuditBrief(null);
    setAuditError(null);
  }, []);

  const handleLaunchDemo = useCallback(() => {
    handleLoadSample("support-ticket");
    scrollToWorkbench();
  }, [handleLoadSample, scrollToWorkbench]);

  const handleFile = useCallback(
    async (file: File) => {
      setFileError(null);
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".txt") && !lower.endsWith(".csv")) {
        setFileError(
          "Unsupported file format. Please upload a .txt or .csv file."
        );
        scrollToWorkbench();
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileError("File exceeds the 2 MB local browser processing limit.");
        scrollToWorkbench();
        return;
      }

      setIsReadingFile(true);
      try {
        const content = await file.text();
        if (!content.trim()) {
          setFileError("The uploaded file appears to be empty.");
          scrollToWorkbench();
          return;
        }
        const ext = lower.endsWith(".csv") ? ".csv" : ".txt";
        const base = file.name.replace(/\.(txt|csv)$/i, "");
        setRawText(content);
        setActiveSampleId(null);
        setExportFilename(`${base}-sanitized${ext}`);
        setActiveCategoryFilter(null);
        setAuditBrief(null);
        setAuditError(null);
        scrollToWorkbench();
      } catch {
        setFileError("Unable to read this file in the browser.");
      } finally {
        setIsReadingFile(false);
      }
    },
    [scrollToWorkbench]
  );

  const handleCopy = useCallback(async () => {
    if (!result.sanitizedText) return;
    try {
      await navigator.clipboard.writeText(result.sanitizedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setFileError("Clipboard permission denied. Use Download instead.");
    }
  }, [result.sanitizedText]);

  const handleDownload = useCallback(() => {
    if (!result.sanitizedText) return;
    const mimeType = exportFilename.endsWith(".csv")
      ? "text/csv;charset=utf-8"
      : "text/plain;charset=utf-8";

    const blob = new Blob([result.sanitizedText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFilename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [exportFilename, result.sanitizedText]);

  const handleRunAudit = useCallback(async () => {
    setActiveTab("AUDIT");
    setAuditLoading(true);
    setAuditError(null);
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sanitizedText: result.sanitizedText,
          counts: result.counts,
          totalMatches: result.totalMatches,
          falsePositivesBlocked: result.falsePositivesBlocked,
          mode: result.mode,
        }),
      });
      if (!response.ok) {
        throw new Error(`Audit failed (${response.status})`);
      }
      const data = (await response.json()) as AuditResponse;
      setAuditBrief(data);
    } catch (err) {
      setAuditError(
        err instanceof Error ? err.message : "Unable to generate audit brief."
      );
    } finally {
      setAuditLoading(false);
    }
  }, [
    result.counts,
    result.falsePositivesBlocked,
    result.mode,
    result.sanitizedText,
    result.totalMatches,
  ]);

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    current: InspectionTab
  ) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next: InspectionTab =
        current === "PSEUDONYMS" ? "AUDIT" : "PSEUDONYMS";
      setActiveTab(next);
      window.requestAnimationFrame(() => {
        if (next === "PSEUDONYMS") {
          pseudonymsTabRef.current?.focus();
        } else {
          auditTabRef.current?.focus();
        }
      });
    }
  };

  const hasText = rawText.trim().length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <StatusBadge
        bytesSent={0}
        processingTimeMs={isClient ? result.processingTimeMs : null}
      />

      <main className="flex-1">
        <HeroSection
          onLaunchDemo={handleLaunchDemo}
          onTriggerUpload={() => fileInputRef.current?.click()}
        />

        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">
          <FadeContent delayMs={60}>
            <section
              id="workbench"
              ref={workbenchRef}
              aria-label="Interactive PII Sanitization Workbench"
              className="scroll-mt-16 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-15px_rgba(15,23,42,0.08)]"
            >
              {/* Dark-Slate Developer Security Toolbar */}
              <div className="dark-toolbar flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-100 sm:px-4">
                {/* Left: Sample Presets + Upload */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {SAMPLE_DATASETS.map((sample) => {
                    const isActive = activeSampleId === sample.id;
                    return (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleLoadSample(sample.id)}
                        aria-pressed={isActive}
                        className={`min-h-8 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          isActive
                            ? "border-white bg-white text-slate-950"
                            : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700/80"
                        }`}
                      >
                        {SAMPLE_SHORT_LABELS[sample.id] ?? sample.label}
                      </button>
                    );
                  })}

                  <input
                    ref={fileInputRef}
                    id="pii-file-upload"
                    type="file"
                    accept=".txt,.csv,text/plain,text/csv"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={isReadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-8 rounded-md border border-dashed border-slate-600 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-400 hover:text-white disabled:opacity-45"
                  >
                    {isReadingFile ? "Reading..." : "Upload .txt/.csv"}
                  </button>
                </div>

                {/* Center: Redaction Mode Segmented Control */}
                <div
                  role="group"
                  aria-label="Redaction mode"
                  className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-0.5"
                >
                  {MODE_OPTIONS.map((opt) => {
                    const active = mode === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setMode(opt.value);
                          setAuditBrief(null);
                        }}
                        className={`min-h-7 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "bg-white text-slate-950 shadow-2xs"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Right: Export, Copy, and Gemini Privacy Audit */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!hasText}
                    onClick={handleDownload}
                    className="min-h-8 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Download {exportFilename.endsWith(".csv") ? ".csv" : ".txt"}
                  </button>

                  <button
                    type="button"
                    disabled={!hasText}
                    onClick={handleCopy}
                    className="min-h-8 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <span className="sr-only" aria-live="polite">
                    {copied ? "Sanitized output copied to clipboard." : ""}
                  </span>

                  <StarBorder>
                    <button
                      type="button"
                      disabled={!hasText || auditLoading}
                      onClick={handleRunAudit}
                      className="min-h-8 rounded-[6px] bg-emerald-950/90 px-2.5 py-1.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {auditLoading ? "Auditing..." : "Gemini Privacy Audit"}
                    </button>
                  </StarBorder>
                </div>
              </div>

              {/* Workbench Interior */}
              <div className="space-y-3 bg-slate-50/50 p-3 sm:p-4">
                <DiffViewer
                  rawText={rawText}
                  onChangeRawText={(next) => {
                    setRawText(next);
                    setActiveSampleId(null);
                    setAuditBrief(null);
                    setAuditError(null);
                  }}
                  onClear={() => {
                    setRawText("");
                    setActiveSampleId(null);
                    setActiveCategoryFilter(null);
                    setAuditBrief(null);
                    setAuditError(null);
                  }}
                  onDropFile={(file) => void handleFile(file)}
                  isReadingFile={isReadingFile}
                  fileError={fileError}
                  result={result}
                  activeCategoryFilter={activeCategoryFilter}
                />

                <EntityBreakdown
                  result={result}
                  activeCategoryFilter={activeCategoryFilter}
                  onSelectCategoryFilter={setActiveCategoryFilter}
                />

                {/* Bottom Inspection Tabs */}
                <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white">
                  <div
                    role="tablist"
                    aria-label="Inspection panels"
                    className="flex overflow-x-auto border-b border-slate-200/90 bg-slate-50/70 px-3"
                  >
                    <button
                      ref={pseudonymsTabRef}
                      id="tab-pseudonyms"
                      type="button"
                      role="tab"
                      aria-selected={activeTab === "PSEUDONYMS"}
                      tabIndex={activeTab === "PSEUDONYMS" ? 0 : -1}
                      onClick={() => setActiveTab("PSEUDONYMS")}
                      onKeyDown={(e) => handleTabKeyDown(e, "PSEUDONYMS")}
                      className={`inline-flex shrink-0 items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                        activeTab === "PSEUDONYMS"
                          ? "text-slate-900"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Pseudonym Mapping Table</span>
                      <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                        {result.mode === "PSEUDONYMIZE"
                          ? result.pseudonymMap.length
                          : 0}
                      </span>
                    </button>

                    <button
                      ref={auditTabRef}
                      id="tab-audit"
                      type="button"
                      role="tab"
                      aria-selected={activeTab === "AUDIT"}
                      tabIndex={activeTab === "AUDIT" ? 0 : -1}
                      onClick={() => setActiveTab("AUDIT")}
                      onKeyDown={(e) => handleTabKeyDown(e, "AUDIT")}
                      className={`inline-flex shrink-0 items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                        activeTab === "AUDIT"
                          ? "text-slate-900"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Gemini Privacy Audit Brief</span>
                      {auditBrief && (
                        <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-900">
                          {auditBrief.riskLevel}
                        </span>
                      )}
                    </button>
                  </div>

                  <div
                    role="tabpanel"
                    aria-labelledby="tab-pseudonyms"
                    hidden={activeTab !== "PSEUDONYMS"}
                  >
                    <div className="p-3.5">
                      <PseudonymTable
                        result={result}
                        onSwitchToPseudonymize={(nextMode) => {
                          setMode(nextMode);
                          setAuditBrief(null);
                        }}
                      />
                    </div>
                  </div>

                  <div
                    role="tabpanel"
                    aria-labelledby="tab-audit"
                    hidden={activeTab !== "AUDIT"}
                  >
                    <div className="p-3.5">
                      <AuditBriefPanel
                        audit={auditBrief}
                        loading={auditLoading}
                        error={auditError}
                        hasText={hasText}
                        onRunAudit={handleRunAudit}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </FadeContent>
        </div>
      </main>

      <footer className="border-t border-slate-200/90 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            RedactLocal &mdash; Detection, Luhn verification, and redaction run
            strictly inside your browser.
          </span>
          <span className="font-mono text-[11px]">
            Optional Gemini audit receives sanitized text &amp; counts only.
          </span>
        </div>
      </footer>
    </div>
  );
}
