import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../services/services.dart';
import 'add_expense_screen.dart';
import 'balance_screen.dart';

/// Screen showing trip details, members, and expenses.
class TripDetailScreen extends ConsumerStatefulWidget {
  final String tripId;

  const TripDetailScreen({super.key, required this.tripId});

  @override
  ConsumerState<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends ConsumerState<TripDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final tripAsync = ref.watch(tripProvider(widget.tripId));
    final isOwner = ref.watch(isTripOwnerProvider(widget.tripId));

    return tripAsync.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, stack) => Scaffold(
        appBar: AppBar(title: Text(l10n.error)),
        body: Center(child: Text('${l10n.error}: $error')),
      ),
      data: (trip) {
        if (trip == null) {
          return Scaffold(
            appBar: AppBar(title: Text(l10n.error)),
            body: Center(child: Text(l10n.unknown)),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(trip.title),
            actions: [
              IconButton(
                icon: const Icon(Icons.pin),
                tooltip: l10n.inviteCode,
                onPressed: () => _showInviteCodeDialog(trip, l10n),
              ),
              PopupMenuButton<String>(
                onSelected: (value) =>
                    _handleMenuAction(value, trip, isOwner, l10n),
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'show_code',
                    child: ListTile(
                      leading: const Icon(Icons.pin),
                      title: Text(l10n.showInviteCode),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  if (isOwner)
                    PopupMenuItem(
                      value: 'add_member',
                      child: ListTile(
                        leading: const Icon(Icons.person_add),
                        title: Text(l10n.addMember),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  if (isOwner)
                    PopupMenuItem(
                      value: 'regenerate_code',
                      child: ListTile(
                        leading: const Icon(Icons.refresh),
                        title: Text(l10n.regenerateCode),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  if (isOwner)
                    PopupMenuItem(
                      value: 'delete_trip',
                      child: ListTile(
                        leading: Icon(
                          Icons.delete,
                          color: Theme.of(context).colorScheme.error,
                        ),
                        title: Text(
                          l10n.deleteTrip,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                ],
              ),
            ],
            bottom: TabBar(
              controller: _tabController,
              tabs: [
                Tab(icon: const Icon(Icons.receipt_long), text: l10n.expenses),
                Tab(icon: const Icon(Icons.people), text: l10n.members),
              ],
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              _ExpensesTab(tripId: widget.tripId, currency: trip.currency),
              _MembersTab(tripId: widget.tripId),
            ],
          ),
          floatingActionButton: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FloatingActionButton.extended(
                heroTag: 'balance',
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => BalanceScreen(tripId: widget.tripId),
                  ),
                ),
                icon: const Icon(Icons.account_balance_wallet),
                label: Text(l10n.balances),
              ),
              const SizedBox(height: 8),
              FloatingActionButton.extended(
                heroTag: 'add_expense',
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => AddExpenseScreen(tripId: widget.tripId),
                  ),
                ),
                icon: const Icon(Icons.add),
                label: Text(l10n.addExpense),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showInviteCodeDialog(Trip trip, AppLocalizations l10n) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.inviteCode),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              l10n.shareCodeInstructions,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            // Large code display
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: SelectableText(
                trip.inviteCode,
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  letterSpacing: 8,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (trip.inviteCodeExpiresAt != null)
              Text(
                l10n.codeExpiresIn(_formatExpiry(trip.inviteCodeExpiresAt!)),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(l10n.close),
          ),
          FilledButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: trip.inviteCode));
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text(l10n.codeCopied)));
              Navigator.pop(dialogContext);
            },
            icon: const Icon(Icons.copy),
            label: Text(l10n.copyCode),
          ),
        ],
      ),
    );
  }

  String _formatExpiry(DateTime expiresAt) {
    final remaining = expiresAt.difference(DateTime.now());
    if (remaining.inDays > 0) {
      return '${remaining.inDays}d';
    } else if (remaining.inHours > 0) {
      return '${remaining.inHours}h';
    } else if (remaining.inMinutes > 0) {
      return '${remaining.inMinutes}m';
    } else {
      return '<1m';
    }
  }

  void _handleMenuAction(
    String action,
    Trip trip,
    bool isOwner,
    AppLocalizations l10n,
  ) {
    switch (action) {
      case 'show_code':
        _showInviteCodeDialog(trip, l10n);
        break;
      case 'add_member':
        _showAddMemberDialog(l10n);
        break;
      case 'regenerate_code':
        if (isOwner) _confirmRegenerateCode(trip, l10n);
        break;
      case 'delete_trip':
        if (isOwner) _confirmDeleteTrip(trip, l10n);
        break;
    }
  }

  void _confirmRegenerateCode(Trip trip, AppLocalizations l10n) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.regenerateCode),
        content: Text(l10n.regenerateCodeConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            onPressed: () async {
              final repository = ref.read(firestoreRepositoryProvider);
              await repository.regenerateInviteCode(trip.id);
              if (dialogContext.mounted) {
                Navigator.pop(dialogContext);
              }
              if (context.mounted) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text(l10n.codeRegenerated)));
              }
            },
            child: Text(l10n.regenerate),
          ),
        ],
      ),
    );
  }

  void _showAddMemberDialog(AppLocalizations l10n) {
    final nameController = TextEditingController();
    String? errorText;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(l10n.addMember),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: InputDecoration(
                  labelText: l10n.memberName,
                  hintText: l10n.enterMemberName,
                  errorText: errorText,
                ),
                textCapitalization: TextCapitalization.words,
                autofocus: true,
                onChanged: (_) {
                  if (errorText != null) {
                    setDialogState(() => errorText = null);
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text(l10n.cancel),
            ),
            FilledButton(
              onPressed: () async {
                final name = nameController.text.trim();
                if (name.isEmpty) {
                  setDialogState(() => errorText = l10n.pleaseEnterMemberName);
                  return;
                }

                // Check for duplicate manual names
                final members =
                    ref.read(membersProvider(widget.tripId)).valueOrNull ?? [];
                final existingManualNames = members
                    .where((m) => m.manualName != null)
                    .map((m) => m.manualName!.toLowerCase())
                    .toSet();

                if (existingManualNames.contains(name.toLowerCase())) {
                  setDialogState(() => errorText = l10n.memberNameExists);
                  return;
                }

                final repository = ref.read(firestoreRepositoryProvider);
                // Manually added member (no uid, just a name)
                await repository.addMember(
                  tripId: widget.tripId,
                  manualName: name,
                );

                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext);
                }
              },
              child: Text(l10n.add),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteTrip(Trip trip, AppLocalizations l10n) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.deleteTrip),
        content: Text(l10n.deleteTripConfirm(trip.title)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              final repository = ref.read(firestoreRepositoryProvider);
              await repository.deleteTrip(trip.id);

              if (dialogContext.mounted) {
                Navigator.pop(dialogContext); // Close dialog
              }
              if (context.mounted) {
                Navigator.pop(context); // Go back to list
              }
            },
            child: Text(l10n.delete),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// EXPENSES TAB
