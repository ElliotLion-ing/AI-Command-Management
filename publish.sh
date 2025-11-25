#!/bin/bash

# AI Command Tool Management - NPM Publish Script
set -e  # Exit on error

echo "🚀 AI Command Tool Management - NPM Publish"
echo "==========================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm is not installed${NC}"
    exit 1
fi

# Check if logged into npm
if ! npm whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  You are not logged into npm${NC}"
    echo "Please run: npm login"
    exit 1
fi

echo -e "${GREEN}✅ npm authentication verified${NC}"

# Get package name and current version
PACKAGE_NAME=$(node -p "require('./package.json').name")
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "📦 Package: ${GREEN}${PACKAGE_NAME}${NC}"
echo -e "📦 Current version: ${GREEN}${CURRENT_VERSION}${NC}"

# Ask for version bump type
echo ""
echo "Select version bump type:"
echo "  1) patch (bug fixes: $CURRENT_VERSION -> next patch)"
echo "  2) minor (new features: $CURRENT_VERSION -> next minor)"
echo "  3) major (breaking changes: $CURRENT_VERSION -> next major)"
echo "  4) custom version"
echo "  5) use current version (no bump)"
read -p "Enter choice [1-5]: " VERSION_CHOICE

case $VERSION_CHOICE in
    1)
        npm version patch --no-git-tag-version
        ;;
    2)
        npm version minor --no-git-tag-version
        ;;
    3)
        npm version major --no-git-tag-version
        ;;
    4)
        read -p "Enter version (e.g., 1.2.3): " CUSTOM_VERSION
        npm version $CUSTOM_VERSION --no-git-tag-version
        ;;
    5)
        echo "Using current version: $CURRENT_VERSION"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}📦 Publishing version: ${NEW_VERSION}${NC}"

# Run tests
echo ""
echo "🧪 Running tests..."
npm run test || {
    echo -e "${RED}❌ Tests failed. Aborting publish.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Tests passed${NC}"

# Type check
echo ""
echo "🔍 Running type check..."
npm run typecheck || {
    echo -e "${RED}❌ Type check failed. Aborting publish.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Type check passed${NC}"

# Lint
echo ""
echo "📝 Running linter..."
npm run lint || {
    echo -e "${YELLOW}⚠️  Linting issues found. Continue anyway? (y/n)${NC}"
    read -p "" CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
}
echo -e "${GREEN}✅ Linting complete${NC}"

# Build
echo ""
echo "🔨 Building package..."
npm run build || {
    echo -e "${RED}❌ Build failed. Aborting publish.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Build successful${NC}"

# Check build output
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ dist/ directory not found after build${NC}"
    exit 1
fi

echo ""
echo "📦 Package contents:"
npm pack --dry-run

# Confirm publish
echo ""
echo -e "${YELLOW}⚠️  You are about to publish:${NC}"
echo -e "   Package: ${GREEN}${PACKAGE_NAME}${NC}"
echo -e "   Version: ${GREEN}${NEW_VERSION}${NC}"
echo -e "   Registry: $(npm config get registry)"
read -p "Continue with publish? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ Publish cancelled"
    exit 1
fi

# Publish to npm
echo ""
echo "📤 Publishing to npm..."
npm publish --access public || {
    echo -e "${RED}❌ Publish failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}🎉 Successfully published ${PACKAGE_NAME}@${NEW_VERSION}!${NC}"
echo ""
echo "Next steps:"
echo "  1. Commit and push version bump: git add package.json && git commit -m 'Bump version to ${NEW_VERSION}' && git push"
echo "  2. Create git tag: git tag v${NEW_VERSION} && git push --tags"
echo "  3. Update CHANGELOG.md with release notes"
echo "  4. Create GitHub release (optional)"
echo ""
echo "Installation command:"
echo -e "  ${GREEN}npm install ${PACKAGE_NAME}@${NEW_VERSION}${NC}"

