import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../providers/providers.dart';
import '../services/balance_calculator.dart';
import '../services/pwa_service.dart';
import '../theme/widgets.dart';
import '../utils/formatters.dart';
import '../utils/trip_icons.dart';
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
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: ContentContainer(
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              l10n.myTrips,
                              style: Theme.of(context).textTheme.headlineMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                          HeaderIconButton(
                            icon: Icons.more_horiz_rounded,
                            onTap: () => _showOptionsSheet(context, l10n, ref),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l10n.welcomeSubtitle,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Quick Actions
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: ActionButton(
                          icon: Icons.add_rounded,
                          label: l10n.newTrip,
                          isPrimary: true,
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const CreateTripScreen(),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ActionButton(
                          icon: Icons.login_rounded,
                          label: l10n.joinTrip,
                          isPrimary: false,
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const JoinTripScreen(),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Trips List
              tripsAsync.when(
                loading: () => const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (error, stack) => SliverFillRemaining(
                  child: _buildErrorState(context, ref, l10n, error),
                ),
                data: (trips) {
                  if (trips.isEmpty) {
                    return SliverFillRemaining(
                      child: _buildEmptyState(context, l10n),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate((context, index) {
                        final trip = trips[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _TripCard(
                            title: trip.title,
                            currency: trip.currency,
                            iconName: trip.iconName,
                            createdAt: trip.createdAt,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    TripDetailScreen(tripId: trip.id),
                              ),
                            ),
                          ),
                        );
                      }, childCount: trips.length),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, AppLocalizations l10n) {
    return EmptyState(
      icon: Icons.luggage_rounded,
      title: l10n.noTripsYet,
      subtitle: l10n.createFirstTrip,
    );
  }

  Widget _buildErrorState(
    BuildContext context,
    WidgetRef ref,
    AppLocalizations l10n,
    Object error,
  ) {
    final colorScheme = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconCircle(
              icon: Icons.cloud_off_rounded,
              size: 80,
              backgroundColor: colorScheme.error.withValues(alpha: 0.1),
              iconColor: colorScheme.error,
            ),
            const SizedBox(height: 24),
            Text(l10n.error, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              error.toString(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => ref.invalidate(userTripsProvider),
              icon: const Icon(Icons.refresh_rounded, size: 20),
              label: Text(l10n.retry),
            ),
          ],
        ),
      ),
    );
  }

  void _showOptionsSheet(
    BuildContext context,
    AppLocalizations l10n,
    WidgetRef ref,
  ) {
    final currentTheme = ref.read(themeModeProvider);
    final isDark =
        currentTheme == ThemeMode.dark ||
        (currentTheme == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);

    showAppBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ActionTile(
              icon: isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
              title: isDark ? l10n.lightMode : l10n.darkMode,
              subtitle: isDark
                  ? l10n.switchToLightTheme
                  : l10n.switchToDarkTheme,
              onTap: () {
                ref
                    .read(themeModeProvider.notifier)
                    .setThemeMode(isDark ? ThemeMode.light : ThemeMode.dark);
                Navigator.pop(context);
              },
            ),
            ActionTile(
              icon: Icons.info_outline_rounded,
              title: l10n.appTitle,
              subtitle: l10n.welcomeSubtitle,
              onTap: () {
                Navigator.pop(context);
                _showAboutDialog(context, l10n);
              },
            ),
            // Show Install App option on web when available
            if (kIsWeb)
              ListenableBuilder(
                listenable: PwaService.instance,
                builder: (context, _) {
                  if (!PwaService.instance.canInstall) {
                    return const SizedBox.shrink();
                  }
                  return ActionTile(
                    icon: Icons.install_mobile_rounded,
                    title: l10n.installApp,
                    subtitle: l10n.installAppSubtitle,
                    onTap: () async {
                      Navigator.pop(context);
                      await PwaService.instance.promptInstall();
                    },
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  void _showAboutDialog(BuildContext context, AppLocalizations l10n) {
    final colorScheme = Theme.of(context).colorScheme;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            IconCircle(icon: Icons.wallet_rounded, size: 72, iconSize: 36),
            const SizedBox(height: 20),
            Text(l10n.appTitle, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              l10n.welcomeSubtitle,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Created with ',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                Icon(Icons.favorite, size: 14, color: colorScheme.error),
                Text(
                  ' by Bruno Kinast',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ),
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
  final String iconName;
  final DateTime createdAt;
  final VoidCallback onTap;

  const _TripCard({
    required this.title,
    required this.currency,
    required this.iconName,
    required this.createdAt,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tripColor = getColorFromString(title, isDark: isDark);

    return Material(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorScheme.outlineVariant.withValues(alpha: 0.5),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: tripColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(getTripIcon(iconName), color: tripColor, size: 28),
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
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            BalanceCalculator.getCurrencySymbol(currency),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          formatDate(context, createdAt),
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
