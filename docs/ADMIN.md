# Administration and login

By Erik Adler.

Open `/admin/login` and enter your username and password. On a new database, the environment variables `ADMIN_USERNAME` and `ADMIN_PASSWORD` establish the initial account. The database then stores the username and a salted password hash. Changing `.env.local` does not replace an existing account.

For [Docker installations](DOCKER.md), first boot generates and stores credentials privately in the data volume. Read them with `docker compose exec libregram node deploy/docker/manage.mjs credentials`. Use that guide's `reset-login` command for recovery; the source installation's environment-file commands below are not the container recovery workflow.

Use the cogwheel → Login settings to change the username or password with the current password. Old sessions are revoked after a change. If you lose access, set the desired `ADMIN_USERNAME` and `ADMIN_PASSWORD` in private `.env.local`, then run `./libregram reset-login` locally from the project directory. This replaces the stored login and revokes existing sessions. Keep real passwords and session secrets in `.env.local`; never commit that file.

## Optional Cloudflare sign-in

The default mode is **Username & password**, so a normal installation or localhost clone works without Cloudflare. Owners can choose **Cloudflare sign-in** in the cogwheel → Login settings after the integration below is configured. This mode skips the CMS password form and admits only the configured owner's verified Cloudflare identity. Switching modes revokes existing CMS sessions. Switching back to password login requires the current CMS password to confirm that the owner can still sign in.

Configure a Cloudflare Access self-hosted application covering `/admin`, `/api/admin`, and `/api/posts/*` on the public hostname. Use one Allow policy with the exact owner's email; do not add Everyone, bypass rules, or other allowed accounts. Copy the application's **Application Audience (AUD)** tag, not its application ID. Set these values privately in `.env.local` and restart the server:

```dotenv
SESSION_COOKIE_SECURE="true"
CLOUDFLARE_ACCESS_TEAM_DOMAIN="your-team.cloudflareaccess.com"
CLOUDFLARE_ACCESS_AUD="your-64-character-application-audience-tag"
CLOUDFLARE_ACCESS_EMAIL="owner@example.com"
CLOUDFLARE_ACCESS_HOSTNAME="archive.example.com"
ADMIN_AUTH_MODE="password"
```

Open Login settings through the protected public domain to enable Cloudflare sign-in. The CMS verifies the signed Access token's signature, issuer, audience, owner email, expiry, and public hostname before allowing the switch or creating an admin session. A plain email header is insufficient. An unavailable or invalid token never falls back to password authentication in Cloudflare mode. The CMS session cannot outlast the Access token that created it. Sign out clears the CMS cookie and uses Cloudflare's logout endpoint; this also ends the user's other Access sessions and can show Cloudflare's signed-out page.

The choice is stored privately in `.runtime/admin-auth.json`; it overrides `ADMIN_AUTH_MODE`. Include that file in private installation backups. To recover locally, set that file to `{"mode":"password"}` and use `./libregram reset-login` if the password is lost. `ADMIN_AUTH_MODE="cloudflare"` can also enable a newly configured installation before a choice has been saved through the UI.

### Free sign-in methods and device support

Provider features and plan terms can change; consult the official references below. Cloudflare integration is an optional advanced setup.

Cloudflare Zero Trust Free currently supports up to 50 users. The normal Google identity-provider integration works with personal Google accounts and does not require Google Workspace. It requires an OAuth client configured in Google's console. Cloudflare's own identity provider can instead use Cloudflare accounts with supported social login, including Google and Apple. Apple users must use a Cloudflare account whose email matches the policy's approved email; an Apple private relay address will not match a different owner email. A standalone Apple provider is not included in this CMS integration.

Access also supports enrolled device biometrics such as Touch ID, Face ID, and Windows Hello as an additional factor. Requiring Access independent MFA means Google sign-in alone is insufficient: a matching enrolled factor is still required when its session expires. For a provider-only flow, configure the Access policy accordingly and rely on the identity provider's account verification. Google and Apple can ask for account selection, consent, passkeys, or other verification; a single click is not guaranteed.

