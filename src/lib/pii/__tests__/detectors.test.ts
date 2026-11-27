import { describe, expect, it } from "vitest";
import { detectPiiCandidates, isValidLuhn } from "../detectors";

describe("isValidLuhn — extended edge cases", () => {
  it("rejects all-same-digit sequences", () => {
    expect(isValidLuhn("1111111111111111")).toBe(false);
    expect(isValidLuhn("2222222222222222")).toBe(false);
    expect(isValidLuhn("9999999999999999")).toBe(false);
  });

  it("rejects too-short and too-long inputs", () => {
    expect(isValidLuhn("1234")).toBe(false);
    expect(isValidLuhn("12345678")).toBe(false);
    expect(isValidLuhn("12345678901234567890")).toBe(false); // 20 digits
  });

  it("rejects non-numeric strings", () => {
    expect(isValidLuhn("abcdefghijklm")).toBe(false);
    expect(isValidLuhn("")).toBe(false);
    expect(isValidLuhn("ABCDE1234F")).toBe(false); // PAN-shaped
  });

  it("accepts 15-digit Amex numbers", () => {
    expect(isValidLuhn("378282246310005")).toBe(true);
    expect(isValidLuhn("371449635398431")).toBe(true);
  });

  it("handles spaces and dashes in valid numbers", () => {
    expect(isValidLuhn("4111 1111 1111 1111")).toBe(true);
    expect(isValidLuhn("4111-1111-1111-1111")).toBe(true);
    expect(isValidLuhn("5500 0000 0000 0004")).toBe(true);
  });
});

describe("detectPiiCandidates — individual PII type tests", () => {
  it("detects standard and plus-addressed emails", () => {
    const { matches } = detectPiiCandidates("user+tag@domain.co.in");
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("EMAIL");
    expect(matches[0].value).toBe("user+tag@domain.co.in");
  });

  it("rejects emails with double dots in local part", () => {
    const { matches } = detectPiiCandidates("user..name@domain.com");
    expect(matches.filter((m) => m.type === "EMAIL")).toHaveLength(0);
  });

  it("rejects emails with leading dot in local part", () => {
    const { matches } = detectPiiCandidates(".user@domain.com");
    expect(matches.filter((m) => m.type === "EMAIL")).toHaveLength(0);
  });

  it("detects 0-prefixed Indian phone numbers", () => {
    const { matches } = detectPiiCandidates("Call 09876543210 now");
    const phones = matches.filter((m) => m.type === "PHONE");
    expect(phones).toHaveLength(1);
  });

  it("detects Indian +91 phone with dash separator", () => {
    const { matches } = detectPiiCandidates("Phone: +91-98765-43210");
    const phones = matches.filter((m) => m.type === "PHONE");
    expect(phones).toHaveLength(1);
  });

  it("does not flag dates as phones", () => {
    const { matches } = detectPiiCandidates("Date: 2024-01-15");
    const phones = matches.filter((m) => m.type === "PHONE");
    expect(phones).toHaveLength(0);
  });

  it("detects PAN at word boundaries only", () => {
    const { matches } = detectPiiCandidates("PAN: ABCDE1234F verified");
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("PAN");
    expect(matches[0].value).toBe("ABCDE1234F");
  });

  it("does not detect lowercase PAN-shaped strings", () => {
    const { matches } = detectPiiCandidates("abcde1234f");
    expect(matches.filter((m) => m.type === "PAN")).toHaveLength(0);
  });

  it("detects Aadhaar starting with 2-9 (rejects starting with 0 or 1)", () => {
    const good = detectPiiCandidates("UID: 2345 6789 0123");
    expect(good.matches.filter((m) => m.type === "AADHAAR")).toHaveLength(1);

    const bad = detectPiiCandidates("Not UID: 0345 6789 0123");
    expect(bad.matches.filter((m) => m.type === "AADHAAR")).toHaveLength(0);

    const bad2 = detectPiiCandidates("Not UID: 1345 6789 0123");
    expect(bad2.matches.filter((m) => m.type === "AADHAAR")).toHaveLength(0);
  });

  it("detects standard IPv4 addresses", () => {
    const { matches } = detectPiiCandidates("Server at 192.168.1.42");
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("IP_ADDRESS");
    expect(matches[0].value).toBe("192.168.1.42");
  });

  it("rejects invalid IPv4 octets (>255)", () => {
    const { matches } = detectPiiCandidates("Invalid 999.168.1.1");
    expect(matches.filter((m) => m.type === "IP_ADDRESS")).toHaveLength(0);
  });

  it("detects IPv6 with double-colon notation", () => {
    const { matches } = detectPiiCandidates(
      "IPv6: 2001:0db8:85a3::8a2e:0370:7334"
    );
    expect(matches.filter((m) => m.type === "IP_ADDRESS")).toHaveLength(1);
  });

  it("detects valid credit cards (Luhn-passing)", () => {
    const { matches, falsePositivesBlocked } = detectPiiCandidates(
      "Card: 4111-1111-1111-1111"
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("CREDIT_CARD");
    expect(falsePositivesBlocked).toBe(0);
  });

  it("blocks Luhn-invalid 16-digit strings as false positives", () => {
    const { matches, falsePositivesBlocked } = detectPiiCandidates(
      "Order: 1234567890123456"
    );
    expect(matches.filter((m) => m.type === "CREDIT_CARD")).toHaveLength(0);
    expect(falsePositivesBlocked).toBe(1);
  });
});

describe("detectPiiCandidates — empty and whitespace input", () => {
  it("returns empty results for empty string", () => {
    const result = detectPiiCandidates("");
    expect(result.matches).toHaveLength(0);
    expect(result.falsePositivesBlocked).toBe(0);
  });

  it("returns empty results for whitespace-only input", () => {
    const result = detectPiiCandidates("   \n\t  ");
    expect(result.matches).toHaveLength(0);
    expect(result.falsePositivesBlocked).toBe(0);
  });

  it("returns empty results for text with no PII", () => {
    const result = detectPiiCandidates("Hello, this is a normal sentence.");
    expect(result.matches).toHaveLength(0);
    expect(result.falsePositivesBlocked).toBe(0);
  });
});

describe("detectPiiCandidates — overlap resolution", () => {
  it("resolves email/phone overlap in favour of email (higher specificity)", () => {
    const result = detectPiiCandidates("Contact user9876543210@corp.in");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].type).toBe("EMAIL");
  });

  it("does not double-detect Aadhaar digits as phone or card", () => {
    const result = detectPiiCandidates("Aadhaar: 2345 6789 0123");
    const types = result.matches.map((m) => m.type);
    // Should only appear once as AADHAAR
    expect(types.filter((t) => t === "AADHAAR")).toHaveLength(1);
    expect(types.filter((t) => t === "PHONE")).toHaveLength(0);
  });
});
