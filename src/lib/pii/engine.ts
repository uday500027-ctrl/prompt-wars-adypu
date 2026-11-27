import { detectPiiCandidates } from "./detectors";
import type {
  EntityCounts,
  PiiMatch,
  PiiType,
  PseudonymEntry,
  RedactionMode,
  SanitizationResult,
} from "./types";

const FULL_MASK_LABELS: Record<PiiType, string> = {
  EMAIL: "[REDACTED_EMAIL]",
  PHONE: "[REDACTED_PHONE]",
  IP_ADDRESS: "[REDACTED_IP]",
  PAN: "[REDACTED_PAN]",
  AADHAAR: "[REDACTED_AADHAAR]",
  CREDIT_CARD: "[REDACTED_CARD]",
};

const PSEUDONYM_PREFIXES: Record<PiiType, string> = {
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  IP_ADDRESS: "IP",
  PAN: "PAN",
  AADHAAR: "AADHAAR",
  CREDIT_CARD: "CARD",
};

export function createEmptyCounts(): EntityCounts {
  return {
    EMAIL: 0,
    PHONE: 0,
    IP_ADDRESS: 0,
    PAN: 0,
    AADHAAR: 0,
    CREDIT_CARD: 0,
  };
}

function normalizeForPseudonym(type: PiiType, value: string): string {
  switch (type) {
    case "EMAIL":
      return value.trim().toLowerCase();
    case "IP_ADDRESS":
      return value.trim().toLowerCase();
    case "PAN":
      return value.trim().toUpperCase();
    case "AADHAAR":
    case "CREDIT_CARD":
      return value.replace(/\D/g, "");
    case "PHONE": {
      const trimmed = value.trim();
      const digits = trimmed.replace(/\D/g, "");
      if (trimmed.startsWith("+")) {
        return `+${digits}`;
      }
      // Normalize 10-digit Indian mobiles and 0-prefixed mobiles consistently
      if (digits.length === 11 && digits.startsWith("0")) {
        return `+91${digits.slice(1)}`;
      }
      if (digits.length === 10 && /^[6-9]/.test(digits)) {
        return `+91${digits}`;
      }
      return digits;
    }
  }
}

function formatPartialMask(type: PiiType, value: string): string {
  switch (type) {
    case "EMAIL": {
      const atIndex = value.indexOf("@");
      if (atIndex <= 0) return FULL_MASK_LABELS.EMAIL;
      const local = value.slice(0, atIndex);
      const domain = value.slice(atIndex + 1);
      return `${local[0]}***@${domain}`;
    }
    case "CREDIT_CARD": {
      const digits = value.replace(/\D/g, "");
      const last4 = digits.slice(-4);
      return `XXXX-XXXX-XXXX-${last4}`;
    }
    case "AADHAAR": {
      const digits = value.replace(/\D/g, "");
      const last4 = digits.slice(-4);
      return `XXXX-XXXX-${last4}`;
    }
    case "PAN": {
      const normalized = value.trim().toUpperCase();
      return `${normalized.slice(0, 2)}*****${normalized.slice(-3)}`;
    }
    case "PHONE": {
      const trimmed = value.trim();
      const digits = trimmed.replace(/\D/g, "");
      const last4 = digits.slice(-4);
      const ccMatch = trimmed.match(/^\+\d{1,3}/);
      if (ccMatch) {
        const maskedLen = Math.max(4, digits.length - ccMatch[0].length - 3);
        return `${ccMatch[0]} ${"X".repeat(maskedLen)}${last4}`;
      }
      return `${"X".repeat(Math.max(4, digits.length - 4))}${last4}`;
    }
    case "IP_ADDRESS": {
      if (value.includes(".")) {
        const octets = value.split(".");
        if (octets.length === 4) {
          return `${octets[0]}.${octets[1]}.*.*`;
        }
      }
      if (value.includes(":")) {
        const prefix = value.split(":").slice(0, 2).join(":");
        return `${prefix}::****`;
      }
      return FULL_MASK_LABELS.IP_ADDRESS;
    }
  }
}

/**
 * Sanitizes raw text entirely in-memory without mutating or transmitting input.
 */
export function sanitizeText(
  rawText: string,
  mode: RedactionMode
): SanitizationResult {
  const startTime =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const { matches: candidates, falsePositivesBlocked } =
    detectPiiCandidates(rawText);

  const counts = createEmptyCounts();
  const typeCounters: EntityCounts = createEmptyCounts();
  const pseudonymRegistry = new Map<string, PseudonymEntry>();

  const matches: PiiMatch[] = candidates.map((candidate) => {
    counts[candidate.type] += 1;

    const normKey = `${candidate.type}:${normalizeForPseudonym(
      candidate.type,
      candidate.value
    )}`;
    let entry = pseudonymRegistry.get(normKey);
    if (!entry) {
      typeCounters[candidate.type] += 1;
      const serial = String(typeCounters[candidate.type]).padStart(2, "0");
      entry = {
        token: `${PSEUDONYM_PREFIXES[candidate.type]}_${serial}`,
        type: candidate.type,
        normalizedKey: normKey,
        sampleValue: candidate.value,
        occurrences: 0,
      };
      pseudonymRegistry.set(normKey, entry);
    }
    entry.occurrences += 1;

    let replacement: string;
    if (mode === "FULL_MASK") {
      replacement = FULL_MASK_LABELS[candidate.type];
    } else if (mode === "PARTIAL_MASK") {
      replacement = formatPartialMask(candidate.type, candidate.value);
    } else {
      replacement = entry.token;
    }

    return {
      id: `${candidate.type}-${candidate.start}-${candidate.end}`,
      type: candidate.type,
      value: candidate.value,
      start: candidate.start,
      end: candidate.end,
      replacement,
      confidence: candidate.confidence,
    };
  });

  // Reconstruct sanitized string preserving exact slices outside matched spans
  let cursor = 0;
  const chunks: string[] = [];
  for (const match of matches) {
    chunks.push(rawText.slice(cursor, match.start));
    chunks.push(match.replacement);
    cursor = match.end;
  }
  chunks.push(rawText.slice(cursor));

  const endTime =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    originalText: rawText,
    sanitizedText: chunks.join(""),
    mode,
    matches,
    counts,
    totalMatches: matches.length,
    falsePositivesBlocked,
    pseudonymMap: Array.from(pseudonymRegistry.values()),
    processingTimeMs: Math.max(0.1, endTime - startTime),
  };
}
