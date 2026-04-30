#!/bin/bash
set -euo pipefail

FILE=$(jq -r '.tool_input.file_path // ""')

# src/, electron/, index.html 파일만 처리
case "$FILE" in
  /Users/user/freecell/src/*|\
  /Users/user/freecell/electron/*|\
  /Users/user/freecell/index.html)
    ;;
  *)
    exit 0
    ;;
esac

cd /Users/user/freecell

# 1. 버전 자동 증가 (patch)
NEW_VERSION=$(npm version patch --no-git-tag-version | tr -d 'v')

# 2. Electron 빌드 & 압축
npm run electron:build || exit 1
cd release
zip -9 "FreeCell-${NEW_VERSION}-arm64.zip" "FreeCell-${NEW_VERSION}-arm64.dmg"

# 오래된 버전 파일 정리
find . -maxdepth 1 \( -name "FreeCell-*.dmg" -o -name "FreeCell-*.zip" -o -name "FreeCell-*.blockmap" \) \
  ! -name "FreeCell-${NEW_VERSION}-*" -delete

# 3. 커밋 & 푸시
cd /Users/user/freecell
git add -A
if ! git diff --cached --quiet; then
  FILENAME=$(basename "$FILE")
  git commit -m "update: ${FILENAME} (v${NEW_VERSION})"
  git push origin main
fi
