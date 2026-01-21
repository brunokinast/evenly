import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/models.dart';

/// Repository for all Firestore operations.
class FirestoreRepository {
  final FirebaseFirestore _firestore;
  final Random _random = Random();

  FirestoreRepository({FirebaseFirestore? firestore})
    : _firestore = firestore ?? FirebaseFirestore.instance;

  // ============================================================
  // USER PROFILES
  // ============================================================

  /// Gets a user profile by UID.
  Future<UserProfile?> getUserProfile(String uid) async {
    final doc = await _firestore.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return UserProfile.fromFirestore(doc);
  }

  /// Creates or updates a user profile.
  Future<UserProfile> saveUserProfile({
    required String uid,
    required String displayName,
  }) async {
    final existing = await getUserProfile(uid);
    final now = DateTime.now();

    final profile = UserProfile(
      uid: uid,
      displayName: displayName,
      createdAt: existing?.createdAt ?? now,
    );

    await _firestore.collection('users').doc(uid).set(profile.toFirestore());
    return profile;
  }

  /// Stream of user profile changes.
  Stream<UserProfile?> watchUserProfile(String uid) {
    return _firestore.collection('users').doc(uid).snapshots().map((doc) {
      if (!doc.exists) return null;
      return UserProfile.fromFirestore(doc);
    });
  }

  /// Gets multiple user profiles by their UIDs.
  /// Returns a map of uid -> UserProfile.
  Future<Map<String, UserProfile>> getUserProfiles(List<String> uids) async {
    if (uids.isEmpty) return {};

    final profiles = <String, UserProfile>{};

    // Firestore 'in' queries support max 10 items, so batch if needed
    for (var i = 0; i < uids.length; i += 10) {
      final batch = uids.skip(i).take(10).toList();
      final snapshot = await _firestore
          .collection('users')
          .where(FieldPath.documentId, whereIn: batch)
          .get();

      for (final doc in snapshot.docs) {
        profiles[doc.id] = UserProfile.fromFirestore(doc);
      }
    }

    return profiles;
  }

  // ============================================================
  // TRIPS
  // ============================================================

  /// Generates a unique 6-digit invite code.
  /// Checks for uniqueness among active, non-expired codes.
  Future<String> _generateUniqueInviteCode() async {
    const maxAttempts = 10;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate 6-digit code
      final code = (_random.nextInt(900000) + 100000).toString();

      // Check if code is already in use (active and not expired)
      final existing = await _firestore
          .collection('trips')
          .where('inviteCode', isEqualTo: code)
          .where('inviteCodeActive', isEqualTo: true)
          .get();

      // Check expiration for any matches
      bool codeInUse = false;
      for (final doc in existing.docs) {
        final expiresAt = doc.data()['inviteCodeExpiresAt'] as Timestamp?;
        if (expiresAt == null || expiresAt.toDate().isAfter(DateTime.now())) {
          codeInUse = true;
          break;
        }
      }

      if (!codeInUse) {
        return code;
      }
    }

