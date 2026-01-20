import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import '../services/services.dart';
import 'trip_providers.dart';

/// Provider for SharedPreferences instance.
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences not initialized');
});

/// Provider for the app theme mode (light/dark/system) with persistence.
final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(
  ThemeModeNotifier.new,
);

/// Notifier that persists theme mode to SharedPreferences.
class ThemeModeNotifier extends Notifier<ThemeMode> {
  static const _key = 'theme_mode';

  @override
  ThemeMode build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    return _loadThemeMode(prefs);
  }

  static ThemeMode _loadThemeMode(SharedPreferences prefs) {
    final value = prefs.getString(_key);
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  void setThemeMode(ThemeMode mode) {
    state = mode;
    ref.read(sharedPreferencesProvider).setString(_key, mode.name);
  }
}

/// Provider for the AuthService.
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});

/// Provider for the current Firebase user.
final authStateProvider = StreamProvider<User?>((ref) {
  final authService = ref.watch(authServiceProvider);
  return authService.authStateChanges;
});

/// Provider for the current user's UID.
final currentUidProvider = Provider<String?>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.value?.uid;
});

/// Provider that ensures the user is signed in anonymously.
final ensureSignedInProvider = FutureProvider<String>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return authService.ensureSignedIn();
});

/// Provider for the current user's profile.
final userProfileProvider = FutureProvider<UserProfile?>((ref) async {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return null;

  final repository = ref.watch(firestoreRepositoryProvider);
  return repository.getUserProfile(uid);
});

/// Stream provider for real-time user profile updates.
final userProfileStreamProvider = StreamProvider<UserProfile?>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Stream.value(null);

  final repository = ref.watch(firestoreRepositoryProvider);
  return repository.watchUserProfile(uid);
});
