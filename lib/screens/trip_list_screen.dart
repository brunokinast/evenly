import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../providers/providers.dart';
import 'create_trip_screen.dart';
import 'join_trip_screen.dart';
import 'trip_detail_screen.dart';

/// Main screen showing the list of trips the user is a member of.
class TripListScreen extends ConsumerWidget {
  const TripListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final tripsAsync = ref.watch(userTripsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.myTrips),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showAboutDialog(context, l10n),
          ),
        ],
      ),
      body: tripsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text('${l10n.error}: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(userTripsProvider),
                child: Text(l10n.retry),
              ),
            ],
          ),
        ),
        data: (trips) {
          if (trips.isEmpty) {
            return _buildEmptyState(context, l10n);
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(userTripsProvider);
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: trips.length,
              itemBuilder: (context, index) {
                final trip = trips[index];
                return _TripCard(
                  title: trip.title,
                  currency: trip.currency,
                  createdAt: trip.createdAt,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => TripDetailScreen(tripId: trip.id),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.extended(
            heroTag: 'join_trip',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const JoinTripScreen()),
            ),
            icon: const Icon(Icons.pin),
            label: Text(l10n.joinTrip),
          ),
          const SizedBox(height: 8),
          FloatingActionButton.extended(
            heroTag: 'new_trip',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CreateTripScreen()),
            ),
            icon: const Icon(Icons.add),
            label: Text(l10n.newTrip),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, AppLocalizations l10n) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.card_travel,
              size: 100,
              color: Theme.of(
                context,
              ).colorScheme.primary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 24),
            Text(
              l10n.noTripsYet,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              l10n.createFirstTrip,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CreateTripScreen()),
              ),
              icon: const Icon(Icons.add),
              label: Text(l10n.createTrip),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const JoinTripScreen()),
              ),
              icon: const Icon(Icons.pin),
              label: Text(l10n.joinTrip),
            ),
          ],
        ),
      ),
    );
  }

  void _showAboutDialog(BuildContext context, AppLocalizations l10n) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.appTitle),
        content: Text(l10n.welcomeSubtitle),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.ok),
          ),
        ],
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  final String title;
  final String currency;
  final DateTime createdAt;
  final VoidCallback onTap;

  const _TripCard({
    required this.title,
    required this.currency,
    required this.createdAt,
    required this.onTap,
  });

  String _formatDate(BuildContext context, DateTime date) {
    // Use locale-aware date formatting
    final locale = Localizations.localeOf(context);
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year;

    if (locale.languageCode == 'pt') {
      return '$day/$month/$year';
    }
    return '$month/$day/$year';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.card_travel,
                  color: colorScheme.onPrimaryContainer,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          currency,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '•',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _formatDate(context, createdAt),
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: colorScheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}
