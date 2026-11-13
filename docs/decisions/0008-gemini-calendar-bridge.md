# 0008: Gemini adds expenses through a calendar, reviewed in the app

Status: accepted (2026-11-13).

## Context

The user wants to tell Gemini on their phone "add 40 to my trip, split with Ana" without opening Evenly. Research (docs/research/gemini-assistant.md) found:

- Gemini calls third-party apps (Android AppFunctions, "Android MCP") only for apps Google allowlists, through a private preview with a waitlist. Declaring the functions isn't enough: Gemini answers that it has no access to Evenly. Spoofing an allowlisted app's package didn't work either.
- Custom MCP servers in Gemini are US-only and English-only.
- Gemini can create events in any of the user's Google calendars, and a user-made Gemini skill can tell it exactly how to word them. The event reaches the phone's calendar store with the next sync (7–13 s in tests).

## Decision

- Gemini writes each expense as an event in a Google calendar named "Evenly", titled `amount | what | split with | trip | paid by` (the skill text is in specs/features/assistant.md and in the setup guide).
- The Android app reads that calendar through the system calendar store (`EvenlyCalendarPlugin.java`, READ/WRITE_CALENDAR). It reads on open and on return, after Home's list shows, and asks for a sync first.
- Nothing is saved without the user: a review sheet shows every pending expense, with forgiving matching and guesses highlighted. "Add" saves them in one batch and deletes their events, so the calendar is the waiting list and Evenly stores nothing new.
- The review edits the same `ExpenseDraft` as the Add/Edit expense form, through the same pickers (`src/screens/expense/fields.tsx`), so the two can't drift.

## Consequences

- Works on the user's phone today, with no Google approval. Each user sets it up once (calendar, skill, permission); it's Android-app only.
- Expenses arrive when the app is next opened, not instantly. There's no confirmation from Evenly inside Gemini: Gemini's own event card is the receipt.
- The format depends on Gemini following the skill. The parser is forgiving (AST-4: free-text titles still give an amount and a description), and the review catches the rest.
- If Google opens AppFunctions to all apps, a direct integration can replace the calendar step and keep the same review and draft code.
