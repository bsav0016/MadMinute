# Growth: worksheets, tagged links and the store listing

Teachers and parents look for paper mad minutes before they look for apps. The website therefore offers free printable
worksheets, each one pointing to the app, and the store links are tagged so the App Store can say which page sent an
install. Nothing is added to the app or the site to track anyone: no script, no analytics. The store counts installs
itself, so the privacy policy ("no data collected") stays true.

## The pages

- `docs/index.html`: the home page for the app.
- `docs/worksheets/`: 10 worksheets (addition and subtraction to 10 and 20; multiplication with factors to 5, 10 and 12;
  division to 10 and 12; mixed to 12), each in 3 versions of 100 problems, with an answer key on the page after the
  worksheet. They print as two pages (worksheet, then key). The problems follow the app's rules (no negative answers, no
  division with a remainder) and come from a fixed seed, so a rebuild changes nothing.
- `docs/sitemap.xml`.

They are generated, not written by hand: `node scripts/build-worksheets.js` rewrites them, and
`__tests__/worksheets-test.ts` fails if the committed files differ from the generator, if any answer is wrong, or if a
problem is out of range. To add a sheet, add a line to `SHEETS` in the generator and rebuild.

Served by GitHub Pages from `docs/` on `master`, at https://bsav0016.github.io/MadMinute/.

## Tagged links

Links come from `scripts/growthLinks.js`:

| Where | Campaign |
| --- | --- |
| Home page | `web-home` |
| Worksheet index | `web-worksheets-index` |
| Each worksheet | `web-<sheet name>-<version>`, e.g. `web-addition-0-20-1` |

For a new place you post (a teacher group, a homeschool forum), pick a name like `facebook-teachers` (lower case, words
and dashes, 40 characters at most) and build the link in a terminal in this repo:

```
node -e "console.log(require('./scripts/growthLinks').appStoreLink('facebook-teachers'))"
```

Add the name to the table so a campaign in the console can be traced back.

**One value to set: the App Store provider token.** The App Store only reports a campaign link that carries the account's
provider token (`pt`). In App Store Connect open the app, App Analytics, Campaigns, Create Campaign Link, and copy the
number after `pt=` into `APP_STORE_PROVIDER_TOKEN` in `scripts/growthLinks.js`, then rebuild. It is public and the same for
every app on the account. Until it is set the links work but the App Store does not report their campaign.

**Google Play:** there is no Play listing yet, so the pages show only the App Store button. When the app is live on Play,
set `PLAY_STORE_URL` in `scripts/growthLinks.js` and rebuild; Play needs no token.

## Where to read the results

- App Store Connect, App Analytics, Acquisition, Campaigns: first-time downloads per campaign.
- Google Search Console: add the site (`https://bsav0016.github.io/MadMinute/`), submit `sitemap.xml`, and read the
  searches that reach each worksheet.

## Where to share

- Teacher and homeschool groups (Facebook, Reddit communities for teachers and homeschoolers): offer the worksheet
  index, not the app. Read each group's rules on self-promotion first. Share a worksheet that answers what someone asked.
- Teachers who already use mad minutes in class: the worksheets are free to print and copy; the app is the version that
  keeps score and shows which facts a child keeps missing.
- The worksheet index and one sheet are the two pages most likely to be searched for; check them in Search Console after
  a few weeks and add sheets for the searches that show up (for example "multiplication facts 0 to 9").
