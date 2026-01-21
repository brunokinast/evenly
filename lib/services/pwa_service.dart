import 'dart:async';
import 'dart:js_interop';

import 'package:flutter/foundation.dart';

/// Service for handling PWA installation on web.
///
/// Usage:
/// ```dart
/// if (PwaService.instance.canInstall) {
///   final installed = await PwaService.instance.promptInstall();
/// }
/// ```
class PwaService extends ChangeNotifier {
  PwaService._();
  static final PwaService instance = PwaService._();

  bool _canInstall = false;
  bool _isInstalled = false;
  bool _initialized = false;
  bool _isIOS = false;
  bool _isIOSSafari = false;

  /// Whether the PWA install prompt can be shown.
  /// On iOS Safari, returns true if not installed (users need manual instructions).
  /// On Chrome/Edge, returns true if beforeinstallprompt is available.
  bool get canInstall => _canInstall && !_isInstalled;

  /// Whether the app is already installed as a PWA.
  bool get isInstalled => _isInstalled;

  /// Whether the device is running iOS.
  bool get isIOS => _isIOS;

  /// Whether running on iOS (any browser - Safari, Chrome, Firefox, etc.).
  /// All iOS browsers use WebKit and require manual PWA installation.
  bool get isIOSSafari => _isIOSSafari;

  /// Initialize the PWA service. Call this once at app startup.
  void initialize() {
    if (_initialized || !kIsWeb) return;
    _initialized = true;

    // Check initial state - the beforeinstallprompt might have already fired
    _isInstalled = _jsIsPwaInstalled();
    _isIOS = _jsIsIOS();
    _isIOSSafari = _jsIsIOSSafari();

    // On iOS (any browser), we can show install instructions if not installed
    // On desktop Chrome/Edge, we need the beforeinstallprompt event
    if (_isIOSSafari && !_isInstalled) {
      _canInstall = true;
    } else {
      _canInstall = _jsIsPwaInstallAvailable();
    }

    // Set up callbacks for JS to call when events happen
    _setupCallbacks();

    // Notify listeners of initial state
    if (_canInstall) {
      notifyListeners();
    }
  }

  void _setupCallbacks() {
    _onPwaInstallAvailable = () {
      _canInstall = true;
      notifyListeners();
    }.toJS;

    _onPwaInstalled = () {
      _isInstalled = true;
      _canInstall = false;
      notifyListeners();
    }.toJS;
  }

  /// Prompt the user to install the PWA.
  /// Returns true if the user accepted, false otherwise.
  Future<bool> promptInstall() async {
    if (!kIsWeb || !_canInstall) return false;

    final jsResult = await _jsTriggerPwaInstall().toDart;
    final result = jsResult.toDart;
    if (result) {
      _canInstall = false;
      notifyListeners();
    }
    return result;
  }
}

// JS interop
@JS('isPwaInstalled')
external bool _jsIsPwaInstalled();

@JS('isPwaInstallAvailable')
external bool _jsIsPwaInstallAvailable();

@JS('triggerPwaInstall')
external JSPromise<JSBoolean> _jsTriggerPwaInstall();

@JS('onPwaInstallAvailable')
external set _onPwaInstallAvailable(JSFunction? value);

@JS('onPwaInstalled')
external set _onPwaInstalled(JSFunction? value);

@JS('isIOS')
external bool _jsIsIOS();

@JS('isIOSSafari')
external bool _jsIsIOSSafari();
