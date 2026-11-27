### 3. Copy-Paste `PROMPTS.md`

```markdown
# Prompt Log — RedactLocal

This log documents the key prompts used during development, UI refinement, testing, and deployment of **RedactLocal**.

## 1. Core PII Engine, Luhn Validation & Audit Route
- **Goal:** Build browser-local PII detection across key identifier categories, enforce Luhn validation to avoid false positives on non-card numeric IDs, support multiple redaction modes, and add `/api/audit` with a deterministic fallback.
- **Outcome:** Implemented the client-side sanitization engine, sample presets, file handling, inspection views, Vitest unit tests, and `/api/audit` fallback handling.

## 2. Editorial UI Polish & Policy Toggles
- **Goal:** Refine the interface into a clean editorial/developer workbench layout with category policy toggles, clear status indicators, and accessible controls.
- **Outcome:** Updated the workspace UI, category toggles, and diff/inspection panels, verified tests and production build, and deployed to Vercel.

## 3. Compliance & Export Enhancements
- **Goal:** Add client-side audit summary export containing aggregate counts and metadata without exposing raw PII values, and ensure safe handling of audit requests.
- **Outcome:** Added client-side JSON audit report download and verified build/test checks before final submission.