/*
 * DetectionForge - A comprehensive detection engineering environment
 * Copyright (C) 2025 Digital Defense Institute
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// Central version management for DetectionForge
// Import version from package.json as single source of truth
import packageJson from '../../package.json'

export const APP_VERSION = packageJson.version

export interface ChangelogEntry {
  version: string
  date: string
  changes: {
    added?: string[]
    changed?: string[]
    fixed?: string[]
    removed?: string[]
    security?: string[]
  }
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2025-06-20',
    changes: {
      added: [
        'Changelog and Release Notes system with semantic versioning',
        'Version display in footer with clickable links to changelog',
        'VERSION_MANAGEMENT.md documentation guide',
        'Configuration export versioning with compatibility tracking',
        'Automatic organization URL fetching with visual indicators',
        'Enhanced API testing with formatted/raw data toggle views',
        'Progress notifications for long-running operations',
        'Comprehensive logging system replacing console.log statements',
      ],
      changed: [
        'Enhanced error handling and user feedback throughout app',
        'Better notification system with progress indicators',
      ],
      fixed: ['Fixed bug where replay would fail due to missing organization URLs'],
    },
  },
  {
    version: '1.0.0',
    date: '2025-06-18',
    changes: {
      added: [
        'Initial release of DetectionForge',
        'Advanced Rule Editor with CodeMirror v6 and YAML syntax highlighting',
        'Multi-Organization Support with secure credential management',
        'Bulk organization import via OID lists',
        'Real-time rule validation and testing capabilities',
        'Configuration management with import/export functionality',
        'API testing capabilities with organization URL validation',
        'JWT token generation and management',
      ],
      security: [
        'Client-side only architecture with no server-side data storage',
        'Memory-only credential storage',
        'HTML rendering sanitization to prevent XSS attacks',
      ],
    },
  },
]

export function getCurrentVersion(): string {
  return APP_VERSION
}

export function getLatestChangelog(): ChangelogEntry | null {
  return CHANGELOG.length > 0 ? CHANGELOG[0] : null
}

export function getAllChangelog(): ChangelogEntry[] {
  return [...CHANGELOG]
}

/**
 * Helper function to create a new changelog entry template
 * Use this when updating to a new version
 */
export function createChangelogTemplate(version: string, date: string): ChangelogEntry {
  return {
    version,
    date,
    changes: {
      added: [],
      changed: [],
      fixed: [],
      removed: [],
      security: [],
    },
  }
}
