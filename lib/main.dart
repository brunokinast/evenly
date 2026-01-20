import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'firebase_options.dart';
import 'l10n/app_localizations.dart';
import 'providers/providers.dart';
import 'screens/screens.dart';
import 'services/services.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Initialize SharedPreferences
  final prefs = await SharedPreferences.getInstance();

  // Initialize PWA service on web
  if (kIsWeb) {
    PwaService.instance.initialize();
  }

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  // Enable edge-to-edge on Android
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      child: const EvenlyApp(),
    ),
  );
}

class EvenlyApp extends ConsumerWidget {
  const EvenlyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Ensure user is signed in anonymously
    ref.watch(ensureSignedInProvider);

    return MaterialApp(
      title: 'Evenly',
      debugShowCheckedModeBanner: false,

      // Localization
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('en'), Locale('pt')],

      // Themes
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ref.watch(themeModeProvider),

      home: const _AuthWrapper(),
    );
  }
}

/// Wrapper that ensures user is authenticated and has a profile.
class _AuthWrapper extends ConsumerStatefulWidget {
  const _AuthWrapper();

  @override
  ConsumerState<_AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends ConsumerState<_AuthWrapper> {
  bool _showWelcome = false;

  @override
  Widget build(BuildContext context) {
    final authAsync = ref.watch(ensureSignedInProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return authAsync.when(
      loading: () => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // App logo/icon with loading
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  Icons.wallet_rounded,
                  size: 40,
                  color: colorScheme.primary,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: colorScheme.primary,
                ),
              ),
            ],
          ),
        ),
      ),
      error: (error, stack) => Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: colorScheme.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Icon(
                    Icons.error_outline_rounded,
                    size: 40,
                    color: colorScheme.error,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Unable to connect',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Please check your internet connection and try again.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: () => ref.invalidate(ensureSignedInProvider),
                  icon: const Icon(Icons.refresh_rounded, size: 20),
                  label: const Text('Try Again'),
                ),
              ],
            ),
          ),
        ),
      ),
      data: (_) => _buildProfileCheck(),
    );
  }

  Widget _buildProfileCheck() {
    final profileAsync = ref.watch(userProfileProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return profileAsync.when(
      loading: () => Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            strokeWidth: 2.5,
            color: colorScheme.primary,
          ),
        ),
      ),
      error: (error, stack) => Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: colorScheme.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Icon(
                    Icons.person_off_rounded,
                    size: 40,
                    color: colorScheme.error,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Profile Error',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Unable to load your profile. Please try again.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: () => ref.invalidate(userProfileProvider),
                  icon: const Icon(Icons.refresh_rounded, size: 20),
                  label: const Text('Try Again'),
                ),
              ],
            ),
          ),
        ),
      ),
      data: (profile) {
        // Show welcome screen if no profile or manually triggered
        if (profile == null || _showWelcome) {
          return WelcomeScreen(
            onComplete: () {
              setState(() => _showWelcome = false);
              ref.invalidate(userProfileProvider);
            },
          );
        }

        // Wrap main screen with voice command handler
        return const _VoiceCommandWrapper(child: TripListScreen());
      },
    );
  }
}

/// Wrapper that listens for voice command results and shows appropriate UI.
class _VoiceCommandWrapper extends ConsumerStatefulWidget {
  final Widget child;

  const _VoiceCommandWrapper({required this.child});

  @override
  ConsumerState<_VoiceCommandWrapper> createState() =>
      _VoiceCommandWrapperState();
}

