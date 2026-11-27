import { describe, expect, it } from "vitest";
import { sanitizeText } from "../engine";

describe("sanitizeText — partial mask format per PII type", () => {
  it("masks email: first char + *** + @domain", () => {
    const res = sanitizeText("hello@example.com", "PARTIAL_MASK");
    expect(res.sanitizedText).toBe("h***@example.com");
  });

  it("masks credit card: XXXX-XXXX-XXXX-last4", () => {
    const res = sanitizeText("4111 1111 1111 1111", "PARTIAL_MASK");
    expect(res.sanitizedText).toBe("XXXX-XXXX-XXXX-1111");
  });

  it("masks Aadhaar: XXXX-XXXX-last4", () => {
    const res = sanitizeText("2345 6789 0123", "PARTIAL_MASK");
    expect(res.sanitizedText).toBe("XXXX-XXXX-0123");
  });

  it("masks PAN: first2 + ***** + last3", () => {
    const res = sanitizeText("ABCDE1234F", "PARTIAL_MASK");
    expect(res.sanitizedText).toBe("AB*****34F");
  });

  it("masks IPv4: first2octets.*.*", () => {
    const res = sanitizeText("192.168.1.42", "PARTIAL_MASK");
    expect(res.sanitizedText).toBe("192.168.*.*");
  });

  it("masks phone with country code: +CC XXXX…last4", () => {
    const res = sanitizeText("+91 98765 43210", "PARTIAL_MASK");
    expect(res.sanitizedText).toContain("+91");
    expect(res.sanitizedText).toContain("3210");
    expect(res.sanitizedText).toContain("X");
  });

  it("masks IPv6: first 2 groups + ::****", () => {
    const res = sanitizeText(
      "Server at 2001:0db8:85a3::8a2e:0370:7334",
      "PARTIAL_MASK"
    );
    expect(res.sanitizedText).toContain("2001:0db8::****");
  });
});

describe("sanitizeText — pseudonymization determinism", () => {
  it("same value produces same token", () => {
    const input = "Email aarav@corp.in and aarav@corp.in again.";
    const res = sanitizeText(input, "PSEUDONYMIZE");
    const tokens = res.matches.map((m) => m.replacement);
    expect(tokens[0]).toBe("EMAIL_01");
    expect(tokens[1]).toBe("EMAIL_01");
  });

  it("different values produce different tokens", () => {
    const input = "Email aarav@corp.in and neha@corp.in.";
    const res = sanitizeText(input, "PSEUDONYMIZE");
    const tokens = res.matches.map((m) => m.replacement);
    expect(tokens[0]).toBe("EMAIL_01");
    expect(tokens[1]).toBe("EMAIL_02");
  });

  it("pseudonymMap records occurrences correctly", () => {
    const input = "Call +91 98765 43210 and +91 98765 43210 again.";
    const res = sanitizeText(input, "PSEUDONYMIZE");
    expect(res.pseudonymMap).toHaveLength(1);
    expect(res.pseudonymMap[0].occurrences).toBe(2);
    expect(res.pseudonymMap[0].token).toBe("PHONE_01");
  });

  it("pseudonymizes US phone not starting with 6-9 consistently", () => {
    const res = sanitizeText("Call (415) 555-0192 now", "PSEUDONYMIZE");
    expect(res.sanitizedText).toContain("PHONE_01");
    expect(res.counts.PHONE).toBe(1);
  });

  it("pseudonymizes 0-prefixed Indian phone normalizing to +91", () => {
    const res1 = sanitizeText("Call 09876543210 please", "PSEUDONYMIZE");
    const res2 = sanitizeText("Call +91 98765 43210 please", "PSEUDONYMIZE");
    expect(res1.pseudonymMap[0]?.normalizedKey).toBe("PHONE:+919876543210");
    expect(res2.pseudonymMap[0]?.normalizedKey).toBe("PHONE:+919876543210");
  });
});

describe("sanitizeText — edge cases", () => {
  it("returns original text when input has no PII", () => {
    const input = "No personal information here.";
    const res = sanitizeText(input, "FULL_MASK");
    expect(res.sanitizedText).toBe(input);
    expect(res.totalMatches).toBe(0);
    expect(res.falsePositivesBlocked).toBe(0);
  });

  it("returns empty string for empty input", () => {
    const res = sanitizeText("", "FULL_MASK");
    expect(res.sanitizedText).toBe("");
    expect(res.totalMatches).toBe(0);
  });

  it("processingTimeMs is a positive number", () => {
    const res = sanitizeText("test@test.com", "FULL_MASK");
    expect(res.processingTimeMs).toBeGreaterThan(0);
  });

  it("whitespace-only input returns unchanged with 0 matches", () => {
    const res = sanitizeText("   \n\t  ", "FULL_MASK");
    expect(res.sanitizedText).toBe("   \n\t  ");
    expect(res.totalMatches).toBe(0);
  });
});
