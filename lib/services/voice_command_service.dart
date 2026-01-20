import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';

import '../models/models.dart';
import '../services/services.dart';

/// Represents a voice command received from Google Assistant.
class VoiceCommand {
  final String type;
  final double? amount;
  final String? title;
  final String? tripName;
  final String? payerName;
  final List<String>? participantNames;
  final String source;

  const VoiceCommand({
    required this.type,
    this.amount,
    this.title,
    this.tripName,
    this.payerName,
    this.participantNames,
    required this.source,
  });

  factory VoiceCommand.fromMap(Map<dynamic, dynamic> map) {
    return VoiceCommand(
      type: map['type'] as String? ?? 'unknown',
      amount: (map['amount'] as num?)?.toDouble(),
      title: map['title'] as String?,
      tripName: map['tripName'] as String?,
      payerName: map['payerName'] as String?,
      participantNames: (map['participantNames'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
      source: map['source'] as String? ?? 'unknown',
    );
  }

  @override
  String toString() =>
      'VoiceCommand(type: $type, amount: $amount, '
      'title: $title, tripName: $tripName, payerName: $payerName, '
      'participantNames: $participantNames, source: $source)';
}

/// Result of processing a voice command.
sealed class VoiceCommandResult {}

/// Command was processed successfully and expense was created.
class VoiceCommandSuccess extends VoiceCommandResult {
  final Expense expense;
  final Trip trip;
  final String payerName;
  final List<String> participantNames;

  VoiceCommandSuccess({
    required this.expense,
    required this.trip,
    required this.payerName,
    required this.participantNames,
  });
}

/// Command partially succeeded - trip found but needs manual correction.
/// Opens AddExpenseScreen with pre-filled data and shows error message.
class VoiceCommandPartialSuccess extends VoiceCommandResult {
  final Trip trip;
  final double? amount;
  final String? title;
  final String? payerId;
  final List<String>? participantIds;
  final VoiceCommandErrorType errorType;
  final String errorMessage;
  final String?
  failedValue; // The value that couldn't be matched (e.g., "Eduarda")

  VoiceCommandPartialSuccess({
    required this.trip,
    this.amount,
    this.title,
    this.payerId,
    this.participantIds,
    required this.errorType,
    required this.errorMessage,
    this.failedValue,
  });
}

/// Command requires disambiguation (multiple matches found).
class VoiceCommandNeedsDisambiguation extends VoiceCommandResult {
  final DisambiguationType type;
  final List<DisambiguationOption> options;
  final VoiceCommand originalCommand;

  VoiceCommandNeedsDisambiguation({
    required this.type,
    required this.options,
    required this.originalCommand,
  });
}

/// Command failed due to an error.
class VoiceCommandError extends VoiceCommandResult {
  final VoiceCommandErrorType errorType;
  final String message;

  VoiceCommandError({required this.errorType, required this.message});
}

/// Types of disambiguation needed.
enum DisambiguationType {
  trip, // Multiple trips match
  payer, // Multiple members match payer name
  participant, // Multiple members match a participant name
}

/// An option for disambiguation.
class DisambiguationOption {
  final String id;
  final String displayName;
  final String? subtitle;

  const DisambiguationOption({
    required this.id,
    required this.displayName,
    this.subtitle,
  });
}

/// Error types for voice commands.
enum VoiceCommandErrorType {
  noTripsFound,
  tripNotFound,
  memberNotFound,
  missingRequiredParameter,
  notAuthenticated,
  unknownError,
}

/// Service to handle voice commands from Google Assistant.
///
/// Responsibilities:
/// - Listen to MethodChannel for incoming voice commands
/// - Resolve trip names with fuzzy matching
/// - Resolve member names with disambiguation
/// - Create expenses with appropriate defaults
class VoiceCommandService {
  static const _channel = MethodChannel('br.com.kinast.evenly/voice_commands');

  final FirestoreRepository _repository;

  /// Callback for when a voice command is received.
  void Function(VoiceCommand command)? onVoiceCommand;

  VoiceCommandService(this._repository);

  /// Initializes the MethodChannel listener.
  /// Only works on Android - voice commands are not supported on web/iOS.
  void initialize() {
    // MethodChannel is only available on native platforms
    if (!kIsWeb) {
      _channel.setMethodCallHandler(_handleMethodCall);
    }
  }

  /// Disposes resources.
  void dispose() {
    if (!kIsWeb) {
      _channel.setMethodCallHandler(null);
    }
  }

  Future<dynamic> _handleMethodCall(MethodCall call) async {
    if (call.method == 'onVoiceCommand') {
      final args = call.arguments as Map<dynamic, dynamic>;
      final command = VoiceCommand.fromMap(args);
      onVoiceCommand?.call(command);
    }
    return null;
  }

  /// Processes a voice command and creates an expense.
  ///
  /// Returns a [VoiceCommandResult] indicating success, disambiguation needed, or error.
  Future<VoiceCommandResult> processCommand({
    required VoiceCommand command,
    required String currentUserId,
    String? selectedTripId,
    String? selectedPayerId,
    Map<String, String>? selectedParticipantIds,
  }) async {
    try {
      // Validate required parameters
      if (command.amount == null || command.amount! <= 0) {
        return VoiceCommandError(
          errorType: VoiceCommandErrorType.missingRequiredParameter,
          message: 'Amount is required',
        );
      }

      if (command.title == null || command.title!.isEmpty) {
        return VoiceCommandError(
          errorType: VoiceCommandErrorType.missingRequiredParameter,
          message: 'Title/description is required',
        );
      }

      // Step 1: Find matching trip
      final tripResult = await _resolveTrip(
        tripName: command.tripName,
        currentUserId: currentUserId,
        selectedTripId: selectedTripId,
      );

      if (tripResult is VoiceCommandError) return tripResult;
      if (tripResult is VoiceCommandNeedsDisambiguation) return tripResult;

      final trip = (tripResult as _ResolvedTrip).trip;

      // Step 2: Get trip members
      final members = await _repository.getMembers(trip.id);
      if (members.isEmpty) {
        return VoiceCommandError(
          errorType: VoiceCommandErrorType.memberNotFound,
          message: 'Trip has no members',
        );
      }

      // Build member names map
      final memberNames = await _buildMemberNamesMap(members);

      // Find current user's member for defaults
      final currentUserMember = members.firstWhere(
        (m) => m.uid == currentUserId,
        orElse: () => members.first,
      );

      // Step 3: Resolve payer
      final payerResult = await _resolvePayer(
        payerName: command.payerName,
        members: members,
        memberNames: memberNames,
        currentUserId: currentUserId,
        selectedPayerId: selectedPayerId,
        originalCommand: command,
      );

      // If payer not found, return partial success to open add expense screen
      if (payerResult is VoiceCommandError &&
          payerResult.errorType == VoiceCommandErrorType.memberNotFound) {
        return VoiceCommandPartialSuccess(
          trip: trip,
          amount: command.amount,
          title: command.title,
          payerId: currentUserMember.id, // Default to current user
          participantIds: members.map((m) => m.id).toList(), // All members
          errorType: VoiceCommandErrorType.memberNotFound,
          errorMessage:
              'Payer "${command.payerName}" was not found in this trip',
          failedValue: command.payerName,
        );
      }
      if (payerResult is VoiceCommandNeedsDisambiguation) return payerResult;
      if (payerResult is VoiceCommandError) return payerResult;

      final payerMember = (payerResult as _ResolvedMember).member;

      // Step 4: Resolve participants
      final participantsResult = await _resolveParticipants(
        participantNames: command.participantNames,
        members: members,
        memberNames: memberNames,
        selectedParticipantIds: selectedParticipantIds,
        originalCommand: command,
      );

      // If participant not found, return partial success
      if (participantsResult is _PartialParticipantsResult) {
        return VoiceCommandPartialSuccess(
          trip: trip,
          amount: command.amount,
          title: command.title,
          payerId: payerMember.id,
          participantIds: participantsResult.resolvedIds,
          errorType: VoiceCommandErrorType.memberNotFound,
          errorMessage:
              'Participant "${participantsResult.failedName}" was not found in this trip',
          failedValue: participantsResult.failedName,
        );
      }
      if (participantsResult is VoiceCommandError) return participantsResult;
      if (participantsResult is VoiceCommandNeedsDisambiguation) {
        return participantsResult;
      }

      final participants = (participantsResult as _ResolvedMembers).members;

      // Step 5: Create the expense
      final amountCents = (command.amount! * 100).round();

      final expense = await _repository.createExpense(
        tripId: trip.id,
        amountCents: amountCents,
        description: command.title!,
        payerMemberId: payerMember.id,
        participantMemberIds: participants.map((m) => m.id).toList(),
        createdByUid: currentUserId,
      );

      return VoiceCommandSuccess(
        expense: expense,
        trip: trip,
        payerName: memberNames[payerMember.id] ?? 'Unknown',
        participantNames: participants
            .map((m) => memberNames[m.id] ?? 'Unknown')
            .toList(),
      );
    } catch (e) {
      return VoiceCommandError(
        errorType: VoiceCommandErrorType.unknownError,
        message: e.toString(),
      );
    }
  }

  /// Finds a trip matching the given name.
  /// Uses fuzzy matching and returns the most recent if multiple match.
  Future<Object> _resolveTrip({
    required String? tripName,
    required String currentUserId,
    String? selectedTripId,
  }) async {
    // If already selected via disambiguation, use that
    if (selectedTripId != null) {
      final trip = await _repository.getTrip(selectedTripId);
      if (trip != null) return _ResolvedTrip(trip);
    }

    // Get user's trips
    final trips = await _repository.getUserTrips(currentUserId);

    if (trips.isEmpty) {
      return VoiceCommandError(
        errorType: VoiceCommandErrorType.noTripsFound,
        message: 'You have no trips',
      );
    }

    // If no trip name specified, use the most recent trip
    if (tripName == null || tripName.isEmpty) {
      return _ResolvedTrip(trips.first); // Already sorted by createdAt desc
    }

    // Find matching trips using fuzzy matching
    final normalizedQuery = _normalizeString(tripName);
    final matchingTrips = trips.where((trip) {
      final normalizedTitle = _normalizeString(trip.title);
      return normalizedTitle.contains(normalizedQuery) ||
          normalizedQuery.contains(normalizedTitle) ||
          _fuzzyMatch(normalizedTitle, normalizedQuery);
    }).toList();

    if (matchingTrips.isEmpty) {
      return VoiceCommandError(
        errorType: VoiceCommandErrorType.tripNotFound,
        message: 'No trip found matching "$tripName"',
      );
    }

    if (matchingTrips.length == 1) {
      return _ResolvedTrip(matchingTrips.first);
    }

    // Multiple matches - return most recent or ask for disambiguation
    // For now, return the most recent one
    return _ResolvedTrip(matchingTrips.first);
  }

  /// Resolves the payer member.
  Future<Object> _resolvePayer({
    required String? payerName,
    required List<Member> members,
    required Map<String, String> memberNames,
    required String currentUserId,
    String? selectedPayerId,
    required VoiceCommand originalCommand,
  }) async {
    // If already selected via disambiguation, use that
    if (selectedPayerId != null) {
      final member = members.firstWhere(
        (m) => m.id == selectedPayerId,
        orElse: () => members.first,
      );
      return _ResolvedMember(member);
    }

    // If no payer specified, use current user
    if (payerName == null || payerName.isEmpty) {
      final currentUserMember = members.firstWhere(
        (m) => m.uid == currentUserId,
        orElse: () => members.first,
      );
      return _ResolvedMember(currentUserMember);
    }

    // Find matching members
    final matches = _findMatchingMembers(payerName, members, memberNames);

    if (matches.isEmpty) {
      return VoiceCommandError(
        errorType: VoiceCommandErrorType.memberNotFound,
        message: 'No member found matching "$payerName"',
      );
    }

    if (matches.length == 1) {
      return _ResolvedMember(matches.first);
    }

    // Multiple matches - need disambiguation
    return VoiceCommandNeedsDisambiguation(
      type: DisambiguationType.payer,
      options: matches
          .map(
            (m) => DisambiguationOption(
              id: m.id,
              displayName: memberNames[m.id] ?? 'Unknown',
            ),
          )
          .toList(),
      originalCommand: originalCommand,
    );
  }

  /// Resolves participant members.
  Future<Object> _resolveParticipants({
    required List<String>? participantNames,
    required List<Member> members,
    required Map<String, String> memberNames,
    Map<String, String>? selectedParticipantIds,
    required VoiceCommand originalCommand,
  }) async {
    // If no participants specified, use all members
    if (participantNames == null || participantNames.isEmpty) {
      return _ResolvedMembers(members);
    }

    final resolvedParticipants = <Member>[];

    for (final name in participantNames) {
      // Check if this participant was already selected via disambiguation
      if (selectedParticipantIds?.containsKey(name) == true) {
        final memberId = selectedParticipantIds![name]!;
        final member = members.firstWhere(
          (m) => m.id == memberId,
          orElse: () => members.first,
        );
        resolvedParticipants.add(member);
        continue;
      }

      // Find matching members
      final matches = _findMatchingMembers(name, members, memberNames);

      if (matches.isEmpty) {
        // Return partial result with what we've resolved so far
        final resolvedIds = resolvedParticipants.map((m) => m.id).toList();
        return _PartialParticipantsResult(resolvedIds, name);
      }

      if (matches.length == 1) {
        resolvedParticipants.add(matches.first);
      } else {
        // Multiple matches - need disambiguation for this participant
        return VoiceCommandNeedsDisambiguation(
          type: DisambiguationType.participant,
          options: matches
              .map(
                (m) => DisambiguationOption(
                  id: m.id,
                  displayName: memberNames[m.id] ?? 'Unknown',
                  subtitle: 'Matching "$name"',
                ),
              )
              .toList(),
          originalCommand: originalCommand,
        );
      }
    }

    // If no participants resolved, use all members
    if (resolvedParticipants.isEmpty) {
      return _ResolvedMembers(members);
    }

    return _ResolvedMembers(resolvedParticipants);
  }

  /// Finds members matching the given name.
  List<Member> _findMatchingMembers(
    String name,
    List<Member> members,
    Map<String, String> memberNames,
  ) {
    final normalizedQuery = _normalizeString(name);

    return members.where((member) {
      final memberName = memberNames[member.id] ?? '';
      final normalizedName = _normalizeString(memberName);

      return normalizedName.contains(normalizedQuery) ||
          normalizedQuery.contains(normalizedName) ||
          _fuzzyMatch(normalizedName, normalizedQuery);
    }).toList();
  }

  /// Builds a map of member ID -> display name.
  Future<Map<String, String>> _buildMemberNamesMap(List<Member> members) async {
    final names = <String, String>{};

    // Collect UIDs for profile lookup
    final uidsToLookup = members
        .where((m) => m.uid != null)
        .map((m) => m.uid!)
        .toSet()
        .toList();

    // Batch fetch profiles
    final profiles = await _repository.getUserProfiles(uidsToLookup);

    // Build names map
    for (final member in members) {
      if (member.uid != null && profiles.containsKey(member.uid)) {
        names[member.id] = profiles[member.uid]!.displayName;
      } else if (member.manualName != null) {
        names[member.id] = member.manualName!;
      } else {
        names[member.id] = 'Unknown';
      }
    }

    return names;
  }

  /// Normalizes a string for comparison (lowercase, no accents).
  String _normalizeString(String input) {
    return input
        .toLowerCase()
        .replaceAll(RegExp(r'[áàâã]'), 'a')
        .replaceAll(RegExp(r'[éèê]'), 'e')
        .replaceAll(RegExp(r'[íìî]'), 'i')
        .replaceAll(RegExp(r'[óòôõ]'), 'o')
        .replaceAll(RegExp(r'[úùû]'), 'u')
        .replaceAll('ç', 'c')
        .replaceAll(RegExp(r'[^a-z0-9\s]'), '')
        .trim();
  }

  /// Simple fuzzy matching based on Levenshtein distance.
  bool _fuzzyMatch(String a, String b) {
    if (a.isEmpty || b.isEmpty) return false;

    // Allow up to 2 character difference for short strings,
    // or 20% of length for longer strings
    final maxDistance = (a.length < 10) ? 2 : (a.length * 0.2).ceil();

    return _levenshteinDistance(a, b) <= maxDistance;
  }

  /// Calculates Levenshtein distance between two strings.
  int _levenshteinDistance(String a, String b) {
    if (a == b) return 0;
    if (a.isEmpty) return b.length;
    if (b.isEmpty) return a.length;

    List<int> previousRow = List.generate(b.length + 1, (i) => i);
    List<int> currentRow = List.filled(b.length + 1, 0);

    for (var i = 0; i < a.length; i++) {
      currentRow[0] = i + 1;

      for (var j = 0; j < b.length; j++) {
        final cost = a[i] == b[j] ? 0 : 1;
        currentRow[j + 1] = [
          currentRow[j] + 1, // insertion
          previousRow[j + 1] + 1, // deletion
          previousRow[j] + cost, // substitution
        ].reduce((a, b) => a < b ? a : b);
      }

      final temp = previousRow;
      previousRow = currentRow;
      currentRow = temp;
    }

    return previousRow[b.length];
  }
}

/// Internal class for resolved trip.
class _ResolvedTrip {
  final Trip trip;
  _ResolvedTrip(this.trip);
}

/// Internal class for resolved member.
class _ResolvedMember {
  final Member member;
  _ResolvedMember(this.member);
}

/// Internal class for resolved members list.
class _ResolvedMembers {
  final List<Member> members;
  _ResolvedMembers(this.members);
}

/// Internal class for partial participants result (some not found).
class _PartialParticipantsResult {
  final List<String> resolvedIds;
  final String failedName;
  _PartialParticipantsResult(this.resolvedIds, this.failedName);
}
