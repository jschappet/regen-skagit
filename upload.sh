#!/usr/bin/env bash
set -euo pipefail

# ---- Config ----
HOST="upload"
BASE="/home/www/regenerateskagit.org"
RELEASES="$BASE/releases"
CURRENT="$BASE/current"
DIST="dist"

BUILD_ID=$(date +"%Y-%m-%d")
RELEASE_DIR="$RELEASES/$BUILD_ID"

KEEP_DAYS=7

# ---- Build ----
echo "▶ Building site"
npm run build

# ---- Prepare release directory (idempotent per day) ----
echo "▶ Preparing release: $BUILD_ID"
ssh "$HOST" "rm -rf '$RELEASE_DIR' && mkdir -p '$RELEASE_DIR'"

# ---- Sync files ----
echo "▶ Syncing files"
rsync -ta --stats --delete "$DIST/" "$HOST:$RELEASE_DIR/"

# ---- Stamp deploy info ----
ssh "$HOST" "
  echo 'Deployed:' > '$RELEASE_DIR/.deploy_info'
  date >> '$RELEASE_DIR/.deploy_info'
"

# ---- Switch current symlink ----
echo "▶ Activating release"
ssh "$HOST" "ln -sfn '$RELEASE_DIR' '$CURRENT'"

# ---- Prune old releases ----
echo "▶ Pruning old releases (keeping $KEEP_DAYS days)"
ssh "$HOST" "
  ls -dt $RELEASES/* | tail -n +$((KEEP_DAYS + 1)) | xargs rm -rf
"

echo "✅ Deployment complete"
