import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import {
  buildLocalFallbackAudit,
  parseAuditPayload,
} from "@/src/lib/audit/fallback";
import type { AuditResponse, AuditRiskLevel } from "@/src/lib/pii/types";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 8_000;

const AUDIT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    riskLevel: {
      type: "string",
      enum: ["LOW", "MODERATE", "HIGH"],
      description:
        "Residual privacy/compliance risk of sharing the sanitized payload.",
    },
    summary: {
      type: "string",
      description:
        "Concise 1-2 sentence compliance assessment referencing only sanitized placeholders and aggregate counts.",
    },
    complianceNotes: {
      type: "array",
      items: { type: "string" },
      description:
        "2 to 4 actionable governance recommendations (e.g., DPDP Act, GDPR, PCI-DSS, internal vs external sharing).",
    },
    safeToShare: {
      type: "boolean",
      description:
        "Whether the sanitized output is safe for external sharing as-is.",
    },
  },
  required: ["riskLevel", "summary", "complianceNotes", "safeToShare"],
} as const;

function isValidRiskLevel(value: unknown): value is AuditRiskLevel {
  return value === "LOW" || value === "MODERATE" || value === "HIGH";
}

function normalizeGeminiPayload(raw: unknown): Omit<
  AuditResponse,
  "source" | "generatedAt" | "model"
> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  if (
    !isValidRiskLevel(obj.riskLevel) ||
    typeof obj.summary !== "string" ||
    !obj.summary.trim() ||
    typeof obj.safeToShare !== "boolean" ||
    !Array.isArray(obj.complianceNotes)
  ) {
    return null;
  }

  const notes = obj.complianceNotes
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 5);

  if (notes.length === 0) return null;

  return {
    riskLevel: obj.riskLevel,
    summary: obj.summary.trim(),
    complianceNotes: notes,
    safeToShare: obj.safeToShare,
  };
}

/**
 * POST /api/audit
 * Evaluates already-sanitized text and aggregate entity counts using Gemini 2.5 Flash,
 * falling back deterministically to a local compliance brief on missing keys, timeouts, or errors.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const parsed = parseAuditPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payload = parsed.data;
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json(buildLocalFallbackAudit(payload), { status: 200 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Truncate long sanitized snippets sent for structural review to keep latency crisp
    const previewSnippet = payload.sanitizedText.slice(0, 6_000);

    const prompt = [
      "You are a strict data privacy and compliance auditor reviewing ALREADY-SANITIZED text.",
      "Do NOT invent any PII. Assess whether the sanitized text is safe to share externally and flag any contextual risks (e.g. partial masks exposing last 4 digits, quasi-identifiers, or dataset correlation).",
      "",
      `Redaction Mode: ${payload.mode}`,
      `Total Entities Redacted: ${payload.totalMatches}`,
      `False Positives Blocked (Luhn-invalid IDs): ${payload.falsePositivesBlocked}`,
      `Aggregate Counts: ${JSON.stringify(payload.counts)}`,
      "",
      "Sanitized Text Excerpt:",
      previewSnippet,
    ].join("\n");

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini request timeout")), GEMINI_TIMEOUT_MS);
    });

    const response = await Promise.race([
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: AUDIT_RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
      timeoutPromise,
    ]);

    const responseText = response.text;
    if (!responseText) {
      return NextResponse.json(buildLocalFallbackAudit(payload), {
        status: 200,
      });
    }

    const decoded: unknown = JSON.parse(responseText);
    const normalized = normalizeGeminiPayload(decoded);

    if (!normalized) {
      return NextResponse.json(buildLocalFallbackAudit(payload), {
        status: 200,
      });
    }

    const auditResult: AuditResponse = {
      ...normalized,
      source: "gemini",
      model: GEMINI_MODEL,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(auditResult, { status: 200 });
  } catch {
    // Graceful deterministic fallback on quota limits, network errors, or invalid keys
    return NextResponse.json(buildLocalFallbackAudit(payload), { status: 200 });
  }
}
