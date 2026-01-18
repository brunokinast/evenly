import 'package:cloud_firestore/cloud_firestore.dart';

/// Represents an expense in a trip.
/// Amount is stored in cents to avoid floating point issues.
class Expense {
  final String id;
  final int amountCents;
  final String description;
  final String payerMemberId;
  final List<String> participantMemberIds;
  final String createdByUid;
  final DateTime createdAt;

  const Expense({
    required this.id,
    required this.amountCents,
    required this.description,
    required this.payerMemberId,
    required this.participantMemberIds,
    required this.createdByUid,
    required this.createdAt,
  });

  /// Amount in the trip's currency (e.g., 30.00 for 3000 cents)
  double get amount => amountCents / 100;

  factory Expense.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Expense(
      id: doc.id,
      amountCents: data['amount_cents'] as int,
      description: data['description'] as String,
      payerMemberId: data['payer_member_id'] as String,
      participantMemberIds: List<String>.from(
        data['participant_member_ids'] as List,
      ),
      createdByUid: data['createdByUid'] as String,
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'amount_cents': amountCents,
      'description': description,
      'payer_member_id': payerMemberId,
      'participant_member_ids': participantMemberIds,
      'createdByUid': createdByUid,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  Expense copyWith({
    String? id,
    int? amountCents,
    String? description,
    String? payerMemberId,
    List<String>? participantMemberIds,
    String? createdByUid,
    DateTime? createdAt,
  }) {
    return Expense(
      id: id ?? this.id,
      amountCents: amountCents ?? this.amountCents,
      description: description ?? this.description,
      payerMemberId: payerMemberId ?? this.payerMemberId,
      participantMemberIds: participantMemberIds ?? this.participantMemberIds,
      createdByUid: createdByUid ?? this.createdByUid,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Expense &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          amountCents == other.amountCents &&
          description == other.description &&
          payerMemberId == other.payerMemberId;

  @override
  int get hashCode =>
      id.hashCode ^
      amountCents.hashCode ^
      description.hashCode ^
      payerMemberId.hashCode;

  @override
  String toString() =>
      'Expense(id: $id, amount: $amount, description: $description, payer: $payerMemberId)';
}
