import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../models/models.dart';
import 'balance_calculator.dart';

/// Localized strings for PDF generation.
/// Since PDF generation happens outside of widget context,
/// we need to pass localized strings explicitly.
class PdfStrings {
  final String membersCount;
  final String expensesCount;
  final String created;
  final String currency;
  final String description;
  final String paidBy;
  final String amount;
  final String totalSpent;
  final String finalBalances;
  final String suggestedSettlements;
  final String allSettled;
  final String unknown;

  const PdfStrings({
    required this.membersCount,
    required this.expensesCount,
    required this.created,
    required this.currency,
    required this.description,
    required this.paidBy,
    required this.amount,
    required this.totalSpent,
    required this.finalBalances,
    required this.suggestedSettlements,
    required this.allSettled,
    required this.unknown,
  });
}

/// Service for generating and exporting PDF summaries.
class PdfExporter {
  const PdfExporter();

  /// Generates a PDF summary of the trip.
  Future<Uint8List> generateTripSummary({
    required Trip trip,
    required List<Member> members,
    required Map<String, String> memberNames,
    required List<Expense> expenses,
    required BalanceResult balanceResult,
    required PdfStrings strings,
  }) async {
    final pdf = pw.Document();
    final dateFormat = DateFormat('MMM d, yyyy');

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (context) => [
          // Header
          _buildHeader(trip, dateFormat, strings),
          pw.SizedBox(height: 20),

          // Members Section
          _buildMembersSection(members, memberNames, strings),
          pw.SizedBox(height: 20),

          // Expenses Section
          _buildExpensesSection(expenses, memberNames, trip.currency, strings),
          pw.SizedBox(height: 20),

          // Summary Section
          _buildSummarySection(balanceResult, trip.currency, strings),
          pw.SizedBox(height: 20),

          // Balances Section
          _buildBalancesSection(
            balanceResult,
            memberNames,
            trip.currency,
            strings,
          ),
          pw.SizedBox(height: 20),

          // Settlements Section
          _buildSettlementsSection(
            balanceResult.transfers,
            memberNames,
            trip.currency,
            strings,
          ),
        ],
      ),
    );

    return pdf.save();
  }

  pw.Widget _buildHeader(Trip trip, DateFormat dateFormat, PdfStrings strings) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          trip.title,
          style: pw.TextStyle(fontSize: 28, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 8),
        pw.Text(
          strings.created.replaceAll(
            '{date}',
            dateFormat.format(trip.createdAt),
          ),
          style: const pw.TextStyle(fontSize: 12, color: PdfColors.grey700),
        ),
        pw.Text(
          strings.currency.replaceAll(
            '{currency}',
            BalanceCalculator.getCurrencySymbol(trip.currency),
          ),
          style: const pw.TextStyle(fontSize: 12, color: PdfColors.grey700),
        ),
        pw.Divider(thickness: 2),
      ],
    );
  }

  pw.Widget _buildMembersSection(
    List<Member> members,
    Map<String, String> memberNames,
    PdfStrings strings,
  ) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          strings.membersCount.replaceAll('{count}', members.length.toString()),
          style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 8),
        pw.Wrap(
          spacing: 16,
          runSpacing: 4,
          children: members
              .map(
                (m) => pw.Container(
                  padding: const pw.EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: pw.BoxDecoration(
                    color: PdfColors.grey200,
                    borderRadius: pw.BorderRadius.circular(4),
                  ),
                  child: pw.Text(memberNames[m.id] ?? strings.unknown),
                ),
              )
              .toList(),
        ),
      ],
    );
  }

  pw.Widget _buildExpensesSection(
    List<Expense> expenses,
    Map<String, String> memberNames,
    String currency,
    PdfStrings strings,
  ) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          strings.expensesCount.replaceAll(
            '{count}',
            expenses.length.toString(),
          ),
          style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 8),
        pw.Table(
          border: pw.TableBorder.all(color: PdfColors.grey300),
          columnWidths: {
            0: const pw.FlexColumnWidth(3),
            1: const pw.FlexColumnWidth(2),
            2: const pw.FlexColumnWidth(1.5),
          },
          children: [
            // Header row
            pw.TableRow(
              decoration: const pw.BoxDecoration(color: PdfColors.grey200),
              children: [
                _tableCell(strings.description, isHeader: true),
                _tableCell(strings.paidBy, isHeader: true),
                _tableCell(strings.amount, isHeader: true),
              ],
            ),
            // Data rows
            ...expenses.map(
              (e) => pw.TableRow(
                children: [
                  _tableCell(e.description),
                  _tableCell(memberNames[e.payerMemberId] ?? strings.unknown),
                  _tableCell(
                    BalanceCalculator.formatAmount(e.amountCents, currency),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  pw.Widget _buildSummarySection(
    BalanceResult result,
    String currency,
    PdfStrings strings,
  ) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(16),
      decoration: pw.BoxDecoration(
        color: PdfColors.blue50,
        borderRadius: pw.BorderRadius.circular(8),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.center,
        children: [
          pw.Text(
            '${strings.totalSpent}: ',
            style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
          ),
          pw.Text(
            BalanceCalculator.formatAmount(result.totalSpentCents, currency),
            style: pw.TextStyle(
              fontSize: 20,
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.blue900,
            ),
          ),
        ],
      ),
    );
  }

  pw.Widget _buildBalancesSection(
    BalanceResult result,
    Map<String, String> memberNames,
    String currency,
    PdfStrings strings,
  ) {
    final sortedBalances = result.balances.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          strings.finalBalances,
          style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 8),
        ...sortedBalances.map((entry) {
          final memberName = memberNames[entry.key] ?? strings.unknown;
          final balance = entry.value;
          final color = balance > 0
              ? PdfColors.green700
              : (balance < 0 ? PdfColors.red700 : PdfColors.grey700);

          return pw.Container(
            padding: const pw.EdgeInsets.symmetric(vertical: 4),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(memberName),
                pw.Text(
                  BalanceCalculator.formatBalanceWithSign(balance, currency),
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  pw.Widget _buildSettlementsSection(
    List<Transfer> transfers,
    Map<String, String> memberNames,
    String currency,
    PdfStrings strings,
  ) {
    if (transfers.isEmpty) {
      return pw.Container(
        padding: const pw.EdgeInsets.all(16),
        decoration: pw.BoxDecoration(
          color: PdfColors.green50,
          borderRadius: pw.BorderRadius.circular(8),
        ),
        child: pw.Center(
          child: pw.Text(
            strings.allSettled,
            style: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.green700,
            ),
          ),
        ),
      );
    }

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          strings.suggestedSettlements,
          style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 8),
        ...transfers.map((t) {
          final from = memberNames[t.fromMemberId] ?? strings.unknown;
          final to = memberNames[t.toMemberId] ?? strings.unknown;

          return pw.Container(
            margin: const pw.EdgeInsets.symmetric(vertical: 4),
            padding: const pw.EdgeInsets.all(12),
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: PdfColors.grey300),
              borderRadius: pw.BorderRadius.circular(4),
            ),
            child: pw.Row(
              children: [
                pw.Expanded(
                  child: pw.Row(
                    children: [
                      pw.Text(from, style: const pw.TextStyle(fontSize: 14)),
                      pw.Padding(
                        padding: const pw.EdgeInsets.symmetric(horizontal: 10),
                        child: pw.Container(
                          width: 24,
                          height: 10,
                          child: pw.CustomPaint(
                            size: const PdfPoint(24, 10),
                            painter: (canvas, size) {
                              final paint = PdfColor.fromInt(0xFF666666);
                              final y = size.y / 2;
                              // Draw line
                              canvas
                                ..setStrokeColor(paint)
                                ..setLineWidth(1.2)
                                ..moveTo(0, y)
                                ..lineTo(size.x - 5, y)
                                ..strokePath();
                              // Draw arrowhead
                              canvas
                                ..setFillColor(paint)
                                ..moveTo(size.x, y)
                                ..lineTo(size.x - 6, y - 3)
                                ..lineTo(size.x - 6, y + 3)
                                ..closePath()
                                ..fillPath();
                            },
                          ),
                        ),
                      ),
                      pw.Text(to, style: const pw.TextStyle(fontSize: 14)),
                    ],
                  ),
                ),
                pw.Text(
                  BalanceCalculator.formatAmount(t.amountCents, currency),
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    color: PdfColors.blue700,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  pw.Widget _tableCell(String text, {bool isHeader = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Text(
        text,
        style: pw.TextStyle(fontWeight: isHeader ? pw.FontWeight.bold : null),
      ),
    );
  }

  /// Opens the system share sheet with the PDF.
  Future<void> sharePdf(Uint8List pdfBytes, String filename) async {
    await Printing.sharePdf(bytes: pdfBytes, filename: filename);
  }

  /// Opens the system print dialog.
  Future<void> printPdf(Uint8List pdfBytes) async {
    await Printing.layoutPdf(onLayout: (format) async => pdfBytes);
  }
}
