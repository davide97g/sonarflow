#!/bin/bash

# Script to simulate the production release workflow locally
# This runs all the same steps as the GitHub Actions workflow without pushing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Simulating Production Release Workflow${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Checkout code (already done, we're in the repo)
echo -e "${GREEN}✓${NC} Checkout code (already in repository)"

# Step 2: Setup Bun (assuming it's already installed)
echo -e "${GREEN}✓${NC} Setup Bun (using local installation)"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}✗${NC} Error: bun is not installed"
    exit 1
fi

# Step 3: Setup Node.js (assuming it's already installed)
echo -e "${GREEN}✓${NC} Setup Node.js (using local installation)"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Error: node is not installed"
    exit 1
fi

# Step 4: Configure Git (optional, just for display)
echo -e "${GREEN}✓${NC} Configure Git (using local git config)"

# Step 5: Install dependencies
echo -e "\n${BLUE}[Step 5]${NC} Installing dependencies..."
bun install --frozen-lockfile
echo -e "${GREEN}✓${NC} Dependencies installed\n"

# Step 6: Build project
echo -e "${BLUE}[Step 6]${NC} Building project..."
bun run build
echo -e "${GREEN}✓${NC} Project built successfully\n"

# Step 7: Run linting
echo -e "${BLUE}[Step 7]${NC} Running linting..."
bun run check
echo -e "${GREEN}✓${NC} Linting passed\n"

# Step 8: Create production release (main logic)
echo -e "${BLUE}[Step 8]${NC} Creating production release..."
echo -e "${YELLOW}Note: This will create actual commits and tags locally, but won't push them${NC}\n"

# Get latest production tag (excluding beta tags)
git fetch --tags 2>/dev/null || true
LATEST_PROD_TAG=$(git tag -l "v*" | grep -v "beta" | sort -V | tail -1 || echo "")

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Function to calculate next non-beta version
calculate_next_version() {
    local base_version=$1
    local bump_type=$2
    
    # Strip beta suffix if present
    base_version=$(echo "$base_version" | sed 's/-beta.*//')
    
    # Parse version parts
    IFS='.' read -r major minor patch <<< "$(echo "$base_version" | sed 's/v//')"
    
    case "$bump_type" in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch"|*)
            patch=$((patch + 1))
            ;;
    esac
    
    echo "v${major}.${minor}.${patch}"
}

# Function to create non-beta release
create_production_release() {
    local release_type=$1
    
    # Always remove prerelease setting for production releases
    # Create temporary .versionrc.json without prerelease setting
    node -e "
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('.versionrc.json', 'utf8'));
        delete config.prerelease;
        fs.writeFileSync('.versionrc.json.tmp', JSON.stringify(config, null, 2));
    "
    
    # Backup original and use temp config
    cp .versionrc.json .versionrc.json.backup
    cp .versionrc.json.tmp .versionrc.json
    
    # Check if current version is beta
    if echo "$CURRENT_VERSION" | grep -q "beta"; then
        echo "Current version is beta ($CURRENT_VERSION), calculating next non-beta version"
        
        # Determine version bump type
        if [ "$release_type" = "auto" ]; then
            # Check commit types to determine bump
            if git log ${LATEST_PROD_TAG}..HEAD --pretty=format:"%s" --no-merges 2>/dev/null | grep -qE "^BREAKING"; then
                NEXT_VERSION=$(calculate_next_version "$CURRENT_VERSION" "major")
            elif git log ${LATEST_PROD_TAG}..HEAD --pretty=format:"%s" --no-merges 2>/dev/null | grep -qE "^feat"; then
                NEXT_VERSION=$(calculate_next_version "$CURRENT_VERSION" "minor")
            else
                NEXT_VERSION=$(calculate_next_version "$CURRENT_VERSION" "patch")
            fi
        else
            NEXT_VERSION=$(calculate_next_version "$CURRENT_VERSION" "$release_type")
        fi
        
        # Extract version number without 'v' prefix
        NEXT_VERSION_NUM=$(echo "$NEXT_VERSION" | sed 's/v//')
        echo "Creating production release: $NEXT_VERSION"
        
        # Use --release-as with exact version to force non-beta release
        bunx standard-version --release-as "$NEXT_VERSION_NUM" || {
            # Restore original config on error
            mv .versionrc.json.backup .versionrc.json
            rm -f .versionrc.json.tmp
            exit 1
        }
    else
        # Current version is not beta, use standard release commands
        # but with the modified config (no prerelease)
        case "$release_type" in
            "auto")
                bunx standard-version
                ;;
            "patch")
                bunx standard-version --release-as patch
                ;;
            "minor")
                bunx standard-version --release-as minor
                ;;
            "major")
                bunx standard-version --release-as major
                ;;
        esac || {
            # Restore original config on error
            mv .versionrc.json.backup .versionrc.json
            rm -f .versionrc.json.tmp
            exit 1
        }
    fi
    
    # Restore original config
    mv .versionrc.json.backup .versionrc.json
    rm -f .versionrc.json.tmp
}

