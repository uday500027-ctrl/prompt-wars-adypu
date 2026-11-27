import { describe, expect, it } from "vitest";
import {
  buildLocalFallbackAudit,
  MAX_AUDIT_TEXT_LENGTH,
  parseAuditPayload,
} from "../fallback";
import type { AuditRequestPayload } from "@/src/lib/pii/types";

// ---------------------------------------------------------------------------
// parseAuditPayload
// ---------------------------------------------------------------------------
describe("parseAuditPayload — validation", () => {
  const validPayload = {
    sanitizedText: "[REDACTED_EMAIL] contacted support",
    counts: { EMAIL: 1, PHONE: 0, IP_ADDRESS: 0, PAN: 0, AADHAAR: 0, CREDIT_CARD: 0 },
    totalMatches: 1,
    falsePositivesBlocked: 0,
    mode: "FULL_MASK",
  };

  it("accepts a well-formed payload", () => {
    const result = parseAuditPayload(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.sanitizedText).toBe(validPayload.sanitizedText);
      expect(result.data.counts.EMAIL).toBe(1);
      expect(result.data.mode).toBe("FULL_MASK");
    }
  });

  it("rejects null body", () => {
    const result = parseAuditPayload(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/JSON object/i);
  });

  it("rejects non-object body", () => {
    expect(parseAuditPayload("string").ok).toBe(false);
    expect(parseAuditPayload(42).ok).toBe(false);
    expect(parseAuditPayload(true).ok).toBe(false);
  });

  it("rejects missing sanitizedText", () => {
    const { sanitizedText, ...rest } = validPayload;
    void sanitizedText;
    const result = parseAuditPayload(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/sanitizedText/i);
  });

  it("rejects empty sanitizedText", () => {
    const result = parseAuditPayload({ ...validPayload, sanitizedText: "   " });
    expect(result.ok).toBe(false);
  });

  it("rejects sanitizedText exceeding MAX_AUDIT_TEXT_LENGTH", () => {
    const longText = "a".repeat(MAX_AUDIT_TEXT_LENGTH + 1);
    const result = parseAuditPayload({ ...validPayload, sanitizedText: longText });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/maximum length/i);
  });

  it("rejects invalid mode", () => {
    const result = parseAuditPayload({ ...validPayload, mode: "INVALID" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/mode/i);
  });

  it("rejects missing counts", () => {
    const result = parseAuditPayload({ ...validPayload, counts: null });
    expect(result.ok).toBe(false);
  });

  it("rejects negative count values", () => {
    const badCounts = { ...validPayload.counts, EMAIL: -1 };
    const result = parseAuditPayload({ ...validPayload, counts: badCounts });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/EMAIL/i);
  });

  it("rejects non-finite count values", () => {
    const result = parseAuditPayload({
      ...validPayload,
      counts: { ...validPayload.counts, PHONE: Infinity },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects negative totalMatches", () => {
    const result = parseAuditPayload({ ...validPayload, totalMatches: -1 });
    expect(result.ok).toBe(false);
  });

  it("rejects negative falsePositivesBlocked", () => {
    const result = parseAuditPayload({ ...validPayload, falsePositivesBlocked: -1 });
    expect(result.ok).toBe(false);
  });

  it("floors fractional counts", () => {
    const result = parseAuditPayload({
      ...validPayload,
      counts: { ...validPayload.counts, EMAIL: 1.9 },
      totalMatches: 1.5,
      falsePositivesBlocked: 0.7,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.counts.EMAIL).toBe(1);
      expect(result.data.totalMatches).toBe(1);
      expect(result.data.falsePositivesBlocked).toBe(0);
    }
  });

  it("accepts all 3 valid modes", () => {
    for (const mode of ["FULL_MASK", "PARTIAL_MASK", "PSEUDONYMIZE"]) {
      const result = parseAuditPayload({ ...validPayload, mode });
      expect(result.ok).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// buildLocalFallbackAudit
// ---------------------------------------------------------------------------
describe("buildLocalFallbackAudit", () => {
  function makePayload(overrides: Partial<AuditRequestPayload> = {}): AuditRequestPayload {
    return {
      sanitizedText: "[REDACTED_EMAIL] contacted support",
      counts: { EMAIL: 1, PHONE: 0, IP_ADDRESS: 0, PAN: 0, AADHAAR: 0, CREDIT_CARD: 0 },
      totalMatches: 1,
      falsePositivesBlocked: 0,
      mode: "FULL_MASK",
      ...overrides,
    };
  }

  it("returns local_fallback source", () => {
    const result = buildLocalFallbackAudit(makePayload());
    expect(result.source).toBe("local_fallback");
    expect(result.generatedAt).toBeTruthy();
  });

  it("produces LOW risk + safeToShare for FULL_MASK with matches", () => {
    const result = buildLocalFallbackAudit(makePayload());
    expect(result.riskLevel).toBe("LOW");
    expect(result.safeToShare).toBe(true);
  });

  it("produces LOW risk + safeToShare when zero matches", () => {
    const result = buildLocalFallbackAudit(
      makePayload({
        totalMatches: 0,
        counts: { EMAIL: 0, PHONE: 0, IP_ADDRESS: 0, PAN: 0, AADHAAR: 0, CREDIT_CARD: 0 },
      })
    );
    expect(result.riskLevel).toBe("LOW");
    expect(result.safeToShare).toBe(true);
  });

  it("produces MODERATE risk for PARTIAL_MASK with financial/gov IDs", () => {
    const result = buildLocalFallbackAudit(
      makePayload({
        mode: "PARTIAL_MASK",
        counts: { EMAIL: 0, PHONE: 0, IP_ADDRESS: 0, PAN: 1, AADHAAR: 0, CREDIT_CARD: 1 },
        totalMatches: 2,
      })
    );
    expect(result.riskLevel).toBe("MODERATE");
    expect(result.safeToShare).toBe(false);
  });

  it("produces safeToShare=true for PSEUDONYMIZE mode", () => {
    const result = buildLocalFallbackAudit(
      makePayload({
        mode: "PSEUDONYMIZE",
        counts: { EMAIL: 1, PHONE: 1, IP_ADDRESS: 0, PAN: 0, AADHAAR: 0, CREDIT_CARD: 0 },
        totalMatches: 2,
      })
    );
    expect(result.safeToShare).toBe(true);
  });

  it("includes DPDP Act note when PAN or Aadhaar detected", () => {
    const result = buildLocalFallbackAudit(
      makePayload({
        counts: { EMAIL: 0, PHONE: 0, IP_ADDRESS: 0, PAN: 1, AADHAAR: 1, CREDIT_CARD: 0 },
        totalMatches: 2,
      })
    );
    expect(result.complianceNotes.some((n) => n.includes("DPDP"))).toBe(true);
  });

  it("includes Luhn note when credit cards detected", () => {
    const result = buildLocalFallbackAudit(
      makePayload({
        counts: { EMAIL: 0, PHONE: 0, IP_ADDRESS: 0, PAN: 0, AADHAAR: 0, CREDIT_CARD: 2 },
        totalMatches: 2,
      })
    );
    expect(result.complianceNotes.some((n) => n.includes("Luhn"))).toBe(true);
  });

  it("includes partial mask warning for PARTIAL_MASK mode", () => {
    const result = buildLocalFallbackAudit(makePayload({ mode: "PARTIAL_MASK" }));
    expect(result.complianceNotes.some((n) => n.includes("Partial Mask"))).toBe(true);
  });

  it("complianceNotes has at most 4 entries", () => {
    const result = buildLocalFallbackAudit(
      makePayload({
        mode: "PARTIAL_MASK",
        counts: { EMAIL: 1, PHONE: 1, IP_ADDRESS: 1, PAN: 1, AADHAAR: 1, CREDIT_CARD: 1 },
        totalMatches: 6,
        falsePositivesBlocked: 2,
      })
    );
    expect(result.complianceNotes.length).toBeLessThanOrEqual(4);
  });

  it("summary mentions active categories and counts", () => {
    const result = buildLocalFallbackAudit(
      makePayload({
        counts: { EMAIL: 2, PHONE: 0, IP_ADDRESS: 0, PAN: 0, AADHAAR: 0, CREDIT_CARD: 0 },
        totalMatches: 2,
        falsePositivesBlocked: 1,
      })
    );
    expect(result.summary).toContain("EMAIL (2)");
    expect(result.summary).toContain("1");
  });
});
