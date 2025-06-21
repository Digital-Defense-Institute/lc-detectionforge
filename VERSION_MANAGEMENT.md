# Version Management Guide

DetectionForge uses semantic versioning with `package.json` as the single source of truth.

## Quick Version Updates

Use these npm scripts to update versions:

```bash
# Patch version (1.0.0 → 1.0.1) - for bug fixes
npm run version:patch

# Minor version (1.0.0 → 1.1.0) - for new features
npm run version:minor

# Major version (1.0.0 → 2.0.0) - for breaking changes
npm run version:major
```

## Adding Changelog Entries

1. **Update the version** using one of the scripts above
2. **Add a new changelog entry** to `src/utils/version.ts` with the **specific version number**
3. **Keep entries in reverse chronological order** (newest first)

### Example:

```typescript
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0', // ← Use specific version, not packageJson.version
    date: '2025-06-21',
    changes: {
      added: [
        'New feature X',
        'New feature Y'
      ],
      fixed: [
        'Fixed bug Z'
      ]
    }
  },
  {
    version: '1.0.0', // ← Previous entries stay fixed
    date: '2025-06-20',
    changes: {
      // ... existing changes
    }
  }
]
```

⚠️ **Important**: Always use literal version strings in changelog entries, not `packageJson.version`. This ensures historical accuracy.

## How It Works

- **Single Source of Truth**: `package.json` version is imported into `src/utils/version.ts`
- **Automatic Sync**: Version is automatically reflected across all components
- **No Manual Updates**: Version only needs to be updated in `package.json`
- **Build-Time Resolution**: Version is resolved at build time, not runtime

## Changelog Categories

Use these standard categories in your changelog entries:

- **added**: New features
- **changed**: Changes in existing functionality
- **fixed**: Bug fixes
- **removed**: Removed features
- **security**: Security improvements

## Git Workflow

The `npm version` commands automatically:

1. Update `package.json`
2. Create a git commit
3. Create a git tag

This ensures your versions are properly tracked in git.

## Configuration Export Versioning

Configuration exports now automatically include the app version for better compatibility tracking:

```json
{
  "version": "1.0.0",
  "exportDate": "2025-06-20T10:30:00.000Z",
  "appVersion": "1.0.0",
  "data": {
    // ... configuration data
  }
}
```

### Import Compatibility Warnings

When importing configurations, you'll see warnings for:

- **App version mismatches**: Config from different DetectionForge version
- **Missing version info**: Config from older versions without version tracking

This helps identify potential compatibility issues before importing configurations.
