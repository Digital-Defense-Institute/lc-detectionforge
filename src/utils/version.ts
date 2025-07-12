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
  description?: string
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
    version: '1.4.0',
    date: '2025-07-12',
    description: 'All changes in this release pertain exclusively to Unit Test sample event templates',
    changes: {
      added: [
        'Four New Event Types - EXISTING_PROCESS, SERVICE_CHANGE, SENSITIVE_PROCESS_ACCESS, NEW_REMOTE_THREAD templates for comprehensive detection rule testing',
        'Complete Template Overhaul - All 11 event types now feature accurate field structures based on real LimaCharlie telemetry samples',
        'Enhanced Event Type Coverage - Full support for all major LimaCharlie event types with proper nested objects and field relationships',
      ],
      changed: [
        'Improved Template Data Accuracy - All sample events now use correct SHA256 hash lengths (64 chars) and proper atom identifiers (32 chars)',
        'Enhanced Field Structure Compliance - Templates now match real LimaCharlie event schemas including PARENT objects, SIGNATURE data, and complex nested structures',
        'Comprehensive Data Sanitization - All templates use generic, non-identifying test data while maintaining structural realism for effective testing',
      ],
      fixed: [
        'Template Hash Length Validation - Corrected all SHA256 hashes in sample events from 66 to proper 64-character format',
        'Template Atom Identifier Standards - Fixed all event atoms in templates to use proper 32-character hexadecimal format for LimaCharlie compatibility',
        'Template Missing PARENT Fields - Added missing PARENT_ATOM and COMMAND_LINE fields to process event templates for complete structural accuracy',
        'Template Windows Event Log Fields - Added all missing EventData fields to WEL sample events for comprehensive Windows security event testing',
        'Template Platform Value Accuracy - Corrected WEL platform identifier in samples to match Windows (268435456) as shown in real telemetry',
      ],
    },
  },
  {
    version: '1.3.0',
    date: '2025-06-27',
    changes: {
      added: [
        'Automatically Load IaC Imports - Checkbox in the IaC import screen that allows for automatic loading of first (top-most) rule',
      ],
      fixed: ['In dark mode the "Current" label text was not visible'],
    },
  },
  {
    version: '1.2.0',
    date: '2025-06-26',
    changes: {
      added: [
        'D&R Autocompletion Engine - Context-aware suggestions for operators, actions, fields, and templates',
        'Parallel Backtest Execution - Run backtests across multiple organizations simultaneously with 45min timeout',
        'Dark Mode Support - Complete theme system with automatic detection and persistence',
        'Backtest Cancellation - Ability to cancel long-running backtests with partial result preservation',
        'Stateful/Dry-run Options - Control whether backtests are stateful or dry-run',
        'Chunked Results Support - Handle large backtest results with pagination',
        'Copy Summary Feature - Export unit test and backtest results as markdown summaries for pull requests and change management systems',
      ],
      changed: [
        'Major Rules.vue Refactor - Reduced component size by ~1100 lines for better performance',
        'Enhanced Backtest API - Added timeout handling, better error recovery, and progress tracking',
        'Improved UI/UX - Professional dark mode implementation with proper contrast throughout',
        'Minor UI component tweaks for improved user experience and interface consistency',
        'Substantial style optimizations across the application for improved performance and consistency',
      ],
      fixed: [
        'Backtest timeout handling for long-running operations',
        'Timezone handling in backtest datetime inputs - now correctly interprets times as UTC',
        'Changelog date rendering showing incorrect dates due to timezone conversion',
      ],
    },
  },
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
