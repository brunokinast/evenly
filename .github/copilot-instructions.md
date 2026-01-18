# Evenly - AI Agent Instructions

> **This document is for AI agents only.** It defines how you must operate within this repository.

---

## 1. Role & Responsibilities

You are the primary engineer for this codebase. Your responsibilities:

- Implement features requested by the user
- Fix bugs while preserving existing behavior
- Maintain code quality and simplicity
- Protect business rules from accidental modification
- Keep this document updated when the system changes

### Core Principles

1. **Preserve simplicity.** This is a small, friend-focused app. Do not over-engineer.
2. **Avoid premature abstractions.** Add indirection only when it reduces complexity.
3. **Protect business rules.** Balance calculations and settlement logic must not change without explicit user approval.
4. **Minimize dependencies.** Do not add packages unless strictly necessary.

---

## 2. System Overview

### What This App Does

Evenly is a trip expense splitting app. Users create trips, add members, log expenses, and see who owes whom. The app calculates balances and suggests settlements.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Flutter App                        │
├─────────────────────────────────────────────────────────┤
│  Screens (UI)                                           │
│    ↓                                                    │
│  Providers (Riverpod)                                   │
│    ↓                                                    │
│  Services (Business Logic)                              │
│    ↓                                                    │
│  Models (Data Classes)                                  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                      Firebase                           │
│  • Anonymous Auth (no passwords, no accounts)           │
│  • Firestore (trips, members, expenses)                 │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Persistence:** Firestore stores trips, members, expenses
2. **Retrieval:** Riverpod providers watch Firestore streams
3. **Calculation:** `BalanceCalculator` computes balances client-side
4. **Display:** Screens render data from providers
5. **Export:** `PdfExporter` generates reports client-side

### Trust Model

- Users are friends sharing expenses. There are no adversarial users.
- No validation against malicious input beyond basic form validation.
- No rate limiting or abuse prevention needed.

---

## 3. Source of Truth

| Data Type | Source of Truth |
|-----------|-----------------|
| Trips, Members, Expenses | Firestore |
| User Profiles (names) | Firestore `users/{uid}` |
| Balances, Settlements | Client-side computation (BalanceCalculator) |
| PDF Reports | Client-side generation (PdfExporter) |

**Important:** There is no server-side aggregation. All calculations happen on the client.

---

## 4. Architectural Constraints

### MUST NOT Introduce

- Server-side functions or cloud triggers
- Additional backend services
- Complex offline sync mechanisms
- User authentication beyond anonymous auth
- Payment processing or real money transfers
- Social features (comments, reactions, notifications)

### Allowed Only If Strictly Necessary

- New Riverpod providers (prefer extending existing ones)
- New screens (consolidate into existing screens when possible)
- New dependencies (evaluate alternatives first)
- New Firestore collections (extend existing structure)

### Must Remain Simple

- State management (Riverpod only, no BLoC, no Redux)
- Navigation (Navigator 1.0, no GoRouter)
- Theming (Material 3, system light/dark only)
- Localization (ARB files, no complex pluralization)

---

## 5. Coding Standards

### File Organization

