# RedactLocal

**Zero-trust, 100% browser-side PII detection and redaction workbench** with Mod-10 Luhn false-positive filtering, deterministic pseudonymization, and an optional Gemini privacy audit brief backed by a deterministic local fallback.

---

## Problem
Teams routinely need to share support tickets, clinical intake notes, server logs, and CSV exports with external vendors, analysts, or LLM tools. Uploading raw documents to third-party sanitization APIs leaks sensitive PII before redaction even occurs, while naive regex tools over-redact legitimate non-PII numeric identifiers (such as 16-digit order or batch IDs).

## Solution
**RedactLocal** runs all PII detection, Luhn verification, and text/CSV transformation strictly in browser memory (`0 bytes` of raw input transmitted). Users inspect a live side-by-side diff, toggle per-category redaction policies, export sanitized `.txt`/`.csv` files or JSON compliance certificates, and optionally request a privacy audit brief on the *already-sanitized* payload.

---

## Features
- **6 Built-in PII Detectors:** Emails, Phone Numbers (Indian `+91`/mobile & international), IPv4/IPv6 addresses, Indian PAN (`AAAAA9999A`), Indian Aadhaar (`12-digit UID`), and Payment Card Numbers (`13–19 digits`).
- **3 Redaction Modes:**
  - `FULL_MASK`: Replaces matches with irreversible category blocks (`[REDACTED_EMAIL]`, `[REDACTED_CARD]`, etc.).
  - `PARTIAL_MASK`: Preserves verification context (e.g., `a***@corp.in`, `XXXX-XXXX-XXXX-1111`, `192.168.*.*`).
  - `PSEUDONYMIZE`: Assigns deterministic session tokens (`EMAIL_01`, `CARD_01`) with normalized cross-occurrence tracking and a local mapping table.
- **Selective Category Policy Toggles:** Enable or disable redaction per PII category in real time without altering detection telemetry.
- **File Support & Exports:** Drag-and-drop or upload `.txt` and `.csv` files (up to 2 MiB), copy sanitized text, download sanitized files, or export a JSON audit certificate.
- **Seeded Demo Presets:** Instant switching between `Support Ticket`, `Clinical Note`, and `Customer CSV` datasets.

---

## Architecture & Folder Structure

```text
app/
├── api/audit/route.ts          # Server-side POST /api/audit handler (Gemini 2.5 Flash + fallback)
├── globals.css                 # Tailwind v4 theme tokens & reduced-motion-safe animations
├── layout.tsx                  # Root layout, fonts (Inter & JetBrains Mono), skip link
└── page.tsx                    # Entry route rendering RedactWorkspace

src/
├── components/
│   ├── AuditBriefPanel.tsx     # AI/fallback compliance brief, loading, and error states
│   ├── DiffViewer.tsx          # Side-by-side raw vs. sanitized diff, edit mode, & drag-and-drop
│   ├── EntityBreakdown.tsx     # Telemetry counts, category toggles, & PseudonymTable
│   ├── HeroSection.tsx         # Editorial hero, value prop, and quick-launch CTAs
│   ├── RedactWorkspace.tsx     # Stateful workbench coordinator
│   ├── StatusBadge.tsx         # Sticky header with 0-Bytes-Sent badge & scan latency
│   └── motion/                 # FadeContent, RotatingText, StarBorder
└── lib/
    ├── audit/fallback.ts       # Strict payload parser & deterministic local compliance brief
    ├── pii/
    │   ├── constants.ts        # Shared ALL_PII_CATEGORIES & ENTITY_META palette
    │   ├── detectors.ts        # Regex detectors, Mod-10 Luhn validator, overlap resolver
    │   ├── engine.ts           # sanitizeText() engine, normalization, & masking modes
    │   ├── samples.ts          # Seeded demo datasets
    │   └── types.ts            # Shared TypeScript interfaces
    └── download.ts             # Client-side Blob download helper
```

---

