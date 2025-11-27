#!/bin/bash

# Script to simulate the production release workflow locally (DRY RUN)
# This shows what would happen without making any changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Simulating Production Release (DRY RUN)${NC}"
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

# Step 8: Analyze what release would be created
echo -e "${BLUE}[Step 8]${NC} Analyzing release requirements..."
echo -e "${YELLOW}Note: This is a DRY RUN - no commits or tags will be created${NC}\n"

# Get latest production tag (excluding beta tags)
git fetch --tags 2>/dev/null || true
LATEST_PROD_TAG=$(git tag -l "v*" | grep -v "beta" | sort -V | tail -1 || echo "")

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

if [ -n "$LATEST_PROD_TAG" ]; then
    echo "Latest production tag: $LATEST_PROD_TAG"
fi

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

# Determine what release would be created
RELEASE_TYPE=""
NEXT_VERSION=""

if [ -z "$LATEST_PROD_TAG" ]; then
    echo -e "\n${YELLOW}Would create:${NC} First release (v1.0.0)"
    NEXT_VERSION="v1.0.0"
    RELEASE_TYPE="first"
else
    # Check if there are any conventional commits since last production tag
    COMMITS_SINCE_TAG=$(git log ${LATEST_PROD_TAG}..HEAD --pretty=format:"%s" --no-merges 2>/dev/null || echo "")
    
    if [ -z "$COMMITS_SINCE_TAG" ]; then
        echo -e "\n${YELLOW}Would create:${NC} Patch release (no new commits, forcing patch)"
        NEXT_VERSION=$(calculate_next_version "$CURRENT_VERSION" "patch")
        RELEASE_TYPE="patch"
    else
        # Check if there are any version-bump commits (feat, fix, perf, refactor, BREAKING)
        VERSION_BUMP_COMMITS=$(git log ${LATEST_PROD_TAG}..HEAD --pretty=format:"%s" --no-merges 2>/dev/null | grep -E "^(feat|fix|perf|refactor|BREAKING)" || true)
        
        if [ -z "$VERSION_BUMP_COMMITS" ]; then
            echo -e "\n${YELLOW}Would create:${NC} Patch release (no version-bump commits, forcing patch)"
            NEXT_VERSION=$(calculate_next_version "$CURRENT_VERSION" "patch")
            RELEASE_TYPE="patch"
        else
            # Determine version bump type from commits
            if echo "$VERSION_BUMP_COMMITS" | grep -qE "^BREAKING"; then
                NEXT_VERSION=$(calculate_next_version "$CURRENT_VERSION" "major")
                RELEASE_TYPE="major"
                echo -e "\n${YELLOW}Would create:${NC} Major release (BREAKING CHANGE detected)"
            elif echo "$VERSION_BUMP_COMMITS" | grep -qE "^feat"; then
                NEXT_VERSION=$(calculate_next_version "$CURRENT_VERSION" "minor")
                RELEASE_TYPE="minor"
                echo -e "\n${YELLOW}Would create:${NC} Minor release (feat commits detected)"
            else
                NEXT_VERSION=$(calculate_next_version "$CURRENT_VERSION" "patch")
                RELEASE_TYPE="patch"
                echo -e "\n${YELLOW}Would create:${NC} Patch release (fix/perf/refactor commits detected)"
            fi
        fi
    fi
fi

# Show what would change
echo -e "\n${BLUE}Release Details:${NC}"
echo -e "  Current version: ${YELLOW}$CURRENT_VERSION${NC}"
echo -e "  Next version:    ${GREEN}$NEXT_VERSION${NC}"
echo -e "  Release type:    ${GREEN}$RELEASE_TYPE${NC}"

# Check if current version is beta
if echo "$CURRENT_VERSION" | grep -q "beta"; then
    echo -e "  ${YELLOW}Note:${NC} Current version is beta, will create non-beta release"
fi

# Show commits that would be included
if [ -n "$LATEST_PROD_TAG" ]; then
    echo -e "\n${BLUE}Commits since $LATEST_PROD_TAG:${NC}"
    git log ${LATEST_PROD_TAG}..HEAD --pretty=format:"  - %s (%h)" --no-merges 2>/dev/null | head -10 || echo "  (no commits)"
fi

# Show what files would change (simulate)
echo -e "\n${BLUE}Files that would be modified:${NC}"
echo -e "  - package.json (version bump)"
echo -e "  - CHANGELOG.md (changelog update)"
echo -e "  - schemas/sonarflowrc.schema.json (schema version update)"

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}Dry Run Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"
echo -e "Would create release: ${GREEN}$NEXT_VERSION${NC}"
echo -e "Release type: ${GREEN}$RELEASE_TYPE${NC}\n"
echo -e "${YELLOW}Note:${NC} This was a dry run. No changes were made."
echo -e "${YELLOW}To actually create the release:${NC}"
echo -e "  bun run release:simulate  # Creates commits and tags locally\n"

