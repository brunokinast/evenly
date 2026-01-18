import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../services/services.dart';
import 'auth_providers.dart';

/// Provider for the FirestoreRepository.
final firestoreRepositoryProvider = Provider<FirestoreRepository>((ref) {
  return FirestoreRepository();
});

/// Provider for the user's trips - uses FutureProvider for better refresh support.
final userTripsProvider = FutureProvider<List<Trip>>((ref) async {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return [];

  final repository = ref.watch(firestoreRepositoryProvider);
  return repository.getUserTrips(uid);
});

/// Provider for a single trip.
final tripProvider =
    StreamProvider.family<Trip?, String>((ref, tripId) {
  final repository = ref.watch(firestoreRepositoryProvider);
  return repository.watchTrip(tripId);
});

/// Provider for members of a trip.
final membersProvider =
    StreamProvider.family<List<Member>, String>((ref, tripId) {
  final repository = ref.watch(firestoreRepositoryProvider);
  return repository.watchMembers(tripId);
});

/// Provider for member display names.
/// Maps member ID -> display name (looked up from profiles or manual name).
/// Handles name collisions by adding disambiguation suffixes.
/// 
/// This is an async provider that recomputes whenever members change.
final memberNamesProvider =
    FutureProvider.family<Map<String, String>, String>((ref, tripId) async {
  // Watch the members stream - this will trigger recomputation when members change
  final membersAsync = ref.watch(membersProvider(tripId));
  final members = membersAsync.valueOrNull ?? [];
  
  // If members are still loading, return empty map
  if (membersAsync.isLoading || members.isEmpty) return {};

  final repository = ref.read(firestoreRepositoryProvider);
  final currentUid = ref.watch(currentUidProvider);
  
  // Collect all UIDs that need profile lookup
  final uidsToLookup = members
      .where((m) => m.uid != null)
      .map((m) => m.uid!)
      .toSet() // Remove duplicates
      .toList();
  
  // Batch fetch all profiles
  Map<String, UserProfile> profiles = {};
  if (uidsToLookup.isNotEmpty) {
    try {
      profiles = await repository.getUserProfiles(uidsToLookup);
    } catch (_) {
      // Continue with empty profiles - names will show as Unknown
    }
  }
  
  // Build the raw name map first (before disambiguation)
  final rawNames = <String, String>{};
  final memberTypes = <String, bool>{}; // true = linked, false = manual
  
  for (final member in members) {
    if (member.uid != null) {
      // Linked member: use profile name if available
      final profile = profiles[member.uid];
      if (profile != null) {
        rawNames[member.id] = profile.displayName;
        memberTypes[member.id] = true;
      } else {
        // Profile not found - maybe new user, show short uid
        rawNames[member.id] = 'User #${member.uid!.substring(0, 4)}';
        memberTypes[member.id] = true;
      }
    } else if (member.manualName != null) {
      // Manual member: use stored name
      rawNames[member.id] = member.manualName!;
      memberTypes[member.id] = false;
    } else {
      // Fallback - shouldn't happen
      rawNames[member.id] = 'Unknown';
      memberTypes[member.id] = false;
    }
  }
  
  // Find duplicate names and disambiguate
  final nameCounts = <String, List<String>>{}; // name -> list of member IDs
  for (final entry in rawNames.entries) {
    nameCounts.putIfAbsent(entry.value, () => []).add(entry.key);
  }
  
  // Build final names with disambiguation
  final names = <String, String>{};
  for (final member in members) {
    final baseName = rawNames[member.id]!;
    final membersWithSameName = nameCounts[baseName]!;
    
    if (membersWithSameName.length == 1) {
      // No collision
      names[member.id] = baseName;
    } else {
      // Collision - add suffix
      if (member.uid == currentUid) {
        // Current user
        names[member.id] = '$baseName (You)';
      } else if (memberTypes[member.id] == false) {
        // Manual member
        names[member.id] = '$baseName (manual)';
      } else {
        // Another linked user - show short uid fragment
        final shortId = member.uid!.substring(0, 4);
        names[member.id] = '$baseName (#$shortId)';
      }
    }
  }
  
  return names;
});

/// Provider for expenses of a trip.
final expensesProvider =
    StreamProvider.family<List<Expense>, String>((ref, tripId) {
  final repository = ref.watch(firestoreRepositoryProvider);
  return repository.watchExpenses(tripId);
});

/// Provider for the current user's member in a trip.
final currentMemberProvider =
    FutureProvider.family<Member?, String>((ref, tripId) async {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return null;

  final repository = ref.watch(firestoreRepositoryProvider);
  return repository.getMemberByUid(tripId, uid);
});

/// Provider for checking if the current user is the trip owner.
final isTripOwnerProvider =
    Provider.family<bool, String>((ref, tripId) {
  final uid = ref.watch(currentUidProvider);
  final trip = ref.watch(tripProvider(tripId)).valueOrNull;
  
  if (uid == null || trip == null) return false;
  return trip.ownerUid == uid;
});
