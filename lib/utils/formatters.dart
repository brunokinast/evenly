import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Text input formatter for currency amounts.
/// Formats input as decimal with 2 decimal places (e.g., "50.00").
class CurrencyInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    // Remove all non-digit characters
    final digitsOnly = newValue.text.replaceAll(RegExp(r'[^\d]'), '');

    if (digitsOnly.isEmpty) {
      return const TextEditingValue(
        text: '',
        selection: TextSelection.collapsed(offset: 0),
      );
    }

    // Parse as cents
    final cents = int.tryParse(digitsOnly) ?? 0;

    // Format as decimal with 2 decimal places
    final dollars = cents / 100;
    final formatted = dollars.toStringAsFixed(2);

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

/// Formats a date based on locale.
///
/// For Portuguese: DD/MM/YYYY or DD/MM HH:MM
/// For others: MM/DD/YYYY or MM/DD HH:MM
String formatDate(
  BuildContext context,
  DateTime date, {
  bool includeTime = false,
}) {
  final locale = Localizations.localeOf(context);
  final day = date.day.toString().padLeft(2, '0');
  final month = date.month.toString().padLeft(2, '0');
  final year = date.year;

  if (includeTime) {
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');

    if (locale.languageCode == 'pt') {
      return '$day/$month $hour:$minute';
    }
    return '$month/$day $hour:$minute';
  }

  if (locale.languageCode == 'pt') {
    return '$day/$month/$year';
  }
  return '$month/$day/$year';
}

/// Generates a consistent color from a string (e.g., trip title, member name).
/// The color is theme-aware with adjusted saturation/lightness for better contrast.
Color getColorFromString(String input, {bool isDark = false}) {
  final hue = (input.hashCode % 360).abs().toDouble();
  return HSLColor.fromAHSL(
    1,
    hue,
    isDark ? 0.6 : 0.55,
    isDark ? 0.55 : 0.45,
  ).toColor();
}
