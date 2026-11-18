# Lottery Hub 1.2 — standalone mobile app

The React Native app fetches results directly on the phone. There is no custom results server, website setup, Supabase account, API key, Firebase project or Expo push credential requirement.

## Run or build

Use Node 24 LTS, Java 21 and an Android SDK. From `mobile/`:

```sh
npm ci
npm run android
```

This installs a development build. Start Metro later with `npm start`. Camera OCR uses native ML Kit and requires a native build; it cannot run in Expo Go or the web preview.

For a standalone ARM64 Android test APK:

```sh
npx expo prebuild --platform android
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a -Pandroid.enableMinifyInReleaseBuilds=false
```

Output: `android/app/build/outputs/apk/release/app-release.apk`. This local test build uses the template development signing key. For Play Store distribution, configure a production keystore or an EAS production build. Android version code is 3; app version is 1.2.0.

## Automatic result sources

| Source | Purpose | Status |
| --- | --- | --- |
| [Official LOTIS public catalogue](https://www.lotteryagent.kerala.gov.in/result/public/) | Confirms published draw code/date/number; opens original documents for the user | Official catalogue, **not verification of prize numbers** |
| [India Lottery API](https://indialotteryapi.com/kerala-lottery-api/) | Public JSON history of prize numbers and amounts | Unofficial publisher |
| [KeralaLotteries.net](https://www.keralalotteries.net/) | Public Blogger feed, parsed and compared with the JSON source | Unofficial publisher |

The public JSON API documents unauthenticated read access. The LOTIS PDF download flow currently asks the user to complete a CAPTCHA. The app does not solve/bypass it, manufacture download URLs, or label public publisher data as government verified.

- **PROVISIONAL:** a complete result from public sources whose prize numbers agree. Prize amounts that the sources disagree on are hidden ("see Gazette"). Not government certification.
- **BEING CONFIRMED:** the draw identity conflicts with the official catalogue. Ticket checking pauses for that draw.
- **Some numbers being confirmed:** the sources list a few different numbers in a tier. Numbers both agree on are shown, the disputed ones are counted but left out, and ticket checking pauses for that draw only.
- **OFFICIAL:** reserved for actual official-document verification. The automatic public-source adapters never assign it.

Parsers reject impossible/future dates, results before the draw time, missing amounts, incomplete weekly tiers, duplicate numbers, malformed tickets and inconsistent consolation series. Leading zeros stay intact. Unknown or incomplete records are skipped rather than repaired with invented values. No result is generated from number predictions.

Opening the app fetches results automatically; foreground refresh repeats every two minutes. Source requests are cached separately: JSON history two minutes, comparison feed ten minutes, official catalogue thirty minutes. Pull down to refresh. Private vault and ledger data survive an upgrade from 1.0. Previous server/demo result caches are ignored. Validated history is retained without the previous 180-draw cap.

## Complete archive collection and history ideas

The included dated snapshot was generated with `npm run collect:history`. On 15 November 2026, collection checked all 426 API records and 2,334 feed entries. Validation and deduplication produced 301 distinct draw records. Of those, 262 have usable prize numbers; 39 contain disputed numbers or conflicting identities and are excluded from number analysis. These are source-limited records, not a complete continuous government archive. Some unsupported or incomplete records are rejected.

Each provider's actual prize lists and amounts are retained separately. When number lists agree but only amounts disagree, the draw can contribute to number-frequency analysis; prize checking remains paused. Disputed numbers are never included. Separate archive pages cannot falsely clear an earlier disagreement by comparing a source with itself.

First launch includes this factual snapshot for immediate offline analysis. Daily results merge into it automatically. Resumable pagination revisits the available archive weekly for corrections while the app is open, with saved cursors and polite request pacing. The Picks screen shows sample size, dates, exclusions and collection progress. The dataset uses bounded cache chunks and a larger Android database allowance instead of one oversized storage row.

**History ideas** use every eligible retained draw (or every retained draw for the chosen lottery), not only the recent 30 draws. Each four-digit ending is counted once per draw so consolation series do not inflate frequency. Suggestions sample from historically frequent endings and use a random two-digit prefix, subject to parity and digit-sum filters. At least 20 eligible draws are required. Each suggestion shows its observed draw count and dataset size. **Random ideas** remains available separately.

These are historical pattern suggestions, not forecasts or winning probabilities. Past frequency does not improve the chance of an individual valid ticket in a random draw.

Source HTML/JSON formats can change and publishers can make errors. Inspect source health in the app. Original government documents and the Gazette take priority over all public summaries. No redistribution licence is asserted for the public publishers; review their current terms before commercial distribution.

## Device alerts

**More → Result alerts** requests notification permission and registers local background checks. No push server is used. Background work has a requested minimum interval of 15 minutes; Android/iOS controls the actual schedule. Battery restrictions, force-stop and connectivity can delay or prevent checks. Foreground checks continue while the app is open. These are periodic device notifications, not guaranteed instant push.

Existing results are seeded as already seen when enabling alerts. Only new, nonconflicting results for followed lotteries trigger a notification, and tapping one opens the draw. Historical backfill does not trigger a flood of notifications.

## Camera and OCR

Barcode scanning uses `expo-camera`; image OCR uses native on-device Google ML Kit. Camera captures and resized OCR working images are deleted after reading; gallery originals are retained. Photos are not uploaded for OCR. If a barcode contains an internal issuer serial rather than the printed ticket number, use Photo OCR. Always review series, six digits and draw before checking.

## Validation

```sh
npm run typecheck
npm test
npm run export
```

Tests cover OCR candidates, leading zeros, full-series checking, source parsing, prize amounts, completeness, future dates, duplicate entries, disagreement blocking and conflict persistence. The source fixture contains factual prize numbers from a public draw; it is not demonstration data loaded by the app.

Live-source smoke testing on 15 November 2026 loaded 19 complete draws. Real source discrepancies were detected, including one different ninth-prize ending for SM-81 and differing third-prize amounts in some Karunya draws. These records correctly pause checking rather than silently choosing a publisher. The numbers and counts will change as publishers update their data.

Physical-phone acceptance still needs real ticket barcode/OCR checks, camera denial/recovery, offline/reconnect behavior and OS background notification timing. Native compilation and a browser preview do not establish recognition accuracy on real tickets.
