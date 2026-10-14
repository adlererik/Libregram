# Libregram v1.5.0 — Share freely, without the walled garden

By Erik Adler · October 14, 2026 · MIT license.

Libregram is a free, open-source Instagram alternative focused on sharing photos and videos without media lock-in. Host it yourself, keep your original files and portable SQLite database, and move your collection whenever you choose.

## Share a whole story

- Select photos and videos, arrange Favorites, and send a continuous compilation with **one compact URL**.
- Send individual media through a copied link, email, text message, or a supported native share sheet. Compatible messaging apps show thumbnail previews.
- Recipients open links without an account or app; presentations offer timed photos, full videos, repeat, seeking, and fullscreen where supported.
- Enjoy your media on compatible TVs through **AirPlay or Google Cast**, with receiver and browser requirements described in the [feature guide](FEATURES.md).

## New in this release

- Libregram branding throughout the default gallery title, login, administration, documentation, package, GitHub repository, launch command, service templates, and source downloads.
- Visitor filters for Western Europe, Scandinavia (Denmark, Norway, Sweden, Finland, and Iceland), North America, South America, Asia, and World. Combine regions; counts, devices, history, and pagination follow the choice. This changes the display without blocking traffic or deleting records.
- Region choices remembered per administrator browser, and browser tabs that use the Title saved in Header text settings.
- All nine existing README screenshots preserved. Updated beginner, feature, administration, migration, and operating guides.

## Existing installations

Use the [rename and upgrade guide](RENAMING.md). Existing media, accounts, sessions, Favorites, shared links, visitor history, and optional identity configuration are preserved. Custom gallery titles stay intact. Legacy launcher/environment identifiers are supported for compatibility; new installations use `./libregram` and Libregram service names.

No new database columns are introduced in v1.5.0. The default title changes for new databases; upgrades from earlier versions still need the previously documented additive schema updates. Back up private data before upgrading. Never reset a populated database.

## Install and costs

Follow the [beginner guide](BEGINNER-GUIDE.md). Fresh setup uses CMS username/password login, an empty database, and local GeoIP lookup. Cloudflare and IP2Location.io are optional. The MIT-licensed software requires no CMS subscription, paid sharing API, link shortener, or casting registration. Your server, storage, electricity, Internet, domain, and receiver hardware are your own costs.

The gallery and share links are public; administration and visitor IPs require authentication. IP coordinates are approximate city/network estimates, and visible stay is an estimate. Browsers may require a tap for sound. AirPlay progression can depend on the sender page remaining active. Libregram is independent of Instagram/Meta.

## Downloads and build evidence

`libregram-v1.5.0-source.zip`, `libregram-v1.5.0-source.tar.gz`, and `SHA256SUMS` are created from audited Git source. They contain no private media, credentials, populated databases, visitor records, installation configuration, backups, runtime binaries, dependencies, or compiled builds. The README screenshot references remain included.

Production builds and TypeScript checks passed locally and in isolated Debian staging. This release does not claim new browser, fresh-install, or physical receiver test results.
