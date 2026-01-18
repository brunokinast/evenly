import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/services.dart';

/// Provider for the PdfExporter.
final pdfExporterProvider = Provider<PdfExporter>((ref) {
  return const PdfExporter();
});
