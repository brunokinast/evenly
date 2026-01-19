import '../models/models.dart';

/// Result of balance calculations containing balances and suggested transfers.
class BalanceResult {
  /// Map of memberId to their balance in cents.
  /// Positive = should receive money, Negative = owes money.
  final Map<String, int> balances;

  /// List of suggested transfers to settle all balances.
  final List<Transfer> transfers;

  /// Total amount spent on the trip in cents.
  final int totalSpentCents;

  const BalanceResult({
    required this.balances,
    required this.transfers,
    required this.totalSpentCents,
  });

  /// Total amount spent in currency units.
  double get totalSpent => totalSpentCents / 100;
}

/// Service for calculating balances and suggesting settlements.
class BalanceCalculator {
  const BalanceCalculator();

  /// Calculates balances and suggested transfers from a list of expenses.
  BalanceResult calculate(List<Expense> expenses, List<Member> members) {
    // Initialize balances for all members
    final balances = <String, int>{for (final member in members) member.id: 0};

    int totalSpent = 0;

    // Process each expense
    for (final expense in expenses) {
      totalSpent += expense.amountCents;

      final numParticipants = expense.participantMemberIds.length;
      if (numParticipants == 0) continue;

      // Calculate equal share per participant
      final sharePerPerson = expense.amountCents ~/ numParticipants;
      final remainder = expense.amountCents % numParticipants;

      // Credit the payer with the full amount
      balances[expense.payerMemberId] =
          (balances[expense.payerMemberId] ?? 0) + expense.amountCents;

      // Debit each participant their share
      for (final participantId in expense.participantMemberIds) {
        int share = sharePerPerson;

        // If payer is a participant, they absorb the remainder
        if (participantId == expense.payerMemberId && remainder > 0) {
          share += remainder;
        }

        balances[participantId] = (balances[participantId] ?? 0) - share;
      }

      // If payer is NOT a participant, we need to handle the remainder
      // In this case, the first participant gets the extra cents
      if (!expense.participantMemberIds.contains(expense.payerMemberId) &&
          remainder > 0 &&
          expense.participantMemberIds.isNotEmpty) {
        final firstParticipant = expense.participantMemberIds.first;
        balances[firstParticipant] =
            (balances[firstParticipant] ?? 0) - remainder;
      }
    }

    // Calculate suggested transfers using greedy algorithm
    final transfers = _calculateTransfers(Map.from(balances));

    return BalanceResult(
      balances: balances,
      transfers: transfers,
      totalSpentCents: totalSpent,
    );
  }

  /// Uses a greedy algorithm to minimize the number of transfers.
  List<Transfer> _calculateTransfers(Map<String, int> balances) {
    final transfers = <Transfer>[];

    // Separate into creditors (positive balance) and debtors (negative balance)
    final creditors = <MapEntry<String, int>>[];
    final debtors = <MapEntry<String, int>>[];

    for (final entry in balances.entries) {
      if (entry.value > 0) {
        creditors.add(entry);
      } else if (entry.value < 0) {
        debtors.add(MapEntry(entry.key, -entry.value)); // Store as positive
      }
    }

    // Sort by amount (descending) for more efficient matching
    creditors.sort((a, b) => b.value.compareTo(a.value));
    debtors.sort((a, b) => b.value.compareTo(a.value));

    // Create mutable copies
    final creditorBalances = {for (final e in creditors) e.key: e.value};
    final debtorBalances = {for (final e in debtors) e.key: e.value};

    // Greedy matching
    while (creditorBalances.isNotEmpty && debtorBalances.isNotEmpty) {
      // Find the creditor and debtor with highest amounts
      final creditorId = creditorBalances.entries
          .reduce((a, b) => a.value >= b.value ? a : b)
          .key;
      final debtorId = debtorBalances.entries
          .reduce((a, b) => a.value >= b.value ? a : b)
          .key;

      final creditorAmount = creditorBalances[creditorId]!;
      final debtorAmount = debtorBalances[debtorId]!;

      // Transfer the minimum of the two amounts
      final transferAmount = creditorAmount < debtorAmount
          ? creditorAmount
          : debtorAmount;

      if (transferAmount > 0) {
        transfers.add(
          Transfer(
            fromMemberId: debtorId,
            toMemberId: creditorId,
            amountCents: transferAmount,
          ),
        );
      }

      // Update balances
      creditorBalances[creditorId] = creditorAmount - transferAmount;
      debtorBalances[debtorId] = debtorAmount - transferAmount;

      // Remove settled accounts
      if (creditorBalances[creditorId] == 0) {
        creditorBalances.remove(creditorId);
      }
      if (debtorBalances[debtorId] == 0) {
        debtorBalances.remove(debtorId);
      }
    }

    return transfers;
  }

  /// Currency symbol mapping.
  static const _currencySymbols = {
    'BRL': 'R\$',
    'USD': '\$',
    'EUR': '€',
    'GBP': '£',
  };

  /// Currency locale mapping for number formatting.
  static const _currencyLocales = {
    'BRL': 'pt_BR',
    'USD': 'en_US',
    'EUR': 'de_DE',
    'GBP': 'en_GB',
  };

  /// Gets the currency symbol for a currency code.
  static String getCurrencySymbol(String currency) {
    return _currencySymbols[currency] ?? currency;
  }

  /// Formats an amount in cents as a currency string with proper locale formatting.
  static String formatAmount(int cents, String currency) {
    final amount = cents / 100;
    final symbol = _currencySymbols[currency] ?? currency;
    final locale = _currencyLocales[currency] ?? 'en_US';
    
    // Format number according to locale
    final formatted = _formatNumber(amount, locale);
    return '$symbol $formatted';
  }

  /// Formats a number according to the given locale.
  static String _formatNumber(double value, String locale) {
    // Brazilian Portuguese uses dot for thousands, comma for decimals
    if (locale == 'pt_BR') {
      final parts = value.toStringAsFixed(2).split('.');
      final intPart = parts[0];
      final decPart = parts[1];
      
      // Add thousand separators (dots)
      final buffer = StringBuffer();
      for (var i = 0; i < intPart.length; i++) {
        if (i > 0 && (intPart.length - i) % 3 == 0) {
          buffer.write('.');
        }
        buffer.write(intPart[i]);
      }
      return '${buffer.toString()},$decPart';
    }
    
    // Default: US/UK format (comma for thousands, dot for decimals)
    final parts = value.toStringAsFixed(2).split('.');
    final intPart = parts[0];
    final decPart = parts[1];
    
    // Add thousand separators (commas)
    final buffer = StringBuffer();
    for (var i = 0; i < intPart.length; i++) {
      if (i > 0 && (intPart.length - i) % 3 == 0) {
        buffer.write(',');
      }
      buffer.write(intPart[i]);
    }
    return '${buffer.toString()}.$decPart';
  }

  /// Formats an amount in cents with sign (+ or -).
  static String formatBalanceWithSign(int cents, String currency) {
    final amount = cents.abs() / 100;
    final symbol = _currencySymbols[currency] ?? currency;
    final locale = _currencyLocales[currency] ?? 'en_US';
    final sign = cents >= 0 ? '+' : '-';
    final formatted = _formatNumber(amount, locale);
    return '$sign $symbol $formatted';
  }
}
