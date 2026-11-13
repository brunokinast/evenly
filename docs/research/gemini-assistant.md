# Research: adding expenses through the Gemini assistant (2026-11-13)

Goal (user): say to Gemini on the phone "Add to trip X that I spent 40 dollars split between Y, Z and me", or just "add 40 dollars to my trip" (last used trip, everything else default), and see a card with the result, like Samsung Clock or Google Keep do.

Nothing built yet. Status of each route as of this date; re-check before building.

## Outcome

Built and shipped (Android 1.5, 2026-11-13) as the Calendar bridge with a Gemini skill and an in-app review: ADR 0008, specs/features/assistant.md. Tested end to end on the user's phone: "Evenly, jantar 60 dividido com a Rita" → event `60 | jantar | Rita | |` → reviewed and added in Evenly → event deleted from the calendar.

The Connected Apps waitlist form (Play Console, Round 3) is kept filled in but not sent, by the user's choice: if access opens up, a direct Android MCP integration could replace the calendar step and reuse the same review and draft code.

## Routes

| Route                                                       | What it is                                                                                                                                                                                           | Status for a small app like Evenly                                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **AppFunctions** ("Android MCP")                            | The app declares on-device functions (Kotlin, `androidx.appfunctions`); Gemini picks one and calls it with parameters from the prompt. Runs locally, uses the app's own login and data. Android 16+. | Library at 1.0.0-rc01 (2026-11-04). Gemini calling third-party apps: **private preview, allowlisted** ("only a limited number of apps and system agents can access the entire pipeline"). Early Access Program form exists; signing up doesn't grant access. No GA date found. |
| **Connected Apps Platform** (announced 2026-10-28, preview) | Google's registration console for Gemini/Search integrations. Two types: remote MCP server (Gemini on Android, iOS, web) or Android MCP (= AppFunctions).                                            | Remote MCP needs: an HTTPS server, OAuth 2.1 account linking, domain verification, Terms + Privacy pages, ≥3 tools/prompts, Google review before release (testers can use it earlier; testers must be @gmail.com). Android MCP access still private preview.                   |
| **Custom MCP app** in the Gemini app                        | A person adds an MCP server URL in gemini.google.com; then usable in Gemini web and mobile. Writes always ask for confirmation.                                                                      | **US only, 18+, personal account, English only**, Keep Activity on. Some sources say it needs a paid Gemini plan (unverified).                                                                                                                                                 |
| Gemini screen automation                                    | Gemini taps through an app's UI itself.                                                                                                                                                              | Only apps Google tuned (food, rides…); no developer opt-in.                                                                                                                                                                                                                    |
| App Actions (`shortcuts.xml`)                               | Old Google Assistant built-in intents.                                                                                                                                                               | Assistant on phones ended 2026-09-28; no evidence Gemini uses them.                                                                                                                                                                                                            |

## What the user's phone shows (Galaxy S25, Android 17 / API 37, One UI 9)

`adb shell cmd app_function list-app-functions`:

- Only Samsung and Google system apps expose functions: Samsung Clock (18, e.g. `clock/createAlarm`), Calendar, Contacts, Dialer, Gallery, Internet, My Files, call screen; Google Play services, Messages, Google app.
- Almost all use **predefined schemas** (`schemaCategory/schemaName`, e.g. `clock/createTimer`). There's no expense/finance schema.
- **Google Keep has no AppFunctions**: its Gemini link is Google's own server-side integration, not something an app can copy.
- Only `com.google.android.googlequicksearchbox` (the Google app, where Gemini runs) holds `EXECUTE_APP_FUNCTIONS`.
- The shell command has `purge-allowlist-cache`: callers/apps are gated by an allowlist.

Extracting other apps' APKs wouldn't help: they work because they're on the allowlist or use Google's own backend, and the official docs/sample show the code pattern more clearly.

## The card

- Samsung Clock's card comes from Gemini, drawn for the predefined `clock/*` schemas. How Gemini displays results of custom (non-schema) functions isn't documented; the library has a "user visible description" for functions and experimental text resources in responses.
- MCP route: Gemini shows confirmation cards for write tools (`destructiveHint`); "MCP Apps" (custom HTML UI inside Gemini) is beta.

