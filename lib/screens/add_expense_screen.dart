import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../services/balance_calculator.dart';
import '../theme/widgets.dart';

/// Screen for adding or editing an expense.
class AddExpenseScreen extends ConsumerStatefulWidget {
  final String tripId;
  final Expense? expense;

  /// Pre-filled data from voice command (optional)
  final double? prefillAmount;
  final String? prefillTitle;
  final String? prefillPayerId;
  final List<String>? prefillParticipantIds;
  final String? errorMessage;

  const AddExpenseScreen({
    super.key,
    required this.tripId,
    this.expense,
    this.prefillAmount,
    this.prefillTitle,
    this.prefillPayerId,
    this.prefillParticipantIds,
    this.errorMessage,
  });

  @override
  ConsumerState<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends ConsumerState<AddExpenseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _amountController = TextEditingController();

  String? _selectedPayerId;
  Set<String> _selectedParticipantIds = {};
  bool _isLoading = false;
  bool _isDeleting = false;

  bool get _isEditing => widget.expense != null;
  bool _errorMessageShown = false;

  // Track original values to detect changes
  String _originalDescription = '';
  String _originalAmount = '';
  String? _originalPayerId;
  Set<String> _originalParticipantIds = {};

  @override
  void initState() {
    super.initState();
    if (_isEditing) {
      final expense = widget.expense!;
      _descriptionController.text = expense.description;
      _amountController.text = (expense.amountCents / 100).toStringAsFixed(2);
      _selectedPayerId = expense.payerMemberId;
      _selectedParticipantIds = expense.participantMemberIds.toSet();

      // Store original values
      _originalDescription = expense.description;
      _originalAmount = (expense.amountCents / 100).toStringAsFixed(2);
      _originalPayerId = expense.payerMemberId;
      _originalParticipantIds = expense.participantMemberIds.toSet();
    } else {
      // Check for pre-filled data from voice command
      if (widget.prefillTitle != null) {
        _descriptionController.text = widget.prefillTitle!;
      }
      if (widget.prefillAmount != null) {
        _amountController.text = widget.prefillAmount!.toStringAsFixed(2);
      }
      if (widget.prefillPayerId != null) {
        _selectedPayerId = widget.prefillPayerId;
      }
      if (widget.prefillParticipantIds != null) {
        _selectedParticipantIds = widget.prefillParticipantIds!.toSet();
      }
    }
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final membersAsync = ref.watch(membersProvider(widget.tripId));
    final memberNamesAsync = ref.watch(memberNamesProvider(widget.tripId));
    final tripAsync = ref.watch(tripProvider(widget.tripId));

    return Scaffold(
      body: SafeArea(
        child: ContentContainer(
          child: membersAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) =>
                Center(child: Text('${l10n.error}: $error')),
            data: (members) {
              if (members.isEmpty) {
                return EmptyState(
                  icon: Icons.people_rounded,
                  title: l10n.noMembers,
                  subtitle: '',
                );
              }

              final currency = tripAsync.valueOrNull?.currency ?? '';
              final rawMemberNames = memberNamesAsync.valueOrNull ?? {};

              final memberNames = <String, String>{};
              for (final entry in rawMemberNames.entries) {
                memberNames[entry.key] = localizeMemberName(
                  entry.value,
                  l10n.youIndicator,
                  l10n.manualIndicator,
                );
              }

              // Initialize payer and participants if not set
              if (_selectedPayerId == null && members.isNotEmpty) {
                final currentUid = ref.read(currentUidProvider);
                final currentMember = members.firstWhere(
                  (m) => m.uid == currentUid,
                  orElse: () => members.first,
                );
                _selectedPayerId = currentMember.id;
              }

              if (_selectedParticipantIds.isEmpty &&
                  !_isEditing &&
                  widget.prefillParticipantIds == null) {
                _selectedParticipantIds = members.map((m) => m.id).toSet();
              }

              // Show error message from voice command if any
              if (widget.errorMessage != null && !_errorMessageShown) {
                _errorMessageShown = true;
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(widget.errorMessage!),
                      backgroundColor: Theme.of(context).colorScheme.error,
                      behavior: SnackBarBehavior.floating,
                      duration: const Duration(seconds: 5),
                    ),
                  );
                });
              }

