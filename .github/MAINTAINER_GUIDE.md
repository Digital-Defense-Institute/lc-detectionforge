# Maintainer Release Guide

This guide is for project maintainers who coordinate releases by aggregating multiple contributor PRs.

## 🚀 Release Workflow

### 1. Review and Select PRs

- Review open PRs for quality and completeness
- Identify PRs that should be grouped together
- Consider impact level (patch, minor, major)
- Check for any breaking changes

### 2. Create Release Branch

```bash
# Start from clean main
git checkout main
git pull origin main

# Create release branch
git checkout -b release/v1.X.0
```

### 3. Aggregate Selected Changes

**Option A: Cherry-pick commits from merged PRs**
```bash
git cherry-pick <commit-hash-1>
git cherry-pick <commit-hash-2>
git cherry-pick <commit-hash-3>
```

**Option B: Merge feature branches (if PRs aren't merged yet)**
```bash
git merge feature/contributor-branch-1
git merge feature/contributor-branch-2
```

**Option C: Manual application for complex cases**
```bash
# Apply changes manually and commit
git add .
git commit -m "Aggregate changes from multiple PRs"
```

### 4. Update Version and Changelog

#### A. Update Changelog First
Edit `src/utils/version.ts`:

```typescript
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.X.0', // New version
    date: 'YYYY-MM-DD', // Today's date
    description: 'Optional: Describe release theme if needed',
    changes: {
      added: [
        'Feature from PR #123',
        'Enhancement from PR #124',
      ],
      changed: [
        'Improvement from PR #125',
      ],
      fixed: [
        'Bug fix from PR #126',
        'Issue resolution from PR #127',
      ],
    },
  },
  // ... existing entries
]
```

#### B. Bump Version
```bash
# Choose appropriate version bump
npm run version:patch  # Bug fixes only
npm run version:minor  # New features, backward compatible
npm run version:major  # Breaking changes
```

### 5. Create Release PR

```bash
# Push release branch
git push -u origin release/v1.X.0

# Create PR (customize as needed)
gh pr create \
  --title "Release v1.X.0: [Brief Summary]" \
  --body "$(cat <<'EOF'
## Release Summary

Brief description of what this release includes.

### Aggregated Changes

This release combines the following contributions:
- PR #123: Feature description (@contributor1)
- PR #124: Bug fix description (@contributor2)
- PR #125: Enhancement description (@contributor3)

### Impact Assessment

- **Breaking Changes**: None/List any
- **New Features**: List major features
- **Bug Fixes**: List significant fixes
- **Version Type**: Patch/Minor/Major

### Files Changed

- `src/components/ComponentName.vue` - Feature implementation
- `src/utils/utilityName.ts` - Bug fixes
- `package.json` - Version bump to v1.X.0
- `src/utils/version.ts` - Changelog update

### Testing Completed

- [ ] Manual testing of all aggregated changes
- [ ] Regression testing of existing functionality
- [ ] Cross-browser compatibility verification
- [ ] Build and deployment validation

All changes maintain backward compatibility and improve the detection engineering experience.
EOF
)"
```

### 6. CI/CD Validation

- Wait for all CI checks to pass
- Review any test failures or build issues
- Address any conflicts or integration problems
- Ensure deployment preview works correctly

### 7. Merge and Tag Release

```bash
# After PR approval and merge
git checkout main
git pull origin main

# Create and push tag
git tag v1.X.0
git push origin v1.X.0
```

### 8. Post-Release Tasks

- Update GitHub release notes if needed
- Close any resolved issues referenced in the release
- Announce release in appropriate channels
- Monitor for any immediate issues

## 📋 Release Checklist

### Pre-Release
- [ ] All selected PRs are reviewed and approved
- [ ] No merge conflicts in release branch
- [ ] Changelog accurately reflects all changes
- [ ] Version bump is appropriate for changes included
- [ ] All contributors are credited appropriately

### During Release
- [ ] CI/CD pipeline passes completely
- [ ] Manual testing of aggregated changes
- [ ] Documentation reflects any new features
- [ ] No breaking changes without major version bump

### Post-Release
- [ ] Tag created and pushed
- [ ] GitHub release notes published
- [ ] Resolved issues closed and referenced
- [ ] Community notifications sent if needed

## 🛠️ Helpful Commands

### Review PR Changes
```bash
# See what changed in a specific PR
gh pr diff <PR_NUMBER>

# List commits in a PR
gh pr view <PR_NUMBER> --json commits

# See file changes across multiple PRs
git log --oneline --graph main..feature-branch
```

### Manage Release Branch
```bash
# See current branch status
git status
git log --oneline -10

# Undo last commit if needed
git reset --soft HEAD~1

# Force push updated release branch
git push --force origin release/v1.X.0
```

### Version Information
```bash
# Check current version
npm version

# See version history
git tag --sort=-v:refname | head -10

# Check what's changed since last release
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

## 🎯 Best Practices

### Release Timing
- **Group related features** that work well together
- **Batch small fixes** to reduce release overhead
- **Separate breaking changes** into dedicated major releases
- **Consider user impact** when timing releases

### Communication
- **Credit all contributors** in release notes
- **Explain breaking changes** clearly
- **Highlight major features** prominently
- **Link to relevant documentation** updates

### Quality Assurance
- **Test aggregated changes** together, not just individually
- **Verify backward compatibility** unless major version
- **Check edge cases** where features might interact
- **Validate deployment process** in staging environment

### Documentation
- **Update README** if features change workflow
- **Maintain CONTRIBUTING.md** with current process
- **Keep changelog accurate** and user-focused
- **Document any new dependencies** or requirements

## 🚨 Troubleshooting

### Merge Conflicts
```bash
# Resolve conflicts manually, then:
git add .
git commit -m "Resolve merge conflicts"
```

### CI Failures
- Check if aggregated changes cause integration issues
- Verify all dependencies are compatible
- Ensure tests account for combined functionality
- Consider splitting release if conflicts can't be resolved

### Version Conflicts
- If npm version fails, ensure working directory is clean
- Manual version update may be needed for complex scenarios
- Always commit changelog before running npm version command

---

This process ensures high-quality releases while keeping contributor workflow simple and focused on implementation rather than release management.