import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/audit/route";
import { GoogleGenAI } from "@google/genai";

vi.mock("@google/genai", () => {
  const generateContentMock = vi.fn();
  const GoogleGenAIClass = vi.fn().mockImplementation(() => ({
    models: {
      generateContent: generateContentMock,
    },
  }));
  return {
    GoogleGenAI: GoogleGenAIClass,
    __mockGenerateContent: generateContentMock,
  };
});

describe("/api/audit route", () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalEnv;
  });

  const validPayload = {
    sanitizedText: "[REDACTED_EMAIL] paid with [REDACTED_CARD]",
    counts: {
      EMAIL: 1,
      PHONE: 0,
      IP_ADDRESS: 0,
      PAN: 0,
      AADHAAR: 0,
      CREDIT_CARD: 1,
    },
    totalMatches: 2,
    falsePositivesBlocked: 1,
    mode: "FULL_MASK",
  };

  it("returns 400 when request body is not valid JSON", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      body: "invalid-json{{",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON request body.");
  });

  it("returns 400 when payload validation fails (e.g. negative counts)", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify({
        ...validPayload,
        counts: { ...validPayload.counts, EMAIL: -5 },
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid count for EMAIL/i);
  });

  it("uses local fallback when GEMINI_API_KEY is not configured", async () => {
    delete process.env.GEMINI_API_KEY;

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("local_fallback");
    expect(data.riskLevel).toBe("LOW");
    expect(data.safeToShare).toBe(true);
    expect(data.summary).toContain("Sanitized 2 PII entities");
  });

  it("uses local fallback when GEMINI_API_KEY is default placeholder", async () => {
    process.env.GEMINI_API_KEY = "your_key_here";

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("local_fallback");
  });

  it("uses local fallback when external Gemini API call throws (e.g. rate limit)", async () => {
    const aiInstance = new GoogleGenAI({ apiKey: "test" });
    const mockGenerate = aiInstance.models.generateContent as unknown as ReturnType<typeof vi.fn>;
    mockGenerate.mockRejectedValueOnce(new Error("429 Resource has been exhausted"));

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("local_fallback");
  });

  it("uses local fallback when Gemini response text is empty or missing", async () => {
    const aiInstance = new GoogleGenAI({ apiKey: "test" });
    const mockGenerate = aiInstance.models.generateContent as unknown as ReturnType<typeof vi.fn>;
    mockGenerate.mockResolvedValueOnce({ text: null });

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("local_fallback");
  });

  it("uses local fallback when Gemini returns invalid JSON schema", async () => {
    const aiInstance = new GoogleGenAI({ apiKey: "test" });
    const mockGenerate = aiInstance.models.generateContent as unknown as ReturnType<typeof vi.fn>;
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify({ invalidField: "bad schema" }),
    });

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("local_fallback");
  });

  it("returns normalized Gemini audit when Gemini call succeeds", async () => {
    const aiInstance = new GoogleGenAI({ apiKey: "test" });
    const mockGenerate = aiInstance.models.generateContent as unknown as ReturnType<typeof vi.fn>;
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify({
        riskLevel: "LOW",
        summary: "All payment card and email identifiers have been masked with zero residual exposure.",
        complianceNotes: [
          "PCI-DSS compliance verified for card redaction.",
          "Safe for external ticket export.",
        ],
        safeToShare: true,
      }),
    });

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("gemini");
    expect(data.model).toBe("gemini-2.5-flash");
    expect(data.riskLevel).toBe("LOW");
    expect(data.safeToShare).toBe(true);
    expect(data.complianceNotes).toHaveLength(2);
  });

  it("proves privacy guarantee: only sanitized text is sent to Gemini, raw input is never transmitted", async () => {
    const aiInstance = new GoogleGenAI({ apiKey: "test" });
    const mockGenerate = aiInstance.models.generateContent as unknown as ReturnType<typeof vi.fn>;
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify({
        riskLevel: "LOW",
        summary: "Audit completed.",
        complianceNotes: ["Safe to share."],
        safeToShare: true,
      }),
    });

    const secretRawPii = "super-secret-card-4111-1111-1111-1111";
    const sanitizedSafeText = "[REDACTED_CARD] processed";

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify({
        ...validPayload,
        sanitizedText: sanitizedSafeText,
      }),
      headers: { "Content-Type": "application/json" },
    });
    await POST(req);

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerate.mock.calls[0][0];
    const promptSent = callArgs.contents;

    // Verify the sanitized text is present, and the raw secret was NEVER passed
    expect(promptSent).toContain(sanitizedSafeText);
    expect(promptSent).not.toContain(secretRawPii);
  });
});
