import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_pt.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('pt'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Evenly'**
  String get appTitle;

  /// No description provided for @settingUp.
  ///
  /// In en, this message translates to:
  /// **'Setting up...'**
  String get settingUp;

  /// No description provided for @failedToInitialize.
  ///
  /// In en, this message translates to:
  /// **'Failed to initialize: {error}'**
  String failedToInitialize(String error);

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @errorLoadingProfile.
  ///
  /// In en, this message translates to:
  /// **'Error loading profile: {error}'**
  String errorLoadingProfile(String error);

  /// No description provided for @welcomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome to Evenly'**
  String get welcomeTitle;

  /// No description provided for @welcomeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Split expenses fairly with friends and family'**
  String get welcomeSubtitle;

  /// No description provided for @whatsYourName.
  ///
  /// In en, this message translates to:
  /// **'What\'s your name?'**
  String get whatsYourName;

  /// No description provided for @enterYourName.
  ///
  /// In en, this message translates to:
  /// **'Enter your name'**
  String get enterYourName;

  /// No description provided for @pleaseEnterName.
  ///
  /// In en, this message translates to:
  /// **'Please enter your name'**
  String get pleaseEnterName;

  /// No description provided for @getStarted.
  ///
  /// In en, this message translates to:
  /// **'Get Started'**
  String get getStarted;

  /// No description provided for @myTrips.
  ///
  /// In en, this message translates to:
  /// **'My Trips'**
  String get myTrips;

  /// No description provided for @noTripsYet.
  ///
  /// In en, this message translates to:
  /// **'No trips yet'**
  String get noTripsYet;

  /// No description provided for @createFirstTrip.
  ///
  /// In en, this message translates to:
  /// **'Create your first trip to start splitting expenses with friends!'**
  String get createFirstTrip;

  /// No description provided for @newTrip.
  ///
  /// In en, this message translates to:
  /// **'New Trip'**
  String get newTrip;

  /// No description provided for @pullToRefresh.
  ///
  /// In en, this message translates to:
  /// **'Pull to refresh'**
  String get pullToRefresh;

  /// No description provided for @createTrip.
  ///
  /// In en, this message translates to:
  /// **'Create Trip'**
  String get createTrip;

  /// No description provided for @tripName.
  ///
  /// In en, this message translates to:
  /// **'Trip Name'**
  String get tripName;

  /// No description provided for @enterTripName.
  ///
  /// In en, this message translates to:
  /// **'Enter trip name'**
  String get enterTripName;

  /// No description provided for @pleaseEnterTripName.
  ///
  /// In en, this message translates to:
  /// **'Please enter a trip name'**
  String get pleaseEnterTripName;

  /// No description provided for @currency.
  ///
  /// In en, this message translates to:
  /// **'Currency'**
  String get currency;

  /// No description provided for @create.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get create;

  /// No description provided for @failedToCreateTrip.
  ///
  /// In en, this message translates to:
  /// **'Failed to create trip: {error}'**
  String failedToCreateTrip(String error);

  /// No description provided for @joinTrip.
  ///
  /// In en, this message translates to:
  /// **'Join Trip'**
  String get joinTrip;

  /// No description provided for @invalidInviteLink.
  ///
  /// In en, this message translates to:
  /// **'Invalid or expired invite code'**
  String get invalidInviteLink;

  /// No description provided for @goBack.
  ///
  /// In en, this message translates to:
  /// **'Go Back'**
  String get goBack;

  /// No description provided for @alreadyMemberOf.
  ///
  /// In en, this message translates to:
  /// **'You\'re already a member of'**
  String get alreadyMemberOf;

  /// No description provided for @openTrip.
  ///
  /// In en, this message translates to:
  /// **'Open Trip'**
  String get openTrip;

  /// No description provided for @youreInvitedToJoin.
  ///
  /// In en, this message translates to:
  /// **'You\'re invited to join'**
  String get youreInvitedToJoin;

  /// No description provided for @joining.
  ///
  /// In en, this message translates to:
  /// **'Joining...'**
  String get joining;

  /// No description provided for @failedToJoinTrip.
  ///
  /// In en, this message translates to:
  /// **'Failed to join trip: {error}'**
  String failedToJoinTrip(String error);

  /// No description provided for @enterInviteCode.
  ///
  /// In en, this message translates to:
  /// **'Enter Invite Code'**
  String get enterInviteCode;

  /// No description provided for @enterInviteCodeHint.
  ///
  /// In en, this message translates to:
  /// **'Ask the trip owner for the 6-digit code'**
  String get enterInviteCodeHint;

  /// No description provided for @paste.
  ///
  /// In en, this message translates to:
  /// **'Paste'**
  String get paste;

  /// No description provided for @validating.
  ///
  /// In en, this message translates to:
  /// **'Validating...'**
  String get validating;

  /// No description provided for @findTrip.
  ///
  /// In en, this message translates to:
  /// **'Find Trip'**
  String get findTrip;

  /// No description provided for @invalidCodeFormat.
  ///
  /// In en, this message translates to:
  /// **'Please enter a 6-digit code'**
  String get invalidCodeFormat;

  /// No description provided for @invalidOrExpiredCode.
  ///
  /// In en, this message translates to:
  /// **'Invalid or expired invite code'**
  String get invalidOrExpiredCode;

  /// No description provided for @enterDifferentCode.
  ///
  /// In en, this message translates to:
  /// **'Enter a different code'**
  String get enterDifferentCode;

  /// No description provided for @inviteCode.
  ///
  /// In en, this message translates to:
  /// **'Invite Code'**
  String get inviteCode;

  /// No description provided for @showInviteCode.
  ///
  /// In en, this message translates to:
  /// **'Show Invite Code'**
  String get showInviteCode;

  /// No description provided for @shareCodeInstructions.
  ///
  /// In en, this message translates to:
  /// **'Share this code with friends so they can join your trip'**
  String get shareCodeInstructions;

  /// No description provided for @codeExpiresIn.
  ///
  /// In en, this message translates to:
  /// **'Expires in {time}'**
  String codeExpiresIn(String time);

  /// No description provided for @copyCode.
  ///
  /// In en, this message translates to:
  /// **'Copy Code'**
  String get copyCode;

  /// No description provided for @codeCopied.
  ///
  /// In en, this message translates to:
  /// **'Code copied to clipboard!'**
  String get codeCopied;

  /// No description provided for @regenerateCode.
  ///
  /// In en, this message translates to:
  /// **'Regenerate Code'**
  String get regenerateCode;

  /// No description provided for @regenerateCodeConfirm.
  ///
  /// In en, this message translates to:
  /// **'Generate a new invite code? The current code will stop working.'**
  String get regenerateCodeConfirm;

  /// No description provided for @regenerate.
  ///
  /// In en, this message translates to:
  /// **'Regenerate'**
  String get regenerate;

  /// No description provided for @codeRegenerated.
  ///
  /// In en, this message translates to:
  /// **'New invite code generated'**
  String get codeRegenerated;

  /// No description provided for @members.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get members;

  /// No description provided for @expenses.
  ///
  /// In en, this message translates to:
  /// **'Expenses'**
  String get expenses;

  /// No description provided for @summary.
  ///
  /// In en, this message translates to:
  /// **'Summary'**
  String get summary;

  /// No description provided for @share.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get share;

  /// No description provided for @addMember.
  ///
  /// In en, this message translates to:
  /// **'Add Member'**
  String get addMember;

  /// No description provided for @addExpense.
  ///
  /// In en, this message translates to:
  /// **'Add Expense'**
  String get addExpense;

  /// No description provided for @exportPdf.
  ///
  /// In en, this message translates to:
  /// **'Export PDF'**
  String get exportPdf;

  /// No description provided for @membersCount.
  ///
  /// In en, this message translates to:
  /// **'Members ({count})'**
  String membersCount(int count);

  /// No description provided for @noMembers.
  ///
  /// In en, this message translates to:
  /// **'No members yet'**
  String get noMembers;

  /// No description provided for @youIndicator.
  ///
  /// In en, this message translates to:
  /// **'(You)'**
  String get youIndicator;

  /// No description provided for @owner.
  ///
  /// In en, this message translates to:
  /// **'Owner'**
  String get owner;

  /// No description provided for @manualIndicator.
  ///
  /// In en, this message translates to:
  /// **'(manual)'**
  String get manualIndicator;

  /// No description provided for @removeMember.
  ///
  /// In en, this message translates to:
  /// **'Remove Member'**
  String get removeMember;

  /// No description provided for @removeMemberConfirm.
  ///
  /// In en, this message translates to:
  /// **'Remove {name} from the trip?'**
  String removeMemberConfirm(String name);

  /// No description provided for @cannotRemoveWithExpenses.
  ///
  /// In en, this message translates to:
  /// **'Cannot remove member with expenses'**
  String get cannotRemoveWithExpenses;

  /// No description provided for @remove.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get remove;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @add.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get add;

  /// No description provided for @memberName.
  ///
  /// In en, this message translates to:
  /// **'Member Name'**
  String get memberName;

  /// No description provided for @enterMemberName.
  ///
  /// In en, this message translates to:
  /// **'Enter member name'**
  String get enterMemberName;

  /// No description provided for @pleaseEnterMemberName.
  ///
  /// In en, this message translates to:
  /// **'Please enter a member name'**
  String get pleaseEnterMemberName;

  /// No description provided for @memberNameExists.
  ///
  /// In en, this message translates to:
  /// **'A member with this name already exists'**
  String get memberNameExists;

  /// No description provided for @expensesCount.
  ///
  /// In en, this message translates to:
  /// **'Expenses ({count})'**
  String expensesCount(int count);

  /// No description provided for @noExpenses.
  ///
  /// In en, this message translates to:
  /// **'No expenses yet'**
  String get noExpenses;

  /// No description provided for @addFirstExpense.
  ///
  /// In en, this message translates to:
  /// **'Add your first expense to get started!'**
  String get addFirstExpense;

  /// No description provided for @paidBy.
  ///
  /// In en, this message translates to:
  /// **'Paid by {name}'**
  String paidBy(String name);

  /// No description provided for @splitBetween.
  ///
  /// In en, this message translates to:
  /// **'Split between {count}'**
  String splitBetween(int count);

  /// No description provided for @deleteExpense.
  ///
  /// In en, this message translates to:
  /// **'Delete Expense'**
  String get deleteExpense;

  /// No description provided for @deleteExpenseConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete \"{title}\"?'**
  String deleteExpenseConfirm(String title);

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @description.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get description;

  /// No description provided for @whatWasItFor.
  ///
  /// In en, this message translates to:
  /// **'What was it for?'**
  String get whatWasItFor;

  /// No description provided for @pleaseEnterDescription.
  ///
  /// In en, this message translates to:
  /// **'Please enter a description'**
  String get pleaseEnterDescription;

  /// No description provided for @amount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get amount;

  /// No description provided for @pleaseEnterAmount.
  ///
  /// In en, this message translates to:
  /// **'Please enter an amount'**
  String get pleaseEnterAmount;

  /// No description provided for @invalidAmount.
  ///
  /// In en, this message translates to:
  /// **'Please enter a valid amount'**
  String get invalidAmount;

  /// No description provided for @whoPaid.
  ///
  /// In en, this message translates to:
  /// **'Who Paid?'**
  String get whoPaid;

  /// No description provided for @selectWhoPaid.
  ///
  /// In en, this message translates to:
  /// **'Select who paid'**
  String get selectWhoPaid;

  /// No description provided for @pleaseSelectWhoPaid.
  ///
  /// In en, this message translates to:
  /// **'Please select who paid'**
  String get pleaseSelectWhoPaid;

  /// No description provided for @splitBetweenTitle.
  ///
  /// In en, this message translates to:
  /// **'Split Between'**
  String get splitBetweenTitle;

  /// No description provided for @selectAtLeastOne.
  ///
  /// In en, this message translates to:
  /// **'Select at least one person'**
  String get selectAtLeastOne;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @saveExpense.
  ///
  /// In en, this message translates to:
  /// **'Save Expense'**
  String get saveExpense;

  /// No description provided for @failedToSaveExpense.
  ///
  /// In en, this message translates to:
  /// **'Failed to save expense: {error}'**
  String failedToSaveExpense(String error);

  /// No description provided for @totalExpenses.
  ///
  /// In en, this message translates to:
  /// **'Total Expenses'**
  String get totalExpenses;

  /// No description provided for @perPerson.
  ///
  /// In en, this message translates to:
  /// **'Per Person (avg)'**
  String get perPerson;

  /// No description provided for @allSettled.
  ///
  /// In en, this message translates to:
  /// **'All settled! No payments needed.'**
  String get allSettled;

  /// No description provided for @suggestedSettlements.
  ///
  /// In en, this message translates to:
  /// **'Suggested Settlements'**
  String get suggestedSettlements;

  /// No description provided for @pays.
  ///
  /// In en, this message translates to:
  /// **'pays'**
  String get pays;

  /// No description provided for @balances.
  ///
  /// In en, this message translates to:
  /// **'Balances'**
  String get balances;

  /// No description provided for @owes.
  ///
  /// In en, this message translates to:
  /// **'owes {amount}'**
  String owes(String amount);

  /// No description provided for @getsBack.
  ///
  /// In en, this message translates to:
  /// **'gets back {amount}'**
  String getsBack(String amount);

  /// No description provided for @settledUp.
  ///
  /// In en, this message translates to:
  /// **'settled up'**
  String get settledUp;

  /// No description provided for @shareTripLink.
  ///
  /// In en, this message translates to:
  /// **'Share Trip Code'**
  String get shareTripLink;

  /// No description provided for @shareVia.
  ///
  /// In en, this message translates to:
  /// **'Share via...'**
  String get shareVia;

  /// No description provided for @joinTripMessage.
  ///
  /// In en, this message translates to:
  /// **'Join my trip \"{title}\" on Evenly! Use invite code: '**
  String joinTripMessage(String title);

  /// No description provided for @tripSettings.
  ///
  /// In en, this message translates to:
  /// **'Trip Settings'**
  String get tripSettings;

  /// No description provided for @editTripName.
  ///
  /// In en, this message translates to:
  /// **'Edit Trip Name'**
  String get editTripName;

  /// No description provided for @deleteTrip.
  ///
  /// In en, this message translates to:
  /// **'Delete Trip'**
  String get deleteTrip;

  /// No description provided for @deleteTripConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete \"{title}\"? This cannot be undone.'**
  String deleteTripConfirm(String title);

  /// No description provided for @tripDeleted.
  ///
  /// In en, this message translates to:
  /// **'Trip deleted'**
  String get tripDeleted;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @displayName.
  ///
  /// In en, this message translates to:
  /// **'Display Name'**
  String get displayName;

  /// No description provided for @yourDisplayName.
  ///
  /// In en, this message translates to:
  /// **'Your display name'**
  String get yourDisplayName;

  /// No description provided for @updateProfile.
  ///
  /// In en, this message translates to:
  /// **'Update Profile'**
  String get updateProfile;

  /// No description provided for @profileUpdated.
  ///
  /// In en, this message translates to:
  /// **'Profile updated!'**
  String get profileUpdated;

  /// No description provided for @failedToUpdateProfile.
  ///
  /// In en, this message translates to:
  /// **'Failed to update profile'**
  String get failedToUpdateProfile;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @ok.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get ok;

  /// No description provided for @error.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get error;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get loading;

  /// No description provided for @unknown.
  ///
  /// In en, this message translates to:
  /// **'Unknown'**
  String get unknown;

  /// No description provided for @editExpense.
  ///
  /// In en, this message translates to:
  /// **'Edit Expense'**
  String get editExpense;

  /// No description provided for @updateExpense.
  ///
  /// In en, this message translates to:
  /// **'Update Expense'**
  String get updateExpense;

  /// No description provided for @expenseUpdated.
  ///
  /// In en, this message translates to:
  /// **'Expense updated'**
  String get expenseUpdated;

  /// No description provided for @expenseAdded.
  ///
  /// In en, this message translates to:
  /// **'Expense added'**
  String get expenseAdded;

  /// No description provided for @expenseDeleted.
  ///
  /// In en, this message translates to:
  /// **'Expense deleted'**
  String get expenseDeleted;

  /// No description provided for @deleteExpenseQuestion.
  ///
  /// In en, this message translates to:
  /// **'Delete Expense?'**
  String get deleteExpenseQuestion;

  /// No description provided for @deleteExpenseWarning.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this expense? This cannot be undone.'**
  String get deleteExpenseWarning;

  /// No description provided for @saving.
  ///
  /// In en, this message translates to:
  /// **'Saving...'**
  String get saving;

  /// No description provided for @selectAll.
  ///
  /// In en, this message translates to:
  /// **'Select All'**
  String get selectAll;

  /// No description provided for @deselectAll.
  ///
  /// In en, this message translates to:
  /// **'Deselect All'**
  String get deselectAll;

  /// No description provided for @splitBetweenLabel.
  ///
  /// In en, this message translates to:
  /// **'Split between'**
  String get splitBetweenLabel;

  /// No description provided for @eachPersonPays.
  ///
  /// In en, this message translates to:
  /// **'Each person pays:'**
  String get eachPersonPays;

  /// No description provided for @balanceSummary.
  ///
  /// In en, this message translates to:
  /// **'Balance Summary'**
  String get balanceSummary;

  /// No description provided for @totalSpent.
  ///
  /// In en, this message translates to:
  /// **'Total Spent'**
  String get totalSpent;

  /// No description provided for @expensesCountStat.
  ///
  /// In en, this message translates to:
  /// **'{count} expenses'**
  String expensesCountStat(int count);

  /// No description provided for @membersCountStat.
  ///
  /// In en, this message translates to:
  /// **'{count} members'**
  String membersCountStat(int count);

  /// No description provided for @individualBalances.
  ///
  /// In en, this message translates to:
  /// **'Individual Balances'**
  String get individualBalances;

  /// No description provided for @getsBackLabel.
  ///
  /// In en, this message translates to:
  /// **'Gets back'**
  String get getsBackLabel;

  /// No description provided for @owesLabel.
  ///
  /// In en, this message translates to:
  /// **'Owes'**
  String get owesLabel;

  /// No description provided for @settled.
  ///
  /// In en, this message translates to:
  /// **'Settled'**
  String get settled;

  /// No description provided for @dataNotReady.
  ///
  /// In en, this message translates to:
  /// **'Data not ready yet'**
  String get dataNotReady;

  /// No description provided for @failedToExportPdf.
  ///
  /// In en, this message translates to:
  /// **'Failed to export PDF: {error}'**
  String failedToExportPdf(String error);

  /// No description provided for @tripNotFound.
  ///
  /// In en, this message translates to:
  /// **'Trip not found'**
  String get tripNotFound;

  /// No description provided for @pdfCreated.
  ///
  /// In en, this message translates to:
  /// **'Created: {date}'**
  String pdfCreated(String date);

  /// No description provided for @pdfCurrency.
  ///
  /// In en, this message translates to:
  /// **'Currency: {currency}'**
  String pdfCurrency(String currency);

  /// No description provided for @pdfDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get pdfDescription;

  /// No description provided for @pdfPaidBy.
  ///
  /// In en, this message translates to:
  /// **'Paid by'**
  String get pdfPaidBy;

  /// No description provided for @pdfAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get pdfAmount;

  /// No description provided for @pdfFinalBalances.
  ///
  /// In en, this message translates to:
  /// **'Final Balances'**
  String get pdfFinalBalances;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'pt'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'pt':
      return AppLocalizationsPt();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
