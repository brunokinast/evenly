# Evenly specs

Specs describe **what** Evenly does, in plain language. They are the source of truth: when behavior changes, the spec changes first, in the same commit as the code.

- `features/`: one file per feature, with acceptance criteria (AC). Tests reference AC IDs, e.g. `TRIP-3`.
- `open-questions.md`: decisions still needed from the product owner.
- `known-issues.md`: problems in the old app that the rebuild must not repeat.
- `migration-source.md`: shape of the old app's data. Used **only** by the migration script, never as a design reference.

## Product in one paragraph
Evenly lets a group of friends split shared costs on a trip with as little friction as possible. There's no signup: you type your name and start. You create a trip, share a 6-digit code, friends join, anyone adds expenses, and the app shows who owes whom and the fewest payments that settle everything. Everyone sees changes live.

## Principles
- **Zero friction**: no accounts, passwords or emails required to use the app.
- **Live by default**: anything a user sees updates immediately when anyone changes it. No refresh, no restart.
- **Fast to use** (top priority): every input has a sensible default; the common path is the shortest path (e.g. add expense = amount, description, Save). Screens with a text input open with it focused and the keyboard up. Options stay out of sight until needed: no extra menus, steps or configuration.
- **Simple over clever**: fewer screens, fewer options, obvious actions.
- **Money is exact**: amounts are whole cents; splits always add up to the total.
