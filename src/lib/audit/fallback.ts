import { ALL_PII_CATEGORIES } from "@/src/lib/pii/constants";
import type {
  AuditRequestPayload,
  AuditResponse,
  AuditRiskLevel,
  EntityCounts,
  RedactionMode,
} from "@/src/lib/pii/types";

const VALID_MODES: readonly RedactionMode[] = [
  "FULL_MASK",
  "PARTIAL_MASK",
  "PSEUDONYMIZE",
];

/** Maximum sanitized text length accepted by the audit endpoint (50 000 chars). */
export const MAX_AUDIT_TEXT_LENGTH = 50_000;

/**
 * Validates and parses the raw audit request body into a typed payload.
 * Returns `{ ok: true, data }` on success, or `{ ok: false, error }` with a human-readable message.
 */
export function parseAuditPayload(
  raw: unknown
): { ok: true; data: AuditRequestPayload } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const record = raw as Record<string, unknown>;
  const { sanitizedText, counts, totalMatches, falsePositivesBlocked, mode } =
    record;

  if (typeof sanitizedText !== "string" || !sanitizedText.trim()) {
    return { ok: false, error: "sanitizedText must be a non-empty string." };
  }

  if (sanitizedText.length > MAX_AUDIT_TEXT_LENGTH) {
    return {
      ok: false,
      error: `sanitizedText exceeds maximum length of ${MAX_AUDIT_TEXT_LENGTH} characters.`,
    };
  }

  if (
    typeof mode !== "string" ||
    !VALID_MODES.includes(mode as RedactionMode)
  ) {
    return { ok: false, error: "Invalid redaction mode." };
  }

  if (typeof counts !== "object" || counts === null) {
    return { ok: false, error: "counts must be an object." };
  }

  const parsedCounts: EntityCounts = {
    EMAIL: 0,
    PHONE: 0,
    IP_ADDRESS: 0,
    PAN: 0,
    AADHAAR: 0,
    CREDIT_CARD: 0,
  };

  const countsObj = counts as Record<string, unknown>;
  for (const key of ALL_PII_CATEGORIES) {
    const val = countsObj[key];
    if (typeof val !== "number" || !Number.isFinite(val) || val < 0) {
      return { ok: false, error: `Invalid count for ${key}.` };
    }
    parsedCounts[key] = Math.floor(val);
  }

  if (
    typeof totalMatches !== "number" ||
    !Number.isFinite(totalMatches) ||
    totalMatches < 0
  ) {
    return { ok: false, error: "Invalid totalMatches count." };
  }

  if (
    typeof falsePositivesBlocked !== "number" ||
    !Number.isFinite(falsePositivesBlocked) ||
    falsePositivesBlocked < 0
  ) {
    return { ok: false, error: "Invalid falsePositivesBlocked count." };
  }

  return {
    ok: true,
    data: {
      sanitizedText,
      counts: parsedCounts,
      totalMatches: Math.floor(totalMatches),
      falsePositivesBlocked: Math.floor(falsePositivesBlocked),
      mode: mode as RedactionMode,
    },
  };
}

/**
 * Deterministic local compliance brief used when GEMINI_API_KEY is absent,
 * invalid, or when the Gemini API call fails or times out. Produces a stable
 * audit response with no network dependency.
 */
export function buildLocalFallbackAudit(
  payload: AuditRequestPayload
): AuditResponse {
  const { counts, totalMatches, falsePositivesBlocked, mode } = payload;

  const hasFinancialOrGovId =
    counts.CREDIT_CARD > 0 || counts.AADHAAR > 0 || counts.PAN > 0;

  let riskLevel: AuditRiskLevel = "LOW";
  let safeToShare = true;

  if (mode === "PARTIAL_MASK" && hasFinancialOrGovId) {
    riskLevel = "MODERATE";
    safeToShare = false;
  } else if (totalMatches === 0) {
    riskLevel = "LOW";
    safeToShare = true;
  } else if (mode === "FULL_MASK") {
    riskLevel = "LOW";
    safeToShare = true;
  } else {
    riskLevel = hasFinancialOrGovId ? "MODERATE" : "LOW";
    safeToShare = mode === "PSEUDONYMIZE";
  }

  const activeCategories = ALL_PII_CATEGORIES.filter((k) => counts[k] > 0)
    .map((k) => `${k} (${counts[k]})`)
    .join(", ");

  const summary =
    totalMatches > 0
      ? `Sanitized ${totalMatches} PII entities (${activeCategories}) using ${mode.replace("_", " ")} mode while blocking ${falsePositivesBlocked} Luhn-invalid numeric decoy(s).`
      : `No structured PII entities were flagged across the payload (${falsePositivesBlocked} non-PII numeric candidate(s) ignored).`;

  const complianceNotes: string[] = [
    `Active policy: ${mode.replace("_", " ")}. Raw source text remained strictly inside client memory.`,
  ];

  if (counts.AADHAAR > 0 || counts.PAN > 0) {
    complianceNotes.push(
      "Indian statutory identifiers (PAN/Aadhaar) were detected and sanitized; verify downstream retention policy under DPDP Act 2023."
    );
  }
  if (counts.CREDIT_CARD > 0) {
    complianceNotes.push(
      "Payment card numbers passed Mod-10 Luhn verification prior to masking; avoid retaining partial digits in public logs."
    );
  }
  if (mode === "PARTIAL_MASK") {
    complianceNotes.push(
      "Partial Mask preserves trailing digits/domains for internal QA; switch to Full Mask before external sharing."
    );
  } else if (mode === "PSEUDONYMIZE") {
    complianceNotes.push(
      "Deterministic pseudonym tokens preserve cross-row/entity correlation without exposing underlying values."
    );
  } else {
    complianceNotes.push(
      "Full Mask replaces all matched spans with irreversible category blocks suitable for external sharing."
    );
  }

  return {
    riskLevel,
    summary,
    complianceNotes: complianceNotes.slice(0, 4),
    safeToShare,
    source: "local_fallback",
    generatedAt: new Date().toISOString(),
  };
}
