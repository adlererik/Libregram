# Libregram rename and upgrade compatibility

By Erik Adler · v1.5.0 · October 14, 2026.

Libregram is the new name of the project previously published as The Archive. It is a free, open-source Instagram alternative focused on sharing your photos and videos without a walled garden or media lock-in. Share a photo/video compilation with one short URL, or play it through AirPlay or Google Cast. You own the server, original media, and portable database.

## Existing installations

Keep your existing checkout directory and private data in place. There is no need to re-import media, recreate a database, reset a password, change a public hostname, or create a new Cloudflare tunnel. Back up your database, uploads, environment, and private runtime files as described in [Operations](OPERATIONS.md#backups-and-migration) before upgrading.

Point the existing checkout at the renamed repository:

```bash
git remote set-url origin https://github.com/adlererik/libregram.git
git fetch origin --tags
```

Review and preserve your own source changes before switching to `v1.5.0`; do not reset or clean your checkout to discard them. Stop the running application before replacing its production build. Follow [Public setup](PUBLIC-SETUP.md#update-the-application), then use `./libregram install` and `./libregram build` as the owning account. The old `./archive` command remains a compatibility entry point.

There are no new database columns in v1.5.0. The schema's default title changes to Libregram for new installations. Upgrades from v1.4.0 do not require a data migration for this rename. Older installations still need the additive schema changes documented for v1.2.0 and v1.4.0. Never reset a populated database or accept data loss.

An existing default title of `The Archive` or `The-Archive` displays as Libregram after upgrading. Your custom Header text Title is preserved. You can change it under **Settings → Header text**.

## Boot services and optional tunnel

New installations use `libregram@youruser.service` and, when configured, `libregram-tunnel.service`. Service installers resolve the actual checkout location; the folder does not need to be renamed.

After building, migrate an existing Debian application service by running this inside the checkout:

```bash
sudo bash deploy/setup-debian-root.sh "$USER"
systemctl is-active "libregram@$USER"
```

This installs the Libregram service and disables/stops the earlier `the-archive@youruser` service before starting the replacement, so two application servers do not compete for port 3000. The rebuild helper can still manage the earlier service before you migrate it. Use `sudo bash deploy/rebuild-libregram-root.sh "$USER"` for future rebuilds.

Only if you already use the project's Cloudflare tunnel service, migrate it with:

```bash
sudo bash deploy/setup-cloudflare-root.sh "$USER"
systemctl is-active libregram-tunnel
```

The installer copies the existing private `/etc/the-archive-tunnel/` configuration into `/etc/libregram-tunnel/` if the new configuration is absent, and disables/stops the earlier connector before starting the replacement. It reuses the named tunnel and token rather than asking for a new account. Keep the earlier configuration as a private backup. A named tunnel keeps its configured hostname; restarting a Quick Tunnel changes its temporary URL. See [Cloudflare](CLOUDFLARE.md).

## Compatibility that preserves your collection

- Existing `ARCHIVE_HOST`, `ARCHIVE_PORT`, `ARCHIVE_DEV`, and `ARCHIVE_PUBLIC_ORIGIN` environment settings remain supported. New settings use the corresponding `LIBREGRAM_` names and take precedence.
- Existing session/visitor cookies, region preferences, Favorites/theme storage keys, launcher control addresses, and private runtime filenames retain their identifiers. This keeps signed-in users, saved selections, statistics, and shared URLs working at the same site address.
- Existing passwords, optional identity-login configuration, owner exclusions, visitor history, media IDs, and `/s/` links are retained. Fresh installations still use CMS username/password login.
- Historical Git commits, tags, and source archives retain their original contents. The current README, guides, source release, and GitHub repository use Libregram. All nine intentionally published README screenshots are preserved.

Keep backups private. The rename does not publish your installed gallery, databases, credentials, visitor records, or configuration to GitHub.
