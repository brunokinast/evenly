# Expenses

## Description
An expense records that one member paid an amount on behalf of some members (the participants). By default it's split equally and dated today.

**Speed is the priority.** Adding a typical expense must take one screen, two fields and one tap. Every other field has a sensible default and stays out of the way until needed.

## Flows
1. **Expense list** (trip screen): grouped by date, newest first. Each item shows description, amount, "Paid by <name>" and the split ("Split between <n>", or "Custom split"). The total spent is shown at the top.
2. **Add expense** (one screen): opens with the **amount field focused and the numeric keyboard up**.
   - Amount → description ("What was it for?") → Save. That's the whole typical flow.
   - Defaults, shown as compact, tappable summaries: **Paid by** = you; **Split** = equally between everyone; **Date** = today.
   - Tapping a summary opens a small picker in place (e.g. a bottom sheet): pick the payer, toggle participants, switch to a custom split, or change the date.
   - A live hint shows "Each person pays: <amount>" for equal splits.
3. **Custom split**: enter an exact amount per participant. A live "Remaining: X" shows what's left to assign; Save is enabled only when it's 0.
4. **Edit expense**: same screen, pre-filled. Leaving with unsaved changes asks "Discard changes?".
5. **Delete expense**: from the edit screen, after confirming.

## Acceptance criteria
- **EXP-1** Description is required (trimmed). Amount is required and > 0. Payer is required. At least one participant is required.
- **EXP-2** Amount entry fills from the right in cents (typing 1234 shows 12.34). It's formatted in the **user's language** style (PT-BR `1.234,56`, EN `1,234.56`) with the trip currency's symbol (R$, $, €, £).
- **EXP-3** Given a member adds, edits or deletes an expense, then every member viewing the trip sees the change live, and balances update live.
- **EXP-4** Any member can add, edit and delete any expense.
- **EXP-5** The payer doesn't have to be a participant.
- **EXP-6** Payer and participants must be current members of the trip.
- **EXP-7** "Each person pays" shows the per-person share, matching BAL-2.
- **EXP-8** Saving shows progress and prevents double submission; on failure the form keeps its input and shows the error.
- **EXP-9** Opening Add expense focuses the amount field with the numeric keyboard visible; pressing Enter/Next moves to description; Enter on description saves.
- **EXP-10** With only amount and description entered, Save creates an expense paid by the current user, split equally between all members, dated today.
- **EXP-11** Date defaults to today and can't be in the future.
- **EXP-12** In a custom split, the per-person amounts must sum exactly to the total; participants with 0 are not participants.
- **EXP-13** Changing the total of a custom-split expense resets it to an equal split between the same participants, with a short notice.