// ============================================================

class _ExpensesTab extends ConsumerWidget {
  final String tripId;
  final String currency;

  const _ExpensesTab({required this.tripId, required this.currency});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final expensesAsync = ref.watch(expensesProvider(tripId));
    final memberNamesAsync = ref.watch(memberNamesProvider(tripId));
    final balanceResult = ref.watch(balanceResultProvider(tripId));

    return expensesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('${l10n.error}: $error')),
      data: (expenses) {
        if (expenses.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.receipt_long,
                    size: 80,
                    color: Theme.of(
                      context,
                    ).colorScheme.primary.withValues(alpha: 0.5),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    l10n.noExpenses,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.addFirstExpense,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        final rawMemberNames = memberNamesAsync.valueOrNull ?? {};

        // Localize member names (replace markers with translated strings)
        final memberNames = <String, String>{};
        for (final entry in rawMemberNames.entries) {
          memberNames[entry.key] = localizeMemberName(
            entry.value,
            l10n.youIndicator,
            l10n.manualIndicator,
          );
        }

        return Column(
          children: [
            // Total Summary Card
            if (balanceResult != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text(l10n.totalExpenses),
                    Text(
                      BalanceCalculator.formatAmount(
                        balanceResult.totalSpentCents,
                        currency,
                      ),
                      style: Theme.of(context).textTheme.headlineMedium
                          ?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(
                              context,
                            ).colorScheme.onPrimaryContainer,
                          ),
                    ),
                  ],
                ),
              ),

            // Expenses List
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: expenses.length,
                itemBuilder: (context, index) {
                  final expense = expenses[index];
                  final payerName =
                      memberNames[expense.payerMemberId] ?? l10n.unknown;

                  return _ExpenseCard(
                    expense: expense,
                    payerName: payerName,
                    currency: currency,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            AddExpenseScreen(tripId: tripId, expense: expense),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ExpenseCard extends StatelessWidget {
  final Expense expense;
  final String payerName;
  final String currency;
  final VoidCallback onTap;

  const _ExpenseCard({
    required this.expense,
    required this.payerName,
    required this.currency,
    required this.onTap,
  });

  String _formatDate(BuildContext context, DateTime date) {
    // Use locale-aware date formatting
    final locale = Localizations.localeOf(context);
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year;
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');

    if (locale.languageCode == 'pt') {
      return '$day/$month/$year $hour:$minute';
    }
    return '$month/$day/$year $hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          child: Text(payerName.isNotEmpty ? payerName[0].toUpperCase() : '?'),
        ),
        title: Text(expense.description),
        subtitle: Text(
          '${l10n.paidBy(payerName)} • ${_formatDate(context, expense.createdAt)}',
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
        ),
        trailing: Text(
          BalanceCalculator.formatAmount(expense.amountCents, currency),
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}

// ============================================================
// MEMBERS TAB
// ============================================================

class _MembersTab extends ConsumerWidget {
  final String tripId;

  const _MembersTab({required this.tripId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final membersAsync = ref.watch(membersProvider(tripId));
    final memberNamesAsync = ref.watch(memberNamesProvider(tripId));
    final tripAsync = ref.watch(tripProvider(tripId));
    final currentUid = ref.watch(currentUidProvider);

    return membersAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('${l10n.error}: $error')),
      data: (members) {
        if (members.isEmpty) {
          return Center(child: Text(l10n.noMembers));
        }

        final trip = tripAsync.valueOrNull;
        final currency = trip?.currency ?? '';
        final rawMemberNames = memberNamesAsync.valueOrNull ?? {};

        // Localize member names (replace markers with translated strings)
        final memberNames = <String, String>{};
        for (final entry in rawMemberNames.entries) {
          memberNames[entry.key] = localizeMemberName(
            entry.value,
            l10n.youIndicator,
            l10n.manualIndicator,
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: members.length,
          itemBuilder: (context, index) {
            final member = members[index];
            final memberName = memberNames[member.id] ?? l10n.unknown;
            final isOwner = trip?.ownerUid == member.uid;
            final isCurrentUser = member.uid == currentUid;
            final balance = ref.watch(
              memberBalanceProvider((tripId: tripId, memberId: member.id)),
            );

            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: isCurrentUser
                      ? Theme.of(context).colorScheme.primaryContainer
                      : null,
                  child: Text(
                    memberName.isNotEmpty ? memberName[0].toUpperCase() : '?',
                  ),
                ),
                title: Row(
                  children: [
                    Text(memberName),
                    if (isCurrentUser)
                      Container(
                        margin: const EdgeInsets.only(left: 8),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          l10n.youIndicator
                              .replaceAll('(', '')
                              .replaceAll(')', ''),
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    if (isOwner)
                      Container(
                        margin: const EdgeInsets.only(left: 8),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Theme.of(
                            context,
                          ).colorScheme.tertiaryContainer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          l10n.owner,
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(
                              context,
                            ).colorScheme.onTertiaryContainer,
                          ),
                        ),
                      ),
                  ],
                ),
                trailing: Text(
                  BalanceCalculator.formatBalanceWithSign(balance, currency),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: balance > 0
                        ? Theme.of(context).colorScheme.primary
                        : (balance < 0
                              ? Theme.of(context).colorScheme.error
                              : Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
