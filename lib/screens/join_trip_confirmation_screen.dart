import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/trip.dart';
import '../providers/providers.dart';
import '../theme/widgets.dart';
import '../utils/async_helpers.dart';
import '../utils/context_extensions.dart';
import 'trip_detail_screen.dart';

class JoinTripConfirmationScreen extends ConsumerStatefulWidget {
  final Trip trip;
  final bool isAlreadyMember;

  const JoinTripConfirmationScreen({
    super.key,
    required this.trip,
    required this.isAlreadyMember,
  });

  @override
  ConsumerState<JoinTripConfirmationScreen> createState() =>
      _JoinTripConfirmationScreenState();
}

class _JoinTripConfirmationScreenState
    extends ConsumerState<JoinTripConfirmationScreen> {
  bool _isJoining = false;

  Future<void> _joinTrip() async {
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
          .addMember(tripId: widget.trip.id, uid: uid),
      onSuccess: (_) {
        ref.invalidate(userTripsProvider);
        _openTrip();
      },
      errorMessage: l10n.failedToJoinTrip(''),
      setLoading: (loading) => setState(() => _isJoining = loading),
    );
  }

  void _openTrip() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => TripDetailScreen(tripId: widget.trip.id),
      ),
      (route) => route.isFirst,
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
              ScreenHeader(title: l10n.joinTrip),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Center(
                        child: IconCircle(
                          icon: widget.isAlreadyMember
                              ? Icons.check_circle_outline_rounded
                              : Icons.group_add_rounded,
                          size: 100,
                          iconSize: 56,
                        ),
                      ),
                      const SizedBox(height: 32),
                      ListCard(
                        child: Column(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                children: [
                                  IconCircle(
                                    icon: Icons.luggage_rounded,
                                    size: 56,
                                    iconSize: 28,
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          widget.isAlreadyMember
                                              ? l10n.alreadyMemberOf
                                              : l10n.youreInvitedToJoin,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.copyWith(
                                                color: colorScheme
                                                    .onSurfaceVariant,
                                              ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          widget.trip.title,
                                          style: Theme.of(context)
                                              .textTheme
                                              .titleMedium
                                              ?.copyWith(
                                                fontWeight: FontWeight.w600,
                                              ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  BadgePill(label: widget.trip.currency),
                                ],
                              ),
                            ),
                            Container(
                              height: 1,
                              color: colorScheme.outlineVariant.withValues(
                                alpha: 0.3,
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: SizedBox(
                                width: double.infinity,
                                child: widget.isAlreadyMember
                                    ? OutlinedButton.icon(
                                        onPressed: _openTrip,
                                        icon: const Icon(
                                          Icons.open_in_new_rounded,
                                        ),
                                        label: Text(l10n.openTrip),
                                      )
                                    : LoadingButton(
                                        isLoading: _isJoining,
                                        onPressed: _joinTrip,
                                        icon: Icons.person_add_rounded,
                                        label: l10n.joinTrip,
                                        loadingLabel: l10n.joining,
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
