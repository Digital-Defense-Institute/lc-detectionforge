#!/bin/bash

# Release Validation Script for DetectionForge
# This script helps maintainers validate that a release is ready

set -e

echo "🔍 DetectionForge Release Validation"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're on a release branch
BRANCH=$(git branch --show-current)
if [[ ! $BRANCH == release/* ]]; then
    echo -e "${YELLOW}⚠️  Warning: Not on a release branch (current: $BRANCH)${NC}"
    echo "   Release branches should follow pattern: release/v1.X.0"
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${RED}❌ Uncommitted changes detected${NC}"
    git status --porcelain
    exit 1
else
    echo -e "${GREEN}✅ Working directory clean${NC}"
fi

# Validate package.json version format
PACKAGE_VERSION=$(node -p "require('./package.json').version")
if [[ $PACKAGE_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${GREEN}✅ Valid package.json version: $PACKAGE_VERSION${NC}"
else
    echo -e "${RED}❌ Invalid package.json version format: $PACKAGE_VERSION${NC}"
    exit 1
fi

# Check if changelog has been updated
CHANGELOG_VERSION=$(node -p "require('./src/utils/version.ts').CHANGELOG[0].version" 2>/dev/null || echo "error")
if [[ $CHANGELOG_VERSION == $PACKAGE_VERSION ]]; then
    echo -e "${GREEN}✅ Changelog version matches package.json: $CHANGELOG_VERSION${NC}"
else
    echo -e "${RED}❌ Changelog version mismatch${NC}"
    echo "   Package.json: $PACKAGE_VERSION"
    echo "   Changelog: $CHANGELOG_VERSION"
    exit 1
fi

# Validate changelog date format
CHANGELOG_DATE=$(node -p "require('./src/utils/version.ts').CHANGELOG[0].date" 2>/dev/null || echo "error")
if [[ $CHANGELOG_DATE =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo -e "${GREEN}✅ Valid changelog date format: $CHANGELOG_DATE${NC}"
else
    echo -e "${RED}❌ Invalid changelog date format: $CHANGELOG_DATE${NC}"
    echo "   Expected: YYYY-MM-DD"
    exit 1
fi

# Check if changelog has content
CHANGELOG_CHANGES=$(node -p "
const changelog = require('./src/utils/version.ts').CHANGELOG[0].changes;
const hasChanges = Object.keys(changelog).some(key => 
    changelog[key] && changelog[key].length > 0
);
hasChanges.toString();
" 2>/dev/null || echo "false")

if [[ $CHANGELOG_CHANGES == "true" ]]; then
    echo -e "${GREEN}✅ Changelog contains changes${NC}"
else
    echo -e "${RED}❌ Changelog appears empty${NC}"
    exit 1
fi

# Run type checking
echo ""
echo "🔍 Running type checks..."
if npm run type-check; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi

# Run linting
echo ""
echo "🔍 Running linting..."
if npm run lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${RED}❌ Linting failed${NC}"
    exit 1
fi

# Test build
echo ""
echo "🔍 Testing production build..."
if npm run build; then
    echo -e "${GREEN}✅ Production build successful${NC}"
else
    echo -e "${RED}❌ Production build failed${NC}"
    exit 1
fi

# Check for common issues
echo ""
echo "🔍 Checking for common issues..."

# Check for console.log statements (except in development files)
if git ls-files "src/**/*.{ts,vue}" | xargs grep -l "console\.log" | grep -v "\.dev\." | head -1; then
    echo -e "${YELLOW}⚠️  Warning: console.log statements found in source files${NC}"
    echo "   Consider removing or replacing with proper logging"
fi

# Check for TODO/FIXME comments
TODO_COUNT=$(git ls-files "src/**/*.{ts,vue}" | xargs grep -c "TODO\|FIXME" 2>/dev/null | awk -F: '{sum += $2} END {print sum+0}')
if [[ $TODO_COUNT -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO/FIXME comments${NC}"
    echo "   Consider addressing before release"
fi

# Summary
echo ""
echo "📋 Release Validation Summary"
echo "============================="
echo "Version: $PACKAGE_VERSION"
echo "Date: $CHANGELOG_DATE"
echo "Branch: $BRANCH"

echo ""
echo -e "${GREEN}🎉 Release validation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Push release branch: git push -u origin $BRANCH"
echo "2. Create PR: gh pr create --title 'Release $PACKAGE_VERSION'"
echo "3. Wait for CI/CD validation"
echo "4. Merge and tag release"

exit 0