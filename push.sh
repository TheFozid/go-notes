#!/usr/bin/env bash
set -e

# Usage:
#   ./push.sh "commit message" patch
#   ./push.sh "commit message" minor
#   ./push.sh "commit message" major

MSG="$1"
BUMP="$2"

if [ -z "$MSG" ] || [ -z "$BUMP" ]; then
    echo "Usage: ./push.sh \"Commit message\" [patch|minor|major]"
    exit 1
fi

IMAGE_BASE_BACKEND="ghcr.io/thefozid/go-notes-backend"
IMAGE_BASE_YJS="ghcr.io/thefozid/go-notes-yjs"

# Get numerically highest tag (strip 'v')
git fetch --tags --quiet
LATEST=$(git tag --list 'v*' | sort -V | tail -n 1)
LATEST=${LATEST#v}

if [ -z "$LATEST" ]; then
  LATEST="0.0.0"
fi

MAJOR=$(echo "$LATEST" | cut -d. -f1)
MINOR=$(echo "$LATEST" | cut -d. -f2)
PATCH=$(echo "$LATEST" | cut -d. -f3)

case "$BUMP" in
  major) MAJOR=$((MAJOR+1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR+1)); PATCH=0 ;;
  patch) PATCH=$((PATCH+1)) ;;
  *) echo "Invalid bump: $BUMP (use patch|minor|major)"; exit 1 ;;
esac

VERSION="$MAJOR.$MINOR.$PATCH"

echo "📌 Previous version: $LATEST"
echo "✨ New version: v$VERSION"
echo

# Build + push backend images for AMD64 + ARM64
echo "🚀 Building & pushing backend multi-arch images..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --target backend \
  -t "$IMAGE_BASE_BACKEND:latest" \
  -t "$IMAGE_BASE_BACKEND:$VERSION" \
  -t "$IMAGE_BASE_BACKEND:$MAJOR.$MINOR" \
  -t "$IMAGE_BASE_BACKEND:$MAJOR" \
  --push .

echo

# Build + push yjs images for AMD64 + ARM64
echo "🚀 Building & pushing yjs multi-arch images..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --target yjs \
  -t "$IMAGE_BASE_YJS:latest" \
  -t "$IMAGE_BASE_YJS:$VERSION" \
  -t "$IMAGE_BASE_YJS:$MAJOR.$MINOR" \
  -t "$IMAGE_BASE_YJS:$MAJOR" \
  --push .

echo
echo "📦 Git commit + tag..."
git add .
git commit -m "$MSG" || echo "No changes to commit"
git tag "v$VERSION"
git push
git push --tags

docker system prune -a --volumes -f
docker builder prune -a -f
docker buildx prune -a -f

echo
echo "✅ Release v$VERSION complete"
echo "Backend: $IMAGE_BASE_BACKEND:$VERSION"
echo "YJS: $IMAGE_BASE_YJS:$VERSION"
