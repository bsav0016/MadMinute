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
  - A daily goal and a streak with a built-in rest day, and Today's practice: one tap starts the next times table to work on.
  - History with accuracy by operation, your trouble spots, a level for each times table from 2s to 12s, and a 1 x 1 to 12 x 12 times table coloured by how well you know each fact.
  - An optional daily reminder, off until you turn it on.
  - Optional Focus mode that mixes in the problems you miss most.
  - Up to 12 players on one device, each with their own settings, history and personal bests. Back up a player's progress as text (goal and streak included) and restore it on a new phone.
  - Works with a screen reader and large text, with marks and patterns as well as colour.
  - Share your result with one tap.

  No ads, no account, no tracking. Your history stays on your device.

- **Category:** Education. **Contact email:** savidgeapps@gmail.com
- **Privacy policy URL:** https://bsav0016.github.io/MadMinute/privacy
- **Graphics:** icon 512 x 512 (resize `assets/images/icon.png`), feature graphic 1024 x 500 (to make), phone screenshots from `docs/screenshots/`.

## Declarations

- **Data safety:** no data collected, no data shared (history is stored on the device only).
- **Ads:** none. **Account required:** no.
- **Content rating:** questionnaire, answer no to everything (expected: Everyone).
- **Target audience:** if you include children under 13, Play's Families policy applies. The app has no ads, accounts or tracking, but decide this deliberately.
- **Permissions:** 1.5.0 adds `POST_NOTIFICATIONS` (Android 13 and later, asked only when the reminder is turned on) and `RECEIVE_BOOT_COMPLETED` (so a reminder survives a restart), both added by the notifications library. Play lists them on the store page automatically. Before 1.5.0: none.
- **New personal accounts:** Play requires a closed test with at least 12 testers opted in for 14 days before you can apply for production access.

## 1.5.0 release notes (Play, 500 limit)

```
<en-US>
- Daily goal and streak with a built-in rest day, kept on your device.
- Today's practice: one tap starts the next times table to work on.
- Times table levels in History, with a Practice button for each table.
- Optional daily reminder, off until you turn it on. Nothing is sent anywhere.
- Backups now include your goal and streak.
</en-US>
```

## 1.5.0 declarations

- **Data safety:** still no data collected and no data shared. The goal, streak and reminder time stay on the device; the reminder is a local notification, with no push service and no token.
- **Families policy / target audience:** **not verified.** The streak and reminder are opt-in (reminder), local, calm and name no one, and there are no points, ads or accounts, but check the current Families policy text on engagement features and notifications for apps that include children before releasing, and decide the target audience deliberately.
- **Permission declarations:** Play may ask why the app uses notifications and boot-completed: they are used only for the optional daily reminder.
- **Needs a new build:** 1.5.0 includes a native module, so it cannot go over the air to 1.4.0; build an `.aab` as in the Build section.

## 1.4.0 release notes (Play, 500 limit)

```
<en-US>
- Players: up to 12 players on one device, each with their own history and personal bests. Names come from a list, so no personal details.
- Back up and restore a player's progress as text.
- Screen reader labels, large-text layouts, and marks so results don't rely on colour.
- Trouble spots, Focus mode and Share score.
- Fixes can now arrive without a store update.
</en-US>
```

## 1.4.0 declarations

- **Data safety:** still no data collected and no data shared. The update check to Expo's update service is a standard network request, described in the privacy policy (effective 20 November 2026); the app sends no user data with it.
- **Families/COPPA:** no names are typed or stored (players are named from a fixed list), no account, ads or analytics.
- **Hardware warning:** Play may warn that portrait and Wi-Fi are required hardware features; see Discores PR #75 for the config plugin that marks them optional. It is safe to proceed.
