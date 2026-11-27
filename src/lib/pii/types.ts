export type PiiType =
  | "EMAIL"
  | "PHONE"
  | "IP_ADDRESS"
  | "PAN"
  | "AADHAAR"
  | "CREDIT_CARD";

export type RedactionMode =
  | "FULL_MASK"
  | "PARTIAL_MASK"
  | "PSEUDONYMIZE";

export interface PiiMatch {
  id: string;
  type: PiiType;
  value: string;
  start: number;
  end: number;
  replacement: string;
  confidence: "HIGH" | "MEDIUM";
}

export type EntityCounts = Record<PiiType, number>;

export interface PseudonymEntry {
  token: string;
  type: PiiType;
  normalizedKey: string;
  sampleValue: string;
  occurrences: number;
}

export interface SanitizationResult {
  originalText: string;
  sanitizedText: string;
  mode: RedactionMode;
  matches: PiiMatch[];
  counts: EntityCounts;
  totalMatches: number;
  falsePositivesBlocked: number;
  pseudonymMap: PseudonymEntry[];
  processingTimeMs: number;
}

export type AuditRiskLevel = "LOW" | "MODERATE" | "HIGH";

export interface AuditRequestPayload {
  sanitizedText: string;
  counts: EntityCounts;
  totalMatches: number;
  falsePositivesBlocked: number;
  mode: RedactionMode;
}

export interface AuditResponse {
  riskLevel: AuditRiskLevel;
  summary: string;
  complianceNotes: string[];
  safeToShare: boolean;
  source: "gemini" | "local_fallback";
  generatedAt: string;
  model?: string;
}

export interface SampleDataset {
  id: string;
  label: string;
  tag: string;
  description: string;
  filename: string;
  content: string;
}
