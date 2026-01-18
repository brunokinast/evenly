import 'package:cloud_firestore/cloud_firestore.dart';

/// Represents a member of a trip.
/// 
/// Members with a [uid] are linked to user accounts - their display name
/// comes from their UserProfile, not stored here.
/// 
/// Members without a [uid] are manually added (for people without the app)
/// and their name is stored in [manualName].
class Member {
  final String id;
  final String? uid;
  /// Name for manually-added members only (those without uid).
  /// For members with uid, look up their name from UserProfile.
  final String? manualName;
  final DateTime createdAt;

  const Member({
    required this.id,
    this.uid,
    this.manualName,
    required this.createdAt,
  });

  /// Whether this member is linked to a user account.
  bool get isLinked => uid != null;

  factory Member.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Member(
      id: doc.id,
      uid: data['uid'] as String?,
      manualName: data['manualName'] as String?,
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      if (uid != null) 'uid': uid,
      if (manualName != null) 'manualName': manualName,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  Member copyWith({
    String? id,
    String? uid,
    String? manualName,
    DateTime? createdAt,
  }) {
    return Member(
      id: id ?? this.id,
      uid: uid ?? this.uid,
      manualName: manualName ?? this.manualName,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Member &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          uid == other.uid;

  @override
  int get hashCode => id.hashCode ^ uid.hashCode;

  @override
  String toString() => 'Member(id: $id, uid: $uid, manualName: $manualName)';
}