class _VoiceCommandWrapperState extends ConsumerState<_VoiceCommandWrapper> {
  @override
  void initState() {
    super.initState();
    // Initialize voice command provider (this sets up the MethodChannel listener)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(voiceCommandProvider);
    });
  }

  @override
  Widget build(BuildContext context) {
    // Listen for voice command state changes
    ref.listen<VoiceCommandState>(voiceCommandProvider, (previous, current) {
      _handleVoiceCommandStateChange(previous, current);
    });

    return widget.child;
  }

  void _handleVoiceCommandStateChange(
    VoiceCommandState? previous,
    VoiceCommandState current,
  ) {
    final l10n = AppLocalizations.of(context);

    // Show disambiguation dialog if needed
    if (current.needsDisambiguation &&
        (previous?.disambiguationType != current.disambiguationType)) {
      _showDisambiguationDialog(current);
      return;
    }

    // Show success snackbar
    if (current.wasSuccessful && previous?.wasSuccessful != true) {
      final success = current.successResult!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            l10n?.voiceCommandExpenseCreated(
                  success.expense.amount.toStringAsFixed(2),
                  success.trip.currency,
                  success.expense.description,
                  success.trip.title,
                ) ??
                'Expense created successfully',
          ),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: l10n?.viewTrip ?? 'View',
            textColor: Colors.white,
            onPressed: () {
              // Navigate to the trip detail screen
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => TripDetailScreen(tripId: success.trip.id),
                ),
              );
            },
          ),
        ),
      );

      // Clear the result after showing
      ref.read(voiceCommandProvider.notifier).clearResult();
    }

    // Handle partial success - open AddExpenseScreen with pre-filled data
    if (current.hasPartialSuccess && previous?.hasPartialSuccess != true) {
      final partial = current.partialSuccessResult!;

      // Get localized error message
      final errorMessage = _getPartialErrorMessage(partial, l10n);

      // Navigate to add expense screen with pre-filled data
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AddExpenseScreen(
            tripId: partial.trip.id,
            prefillAmount: partial.amount,
            prefillTitle: partial.title,
            prefillPayerId: partial.payerId,
            prefillParticipantIds: partial.participantIds,
            errorMessage: errorMessage,
          ),
        ),
      );

      // Clear the result
      ref.read(voiceCommandProvider.notifier).clearResult();
    }

    // Show error snackbar
    if (current.hasFailed && previous?.hasFailed != true) {
      final error = current.errorResult!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_getErrorMessage(error, l10n)),
          backgroundColor: Theme.of(context).colorScheme.error,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 4),
        ),
      );

      // Clear the result after showing
      ref.read(voiceCommandProvider.notifier).clearResult();
    }
  }

  String _getErrorMessage(VoiceCommandError error, AppLocalizations? l10n) {
    switch (error.errorType) {
      case VoiceCommandErrorType.noTripsFound:
        return l10n?.voiceCommandNoTrips ??
            'You have no trips. Create a trip first.';
      case VoiceCommandErrorType.tripNotFound:
        return l10n?.voiceCommandTripNotFound ?? 'Trip not found.';
      case VoiceCommandErrorType.memberNotFound:
        return l10n?.voiceCommandMemberNotFound ?? 'Member not found.';
      case VoiceCommandErrorType.missingRequiredParameter:
        return l10n?.voiceCommandMissingParameter ??
            'Missing required information.';
      case VoiceCommandErrorType.notAuthenticated:
        return l10n?.voiceCommandNotAuthenticated ?? 'Not signed in.';
      case VoiceCommandErrorType.unknownError:
        return error.message;
    }
  }

  String _getPartialErrorMessage(
    VoiceCommandPartialSuccess partial,
    AppLocalizations? l10n,
  ) {
    final failedValue = partial.failedValue ?? '';
    switch (partial.errorType) {
      case VoiceCommandErrorType.memberNotFound:
        return l10n?.voiceCommandPayerNotFound(failedValue) ??
            'Member "$failedValue" was not found in this trip. Please select the correct person.';
      default:
        return partial.errorMessage;
    }
  }

  void _showDisambiguationDialog(VoiceCommandState state) {
    final l10n = AppLocalizations.of(context);
    final colorScheme = Theme.of(context).colorScheme;

    String title;
    switch (state.disambiguationType!) {
      case DisambiguationType.trip:
        title = l10n?.voiceCommandSelectTrip ?? 'Select Trip';
        break;
      case DisambiguationType.payer:
        title = l10n?.voiceCommandSelectPayer ?? 'Who paid?';
        break;
      case DisambiguationType.participant:
        title = l10n?.voiceCommandSelectParticipant ?? 'Select participant';
        break;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
            ),
            if (state.pendingCommand?.title != null) ...[
              const SizedBox(height: 8),
              Text(
                '${l10n?.voiceCommandAddingExpense ?? "Adding"}: ${state.pendingCommand!.title}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            const SizedBox(height: 16),
            ...state.disambiguationOptions!.map(
              (option) => ListTile(
                leading: CircleAvatar(
                  backgroundColor: colorScheme.primaryContainer,
                  child: Text(
                    option.displayName.isNotEmpty
                        ? option.displayName[0].toUpperCase()
                        : '?',
                    style: TextStyle(color: colorScheme.onPrimaryContainer),
                  ),
                ),
                title: Text(option.displayName),
                subtitle: option.subtitle != null
                    ? Text(option.subtitle!)
                    : null,
                onTap: () {
                  Navigator.pop(context);
                  ref
                      .read(voiceCommandProvider.notifier)
                      .selectDisambiguationOption(option.id);
                },
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(context);
                  ref.read(voiceCommandProvider.notifier).cancelCommand();
                },
                child: Text(l10n?.cancel ?? 'Cancel'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
