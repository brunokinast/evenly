# Design

Visual and interaction rules for Evenly. Screens must follow this file. The interactive mockup (`specs/design-mockup.html`; open it locally, see below) shows the rules applied to Home, Trip and Add expense. When this file and the mockup disagree, this file wins.

## Direction

Calm, cool neutrals with one warm accent, **marigold**, the color of luggage tags and boarding-pass stubs. The accent marks the single primary action on a screen and nothing else. Money is the content, so amounts get the largest, boldest type and always line up (tabular figures). Green and red mean only "gets back" and "owes".

## Tokens

Implemented as CSS variables (shadcn/ui convention) and mapped into Tailwind. Components use tokens only, never literal colors.

### Color

| Token           | Light                 | Dark      | Use                                         |
| --------------- | --------------------- | --------- | ------------------------------------------- |
| `--bg`          | `#F6F7F9`             | `#0F1115` | App background                              |
| `--surface`     | `#FFFFFF`             | `#171A20` | Cards, sheets, bars                         |
| `--surface-2`   | `#EEF0F4`             | `#20242C` | Inputs, chips, pressed rows                 |
| `--border`      | `#DDE1E8`             | `#2C313B` | Dividers, outlines                          |
| `--fg`          | `#171A21`             | `#ECEEF2` | Main text                                   |
| `--fg-muted`    | `#5D6472`             | `#9AA2B1` | Secondary text, captions                    |
| `--accent`      | `#F2B233`             | `#F5BE4B` | Primary button, active tab mark, focus ring |
| `--accent-fg`   | `#1A1405`             | `#1A1405` | Text/icons on accent                        |
| `--accent-soft` | `#FDF1D6`             | `#3A2F17` | Trip icon tiles, selected rows              |
| `--accent-text` | `#8A5A00`             | `#F5BE4B` | Accent-colored text/links on surfaces       |
| `--positive`    | `#18794E`             | `#4CC38A` | "Gets back"                                 |
| `--negative`    | `#C33B2C`             | `#F07A6A` | "Owes", destructive actions                 |
| `--scrim`       | `rgb(10 12 16 / .45)` | same      | Backdrop behind sheets                      |

Avatar colors: 6 soft background/ink pairs (`--av1`…`--av6`), picked by a stable hash of the member id, so a person keeps their color everywhere.

All text meets WCAG AA (4.5:1) on its background in both themes. Text never uses `--accent` directly on light surfaces (too low contrast); use `--accent-text`.

### Type

- One family: **Hanken Grotesk** (variable, weights 400–700), self-hosted as a single `woff2` (no Google Fonts request at runtime, for APP-4). Fallback: `system-ui, sans-serif`.
- All numbers use `font-variant-numeric: tabular-nums`.

| Role                                            | Size / line height | Weight |
| ----------------------------------------------- | ------------------ | ------ |
| Amount display (Add expense, trip total)        | 44 / 52            | 700    |
| Screen title                                    | 24 / 30            | 700    |
| Section total (e.g. "Total spent")              | 28 / 34            | 700    |
| Row title, button                               | 16 / 22            | 600    |
| Body, inputs                                    | 16 / 24            | 400    |
| Caption, meta ("Paid by Ana · Split between 5") | 14 / 20            | 400    |
| Group header, tag (uppercase, +0.04em tracking) | 12 / 16            | 600    |

Inputs are never smaller than 16px (prevents iOS zoom on focus).

### Spacing, radius, elevation

- Spacing on a 4px grid: 4, 8, 12, 16, 24, 32. Screen side padding 16.
- Radius: 10 (labeled buttons, inputs, chips, icon tiles, code boxes), 16 (cards, list groups, stat tiles), 24 (sheet top corners), full (avatars, tags, choice pills, icon-only buttons, the floating Add button). Small inner shapes: 6 (checkboxes), 7 (segments inside a segmented control and buttons inside a field, following their curve). No other radii.
- Elevation: flat by default. Only sheets, the floating Add button and toasts cast a shadow. Lists are grouped on one `--surface` card with dividers, not a card per row.

## Layout and mobile patterns

