# Performance

How fast Evenly is, how to measure it, and what keeps it fast. Performance is the user's top priority; typical trips (a few people, tens of expenses) are the focus, very large trips are out of scope.

## How to measure

- **In-app marks** (`src/lib/perf.ts`): `js-ready`, `firebase-ready`, `auth-ready`, `snapshot:<trips|trip|expenses>:<cache|server>` (with the document count), `painted:<welcome|home|trip|form>` (first frame showing the screen's data), `save:tap`, `save:confirmed`. Cheap; read only by the harness.
- **Harness** `node scripts/perf.mjs [--size typical|big|stress] [--network slow|good] [--runs 5] [--no-build] [--label x]`: a build against the emulators (`npm run emulators` first), Pixel 7 viewport, CPU 4× slower; "slow" = 150 ms latency, 1.6/0.75 Mbps (Lighthouse mobile), "good" = 40 ms, 9/3 Mbps. Sizes: main trip with 6 people·40 expenses / 8·150 / 20·1000, plus two small trips. Prints medians; JSON in `perf-results/` (gitignored).
- **Gotcha**: a Firestore emulator that has run for hours slows to 0.4–2 s per write (a fresh one: ~20 ms), which looks like an app problem. The harness clears its data (and re-seeds the demo trip) when writes are slow; otherwise restart it.

## Targets and where we are

Medians, ms. Lab = harness, typical trip, slow network, CPU 4×. Real = live site, slow 4G, CPU 4× (2026-10-29). S25 = the user's Galaxy S25, Android app (2026-10-28, big trip).

| Journey                                 | Target |  Lab | Real | S25 |
| --------------------------------------- | -----: | ---: | ---: | --: |
| First open → name screen                |   2500 | 2275 | 1679 |     |
| Returning launch → trips on screen      |   1000 |  384 |  352 | 224 |
| Home → trip                             |    300 |  133 |   72 | 151 |
| Add expense → form ready                |    150 |   28 |   30 |   9 |
| Save → back on the trip, expense listed |    100 |   85 |   64 |  37 |

## What keeps it fast (don't undo without measuring)

- **Writes don't wait for the server** (EXP-8, APP-9): Firestore shows a write locally at once; screens don't await writes that change existing documents. Creating a trip, joining and invite codes still wait (a trip the server doesn't have yet can't be read).
- **Launch copy on the web** (APP-10, ADR 0007): Auth (web) always re-checks the saved login with the server before Firestore answers even from its cache, and there's no setting to skip it, so Home shows a copy of the last visit's list meanwhile (735 → 384 ms).
- **Held trips**: Home keeps listeners on its top 3 trips (`holdTrip`), so opening one finds its data ready (first visit 692 → 133 ms).
- **Touch-down start**: a trip Home doesn't hold starts its listeners when the finger touches its row, ~0.1 s before the tap opens it.
- **Welcome doesn't wait for the identity**: the name screen shows at once while the anonymous identity is created; Continue waits for it only if needed.
- **Auth without the popup library** (`initializeAuth` in `src/data/firebase.ts`): only anonymous sign-in is used, so Google's api.js and iframe never load (~550 ms off every web launch).
- **Download order** (`vite.config.ts`): Firebase chunks are preloaded only when the files are local (service worker or Android app), so a first open isn't slowed by them; the production page preconnects to Auth and Firestore.
- **Service worker**: `skipWaiting` (an update takes over in the background instead of delaying the next launch by ~1 s); the PDF code and fonts are cached on first use, not on every update.
- **Single-tab Firestore cache** on the web (~90 ms faster launch; a second tab works without offline data).
- **Expense list**: day groups use `content-visibility: auto` and the list is memoized, so opening a sheet doesn't re-render every row.

## Decided against

- **Firebase JS SDK on Android** instead of the native plugins: only ~55 ms faster on the S25 when opening a trip, and every Android user would get a new identity (relink). Native plugins stay.
- **Firestore Lite**: much smaller, but has no live listeners.
- **Native early start of Firestore in `MainActivity`**: no measurable gain.
