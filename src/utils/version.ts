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
    version: '1.7.0',
    date: '2025-10-15',
    description:
      'Enhanced reliability and usability with sensor selector expression builder and automatic retry logic',
    changes: {
      added: [
        'Sensor Selector Expression Builder: Interactive modal accessible via "Build Expression" button for easily crafting complex selector expressions without memorizing syntax',
        'Expression builder field selection: Complete coverage of sensor IDs, platform/architecture, network/host info, state/tags, and timestamps with organized optgroups',
        'Expression builder smart value inputs: Dropdowns for 50+ LimaCharlie platforms (EDR/XDR, OS, Cloud/SaaS, Security Tools, etc.) and 9 architecture types, boolean toggles for state fields, and text inputs for custom values',
        'Expression builder documentation links: Direct access to Selector Expressions and ID Schemas documentation within the modal',
        'Expression builder real-time preview: Live expression generation with automatic formatting including backtick quoting for platform names starting with numbers',
        'Expression builder condition management: Add/remove conditions, toggle between AND/OR logic operators, and visual display of all current conditions',
        'Automatic retry logic for failed backtests/replays: Up to 2 retries (3 total attempts) for transient errors like network timeouts and I/O errors, with real-time status updates showing "Retrying (N failed)"',
        'Retry count tracking: Display retry attempts in backtest results UI and include retry statistics in markdown export',
        'Fuzzy matching for validation errors: Intelligent "Did you mean...?" suggestions for typos in operators and actions',
        'Copy buttons for Detect Logic and Respond Logic editors with clipboard support and browser fallback',
      ],
      changed: [
        'Performance tip styling: Upgraded sensor selector performance note to prominent callout box with gradient background and success-colored accents for better visibility',
        'Performance tip messaging: Enhanced to emphasize cost reduction benefits (10-100x faster, reduced costs, timeout prevention) and reference to new "Build Expression" button',
        'Retry behavior: Smart retry logic that only retries actual errors while respecting intentional user actions (cancellations and timeouts)',
        'Organization selection list in backtesting now displays in alphabetical order',
        'D&R autocompletion enhanced with improved context detection and development-mode debug logging',
        'Cost estimate invalidation now clears when any backtest parameter changes (dates, orgs, selector, limits, stream, sensor ID)',
      ],
      fixed: [
        'Critical bug: Backtests now correctly detect and report failures when LimaCharlie replay API returns HTTP 200 OK status with nested error object in response body (previously misreported as "Success" with "0 matches")',
        'Transient error resilience: Network errors, API timeouts, and I/O errors now trigger automatic retry instead of immediate failure',
        'D&R autocompletion now correctly suggests operators, event types, and field names in array items and nested rules',
        'Unit test and backtest buttons now properly disabled when credentials not configured, preventing immediate failures and guiding users to configuration page',
        'Dark mode readability issues in Billing Notice and Cost Estimate modals with hardcoded light colors now properly use theme-aware CSS variables',
        '30-day billing period calculation now uses reactive time tracking to ensure warnings appear correctly even if page is left open for extended periods',
      ],
    },
  },
  {
    version: '1.6.0',
    date: '2025-08-14',
    description:
      'Comprehensive billing features for backtest/replay with cost estimation and enhanced warnings',
    changes: {
      added: [
        'Cost Estimation - New "Estimate Cost" button runs dry runs to calculate estimated costs before backtesting with prominent warnings about 2-5x underestimation',
        'Persistent Billing Warnings - Warnings now show every time (not just once) when backtests exceed the 30-day free period',
        'Enhanced Billing Details - Display specific timeframe beyond free period with billed vs free period breakdown',
        'Cost Tracking Display - Real-time display of n_billed and n_free events with actual cost calculations at $0.01 per 200,000 events',
        'Persistent Cost Estimates - Valid estimates display beneath Run Backtest button and automatically invalidate when parameters change',
        'Estimate vs Actual Comparison - Track and display cost estimates alongside actual costs in results and markdown exports',
        '"Estimate Cost First" Option - New button in billing warning modal to run cost estimation before proceeding',
      ],
      changed: [
        'Modified "Last 30 Days" preset to "Last 29 Days" to provide safety buffer against accidental billing',
        'Enhanced markdown reports to prominently display Cost Estimate and Actual Cost at the top of the summary',
      ],
    },
  },
  {
    version: '1.5.0',
    date: '2025-07-28',
    description:
      'Major feature release with PWA support, enhanced backtest UX, and improved user experience',
    changes: {
      added: [
        'Progressive Web App (PWA) Support - Install DetectionForge as a standalone app with offline capabilities and automatic updates',
        'Application Settings - New persistent settings section on the configuration page including "Include header text in IaC export" and "Automatically open first imported rule" options (contributed by @Nynir)',
        'Advanced Backtest Options - Added Sensor ID (SID) field for targeted backtesting and Data Stream selector (event/audit/detect)',
        'Live Backtest Results - View match counts and results in real-time during parallel execution without waiting for all organizations to finish',
        'Enhanced Backtest Help Documentation - Comprehensive help modals explaining Event Limit vs Evaluation Limit with practical examples',
        'Update Notifier - Subtle notification when PWA updates are available',
      ],
      changed: [
        'Backtest Result Sorting - Organizations now sorted by match count (highest first), then by status, then alphabetically',
        'Match Count Display - Color-coded badges for match counts (green: 0, yellow: 1-500, red: 501+) with transparent backgrounds',
        "UTC Timestamp Standardization - All timestamps now clearly display in UTC with 'Z' suffix notation to prevent timezone confusion",
      ],
      fixed: [
        'Stateful Processing Parameter - Removed broken isStateful parameter from backtest API calls per LimaCharlie team guidance (backend now auto-detects)',
        'Bulk Import Modal - Fixed modal positioning to properly float over content with dark overlay, added real-time progress tracking showing X/Y organizations processed',
      ],
    },
  },
  {
    version: '1.4.1',
    date: '2025-07-15',
    description: 'Critical bug fix for backtest replay inconsistencies',
    changes: {
      fixed: [
        'Inverted stateful processing logic - Fixed boolean inversion that caused backtests to run with opposite stateful setting than selected, resulting in different results compared to LimaCharlie native replay',
      ],
    },
  },
  {
    version: '1.4.0',
    date: '2025-07-12',
    description:
      'All changes in this release pertain exclusively to Unit Test sample event templates',
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
