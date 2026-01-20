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
class PwaService {
  PwaService._();
  static final PwaService instance = PwaService._();

  final _installAvailableController = StreamController<bool>.broadcast();

  /// Stream that emits when install availability changes.
  Stream<bool> get onInstallAvailableChanged =>
      _installAvailableController.stream;

  bool _canInstall = false;
  bool _isInstalled = false;
  bool _initialized = false;

  /// Whether the PWA install prompt can be shown.
  bool get canInstall => _canInstall && !_isInstalled;

  /// Whether the app is already installed as a PWA.
  bool get isInstalled => _isInstalled;

  /// Initialize the PWA service. Call this once at app startup.
  void initialize() {
    if (_initialized || !kIsWeb) return;
    _initialized = true;

    // Check initial state
    _isInstalled = _jsIsPwaInstalled();
    _canInstall = _jsIsPwaInstallAvailable();

    // Set up callbacks for JS to call when events happen
    _setupCallbacks();
  }

  void _setupCallbacks() {
    _onPwaInstallAvailable = () {
      _canInstall = true;
      _installAvailableController.add(true);
    }.toJS;

    _onPwaInstalled = () {
      _isInstalled = true;
      _canInstall = false;
      _installAvailableController.add(false);
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
      _installAvailableController.add(false);
    }
    return result;
  }

  void dispose() {
    _installAvailableController.close();
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
