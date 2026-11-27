# Prompt templates (copy, fill {{ }} , paste into Antigravity)

## 0. Before building: 10-minute thinking sheet (write by hand / in notes)
- Who exactly is the user? (one specific person, not "everyone")
- What is their single biggest pain in this problem?
- What is the ONE magic moment my app delivers in under 60 seconds?
- Where does Gemini add real value (summarise, classify, extract, translate, recommend, generate plan)?
- What will I demo in 2 minutes?

## 1. Planning prompt (use Planning mode, best model)
You are a senior product engineer. Problem statement:
"""
{{PASTE PROBLEM STATEMENT}}
"""
Target user: {{USER}}. Core pain: {{PAIN}}. Magic moment: {{MOMENT}}.
Create a plan for a working website buildable in 90 minutes using Next.js (App Router), TypeScript, Tailwind and the Gemini API (server-side).
Give: (a) 3-4 core features only, (b) page/route structure, (c) data model with seeded demo data, (d) exactly where and how Gemini is used, (e) UI style direction, (f) order of build steps. No login. Keep it simple and demo-ready. Do not write code yet.

## 2. Build prompt (after plan approved)
Implement the plan step by step. First: project layout, design system (colors, typography, spacing), and the main screen with seeded demo data. Make sure `npm run build` passes. Then stop and summarise in 3 bullets.

## 3. Gemini feature prompt
Add the Gemini-powered feature: {{DESCRIBE}}. Create a server route at app/api/{{name}}/route.ts using process.env.GEMINI_API_KEY. Check current Gemini docs for the correct SDK/model name. Return structured JSON, validate it, add loading + error + fallback sample output. Show the result clearly in the UI.

## 4. Polish prompt
Polish the UI like a product designer: consistent spacing, clear visual hierarchy, a strong first-screen headline + primary button, helpful empty states, micro-interactions, responsive on 360px width, accessible contrast and focus states. Do not add new features.

## 5. Test + fix prompt
Open the app in the browser, go through the main user flow as a first-time user on desktop and mobile width, and list every bug or confusing moment. Fix them. Run `npm run build` at the end.

## 6. Pre-submission prompt
Final check: build passes, no console errors, no hardcoded secrets, README complete (problem, solution, features, AI usage, run steps), seeded demo data present, no login required. List anything still broken.

## 7. LinkedIn post (fill in, then post BEFORE final submission - it is mandatory)
Just built "{{APP NAME}}" in 3 hours at #PromptWars x ADYPU, organised by @Google for Developers and @Hack2skill.

The problem: {{1 sentence}}
My insight: {{1 sentence - what most people miss}}
What it does: {{2-3 short points}}
How I built it: Google Antigravity + Gemini + Next.js, using only prompts. Biggest lesson: {{lesson}}

Live: {{VERCEL URL}}
Code: {{GITHUB URL}}

#PromptWars #GoogleForDevelopers #BuildWithAI #Hack2skill #Gemini #VibeCoding
