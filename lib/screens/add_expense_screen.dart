import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../providers/providers.dart';

/// Screen for adding or editing an expense.
class AddExpenseScreen extends ConsumerStatefulWidget {
  final String tripId;
  final Expense? expense; // If provided, we're editing

  const AddExpenseScreen({super.key, required this.tripId, this.expense});

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

  @override
  void initState() {
    super.initState();
    if (_isEditing) {
      final expense = widget.expense!;
      _descriptionController.text = expense.description;
      _amountController.text = (expense.amountCents / 100).toStringAsFixed(2);
      _selectedPayerId = expense.payerMemberId;
      _selectedParticipantIds = expense.participantMemberIds.toSet();
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
      appBar: AppBar(
        title: Text(_isEditing ? l10n.saveExpense : l10n.addExpense),
        actions: [
          if (_isEditing)
            IconButton(
              icon: _isDeleting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      Icons.delete,
                      color: Theme.of(context).colorScheme.error,
                    ),
              onPressed: _isDeleting ? null : () => _confirmDelete(l10n),
            ),
        ],
      ),
      body: membersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('${l10n.error}: $error')),
        data: (members) {
          if (members.isEmpty) {
            return Center(child: Text(l10n.noMembers));
          }

          final currency = tripAsync.valueOrNull?.currency ?? '';
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

          // Initialize payer and participants if not set
          if (_selectedPayerId == null && members.isNotEmpty) {
            // Try to select current user as default payer
            final currentUid = ref.read(currentUidProvider);
            final currentMember = members.firstWhere(
              (m) => m.uid == currentUid,
              orElse: () => members.first,
            );
            _selectedPayerId = currentMember.id;
          }

          if (_selectedParticipantIds.isEmpty && !_isEditing) {
            // Default: all members are participants
            _selectedParticipantIds = members.map((m) => m.id).toSet();
          }

          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Description
                TextFormField(
                  controller: _descriptionController,
                  decoration: InputDecoration(
                    labelText: l10n.description,
                    hintText: l10n.whatWasItFor,
                    prefixIcon: const Icon(Icons.description),
                    border: const OutlineInputBorder(),
                  ),
                  textCapitalization: TextCapitalization.sentences,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return l10n.pleaseEnterDescription;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Amount
                TextFormField(
                  controller: _amountController,
                  decoration: InputDecoration(
                    labelText: l10n.amount,
                    hintText: '0.00',
                    prefixIcon: const Icon(Icons.attach_money),
                    suffixText: currency,
                    border: const OutlineInputBorder(),
                  ),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  onChanged: (_) {
                    // Trigger rebuild to update the split preview
                    setState(() {});
                  },
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return l10n.pleaseEnterAmount;
                    }
                    final amount = double.tryParse(value.replaceAll(',', '.'));
                    if (amount == null || amount <= 0) {
                      return l10n.invalidAmount;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),

                // Payer Selection
                Text(
                  l10n.whoPaid,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Card(
                  child: Column(
                    children: members.map((member) {
                      final isSelected = _selectedPayerId == member.id;
                      final name = memberNames[member.id] ?? l10n.unknown;
                      return ListTile(
                        leading: Radio<String>(
                          value: member.id,
                          groupValue: _selectedPayerId,
                          onChanged: (value) {
                            setState(() => _selectedPayerId = value);
                          },
                        ),
                        title: Text(name),
                        onTap: () {
                          setState(() => _selectedPayerId = member.id);
                        },
                        selected: isSelected,
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 24),

                // Participants Selection
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      l10n.splitBetweenLabel,
                      style: Theme.of(context).textTheme.titleMedium,
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
                        _selectedParticipantIds.length == members.length
                            ? l10n.deselectAll
                            : l10n.selectAll,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Card(
                  child: Column(
                    children: members.map((member) {
                      final name = memberNames[member.id] ?? l10n.unknown;
                      return CheckboxListTile(
                        title: Text(name),
                        value: _selectedParticipantIds.contains(member.id),
                        onChanged: (checked) {
                          setState(() {
                            if (checked == true) {
                              _selectedParticipantIds.add(member.id);
                            } else {
                              _selectedParticipantIds.remove(member.id);
                            }
                          });
                        },
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),

                // Preview Split
                if (_selectedParticipantIds.isNotEmpty) ...[
                  _buildSplitPreview(currency, l10n),
                  const SizedBox(height: 24),
                ],

                // Save Button
                FilledButton.icon(
                  onPressed: _isLoading ? null : () => _saveExpense(l10n),
                  icon: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Icon(_isEditing ? Icons.save : Icons.check),
                  label: Text(
                    _isLoading
                        ? l10n.saving
                        : (_isEditing ? l10n.updateExpense : l10n.addExpense),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSplitPreview(String currency, AppLocalizations l10n) {
    final amountText = _amountController.text.replaceAll(',', '.');
    final amount = double.tryParse(amountText);
    if (amount == null || amount <= 0) {
      return const SizedBox.shrink();
    }

    final splitAmount = amount / _selectedParticipantIds.length;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            l10n.eachPersonPays,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          Text(
            '$currency ${splitAmount.toStringAsFixed(2)}',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
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

  void _confirmDelete(AppLocalizations l10n) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.deleteExpenseQuestion),
        content: Text(l10n.deleteExpenseWarning),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () {
              Navigator.pop(context);
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
