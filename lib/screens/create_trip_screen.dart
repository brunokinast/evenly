import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../providers/providers.dart';
import '../theme/widgets.dart';
import '../utils/async_helpers.dart';
import '../utils/context_extensions.dart';
import '../utils/trip_icons.dart';

/// Screen to create a new trip.
class CreateTripScreen extends ConsumerStatefulWidget {
  const CreateTripScreen({super.key});

  @override
  ConsumerState<CreateTripScreen> createState() => _CreateTripScreenState();
}

class _CreateTripScreenState extends ConsumerState<CreateTripScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  String _selectedCurrency = 'BRL';
  String _selectedIconName = 'luggage';
  bool _isLoading = false;

  static const List<String> _currencies = ['BRL', 'USD', 'EUR', 'GBP'];

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: ContentContainer(
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                ScreenHeader(
                  title: l10n.createTrip,
                  backIcon: Icons.close_rounded,
                ),

                // Content
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      // Icon picker
                      Center(
                        child: GestureDetector(
                          onTap: _showIconPicker,
                          child: Column(
                            children: [
                              IconCircle(
                                icon: getTripIcon(_selectedIconName),
                                size: 80,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                l10n.chooseIcon,
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color: colorScheme.primary,
                                      fontWeight: FontWeight.w500,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Trip Name
                      InputCard(
                        child: TextFormField(
                          controller: _titleController,
                          decoration: InputDecoration(
                            labelText: l10n.tripName,
                            hintText: l10n.enterTripName,
                            prefixIcon: const Icon(Icons.edit_rounded),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 16,
                            ),
                          ),
                          textCapitalization: TextCapitalization.sentences,
                          autofocus: true,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return l10n.pleaseEnterTripName;
                            }
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Currency Selector
                      InputCard(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.currency_exchange_rounded,
                                color: colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      l10n.currency,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: colorScheme.onSurfaceVariant,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: _selectedCurrency,
                                        isExpanded: true,
                                        isDense: true,
                                        icon: Icon(
                                          Icons.keyboard_arrow_down_rounded,
                                          color: colorScheme.onSurfaceVariant,
                                        ),
                                        items: _currencies.map((currency) {
                                          return DropdownMenuItem(
                                            value: currency,
                                            child: Text(
                                              currency,
                                              style: Theme.of(
                                                context,
                                              ).textTheme.bodyLarge,
                                            ),
                                          );
                                        }).toList(),
                                        onChanged: (value) {
                                          if (value != null) {
                                            setState(() {
                                              _selectedCurrency = value;
                                            });
                                          }
                                        },
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Info card
                      MessageCard(
                        message: l10n.inviteFriendsHint,
                        type: MessageType.info,
                      ),
                    ],
                  ),
                ),

                // Bottom button
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: SizedBox(
                    width: double.infinity,
                    child: LoadingButton(
                      isLoading: _isLoading,
                      onPressed: _createTrip,
                      icon: Icons.add_rounded,
                      label: l10n.create,
                      loadingLabel: l10n.settingUp,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _createTrip() async {
    if (!_formKey.currentState!.validate()) return;

    final l10n = AppLocalizations.of(context)!;
    final uid = ref.read(currentUidProvider);
    if (uid == null) {
      context.showErrorSnackBar(l10n.voiceCommandNotAuthenticated);
      return;
    }

    await handleAsyncAction(
      context: context,
      action: () => ref
          .read(firestoreRepositoryProvider)
          .createTrip(
            title: _titleController.text.trim(),
            currency: _selectedCurrency,
            ownerUid: uid,
            iconName: _selectedIconName,
          ),
      popOnSuccess: true,
      errorMessage: l10n.failedToCreateTrip(''),
      setLoading: (loading) => setState(() => _isLoading = loading),
    );
  }

  void _showIconPicker() {
    final colorScheme = Theme.of(context).colorScheme;
    final l10n = AppLocalizations.of(context)!;

    showModalBottomSheet(
      context: context,
      backgroundColor: colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.tripIcon,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: tripIcons.map((tripIcon) {
                final isSelected = tripIcon.name == _selectedIconName;
                return GestureDetector(
                  onTap: () {
                    setState(() => _selectedIconName = tripIcon.name);
                    Navigator.pop(context);
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? colorScheme.primary.withValues(alpha: 0.15)
                          : colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(16),
                      border: isSelected
                          ? Border.all(color: colorScheme.primary, width: 2)
                          : null,
                    ),
                    child: Icon(
                      tripIcon.icon,
                      color: isSelected
                          ? colorScheme.primary
                          : colorScheme.onSurfaceVariant,
                      size: 28,
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
