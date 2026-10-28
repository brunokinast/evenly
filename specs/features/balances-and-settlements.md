# Balances and settlements

## Description

The summary shows totals, each member's balance, and a short list of suggested payments that settle everyone up.

## Flows

1. **Summary screen**: total spent, number of expenses and members, average per person; each member's balance ("Gets back X" / "Owes X" / "Settled"); suggested settlements ("A pays B X"), in two groups: **Your payments** first (what the current user pays or receives, or "You're settled up"), then **Other payments** between other members (only if there are any). When everything is settled: "All settled! No payments needed."

## Rules

- A member's **balance** = total they paid − total of their shares. Positive = gets back, negative = owes.
- Balances always sum to exactly zero.

## Acceptance criteria

- **BAL-1** Balances are computed in whole cents; no rounding drift. Sum of all balances = 0.
- **BAL-2** Equal split: each participant's share is `floor(amount / n)` cents. The leftover cents (`amount mod n`) all go to the payer if they participate; otherwise to the first participant in member order. Shares always sum exactly to the amount. Custom splits use the entered amounts (EXP-12).
- **BAL-3** Settlements: repeatedly match the member who owes the most with the member owed the most, transferring the smaller of the two amounts, until all are zero. This yields at most (members with non-zero balance − 1) payments.
- **BAL-4** Settlements are suggestions only; the app doesn't record payments.
- **BAL-5** Balances and settlements update live with expense/member changes.
- **BAL-6** Balances are listed in the MEM-6 order (you first, then join order), like every other list of people.
- **BAL-8** Suggested payments involving the current user are listed separately and first: amounts they pay in the "owes" color, amounts they receive in the "gets back" color. Within each group, payments follow the MEM-6 order of the payer, then of the receiver.
- **BAL-7** Worked example: A pays 100.00 for A, B, C → shares A 33.34, B 33.33, C 33.33 → balances A +66.66, B −33.33, C −33.33 (sum 0) → settlements: B pays A 33.33, C pays A 33.33.