## How Luhn False-Positive Blocking Works
1. The card detector scans for 13–19 digit sequences (allowing space or hyphen separators).
2. Each candidate is stripped of separators and checked against `isValidLuhn()` (`src/lib/pii/detectors.ts`), which rejects degenerate all-same-digit sequences and applies the Mod-10 Luhn checksum.
3. Candidates that **fail** Luhn (such as 16-digit ledger/order IDs like `4532-0192-8374-6510`) are **not** redacted, their span is recorded in `blockedCardSpans` so the phone detector cannot swallow trailing digits, and `falsePositivesBlocked` is incremented in the telemetry bar.

---

## How the Gemini Audit Brief & Fallback Work
- **Zero Raw PII Exposure:** Clicking **Gemini Privacy Audit** sends *only* the already-sanitized text (truncated to 6,000 chars), aggregate entity counts, Luhn block count, and active mode to `POST /api/audit`.
- **Server-Side Gemini Call:** `app/api/audit/route.ts` calls `gemini-2.5-flash` via `@google/genai` with a strict JSON response schema and an 8-second timeout using `process.env.GEMINI_API_KEY`.
- **Deterministic Local Fallback:** If `GEMINI_API_KEY` is missing/placeholder, or if the Gemini call times out, fails, hits quota limits (`429`), or returns malformed output, the route seamlessly falls back to `buildLocalFallbackAudit()` (`src/lib/audit/fallback.ts`) and returns HTTP `200` with `source: "local_fallback"`.

---

## Setup & Scripts

### Local Setup
```bash
npm install
cp .env.example .env.local   # Optional: add GEMINI_API_KEY (app works without it via fallback)
npm run dev
```

### Available Scripts
| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `npm run dev` | Start Next.js development server |
| `build` | `npm run build` | Build production bundle (`next build`) |
| `start` | `npm run start` | Run production server |
| `lint` | `npm run lint` | Run ESLint across project |
| `typecheck` | `npm run typecheck` | Run strict TypeScript check (`tsc --noEmit`) |
| `test` | `npm test` | Run Vitest unit & API route test suite |
| `test:coverage` | `npm run test:coverage` | Run Vitest with V8 coverage report |

---

## Design Decisions
- **Pure Client-Side Redaction Engine:** Keeping detection and masking synchronous and dependency-free in `src/lib/pii/` guarantees zero network transmission of raw input, sub-millisecond scan latency, and straightforward unit testing.
- **Deterministic Overlap Resolution:** Overlapping matches are resolved by type specificity (`EMAIL > CREDIT_CARD > PAN > AADHAAR > IP_ADDRESS > PHONE`), then longer match length, then earliest offset—preventing phone regexes from corrupting emails or Luhn-blocked order IDs.
- **Graceful Degradation:** The `/api/audit` endpoint never crashes or blocks the user when an API key is absent or rate-limited, ensuring the workbench remains 100% functional offline or in evaluator sandboxes.

```

### Available Scripts
| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `npm run dev` | Start Next.js development server |
| `build` | `npm run build` | Build production bundle (`next build`) |
| `start` | `npm run start` | Run production server |
| `lint` | `npm run lint` | Run ESLint across project |
| `typecheck` | `npm run typecheck` | Run strict TypeScript check (`tsc --noEmit`) |
| `test` | `npm test` | Run Vitest unit & API route test suite |
| `test:coverage` | `npm run test:coverage` | Run Vitest with V8 coverage report |

---

## Design Decisions
- **Pure Client-Side Redaction Engine:** Keeping detection and masking synchronous and dependency-free in `src/lib/pii/` guarantees zero network transmission of raw input, sub-millisecond scan latency, and straightforward unit testing.
- **Deterministic Overlap Resolution:** Overlapping matches are resolved by type specificity (`EMAIL > CREDIT_CARD > PAN > AADHAAR > IP_ADDRESS > PHONE`), then longer match length, then earliest offset—preventing phone regexes from corrupting emails or Luhn-blocked order IDs.
- **Graceful Degradation:** The `/api/audit` endpoint never crashes or blocks the user when an API key is absent or rate-limited, ensuring the workbench remains 100% functional offline or in evaluator sandboxes.