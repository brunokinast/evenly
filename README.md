# Evenly - Trip Expense Split App

A simple, low-friction, friend-focused trip expense splitting app built with Flutter.

## Features

- **No Account Required** - Anonymous authentication means zero signup friction
- **Create Trips** - Organize expenses by trip with custom currency
- **Invite via Code** - Share a 6-digit code for friends to join trips
- **Track Expenses** - Add expenses and specify who paid and who participated
- **Equal Split** - Automatically split expenses equally among participants
- **Balance Summary** - See who owes whom at a glance
- **Smart Settlements** - Get optimized payment suggestions to minimize transfers
- **PDF Export** - Export trip summaries for records
- **Localization** - English and Portuguese (Brazil) support

## Getting Started

### Prerequisites

- Flutter SDK (^3.10.7)
- Firebase project with:
  - Authentication (Anonymous provider enabled)
  - Cloud Firestore

### Firebase Setup

1. **Create a Firebase Project**
   ```bash
   firebase projects:create evenly-app
   ```

2. **Configure FlutterFire**
   ```bash
   flutterfire configure --project=evenly-app
   ```
   This will create the `lib/firebase_options.dart` file automatically.

3. **Enable Anonymous Authentication**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable "Anonymous" provider

4. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules --project=your-project-id
   ```

### Running the App

1. **Install dependencies**
   ```bash
   flutter pub get
   ```

2. **Run the app**
   ```bash
   flutter run
   ```

## Project Structure

```
lib/
├── main.dart              # App entry point with Firebase init
├── models/                # Data models
│   ├── expense.dart
│   ├── member.dart
│   ├── transfer.dart
│   ├── trip.dart
│   └── user_profile.dart
├── providers/             # Riverpod providers
│   ├── auth_providers.dart
│   ├── balance_providers.dart
│   ├── pdf_providers.dart
│   └── trip_providers.dart
├── screens/               # UI screens
│   ├── add_expense_screen.dart
│   ├── balance_screen.dart
│   ├── create_trip_screen.dart
│   ├── join_trip_screen.dart
│   ├── trip_detail_screen.dart
│   ├── trip_list_screen.dart
│   └── welcome_screen.dart
├── services/              # Business logic
│   ├── auth_service.dart
│   ├── balance_calculator.dart
│   ├── firestore_repository.dart
│   └── pdf_exporter.dart
└── l10n/                  # Localization
    ├── app_en.arb
    └── app_pt.arb
```

## Data Model

### Trip
```json
{
  "title": "Trip to Brasilia",
  "currency": "BRL",
  "ownerUid": "uid_123",
  "inviteCode": "482917",
  "inviteCodeActive": true,
  "inviteCodeCreatedAt": "timestamp",
  "inviteCodeExpiresAt": "timestamp (7 days)",
  "createdAt": "timestamp"
}
```

### Member
```json
{
  "uid": "uid_123",
  "createdAt": "timestamp"
}
```
Or for manual members (people without the app):
```json
{
  "manualName": "John",
  "createdAt": "timestamp"
}
```

### Expense
```json
{
  "amount_cents": 3000,
  "description": "Lunch",
  "payer_member_id": "memberA",
  "participant_member_ids": ["memberA", "memberB", "memberC"],
  "createdByUid": "uid_123",
  "createdAt": "timestamp"
}
```

## Balance Calculation

1. **For each expense:**
   - Split amount equally among participants
   - Credit payer with full amount
   - Debit each participant their share
   - Remainder cents go to payer (if participating)

2. **Settlement (Greedy Algorithm):**
   - Match debtors to creditors
   - Minimize number of transfers
   - Generate suggested payments

## Invite Code System

Trip owners can invite others using a 6-digit numeric code:

1. Owner opens trip → sees invite code
2. Owner shares code verbally or via text
3. Joiner opens app → taps "Join Trip" → enters code
4. Code is validated (active + not expired)
5. Joiner is added as member

Codes expire after 7 days. Owners can regenerate codes at any time.

## License

MIT License
