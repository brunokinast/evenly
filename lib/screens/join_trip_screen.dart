import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../providers/providers.dart';
import '../theme/widgets.dart';
import 'join_trip_confirmation_screen.dart';

class JoinTripScreen extends ConsumerStatefulWidget {
  const JoinTripScreen({super.key});

  @override
  ConsumerState<JoinTripScreen> createState() => _JoinTripScreenState();
}

class _JoinTripScreenState extends ConsumerState<JoinTripScreen> {
  final _codeController = TextEditingController();
  bool _isValidating = false;
  String? _error;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _pasteCode() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text != null) {
      final digits = data!.text!.replaceAll(RegExp(r'[^0-9]'), '');
      if (digits.length >= 6) {
        _codeController.text = digits.substring(0, 6);
        setState(() {
          _error = null;
        });
      }
    }
  }

  Future<void> _validateCode() async {
    final l10n = AppLocalizations.of(context)!;
    final code = _codeController.text.trim();

    if (code.length != 6) {
      setState(() => _error = l10n.invalidCodeFormat);
      return;
    }

    setState(() {
      _isValidating = true;
      _error = null;
    });

    try {
      final uid = ref.read(currentUidProvider);
      if (uid == null) throw Exception('Not signed in');

      final repository = ref.read(firestoreRepositoryProvider);
      final trip = await repository.getTripByInviteCode(code);

      if (trip == null) {
        setState(() {
          _error = l10n.invalidOrExpiredCode;
        });
        return;
      }

      final members = await repository.getMembers(trip.id);
      final isAlreadyMember = members.any((m) => m.uid == uid);

      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => JoinTripConfirmationScreen(
              trip: trip,
              isAlreadyMember: isAlreadyMember,
            ),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      final l10n = AppLocalizations.of(context)!;
      setState(() => _error = l10n.failedToJoinTrip(e.toString()));
    } finally {
      if (mounted) setState(() => _isValidating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: ContentContainer(
          child: Column(
            children: [
              ScreenHeader(title: l10n.joinTrip),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    const Center(
                      child: IconCircle(
                        icon: Icons.group_add_rounded,
                        size: 80,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      l10n.enterInviteCode,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.enterInviteCodeHint,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 32),
                    InputCard(
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _codeController,
                              decoration: const InputDecoration(
                                hintText: '000000',
                                prefixIcon: Icon(Icons.key_rounded),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 16,
                                ),
                              ),
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(6),
                              ],
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                letterSpacing: 8,
                                fontWeight: FontWeight.w600,
                              ),
                              textAlign: TextAlign.center,
                              onChanged: (_) {
                                if (_error != null) {
                                  setState(() => _error = null);
                                }
                              },
                            ),
                          ),
                          IconButton(
                            onPressed: _pasteCode,
                            icon: Icon(
                              Icons.content_paste_rounded,
                              color: colorScheme.primary,
                            ),
                            tooltip: l10n.paste,
                          ),
                          const SizedBox(width: 8),
                        ],
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      MessageCard(
                        message: _error!,
                        type: MessageType.error,
                      ),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: LoadingButton(
                        isLoading: _isValidating,
                        onPressed: _validateCode,
                        icon: Icons.search_rounded,
                        label: l10n.findTrip,
                        loadingLabel: l10n.validating,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