              return Form(
                key: _formKey,
                child: CustomScrollView(
                  slivers: [
                    // Header
                    SliverToBoxAdapter(child: _buildHeader(context, l10n)),

                    // Form Content
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          // Description Input
                          InputCard(
                            child: TextFormField(
                              controller: _descriptionController,
                              decoration: InputDecoration(
                                labelText: l10n.description,
                                hintText: l10n.whatWasItFor,
                                prefixIcon: const Icon(
                                  Icons.description_rounded,
                                ),
                                border: InputBorder.none,
                              ),
                              textCapitalization: TextCapitalization.sentences,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return l10n.pleaseEnterDescription;
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Amount Input
                          InputCard(
                            child: TextFormField(
                              controller: _amountController,
                              decoration: InputDecoration(
                                labelText: l10n.amount,
                                hintText: '0.00',
                                prefixIcon: const Icon(
                                  Icons.attach_money_rounded,
                                ),
                                suffixText: currency,
                                border: InputBorder.none,
                              ),
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              onChanged: (_) => setState(() {}),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return l10n.pleaseEnterAmount;
                                }
                                final amount = double.tryParse(
                                  value.replaceAll(',', '.'),
                                );
                                if (amount == null || amount <= 0) {
                                  return l10n.invalidAmount;
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Payer Selection
                          SectionHeader(title: l10n.whoPaid.toUpperCase()),
                          const SizedBox(height: 8),
                          _SelectionCard(
                            children: members.map((member) {
                              final isSelected = _selectedPayerId == member.id;
                              final name =
                                  memberNames[member.id] ?? l10n.unknown;
                              return _SelectionTile(
                                name: name,
                                isSelected: isSelected,
                                isRadio: true,
                                onTap: () => setState(
                                  () => _selectedPayerId = member.id,
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 24),

                          // Participants Selection
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              SectionHeader(
                                title: l10n.splitBetweenLabel.toUpperCase(),
                              ),
                              TextButton(
                                onPressed: () {
                                  setState(() {
                                    if (_selectedParticipantIds.length ==
                                        members.length) {
                                      _selectedParticipantIds.clear();
                                    } else {
                                      _selectedParticipantIds = members
                                          .map((m) => m.id)
                                          .toSet();
                                    }
                                  });
                                },
                                child: Text(
                                  _selectedParticipantIds.length ==
                                          members.length
                                      ? l10n.deselectAll
                                      : l10n.selectAll,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          _SelectionCard(
                            children: members.map((member) {
                              final name =
                                  memberNames[member.id] ?? l10n.unknown;
                              return _SelectionTile(
                                name: name,
                                isSelected: _selectedParticipantIds.contains(
                                  member.id,
                                ),
                                isRadio: false,
                                onTap: () {
                                  setState(() {
                                    if (_selectedParticipantIds.contains(
                                      member.id,
                                    )) {
                                      _selectedParticipantIds.remove(member.id);
                                    } else {
                                      _selectedParticipantIds.add(member.id);
                                    }
                                  });
                                },
                              );
                            }).toList(),
                          ),

                          // Split Preview
                          if (_selectedParticipantIds.isNotEmpty) ...[
                            const SizedBox(height: 24),
                            _buildSplitPreview(currency, l10n),
                          ],

                          // Save Button
                          const SizedBox(height: 32),
                          SizedBox(
                            width: double.infinity,
                            child: LoadingButton(
                              isLoading: _isLoading,
                              onPressed: () => _saveExpense(l10n),
                              icon: _isEditing
                                  ? Icons.save_rounded
                                  : Icons.check_rounded,
                              label: _isEditing
                                  ? l10n.updateExpense
                                  : l10n.addExpense,
                              loadingLabel: l10n.saving,
                            ),
                          ),
                          const SizedBox(height: 32),
                        ]),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, AppLocalizations l10n) {
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 16, 8),
      child: Row(
        children: [
          HeaderIconButton(
            icon: Icons.close_rounded,
            onTap: () => _handleClose(l10n),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              _isEditing ? l10n.saveExpense : l10n.addExpense,
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          if (_isEditing)
            HeaderIconButton(
              icon: Icons.delete_outline_rounded,
              onTap: () => _confirmDelete(l10n),
              backgroundColor: colorScheme.error.withValues(alpha: 0.1),
              iconColor: colorScheme.error,
              isLoading: _isDeleting,
            ),
        ],
      ),
    );
  }

  Widget _buildSplitPreview(String currency, AppLocalizations l10n) {
    final colorScheme = Theme.of(context).colorScheme;
    final amountText = _amountController.text.replaceAll(',', '.');
    final amount = double.tryParse(amountText);

    if (amount == null || amount <= 0) {
      return const SizedBox.shrink();
    }

    final splitAmount = amount / _selectedParticipantIds.length;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.eachPersonPays,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                l10n.peopleCount(_selectedParticipantIds.length),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          Text(
            BalanceCalculator.formatAmount(
              (splitAmount * 100).round(),
              currency,
            ),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: colorScheme.primary,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _saveExpense(AppLocalizations l10n) async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedPayerId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.pleaseSelectWhoPaid)));
      return;
    }

    if (_selectedParticipantIds.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.selectAtLeastOne)));
      return;
    }

    setState(() => _isLoading = true);

    try {
      final amountText = _amountController.text.replaceAll(',', '.');
      final amount = double.parse(amountText);
      final amountCents = (amount * 100).round();

      final repository = ref.read(firestoreRepositoryProvider);

      if (_isEditing) {
        await repository.updateExpense(
          tripId: widget.tripId,
          expenseId: widget.expense!.id,
          amountCents: amountCents,
          description: _descriptionController.text.trim(),
          payerMemberId: _selectedPayerId,
          participantMemberIds: _selectedParticipantIds.toList(),
        );
      } else {
        final uid = ref.read(currentUidProvider);
        if (uid == null) throw Exception('Not signed in');

        await repository.createExpense(
          tripId: widget.tripId,
          amountCents: amountCents,
          description: _descriptionController.text.trim(),
          payerMemberId: _selectedPayerId!,
          participantMemberIds: _selectedParticipantIds.toList(),
          createdByUid: uid,
        );
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isEditing ? l10n.expenseUpdated : l10n.expenseAdded),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.failedToSaveExpense(e.toString())),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  bool get _hasChanges {
    if (!_isEditing) return false;

    return _descriptionController.text != _originalDescription ||
        _amountController.text != _originalAmount ||
        _selectedPayerId != _originalPayerId ||
        !_setEquals(_selectedParticipantIds, _originalParticipantIds);
  }

  bool _setEquals(Set<String> a, Set<String> b) {
    if (a.length != b.length) return false;
    return a.containsAll(b);
  }

  void _handleClose(AppLocalizations l10n) {
    if (_hasChanges) {
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(l10n.discardChanges),
          content: Text(l10n.discardChangesMessage),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text(l10n.keepEditing),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(dialogContext);
                Navigator.pop(context);
              },
              child: Text(l10n.discard),
            ),
          ],
        ),
      );
    } else {
      Navigator.pop(context);
    }
  }

  void _confirmDelete(AppLocalizations l10n) {
    final colorScheme = Theme.of(context).colorScheme;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.deleteExpenseQuestion),
        content: Text(l10n.deleteExpenseWarning),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: colorScheme.error),
            onPressed: () {
              Navigator.pop(dialogContext);
              _deleteExpense(l10n);
            },
            child: Text(l10n.delete),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteExpense(AppLocalizations l10n) async {
    setState(() => _isDeleting = true);

    try {
      final repository = ref.read(firestoreRepositoryProvider);
      await repository.deleteExpense(widget.tripId, widget.expense!.id);

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.expenseDeleted)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.failedToSaveExpense(e.toString())),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isDeleting = false);
      }
    }
  }
}