Phone-assisted passkey QR prompts belong to the browser or identity provider. On supported device/browser combinations, choose a passkey from another device and scan its QR prompt with the enrolled phone. Some combinations require Bluetooth proximity. The CMS cannot force this option on every desktop, and scanning an ordinary link to the gallery does not authenticate a desktop session. No custom QR approval service, paid Apple developer integration, paid identity subscription, or paid Cloudflare feature is required by this optional integration. Domain registration and your own server/Internet costs remain separate.

References: [Cloudflare Free plan](https://www.cloudflare.com/plans/zero-trust-services/), [Google identity provider](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google/), [Cloudflare social login](https://developers.cloudflare.com/fundamentals/user-profiles/login/), [independent MFA](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/), and [cross-device passkeys](https://developers.google.com/identity/passkeys/use-cases).

After signing in, the icon row beneath the gallery divider includes a square-plus for media and a cogwheel at its right end for settings. The square-plus opens `/admin`, keeping the **A new chapter** uploader, carousel arrangement, captions, dates, and soundtracks together. In-place wall editing still reorders, adds, or removes carousel assets, extends a single post into a carousel, changes captions/timestamps, or deletes a post and its local media. See [carousel, soundtrack, and theme instructions](CAROUSELS-SOUNDTRACKS-THEMES.md).

The cogwheel opens `/admin/settings`: visitor history, gallery header text, login settings, and all included information/documentation. Both pages require a valid administrator session; the public gallery hides the cogwheel and square-plus when signed out. Login/logout remains separate in the top-right corner.

Visitor history shows IPv4/IPv6, an OS icon, country flag/name, estimated city, browser, visit time, and estimated visible-page duration for new visits. Optional free IP2Location.io lookup adds city coordinates and an **Estimated location** map link; this is not a visitor’s exact position. **Update locations on this page** refreshes older estimates. See [Visitor statistics and free API setup](VISITOR-STATS.md). Only outside visits are recorded and displayed. Private/local IPs are excluded. A verified signed CMS session marks that visitor identity and public IP as the owner; these exclusions persist after logout and hide matching older records without deleting them. New browsers or changed addresses may be counted until you sign in there. Owner exclusions are stored privately in `.runtime/visitor-exclusions.json`. City estimates are available only for resolvable public addresses. Behind a trusted local Cloudflare Tunnel, the server reads [Cloudflare's original client IP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip); direct LAN requests use the socket address. Forwarded headers from untrusted connections are ignored.

Records remain in the local database until manually deleted. Browse older history in pages of 50. Delete one record with its trash icon or use **Delete all visit history**; both ask for confirmation. Deleting visits does not remove posts, media, browser-local favorites, hearts, or settings. Previous pruning or discarded IPs cannot be undone by this update. Keep private backups of the database when preserving history.

Use HTTPS with secure cookies before exposing the archive on a server. Source control and backups have different purposes: Git contains application code; a private backup contains the database, uploads, and environment configuration needed to recover your archive.

## Step-by-step guides

- [Share one media item or a compilation](SHARING.md)
- [Visitor statistics and history deletion](VISITOR-STATS.md)
- [Private backup and migration](OPERATIONS.md#backups-and-migration)
- [Beginner installation and first upload](BEGINNER-GUIDE.md)

## Visitor display regions and page title

Visitor stats has small round choices for Western Europe, Scandinavia, North America, South America, Asia, and World. Scandinavia includes Denmark, Norway, Sweden, Finland, and Iceland. Several regional choices can be combined; World shows everything. Visitor counts, device summaries, and history pagination use the same filter, while post/media/heart totals remain archive-wide. This only changes the display; it does not block visits, detect bots, or delete hidden records. Choices are remembered for this administrator browser. See [country definitions and behavior](VISITOR-STATS.md#filter-the-displayed-regions).

**Header text → Title** names both the gallery header and browser tab across gallery, Favorites, administration, and shared viewers. Save header to apply the title; the default for a fresh installation is Libregram. Shared link preview descriptions still describe the sent media.

## Age tracking

Open **cogwheel → Age tracking**. Enter the person's **Date of birth**, enable **Show age on memories**, and choose **Save age tracking**. A birthday gives accurate historical ages; a fixed current-age number would become wrong over time. **Age today** previews the entered date. The whole gallery tracks one person, and each card/theater shows their age on the memory's displayed date.

Save to apply changes without editing environment files, rebuilding, or restarting. Other open browsers should reload. Turn the switch off and save to hide ages while remembering the birthday, or disable and clear the date to remove it. Invalid or future dates are rejected when saving. Empty or invalid configuration never invents an age.

The authenticated settings API saves `.runtime/age-tracking.json` atomically with owner-only file permissions. Include it in private backups; no database schema change or paid service is needed. Existing `NEXT_PUBLIC_BIRTH_DATE` configuration is used only before the first form save. Saved settings, including an explicit Off choice, take precedence across restarts and upgrades.

Age labels are public. While tracking is enabled, the birthday is delivered to visitors' browsers to calculate them. When disabled, the saved birthday is omitted from public page settings but remains available to the authenticated administrator. Never publish the private runtime file or installation environment in Git.

## Optional phone shortcut

Libregram can open an existing web phone through a PIN keypad. The phone itself is supplied and managed separately. This optional shortcut is **off by default**, and works without a paid service or Cloudflare integration.

1. Sign in and open **cogwheel → Phone**.
2. Set **Destination URL** to your existing phone address. Use `/com` for a phone on the gallery's own hostname, or a full `https://…` address. HTTP URLs are also supported for local installations; use HTTPS for public access. Addresses containing a username/password, scripts, or unsupported schemes are rejected.
3. Set and confirm your own **4–12 digit PIN**. Leading zeroes are preserved.
4. Enable **Show the phone icon**, then **Save phone settings**. Reload an already-open gallery tab to see the change.

Visitors see the handset beneath the login lock at the right end of the gallery controls. When signed in, it sits immediately left of Settings. Tapping it opens a keypad matching the current gallery theme, with a small display, telephone-style number buttons, Clear, Backspace, and **Continue**. The public keypad uses neutral wording and has no descriptive phone heading or repeat-PIN reminder. Its display briefly shows the newest digit, then masks it. No editable input is used in the public keypad, so tapping its buttons does not invoke the mobile software keyboard. Desktop number keys also work; Escape closes and Tab moves through the buttons.

**Every tap requires a fresh PIN**, including after a previous success or for an administrator. Entering the correct PIN opens the saved destination in the same tab. There is no remembered unlock, phone-access cookie/token, or client-stored PIN. Closing the keypad, leaving the page, returning through browser history, or backgrounding the page clears the keypad. The PIN is sent only in the POST body to the gallery server, never in the URL; the handler does not log it. Browser/device software outside Libregram can still capture input, and the phone app can retain its own existing login.

Incorrect entries have increasing delays; six failures trigger a five-minute wait. Limits are grouped by the server-recognized client IP, so devices sharing one public address may share a cooldown. A separate server-wide budget and verification-concurrency limit bound resource use. Limiter keys are opaque hashes kept in memory for fifteen minutes; restarting the server resets the limits. Client-supplied forwarded addresses are honored only when the existing `TRUST_PROXY=true` setting is used through the trusted loopback proxy. Use the documented `./libregram` launcher/custom Node server; it handles `/api/phone-entry` before the Next.js router.

Settings are stored atomically in private `.runtime/phone-shortcut.json` with owner-only file permissions. Only a salted scrypt hash of the PIN is stored; neither the hash nor the saved PIN is returned to the browser. The authenticated settings page receives the destination, enabled state, and whether a PIN is set. Public gallery pages receive only the visibility flag; a successful PIN check returns the destination. Leave both PIN fields blank when saving to keep an existing PIN. To replace a forgotten PIN, set a new one in Settings—no old PIN is needed once you are authenticated as the CMS owner. Include this private file in backups and never publish it in Git.

Turning the icon off hides the shortcut and stops its PIN endpoint from returning a destination. **This is a shortcut gate:** it does not add protection to the destination website, modify `/com` or `/calls`, alter call signaling, or change the separate phone app's chat/video/voice/notification features. Direct links and already-open phone tabs continue to follow that application's own security. Phone PIN access does not grant CMS administrator access.
