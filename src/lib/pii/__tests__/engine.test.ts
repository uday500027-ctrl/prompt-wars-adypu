import { describe, expect, it } from "vitest";
import { detectPiiCandidates, isValidLuhn } from "../detectors";
import { sanitizeText } from "../engine";
import { SAMPLE_DATASETS } from "../samples";

describe("isValidLuhn", () => {
  it("accepts valid Visa, Mastercard, and Amex test numbers", () => {
    expect(isValidLuhn("4111-1111-1111-1111")).toBe(true);
    expect(isValidLuhn("5500 0000 0000 0004")).toBe(true);
    expect(isValidLuhn("378282246310005")).toBe(true);
    expect(isValidLuhn("4532 0192 8374 6518")).toBe(true);
  });

  it("rejects decoy 16-digit order IDs and degenerate sequences", () => {
    expect(isValidLuhn("4532-0192-8374-6510")).toBe(false);
    expect(isValidLuhn("8821904411223345")).toBe(false);
    expect(isValidLuhn("5100998877665541")).toBe(false);
    expect(isValidLuhn("0000000000000000")).toBe(false);
    expect(isValidLuhn("12345")).toBe(false);
  });
});

describe("detectPiiCandidates — all 6 PII types & edge cases", () => {
  it("detects EMAIL, PHONE (Indian & Intl), IPv4/IPv6, PAN, AADHAAR, CREDIT_CARD", () => {
    const input = [
      "Email: ops+security@acme.co.in",
      "IN Phone: +91 98765 43210",
      "US Phone: +1 (415) 555-0192",
      "IPv4: 192.168.1.42",
      "IPv6: 2001:0db8:85a3::8a2e:0370:7334",
      "PAN: ABCDE1234F",
      "Aadhaar: 2345 6789 0123",
      "Card: 4111-1111-1111-1111",
    ].join("\n");

    const { matches, falsePositivesBlocked } = detectPiiCandidates(input);
    const types = matches.map((m) => m.type);

    expect(falsePositivesBlocked).toBe(0);
    expect(types).toEqual([
      "EMAIL",
      "PHONE",
      "PHONE",
      "IP_ADDRESS",
      "IP_ADDRESS",
      "PAN",
      "AADHAAR",
      "CREDIT_CARD",
    ]);
  });

  it("blocks decoy 16-digit Order IDs without letting PHONE swallow trailing digits", () => {
    const input =
      "Order ID: 4532-0192-8374-6510 was shipped. Card used: 4532 0192 8374 6518.";
    const result = sanitizeText(input, "FULL_MASK");

    expect(result.falsePositivesBlocked).toBe(1);
    expect(result.counts.CREDIT_CARD).toBe(1);
    expect(result.counts.PHONE).toBe(0);
    expect(result.sanitizedText).toContain("4532-0192-8374-6510");
    expect(result.sanitizedText).toContain("[REDACTED_CARD]");
    expect(result.sanitizedText).not.toContain("4532 0192 8374 6518");
  });

  it("ignores timestamps and invalid IPv4 octets", () => {
    const input = "Logged at 14:25:00 from invalid 999.168.1.1 and valid 10.0.0.1";
    const result = sanitizeText(input, "FULL_MASK");

    expect(result.counts.IP_ADDRESS).toBe(1);
    expect(result.matches[0]?.value).toBe("10.0.0.1");
  });

  it("preserves exact character offsets and avoids overlapping email/phone collisions", () => {
    const input = "Contact user9876543210@corp.in for details";
    const result = sanitizeText(input, "FULL_MASK");

    expect(result.totalMatches).toBe(1);
    expect(result.matches[0]?.type).toBe("EMAIL");
    expect(input.slice(result.matches[0].start, result.matches[0].end)).toBe(
      "user9876543210@corp.in"
    );
  });
});

describe("sanitizeText — 3 redaction modes", () => {
  const sample =
    "Email aarav@corp.in twice: aarav@corp.in. Card 4111-1111-1111-1111, PAN ABCDE1234F, Aadhaar 2345 6789 0123, IP 192.168.10.20, Phone +91 98765 43210 & 9876543210.";

  it("applies FULL_MASK correctly", () => {
    const res = sanitizeText(sample, "FULL_MASK");
    expect(res.sanitizedText).toContain("[REDACTED_EMAIL]");
    expect(res.sanitizedText).toContain("[REDACTED_CARD]");
    expect(res.sanitizedText).toContain("[REDACTED_PAN]");
    expect(res.sanitizedText).toContain("[REDACTED_AADHAAR]");
    expect(res.sanitizedText).toContain("[REDACTED_IP]");
    expect(res.sanitizedText).toContain("[REDACTED_PHONE]");
  });

  it("applies PARTIAL_MASK while preserving verification context", () => {
    const res = sanitizeText(sample, "PARTIAL_MASK");
    expect(res.sanitizedText).toContain("a***@corp.in");
    expect(res.sanitizedText).toContain("XXXX-XXXX-XXXX-1111");
    expect(res.sanitizedText).toContain("AB*****34F");
    expect(res.sanitizedText).toContain("XXXX-XXXX-0123");
    expect(res.sanitizedText).toContain("192.168.*.*");
    expect(res.sanitizedText).toContain("+91 XXXXXX3210");
  });

  it("applies deterministic PSEUDONYMIZE mapping across recurring entities", () => {
    const res = sanitizeText(sample, "PSEUDONYMIZE");
    expect(res.sanitizedText).toContain("EMAIL_01");
    expect(res.sanitizedText).not.toContain("EMAIL_02");
    expect(res.sanitizedText).toContain("PHONE_01");
    expect(res.sanitizedText).not.toContain("PHONE_02");

    const emailEntry = res.pseudonymMap.find((e) => e.token === "EMAIL_01");
    const phoneEntry = res.pseudonymMap.find((e) => e.token === "PHONE_01");
    expect(emailEntry?.occurrences).toBe(2);
    expect(phoneEntry?.occurrences).toBe(2);
  });
});

describe("seeded sample datasets", () => {
  it("all 3 seeded samples block at least one decoy 16-digit ID and detect PII", () => {
    for (const dataset of SAMPLE_DATASETS) {
      const res = sanitizeText(dataset.content, "PSEUDONYMIZE");
      expect(res.totalMatches).toBeGreaterThanOrEqual(5);
      expect(res.falsePositivesBlocked).toBeGreaterThanOrEqual(1);
    }
  });
});
