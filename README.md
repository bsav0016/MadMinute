# Math Mad Minute

Mobile app for the classic "mad minute" arithmetic drill: answer as many math problems as you can in 30, 60 or 120 seconds, then see how you did. You choose which operations to practise and the range of numbers.

<p><img src="docs/screenshots/home.png" alt="Home screen" width="24%"> <img src="docs/screenshots/settings.png" alt="Settings: number range and operations" width="24%"> <img src="docs/screenshots/question.png" alt="A question in progress" width="24%"> <img src="docs/screenshots/results.png" alt="Results with correct, incorrect and skipped answers" width="24%"></p>

## Why it exists

A timed arithmetic drill is slow to set up by hand: someone has to write the questions, time the minute and mark the answers. This app generates questions from the operations and number range you choose, runs the 60-second timer, and shows a review of every question afterwards.

## How it works

1. **Settings** – turn addition, subtraction, multiplication and division on or off, and set the smallest and largest numbers with a two-handle slider (defaults: addition only, 0 to 20).
2. **Play** – a 3-second countdown, then your chosen round length (60 seconds by default). Questions are generated from your settings; tap in an answer on the built-in number pad and submit to get the next one.
3. **Results** – correct, incorrect and skipped counts, an overall score such as `18/22`, and a review of each question.

## Stack

- React Native 0.76 / Expo SDK 52, TypeScript, Expo Router
- React context for the game state (`contexts/MadMinuteContext`)
- `react-native-google-mobile-ads` and `expo-tracking-transparency` for an ad banner (set up, but not wired into the screens yet)

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

The ad dependencies need a native build (`npm run android` / `npm run ios`) rather than Expo Go. `app.json` still contains a placeholder Android AdMob app ID; replace it with your own before building for Android.

## Design decisions

- **Timer based on elapsed time**, not on counting ticks, so the round length stays accurate if the app is briefly delayed.
- **Questions and settings as small classes** (`MadMinuteQuestion`, `MadMinuteSettings`, `MadMinuteOperator`) kept in a context, so the settings, play and results screens share one source of truth.
- **No backend or account**: everything runs on the device.

## Limitations

- Tests cover question generation (operators, ranges, subtraction and division edge cases) and the results tally (correct, incorrect and skipped, and why the unanswered last question is not counted). The screens and the timer are not tested.
- The banner ad provider (`contexts/BannerAdContext.tsx`) is not used by any screen yet.

## License

MIT. See [LICENSE](LICENSE).
