import 'package:flutter/material.dart';

import 'context_extensions.dart';

/// Helper function to handle async actions with loading state and error handling.
/// 
/// This standardizes the pattern of:
/// - Setting loading state to true
/// - Executing an async action
/// - Handling success/error cases
/// - Setting loading state to false
/// - Checking if widget is still mounted
/// 
/// Usage:
/// ```dart
/// await handleAsyncAction(
///   context: context,
///   action: () async => await repository.saveData(),
///   onSuccess: (result) => context.popIfMounted(),
///   successMessage: l10n.dataSaved,
///   errorMessage: l10n.failedToSaveData,
///   setLoading: (loading) => setState(() => _isLoading = loading),
/// );
/// ```
Future<void> handleAsyncAction<T>({
  required BuildContext context,
  required Future<T> Function() action,
  required void Function(bool) setLoading,
  String? successMessage,
  String? errorMessage,
  void Function(T)? onSuccess,
  void Function(dynamic)? onError,
  bool popOnSuccess = false,
}) async {
  setLoading(true);
  try {
    final result = await action();
    
    if (!context.mounted) return;
    
    if (successMessage != null) {
      context.showSuccessSnackBar(successMessage);
    }
    
    if (onSuccess != null) {
      onSuccess(result);
    }
    
    if (popOnSuccess) {
      context.popIfMounted();
    }
  } catch (e) {
    if (!context.mounted) return;
    
    final message = errorMessage ?? e.toString();
    context.showErrorSnackBar(message);
    
    if (onError != null) {
      onError(e);
    }
  } finally {
    if (context.mounted) {
      setLoading(false);
    }
  }
}

/// Shows a confirmation dialog and returns true if user confirmed.
Future<bool> showConfirmationDialog({
  required BuildContext context,
  required String title,
  required String message,
  required String confirmLabel,
  String? cancelLabel,
  bool isDestructive = false,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(false),
          child: Text(cancelLabel ?? 'Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(dialogContext).pop(true),
          style: isDestructive
              ? FilledButton.styleFrom(
                  backgroundColor: Theme.of(dialogContext).colorScheme.error,
                )
              : null,
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  
  return result ?? false;
}
