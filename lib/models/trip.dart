import 'package:cloud_firestore/cloud_firestore.dart';

/// Represents a trip that contains members and expenses.
class Trip {
  final String id;
  final String title;
  final String currency;
  final String ownerUid;
  final String iconName; // Icon name from predefined set
  final String inviteCode;
  final bool inviteCodeActive;
  final DateTime inviteCodeCreatedAt;
  final DateTime? inviteCodeExpiresAt;
  final DateTime createdAt;

  const Trip({
    required this.id,
    required this.title,
    required this.currency,
    required this.ownerUid,
    this.iconName = 'luggage',
    required this.inviteCode,
    required this.inviteCodeActive,
    required this.inviteCodeCreatedAt,
    this.inviteCodeExpiresAt,
    required this.createdAt,
  });

  factory Trip.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Trip(
      id: doc.id,
      title: data['title'] as String,
      currency: data['currency'] as String,
      ownerUid: data['ownerUid'] as String,
      iconName: data['iconName'] as String? ?? 'luggage',
      inviteCode: data['inviteCode'] as String,
      inviteCodeActive: data['inviteCodeActive'] as bool? ?? true,
      inviteCodeCreatedAt: (data['inviteCodeCreatedAt'] as Timestamp).toDate(),
      inviteCodeExpiresAt: data['inviteCodeExpiresAt'] != null
          ? (data['inviteCodeExpiresAt'] as Timestamp).toDate()
          : null,
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'title': title,
      'currency': currency,
      'ownerUid': ownerUid,
      'iconName': iconName,
      'inviteCode': inviteCode,
      'inviteCodeActive': inviteCodeActive,
      'inviteCodeCreatedAt': Timestamp.fromDate(inviteCodeCreatedAt),
      'inviteCodeExpiresAt': inviteCodeExpiresAt != null
          ? Timestamp.fromDate(inviteCodeExpiresAt!)
          : null,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  Trip copyWith({
    String? id,
    String? title,
    String? currency,
    String? ownerUid,
    String? iconName,
    String? inviteCode,
    bool? inviteCodeActive,
    DateTime? inviteCodeCreatedAt,
    DateTime? inviteCodeExpiresAt,
    DateTime? createdAt,
  }) {
    return Trip(
      id: id ?? this.id,
      title: title ?? this.title,
      currency: currency ?? this.currency,
      ownerUid: ownerUid ?? this.ownerUid,
      iconName: iconName ?? this.iconName,
      inviteCode: inviteCode ?? this.inviteCode,
      inviteCodeActive: inviteCodeActive ?? this.inviteCodeActive,
      inviteCodeCreatedAt: inviteCodeCreatedAt ?? this.inviteCodeCreatedAt,
      inviteCodeExpiresAt: inviteCodeExpiresAt ?? this.inviteCodeExpiresAt,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// Returns true if the invite code is valid (active and not expired).
  bool get isInviteCodeValid {
    if (!inviteCodeActive) return false;
    if (inviteCodeExpiresAt == null) return true;
    return DateTime.now().isBefore(inviteCodeExpiresAt!);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Trip &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          title == other.title &&
          currency == other.currency &&
          ownerUid == other.ownerUid;

  @override
  int get hashCode =>
      id.hashCode ^ title.hashCode ^ currency.hashCode ^ ownerUid.hashCode;

  @override
  String toString() =>
      'Trip(id: $id, title: $title, currency: $currency, owner: $ownerUid)';
}
