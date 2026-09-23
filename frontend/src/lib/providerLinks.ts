// TMDB/JustWatch give no deep links to titles, so for services whose search URL we have
// verified we send people to that search; everything else keeps TMDB's "where to watch" page.
// Keys are TMDB provider ids.
type SearchUrl = (query: string) => string;

const netflix: SearchUrl = (q) => `https://www.netflix.com/search?q=${q}`;
const primeVideo: SearchUrl = (q) => `https://www.primevideo.com/search?phrase=${q}`;
const appleTv: SearchUrl = (q) => `https://tv.apple.com/search?term=${q}`;
const googlePlay: SearchUrl = (q) => `https://play.google.com/store/search?q=${q}&c=movies`;
const youtube: SearchUrl = (q) => `https://www.youtube.com/results?search_query=${q}`;
// Redirects to the local store and keeps the query.
const rakuten: SearchUrl = (q) => `https://www.rakuten.tv/search?q=${q}`;

const SEARCH_URLS: Record<number, SearchUrl> = {
  8: netflix,
  9: primeVideo, // Amazon Prime Video
  119: primeVideo, // Amazon Prime Video (other regions)
  10: primeVideo, // Amazon Video (rent/buy)
  350: appleTv, // Apple TV
  2: appleTv, // Apple TV Store
  3: googlePlay,
  192: youtube,
  188: youtube, // YouTube Premium
  35: rakuten,
};

// "HBO Max Amazon Channel", "Universal+ Amazon Channel"...: all watched inside Prime Video.
const isAmazonChannel = (name: string) => /amazon channel$/i.test(name.trim());

/** Link that finds `title` on the service, or null when we only have TMDB's page. */
export function providerSearchUrl(provider: { provider_id: number; provider_name: string }, title: string) {
  const search = SEARCH_URLS[provider.provider_id] ?? (isAmazonChannel(provider.provider_name) ? primeVideo : null);
  return search ? search(encodeURIComponent(title)) : null;
}
