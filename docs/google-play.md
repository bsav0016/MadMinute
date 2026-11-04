# Google Play release notes

Store builds stay manual. These are the answers and text to use in Play Console.

## Build

```bash
eas build --platform android --profile production   # produces an .aab
```

- Application ID: `com.bsav0016.MadMinute` (set in `app.json`; it cannot be changed after the first upload).
- `versionCode` is managed by EAS (`appVersionSource: remote`, `autoIncrement: true`).
- Upload the first `.aab` by hand in Play Console (Production, or Internal testing first). `eas submit` only works after a first manual upload and a service-account key.
- Let Play manage app signing (the default); EAS holds the upload key.

## Store listing

- **App name:** Math Mad Minute
- **Short description (80 max):** Timed arithmetic drills. Beat your best score in 30, 60 or 120 seconds.
- **Full description:**

  Math Mad Minute is the classic timed arithmetic drill. Answer as many problems as you can in 30, 60 or 120 seconds, then see how you did.

  - Choose addition, subtraction, multiplication and division, and set the smallest and largest numbers.
  - Quick presets: Easy +/-, Times tables, Mixed.
  - Review every question afterwards, with correct, incorrect and skipped counts.
  - Personal best badges for each setup.
  - History with accuracy by operation, your trouble spots, and a 1 x 1 to 12 x 12 times table coloured by how well you know each fact.
  - Optional Focus mode that mixes in the problems you miss most.

  No ads, no account, no tracking. Your history stays on your device.

- **Category:** Education. **Contact email:** savidgeapps@gmail.com
- **Privacy policy URL:** https://bsav0016.github.io/MadMinute/privacy
- **Graphics:** icon 512 x 512 (resize `assets/images/icon.png`), feature graphic 1024 x 500 (to make), phone screenshots from `docs/screenshots/`.

## Declarations

- **Data safety:** no data collected, no data shared (history is stored on the device only).
- **Ads:** none. **Account required:** no.
- **Content rating:** questionnaire, answer no to everything (expected: Everyone).
- **Target audience:** if you include children under 13, Play's Families policy applies. The app has no ads, accounts or tracking, but decide this deliberately.
- **Permissions:** none requested.
- **New personal accounts:** Play requires a closed test with at least 12 testers opted in for 14 days before you can apply for production access.
