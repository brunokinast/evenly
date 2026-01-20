import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/services.dart';
import 'trip_providers.dart';
import 'auth_providers.dart';

/// Provider for the VoiceCommandService.
final voiceCommandServiceProvider = Provider<VoiceCommandService>((ref) {
  final repository = ref.watch(firestoreRepositoryProvider);
  return VoiceCommandService(repository);
});

/// State for voice command processing.
class VoiceCommandState {
  final bool isProcessing;
  final VoiceCommand? pendingCommand;
  final VoiceCommandResult? lastResult;
  final DisambiguationType? disambiguationType;
  final List<DisambiguationOption>? disambiguationOptions;

  // Selected values during disambiguation
  final String? selectedTripId;
  final String? selectedPayerId;
  final Map<String, String> selectedParticipantIds;

  const VoiceCommandState({
    this.isProcessing = false,
    this.pendingCommand,
    this.lastResult,
    this.disambiguationType,
    this.disambiguationOptions,
    this.selectedTripId,
    this.selectedPayerId,
    this.selectedParticipantIds = const {},
  });

  VoiceCommandState copyWith({
    bool? isProcessing,
    VoiceCommand? pendingCommand,
    VoiceCommandResult? lastResult,
    DisambiguationType? disambiguationType,
    List<DisambiguationOption>? disambiguationOptions,
    String? selectedTripId,
    String? selectedPayerId,
    Map<String, String>? selectedParticipantIds,
    bool clearPendingCommand = false,
    bool clearLastResult = false,
    bool clearDisambiguation = false,
  }) {
    return VoiceCommandState(
      isProcessing: isProcessing ?? this.isProcessing,
      pendingCommand: clearPendingCommand
          ? null
          : (pendingCommand ?? this.pendingCommand),
      lastResult: clearLastResult ? null : (lastResult ?? this.lastResult),
      disambiguationType: clearDisambiguation
          ? null
          : (disambiguationType ?? this.disambiguationType),
      disambiguationOptions: clearDisambiguation
          ? null
          : (disambiguationOptions ?? this.disambiguationOptions),
      selectedTripId: selectedTripId ?? this.selectedTripId,
      selectedPayerId: selectedPayerId ?? this.selectedPayerId,
      selectedParticipantIds:
          selectedParticipantIds ?? this.selectedParticipantIds,
    );
  }

  /// Whether disambiguation is needed.
  bool get needsDisambiguation =>
      disambiguationType != null && disambiguationOptions != null;

  /// Whether the last command was successful.
  bool get wasSuccessful => lastResult is VoiceCommandSuccess;

  /// Whether the last command resulted in partial success (needs manual correction).
  bool get hasPartialSuccess => lastResult is VoiceCommandPartialSuccess;

  /// Whether the last command failed.
  bool get hasFailed => lastResult is VoiceCommandError;

  /// Gets the success result if available.
  VoiceCommandSuccess? get successResult => lastResult is VoiceCommandSuccess
      ? lastResult as VoiceCommandSuccess
      : null;

  /// Gets the partial success result if available.
  VoiceCommandPartialSuccess? get partialSuccessResult =>
      lastResult is VoiceCommandPartialSuccess
      ? lastResult as VoiceCommandPartialSuccess
      : null;

  /// Gets the error result if available.
  VoiceCommandError? get errorResult =>
      lastResult is VoiceCommandError ? lastResult as VoiceCommandError : null;
}

/// Notifier for managing voice command state.
class VoiceCommandNotifier extends Notifier<VoiceCommandState> {
  late final VoiceCommandService _service;

  @override
  VoiceCommandState build() {
    _service = ref.watch(voiceCommandServiceProvider);
    // Initialize the service and listen for commands
    _service.initialize();
    _service.onVoiceCommand = _handleIncomingCommand;

    // Cleanup on dispose
    ref.onDispose(() {
      _service.dispose();
    });

    return const VoiceCommandState();
  }

  /// Handles an incoming voice command from Android.
  void _handleIncomingCommand(VoiceCommand command) {
    state = state.copyWith(
      pendingCommand: command,
      clearLastResult: true,
      clearDisambiguation: true,
    );
    processCommand();
  }

  /// Processes the pending voice command.
  Future<void> processCommand() async {
    final command = state.pendingCommand;
    if (command == null) return;

    final currentUserId = ref.read(currentUidProvider);
    if (currentUserId == null) {
      state = state.copyWith(
        isProcessing: false,
        lastResult: VoiceCommandError(
          errorType: VoiceCommandErrorType.notAuthenticated,
          message: 'Not authenticated',
        ),
      );
      return;
    }

    state = state.copyWith(isProcessing: true);

    final result = await _service.processCommand(
      command: command,
      currentUserId: currentUserId,
      selectedTripId: state.selectedTripId,
      selectedPayerId: state.selectedPayerId,
      selectedParticipantIds: state.selectedParticipantIds,
    );

    if (result is VoiceCommandNeedsDisambiguation) {
      state = state.copyWith(
        isProcessing: false,
        disambiguationType: result.type,
        disambiguationOptions: result.options,
      );
    } else {
      state = state.copyWith(
        isProcessing: false,
        lastResult: result,
        clearPendingCommand:
            result is VoiceCommandSuccess ||
            result is VoiceCommandPartialSuccess,
        clearDisambiguation: true,
      );
    }
  }

  /// Selects an option during disambiguation and reprocesses.
  void selectDisambiguationOption(String optionId) {
    switch (state.disambiguationType) {
      case DisambiguationType.trip:
        state = state.copyWith(
          selectedTripId: optionId,
          clearDisambiguation: true,
        );
        break;
      case DisambiguationType.payer:
        state = state.copyWith(
          selectedPayerId: optionId,
          clearDisambiguation: true,
        );
        break;
      case DisambiguationType.participant:
        // For participants, we need to track which name this resolves
        final pendingParticipantName = state.disambiguationOptions
            ?.firstWhere((o) => o.id == optionId)
            .subtitle
            ?.replaceAll('Matching "', '')
            .replaceAll('"', '');

        if (pendingParticipantName != null) {
          final newMap = Map<String, String>.from(state.selectedParticipantIds);
          newMap[pendingParticipantName] = optionId;
          state = state.copyWith(
            selectedParticipantIds: newMap,
            clearDisambiguation: true,
          );
        }
        break;
      case null:
        break;
    }

    // Reprocess the command with the new selection
    processCommand();
  }

  /// Cancels the current voice command processing.
  void cancelCommand() {
    state = const VoiceCommandState();
  }

  /// Clears the last result (e.g., after showing success feedback).
  void clearResult() {
    state = state.copyWith(
      clearLastResult: true,
      clearPendingCommand: true,
      clearDisambiguation: true,
    );
  }

  /// Manually triggers a voice command (for testing or deep links).
  void triggerCommand(VoiceCommand command) {
    _handleIncomingCommand(command);
  }
}

/// Provider for voice command state and notifier.
final voiceCommandProvider =
    NotifierProvider<VoiceCommandNotifier, VoiceCommandState>(
      VoiceCommandNotifier.new,
    );
