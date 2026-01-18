/// Represents a suggested transfer to settle balances.
class Transfer {
  final String fromMemberId;
  final String toMemberId;
  final int amountCents;

  const Transfer({
    required this.fromMemberId,
    required this.toMemberId,
    required this.amountCents,
  });

  /// Amount in the trip's currency (e.g., 30.00 for 3000 cents)
  double get amount => amountCents / 100;

  Map<String, dynamic> toJson() {
    return {
      'from': fromMemberId,
      'to': toMemberId,
      'amount_cents': amountCents,
    };
  }

  factory Transfer.fromJson(Map<String, dynamic> json) {
    return Transfer(
      fromMemberId: json['from'] as String,
      toMemberId: json['to'] as String,
      amountCents: json['amount_cents'] as int,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Transfer &&
          runtimeType == other.runtimeType &&
          fromMemberId == other.fromMemberId &&
          toMemberId == other.toMemberId &&
          amountCents == other.amountCents;

  @override
  int get hashCode =>
      fromMemberId.hashCode ^ toMemberId.hashCode ^ amountCents.hashCode;

  @override
  String toString() =>
      'Transfer(from: $fromMemberId, to: $toMemberId, amount: $amount)';
}
