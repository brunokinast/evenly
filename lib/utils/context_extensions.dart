import 'package:flutter/material.dart';

/// Extension methods on BuildContext for common UI patterns.
extension ContextExtensions on BuildContext {
  /// Shows an error SnackBar with consistent styling.
  void showErrorSnackBar(String message) {
    ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(this).colorScheme.error,
      ),
    );
  }

  /// Shows a success SnackBar with consistent styling.
  void showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFF059669),
      ),
    );
  }

  /// Shows an info SnackBar with neutral styling.
  void showInfoSnackBar(String message) {
    ScaffoldMessenger.of(this).showSnackBar(SnackBar(content: Text(message)));
  }

  /// Pops the current route if the widget is still mounted.
  void popIfMounted() {
    if (mounted) {
      Navigator.of(this).pop();
    }
  }

  /// Pops the current route with a result if the widget is still mounted.
  void popWithResultIfMounted<T>(T result) {
    if (mounted) {
      Navigator.of(this).pop(result);
    }
  }
}

/// Extension on State to safely check if widget is mounted.
extension StateExtensions on State {
  /// Returns true if the widget is still in the tree.
  bool get mounted => this.mounted;
}
