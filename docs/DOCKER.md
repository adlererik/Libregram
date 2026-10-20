# Docker: start Libregram with almost no setup

By Erik Adler · v1.6.0.

Docker runs the CMS, Node.js, SQLite tools, FFmpeg and local city database together. You do not install Node, pnpm or FFmpeg on the host. The release image is `ghcr.io/adlererik/libregram:1.6.0`, with native Linux AMD64 and ARM64 builds. Docker Desktop can run it on supported Windows and Mac computers; Docker Engine runs it on Linux. Install [Docker with Compose](https://docs.docker.com/compose/install/) first. Docker Desktop has its own licensing terms; Docker is not needed for the normal source installation.

## 1. Download one file and start

Create an empty folder and open a terminal there. Download **compose.yaml** from the [v1.6.0 release](https://github.com/adlererik/libregram/releases/tag/v1.6.0), then run:

```bash
docker compose up -d
docker compose ps
```

On Linux/macOS, you can download it from the terminal instead:

```bash
mkdir libregram
cd libregram
curl -fLO https://github.com/adlererik/libregram/releases/download/v1.6.0/compose.yaml
docker compose up -d
```

The first image download can take several minutes. Open [http://localhost:3000](http://localhost:3000) on that computer after the container becomes healthy. The default file binds to the computer's loopback address; it is not a public Internet deployment. Keep port 3000 free. A stopped or unhealthy container can be inspected with `docker compose logs --tail 60 libregram`; normal startup never prints the administrator password.

## 2. Get your own generated login

```bash
docker compose exec libregram node deploy/docker/manage.mjs credentials
```

Read the output **privately** and save it in your password manager. Every new data volume gets a different password and session secret. Click the lock or open `/admin/login`, then sign in. Use **square-plus → A new chapter** to upload photos/videos and **cogwheel → Login settings** to choose your own credentials. If you change them there, the command above will tell you to use your chosen login instead of displaying an obsolete password.

No Cloudflare account, Google/Apple login, API key or fingerprint reader is needed. New installations use password login, local GeoIP and an empty gallery. Age tracking has no preset birthday. The optional PIN phone shortcut is off; Libregram does not include a web-phone service.

## Your data survives container replacement

Compose creates one named volume, normally `libregram_libregram_data`, mounted at `/data`. It contains:

| Path inside the volume | Contents |
| --- | --- |
| `database/libregram.db` | Posts, accounts, settings, hearts and private visitor history. |
| `uploads/` | Original photos/videos, thumbnails, playback files and soundtracks. |
| `runtime/` | Share selections, age/phone/login settings, visitor exclusions and optional API counters. |
| `container.json` | Private initial credentials and persistent session secret. |
| `backups/` | Private database backups made before a changed schema is applied. |
| `cache/cast-slides/` | Regenerable TV presentation media. |

The application runs as the unprivileged `node` user (UID/GID 1000), with dropped Linux capabilities and no Docker socket. Named volumes initialize with suitable ownership. If you replace the volume with a host bind mount, prepare that directory for UID 1000 yourself; do not run the whole container as root to work around permissions. The entrypoint holds a volume lock so two containers cannot run this installation simultaneously.

`docker compose down` stops/removes the container and keeps its volume. **Do not add `--volumes` or `-v` unless you intend to delete the gallery and all private state.** A volume is persistence, not an independent backup.

## Back up and restore

Keep the Compose file in its folder. Stop the application, copy the whole volume into a private archive, then start it:

```bash
docker compose stop libregram
docker compose run --rm --no-deps --entrypoint tar libregram -C /data -czf - . > libregram-private-backup.tar.gz
docker compose start libregram
```

Protect that archive: it contains passwords, session secrets, visitor IPs and your media. Copy it to another private disk/location and never upload it to GitHub. On Linux/macOS, apply `chmod 600 libregram-private-backup.tar.gz`. Stop if the backup command fails.

To restore into a **new empty volume**, put the Compose file and private archive in a new folder, then:

```bash
docker compose run --rm --no-deps --entrypoint tar -T libregram -C /data -xzf - < libregram-private-backup.tar.gz
docker compose up -d
```

Do not restore over a running or populated installation. Preserve your public hostname and `runtime/shared-links/` to keep previously sent links working. Database-only automatic backups cannot recover deleted media; keep full-volume backups.

## Upgrade

1. Make a full private backup as above.
2. Change the image version in `compose.yaml` to the chosen stable release. Pinning a version makes an upgrade deliberate; `latest` follows future releases.
3. Run:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

The existing volume and accounts are preserved. If the schema changes, startup makes a database backup and applies Prisma's normal schema update. It never supplies `--accept-data-loss` or resets an existing database. A potentially destructive update stops for review. For rollback after a schema change, restore your matching full backup and previous image version; changing the image alone does not undo database changes.

## Recover a forgotten login

Run this locally as the server owner:

```bash
docker compose exec libregram node deploy/docker/manage.mjs reset-login
```

It generates a new password for **admin**, switches this installation to password login and revokes existing administrator sessions. It keeps media, visitors, shared links and phone PIN settings. Save the new output privately. This is an explicit recovery command, not something run at every startup.

## LAN access, HTTPS and TV playback

For another device on your local network, edit the Compose port binding or set `LIBREGRAM_BIND_ADDRESS=0.0.0.0` in a private `.env` next to the Compose file, then run `docker compose up -d`. Open `http://YOUR-SERVER-LAN-IP:3000`. A browser/TV cannot use another computer's `localhost` address. Publishing a port on all interfaces can expose it beyond your LAN depending on your firewall; use your own firewall and HTTPS proxy before sharing it publicly.

Optional values in the Compose folder's private `.env` include:

```dotenv
LIBREGRAM_BIND_ADDRESS=127.0.0.1
LIBREGRAM_PORT=3000
SESSION_COOKIE_SECURE=true
LIBREGRAM_PUBLIC_ORIGIN=https://gallery.example.com
CAST_MEDIA_ORIGIN=https://gallery.example.com
VISITOR_GEO_PROVIDER=local
```

Use secure cookies only when browsing through HTTPS. A public HTTPS origin gives relatives and compatible TVs reachable share/media URLs. The CMS cannot install a certificate or connect your domain automatically. See [Cloudflare HTTPS](CLOUDFLARE.md), [sharing](SHARING.md), and [receiver requirements](FAVORITES-CASTING.md). A public domain, server/Internet service and TV hardware can have costs; the CMS, sharing and this container require no paid API.

The existing trusted-proxy boundary accepts forwarded client addresses only from loopback, when `TRUST_PROXY=true`. Docker bridge peers are not automatically trusted. For accurate outside visitor statistics through a tunnel/proxy container, it can share the application's network namespace (`network_mode: service:libregram`) and forward to `http://127.0.0.1:3000`; then enable `TRUST_PROXY=true`. Configure the proxy to set trustworthy client-address headers. Never enable blanket trust for arbitrary public headers. Otherwise direct connection addresses are used and private proxy peers may be excluded from visitor statistics. IP location remains an estimate, not GPS.

For the optional free IP2Location.io lookup, set `VISITOR_GEO_PROVIDER=ip2location` and optionally your own free API key in that private `.env`; restart with `docker compose up -d`. See [provider limits and privacy](VISITOR-STATS.md). Keep private environment files out of source control.

## Import your own Instagram export

First initialize the gallery normally and make a private backup. Extract your own export on the host, then mount that folder read-only for the importer. Replace the example path with your actual extracted export folder:

```bash
docker compose stop libregram
docker compose run --rm --no-deps --entrypoint node \
  -v "/absolute/path/to/extracted-export:/imports:ro" \
  libregram deploy/docker/manage.mjs import-instagram /imports
docker compose start libregram
```

The importer reads the export locally, preserves dates/carousels, avoids duplicate source IDs and copies media into the existing private volume. The mounted export is not added to the image or uploaded to GitHub. The export must be readable by container UID 1000. Follow the source import guide for the supported JSON layout. If an import reports an error, review it privately before retrying; keep the original export and full backup.

## Build from source instead

Download/clone the release, then inside that clean source directory:

```bash
docker build -t libregram:1.6.0 .
docker run -d --name libregram -p 127.0.0.1:3000:3000 -v libregram_data:/data libregram:1.6.0
docker exec libregram node deploy/docker/manage.mjs credentials
```

`.dockerignore` allows public source only, excluding installation environments, databases, media, `.runtime`, `work`, existing builds and credentials. Official images build from the audited Git release. Runtime credentials are generated on first start, after the image is built. Neither the source download nor the image contains the maintainer's gallery or installation state. Keep the intentionally published README screenshots as documentation; do not add private photos to a build context.
