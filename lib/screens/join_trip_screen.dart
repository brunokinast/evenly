import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/trip.dart';
import '../providers/providers.dart';
import '../theme/widgets.dart';
import 'trip_detail_screen.dart';

class JoinTripScreen extends ConsumerStatefulWidget {
  const JoinTripScreen({super.key});

  @override
  ConsumerState<JoinTripScreen> createState() => _JoinTripScreenState();
}

class _JoinTripScreenState extends ConsumerState<JoinTripScreen> {
  final _codeController = TextEditingController();
  bool _isValidating = false;
  bool _isJoining = false;
  Trip? _foundTrip;
  bool _isAlreadyMember = false;
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
          _foundTrip = null;
          _isAlreadyMember = false;
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
          _foundTrip = null;
        });
        return;
      }

      final members = await repository.getMembers(trip.id);
      final isAlreadyMember = members.any((m) => m.uid == uid);

      setState(() {
        _foundTrip = trip;
        _isAlreadyMember = isAlreadyMember;
      });
    } catch (e) {
      if (!mounted) return;
      final l10n = AppLocalizations.of(context)!;
      setState(() => _error = l10n.failedToJoinTrip(e.toString()));
    } finally {
      if (mounted) setState(() => _isValidating = false);
    }
  }

  Future<void> _joinTrip() async {
    if (_foundTrip == null) return;

    setState(() => _isJoining = true);

    try {
      final uid = ref.read(currentUidProvider);
      if (uid == null) throw Exception('Not signed in');

      final repository = ref.read(firestoreRepositoryProvider);
      await repository.addMember(tripId: _foundTrip!.id, uid: uid);

      if (mounted) _openTrip(_foundTrip!);
    } catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.failedToJoinTrip(e.toString())),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isJoining = false);
    }
  }

  void _openTrip(Trip trip) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => TripDetailScreen(tripId: trip.id)),
    );
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
              _buildHeader(context, l10n, colorScheme),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    _buildIcon(colorScheme),
                    const SizedBox(height: 24),
                    _buildTitle(context, l10n, colorScheme),
                    const SizedBox(height: 32),
                    _buildCodeInput(context, l10n, colorScheme),
                    if (_error != null) _buildError(context, colorScheme),
                    if (_foundTrip != null) ...[
                      const SizedBox(height: 24),
                      _buildTripCard(context, l10n, colorScheme),
                    ],
                    const SizedBox(height: 24),
                    if (_foundTrip == null) _buildFindButton(l10n, colorScheme),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(
    BuildContext context,
    AppLocalizations l10n,
    ColorScheme colorScheme,
  ) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        children: [
          HeaderIconButton(
            icon: Icons.arrow_back_rounded,
            onTap: () => Navigator.of(context).pop(),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              l10n.joinTrip,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIcon(ColorScheme colorScheme) {
    return Center(
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          color: colorScheme.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Icon(
          Icons.group_add_rounded,
          size: 40,
          color: colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildTitle(
    BuildContext context,
    AppLocalizations l10n,
    ColorScheme colorScheme,
  ) {
    return Column(
      children: [
        Text(
          l10n.enterInviteCode,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          l10n.enterInviteCodeHint,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildCodeInput(
    BuildContext context,
    AppLocalizations l10n,
    ColorScheme colorScheme,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
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
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                letterSpacing: 8,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
              onChanged: (_) {
                if (_foundTrip != null || _error != null) {
                  setState(() {
                    _foundTrip = null;
                    _isAlreadyMember = false;
                    _error = null;
                  });
                }
              },
            ),
          ),
          IconButton(
            onPressed: _pasteCode,
            icon: Icon(Icons.content_paste_rounded, color: colorScheme.primary),
            tooltip: l10n.paste,
          ),
          const SizedBox(width: 8),
        ],
      ),
    );
  }

  Widget _buildError(BuildContext context, ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colorScheme.error.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              Icons.error_outline_rounded,
              color: colorScheme.error,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _error!,
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: colorScheme.error),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTripCard(
    BuildContext context,
    AppLocalizations l10n,
    ColorScheme colorScheme,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: colorScheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    Icons.luggage_rounded,
                    color: colorScheme.primary,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isAlreadyMember
                            ? l10n.alreadyMemberOf
                            : l10n.youreInvitedToJoin,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _foundTrip!.title,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.secondaryContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _foundTrip!.currency,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSecondaryContainer,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            height: 1,
            color: colorScheme.outlineVariant.withValues(alpha: 0.3),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: _isAlreadyMember
                  ? OutlinedButton.icon(
                      onPressed: () => _openTrip(_foundTrip!),
                      icon: const Icon(Icons.open_in_new_rounded),
                      label: Text(l10n.openTrip),
                    )
                  : FilledButton.icon(
                      onPressed: _isJoining ? null : _joinTrip,
                      icon: _isJoining
                          ? SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: colorScheme.onPrimary,
                              ),
                            )
                          : const Icon(Icons.person_add_rounded),
                      label: Text(_isJoining ? l10n.joining : l10n.joinTrip),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFindButton(AppLocalizations l10n, ColorScheme colorScheme) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: _isValidating ? null : _validateCode,
        icon: _isValidating
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: colorScheme.onPrimary,
                ),
              )
            : const Icon(Icons.search_rounded),
        label: Text(_isValidating ? l10n.validating : l10n.findTrip),
      ),
    );
  }
}
