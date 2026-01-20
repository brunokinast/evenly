import 'package:flutter/material.dart';

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
