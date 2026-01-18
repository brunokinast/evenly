import 'package:firebase_auth/firebase_auth.dart';

/// Service for handling anonymous authentication.
class AuthService {
  final FirebaseAuth _auth;

  AuthService({FirebaseAuth? auth}) : _auth = auth ?? FirebaseAuth.instance;

  /// Returns the current user's UID, or null if not signed in.
  String? get currentUid => _auth.currentUser?.uid;

  /// Returns true if the user is currently signed in.
  bool get isSignedIn => _auth.currentUser != null;

  /// Stream of authentication state changes.
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// Signs in anonymously if not already signed in.
  /// Returns the user's UID.
  Future<String> ensureSignedIn() async {
    if (_auth.currentUser != null) {
      return _auth.currentUser!.uid;
    }

    final credential = await _auth.signInAnonymously();
    return credential.user!.uid;
  }

  /// Signs out the current user.
  Future<void> signOut() async {
    await _auth.signOut();
  }
}