class _SelectionCard extends StatelessWidget {
  final List<Widget> children;

  const _SelectionCard({required this.children});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        children: children.asMap().entries.map((entry) {
          final index = entry.key;
          final child = entry.value;
          final isLast = index == children.length - 1;

          return Column(
            children: [
              child,
              if (!isLast)
                Divider(
                  height: 1,
                  indent: 60,
                  color: colorScheme.outlineVariant.withValues(alpha: 0.5),
                ),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _SelectionTile extends StatelessWidget {
  final String name;
  final bool isSelected;
  final bool isRadio;
  final VoidCallback onTap;

  const _SelectionTile({
    required this.name,
    required this.isSelected,
    required this.isRadio,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              UserAvatar(name: name, size: 40, isHighlighted: isSelected),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  name,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
              if (isRadio)
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected
                          ? colorScheme.primary
                          : colorScheme.outline,
                      width: 2,
                    ),
                    color: isSelected
                        ? colorScheme.primary
                        : Colors.transparent,
                  ),
                  child: isSelected
                      ? Icon(
                          Icons.check_rounded,
                          size: 16,
                          color: colorScheme.onPrimary,
                        )
                      : null,
                )
              else
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: isSelected
                          ? colorScheme.primary
                          : colorScheme.outline,
                      width: 2,
                    ),
                    color: isSelected
                        ? colorScheme.primary
                        : Colors.transparent,
                  ),
                  child: isSelected
                      ? Icon(
                          Icons.check_rounded,
                          size: 16,
                          color: colorScheme.onPrimary,
                        )
                      : null,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
