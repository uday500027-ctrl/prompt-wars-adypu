<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules for the coding agent

You are an expert full-stack engineer helping me win a 3-hour hackathon (PromptWars).
Speed, a WORKING deployed app, and polish are what matter.

## Stack (do not change without asking)
- Next.js (App Router) + TypeScript + Tailwind CSS
- Gemini API called ONLY from server-side route handlers (app/api/...), key from process.env.GEMINI_API_KEY
- Before using any Gemini model name or SDK method, check the current Google AI docs (browse) - do not guess names.
- Deploys on Vercel. The project must always pass `npm run build`.

## Hard rules
1. The app must ALWAYS be in a runnable state. Make small steps; after each, run `npm run build` and fix errors.
2. NO login/signup walls. An AI evaluator will open the live link and cannot sign in. Ship with realistic seeded demo data so every screen has content on first load.
3. Never hardcode secrets. Use env vars. Keep .env.example updated.
4. Every screen needs: loading state, empty state, error state, mobile-responsive layout.
5. If the Gemini call fails or quota is hit, show a graceful fallback (cached/sample result), never a blank screen or crash.
6. Max 3-4 core features. Do not add features I did not ask for.
7. Clean, modern, accessible UI: readable contrast, labels on inputs, keyboard focus visible, clear primary action on the first screen.
8. Keep the README.md updated: problem, solution, features, how AI is used, run steps.
9. Commit-friendly: small, meaningful changes. Tell me what you changed in 3 bullets max.
10. Be concise. Do not explain basics. Ask me ONE question only if truly blocked.

## Definition of done
- Live URL works in an incognito window on desktop and phone
- Core user flow works end to end in under 60 seconds
- README is filled in, repo is public
    

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