- **One column, max width 520px**, centered on wide screens. The app is designed for a phone first.
- **Safe areas**: top bar and bottom bars pad by `env(safe-area-inset-*)`; `viewport-fit=cover`.
- **Tap targets** at least 48×48px; rows are full-width tap targets.
- **Long text** (APP-8): one line with an ellipsis in rows, top bars, tabs and pills (`min-width: 0` on flex children); wraps in sheet headers and details. Layout must hold at 320px wide with 50-character names.
- **Top bar**: Home: the screen title left, profile avatar right. Trip: **two rows**. The first has back (chevron) on the left and, on the right, an **Invite** button (owner only, small, labeled, never hidden in a menu) and the "⋯" menu. The second has the trip icon tile and the trip name in the screen-title size; a long name wraps to two lines, then ends with an ellipsis. Add/Edit expense: close (✕), a compact title, and Delete when editing. No hamburger menus.
- **Bottom action bar** (Home): "Join trip" (secondary) and "New trip" (primary) side by side, always reachable by thumb. When either label doesn't fit on one line (long translations, small phones), they stack full-width with New trip at the bottom. The same applies to every pair of buttons in the app.
- **Bottom tab bar** (Trip only): Expenses · Balances · Members. Labels always visible; active tab = `--fg` label with a marigold pill behind the icon.
- **Add expense button**: floating, bottom-right above the tab bar, marigold, "+ Add expense". Shown only on the Expenses tab, where the new expense will appear.
- **Bottom sheets** for small choices and short forms (payer, split, date, invite code, profile, join, trip menu, new trip): drag handle, title, content, max 85% height, dismiss by tapping the backdrop or swiping down. The sheet keeps focus inside while open. An open sheet **updates in place** when something inside it changes (toggling a person, switching split mode); it never closes and reopens. Single-choice pickers (payer, date) close on pick.
- **Full screens** only for Add/Edit expense (needs the keyboard and the whole screen) and Welcome.
- **Keyboard first**: screens with a text input focus it on open (EXP-9, TRIP-10, ID-8, INV-3). Exceptions: Edit expense (EXP-9) and the Profile sheet (ID-9) open without focus, since there is no single field to guess. In a form with more choices below the field (New trip, Add/Edit expense), Enter on the last field only closes the keyboard (TRIP-10, EXP-9); in a one-field form it submits.
- **The keyboard closes once typing is done**: a sheet without a text field takes focus off the field underneath (the pickers opened from Add expense), and Join drops the keyboard as soon as a code is found (INV-3). Fields meant for repeated entry (Add guest) keep it.
- **The keyboard never covers the field being typed in.** The app shell's height follows the visible viewport (`interactive-widget=resizes-content` for Android, `visualViewport` for iOS), so bottom bars and sheets sit directly above the keyboard, and a focused field is scrolled into view.
- **Offline banner** (APP-6): a slim `--fg` on `--surface-2` bar under the top bar, "You're offline. Changes will be possible when you reconnect." Network actions are disabled while it shows.

## Components