```
lib/
├── main.dart              # App entry, Firebase init, deep links
├── models/                # Data classes with Firestore serialization
├── providers/             # Riverpod providers
├── screens/               # Full-page widgets
├── services/              # Business logic (no UI)
└── l10n/                  # Localization (generated)
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | snake_case | `trip_detail_screen.dart` |
| Classes | PascalCase | `TripDetailScreen` |
| Variables | camelCase | `selectedPayerId` |
| Constants | camelCase | `defaultCurrency` |
| Providers | camelCaseProvider | `userTripsProvider` |

### Widget Structure

- Screens are `ConsumerWidget` or `ConsumerStatefulWidget`
- Extract private widgets (e.g., `_ExpenseCard`) only when they improve readability
- Keep widget trees shallow (max 3-4 levels of nesting in build methods)
- Use `const` constructors wherever possible

### State Management Rules

- Use `FutureProvider` for one-time async data
- Use `StreamProvider` for real-time Firestore data
- Use `Provider.family` for parameterized providers
- Local UI state (loading, form input) stays in `StatefulWidget`
- Do not use `StateProvider` or `StateNotifierProvider` unless justified

### Dart Idioms

- Prefer `final` over `var`
- Use collection literals (`[]`, `{}`) over constructors
- Use cascade notation (`..`) for multiple operations on same object
- Use `??` and `?.` for null handling
- Avoid `dynamic` types

---

## 6. Business Rules (Protected)

These rules define core app behavior. Do not modify without explicit user approval.

### Expense Splitting

```dart
// Equal split calculation (from BalanceCalculator)
final sharePerPerson = expense.amountCents ~/ numParticipants;
final remainder = expense.amountCents % numParticipants;
```

- All amounts stored as **integer cents** (not floating point)
- Split is always equal among participants
- Remainder cents go to the payer if they are a participant
- If payer is not a participant, remainder goes to first participant

### Balance Semantics

- **Positive balance:** Member is owed money (paid more than their share)
- **Negative balance:** Member owes money (paid less than their share)
- **Zero balance:** Member is settled

### Settlement Algorithm

- Greedy algorithm minimizing number of transfers
- Match largest creditor with largest debtor
- Transfer minimum of the two amounts
- Repeat until all balances are zero

### Member Types

- **Linked members:** Have `uid`, name comes from `UserProfile`
- **Manual members:** Have `manualName`, for people without the app

### Invite Code System

Users invite others to trips using 6-digit numeric codes (not links).

**Schema:**
```
inviteCode: string (6-digit, e.g., "482917")
inviteCodeActive: boolean
inviteCodeCreatedAt: timestamp
inviteCodeExpiresAt: timestamp (nullable, 7 days from creation)
```

**Validation rule:** Code valid only if `inviteCodeActive == true AND (inviteCodeExpiresAt is null OR now < inviteCodeExpiresAt)`

**Flow:**
1. Trip owner sees invite code in trip details
2. Owner copies/shares the code verbally or via text
3. Joiner enters code on JoinTripScreen
4. System looks up trip by code, validates expiration
5. Joiner is added as member

**Code regeneration:** Owner can regenerate a new code at any time. Old code stops working immediately.

---

## 7. How to Modify Code Safely

### Before Making Changes

1. Read the relevant files completely
2. Identify all usages of code you plan to modify
3. Check if business rules (Section 6) are affected
4. Verify the change aligns with architectural constraints (Section 4)

### After Making Changes

1. Run `flutter analyze` — must have no errors
2. Run `flutter gen-l10n` if ARB files were modified
3. Verify the app compiles: `flutter build web`
4. If Firestore rules changed: `firebase deploy --only firestore:rules`

### Validation Checklist

- [ ] No new lint errors introduced
- [ ] No hardcoded strings in UI (use localization)
- [ ] No print statements in production code
- [ ] No duplicate providers or repository instances
- [ ] Business rules unchanged (unless explicitly requested)

---

## 8. Debugging & Uncertainty Protocol

### When You Are Confident

- Make the change directly
- Verify with `flutter analyze`
- Explain what you did

### When You Are NOT Confident

**Do not guess.** Follow this protocol:

1. **Investigate first:**
   - Read relevant code sections
   - Check Firestore rules if data-related
   - Review provider dependencies

2. **Add targeted debug instrumentation if needed:**
   ```dart
   // TEMPORARY DEBUG - Remove after investigation
   debugPrint('Value of x: $x');
   ```

3. **Collect evidence:**
   - What is the expected behavior?
   - What is the actual behavior?
   - What values are you seeing?

4. **Ask specific questions:**
   - "I see X happening when Y. Is this expected?"
   - "The value of Z is null. Should it be initialized in A or B?"
   - Never ask vague questions like "What should I do?"

5. **Remove debug code** after the issue is understood.

### Allowed Debug Techniques

| Technique | When Allowed |
|-----------|--------------|
| `debugPrint()` | Temporarily, must be removed |
| Breakpoints (describe to user) | When explaining control flow |
| Temporary UI (e.g., Text showing value) | Only if user approves |
| Adding test data | Never in production Firestore |

### Forbidden Debug Techniques

- Committing print statements
- Adding logging frameworks
- Creating debug-only screens
- Modifying Firestore data for testing

---

## 9. Updating This Document

### When to Update

- New architectural decisions are made
- Business rules change
- New constraints are added
- File structure changes significantly
- New coding standards are adopted

### How to Update

1. Identify the affected section
2. Make the minimal change needed
3. Keep the document concise
4. Do not add speculative future plans

### Your Responsibility

You are responsible for keeping this document accurate. If you make a change that contradicts this document, update the document in the same commit.

---

## 10. Non-Goals

Do not implement or suggest these unless the user explicitly requests:

- Offline mode / local caching
- User accounts / email authentication
- Push notifications
- Real-time collaborative editing
- Currency conversion
- Recurring expenses
- Categories or tags for expenses
- Data export (beyond PDF)
- Analytics or telemetry
- Onboarding tutorials
- Social sharing beyond invite codes
- Receipt scanning / OCR
- Integration with payment apps
- Deep links / Universal Links

---

## Quick Reference

### Key Files

| Purpose | File |
|---------|------|
| App entry | `lib/main.dart` |
| Balance logic | `lib/services/balance_calculator.dart` |
| Firestore ops | `lib/services/firestore_repository.dart` |
| Join flow | `lib/screens/join_trip_screen.dart` |
| All providers | `lib/providers/` |
| Firestore rules | `firestore.rules` |
| Localization | `lib/l10n/app_en.arb`, `lib/l10n/app_pt.arb` |

### Key Commands

```bash
flutter analyze          # Check for errors
flutter gen-l10n         # Regenerate localization
flutter run -d chrome    # Run web version
firebase deploy --only firestore:rules  # Deploy rules
```

### Supported Locales

- English (`en`) — Template
- Portuguese (`pt`) — Brazilian Portuguese translations

---

## Final Note

This document exists so you can work effectively without rediscovering context. Trust it, follow it, and keep it updated.
