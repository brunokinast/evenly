# Balances and settlements

## Description
The summary shows totals, each member's balance, and a short list of suggested payments that settle everyone up.

## Flows
1. **Summary screen**: total spent, number of expenses and members, average per person; each member's balance ("Gets back X" / "Owes X" / "Settled"); suggested settlements ("A pays B X"). When everything is settled: "All settled! No payments needed."

## Rules
- A member's **balance** = total they paid − total of their shares. Positive = gets back, negative = owes.
- Balances always sum to exactly zero.

## Acceptance criteria
- **BAL-1** Balances are computed in whole cents; no rounding drift. Sum of all balances = 0.
- **BAL-2** Equal split: each participant's share is `floor(amount / n)` cents. The leftover cents (`amount mod n`) go one cent each to participants in a deterministic order (see OQ-12), so shares sum exactly to the amount.
- **BAL-3** Settlements: repeatedly match the member who owes the most with the member owed the most, transferring the smaller of the two amounts, until all are zero. This yields at most (members with non-zero balance − 1) payments.
- **BAL-4** Settlements are suggestions only; recording a payment: see OQ-13.
- **BAL-5** Balances and settlements update live with expense/member changes.
- **BAL-6** Members are listed by balance, highest "gets back" first.
- **BAL-7** Worked example (using the proposed default for OQ-12, "the payer absorbs the leftover cent"): A pays 100.00 for A, B, C → shares A 33.34, B 33.33, C 33.33 → balances A +66.66, B −33.33, C −33.33 (sum 0) → settlements: B pays A 33.33, C pays A 33.33.
