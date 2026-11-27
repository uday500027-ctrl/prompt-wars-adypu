import type { PiiType } from "./types";

export interface CandidateMatch {
  type: PiiType;
  value: string;
  start: number;
  end: number;
  confidence: "HIGH" | "MEDIUM";
}

export interface Span {
  start: number;
  end: number;
}

export interface DetectionOutput {
  matches: CandidateMatch[];
  falsePositivesBlocked: number;
}

const TYPE_PRIORITY: Record<PiiType, number> = {
  EMAIL: 1,
  CREDIT_CARD: 2,
  PAN: 3,
  AADHAAR: 4,
  IP_ADDRESS: 5,
  PHONE: 6,
};

/**
 * Validates a digits-only card candidate using the Mod-10 Luhn algorithm.
 */
export function isValidLuhn(rawInput: string): boolean {
  const digits = rawInput.replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(digits)) {
    return false;
  }
  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits.charCodeAt(i) - 48;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function spansOverlap(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

function isValidIpv6(candidate: string): boolean {
  if (!candidate.includes(":")) return false;
  if (candidate.includes(":::")) return false;

  const doubleColonParts = candidate.split("::");
  if (doubleColonParts.length > 2) return false;

  const hexGroup = /^[0-9a-fA-F]{1,4}$/;

  if (doubleColonParts.length === 1) {
    const groups = candidate.split(":");
    return groups.length === 8 && groups.every((g) => hexGroup.test(g));
  }

  const [leftRaw, rightRaw] = doubleColonParts;
  const leftGroups = leftRaw ? leftRaw.split(":") : [];
  const rightGroups = rightRaw ? rightRaw.split(":") : [];

  if (
    leftGroups.some((g) => !hexGroup.test(g)) ||
    rightGroups.some((g) => !hexGroup.test(g))
  ) {
    return false;
  }

  return leftGroups.length + rightGroups.length <= 7;
}

function collectRegexMatches(
  text: string,
  regex: RegExp,
  type: PiiType,
  confidence: "HIGH" | "MEDIUM",
  predicate?: (value: string, start: number, end: number) => boolean
): CandidateMatch[] {
  const results: CandidateMatch[] = [];
  regex.lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(text);

  while (match !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (!predicate || predicate(value, start, end)) {
      results.push({ type, value, start, end, confidence });
    }

    if (regex.lastIndex === match.index) {
      regex.lastIndex += 1;
    }
    match = regex.exec(text);
  }

  return results;
}

/**
 * Runs all 6 PII detectors and resolves overlaps deterministically by specificity.
 */
export function detectPiiCandidates(text: string): DetectionOutput {
  if (!text) {
    return { matches: [], falsePositivesBlocked: 0 };
  }

  const candidates: CandidateMatch[] = [];
  const blockedCardSpans: Span[] = [];
  let falsePositivesBlocked = 0;

  // 1. Credit Cards (13-19 digits, strict Luhn check; failures counted as falsePositivesBlocked)
  const cardRegex =
    /(?<![A-Za-z0-9.+])\d(?:[ -]?\d){12,18}(?![A-Za-z0-9]|(?:\.\d))/g;
  cardRegex.lastIndex = 0;
  let cardMatch: RegExpExecArray | null = cardRegex.exec(text);
  while (cardMatch !== null) {
    const value = cardMatch[0];
    const start = cardMatch.index;
    const end = start + value.length;

    if (isValidLuhn(value)) {
      candidates.push({
        type: "CREDIT_CARD",
        value,
        start,
        end,
        confidence: "HIGH",
      });
    } else {
      falsePositivesBlocked += 1;
      blockedCardSpans.push({ start, end });
    }

    if (cardRegex.lastIndex === cardMatch.index) {
      cardRegex.lastIndex += 1;
    }
    cardMatch = cardRegex.exec(text);
  }

  // 2. Emails
  const emailRegex =
    /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![A-Za-z0-9-]|(?:\.\w))/g;
  candidates.push(
    ...collectRegexMatches(text, emailRegex, "EMAIL", "HIGH", (val) => {
      const [local, domain] = val.split("@");
      return (
        Boolean(local && domain) &&
        !local.includes("..") &&
        !domain.includes("..") &&
        !local.startsWith(".") &&
        !local.endsWith(".")
      );
    })
  );

  // 3. PAN (Indian 10-char format: AAAAA9999A)
  const panRegex = /(?<![A-Za-z0-9])[A-Z]{5}\d{4}[A-Z](?![A-Za-z0-9])/g;
  candidates.push(...collectRegexMatches(text, panRegex, "PAN", "HIGH"));

  // 4. Aadhaar (Indian 12-digit UID starting with 2-9)
  const aadhaarRegex =
    /(?<![\d.-])[2-9]\d{3}(?:[ -]?\d{4}){2}(?![\d-]|(?:\.\d))/g;
  candidates.push(
    ...collectRegexMatches(text, aadhaarRegex, "AADHAAR", "HIGH")
  );

  // 5. IPv4 & IPv6
  const ipv4Regex =
    /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?![\d]|(?:\.\d))/g;
  candidates.push(
    ...collectRegexMatches(text, ipv4Regex, "IP_ADDRESS", "HIGH")
  );

  const ipv6Regex =
    /(?<![A-Za-z0-9:])(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(?![A-Za-z0-9:])/g;
  candidates.push(
    ...collectRegexMatches(text, ipv6Regex, "IP_ADDRESS", "HIGH", isValidIpv6)
  );

  // 6. Phone Numbers (Indian + International)
  const phonePatterns: Array<{ regex: RegExp; confidence: "HIGH" | "MEDIUM" }> =
    [
      {
        regex:
          /(?<![A-Za-z0-9+.-])(?:\+91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5}(?![A-Za-z0-9-]|(?:\.\d))/g,
        confidence: "HIGH",
      },
      {
        regex:
          /(?<![A-Za-z0-9+.-])\+[1-9]\d{0,2}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?(?:\d[\s.-]?){6,12}\d(?![A-Za-z0-9-]|(?:\.\d))/g,
        confidence: "HIGH",
      },
      {
        regex:
          /(?<![A-Za-z0-9+.-])\(\d{2,5}\)[\s.-]?\d{3,5}[\s.-]?\d{4}(?![A-Za-z0-9-]|(?:\.\d))/g,
        confidence: "MEDIUM",
      },
    ];

  const isValidPhone = (val: string, start: number, end: number): boolean => {
    const span: Span = { start, end };
    if (blockedCardSpans.some((blocked) => spansOverlap(span, blocked))) {
      return false;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return false;
    }
    const digits = val.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  };

  for (const { regex, confidence } of phonePatterns) {
    candidates.push(
      ...collectRegexMatches(text, regex, "PHONE", confidence, isValidPhone)
    );
  }

  // Deterministic overlap resolution: higher-specificity type wins, then longer match, then earlier offset.
  candidates.sort((a, b) => {
    const priorityDiff = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
    if (priorityDiff !== 0) return priorityDiff;

    const lengthDiff = b.end - b.start - (a.end - a.start);
    if (lengthDiff !== 0) return lengthDiff;

    return a.start - b.start;
  });

  const accepted: CandidateMatch[] = [];
  for (const candidate of candidates) {
    const overlapsExisting = accepted.some((existing) =>
      spansOverlap(existing, candidate)
    );
    if (!overlapsExisting) {
      accepted.push(candidate);
    }
  }

  accepted.sort((a, b) => a.start - b.start);

  return {
    matches: accepted,
    falsePositivesBlocked,
  };
}