- **Buttons**: two sizes: standard (48px; every action in screens and sheets) and small (40px, caption-size semibold label; actions in a header: Invite in the trip bar). Labeled buttons use the 10 radius; icon-only buttons are round, except inside a field, where they follow the field's curve (7); the floating Add button is fully rounded. A label is never cut: it fits on one line, or the buttons beside it stack (see Bottom action bar), and as a last resort it wraps. Variants: primary (marigold fill, `--accent-fg` text), secondary (`--surface-2` fill), quiet (`--fg-muted` text only, for minor actions like "Generate a new code"), destructive (`--negative` text; filled only inside its confirmation). A disabled primary turns neutral (`--surface-2` fill, muted text), never a faded marigold. One primary per screen (a sheet counts as its own screen). Busy state: spinner replaces the label and the button is disabled (EXP-8).
- **Text field**: one style everywhere: `--surface-2` fill, no border until focused (marigold border), red border on error, 48px tall (56px on Welcome), 10 radius, 16px text. A visible label above when a form has more than one field; otherwise the placeholder names it (the label stays for screen readers). Placeholders are short enough to never be cut.
- **Field with a submit button**: for one-field forms that are the whole screen or are submitted over and over (Welcome name, Add guest): the field with an icon button inside its right edge (44px on Welcome, 40px elsewhere; radius 7, following the field's curve) (→ "Continue" on Welcome, + "Add" on Add guest), neutral until the input is valid, marigold once it is. Enter submits too.
- **List row**: leading avatar or icon tile (40px), title + caption, trailing amount or chevron. Divider inset to the text.
- **Trip total** (top of the Expenses tab): centered: "Total spent" caption, the amount in the amount-display size (the section-total size when it's long, so it never breaks), and "6 expenses" under it.
- **Expense row** (compact, always two lines): payer's small avatar (the only payer cue; screen readers get "Paid by <name>"), description, amount, and a caption with the time and split: "8:15 PM · Split between all" (or "Split between 3", "Custom split"). Grouped under date headers (Today, Yesterday, then dates); ordered newest first by date and time. Tapping a row opens **Expense details**.
- **Expense details** (bottom sheet, for reading): header with the description (full width, wraps) and "<date>, <time>". Below, centered: the amount large, and "Paid by <name>" with the payer's small avatar. Then one list under the split as its header ("Split between all", "Split between 3", "Custom split"): avatar, name and share per person, in the MEM-6 order, so your own share is the first row ("You"). No chips, captions or tags in the rows. At the bottom, a full-width secondary **Edit** button (opens the edit screen); no primary button, since the sheet is for reading.
- **Trip icon tile**: 44px rounded square, `--accent-soft` fill, icon in `--accent-text`.
- **Avatar**: 32–40px circle with initials (first letter of the first two words). Guests get a dashed outline.
- **Tags**: small pill, uppercase 12px: "You", "Owner", "Guest".
- **Amount**: always formatted by the user's language with the trip currency symbol (EXP-2), tabular. Positive balances `--positive`, negative `--negative`, zero `--fg-muted` with "Settled".
- **Settings list** (Add expense): one grouped card under the description with three 48px rows: icon, label, value right-aligned, chevron: "Paid by · You", "Split · Equally between all", "When · Today, 8:15 PM". Tapping a row opens its sheet. A value that differs from its default is shown in `--accent-text`.
- **Date and time sheet** (EXP-11, EXP-17): no native date or time dialogs (Android's can't be styled and cut their buttons off). A grouped `--surface-2` card with two 64px rows: a 36px icon tile (calendar, clock), a caption label ("Date", "Time") over the value in row weight ("Today, Oct 28", "8:45 PM"), and a chevron. The open row's tile, value and chevron turn accent (`--accent-soft` tile, `--accent-text` value, chevron flipped); its picker slides open under it (height transition, none with reduced motion), one at a time. **Calendar**: month and year with previous/next buttons (next disabled on the current month), narrow weekday initials, a fixed 6-week grid of 40px round days; today has a marigold ring, the chosen day a marigold fill, future days are faded and disabled. **Wheels**: hour and minute columns that scroll and snap, 44px rows, five visible, the middle one on a `--surface` band in bold, the rest muted and fading at the edges; tapping a row scrolls to it. Hours follow the language (24h "20" in Portuguese, "8 PM" in English). **Shortcuts**: inside the open Time row, under the wheels: four equal `--surface` tiles in a row: a label caption over the time ("Lunch / 12:30"); the matching one uses the choice-pill selected style. Then the error line (when shown) and a full-width primary Done.
- **Choice pills**: optional single choices inside a sheet (e.g. claiming a guest when joining); selected = `--accent-soft` fill with a marigold outline.
- **Icon picker** (New trip): all 16 icons visible in a 6-column grid; no horizontal scrolling.
- **Money input**: every amount field (the main amount and custom split amounts) works the same way: digits fill from the right in cents, the caret stays at the end, and the value is formatted as you type. In a custom split, fields not typed in show the person's automatic share as grey placeholder text; typing replaces it, and clearing the field returns to the automatic share. The empty main amount shows a grey zero ("R$ 0,00") as its text, not a placeholder, so the caret sits at its end where digits appear.
- **Code input** (Join): 6 boxes backed by one numeric input; paste fills all; auto-submits at 6 digits.
- **Toast**: bottom, above the bars and above the floating Add button (never covering it), auto-hides after 3s, for confirmations ("Expense added") and notices ("Split reset to equal").
- **Confirmation**: a bottom sheet with the consequence in plain words and the destructive button in `--negative`. The browser's `confirm()` is never used.
- **Empty states**: centered vertically and horizontally in the free space; one short sentence of what to do plus the action button. No illustrations.
- **Install card** (APP-7, Home empty state only): one `--surface` card under the empty-state text: a 44px tile with the `smartphone` icon, title "Get Evenly on your home screen", caption "Opens instantly, like any other app.", then a secondary button with the device's action ("Get the Android app", "Add to Home Screen" or "Install app") and a quiet "Not now". Secondary, not primary: New trip stays the screen's one primary action.
- **Welcome** (first impression, ID-2, ID-8): one centered block in the visible space (it stays centered above the keyboard): the Evenly logo without its tile (coin and name, 56px tall, in `--fg` so it follows the theme; it is the greeting), "What's your name?" as the screen title and the field's label, the name field (56px tall) as a field with a submit button (→, labeled "Continue"; marigold once the name has 2 characters; spinner while saving), and one caption below: "Friends see it in the trips you share. No account needed." An error replaces the caption. Enter submits too. No other buttons or links.
- **"⋯" menu sheet**: the actions as one grouped list (like the Settings list): icon and label per 52px row; a destructive action in `--negative`, last.
- **Invite card** (Members tab, owner alone in the trip): a `--surface` card with the people icon tile, "Invite your friends" and one line of explanation, then a secondary Invite button (the floating Add expense stays the screen's one primary).
- **Profile sheet**: "Your name" field, Theme (System / Light / Dark segmented control, applies instantly), the Install app row (APP-3, when available), then a primary Done.
- **Balances tab order**: stats row, member balances, "Your payments", "Other payments", Export as PDF.
- **Suggested payments**: two groups. "Your payments": what you pay (`--negative`) or receive (`--positive`), or "You're settled up". Then "Other payments" between other members, in neutral color, shown only if there are any.
- **Export as PDF**: a subtle ghost button (muted text, small) centered at the end of the Balances tab, available to every member. It isn't in the "⋯" menu.
- **Loading**: skeleton rows in the real layout for first load; never a full-screen spinner after the first paint.

## Where actions live

- **Invite**: labeled button in the trip top bar (owner).
- **"⋯" menu** (owner): Add guest (jumps to the Members tab and focuses the guest field), Rename trip, Delete trip. Non-owners see Leave trip.
- **Remove member** (owner): tap a member row → member sheet → "Remove from trip". Removing an app user turns them into a guest, and the sheet says so. A guest who is in expenses can't be removed: the button is disabled and the sheet says why (MEM-5).
- **Claim a guest** (MEM-7): in the Join sheet, under the trip preview: "Are you one of these? (optional)" with the guest names as choice pills; the button becomes "Join as <name>".
- **Export as PDF**: end of the Balances tab.

## Brand

- **App icon** (`public/icon.svg`): a marigold rounded tile with a coin in `--accent-fg`: a ring with a "$" inside, split by a diagonal cut (−14°) whose two halves slide slightly apart. At each end of the cut, two short round-ended lines (a longer one and a shorter one, mirrored on the other side) fly outward, as if the coin was just split. Strokes are round-ended and heavy, so it reads at 16px.
- **Logo** (`public/logo.svg`): the same coin without the tile, then "Evenly" in Nunito ExtraBold (800), stored as outlines (no font is loaded for it). Used where the brand is shown at larger size: the Welcome screen (drawn in `--fg` through a CSS mask, so it follows the theme) and the PDF header.
- `scripts/make-icons.mjs` renders the PNGs (install icons, full-bleed tiles for iOS and maskable Android icons, and the PDF logo) from those two files.

## PDF

An A4 report in the light theme's token values (Helvetica, since the PDF can't use the app font):

- **Header**: the Evenly logo (see Brand), "Trip summary" muted on the right; then the trip name (22pt bold, wraps) and "Created <date> · <currency> · <n> members · <n> expenses".
- **Summary**: three tiles on `--surface-2`: Total spent, Per person, Expenses.
- **Suggested payments**: "Ana → Bia" rows with the amount right-aligned, or "All settled! No payments needed."
- **People**: a table in the MEM-6 order: name (with "Guest"), paid, share, balance ("Gets back" in `--positive`, "Owes" in `--negative`, "Settled" muted).
- **Expenses**: a table oldest first: date (short, e.g. "26 Oct"), description, paid by, split ("All", "3 people", "Custom"), amount; thin dividers, long text ends with "…". Total row at the end.
- **Footer** on every page: "Made with Evenly · <export date>" left, "Page x of y" right.

## Icons

**Lucide** (shadcn's default set), 20px in rows, 24px in bars, stroke 2. Trip icons (TRIP-4) map to: luggage → `luggage`, flight → `plane`, beach → `tree-palm`, camping → `tent`, restaurant → `utensils-crossed`, home → `house`, celebration → `party-popper`, sports → `trophy`, music → `music`, shopping → `shopping-bag`, car → `car`, boat → `sailboat`, mountain → `mountain`, city → `building-2`, work → `briefcase`, school → `graduation-cap`.

## Motion

Short and functional: sheets slide 200ms ease-out, toasts fade, pressed rows darken. No decorative animation. With `prefers-reduced-motion`, sheets and toasts appear without sliding.

## Screen inventory

| Screen                                                                                                             | Kind                     | Opens with focus on                         |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------------------------------------------- |
| Welcome                                                                                                            | full screen              | name                                        |
| Home (trips, empty state)                                                                                          | full screen              | —                                           |
| Trip: Expenses / Balances / Members tabs                                                                           | full screen with tab bar | —                                           |
| Add / Edit expense                                                                                                 | full screen              | amount                                      |
| Expense details, New trip, Join trip, Invite, Profile, Trip menu, payer/split/date-and-time pickers, confirmations | bottom sheets            | the first input, if any (not Profile: ID-9) |
| Trip not found                                                                                                     | full screen              | —                                           |

## Viewing the mockup

Serve the `specs` folder on the local network and open it on a phone connected to the same Wi-Fi:
`python -m http.server 8765 --bind 0.0.0.0 --directory specs`, then `http://<this PC's LAN IP>:8765/design-mockup.html`.
