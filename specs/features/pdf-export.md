# PDF export

## Description

Any member can export a trip summary as a PDF to save or share.

## Acceptance criteria

- **PDF-1** The PDF contains: trip name, created date, currency; member list; expense list (description, paid by, amount); totals; final balances; suggested settlements.
- **PDF-2** Text is in the user's app language; amounts use the trip currency format (EXP-2).
- **PDF-3** File name: the trip name with symbols removed and spaces replaced by `_`, plus `_summary.pdf`.
- **PDF-4** On Android it opens the system share/save sheet; on web it downloads or opens the share sheet where supported.
- **PDF-5** Export shows progress and reports failure clearly.
- **PDF-6** Names, the trip name and descriptions print correctly in any script: every Latin accent, Vietnamese, Greek and Cyrillic from a font inside the app (works offline); other scripts (Chinese, Japanese, Korean, Arabic, Hebrew, Thai, Indic and more) and emoji (black and white) from Google's Noto fonts, downloaded at export time with only the characters this trip uses and only for the scripts it uses. Google receives only that set of characters, never the text. A character that can't be fetched (offline) prints as "?".
