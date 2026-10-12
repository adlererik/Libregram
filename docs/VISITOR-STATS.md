# Visitor statistics, locations, and persistent history

By Erik Adler · v1.4.0.

## Find the statistics

Sign in, then open **cogwheel at the far right of the gallery icon row → Visitor stats**. Only the authenticated administrator can see recorded IPs. The square-plus remains the media uploader.

Statistics show outside visits, distinct browser identities, estimated cities, collection/media/heart counts, and device breakdowns. History shows IPv4/IPv6 connection IP, country flag/name, estimated city/region, OS icon, browser/device, visit time, estimated visible stay, and browser/referrer details. Older history is paginated in groups of 50. Refresh statistics to see incoming duration or location updates.

## Enable free IP2Location.io

Fresh installations use the local GeoIP database by default. No outside lookup account is needed. To enable the API:

1. Back up your private database and settings, then upgrade the schema and build as described in [Public setup](PUBLIC-SETUP.md#update-the-application).
2. Edit your private `.env.local`; set `VISITOR_GEO_PROVIDER="ip2location"`. Keep the rest of that file, including your existing credentials, unchanged.
3. Restart the app with `./archive restart`, or restart your systemd service. This is a server setting; never put an API key in a `NEXT_PUBLIC_` variable.
4. Open Visitor stats. New outside visits are enriched automatically. Choose **Update locations on this page** to update up to 50 existing records; go to Older and repeat for earlier pages.

**The keyless API is free and needs no registration or payment card.** As of October 12, 2026, [IP2Location.io pricing](https://www.ip2location.io/pricing) allows 1,000 keyless requests/day. An optional free account provides 50,000 requests/month; if you choose that account, add `IP2LOCATION_API_KEY="your-free-key"` privately. The API supports [IPv4 and IPv6](https://www.ip2location.io/ip2location-documentation).

This implementation caps requests at **900 per UTC day**, below both allowances (27,900 maximum in a 31-day month). Each lookup attempt counts, including failures and manual historical refresh. Successful estimates are cached in server memory for 24 hours; restarting clears that cache. Duplicate concurrent IP lookups share one request. A private `.runtime/ip2location-usage.json` keeps only the daily count across restarts; preserve it when moving a running installation within the same day. Shared free keys used by other projects have a shared provider quota.

There is a three-second external request timeout. New visits start with a local estimate and are enriched in the background, so gallery rendering does not wait for the API. Missing results, timeouts, provider rate limits, or the local daily cap use the local database. Historical refresh keeps the previous estimate if the API cannot update it. No paid requests, automatic upgrades, or overage billing are enabled. The free service stops at its quota rather than charging overages. Ordinary server/Internet/storage costs remain yours. Map links use ordinary URLs, with no Maps API subscription.

The free/keyless provider requires visible attribution. The enabled gallery, privacy page, and admin statistics say: **The Archive uses [IP2Location.io IP geolocation](https://www.ip2location.io) web service.** Keep this visible credit if you customize those pages. Set `VISITOR_GEO_PROVIDER="local"` and restart to return to local-only lookup.

## Map links and accuracy

Use the little map-pin **Estimated location** link beside a city. It opens Apple Maps on an Apple administrator device and Google Maps on other devices. The choice follows the device viewing the statistics, not the visitor’s OS. The URL includes approximate coordinates, not the visitor’s IP address. No link appears if coordinates are unavailable; old records gain coordinates when refreshed successfully.

**IP lookup cannot reveal an exact person, house, or GPS position.** Coordinates commonly represent an estimated city or network location. VPNs, mobile networks, shared addresses, and Internet providers may report another city or no city. IP2Location.io cannot guarantee every visitor’s town is correct. No device-location permission or GPS collection is added. Source labels distinguish API, local, and historical estimates.

## Estimated duration of stay

**Visible stay** counts time with the page visible. A first-party browser script reports cumulative seconds about every 20 seconds and when the tab is hidden or left. Hidden-tab time is not counted. Changing between gallery pages keeps the visible timer; loading a new page creates a new visit. Reports are signed and tied to the browser’s visit cookie, and never create extra visit rows.

This is an estimate, not proof the visitor was watching. Disabled JavaScript, blocked requests, abrupt closing, suspended mobile pages, and simultaneous tabs can affect it. A visit can last at most 24 hours for reporting; very long sessions need a new page load. Earlier visits show **Not measured** because historical durations cannot be reconstructed. Duration reports cannot restore a deleted record.

## Outside visitors only

Private/local addresses, LAN, and loopback connections are excluded. A valid CMS admin session identifies your browser and IP; identities are remembered privately in `.runtime/visitor-exclusions.json`. Recognized owner visits remain excluded after logout, and matching older rows are hidden without deleting history. The server correctly decodes signed admin cookies before identifying the owner.

Sign in on each browser or changed network address you use. Until identified, a new owner browser/address can be counted. Other people sharing an excluded IP can also be excluded. Statistics cannot guarantee a unique person per IP or cookie. Clearing cookies changes a browser identity.

Behind a correctly configured loopback Cloudflare Tunnel, the server uses the original client-IP header, preferring original IPv6 when available. Direct LAN requests use the socket address. Do not enable proxy trust for arbitrary public clients. Forwarded headers from untrusted connections are ignored.

## Privacy and deletion

When API lookup is enabled, outside public IPs are sent over HTTPS to IP2Location.io; visitor cookies, browser reports, duration, and administrator credentials are not sent. API keys stay server-side and are not included in URL query strings or logs. The provider has its own [query-retention policy](https://www.ip2location.io/privacy-policy); deleting local history does not delete the provider’s records. The public `/privacy` notice changes with the chosen provider. No third-party browser analytics script, GPS, or client activity log is added. The existing signed visitor cookie supports hearts and repeat-browser statistics; a separate HTTP-only visit cookie expires after one day.

History has **no automatic expiration or scheduled deletion**. Use a row’s trash button and confirm to delete a visit, or **Delete all visit history** and confirm. Posts, media, hearts, settings, Favorites, and owner exclusions remain intact. A later new visit can still be recorded. Previously deleted records cannot be recovered by this update.

Keep private backups of SQLite and exclusion/configuration files. Never publish visitor databases. See [Administration](ADMIN.md), [Security](../SECURITY.md), and [Operations](OPERATIONS.md#backups-and-migration).
