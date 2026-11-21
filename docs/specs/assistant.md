# Assistant (Gemini)

Lets the user add expenses by talking to Gemini on their Android phone. Why this route: ADR 0008.

## Description

On Android, the user tells Gemini something like "taxi 25, split with Ana" and Gemini writes it down as an event in a Google calendar named "Evenly". Gemini can't call Evenly directly (that's limited to apps Google allowlists), but it can write to a calendar, and the Evenly Android app can read that calendar on the phone.

Nothing reaches a trip until the user confirms it. The next time Evenly opens, it reads the calendar and shows everything Gemini wrote in a compact review list, where the user corrects mistakes in a tap or two and adds them all at once.

## Flows

1. **Setup** (once, Android app only): Profile → "Add expenses with Gemini" opens a short guide: create the "Evenly" calendar, create the Gemini skill (one button opens Gemini with the request already typed: tap send; or by hand), allow Evenly to read the calendar.
2. **Say it**, in plain words, no keyword needed: "dinner 60 split with everyone", "gastei 32 no uber com a Ana na viagem Lisboa, a Bia pagou". Saying "Evenly" also works. Gemini confirms and shows its usual event card.
3. **Review**: open or come back to Evenly, on any screen → the "From Gemini" sheet slides up with every pending expense, one line each. A dot marks the lines that need a look. Tap a line to open it in place and change anything; Remove drops it.
4. **Add**: "Add 3 expenses" saves them all; "Later" keeps them for next time.

## Acceptance criteria

- **AST-1** Setup: in the Android app only, Profile has an "Add expenses with Gemini" row. It opens a guide with three steps:
  1. create a Google calendar named "Evenly" (a button opens Google Calendar);
  2. create the Gemini skill: "Create the skill in Gemini" opens the Gemini app with a message already typed that asks it to create the skill with the exact name, description and instructions below; the user taps send. Under it, "Or create it by hand" shows where to do it in Gemini and the three fields, each with its own Copy button. If the Gemini app isn't on the phone, the button opens the by-hand part instead and says so;
  3. allow calendar access (a button that asks for it, then shows "Allowed").

  Under the steps, a line says whether the "Evenly" calendar was found on the phone.

- **AST-2** The skill makes Gemini add an event **starting now** to the "Evenly" calendar, titled `amount | what | split with | trip | paid by`: the amount as a plain number, what it was for in the user's words, the names said, the trip name if said, and who paid if it wasn't the user. Anything not said stays empty. Gemini never looks up contacts or invites anyone.
- **AST-3** When Evenly checks: each time the Android app opens or comes back to the screen, whatever screen it's on, once the list of trips has loaded (so starting up is never slower), if calendar access is allowed. It asks the phone to sync the calendar and reads every event in it; events that arrive while the app is open are picked up too.
- **AST-4** Reading an event (forgiving):
  - **Amount**: reads 32, 32.50, 32,50, 1.234,56 or 1,234.56. Currency words and symbols are ignored: the trip's currency is used.
  - **What**: as written. If it's empty, "Expense".
  - **Trip**: the trip whose name matches best. If no trip is named, the trip with the latest activity (TRIP-12).
  - **Split with**: each name goes to the member of that trip it matches best, plus the user. "all", "everyone", "todos" or nothing means everyone.
  - **Paid by**: the member it matches best. "me", "eu" or nothing means the user.
  - **When**: the event's start time, never in the future. An all-day event means noon that day.
  - A title without `|` (e.g. typed by hand) is read as: its first number is the amount, the rest is what it was for.
- **AST-5** Matching ignores capitals, accents and extra words, and tolerates small spelling differences ("bea" → Bia, "lisboa" → Lisbon). The best match is always used. When the match is weak, or two candidates are about equally close, that field is marked as a **guess**.
- **AST-6** Review sheet: when there's at least one event, a "From Gemini · n" sheet opens over the current screen. If the user is in the middle of something (a sheet is open, or they're on the Add/Edit expense screen), it waits and opens once they're done.
  - **Lines**: grouped by trip, in Home's order. Each line shows the description, who shares it ("All" or the names) and the amount in the trip's currency. A marigold dot marks a line with a guess; a red dot marks one that can't be added yet (no amount).
  - **Opening a line**: tapping it opens it in place (one at a time). It shows:
    - the description as a text field;
    - chips for **amount**, **trip**, **paid by**, **split** and **when**, each opening the same picker as Add expense (amount keypad, trip list, payer, split with custom amounts, date and time);
    - what Gemini wrote;
    - Remove.
- **AST-7** A guessed or missing field's chip is highlighted (marigold for a guess, red for missing) until the user opens its picker and confirms it, even without changing the value. The line's dot goes once nothing is left to check.
- **AST-8** Changing a line's trip keeps its description, amount and time. Paid by and the split go back to the defaults (the user; everyone), since the people differ.
- **AST-9** Remove drops the line at once and deletes its event.
- **AST-10** "Add n expenses" saves every line that can be saved (amount > 0, a description, at least one person) as normal expenses, all in one write that takes effect at once, like EXP-8. It also deletes their events and shows "n expenses added". Lines that can't be saved stay, with the button's count leaving them out. "Later" closes the sheet: nothing is saved or deleted, changes made in the sheet are dropped, and the sheet comes back next time (AST-3).
- **AST-11** The same rules and permissions as adding by hand apply (EXP-1, EXP-6, EXP-11). Nothing reaches a trip, or the other members, before the user confirms.
- **AST-12** With Gemini set up (calendar access allowed), Home marks the trip Gemini adds to by default (the first one, TRIP-12) with a small marigold dot before its name.

## The skill

Shown in the setup guide (AST-1) in the user's language. The title's parts keep the same order in both languages.

Gemini picks a skill only from its name and description (it reads the instructions after it picks one). So the description, not a keyword, is the trigger: it lists the ordinary ways people mention a shared cost, plus "Evenly" and what speech recognition tends to hear instead, since "Evenly" said in the middle of Portuguese is often misheard.

- **Name**: `note-expense` (pt-BR: `anotar-despesa`).
- **Description**:

  > Writes down a shared expense (a trip cost split with friends) in the "Evenly" calendar. Use when the user mentions money they or a friend spent that should be split or noted down, e.g. "I paid 25 for the taxi", "dinner 60, split with Ana", "add an expense", "Bia paid 80 for groceries", or when they say Evenly (or something that sounds like it: evenlee, even lee, ivenli).

- **Instructions**:

  > Create an event in my "Evenly" calendar that starts now and lasts 15 minutes. Its title must be exactly: `amount | what | split with | trip | paid by`. amount: only the number, no currency. what: what it was for, in my words. split with: the names I said, separated by commas. trip: the trip name, only if I said one. paid by: who paid, only if it wasn't me. Leave anything I didn't say empty, but keep all the `|`. Example: "taxi 25 split with Ana and Bia" → `25 | taxi | Ana, Bia | | `. The names are trip members, not contacts: never look up contacts and never invite anyone. Then confirm in one short sentence.
