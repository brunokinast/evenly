import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/services.dart';
import 'trip_providers.dart';

/// Provider for the BalanceCalculator.
final balanceCalculatorProvider = Provider<BalanceCalculator>((ref) {
  return const BalanceCalculator();
});

/// Provider for calculated balances of a trip.
final balanceResultProvider =
    Provider.family<BalanceResult?, String>((ref, tripId) {
  final expenses = ref.watch(expensesProvider(tripId)).valueOrNull;
  final members = ref.watch(membersProvider(tripId)).valueOrNull;

  if (expenses == null || members == null) return null;

  final calculator = ref.watch(balanceCalculatorProvider);
  return calculator.calculate(expenses, members);
});

/// Provider for getting a member's balance in a trip.
final memberBalanceProvider =
    Provider.family<int, ({String tripId, String memberId})>((ref, params) {
  final result = ref.watch(balanceResultProvider(params.tripId));
  return result?.balances[params.memberId] ?? 0;
});
