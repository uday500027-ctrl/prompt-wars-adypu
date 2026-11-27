import type { PiiType } from "./types";

/**
 * Canonical ordered list of all supported PII categories.
 * Used as the default enabled set, iteration order for UI elements,
 * and validation reference for API payloads.
 */
export const ALL_PII_CATEGORIES: readonly PiiType[] = [
  "EMAIL",
  "PHONE",
  "IP_ADDRESS",
  "PAN",
  "AADHAAR",
  "CREDIT_CARD",
] as const;

/** Visual metadata for each PII category used across UI components. */
export interface EntityMeta {
  /** Human-readable label (e.g. "Email"). */
  label: string;
  /** Abbreviated identifier (e.g. "EMAIL"). */
  short: string;
  /** Tailwind classes for category badge chips. */
  badgeClass: string;
  /** Tailwind classes for highlighted text marks. */
  markClass: string;
  /** Tailwind class for the small colour-coded dot indicator. */
  dotClass: string;
}

/**
 * Editorial-palette presentation metadata for each PII category.
 * Shared by DiffViewer, EntityBreakdown, and PseudonymTable.
 */
export const ENTITY_META: Record<PiiType, EntityMeta> = {
  EMAIL: {
    label: "Email",
    short: "EMAIL",
    badgeClass: "border-slate-300/80 bg-slate-100 text-slate-900",
    markClass: "bg-slate-100 text-slate-900 border border-slate-300/80",
    dotClass: "bg-[#3B5B8A]",
  },
  PHONE: {
    label: "Phone",
    short: "PHONE",
    badgeClass: "border-stone-300/80 bg-stone-100 text-stone-900",
    markClass: "bg-stone-100 text-stone-900 border border-stone-300/80",
    dotClass: "bg-stone-500",
  },
  IP_ADDRESS: {
    label: "IP",
    short: "IP",
    badgeClass: "border-slate-300/80 bg-slate-50 text-slate-800",
    markClass: "bg-slate-50 text-slate-800 border border-slate-300/80",
    dotClass: "bg-slate-500",
  },
  PAN: {
    label: "PAN",
    short: "PAN",
    badgeClass: "border-amber-200/90 bg-amber-50 text-[#92600A]",
    markClass: "bg-amber-50 text-[#92600A] border border-amber-200/90",
    dotClass: "bg-[#92600A]",
  },
  AADHAAR: {
    label: "Aadhaar",
    short: "AADHAAR",
    badgeClass: "border-rose-200/90 bg-rose-50 text-[#9F2D3A]",
    markClass: "bg-rose-50 text-[#9F2D3A] border border-rose-200/90",
    dotClass: "bg-[#9F2D3A]",
  },
  CREDIT_CARD: {
    label: "Credit Card",
    short: "CARD",
    badgeClass: "border-slate-300/80 bg-slate-100 text-[#3B5B8A]",
    markClass: "bg-slate-100 text-[#3B5B8A] border border-slate-300/80",
    dotClass: "bg-[#3B5B8A]",
  },
};
