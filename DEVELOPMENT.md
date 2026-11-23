# Local development

Run these commands from this site’s directory:

| Command | Behavior |
| --- | --- |
| `npm run build` | Build the site into `dist/` and exit. |
| `npm run dev` | Build, watch for changes, and serve at http://localhost:8581. |
| `npm run watch` | Build and rebuild `dist/` on file changes without starting a server. |

Use `npm run watch` when Heron serves the site locally, including its API routes.
The standalone development server serves the frontend; API routes need Heron.
Stop either development command with Ctrl+C.

## Deployment configuration

`deploy.site.toml` follows Workshop's site deployment configuration. It builds
`main` from this site's GitHub repository with `npm run build` and publishes
`dist`. The deployment directory matches the existing production site root;
the server checkout lives under `/home/jimmy/git/sites/`.

Use this file with the same deployment runner used for Workshop after the
pull request is merged.
The empty backend setting matches Workshop's static-site configuration; Heron
continues to be managed separately. No live deployment is performed by adding
this configuration.

## Submit site changes

Run `./upload.sh "Describe the change"` from the site repository. The message
is used for the commit and a new pull request's title (default: `Update site`).
Requires Git, npm, and an authenticated GitHub CLI (`gh auth login`).

The script builds the site, stages all non-ignored changes, commits them, pushes
the current branch to `origin`, and creates a PR against the repository's default
branch. Review `git status` first and keep local databases and credentials ignored.
When run on the default branch it first creates a `codex/site-update-…` branch.
An existing open PR is reused. A clean working tree can still push existing
commits; if there are no commits ahead of the base, no PR is created. Failures
stop the script.

This submits changes for review; it does not merge the PR or upload files to the
production server. Deployment uses `deploy.site.toml` separately after merging.

## MeshCore verification

The `/meshcore/` page uses the Heron session on the public Regenerate Skagit
host. Heron keeps both verification options unavailable by default. Set
`MESHCORE_DM_CONTACT` to the bot's displayed contact name after configuring
the bot to send verification events to Heron and relay replies by DM. Set
`MESHCORE_CHANNEL_ENABLED=true` only when the bot supports both reception and
replies in #skagit.

A first reception must reach Heron before the original code expires. A retry
of an already accepted event keeps its original reply, even after expiry.
Web confirmation and map publication are independent.

### Bot welcome invites

Set `MESHCORE_INVITE_BOT_TOKEN` on Heron and share it with the configured bot.
The bot sends `Authorization: Bearer <token>` to
`POST /api/meshcore/invites` with the ledger experiment's document UUID as
`experiment_id` and a stable welcome `event_id`. Heron returns an
`invite_url` only for an experiment on the public Regenerate Skagit host.
A retry with the same event and experiment returns the same URL.

The invite link stores pending registration context in the browser session
and redirects to `/meshcore/`. An unused invite expires after seven days.
Registration reserves it for the new account, and email confirmation creates
the ledger relationship and registration event. This flow makes no change
to map visibility.
