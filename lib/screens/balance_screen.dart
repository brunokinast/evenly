import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../services/services.dart';

/// Screen showing balance summary and suggested settlements.
class BalanceScreen extends ConsumerWidget {
  final String tripId;

  const BalanceScreen({super.key, required this.tripId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final tripAsync = ref.watch(tripProvider(tripId));
    final memberNamesAsync = ref.watch(memberNamesProvider(tripId));
    final expensesAsync = ref.watch(expensesProvider(tripId));
    final balanceResult = ref.watch(balanceResultProvider(tripId));

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.balanceSummary),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf),
            tooltip: l10n.exportPdf,
            onPressed: () => _exportPdf(context, ref, l10n),
          ),
        ],
      ),
      body: tripAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('${l10n.error}: $error')),
        data: (trip) {
          if (trip == null) {
            return Center(child: Text(l10n.tripNotFound));
          }

          if (balanceResult == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final memberNames = memberNamesAsync.valueOrNull ?? {};

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Total Summary
              _TotalCard(
                totalCents: balanceResult.totalSpentCents,
                currency: trip.currency,
                expenseCount: expensesAsync.valueOrNull?.length ?? 0,
                memberCount: memberNames.length,
                l10n: l10n,
              ),
              const SizedBox(height: 24),

              // Individual Balances
              _SectionHeader(title: l10n.individualBalances),
              const SizedBox(height: 8),
              _BalancesList(
                balances: balanceResult.balances,
                memberNames: memberNames,
                currency: trip.currency,
                l10n: l10n,
              ),
              const SizedBox(height: 24),

              // Settlements
              _SectionHeader(title: l10n.suggestedSettlements),
              const SizedBox(height: 8),
              _SettlementsList(
                transfers: balanceResult.transfers,
                memberNames: memberNames,
                currency: trip.currency,
                l10n: l10n,
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _exportPdf(BuildContext context, WidgetRef ref, AppLocalizations l10n) async {
    try {
      final trip = ref.read(tripProvider(tripId)).valueOrNull;
      final members = ref.read(membersProvider(tripId)).valueOrNull;
      final memberNames = ref.read(memberNamesProvider(tripId)).valueOrNull;
      final expenses = ref.read(expensesProvider(tripId)).valueOrNull;
      final balanceResult = ref.read(balanceResultProvider(tripId));

      if (trip == null ||
          members == null ||
          memberNames == null ||
          expenses == null ||
          balanceResult == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.dataNotReady)),
        );
        return;
      }

      final pdfExporter = ref.read(pdfExporterProvider);

      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      final pdfBytes = await pdfExporter.generateTripSummary(
        trip: trip,
        members: members,
        memberNames: memberNames,
        expenses: expenses,
        balanceResult: balanceResult,
      );

      // Hide loading indicator
      if (context.mounted) {
        Navigator.pop(context);
      }

      // Show share dialog
      final filename =
          '${trip.title.replaceAll(RegExp(r'[^\w\s]'), '').replaceAll(' ', '_')}_summary.pdf';
      await pdfExporter.sharePdf(pdfBytes, filename);
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Hide loading if still showing
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.failedToExportPdf(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

class _TotalCard extends StatelessWidget {
  final int totalCents;
  final String currency;
  final int expenseCount;
  final int memberCount;
  final AppLocalizations l10n;

  const _TotalCard({
    required this.totalCents,
    required this.currency,
    required this.expenseCount,
    required this.memberCount,
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      color: colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Text(
              l10n.totalSpent,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: colorScheme.onPrimaryContainer,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              BalanceCalculator.formatAmount(totalCents, currency),
              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onPrimaryContainer,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _StatChip(
                  icon: Icons.receipt_long,
                  label: l10n.expensesCountStat(expenseCount),
                ),
                _StatChip(
                  icon: Icons.people,
                  label: l10n.membersCountStat(memberCount),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _StatChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: Theme.of(context).colorScheme.onPrimaryContainer),
        const SizedBox(width: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
    );
  }
}

class _BalancesList extends StatelessWidget {
  final Map<String, int> balances;
  final Map<String, String> memberNames;
  final String currency;
  final AppLocalizations l10n;

  const _BalancesList({
    required this.balances,
    required this.memberNames,
    required this.currency,
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    final sortedEntries = balances.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Card(
      child: Column(
        children: sortedEntries.map((entry) {
          final memberName = memberNames[entry.key] ?? l10n.unknown;
          final balance = entry.value;
          final isPositive = balance > 0;
          final isNegative = balance < 0;

          return ListTile(
            leading: CircleAvatar(
              backgroundColor: isPositive
                  ? Colors.green[100]
                  : (isNegative ? Colors.red[100] : Colors.grey[200]),
              child: Icon(
                isPositive
                    ? Icons.arrow_downward
                    : (isNegative ? Icons.arrow_upward : Icons.check),
                color: isPositive
                    ? Colors.green
                    : (isNegative ? Colors.red : Colors.grey),
              ),
            ),
            title: Text(memberName),
            subtitle: Text(
              isPositive
                  ? l10n.getsBackLabel
                  : (isNegative ? l10n.owesLabel : l10n.settled),
            ),
            trailing: Text(
              BalanceCalculator.formatBalanceWithSign(balance, currency),
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: isPositive
                    ? Colors.green
                    : (isNegative ? Colors.red : Colors.grey),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SettlementsList extends StatelessWidget {
  final List<Transfer> transfers;
  final Map<String, String> memberNames;
  final String currency;
  final AppLocalizations l10n;

  const _SettlementsList({
    required this.transfers,
    required this.memberNames,
    required this.currency,
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    if (transfers.isEmpty) {
      return Card(
        color: Colors.green[50],
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 32),
              const SizedBox(width: 12),
              Flexible(
                child: Text(
                  l10n.allSettled,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.green,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Column(
        children: transfers.asMap().entries.map((entry) {
          final index = entry.key;
          final transfer = entry.value;
          final from = memberNames[transfer.fromMemberId] ?? l10n.unknown;
          final to = memberNames[transfer.toMemberId] ?? l10n.unknown;

          return Column(
            children: [
              if (index > 0) const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                from,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 8),
                                child: Icon(Icons.arrow_forward,
                                    size: 16, color: Colors.grey),
                              ),
                              Text(
                                to,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        BalanceCalculator.formatAmount(
                            transfer.amountCents, currency),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color:
                              Theme.of(context).colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }
}
