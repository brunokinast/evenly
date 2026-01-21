import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../services/services.dart';
import '../theme/widgets.dart';
import '../utils/async_helpers.dart';
import '../utils/context_extensions.dart';
import '../utils/formatters.dart';
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
    final colorScheme = Theme.of(context).colorScheme;

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
          body: SafeArea(
            child: ContentContainer(
              child: Column(
                children: [
                  // Custom Header
                  _TripHeader(
                    trip: trip,
                    isOwner: isOwner,
                    onBack: () => Navigator.pop(context),
                    onInviteCode: () => _showInviteCodeDialog(trip, l10n),
                    onMenu: () => _showTripOptionsSheet(trip, isOwner, l10n),
                  ),

                  // Tab Selector
                  Container(
                    margin: const EdgeInsets.fromLTRB(24, 16, 24, 8),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: colorScheme.surface,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      labelColor: colorScheme.onSurface,
                      unselectedLabelColor: colorScheme.onSurfaceVariant,
                      labelStyle: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                      unselectedLabelStyle: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                      tabs: [
                        Tab(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.receipt_long_rounded, size: 18),
                              const SizedBox(width: 8),
                              Text(l10n.expenses),
                            ],
                          ),
                        ),
                        Tab(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.people_rounded, size: 18),
                              const SizedBox(width: 8),
                              Text(l10n.members),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Tab Content
                  Expanded(
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        _ExpensesTab(
                          tripId: widget.tripId,
                          currency: trip.currency,
                        ),
                        _MembersTab(tripId: widget.tripId),
                      ],
                    ),
                  ),

                  // Bottom Action Bar
                  _BottomActionBar(tripId: widget.tripId, l10n: l10n),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showTripOptionsSheet(Trip trip, bool isOwner, AppLocalizations l10n) {
    final colorScheme = Theme.of(context).colorScheme;

    showAppBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ActionTile(
              icon: Icons.pin_rounded,
              title: l10n.showInviteCode,
              subtitle: trip.inviteCode,
              onTap: () {
                Navigator.pop(context);
                _showInviteCodeDialog(trip, l10n);
              },
            ),
            if (isOwner) ...[
              ActionTile(
                icon: Icons.person_add_rounded,
                title: l10n.addMember,
                subtitle: l10n.addMemberManually,
                onTap: () {
                  Navigator.pop(context);
                  _showAddMemberDialog(l10n);
                },
              ),
              ActionTile(
                icon: Icons.refresh_rounded,
                title: l10n.regenerateCode,
                subtitle: l10n.regenerateCodeHint,
                onTap: () {
                  Navigator.pop(context);
                  _confirmRegenerateCode(trip, l10n);
                },
              ),
              ActionTile(
                icon: Icons.delete_rounded,
                iconColor: colorScheme.error,
                title: l10n.deleteTrip,
                titleColor: colorScheme.error,
                subtitle: l10n.deleteTripHint,
                onTap: () {
                  Navigator.pop(context);
                  _confirmDeleteTrip(trip, l10n);
                },
              ),
            ],
          ],
        ),
      ),
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
              context.showSuccessSnackBar(l10n.codeCopied);
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

  Future<void> _confirmRegenerateCode(Trip trip, AppLocalizations l10n) async {
    final confirmed = await showConfirmationDialog(
      context: context,
      title: l10n.regenerateCode,
      message: l10n.regenerateCodeConfirm,
      confirmLabel: l10n.regenerate,
    );

    if (confirmed) {
      final repository = ref.read(firestoreRepositoryProvider);
      await repository.regenerateInviteCode(trip.id);
      if (mounted) {
        context.showSuccessSnackBar(l10n.codeRegenerated);
      }
    }
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
                    ref.read(membersProvider(widget.tripId)).value ?? [];
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

  Future<void> _confirmDeleteTrip(Trip trip, AppLocalizations l10n) async {
    final confirmed = await showConfirmationDialog(
      context: context,
      title: l10n.deleteTrip,
      message: l10n.deleteTripConfirm(trip.title),
      confirmLabel: l10n.delete,
      isDestructive: true,
    );

    if (confirmed) {
      final repository = ref.read(firestoreRepositoryProvider);
      await repository.deleteTrip(trip.id);
      if (mounted) {
        Navigator.of(context).pop(); // Go back to list
      }
    }
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

        final rawMemberNames = memberNamesAsync.value ?? {};

        // Localize member names (replace markers with translated strings)
        final memberNames = <String, String>{};
        for (final entry in rawMemberNames.entries) {
          memberNames[entry.key] = localizeMemberName(
            entry.value,
            l10n.youIndicator,
            l10n.manualIndicator,
          );
        }

        final colorScheme = Theme.of(context).colorScheme;

        return Column(
          children: [
            // Total Summary Card
            if (balanceResult != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.fromLTRB(24, 16, 24, 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      colorScheme.primary,
                      colorScheme.primary.withValues(alpha: 0.85),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  children: [
                    Text(
                      l10n.totalExpenses,
                      style: TextStyle(
                        color: colorScheme.onPrimary.withValues(alpha: 0.9),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      BalanceCalculator.formatAmount(
                        balanceResult.totalSpentCents,
                        currency,
                      ),
                      style: TextStyle(
                        color: colorScheme.onPrimary,
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: colorScheme.onPrimary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${expenses.length} ${l10n.expenses.toLowerCase()}',
                        style: TextStyle(
                          color: colorScheme.onPrimary.withValues(alpha: 0.9),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Expenses List
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: colorScheme.outlineVariant.withValues(alpha: 0.5),
              ),
            ),
            child: Row(
              children: [
                UserAvatar(name: payerName, size: 44),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        expense.description,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${l10n.paidBy(payerName)} • ${formatDate(context, expense.createdAt, includeTime: true)}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  BalanceCalculator.formatAmount(expense.amountCents, currency),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
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

        final trip = tripAsync.value;
        final currency = trip?.currency ?? '';
        final rawMemberNames = memberNamesAsync.value ?? {};

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
                leading: UserAvatar(name: memberName, isHighlighted: false),
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

// ============================================================
// TRIP HEADER
// ============================================================

class _TripHeader extends StatelessWidget {
  final Trip trip;
  final bool isOwner;
  final VoidCallback onBack;
  final VoidCallback onInviteCode;
  final VoidCallback onMenu;

  const _TripHeader({
    required this.trip,
    required this.isOwner,
    required this.onBack,
    required this.onInviteCode,
    required this.onMenu,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Buttons Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Back Button
              HeaderIconButton(icon: Icons.arrow_back_rounded, onTap: onBack),

              Row(
                children: [
                  // Invite Code Button
                  HeaderIconButton(
                    icon: Icons.group_add_rounded,
                    onTap: onInviteCode,
                    backgroundColor: colorScheme.primaryContainer,
                    iconColor: colorScheme.primary,
                  ),
                  const SizedBox(width: 10),

                  // Menu Button
                  HeaderIconButton(
                    icon: Icons.more_horiz_rounded,
                    onTap: onMenu,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Title Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  trip.title,
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                BalanceCalculator.getCurrencySymbol(trip.currency),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ============================================================
// BOTTOM ACTION BAR
// ============================================================

class _BottomActionBar extends StatelessWidget {
  final String tripId;
  final AppLocalizations l10n;

  const _BottomActionBar({required this.tripId, required this.l10n});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          // View Balances Button
          Expanded(
            child: ActionButton(
              icon: Icons.account_balance_wallet_rounded,
              label: l10n.balances,
              isPrimary: false,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => BalanceScreen(tripId: tripId),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Add Expense Button
          Expanded(
            child: ActionButton(
              icon: Icons.add_rounded,
              label: l10n.addExpense,
              isPrimary: true,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => AddExpenseScreen(tripId: tripId),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
