# RedactLocal

**Zero-Trust, 100% Client-Side PII Data Sanitizer** built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Problem
Support engineers, healthcare staff, and analysts routinely copy-paste raw logs, tickets, clinical notes, and CSV exports into cloud tools or LLMs—accidentally leaking emails, phone numbers, IP addresses, Indian PAN/Aadhaar identifiers, and payment card numbers.

## Solution
**RedactLocal** performs all PII detection, Luhn validation, and redaction **synchronously in browser memory** (`0 Bytes Sent` during sanitization and export). Users can inspect color-coded side-by-side diffs, block false-positive 16-digit Order IDs, and download sanitized `.txt` or `.csv` files immediately without creating an account.

## Core Features
- **100% Client-Side Detection Engine (`src/lib/pii/`)**: Detects and classifies `EMAIL`, `PHONE` (Indian + international), `IP_ADDRESS` (IPv4 & IPv6), `PAN`, `AADHAAR`, and `CREDIT_CARD` with deterministic overlap resolution and exact character offsets.
- **Strict Mod-10 Luhn Validation**: Rejects non-Luhn 16-digit decoys (e.g., Order IDs) and reports them under `False Positives Blocked`.
- **Three Live Redaction Modes**:
  - **Full Mask**: `[REDACTED_EMAIL]`, `[REDACTED_CARD]`, etc.
  - **Partial Mask**: `a***@domain.com`, `XXXX-XXXX-XXXX-4242`, `XXXX-XXXX-0123`, etc.
  - **Consistent Pseudonymization**: Deterministic per-document tokens (`EMAIL_01`, `CARD_01`, `PHONE_01`) with a local-only inspectable mapping table.
- **Workspace & Export**: Raw text editor, drag-and-drop `.txt`/`.csv` upload, 3 one-click sample datasets, live side-by-side diff, clipboard copy, and 1-click `.txt`/`.csv` export.

## How AI Is Used (Optional Privacy Audit)
AI is **never** used on raw PII. After client-side sanitization completes, users can optionally click **Generate Privacy Audit with Gemini** (`POST /api/audit`).
- The browser sends **only the already-sanitized text and aggregate entity counts** to the server route handler.
- The Next.js Route Handler (`app/api/audit/route.ts`) invokes `@google/genai` (`gemini-2.5-flash`) using `process.env.GEMINI_API_KEY` (server-side only) with structured JSON output (`riskLevel`, `summary`, `complianceNotes`, `safeToShare`).
- If `GEMINI_API_KEY` is missing or a network/quota error occurs, the endpoint returns a deterministic local fallback compliance brief so the workflow never breaks.

## Local Setup & Verification

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure server-side Gemini key for AI compliance briefs
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY=...

# 3. Run unit tests (Luhn, all 6 PII detectors, 3 redaction modes)
npm test

# 4. Run development server
npm run dev

# 5. Production build check
npm run build
```