## Testing without Gemini access

- `adb shell cmd app_function execute-app-function --package … --function … --parameters '{…}'` (Android 17 phones have it; the S25 does).
- Google's **AppFunctions Testing Agent** (github.com/android/appfunctions, `agent/`): installed and launched over adb with shell privileges (`run_privileged.sh`), so it should work on a normal phone; its `retail` flavor uses a Gemini API key to act as an LLM agent. A stand-in for Gemini, not Gemini itself. WooCommerce's proof of concept (woocommerce-android PR #16840) tested exactly this way because Gemini couldn't call them.

## What it would take in Evenly (AppFunctions route)

- `compileSdk` 37 (now 36), Kotlin + KSP in the Capacitor Android project, `androidx.appfunctions` 1.0.0-rc01.
- An `AppFunctionService` that runs without the WebView. Two designs:
  1. **Write directly** with the native Firestore SDK the app already bundles. Fast and card-friendly, but duplicates in Kotlin what `src/domain` + `src/data/commands.ts` do in TypeScript (splits, validation, "last used trip", member matching). Maintainability cost.
  2. **Open Evenly's Add expense form pre-filled** (function returns a link; WooCommerce does this for writes). Reuses all existing code; the user taps Save. Not a card in Gemini.
- Android app only (no website/iPhone). Evenly is distributed by GitHub APK; one unconfirmed report says Android MCP in the Connected Apps console is tied to a Google Play app.
- Google's skill rules: expose only safe tasks the UI already offers; descriptions say what a function does.

## Alternative under our control

An in-app "type or say it" quick add (e.g. Firebase AI Logic calling a Gemini model from the client with structured output, protected by App Check): works today on web, iPhone and Android, any language, no Google approval. Not the system assistant, though.

## Sources

- https://developer.android.com/ai/appfunctions
- https://developer.android.com/jetpack/androidx/releases/appfunctions
- https://github.com/android/skills/tree/main/device-ai/appfunctions
- https://github.com/android/appfunctions (sample + Testing Agent)
- https://developers.google.com/connected-apps , /gpc/perform-the-steps , /connected-apps-policy , /mcp/dev-mode
- https://support.google.com/gemini/answer/17209137 (custom apps)
- https://github.com/woocommerce/woocommerce-android/pull/16840
- https://developer.android.com/blog/posts/the-intelligent-os-making-ai-agents-more-helpful-for-android-apps
- https://firebase.google.com/docs/ai-logic

## Round 2: "only on my phone" (2026-11-13)

- **The phone's OS doesn't block it.** `appsearch/...enable_app_function_agent_allowlist_check=false` on the S25: Android itself would let the Google app call Evenly's functions. The gate is inside Gemini (Google app + Google's servers), which can't be changed without root. A Galaxy A34 developer had functions indexed and enabled, and Gemini still never called them (google-gemini/cookbook#1151, closed "not planned").
- **Official tester path exists** (developer.android.com/ai/appfunctions/create-manage-connected-apps): in Google Connected Console, create an "Android MCP" connected app linked to a **Google Play app** (Play developer account; the app can stay in an internal-testing draft, never published), upload an `.aab` with AppFunctions, add testers (personal @gmail.com). Testers who install that exact build (sideloading allowed) can use it in the real Gemini app on Android (`@Evenly …` or natural language) **without Google's review**; review happens only on a production Play release. Also needs: icon, ≥3 capabilities and example prompts, Privacy Policy and Terms URLs. Catch: Console access is by preview application ("access opening in phases"; one unverified report says US developers first).
- **Stand-in available today:** Google's Testing Agent (own Gemini API key) on the phone calls Evenly's functions; it's an app you open, not the system Gemini.
- **Bridge idea (works with the real Gemini today, unverified):** Gemini already creates calendar events (Samsung Calendar exposes `calendar/createEvent`; Google Calendar too) and shows its own card. Evenly could read a dedicated "Evenly" calendar (Android calendar permission) and turn events into expenses. Awkward phrasing; depends on Gemini letting you pick the calendar.
- Ruled out: root; custom MCP via a US VPN (against the terms, English only, needs a server).

## Round 3: the application form and "prototype today" (2026-11-13)

