import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../services/services.dart';
import 'trip_providers.dart';

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
  return authState.valueOrNull?.uid;
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
