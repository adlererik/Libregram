# Libregram v1.4.0

By Erik Adler · October 12, 2026 · MIT license.

## Visitor cities, maps, and visible stay

- Optional free IP2Location.io API estimates cities for IPv4 and IPv6, with country flags and source labels.
- Small **Estimated location** links choose Apple Maps on an Apple administrator device, Google Maps elsewhere. Coordinates are approximate network/city locations, not a person’s GPS position.
- **Visible stay** estimates time while the page is visible, with first-party updates about every 20 seconds and on leaving. Historical duration remains unknown.
- **Update locations on this page** refreshes older history without deleting records.
- Local-network and recognized owner visits remain excluded; encoded administrator cookies are now recognized correctly.
- API lookup is optional, cached, capped at 900 requests per UTC day, and backed by local GeoIP. The keyless free API needs no account/card; no paid upgrades or overage charges are enabled. See [current pricing](https://www.ip2location.io/pricing).

## Upgrade an existing installation

1. Stop the application and make a private backup of SQLite, uploads, environment files, and runtime settings/shared links. Record the previous source revision.
2. Update to this tag and install locked dependencies with `./archive install`.
3. Apply `pnpm db:push`. The new Visit columns are optional or have a default; existing rows are preserved. Do not accept a reset or use `--accept-data-loss`.
4. Rebuild and restart as explained in [Public setup](PUBLIC-SETUP.md). A build rollback alone does not roll back the database/source.
5. To enable the free API, set `VISITOR_GEO_PROVIDER="ip2location"` privately in `.env.local` and restart. An API key is optional. See [Visitor statistics](VISITOR-STATS.md).

Existing account credentials, login mode, gallery media, Favorites, sharing links, and owner exclusions are preserved. New installations still default to ordinary CMS username/password and local GeoIP; Cloudflare and an IP lookup account are not required. The phone experiment is not part of this release.

## Privacy and credits

When enabled, outside public IPs are sent server-side to IP2Location.io; the visitor privacy notice and visible attribution explain this. The provider has its own retention policy. No GPS or device-location permission is requested. Visitor records stay locally until manually deleted and remain administrator-only. IP city results, device labels, and duration can be inaccurate or unavailable.

Libregram uses [IP2Location.io IP geolocation](https://www.ip2location.io) web service when configured. Keep the provider’s required visible free-plan credit when customizing the enabled pages.

## Downloads and documentation

Source ZIP/tarball and SHA256SUMS are generated from audited Git source. They contain no passwords, tokens, installation settings, personal media, populated databases, visitor records, private backups, dependency/runtime binaries, or compiled builds. The nine current intentionally published README screenshot links are retained. Follow the [beginner guide](BEGINNER-GUIDE.md) for a fresh installation. Sharing, mixed-media presentations, Google Cast/AirPlay, carousels, soundtracks, themes, uploads, and all prior features remain available.
