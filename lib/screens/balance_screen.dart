import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../services/services.dart';
import '../theme/widgets.dart';
import '../utils/context_extensions.dart';

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
      body: SafeArea(
        child: ContentContainer(
          child: tripAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) =>
                Center(child: Text('${l10n.error}: $error')),
            data: (trip) {
              if (trip == null) {
                return EmptyState(
                  icon: Icons.error_outline_rounded,
                  title: l10n.error,
                  subtitle: l10n.tripNotFound,
                );
              }

              if (balanceResult == null) {
                return const Center(child: CircularProgressIndicator());
              }

              final rawMemberNames = memberNamesAsync.value ?? {};
              final memberNames = <String, String>{};
              for (final entry in rawMemberNames.entries) {
                memberNames[entry.key] = localizeMemberName(
                  entry.value,
                  l10n.youIndicator,
                  l10n.manualIndicator,
                );
              }

              return CustomScrollView(
                slivers: [
                  // Header
                  SliverToBoxAdapter(child: _buildHeader(context, l10n, ref)),

                  // Total Summary Card
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                      child: _TotalCard(
                        totalCents: balanceResult.totalSpentCents,
                        currency: trip.currency,
                        expenseCount: expensesAsync.value?.length ?? 0,
                        memberCount: memberNames.length,
                        l10n: l10n,
                      ),
                    ),
                  ),

                  // Individual Balances Section
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
                      child: SectionHeader(title: l10n.individualBalances),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                      child: _BalancesList(
                        balances: balanceResult.balances,
                        memberNames: memberNames,
                        currency: trip.currency,
                        l10n: l10n,
                      ),
                    ),
                  ),

                  // Settlements Section
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
                      child: SectionHeader(title: l10n.suggestedSettlements),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                      child: _SettlementsList(
                        transfers: balanceResult.transfers,
                        memberNames: memberNames,
                        currency: trip.currency,
                        l10n: l10n,
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(
    BuildContext context,
    AppLocalizations l10n,
    WidgetRef ref,
  ) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 16, 8),
      child: Row(
        children: [
          HeaderIconButton(
            icon: Icons.arrow_back_rounded,
            onTap: () => Navigator.pop(context),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              l10n.balanceSummary,
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          HeaderIconButton(
            icon: Icons.picture_as_pdf_rounded,
            onTap: () => _exportPdf(context, ref, l10n),
          ),
        ],
      ),
    );
  }

  Future<void> _exportPdf(
    BuildContext context,
    WidgetRef ref,
    AppLocalizations l10n,
  ) async {
    try {
      final trip = ref.read(tripProvider(tripId)).value;
      final members = ref.read(membersProvider(tripId)).value;
      final rawMemberNames = ref.read(memberNamesProvider(tripId)).value;
      final expenses = ref.read(expensesProvider(tripId)).value;
      final balanceResult = ref.read(balanceResultProvider(tripId));

      if (trip == null ||
          members == null ||
          rawMemberNames == null ||
          expenses == null ||
          balanceResult == null) {
        context.showInfoSnackBar(l10n.dataNotReady);
        return;
      }

      final memberNames = <String, String>{};
      for (final entry in rawMemberNames.entries) {
        memberNames[entry.key] = localizeMemberName(
          entry.value,
          l10n.youIndicator,
          l10n.manualIndicator,
        );
      }

      final pdfExporter = ref.read(pdfExporterProvider);

      final pdfStrings = PdfStrings(
        membersCount: l10n.membersCount(0).replaceAll('0', '{count}'),
        expensesCount: l10n.expensesCount(0).replaceAll('0', '{count}'),
        created: l10n.pdfCreated('{date}'),
        currency: l10n.pdfCurrency('{currency}'),
        description: l10n.pdfDescription,
        paidBy: l10n.pdfPaidBy,
        amount: l10n.pdfAmount,
        totalSpent: l10n.totalSpent,
        finalBalances: l10n.pdfFinalBalances,
        suggestedSettlements: l10n.suggestedSettlements,
        allSettled: l10n.allSettled,
        unknown: l10n.unknown,
      );

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
        strings: pdfStrings,
      );

      if (context.mounted) Navigator.pop(context);

      final filename =
          '${trip.title.replaceAll(RegExp(r'[^\w\s]'), '').replaceAll(' ', '_')}_summary.pdf';
      await pdfExporter.sharePdf(pdfBytes, filename);
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        context.showErrorSnackBar(l10n.failedToExportPdf(e.toString()));
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

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colorScheme.primary,
            colorScheme.primary.withValues(alpha: 0.85),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          Text(
            l10n.totalSpent,
            style: TextStyle(
              color: colorScheme.onPrimary.withValues(alpha: 0.8),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            BalanceCalculator.formatAmount(totalCents, currency),
            style: TextStyle(
              color: colorScheme.onPrimary,
              fontSize: 36,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: colorScheme.onPrimary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _StatItem(
                  icon: Icons.receipt_long_rounded,
                  label: l10n.expensesCountStat(expenseCount),
                  color: colorScheme.onPrimary,
                ),
                Container(
                  width: 1,
                  height: 24,
                  color: colorScheme.onPrimary.withValues(alpha: 0.3),
                ),
                _StatItem(
                  icon: Icons.people_rounded,
                  label: l10n.membersCountStat(memberCount),
                  color: colorScheme.onPrimary,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _StatItem({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: color.withValues(alpha: 0.8)),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: color.withValues(alpha: 0.9),
          ),
        ),
      ],
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
    final colorScheme = Theme.of(context).colorScheme;
    final sortedEntries = balances.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        children: sortedEntries.asMap().entries.map((entry) {
          final index = entry.key;
          final balanceEntry = entry.value;
          final memberName = memberNames[balanceEntry.key] ?? l10n.unknown;
          final balance = balanceEntry.value;
          final memberId = balanceEntry.key;
          final isPositive = balance > 0;
          final isNegative = balance < 0;
          final isLast = index == sortedEntries.length - 1;

          Color statusColor;
          IconData statusIcon;
          String statusText;

          if (isPositive) {
            statusColor = const Color(0xFF10B981);
            statusIcon = Icons.arrow_downward_rounded;
            statusText = l10n.getsBackLabel;
          } else if (isNegative) {
            statusColor = colorScheme.error;
            statusIcon = Icons.arrow_upward_rounded;
            statusText = l10n.owesLabel;
          } else {
            statusColor = colorScheme.onSurfaceVariant;
            statusIcon = Icons.check_rounded;
            statusText = l10n.settled;
          }

          return RepaintBoundary(
            key: ValueKey(memberId),
            child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(statusIcon, color: statusColor, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            memberName,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            statusText,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: colorScheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      BalanceCalculator.formatBalanceWithSign(
                        balance,
                        currency,
                      ),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ),
              if (!isLast)
                Divider(
                  height: 1,
                  indent: 74,
                  color: colorScheme.outlineVariant.withValues(alpha: 0.5),
                ),
            ],
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
    final colorScheme = Theme.of(context).colorScheme;

    if (transfers.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: const Color(0xFF10B981).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: const Color(0xFF10B981).withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF10B981),
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Flexible(
              child: Text(
                l10n.allSettled,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF10B981),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        children: transfers.asMap().entries.map((entry) {
          final index = entry.key;
          final transfer = entry.value;
          final from = memberNames[transfer.fromMemberId] ?? l10n.unknown;
          final to = memberNames[transfer.toMemberId] ?? l10n.unknown;
          final isLast = index == transfers.length - 1;

          return RepaintBoundary(
            key: ValueKey('${transfer.fromMemberId}_${transfer.toMemberId}'),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            UserAvatar(name: from, size: 36),
                            const SizedBox(width: 10),
                            Flexible(
                              child: Text(
                                from,
                                style: Theme.of(context).textTheme.titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              child: Icon(
                                Icons.arrow_forward_rounded,
                                size: 18,
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                            Flexible(
                              child: Text(
                                to,
                                style: Theme.of(context).textTheme.titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      AmountBadge(
                        amount: BalanceCalculator.formatAmount(
                          transfer.amountCents,
                          currency,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!isLast)
                  Divider(
                    height: 1,
                    color: colorScheme.outlineVariant.withValues(alpha: 0.5),
                  ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
