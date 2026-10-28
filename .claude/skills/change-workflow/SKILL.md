---
name: change-workflow
description: Use for ANY request to add a feature, change behavior, fix a bug, or adjust the UI of Evenly ("add X", "Y is broken", "make Z look like…"). Walks spec → tests → code → checks → review → commit. Start it yourself; the user won't ask for it by name.
---

# Change workflow

The user doesn't write code and won't remember this process. Follow every step; keep messages short and plain.

1. **Read** the relevant `specs/features/*.md`, `specs/design.md`, `docs/architecture.md`, `docs/data-model.md` and ADRs in `docs/decisions/`. Never look at the old app.
2. **Spec first.** Propose the acceptance-criteria changes (new IDs or edited ones) in plain language and ask the user to confirm the behavior with AskUserQuestion. This is the only question; decide technical details yourself. A pure bug fix that matches the existing spec needs no question: name the AC it violates.
3. **Failing tests first**, named after the AC IDs (`it("EXP-2 fills cents from the right", …)`):
   - logic → `src/domain/*.test.ts`
   - permissions/validation → `tests/rules/*.test.ts` (one test per rule case in `docs/data-model.md`)
   - screens → `e2e/*.spec.ts` (phone viewport)
4. **Implement**, reusing what exists. Respect `CLAUDE.md` rules (layers, live data, one write or one batch, cents/ms, tokens only).
5. **See it**: run the Playwright check (`npm run emulators` in the background when data is needed, then `npm run e2e`) and look at the screenshots against `specs/design.md`, light and dark.
6. **Review** in a fresh subagent: give it the diff and the spec, ask for correctness against the ACs only (skip style). Then run a reuse/simplify pass. Fix what holds up.
7. **Update docs** in the same change: specs, `docs/data-model.md`, a new ADR if a durable decision changed (ADRs are append-only), `docs/rebuild-plan.md` status, and `CLAUDE.md` for anything learned that the code can't show. Remove dead code.
8. **Commit** on a branch made from `evenly-v2` (`git checkout -b <short-name> evenly-v2`), spec and code together. Show the user the evidence: test summary and screenshots (serve on the LAN, never publish to claude.ai).
9. **Merge** into `evenly-v2` only when the user says OK, then `git push`. Never touch the remote's `main` (old app).

The Stop hook runs `npm run check`; "done" means it passes.