    // Extremely unlikely to reach here with 900,000 possible codes
    throw Exception(
      'Failed to generate unique invite code after $maxAttempts attempts',
    );
  }

  /// Creates a new trip and adds the creator as the first member.
  Future<Trip> createTrip({
    required String title,
    required String currency,
    required String ownerUid,
    String iconName = 'luggage',
  }) async {
    final tripRef = _firestore.collection('trips').doc();
    final inviteCode = await _generateUniqueInviteCode();
    final now = DateTime.now();

    final trip = Trip(
      id: tripRef.id,
      title: title,
      currency: currency,
      ownerUid: ownerUid,
      iconName: iconName,
      inviteCode: inviteCode,
      inviteCodeActive: true,
      inviteCodeCreatedAt: now,
      inviteCodeExpiresAt: now.add(const Duration(days: 7)),
      createdAt: now,
    );

    await tripRef.set(trip.toFirestore());

    // Add owner as first member (name comes from their profile)
    await addMember(tripId: trip.id, uid: ownerUid);

    return trip;
  }

  /// Gets a trip by ID.
  Future<Trip?> getTrip(String tripId) async {
    final doc = await _firestore.collection('trips').doc(tripId).get();
    if (!doc.exists) return null;
    return Trip.fromFirestore(doc);
  }

  /// Gets a trip by invite code (for joining).
  /// Returns null if code is invalid, expired, or deactivated.
  Future<Trip?> getTripByInviteCode(String code) async {
    // Query for trips with this invite code that are active
    final snapshot = await _firestore
        .collection('trips')
        .where('inviteCode', isEqualTo: code)
        .where('inviteCodeActive', isEqualTo: true)
        .limit(1)
        .get();

    if (snapshot.docs.isEmpty) return null;

    final trip = Trip.fromFirestore(snapshot.docs.first);

    // Check if code has expired
    if (!trip.isInviteCodeValid) return null;

    return trip;
  }

  /// Regenerates the invite code for a trip (owner only).
  Future<Trip> regenerateInviteCode(String tripId) async {
    final newCode = await _generateUniqueInviteCode();
    final now = DateTime.now();

    await _firestore.collection('trips').doc(tripId).update({
      'inviteCode': newCode,
      'inviteCodeActive': true,
      'inviteCodeCreatedAt': Timestamp.fromDate(now),
      'inviteCodeExpiresAt': Timestamp.fromDate(
        now.add(const Duration(days: 7)),
      ),
    });

    final doc = await _firestore.collection('trips').doc(tripId).get();
    return Trip.fromFirestore(doc);
  }

  /// Deactivates the invite code for a trip (owner only).
  Future<void> deactivateInviteCode(String tripId) async {
    await _firestore.collection('trips').doc(tripId).update({
      'inviteCodeActive': false,
    });
  }

  /// Gets all trips where user is a member (non-streaming, for refresh).
  Future<List<Trip>> getUserTrips(String uid) async {
    final trips = <Trip>[];

    // Get trips where user is owner
    final ownerTrips = await _firestore
        .collection('trips')
        .where('ownerUid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .get();

    for (final doc in ownerTrips.docs) {
      trips.add(Trip.fromFirestore(doc));
    }

    // Also check all trips for membership
    final allTrips = await _firestore.collection('trips').get();
    for (final tripDoc in allTrips.docs) {
      if (trips.any((t) => t.id == tripDoc.id)) continue;

      final memberQuery = await _firestore
          .collection('trips')
          .doc(tripDoc.id)
          .collection('members')
          .where('uid', isEqualTo: uid)
          .limit(1)
          .get();

      if (memberQuery.docs.isNotEmpty) {
        trips.add(Trip.fromFirestore(tripDoc));
      }
    }

    trips.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return trips;
  }

  /// Stream of trips where user is owner (for real-time updates).
  Stream<List<Trip>> watchUserOwnedTrips(String uid) {
    return _firestore
        .collection('trips')
        .where('ownerUid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map(Trip.fromFirestore).toList());
  }

  /// Stream of all trips where user is owner OR member (for real-time updates).
  Stream<List<Trip>> watchUserTrips(String uid) async* {
    // Watch owned trips
    final ownedStream = _firestore
        .collection('trips')
        .where('ownerUid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .snapshots();

    // Watch all trips and filter by membership
    final allTripsStream = _firestore
        .collection('trips')
        .orderBy('createdAt', descending: true)
        .snapshots();

    await for (final allTripsSnapshot in allTripsStream) {
      final trips = <Trip>[];
      final tripIds = <String>{};

      // First, add all owned trips
      for (final doc in allTripsSnapshot.docs) {
        final trip = Trip.fromFirestore(doc);
        if (trip.ownerUid == uid) {
          trips.add(trip);
          tripIds.add(trip.id);
        }
      }

      // Then, check membership for non-owned trips
      for (final doc in allTripsSnapshot.docs) {
        final trip = Trip.fromFirestore(doc);
        if (!tripIds.contains(trip.id)) {
          final memberQuery = await _firestore
              .collection('trips')
              .doc(trip.id)
              .collection('members')
              .where('uid', isEqualTo: uid)
              .limit(1)
              .get();

          if (memberQuery.docs.isNotEmpty) {
            trips.add(trip);
            tripIds.add(trip.id);
          }
        }
      }

      // Sort by creation date
      trips.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      yield trips;
    }
  }

  /// Stream of a single trip.
  Stream<Trip?> watchTrip(String tripId) {
    return _firestore.collection('trips').doc(tripId).snapshots().map((doc) {
      if (!doc.exists) return null;
      return Trip.fromFirestore(doc);
    });
  }

  /// Updates a trip's title.
  Future<void> updateTripTitle(String tripId, String title) async {
    await _firestore.collection('trips').doc(tripId).update({'title': title});
  }

  /// Deletes a trip and all its subcollections.
  Future<void> deleteTrip(String tripId) async {
    final tripRef = _firestore.collection('trips').doc(tripId);

    // Delete all members
    final members = await tripRef.collection('members').get();
    for (final doc in members.docs) {
      await doc.reference.delete();
    }

    // Delete all expenses
    final expenses = await tripRef.collection('expenses').get();
    for (final doc in expenses.docs) {
      await doc.reference.delete();
    }

    // Delete the trip
    await tripRef.delete();
  }

  // ============================================================
  // MEMBERS
  // ============================================================

  /// Adds a member to a trip.
  ///
  /// For linked members (with uid), don't pass manualName - their name
  /// comes from their UserProfile.
  ///
  /// For manual members (without uid), pass manualName.
  Future<Member> addMember({
    required String tripId,
    String? uid,
    String? manualName,
  }) async {
    final memberRef = _firestore
        .collection('trips')
        .doc(tripId)
        .collection('members')
        .doc();
    final now = DateTime.now();

    final member = Member(
      id: memberRef.id,
      uid: uid,
      manualName: manualName,
      createdAt: now,
    );

    await memberRef.set(member.toFirestore());
    return member;
  }

  /// Gets all members of a trip.
  Future<List<Member>> getMembers(String tripId) async {
    final snapshot = await _firestore
        .collection('trips')
        .doc(tripId)
        .collection('members')
        .orderBy('createdAt')
        .get();

    return snapshot.docs.map(Member.fromFirestore).toList();
  }

  /// Stream of members for a trip.
  Stream<List<Member>> watchMembers(String tripId) {
    return _firestore
        .collection('trips')
        .doc(tripId)
        .collection('members')
        .orderBy('createdAt')
        .snapshots()
        .map((snapshot) => snapshot.docs.map(Member.fromFirestore).toList());
  }

  /// Gets the member associated with a specific UID.
  Future<Member?> getMemberByUid(String tripId, String uid) async {
    final snapshot = await _firestore
        .collection('trips')
        .doc(tripId)
        .collection('members')
        .where('uid', isEqualTo: uid)
        .limit(1)
        .get();

    if (snapshot.docs.isEmpty) return null;
    return Member.fromFirestore(snapshot.docs.first);
  }

  /// Updates a member's name.
  Future<void> updateMemberName(
    String tripId,
    String memberId,
    String name,
  ) async {
    await _firestore
        .collection('trips')
        .doc(tripId)
        .collection('members')
        .doc(memberId)
        .update({'name': name});
  }

  /// Deletes a member from a trip.
  Future<void> deleteMember(String tripId, String memberId) async {
    await _firestore
        .collection('trips')
        .doc(tripId)
        .collection('members')
        .doc(memberId)
        .delete();
  }

  /// Checks if a user is already a member of a trip.
  Future<bool> isUserMember(String tripId, String uid) async {
    final member = await getMemberByUid(tripId, uid);
    return member != null;
  }

  // ============================================================
  // EXPENSES
  // ============================================================

  /// Creates a new expense.
  Future<Expense> createExpense({
    required String tripId,
    required int amountCents,
    required String description,
    required String payerMemberId,
    required List<String> participantMemberIds,
    required String createdByUid,
  }) async {
    final expenseRef = _firestore
        .collection('trips')
        .doc(tripId)
        .collection('expenses')
        .doc();
    final now = DateTime.now();

    final expense = Expense(
      id: expenseRef.id,
      amountCents: amountCents,
      description: description,
      payerMemberId: payerMemberId,
      participantMemberIds: participantMemberIds,
      createdByUid: createdByUid,
      createdAt: now,
    );

    await expenseRef.set(expense.toFirestore());
    return expense;
  }

  /// Gets all expenses for a trip.
  Future<List<Expense>> getExpenses(String tripId) async {
    final snapshot = await _firestore
        .collection('trips')
        .doc(tripId)
        .collection('expenses')
        .orderBy('createdAt', descending: true)
        .get();

    return snapshot.docs.map(Expense.fromFirestore).toList();
  }

  /// Stream of expenses for a trip.
  Stream<List<Expense>> watchExpenses(String tripId) {
    return _firestore
        .collection('trips')
        .doc(tripId)
        .collection('expenses')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map(Expense.fromFirestore).toList());
  }

  /// Updates an expense.
  Future<void> updateExpense({
    required String tripId,
    required String expenseId,
    int? amountCents,
    String? description,
    String? payerMemberId,
    List<String>? participantMemberIds,
  }) async {
    final updates = <String, dynamic>{};
    if (amountCents != null) updates['amount_cents'] = amountCents;
    if (description != null) updates['description'] = description;
    if (payerMemberId != null) updates['payer_member_id'] = payerMemberId;
    if (participantMemberIds != null) {
      updates['participant_member_ids'] = participantMemberIds;
    }

    if (updates.isNotEmpty) {
      await _firestore
          .collection('trips')
          .doc(tripId)
          .collection('expenses')
          .doc(expenseId)
          .update(updates);
    }
  }

  /// Deletes an expense.
  Future<void> deleteExpense(String tripId, String expenseId) async {
    await _firestore
        .collection('trips')
        .doc(tripId)
        .collection('expenses')
        .doc(expenseId)
        .delete();
  }
}
