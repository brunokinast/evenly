import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Text input formatter for currency amounts.
/// Formats input as decimal with 2 decimal places and locale-aware separators.
class CurrencyInputFormatter extends TextInputFormatter {
  final String currency;

  CurrencyInputFormatter({required this.currency});

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
    final formatted = _formatWithSeparators(dollars, currency);

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }

  /// Formats number with locale-aware decimal and thousands separators.
  String _formatWithSeparators(double value, String currency) {
    final parts = value.toStringAsFixed(2).split('.');
    final intPart = parts[0];
    final decPart = parts[1];

    // Brazilian Real uses dot for thousands, comma for decimals
    if (currency == 'BRL') {
      final buffer = StringBuffer();
      for (var i = 0; i < intPart.length; i++) {
        if (i > 0 && (intPart.length - i) % 3 == 0) {
          buffer.write('.');
        }
        buffer.write(intPart[i]);
      }
      return '${buffer.toString()},$decPart';
    }

    // Default: comma for thousands, dot for decimals (USD, EUR, GBP)
    final buffer = StringBuffer();
    for (var i = 0; i < intPart.length; i++) {
      if (i > 0 && (intPart.length - i) % 3 == 0) {
        buffer.write(',');
      }
      buffer.write(intPart[i]);
    }
    return '${buffer.toString()}.$decPart';
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