- The user's Google account has a Play developer account ("Bruno Kinast", personal) with the app "Evenly - Divida gastos" in production; Connected Console shows 404 (no access).
- The application is a Play Console support form (`create-support-ticket?form=46`): a **waitlist** for "production publishing access". "Capacity during the preview is strictly limited… a small number of partners with production-ready connected apps… We will contact you only if your app is selected." Filled in for Evenly (Android MCP, Gemini app, LATAM, < 1M DAU, category Productivity).
- "Prototype today without applying" = **Gemini Apps Developer Mode** (gemini.google.com/devmode): only for remote HTTPS MCP servers, not AppFunctions. On the user's account the URL redirects to the normal Gemini app (not available; secondary sources say US-only, like custom apps).

## Round 4: bridges through things Gemini already does (2026-11-13)

Idea: Gemini writes somewhere it already supports (and shows its own card); the Evenly Android app (sideloaded, so restricted permissions are fine) reads it on the phone and turns it into an expense. No server, no Google approval.

| Bridge                                           | Gemini side                                                                                                                                                                                         | Evenly side                                                                                                                                                                  | Verdict                                                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Calendar**                                     | Creates events, now also on **secondary calendars** of the same Google account ("add … to my Evenly calendar"). Can't set description or invitees; the title carries the text. Shows an event card. | Reads the synced event from Android's calendar store (`READ_CALENDAR`); a JobScheduler content-URI trigger can react in the background; deletes it after (`WRITE_CALENDAR`). | **Best candidate.** Unknowns: sync delay to the phone, whether Gemini rewrites the title.                              |
| SMS to yourself                                  | Sends messages via Google Messages (Samsung Messages retired 2026-07) and WhatsApp, with a confirmation card.                                                                                       | `RECEIVE_SMS` broadcast.                                                                                                                                                     | Risky: messages between RCS users aren't SMS and third-party apps can't read them; WhatsApp to self is unreadable.     |
| Google Tasks                                     | Creates tasks/reminders.                                                                                                                                                                            | Only via the Tasks REST API: Google sign-in + OAuth in Evenly.                                                                                                               | Possible, heavier.                                                                                                     |
| Google Keep / Samsung Notes / alarms / bookmarks | Supported by Gemini.                                                                                                                                                                                | No API another app can read.                                                                                                                                                 | No.                                                                                                                    |
| Accessibility service                            | User says "Evenly: 40 dollars …" to Gemini.                                                                                                                                                         | Reads Gemini's screen text and acts; can show its own overlay card.                                                                                                          | Works with anything but fragile and reads every screen; sideloaded apps need "allow restricted settings". Last resort. |

Parsing the text ("40 dollars dinner split with Ana and Bia", optional trip name; defaults: last used trip, I paid, everyone): simple rules on known trip/member names, or the on-device model (ML Kit GenAI Prompt API / Gemini Nano on the S25), no key or server.

Where the logic runs: (a) when Evenly opens, through a small native plugin that hands events to the existing TypeScript code (reuses everything; the expense appears only once the app is opened), or (b) in the background in Kotlin with the native Firestore SDK (instant, but duplicates the split logic).

## Round 5: Calendar bridge tested on the real phone (2026-11-13)

Driven over adb: `am start -n com.google.android.apps.bard/.shellapp.BardEntryPointActivity`, `input text`, tap send; results read with `content query --uri content://com.android.calendar/...` (the shell can read the calendar store).

- Created a secondary Google calendar "Evenly" (calendar.google.com). It appeared on the phone as `_id=8` after a sync.
- "Add dinner 40 dollars split with Ana and Bia to my Evenly calendar today" → Gemini asked to connect **Contacts** first (it read the names as people); declined, and it stopped.
- "Create an all day event today in my Evenly calendar titled 40 dollars dinner split Ana Bia" → done; card "Agenda: 40 dollars dinner split Ana Bia, Fri Nov 13". Title kept word for word.
- "Add taxi 25 dollars to my Evenly calendar" → done, card "Taxi 25 dollars", all-day today. **On the phone's calendar store 7 s after sending**, with no forced sync.
- So: the bridge works with the real Gemini today, on the user's account and phone, with Gemini's own card. Open points: names in the prompt trigger the Contacts permission (connect it once, or the parser treats any words as names); Gemini may capitalize or reorder words, so Evenly's parser must be lenient.

