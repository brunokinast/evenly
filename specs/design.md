# Design

Visual and interaction rules for Evenly. Screens must follow this file. The interactive mockup (`specs/design-mockup.html`; open it locally, see below) shows the rules applied to Home, Trip and Add expense. When this file and the mockup disagree, this file wins.

## Direction
Calm, cool neutrals with one warm accent, **marigold**, the color of luggage tags and boarding-pass stubs. The accent marks the single primary action on a screen and nothing else. Money is the content, so amounts get the largest, boldest type and always line up (tabular figures). Green and red mean only "gets back" and "owes".

## Tokens
Implemented as CSS variables (shadcn/ui convention) and mapped into Tailwind. Components use tokens only, never literal colors.

### Color
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F6F7F9` | `#0F1115` | App background |
| `--surface` | `#FFFFFF` | `#171A20` | Cards, sheets, bars |
| `--surface-2` | `#EEF0F4` | `#20242C` | Inputs, chips, pressed rows |
| `--border` | `#DDE1E8` | `#2C313B` | Dividers, outlines |
| `--fg` | `#171A21` | `#ECEEF2` | Main text |
| `--fg-muted` | `#5D6472` | `#9AA2B1` | Secondary text, captions |
| `--accent` | `#F2B233` | `#F5BE4B` | Primary button, active tab mark, focus ring |
| `--accent-fg` | `#1A1405` | `#1A1405` | Text/icons on accent |
| `--accent-soft` | `#FDF1D6` | `#3A2F17` | Trip icon tiles, selected rows |
| `--accent-text` | `#8A5A00` | `#F5BE4B` | Accent-colored text/links on surfaces |
| `--positive` | `#18794E` | `#4CC38A` | "Gets back" |
| `--negative` | `#C33B2C` | `#F07A6A` | "Owes", destructive actions |

Avatar colors: 6 soft background/ink pairs (`--av1`…`--av6`), picked by a stable hash of the member id, so a person keeps their color everywhere.

All text meets WCAG AA (4.5:1) on its background in both themes. Text never uses `--accent` directly on light surfaces (too low contrast); use `--accent-text`.

### Type
- One family: **Hanken Grotesk** (variable, weights 400–700), self-hosted as a single `woff2` (no Google Fonts request at runtime, for APP-4). Fallback: `system-ui, sans-serif`.
- All numbers use `font-variant-numeric: tabular-nums`.

| Role | Size / line height | Weight |
|---|---|---|
| Amount display (Add expense) | 44 / 52 | 700 |
| Screen title | 24 / 30 | 700 |
| Section total (e.g. "Total spent") | 28 / 34 | 700 |
| Row title, button | 16 / 22 | 600 |
| Body, inputs | 16 / 24 | 400 |
| Caption, meta ("Paid by Ana · Split between 5") | 14 / 20 | 400 |
| Group header, tag (uppercase, +0.04em tracking) | 12 / 16 | 600 |

Inputs are never smaller than 16px (prevents iOS zoom on focus).

### Spacing, radius, elevation
- Spacing on a 4px grid: 4, 8, 12, 16, 24, 32. Screen side padding 16.
- Radius: 10 (buttons, inputs, chips), 16 (cards, list groups), 24 (sheet top corners), full (avatars, tags).
- Elevation: flat by default. Only sheets, the floating Add button and toasts cast a shadow. Lists are grouped on one `--surface` card with dividers, not a card per row.

## Layout and mobile patterns
- **One column, max width 520px**, centered on wide screens. The app is designed for a phone first.
- **Safe areas**: top bar and bottom bars pad by `env(safe-area-inset-*)`; `viewport-fit=cover`.
- **Tap targets** at least 48×48px; rows are full-width tap targets.
- **Top bar**: back (chevron) left, title, then actions right. Home: profile avatar. Trip: an **Invite** button (owner only, labeled, never hidden in a menu) and the "⋯" menu for the rarer owner actions. No hamburger menus.
- **Bottom action bar** (Home): "Join trip" (secondary) and "New trip" (primary) side by side, always reachable by thumb.
- **Bottom tab bar** (Trip only): Expenses · Balances · Members. Labels always visible; active tab = `--fg` label with a marigold pill behind the icon.
- **Add expense button**: floating, bottom-right above the tab bar, marigold, "+ Add expense". Visible on every Trip tab, since adding an expense is the most common action.
- **Bottom sheets** for small choices and short forms (payer, split, date, invite code, profile, join, trip menu, new trip): drag handle, title, content, max 85% height, dismiss by tapping the backdrop or swiping down. The sheet keeps focus inside while open. An open sheet **updates in place** when something inside it changes (toggling a person, switching split mode); it never closes and reopens. Single-choice pickers (payer, date) close on pick.
- **Full screens** only for Add/Edit expense (needs the keyboard and the whole screen) and Welcome.
- **Keyboard first**: screens with a text input focus it on open (EXP-9, TRIP-10, ID-8, INV-3).
- **The keyboard never covers the field being typed in.** The app shell's height follows the visible viewport (`interactive-widget=resizes-content` for Android, `visualViewport` for iOS), so bottom bars and sheets sit directly above the keyboard, and a focused field is scrolled into view.
- **Offline banner** (APP-6): a slim `--fg` on `--surface-2` bar under the top bar, "You're offline. Changes will be possible when you reconnect." Network actions are disabled while it shows.

