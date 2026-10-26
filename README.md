# Math Mad Minute

Mobile app for the classic "mad minute" arithmetic drill: answer as many math problems as you can in 30, 60 or 120 seconds, then see how you did. You choose which operations to practise and the range of numbers.

<p><img src="docs/screenshots/home.png" alt="Home screen" width="24%"> <img src="docs/screenshots/settings.png" alt="Settings: number range and operations" width="24%"> <img src="docs/screenshots/question.png" alt="A question in progress" width="24%"> <img src="docs/screenshots/results.png" alt="Results with correct, incorrect and skipped answers" width="24%"></p>

## Why it exists

A timed arithmetic drill is slow to set up by hand: someone has to write the questions, time the minute and mark the answers. This app generates questions from the operations and number range you choose, runs the 60-second timer, and shows a review of every question afterwards.

## How it works

1. **Settings** – start from a quick preset (Easy +/−, Times tables, Mixed) or set it up yourself: turn addition, subtraction, multiplication and division on or off, set the smallest and largest numbers with a two-handle slider (defaults: addition only, 0 to 20), and pick a 30, 60 or 120 second round.
2. **Play** – a 3-second countdown, then your chosen round length (60 seconds by default). Questions are generated from your settings; tap in an answer on the built-in number pad and submit to get the next one.
3. **Results** – correct, incorrect and skipped counts, an overall score such as `18/22`, a review of each question, and a "New personal best!" badge (with your previous best) when you beat your earlier score for the same operations and round length.
4. **History** – opened from the home screen: your overall accuracy, a bar chart of your last 10 rounds, accuracy for each operation, and your best score for each setup, with a button to clear it all.

## Stack

- React Native 0.88 / Expo SDK 58, React 19, TypeScript 6, Expo Router (needs Node 22.13 or newer)
- React context for the game state (`contexts/MadMinuteContext`)

## Running it

```bash
npm install
npm start            # expo start
npm run android      # or npm run ios / npm run web
npm test             # jest --watchAll
npm run test:ci      # jest --ci (single run)
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
```

`.github/workflows/ci.yml` runs the type check, lint, tests and a JavaScript bundle on every pull request. Store builds stay manual.

The app has no ads and does no tracking.

### Regenerating the screenshots

The images in `docs/screenshots/` are captured from an Android emulator by a script, so a refresh is a couple of commands. With an emulator running and Expo Go installed on it:

```bash
npx expo start --port 8081           # in one terminal
cd scripts/screenshots && npm ci     # once
node capture.mjs                     # in another; METRO_PORT, ANDROID_SERIAL and ANDROID_HOME if needed
```

It opens the app in Expo Go, turns on Android demo mode for a clean status bar, plays a 30-second round (five right answers, one wrong, one skipped) and saves the four images at the emulator's resolution (1080x2400 on a Pixel 8). Buttons are found through `uiautomator`; the question during the round is read with OCR (`tesseract.js`, which downloads its English model on first run) because `uiautomator` cannot dump the screen while the timer is running. The script has its own `package.json` so the app does not depend on it.

## Design decisions

- **Timer based on elapsed time**, not on counting ticks, so the round length stays accurate if the app is briefly delayed.
- **Questions and settings as small classes** (`MadMinuteQuestion`, `MadMinuteSettings`, `MadMinuteOperator`) kept in a context, so the settings, play and results screens share one source of truth.
- **No backend or account**: everything runs on the device. Your settings and a small summary of each finished round (the last 200; no questions) are saved with AsyncStorage, and nothing is sent anywhere.
- **Saved data is versioned and validated**: values are stored as `{ v, data }`, and anything corrupt or out of range is ignored instead of crashing the app. Each round gets an id, so the results screen can only save it once.
- **Personal bests are per setup**: a best is kept for each mix of operations and round length (the number range is ignored), ranked by correct answers and then accuracy.

## Limitations

- Tests cover question generation (operators, ranges, subtraction and division edge cases), the results tally (correct, incorrect and skipped, and why the unanswered last question is not counted), the settings presets and operator display symbols, saving and loading settings, building and capping round records (including saving a round only once), personal bests and the history statistics. The screens, number pad and timer are not tested.

## License

MIT. See [LICENSE](LICENSE).
