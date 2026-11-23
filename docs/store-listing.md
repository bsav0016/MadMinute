# App Store listing: proposed text

The live App Store description is one general sentence ("Test your math skills by completing mad minutes with a variety
of options based on your math skills levels!"), which says little about what the app does and uses few of the words
parents and teachers search for. This is proposed wording for App Store Connect. Nothing is applied automatically: paste
it in yourself. (Google Play text is in `google-play.md`; the Play description there can follow this one.)

Character counts are checked against Apple's limits.

| Field | Limit | Proposed | Count |
| --- | --- | --- | --- |
| Name | 30 | Math Mad Minute: Timed Drills | 29 |
| Subtitle | 30 | Times tables and quick facts | 28 |
| Keywords | 100 | multiplication,division,addition,subtraction,fact fluency,worksheet,kids,practice,homeschool,speed | 98 |
| Promotional text | 170 | Beat your best in 30, 60 or 120 seconds. Pick the operations and number range, review every answer, and see which facts need work. Free, no ads, no account. | 156 |

Notes:

- Apple indexes the name, subtitle and keywords together, so the keywords do not repeat "math", "mad", "minute", "times",
  "tables" or "facts". "Worksheet" connects to the printable worksheets on the website.
- Changing the name or subtitle goes through App Review with a new version. **Promotional text can be edited at any time
  without a new build**, so it is the cheapest to change first.
- Not in the Kids Category and no age-targeting claims are made, so Apple's Kids rules are not triggered. Keep it that way
  unless you decide on purpose to enter that category.

## Description

> Math Mad Minute is the classic timed arithmetic drill. Answer as many problems as you can in 30, 60 or 120 seconds, then
> see how you did.
>
> CHOOSE WHAT TO PRACTISE
> - Addition, subtraction, multiplication and division, switched on or off one by one
> - Set the smallest and largest numbers, from 0 to 20 for quick sums to 1 to 12 for times tables
> - Quick presets: Easy +/-, Times tables and Mixed
>
> A GENTLE DAILY ROUTINE
> - A daily goal of 1, 2 or 3 rounds and a streak with a built-in rest day, kept on your device
> - Today's practice: one tap starts the next times table to work on
> - A level for each times table from 2s to 12s, with a Practice button for each
> - An optional daily reminder, off until you turn it on
>
> SEE WHAT TO WORK ON
> - Review every question after each round: correct, incorrect and skipped
> - Personal best badges for each setup, so you are always beating yourself
> - History with your accuracy for each operation and your trouble spots, such as 7 x 8
> - A 1 x 1 to 12 x 12 times table coloured by how well you know each fact
> - Optional Focus mode that mixes in the problems you miss most
>
> FOR FAMILIES AND CLASSROOMS
> - Up to 12 players on one device, each with their own settings, history and personal bests (players get a name from a list, so no personal details are entered)
> - Back up a player's progress as text, goal and streak included, and restore it on a new phone
> - Works with a screen reader and large text, with marks and patterns as well as colour
> - Share your result with one tap
>
> No ads, no account and no tracking. Your history stays on your device.
>
> Need paper? Free printable mad minute worksheets with answer keys are at bsav0016.github.io/MadMinute.

Use the same text (minus the last line if you prefer) for Google Play's full description; the short description there
stays "Timed arithmetic drills. Beat your best score in 30, 60 or 120 seconds."

## Screenshots

The README screenshots in `docs/screenshots/` are the source set (home, settings, a question, results, history, times
table, focus). For the store, the first three images are what search results show: lead with a question in progress, the
results screen with a personal best, and the coloured times table, each with a short caption ("Beat your best in a
minute", "See what you missed", "Know your times tables").

## 1.5.0 What's New (Apple, 4000 limit)

```
- Daily goal and streak: pick 1, 2 or 3 rounds a day. A built-in rest day means one missed day a week does not end your streak. It all stays on your device.
- Today's practice: one tap starts a round of the next times table to work on.
- Times table levels: see where each table from 2s to 12s stands, and practise any of them with one tap.
- Optional daily reminder, off until you turn it on. It is a notification on your device only.
- Backups now include your goal and streak.
```

## 1.5.0 App Store privacy answers

- **Data Not Collected** stays the answer: the goal, streak and reminder time are kept on the device and sent nowhere. The reminder is a local notification (no push notifications from a server, no push token). Permission to show notifications is asked only when the player turns the reminder on. Privacy policy effective 23 November 2026.
- **Not verified:** Apple's current guidance for streaks, reminders and notifications in apps that children may use. The app is still not in the Kids Category and makes no age-targeting claims. Read the current App Review Guidelines (sections on kids, and on notifications) before submitting; the design is opt-in, local, quiet and names no one, but that is my reading, not Apple's.
- No demo account needed. Review note: "No sign-in. Play one round, then the home screen shows the daily goal and Today's practice. The daily reminder is off until the switch under Reminder is turned on."

## 1.4.0 What's New (Apple, 4000 limit)

```
- Players: add up to 12 players on one device. Each keeps their own settings, history and personal bests. Names are chosen from a list, so no personal details are needed.
- Back up and restore: copy a player's progress as text and restore it on a new phone.
- Easier to use: screen reader labels, layouts that fit large text, and marks and patterns so results never rely on colour alone.
- Trouble spots and Focus mode: see the problems you miss most and practise them.
- Share your score from the results screen.
- Behind the scenes: the app can now receive fixes without a store update.
```

## 1.4.0 App Store privacy answers

- **Data Not Collected** stays the answer. The app has no accounts and sends nothing about the person using it. The only network request is the update check to Expo's update service (EAS Update), which carries the usual request information such as the IP address, the app version and the platform; it is disclosed in the privacy policy (effective 20 November 2026).
- Not in the Kids Category and no age-targeting claims; keep it that way unless you decide to enter it on purpose.
- Players get names from a fixed list (30 words and 8 animals), so no names are typed or stored: there is no child name to declare.
- No demo account is needed for App Review (there are no accounts). Review note: "There is no sign-in. Open the home screen and tap the player chip to add players; the results screen has Share Score and, in History, trouble spots."
