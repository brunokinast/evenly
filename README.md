# Evenly - Trip Expense Split App

A simple, low-friction, friend-focused trip expense splitting app built with Flutter.

## Features

- **No Account Required** - Anonymous authentication means zero signup friction
- **Create Trips** - Organize expenses by trip with custom currency
- **Share via Link** - Invite friends to join trips with a simple link
- **Track Expenses** - Add expenses and specify who paid and who participated
- **Equal Split** - Automatically split expenses equally among participants
- **Balance Summary** - See who owes whom at a glance
- **Smart Settlements** - Get optimized payment suggestions to minimize transfers
- **PDF Export** - Export trip summaries for records

## Getting Started

### Prerequisites

- Flutter SDK (^3.10.7)
- Firebase project with:
  - Authentication (Anonymous provider enabled)
  - Cloud Firestore
- FlutterFire CLI (recommended)

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
   firebase deploy --only firestore:rules
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
│   ├── expense.dart       # Expense model
│   ├── member.dart        # Member model
│   ├── transfer.dart      # Settlement transfer model
│   └── trip.dart          # Trip model
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
│   └── trip_list_screen.dart
└── services/              # Business logic
    ├── auth_service.dart       # Anonymous auth
    ├── balance_calculator.dart # Balance & settlement logic
    ├── firestore_repository.dart
    └── pdf_exporter.dart       # PDF generation
```

## Data Model

### Trip
```json
{
  "title": "Trip to Brasilia",
  "currency": "BRL",
  "ownerUid": "uid_123",
  "shareToken": "abc123",
  "createdAt": 1670000000000
}
```

### Member
```json
{
  "uid": "uid_123",
  "name": "Bruno",
  "createdAt": 1670000000000
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
  "createdAt": 1670000000000
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

## Deep Links

The app supports deep links for sharing trips:

```
https://evenly.app/join?tripId=XXX&token=YYY
evenly://join?tripId=XXX&token=YYY
```

### Android Setup
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="evenly.app" />
</intent-filter>
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="evenly" android:host="join" />
</intent-filter>
```

### iOS Setup
Add to `ios/Runner/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>evenly</string>
        </array>
    </dict>
</array>
<key>FlutterDeepLinkingEnabled</key>
<true/>
```

## Future Enhancements

- Custom splits (fixed amounts / percentages)
- Offline support with Firestore persistence
- Expense categories
- Payment integrations (Pix, Stripe)
- User account upgrade
- Voice commands / Assistant integration

## License

MIT License