if [ -z "$LATEST_PROD_TAG" ]; then
    echo "No previous production tag found, creating first release"
    # Remove prerelease setting for first release too
    node -e "
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('.versionrc.json', 'utf8'));
        delete config.prerelease;
        fs.writeFileSync('.versionrc.json.tmp', JSON.stringify(config, null, 2));
    "
    cp .versionrc.json .versionrc.json.backup
    cp .versionrc.json.tmp .versionrc.json
    bunx standard-version --first-release || {
        mv .versionrc.json.backup .versionrc.json
        rm -f .versionrc.json.tmp
        exit 1
    }
    mv .versionrc.json.backup .versionrc.json
    rm -f .versionrc.json.tmp
else
    # Check if there are any conventional commits since last production tag
    COMMITS_SINCE_TAG=$(git log ${LATEST_PROD_TAG}..HEAD --pretty=format:"%s" --no-merges 2>/dev/null || echo "")
    
    if [ -z "$COMMITS_SINCE_TAG" ]; then
        echo "No new commits since last production tag, forcing patch release"
        create_production_release "patch"
    else
        # Check if there are any version-bump commits (feat, fix, perf, refactor, BREAKING)
        VERSION_BUMP_COMMITS=$(git log ${LATEST_PROD_TAG}..HEAD --pretty=format:"%s" --no-merges 2>/dev/null | grep -E "^(feat|fix|perf|refactor|BREAKING)" || true)
        
        if [ -z "$VERSION_BUMP_COMMITS" ]; then
            echo "No version-bump commits found, forcing patch release"
            create_production_release "patch"
        else
            # Create production release (auto-determines version bump)
            create_production_release "auto"
        fi
    fi
fi

# Verify a tag was created
NEW_TAG=$(git describe --tags --abbrev=0)
if [ -z "$NEW_TAG" ]; then
    echo -e "${RED}✗${NC} Error: No tag was created by the release process"
    exit 1
fi

# Verify the tag is not a beta tag
if echo "$NEW_TAG" | grep -q "beta"; then
    echo -e "${RED}✗${NC} Error: Created tag $NEW_TAG is a beta tag, but this is a production release"
    exit 1
fi

echo -e "${GREEN}✓${NC} Successfully created production release: $NEW_TAG\n"

# Step 9: Show what would be pushed (but don't push)
echo -e "${BLUE}[Step 9]${NC} What would be pushed (DRY RUN):"
echo -e "${YELLOW}Tags that would be pushed:${NC}"
git tag -l "$NEW_TAG"
echo -e "\n${YELLOW}Commits that would be pushed:${NC}"
git log --oneline origin/main..HEAD 2>/dev/null || git log --oneline -5
echo -e "\n${YELLOW}Files changed:${NC}"
git diff --stat HEAD~1 HEAD 2>/dev/null || git status --short

# Step 10: Verify package version matches tag
echo -e "\n${BLUE}[Step 10]${NC} Verifying package version matches tag..."
PACKAGE_VERSION=$(node -p "require('./apps/cli/package.json').version")
TAG_VERSION=$(echo "$NEW_TAG" | sed 's/^v//')

if [ "$PACKAGE_VERSION" != "$TAG_VERSION" ]; then
    echo -e "${RED}✗${NC} Error: CLI package.json version ($PACKAGE_VERSION) does not match tag ($TAG_VERSION)"
    exit 1
fi
echo -e "${GREEN}✓${NC} Package version matches tag: $PACKAGE_VERSION\n"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Simulation Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"
echo -e "Created release: ${GREEN}$NEW_TAG${NC}"
echo -e "Package version: ${GREEN}$PACKAGE_VERSION${NC}\n"
echo -e "${YELLOW}Note:${NC} This was a local simulation. No changes were pushed to remote."
echo -e "${YELLOW}To undo the local changes:${NC}"
echo -e "  git reset --hard HEAD~1  # Remove the release commit"
echo -e "  git tag -d $NEW_TAG      # Remove the tag\n"

