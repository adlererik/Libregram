# Libregram v1.6.0 — Your gallery, ready for Docker

By Erik Adler · October 20, 2026 · MIT license.

Libregram is a free, open-source Instagram alternative for sharing photos and videos without a walled garden or media lock-in. Keep your originals and database, share a mixed-media compilation with one short URL, and enjoy presentations through compatible AirPlay or Google Cast receivers. Friends and family can open public sharing links without creating an account.

## Start with almost no setup

Download **compose.yaml** from this release into an empty folder. With Docker and Compose installed:

```bash
docker compose up -d
docker compose exec libregram node deploy/docker/manage.mjs credentials
```

Open [http://localhost:3000](http://localhost:3000), sign in with your privately displayed generated login, and upload your first media. No Node/FFmpeg installation, Cloudflare account, API key or shared default password is required. Native AMD64/ARM64 images are published as `ghcr.io/adlererik/libregram:1.6.0`; see the [Docker guide](DOCKER.md) for prerequisites, LAN/HTTPS access, full-volume backup/restore, recovery and upgrades.

The default Compose binding is local to the computer. Public hosting, a domain and HTTPS need your own setup. The private data volume survives container replacement. Do not delete the volume when upgrading.

## New since v1.5.0

- **Docker distribution:** a non-root image, one-file Compose startup, unique first-run credentials, persistent database/media/runtime state, health reporting, explicit login recovery, and a database backup before changed-schema application. Published builds use audited source and an allowlisted context.
- **Age tracking in Settings:** enter a birthday, preview today's age, and enable/disable historical age labels. Calendar calculations are consistent in feed/theater and apply after saving without a rebuild. Fresh installs contain no preset birthday.
- **Readable mobile captions:** four-line previews expand with a small centered chevron. Preserve line breaks and wrap long words; the control appears only for overflowing captions.
- **Optional handset shortcut:** off by default. Configure its URL and a 4–12 digit PIN in Settings. A themed touch keypad with neutral wording requires a fresh PIN on every use, with server-side attempt limits and a private salted hash. It does not include or modify a separate phone app, and direct destination links retain that app's own security.
- **Updated handbook and beginner documentation:** Docker and direct-source installation paths, backup locations, phone settings, age settings, and practical sharing/casting limits. All nine existing README image elements remain.

The existing gallery, all-media thumbnail wall/year jumps, editable carousels, soundtracks, five themes, individual Favorites, one-URL compilations, direct media links, TV playback, persistent visitor history, country flags/estimated city maps, and combined region filters remain available. See the [complete feature guide](FEATURES.md).

## Upgrade and compatibility

v1.6.0 introduces no database columns. Direct installations retain their existing media, accounts, login mode, hostname and sharing links. Back up private data, install the locked dependencies, and rebuild before restarting. Preserve `.runtime/age-tracking.json` and `.runtime/phone-shortcut.json` when present. The current locked Prisma CLI and TSX runner move from development to runtime dependencies for container startup and Instagram export import; dependency versions are unchanged. Historical schema updates from v1.2.0/v1.4.0 still apply to older installations. Never reset a populated database or accept data loss automatically.

Docker is an additional installation method, not an automatic conversion of an existing source installation. Follow the [source upgrade reference](PUBLIC-SETUP.md) or [container upgrade instructions](DOCKER.md#upgrade) for the method you use.

## Privacy, defaults and costs

Source archives and images contain no maintainer passwords, session/tunnel tokens, private environment, preset birthday, personal uploaded media, populated gallery database, visitor records, private backups or operator phone proxy. Existing public README screenshot links are intentionally preserved. Runtime credentials are generated only when a new installation starts and remain in its private volume.

Default authentication remains CMS username/password. Local GeoIP remains the default; optional IP2Location.io lookup and Cloudflare identity login require the owner's configuration. Gallery/media/sharing URLs are public by design. IP map pins are estimates, not GPS. Browsers can require a tap for sound; AirPlay presentation progression can depend on the sender page remaining active.

The software and shortcut/sharing features require no paid API or CMS subscription. Your server, storage, electricity, Internet, domain and receiver hardware remain your own costs. Docker Desktop and optional providers have their own terms.

## Downloads

- `libregram-v1.6.0-source.zip` and `libregram-v1.6.0-source.tar.gz`: audited Git source, lockfile, schema, documentation, empty upload placeholder and Docker build files.
- `compose.yaml`: start the prebuilt image without cloning or building.
- `SHA256SUMS`: source and deployment-file checksums.
- Container image/digests: see the release's container details and [GHCR package](https://github.com/adlererik/Libregram/pkgs/container/libregram).

Build and publication evidence is recorded in [Verification](VERIFICATION.md). Existing device/receiver confirmations remain historical evidence; this release does not claim every browser allows audible autoplay or that all TVs support both casting systems.
