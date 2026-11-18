// Store links tagged so each place that sends people to the store can be told apart in App Store Connect (App Analytics >
// Campaigns). No tracker or script is involved: the store counts the installs itself. Campaigns in use are listed in
// docs/GROWTH.md. Campaign names are lower-case words and dashes, 40 characters at most (the App Store limit).

const APP_STORE_URL = 'https://apps.apple.com/us/app/math-mad-minute/id6739588575';

// Set once Google Play has a live listing (https://play.google.com/store/apps/details?id=com.bsav0016.MadMinute). Until
// then the pages show only the App Store button.
const PLAY_STORE_URL = null;

// The App Store only reports a campaign link that also carries the account's provider token ("pt"), shown in App Store
// Connect when you build a campaign link there. It is public (it is in every campaign link) and not a secret, and it is
// the same for every app on the account. Leave it empty until known: links then carry the campaign name but the App
// Store will not report on it.
const APP_STORE_PROVIDER_TOKEN = '';

const CAMPAIGN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function assertCampaign(campaign) {
  if (!CAMPAIGN.test(campaign) || campaign.length > 40) {
    throw new Error(`Campaign must be lower-case words and dashes, 40 characters at most: ${campaign}`);
  }
}

/** The App Store listing with a campaign added. */
function appStoreLink(campaign) {
  assertCampaign(campaign);
  const token = APP_STORE_PROVIDER_TOKEN ? `pt=${APP_STORE_PROVIDER_TOKEN}&` : '';
  return `${APP_STORE_URL}?${token}ct=${campaign}&mt=8`;
}

/** The Google Play listing with a campaign (install referrer with UTM values), or null while there is no listing. */
function playStoreLink(campaign, medium = 'organic') {
  assertCampaign(campaign);
  if (!PLAY_STORE_URL) return null;
  const referrer = encodeURIComponent(`utm_source=${campaign}&utm_medium=${medium}&utm_campaign=${campaign}`);
  return `${PLAY_STORE_URL}&referrer=${referrer}`;
}

module.exports = { APP_STORE_URL, PLAY_STORE_URL, appStoreLink, playStoreLink };
