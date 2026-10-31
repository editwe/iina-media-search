#!/bin/sh
# Build the two artifacts that ship with a release, from the repository root:
#
#   media-search-<version>.iinaplgz   flat package for Settings → Plugins → Install Local Plugin…
#   media-search-<version>.zip        same files under a media-search.iinaplugin/ folder, for manual copying
#
# The .iinaplgz must have its contents at the archive root: IINA unzips it and
# moves `*` into the plugin folder, so a nested folder would hide Info.json.
#
#   sh tools/build-package.sh
set -e

cd "$(dirname "$0")/.."

VERSION=$(python3 -c "import json;print(json.load(open('Info.json'))['version'])")
NAME="media-search-$VERSION"
STAGE=$(mktemp -d)/media-search.iinaplugin

mkdir -p "$STAGE/ui"
cp Info.json index.js pref.html "$STAGE/"
cp ui/sidebar.html "$STAGE/ui/"

rm -f "$NAME.iinaplgz" "$NAME.zip"

# .iinaplgz — plugin contents at the archive root
(cd "$STAGE" && zip -qrX - . -x '*.DS_Store') > "$NAME.iinaplgz"

# .zip — wrapped in one folder so Finder users can drop it in as is
(cd "$(dirname "$STAGE")" && zip -qrX - media-search.iinaplugin -x '*.DS_Store') > "$NAME.zip"

rm -rf "$(dirname "$STAGE")"

ls -l "$NAME.iinaplgz" "$NAME.zip"
unzip -l "$NAME.iinaplgz" | sed -n '1,8p'
