// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Evenly';

  @override
  String get settingUp => 'Setting up...';

  @override
  String failedToInitialize(String error) {
    return 'Failed to initialize: $error';
  }

  @override
  String get retry => 'Retry';

  @override
  String errorLoadingProfile(String error) {
    return 'Error loading profile: $error';
  }

  @override
  String get welcomeTitle => 'Welcome to Evenly';

  @override
  String get welcomeSubtitle => 'Split expenses fairly with friends and family';

  @override
  String get whatsYourName => 'What\'s your name?';

  @override
  String get enterYourName => 'Enter your name';

  @override
  String get pleaseEnterName => 'Please enter your name';

  @override
  String get getStarted => 'Get Started';

  @override
  String get myTrips => 'My Trips';

  @override
  String get noTripsYet => 'No trips yet';

  @override
  String get createFirstTrip =>
      'Create your first trip to start splitting expenses with friends!';

  @override
  String get newTrip => 'New Trip';

  @override
  String get pullToRefresh => 'Pull to refresh';

  @override
  String get createTrip => 'Create Trip';

  @override
  String get tripName => 'Trip Name';

  @override
  String get enterTripName => 'Enter trip name';

  @override
  String get pleaseEnterTripName => 'Please enter a trip name';

  @override
  String get currency => 'Currency';

  @override
  String get create => 'Create';

  @override
  String failedToCreateTrip(String error) {
    return 'Failed to create trip: $error';
  }

  @override
  String get joinTrip => 'Join Trip';

  @override
  String get invalidInviteLink => 'Invalid or expired invite code';

  @override
  String get goBack => 'Go Back';

  @override
  String get alreadyMemberOf => 'You\'re already a member of';

  @override
  String get openTrip => 'Open Trip';

  @override
  String get youreInvitedToJoin => 'You\'re invited to join';

  @override
  String get joining => 'Joining...';

  @override
  String failedToJoinTrip(String error) {
    return 'Failed to join trip: $error';
  }

  @override
  String get enterInviteCode => 'Enter Invite Code';

  @override
  String get enterInviteCodeHint => 'Ask the trip owner for the 6-digit code';

  @override
  String get paste => 'Paste';

  @override
  String get validating => 'Validating...';

  @override
  String get findTrip => 'Find Trip';

  @override
  String get invalidCodeFormat => 'Please enter a 6-digit code';

  @override
  String get invalidOrExpiredCode => 'Invalid or expired invite code';

  @override
  String get enterDifferentCode => 'Enter a different code';

  @override
  String get inviteCode => 'Invite Code';

  @override
  String get showInviteCode => 'Show Invite Code';

  @override
  String get shareCodeInstructions =>
      'Share this code with friends so they can join your trip';

  @override
  String codeExpiresIn(String time) {
    return 'Expires in $time';
  }

  @override
  String get copyCode => 'Copy Code';

  @override
  String get codeCopied => 'Code copied to clipboard!';

  @override
  String get regenerateCode => 'Regenerate Code';

  @override
  String get regenerateCodeConfirm =>
      'Generate a new invite code? The current code will stop working.';

  @override
  String get regenerate => 'Regenerate';

  @override
  String get codeRegenerated => 'New invite code generated';

  @override
  String get members => 'Members';

  @override
  String get expenses => 'Expenses';

  @override
  String get summary => 'Summary';

  @override
  String get share => 'Share';

  @override
  String get addMember => 'Add Member';

  @override
  String get addExpense => 'Add Expense';

  @override
  String get exportPdf => 'Export PDF';

  @override
  String membersCount(int count) {
    return 'Members ($count)';
  }

  @override
  String get noMembers => 'No members yet';

  @override
  String get youIndicator => '(You)';

  @override
  String get owner => 'Owner';

  @override
  String get manualIndicator => '(manual)';

  @override
  String get removeMember => 'Remove Member';

  @override
  String removeMemberConfirm(String name) {
    return 'Remove $name from the trip?';
  }

  @override
  String get cannotRemoveWithExpenses => 'Cannot remove member with expenses';

  @override
  String get remove => 'Remove';

  @override
  String get cancel => 'Cancel';

  @override
  String get add => 'Add';

  @override
  String get memberName => 'Member Name';

  @override
  String get enterMemberName => 'Enter member name';

  @override
  String get pleaseEnterMemberName => 'Please enter a member name';

  @override
  String get memberNameExists => 'A member with this name already exists';

  @override
  String expensesCount(int count) {
    return 'Expenses ($count)';
  }

  @override
  String get noExpenses => 'No expenses yet';

  @override
  String get addFirstExpense => 'Add your first expense to get started!';

  @override
  String paidBy(String name) {
    return 'Paid by $name';
  }

  @override
  String splitBetween(int count) {
    return 'Split between $count';
  }

  @override
  String get deleteExpense => 'Delete Expense';

  @override
  String deleteExpenseConfirm(String title) {
    return 'Delete \"$title\"?';
  }

  @override
  String get delete => 'Delete';

  @override
  String get description => 'Description';

  @override
  String get whatWasItFor => 'What was it for?';

  @override
  String get pleaseEnterDescription => 'Please enter a description';

  @override
  String get amount => 'Amount';

  @override
  String get pleaseEnterAmount => 'Please enter an amount';

  @override
  String get invalidAmount => 'Please enter a valid amount';

  @override
  String get whoPaid => 'Who Paid?';

  @override
  String get selectWhoPaid => 'Select who paid';

  @override
  String get pleaseSelectWhoPaid => 'Please select who paid';

  @override
  String get splitBetweenTitle => 'Split Between';

  @override
  String get selectAtLeastOne => 'Select at least one person';

  @override
  String get save => 'Save';

  @override
  String get saveExpense => 'Save Expense';

  @override
  String failedToSaveExpense(String error) {
    return 'Failed to save expense: $error';
  }

  @override
  String get totalExpenses => 'Total Expenses';

  @override
  String get perPerson => 'Per Person (avg)';

  @override
  String get allSettled => 'All settled! No payments needed.';

  @override
  String get suggestedSettlements => 'Suggested Settlements';

  @override
  String get pays => 'pays';

  @override
  String get balances => 'Balances';

  @override
  String owes(String amount) {
    return 'owes $amount';
  }

  @override
  String getsBack(String amount) {
    return 'gets back $amount';
  }

  @override
  String get settledUp => 'settled up';

  @override
  String get shareTripLink => 'Share Trip Code';

  @override
  String get shareVia => 'Share via...';

  @override
  String joinTripMessage(String title) {
    return 'Join my trip \"$title\" on Evenly! Use invite code: ';
  }

  @override
  String get tripSettings => 'Trip Settings';

  @override
  String get editTripName => 'Edit Trip Name';

  @override
  String get deleteTrip => 'Delete Trip';

  @override
  String deleteTripConfirm(String title) {
    return 'Delete \"$title\"? This cannot be undone.';
  }

  @override
  String get tripDeleted => 'Trip deleted';

  @override
  String get profile => 'Profile';

  @override
  String get displayName => 'Display Name';

  @override
  String get yourDisplayName => 'Your display name';

  @override
  String get updateProfile => 'Update Profile';

  @override
  String get profileUpdated => 'Profile updated!';

  @override
  String get failedToUpdateProfile => 'Failed to update profile';

  @override
  String failedToSaveProfile(String error) {
    return 'Failed to save profile: $error';
  }

  @override
  String get close => 'Close';

  @override
  String get ok => 'OK';

  @override
  String get error => 'Error';

  @override
  String get loading => 'Loading...';

  @override
  String get unknown => 'Unknown';

  @override
  String get lightMode => 'Light Mode';

  @override
  String get darkMode => 'Dark Mode';

  @override
  String get switchToLightTheme => 'Switch to light theme';

  @override
  String get switchToDarkTheme => 'Switch to dark theme';

  @override
  String get editExpense => 'Edit Expense';

  @override
  String get updateExpense => 'Update Expense';

  @override
  String get expenseUpdated => 'Expense updated';

  @override
  String get expenseAdded => 'Expense added';

  @override
  String get expenseDeleted => 'Expense deleted';

  @override
  String get deleteExpenseQuestion => 'Delete Expense?';

  @override
  String get deleteExpenseWarning =>
      'Are you sure you want to delete this expense? This cannot be undone.';

  @override
  String get saving => 'Saving...';

  @override
  String get selectAll => 'Select All';

  @override
  String get deselectAll => 'Deselect All';

  @override
  String get splitBetweenLabel => 'Split between';

  @override
  String get eachPersonPays => 'Each person pays:';

  @override
  String get balanceSummary => 'Balance Summary';

  @override
  String get totalSpent => 'Total Spent';

  @override
  String expensesCountStat(int count) {
    return '$count expenses';
  }

  @override
  String membersCountStat(int count) {
    return '$count members';
  }

  @override
  String get individualBalances => 'Individual Balances';

  @override
  String get getsBackLabel => 'Gets back';

  @override
  String get owesLabel => 'Owes';

  @override
  String get settled => 'Settled';

  @override
  String get dataNotReady => 'Data not ready yet';

  @override
  String failedToExportPdf(String error) {
    return 'Failed to export PDF: $error';
  }

  @override
  String get tripNotFound => 'Trip not found';

  @override
  String get inviteFriendsHint =>
      'You\'ll be able to invite friends after creating the trip.';

  @override
  String get privacyNote =>
      'Your name is stored locally and shared only with trip members.';

  @override
  String peopleCount(int count) {
    return '$count people';
  }

  @override
  String get tripIcon => 'Trip Icon';

  @override
  String get chooseIcon => 'Choose an icon';

  @override
  String get addMemberManually => 'Add someone who doesn\'t use the app';

  @override
  String get regenerateCodeHint =>
      'Generate a new code if the old one was compromised';

  @override
  String get deleteTripHint => 'Permanently delete this trip and all its data';

  @override
  String pdfCreated(String date) {
    return 'Created: $date';
  }

  @override
  String pdfCurrency(String currency) {
    return 'Currency: $currency';
  }

  @override
  String get pdfDescription => 'Description';

  @override
  String get pdfPaidBy => 'Paid by';

  @override
  String get pdfAmount => 'Amount';

  @override
  String get pdfFinalBalances => 'Final Balances';
}