## Round 6: how Gemini picks apps, probed on the phone (2026-11-13)

- **Logcat** (Google app, process `googlequicksearchbox:search`) when Gemini starts a query: it lists every app function on the phone and resolves each against the schemas it knows; others log `Unknown schema [category=…]` or `Unable to resolve AppFunctionMetadata` (custom, schema-less functions like Evenly's would be dropped here; same error as cookbook#1151).
- **Known schemas** (from the Google app's code): `calendar/*`, `clock/*` (alarms, timers, stopwatch), `notes/*` (createNote, findNotes, folders…), `tasks/*` (createTask, task categories…), `memory/*`, plus fitness and device state. No finance/expense schema.
- Samsung declares its functions with a plain `assets/app_function.xml` (`schema_category`/`schema_name`/`schema_version`) on a service with `BIND_APP_FUNCTION_SERVICE`; nothing signed.
- **Probe app** (built with the SDK command-line tools, platform `AppFunctionService`) declaring `calendar/createEvent`, `notes/createNote`, `notes/findNotes`, `tasks/createTask`, `tasks/findTasks`, `tasks/findTaskCategories`: registered (`cmd app_function list` / `execute` worked), and Gemini **did resolve** the schemas (no warnings) — but "Create a note in Evenly…" → "I don't have access to an integration or tool for Evenly"; never called.
- "Create a note saying taxi 25 dollars" → **Google Keep** (server-side integration), Keep card. Asked for other notes apps, Gemini listed a fixed set: Keep, Samsung Notes, Xiaomi, OPPO, OnePlus, HONOR, Lenovo, vivo Notes, TECNO Notepad.
- Gemini → Settings → Personal Intelligence → **Connected apps** lists installed integrations: Samsung Calendar and Samsung Gallery (AppFunctions), Keep, Workspace, etc. The probe never appeared.
- **Spoof test**: probe reinstalled under Samsung Notes' package name (`com.samsung.android.app.notes`, not installed on this phone), label "Samsung Notes". Gemini still used Keep for "create a note in Samsung Notes", and it didn't appear in Connected apps → the allowlist checks more than the package name (most likely the signing certificate), and it's delivered from Google's servers (not in the app's code).
- Both probes uninstalled.

**Conclusion:** without root, Gemini will only call apps on Google's server-side list, matched by identity (package + signature). Ways that work today: the Calendar bridge (tested, Round 5); Google Tasks via its REST API (needs Google sign-in in Evenly); reading Gemini's screen via an accessibility service (fragile).

- **Retry after a full phone reboot** (user's suggestion), with two fakes: `com.samsung.android.app.notes` ("Samsung Notes") and `com.miui.notes` (Xiaomi Notes, also on Gemini's list). After reboot: Connected apps still only showed Keep; "create a note in Samsung Notes" still went to Keep; no log line mentioned either package. Uninstalled.

## Round 7: a Gemini skill makes the Calendar bridge natural (2026-11-13)

- Gemini → Personalize → **Skills** (Habilidades) → "+" → create manually: name, description, instructions. Created skill `evenly` (Gemini lowercases names): "When I mention Evenly or ask to add an expense for Evenly, create an all-day event for today in my "Evenly" calendar. The event title must be exactly the expense as I said it, without the word Evenly (for example: taxi 25 dollars split with Ana and Bia). Names are trip members, not contacts: never look up contacts and never invite anyone. Then confirm in one short sentence."
- "Evenly, dinner 60 dollars split with Ana and Bia" → "Logged the expense to your Evenly calendar." + card "dinner 60 dollars split with Ana and Bia"; **no Contacts prompt**; on the phone 13 s later.
- "Evenly, uber 32 reais dividido com a Ana" → same, title kept in Portuguese. This one hadn't reached the phone after ~2 min until a sync was requested (`requestsync … -a com.android.calendar`), then it appeared at once → Evenly should request a calendar sync itself when it opens / checks.
- Tooling note: `adb shell input text` mangles long text (keyboard autocorrect). A tiny helper app that sets the clipboard from an intent, plus Ctrl+A / Ctrl+V key combos, pastes exactly.