## Components
- **Buttons**: primary (marigold fill, `--accent-fg` text), secondary (`--surface-2` fill), quiet (`--fg-muted` text only, for minor actions like "Generate a new code"), destructive (`--negative` text; filled only inside its confirmation). A disabled primary turns neutral (`--surface-2` fill, muted text), never a faded marigold. One primary per screen. Busy state: spinner replaces the label and the button is disabled (EXP-8).
- **List row**: leading avatar or icon tile (40px), title + caption, trailing amount or chevron. Divider inset to the text.
- **Expense row** (compact, always two lines): payer's small avatar (the only payer cue; screen readers get "Paid by <name>"), description, amount, and a caption with the time and split: "8:15 PM · Split between all" (or "Split between 3", "Custom split"). Grouped under date headers (Today, Yesterday, then dates); ordered newest first by date and time. Tapping a row opens **Expense details**.
- **Expense details** (bottom sheet, for reading): header with the description and "<date>, <time>", and a small secondary **Edit** button top-right (opens the edit screen). Below, the amount large and left-aligned, with a "Your share X" chip (or "You're not in this split"). Then one list of people with each share; the payer's row has a green "Paid X" caption (a payer outside the split is listed with "Not in split"). No primary button: the sheet is for reading.
- **Trip icon tile**: 44px rounded square, `--accent-soft` fill, icon in `--accent-text`.
- **Avatar**: 32–40px circle with initials (first letter of the first two words). Guests get a dashed outline.
- **Tags**: small pill, uppercase 12px: "You", "Owner", "Guest".
- **Amount**: always formatted by the user's language with the trip currency symbol (EXP-2), tabular. Positive balances `--positive`, negative `--negative`, zero `--fg-muted` with "Settled".
- **Settings list** (Add expense): one grouped card under the description with three 48px rows: icon, label, value right-aligned, chevron: "Paid by · You", "Split · Equally between all", "When · Today, 8:15 PM". Tapping a row opens its sheet. A value that differs from its default is shown in `--accent-text`.
- **Choice pills**: optional single choices inside a sheet (e.g. claiming a guest when joining); selected = `--accent-soft` fill with a marigold outline.
- **Icon picker** (New trip): all 16 icons visible in a 6-column grid; no horizontal scrolling.
- **Money input**: every amount field (the main amount and custom split amounts) works the same way: digits fill from the right in cents, the caret stays at the end, and the value is formatted as you type. In a custom split, fields not typed in show the person's automatic share as grey placeholder text; typing replaces it, and clearing the field returns to the automatic share.
- **Code input** (Join): 6 boxes backed by one numeric input; paste fills all; auto-submits at 6 digits.
- **Toast**: bottom, above bars, auto-hides after 3s, for confirmations ("Expense added") and notices ("Split reset to equal").
- **Confirmation**: a bottom sheet with the consequence in plain words and the destructive button in `--negative`. The browser's `confirm()` is never used.
- **Empty states**: centered vertically and horizontally in the free space; one short sentence of what to do plus the action button. No illustrations.
- **Balances tab order**: stats row, "Your payments", member balances, "Other payments", Export as PDF. What you personally need to do comes first.
- **Suggested payments**: two groups. "Your payments": what you pay (`--negative`) or receive (`--positive`), or "You're settled up". Then "Other payments" between other members, in neutral color, shown only if there are any.
- **Export as PDF**: a subtle ghost button (muted text, small) centered at the end of the Balances tab, available to every member. It isn't in the "⋯" menu.
- **Loading**: skeleton rows in the real layout for first load; never a full-screen spinner after the first paint.

## Where actions live
- **Invite**: labeled button in the trip top bar (owner).
- **"⋯" menu** (owner): Add guest (jumps to the Members tab and focuses the guest field), Rename trip, Delete trip. Non-owners see Leave trip.
- **Remove member** (owner): tap a member row → member sheet → "Remove from trip". Removing an app user turns them into a guest, and the sheet says so. A guest who is in expenses can't be removed: the button is disabled and the sheet says why (MEM-5).
- **Claim a guest** (MEM-7): in the Join sheet, under the trip preview: "Are you one of these? (optional)" with the guest names as choice pills; the button becomes "Join as <name>".
- **Export as PDF**: end of the Balances tab.

## Icons
**Lucide** (shadcn's default set), 20px in rows, 24px in bars, stroke 2. Trip icons (TRIP-4) map to: luggage → `luggage`, flight → `plane`, beach → `tree-palm`, camping → `tent`, restaurant → `utensils-crossed`, home → `house`, celebration → `party-popper`, sports → `trophy`, music → `music`, shopping → `shopping-bag`, car → `car`, boat → `sailboat`, mountain → `mountain`, city → `building-2`, work → `briefcase`, school → `graduation-cap`.

## Motion
Short and functional: sheets slide 200ms ease-out, toasts fade, pressed rows darken. No decorative animation. With `prefers-reduced-motion`, sheets and toasts appear without sliding.

## Screen inventory
| Screen | Kind | Opens with focus on |
|---|---|---|
| Welcome | full screen | name |
| Home (trips, empty state) | full screen | — |
| Trip: Expenses / Balances / Members tabs | full screen with tab bar | — |
| Add / Edit expense | full screen | amount |
| Expense details, New trip, Join trip, Invite, Profile, Trip menu, payer/split/date-and-time pickers, confirmations | bottom sheets | the first input, if any |
| Trip not found | full screen | — |

## Viewing the mockup
Serve the `specs` folder on the local network and open it on a phone connected to the same Wi-Fi:
`python -m http.server 8765 --bind 0.0.0.0 --directory specs`, then `http://<this PC's LAN IP>:8765/design-mockup.html`.
