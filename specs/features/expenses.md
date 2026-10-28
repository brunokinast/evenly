# Expenses

## Description

An expense records that one member paid an amount on behalf of some members (the participants). By default it's split equally and dated now (date and time).

**Speed is the priority.** Adding a typical expense must take one screen, two fields and one tap. Every other field has a sensible default and stays out of the way until needed.

## Flows

1. **Expense list** (trip screen): grouped by date, newest first by date and time. Each item shows the payer (as their avatar), the description and the amount, plus a second line with the time and the split ("Split between all", "Split between <n>" or "Custom split"). The total spent is shown at the top, centered and large, with the number of expenses under it. Tapping an item opens its details.
2. **Expense details**: the description, amount, date and time, who paid, and each participant's share, the current user's first (as "You"). An Edit button opens the edit screen.
3. **Add expense** (one screen): opens with the **amount field focused and the numeric keyboard up**.
   - Amount → description ("What was it for?") → Save. That's the whole typical flow.
   - Defaults, shown as compact, tappable summaries: **Paid by** = you; **Split** = equally between everyone; **When** = now (date and time).
   - Tapping a summary opens a small picker in place (e.g. a bottom sheet): pick the payer, toggle participants, switch to a custom split, or change the date and time.
   - A live hint shows "Each person pays: <amount>" for equal splits.
4. **Custom split**: type an amount only for participants who pay a different share. Everyone else splits what's left equally, and their automatic share is shown as a hint in their field. A live "Remaining: X" (or "Over the total by X") shows when the amounts don't add up; Save is enabled only when they add up exactly.
5. **Edit expense**: from Expense details, same screen as Add, pre-filled. Leaving with unsaved changes asks "Discard changes?".
6. **Delete expense**: from the edit screen, after confirming.

## Acceptance criteria

- **EXP-1** Description is required (trimmed). Amount is required and > 0. Payer is required. At least one participant is required.
- **EXP-2** Amount entry fills from the right in cents (typing 1234 shows 12.34). It's formatted in the **user's language** style (PT-BR `1.234,56`, EN `1,234.56`) with the trip currency's symbol (R$, $, €, £).
- **EXP-3** Given a member adds, edits or deletes an expense, then every member viewing the trip sees the change live, and balances update live.
- **EXP-4** Any member can add, edit and delete any expense.
- **EXP-5** The payer doesn't have to be a participant.
- **EXP-6** Payer and participants must be current members of the trip.
- **EXP-7** "Each person pays" shows the per-person share, matching BAL-2.
- **EXP-8** Saving shows progress and prevents double submission; on failure the form keeps its input and shows the error.
- **EXP-9** Opening Add expense focuses the amount field with the numeric keyboard visible; pressing Enter/Next moves to description; Enter on description closes the keyboard (so Paid by, Split and When are in view to change); Save saves. Opening Edit expense focuses nothing (the keyboard stays down), since it isn't known what the user wants to change.
- **EXP-10** With only amount and description entered, Save creates an expense paid by the current user, split equally between all members, dated now.
- **EXP-11** Date and time default to now and can't be in the future. The Date and time sheet always has a date and a time (nothing can be left empty); days after today can't be picked, and a time later than now on today shows "The date and time can't be in the future." with Done disabled.
- **EXP-17** The Date and time sheet opens showing the current date and time as two rows (Date, Time); nothing is expanded. Tapping a row opens its picker under it (a month calendar for the date, hour and minute wheels for the time); one is open at a time, and tapping the open row closes it. Under the rows, time shortcuts set the time in one tap: Now (also sets today), Breakfast 8:00, Lunch 12:30, Dinner 20:00; a shortcut that would be in the future is disabled, and the one matching the chosen time is highlighted.
- **EXP-12** In a custom split, typed amounts are kept as typed; participants without a typed amount share the rest equally (leftover cents per BAL-2). Shares must sum exactly to the total; a participant whose share is 0 is not a participant.
- **EXP-13** Changing the total of a custom-split expense resets it to an equal split between the same participants, with a short notice.
- **EXP-14** The expense list is grouped by date and ordered newest first by date and time, within and across groups.
- **EXP-15** Tapping an expense opens its details (EXP flow 2); editing starts only from the Edit button there.
