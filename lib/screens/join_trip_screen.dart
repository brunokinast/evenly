import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import 'trip_detail_screen.dart';

/// Screen for joining a trip via 6-digit invite code.
class JoinTripScreen extends ConsumerStatefulWidget {
  const JoinTripScreen({super.key});

  @override
  ConsumerState<JoinTripScreen> createState() => _JoinTripScreenState();
}

class _JoinTripScreenState extends ConsumerState<JoinTripScreen> {
  final _codeController = TextEditingController();
  bool _isValidating = false;
  bool _isJoining = false;
  String? _error;
  Trip? _trip;
  bool _alreadyMember = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _validateCode() async {
    final code = _codeController.text.trim();
    
    // Validate format (6 digits)
    if (code.length != 6 || int.tryParse(code) == null) {
      setState(() => _error = 'invalid_format');
      return;
    }

    setState(() {
      _isValidating = true;
      _error = null;
      _trip = null;
      _alreadyMember = false;
    });

    try {
      final repository = ref.read(firestoreRepositoryProvider);
      final trip = await repository.getTripByInviteCode(code);

      if (trip == null) {
        setState(() {
          _error = 'invalid_code';
          _isValidating = false;
        });
        return;
      }

      // Check if user is already a member
      final uid = ref.read(currentUidProvider);
      if (uid != null) {
        final isMember = await repository.isUserMember(trip.id, uid);
        if (isMember) {
          setState(() {
            _alreadyMember = true;
            _trip = trip;
            _isValidating = false;
          });
          return;
        }
      }

      setState(() {
        _trip = trip;
        _isValidating = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isValidating = false;
      });
    }
  }

  Future<void> _pasteCode() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text != null) {
      // Extract only digits, take first 6
      final digits = data!.text!.replaceAll(RegExp(r'[^0-9]'), '');
      if (digits.isNotEmpty) {
        _codeController.text = digits.substring(0, digits.length.clamp(0, 6));
        _codeController.selection = TextSelection.fromPosition(
          TextPosition(offset: _codeController.text.length),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.joinTrip),
      ),
      body: _buildBody(l10n),
    );
  }

  Widget _buildBody(AppLocalizations l10n) {
    // Show trip confirmation if validated
    if (_trip != null) {
      return _buildTripConfirmation(l10n);
    }

    // Show code entry form
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 32),
          
          // Icon and title
          const Icon(Icons.pin, size: 64),
          const SizedBox(height: 16),
          Text(
            l10n.enterInviteCode,
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            l10n.enterInviteCodeHint,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),

          // Code input
          TextField(
            controller: _codeController,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            maxLength: 6,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  letterSpacing: 8,
                  fontWeight: FontWeight.bold,
                ),
            decoration: InputDecoration(
              hintText: '000000',
              counterText: '',
              errorText: _error != null ? _getErrorText(l10n) : null,
              suffixIcon: IconButton(
                icon: const Icon(Icons.paste),
                tooltip: l10n.paste,
                onPressed: _pasteCode,
              ),
            ),
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(6),
            ],
            onChanged: (_) {
              if (_error != null) {
                setState(() => _error = null);
              }
            },
            onSubmitted: (_) => _validateCode(),
          ),
          const SizedBox(height: 24),

          // Validate button
          FilledButton.icon(
            onPressed: _isValidating ? null : _validateCode,
            icon: _isValidating
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.search),
            label: Text(_isValidating ? l10n.validating : l10n.findTrip),
          ),
        ],
      ),
    );
  }

  String _getErrorText(AppLocalizations l10n) {
    switch (_error) {
      case 'invalid_format':
        return l10n.invalidCodeFormat;
      case 'invalid_code':
        return l10n.invalidOrExpiredCode;
      default:
        return _error ?? l10n.unknown;
    }
  }

  Widget _buildTripConfirmation(AppLocalizations l10n) {
    if (_alreadyMember) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, size: 64, color: Colors.green),
              const SizedBox(height: 16),
              Text(
                l10n.alreadyMemberOf,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                _trip!.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (_) => TripDetailScreen(tripId: _trip!.id),
                  ),
                ),
                child: Text(l10n.openTrip),
              ),
            ],
          ),
        ),
      );
    }

    // Show join confirmation
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Trip Info Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const Icon(Icons.card_travel, size: 64),
                    const SizedBox(height: 16),
                    Text(l10n.youreInvitedToJoin),
                    const SizedBox(height: 8),
                    Text(
                      _trip!.title,
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Join Button
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _isJoining ? null : () => _joinTrip(l10n),
                icon: _isJoining
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.group_add),
                label: Text(_isJoining ? l10n.joining : l10n.joinTrip),
              ),
            ),
            const SizedBox(height: 16),

            // Back to code entry
            TextButton(
              onPressed: () => setState(() {
                _trip = null;
                _error = null;
              }),
              child: Text(l10n.enterDifferentCode),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _joinTrip(AppLocalizations l10n) async {
    setState(() => _isJoining = true);

    try {
      final uid = ref.read(currentUidProvider);
      final repository = ref.read(firestoreRepositoryProvider);

      // Add member with uid only - name comes from profile
      await repository.addMember(
        tripId: _trip!.id,
        uid: uid,
      );

      // Invalidate the trips provider so the home screen shows this trip
      ref.invalidate(userTripsProvider);

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => TripDetailScreen(tripId: _trip!.id),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.failedToJoinTrip(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isJoining = false);
      }
    }
  }
}
