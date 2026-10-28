# Expenses

## Description
An expense records that one member paid an amount on behalf of some members (the participants), split equally.

## Flows
1. **Expense list** (trip screen): newest first. Each item shows description, amount, "Paid by <name>" and "Split between <n>". The total spent is shown at the top.
2. **Add expense**: description ("What was it for?"), amount, who paid (defaults to the current user), split between (defaults to all members; Select all / Deselect all). A live hint shows "Each person pays: <amount>". Save.
3. **Edit expense**: same form, pre-filled. Leaving with unsaved changes asks "Discard changes?".
4. **Delete expense**: from the edit form, after confirming.

## Acceptance criteria
- **EXP-1** Description is required (trimmed). Amount is required and > 0. Payer is required. At least one participant is required.
- **EXP-2** Amount entry fills from the right in cents (typing 1234 shows 12.34) and is formatted in the trip currency's style (BRL: `R$ 1.234,56`; USD/GBP: `$ 1,234.56` / `£ 1,234.56`; EUR: see OQ-10).
- **EXP-3** Given a member adds, edits or deletes an expense, then every member viewing the trip sees the change live, and balances update live.
- **EXP-4** Any member can add expenses. Edit/delete permission: see OQ-11.
- **EXP-5** The payer doesn't have to be a participant.
- **EXP-6** Payer and participants must be current members of the trip.
- **EXP-7** "Each person pays" shows the per-person share, matching the split rule in balances BAL-2.
- **EXP-8** Saving shows progress and prevents double submission; on failure the form keeps its input and shows the error.
