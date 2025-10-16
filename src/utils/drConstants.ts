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

/**
 * D&R (Detection and Response) Shared Constants
 *
 * This module provides shared constants for D&R validation and autocompletion,
 * ensuring consistency across the application.
 */

// ============================================================================
// Detection Logic Operators
// ============================================================================

/**
 * All valid D&R detection operators
 * These are used for both validation and autocompletion
 */
export const VALID_DETECT_OPERATORS = [
  // Logical operators
  'and',
  'or',

  // String comparison operators
  'is',
  'exists',
  'contains',
  'starts with',
  'ends with',
  'matches',
  'string distance',

  // System operators
  'is platform',
  'is tagged',
  'is 32 bit',
  'is 64 bit',
  'is arm',

  // Network operators
  'cidr',
  'is private address',
  'is public address',

  // Numeric comparison operators
  'is greater than',
  'is lower than',

  // Time operator
  'is older than',

  // Advanced operators
  'lookup',
  'scope',

  // Transform operators (modify field before comparison)
  'file name',
  'sub domain',
] as const

/**
 * Operators that require a 'path' field
 */
export const PATH_REQUIRED_OPERATORS = [
  'is',
  'exists',
  'contains',
  'starts with',
  'ends with',
  'is greater than',
  'is lower than',
  'matches',
  'string distance',
  'lookup',
  'cidr',
  'is private address',
  'is public address',
  'is older than',
  'file name',
  'sub domain',
] as const

/**
 * Operators that require a 'value' field
 */
export const VALUE_REQUIRED_OPERATORS = [
  'is',
  'contains',
  'starts with',
  'ends with',
  'is greater than',
  'is lower than',
  'string distance',
] as const

// ============================================================================
// Detection Logic Properties
// ============================================================================

/**
 * All valid properties that can appear in detection rules
 */
export const VALID_DETECT_PROPERTIES = [
  // Core fields
  'op',
  'path',
  'value',

  // Modifier fields
  'case sensitive',
  're',
  'max',
  'seconds',
  'tag',
  'resource',

  // Structure fields
  'rules',
  'rule',
  'event',
  'events',
  'target',

  // Special fields
  'not',
  'count',
  'length of',
  'times',
  'with child',
] as const

// ============================================================================
// Response Actions
// ============================================================================

/**
 * All valid response actions (per LimaCharlie specification)
 */
export const VALID_RESPONSE_ACTIONS = [
  // Core actions
  'report',
  'add tag',
  'remove tag',

  // Variable actions
  'add var',
  'del var',

  // Network actions
  'isolate network',
  'rejoin network',

  // Sensor actions
  'seal',
  'unseal',
  'undelete sensor',

  // Task and extension actions
  'task',
  'extension request',

  // Hive actions
  'add hive tag',
  'remove hive tag',

  // Output and flow control
  'output',
  'wait',
] as const

// ============================================================================
// Response Action Optional Fields
// ============================================================================

/**
 * Common optional fields that can appear in response actions
 */
export const RESPONSE_COMMON_FIELDS = [
  'action',
  'suppression',
  'tag',
  'entire_device',
  'ttl',
  'name',
  'value',
  'extension name',
  'extension action',
  'extension request',
  'based on report',
  'publish',
  'priority',
  'metadata',
  'detect_data',
  'command',
  'investigation',
  'duration',
  'hive name',
  'record name',
] as const

// ============================================================================
// Type Exports for TypeScript
// ============================================================================

export type DetectOperator = (typeof VALID_DETECT_OPERATORS)[number]
export type DetectProperty = (typeof VALID_DETECT_PROPERTIES)[number]
export type ResponseAction = (typeof VALID_RESPONSE_ACTIONS)[number]
export type ResponseCommonField = (typeof RESPONSE_COMMON_FIELDS)[number]
