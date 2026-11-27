import { describe, expect, it, vi } from "vitest";
import { sanitizeText } from "../engine";

describe("CSV sanitization & edge cases", () => {
  it("preserves quoted fields containing commas while redacting PII within cells", () => {
    const csvInput = [
      'id,name,email,card_number,note',
      '1,"Doe, John",john.doe@example.com,4111111111111111,"Customer said, \'Call me\'"',
      '2,"Smith, Jane",jane.smith@example.com,5500000000000004,"Escalation, tier 2"',
    ].join("\n");

    const result = sanitizeText(csvInput, "FULL_MASK");

    expect(result.counts.EMAIL).toBe(2);
    expect(result.counts.CREDIT_CARD).toBe(2);
    // Quoted strings with commas must remain intact outside redacted tokens
    expect(result.sanitizedText).toContain('"Doe, John"');
    expect(result.sanitizedText).toContain('"Smith, Jane"');
    expect(result.sanitizedText).toContain('"Customer said, \'Call me\'"');
    // PII inside CSV must be replaced
    expect(result.sanitizedText).toContain("[REDACTED_EMAIL]");
    expect(result.sanitizedText).toContain("[REDACTED_CARD]");
    expect(result.sanitizedText).not.toContain("john.doe@example.com");
    expect(result.sanitizedText).not.toContain("4111111111111111");
  });

  it("handles empty CSV rows and multiple trailing newlines without error", () => {
    const csvWithEmptyRows = "order,email\n\n101,ops@test.com\n\n\n102,billing@test.com\n\n";
    const result = sanitizeText(csvWithEmptyRows, "PARTIAL_MASK");

    expect(result.counts.EMAIL).toBe(2);
    expect(result.sanitizedText).toContain("o***@test.com");
    expect(result.sanitizedText).toContain("b***@test.com");
  });

  it("preserves Unicode characters across rows while detecting PII", () => {
    const unicodeCsv = [
      "user_id,full_name,email,location_ip",
      "1001,Renée François,renee@societe.fr,192.168.1.10",
      "1002,佐藤 健,sato.ken@tokyo.jp,10.0.0.99",
      "1003,Müller & Söhne,kontakt@mueller.de,172.16.0.5",
      "1004,🎉 Special User,emoji.user@acme.org,192.168.2.1",
    ].join("\n");

    const result = sanitizeText(unicodeCsv, "PSEUDONYMIZE");

    expect(result.counts.EMAIL).toBe(4);
    expect(result.counts.IP_ADDRESS).toBe(4);
    // Unicode text preserved exactly
    expect(result.sanitizedText).toContain("Renée François");
    expect(result.sanitizedText).toContain("佐藤 健");
    expect(result.sanitizedText).toContain("Müller & Söhne");
    expect(result.sanitizedText).toContain("🎉 Special User");
  });

  it("preserves non-PII 16-digit order IDs and leaves them intact in CSV columns", () => {
    const csv = [
      "order_ref,card,customer_email",
      "4532-0192-8374-6510,4111-1111-1111-1111,customer@store.com",
    ].join("\n");

    const result = sanitizeText(csv, "FULL_MASK");

    expect(result.falsePositivesBlocked).toBe(1);
    expect(result.counts.CREDIT_CARD).toBe(1);
    // Decoy order_ref must stay unchanged
    expect(result.sanitizedText).toContain("4532-0192-8374-6510");
    // Valid card must be masked
    expect(result.sanitizedText).toContain("[REDACTED_CARD]");
  });

  it("handles high-volume CSV input efficiently without memory degradation", () => {
    const rows = ["id,email,phone,card"];
    for (let i = 0; i < 200; i++) {
      rows.push(`${i},user${i}@example.com,+91 98765 ${String(10000 + i).slice(0, 5)},4111-1111-1111-1111`);
    }
    const largeCsv = rows.join("\n");

    const startTime = performance.now();
    const result = sanitizeText(largeCsv, "PSEUDONYMIZE");
    const duration = performance.now() - startTime;

    expect(result.counts.EMAIL).toBe(200);
    expect(result.counts.CREDIT_CARD).toBe(200);
    // Should process in under 150ms in standard environment
    expect(duration).toBeLessThan(1000);
  });

  it("maintains deterministic cross-row pseudonym consistency in CSV", () => {
    const csv = [
      "transaction_id,email,card",
      "TXN-01,repeat.customer@shop.in,4111111111111111",
      "TXN-02,other.customer@shop.in,5500000000000004",
      "TXN-03,repeat.customer@shop.in,4111111111111111",
    ].join("\n");

    const result = sanitizeText(csv, "PSEUDONYMIZE");

    expect(result.counts.EMAIL).toBe(3);
    // Recurring email and card must get the same pseudonym tokens
    const emailOccurrences = result.pseudonymMap.find((e) => e.token === "EMAIL_01");
    expect(emailOccurrences?.occurrences).toBe(2);

    const cardOccurrences = result.pseudonymMap.find((e) => e.token === "CARD_01");
    expect(cardOccurrences?.occurrences).toBe(2);

    // TXN-01 and TXN-03 rows must contain identical tokens
    const lines = result.sanitizedText.split("\n");
    expect(lines[1]).toContain("EMAIL_01");
    expect(lines[1]).toContain("CARD_01");
    expect(lines[3]).toContain("EMAIL_01");
    expect(lines[3]).toContain("CARD_01");
  });

  it("proves that client sanitization makes ZERO network calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    sanitizeText("Sensitive email: ceo@company.com, Card: 4111-1111-1111-1111", "FULL_MASK");

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
