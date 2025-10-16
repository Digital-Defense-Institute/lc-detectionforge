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
 * D&R (Detection and Response) Schema
 *
 * This module provides the canonical schema for D&R operators and actions.
 * It serves as the single source of truth for validation and autocomplete,
 * making it easy to maintain as LimaCharlie evolves.
 *
 * To add a new operator or action, simply add it to this schema and both
 * validation and autocomplete will automatically support it.
 */

import {
  VALID_DETECT_OPERATORS as _VALID_DETECT_OPERATORS,
  VALID_RESPONSE_ACTIONS as _VALID_RESPONSE_ACTIONS,
  type DetectOperator,
  type ResponseAction,
} from './drConstants'

// ============================================================================
// Type Definitions
// ============================================================================

export interface FieldDefinition {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  values?: string[] // For enum-like fields
  min?: number // For numeric fields
  max?: number // For numeric fields
  pattern?: string // For string validation
}

export interface OperatorSchema {
  name: DetectOperator
  description: string
  requiredFields: string[] // e.g., ['path', 'value']
  optionalFields: FieldDefinition[]
  examples: string[]
  validTargets?: string[] // e.g., ['edr']
  category: 'logical' | 'string' | 'numeric' | 'network' | 'system' | 'advanced' | 'time'
}

export interface ActionSchema {
  name: ResponseAction
  description: string
  requiredFields: FieldDefinition[]
  optionalFields: FieldDefinition[]
  examples: string[]
  category: 'core' | 'task' | 'advanced'
}

// ============================================================================
// Detection Operator Schemas
// ============================================================================

/**
 * Canonical schema for all detection operators
 * This is the single source of truth for operator validation and autocomplete
 */
export const OPERATOR_SCHEMAS: Record<DetectOperator, OperatorSchema> = {
  // Logical Operators
  and: {
    name: 'and',
    description: 'All conditions must be true',
    requiredFields: ['rules'],
    optionalFields: [
      { name: 'not', type: 'boolean', description: 'Invert the result' },
      { name: 'times', type: 'number', description: 'Number of occurrences' },
      { name: 'seconds', type: 'number', description: 'Time window in seconds' },
    ],
    examples: ['op: and\nrules:\n  - op: is\n    path: event/EVENT_TYPE\n    value: NEW_PROCESS'],
    category: 'logical',
  },

  or: {
    name: 'or',
    description: 'Any condition can be true',
    requiredFields: ['rules'],
    optionalFields: [
      { name: 'not', type: 'boolean', description: 'Invert the result' },
      { name: 'times', type: 'number', description: 'Number of occurrences' },
      { name: 'seconds', type: 'number', description: 'Time window in seconds' },
    ],
    examples: ['op: or\nrules:\n  - op: ends with\n    path: event/FILE_PATH\n    value: .exe'],
    category: 'logical',
  },

  // String Comparison Operators
  is: {
    name: 'is',
    description: 'Exact match comparison',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'case sensitive', type: 'boolean', description: 'Case-sensitive matching' },
      { name: 'not', type: 'boolean', description: 'Invert the result' },
      { name: 'file name', type: 'boolean', description: 'Extract filename from path' },
      { name: 'sub domain', type: 'boolean', description: 'Extract subdomain' },
    ],
    examples: ['op: is\npath: event/FILE_NAME\nvalue: cmd.exe\ncase sensitive: true'],
    category: 'string',
  },

  exists: {
    name: 'exists',
    description: 'Check if field exists',
    requiredFields: ['path'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: exists\npath: event/NETWORK_ACTIVITY'],
    category: 'numeric',
  },

  contains: {
    name: 'contains',
    description: 'Substring search',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'case sensitive', type: 'boolean', description: 'Case-sensitive matching' },
      { name: 'not', type: 'boolean', description: 'Invert the result' },
      { name: 'file name', type: 'boolean', description: 'Extract filename from path' },
      { name: 'sub domain', type: 'boolean', description: 'Extract subdomain' },
    ],
    examples: ['op: contains\npath: event/COMMAND_LINE\nvalue: powershell'],
    category: 'string',
  },

  'starts with': {
    name: 'starts with',
    description: 'Prefix matching',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'case sensitive', type: 'boolean', description: 'Case-sensitive matching' },
      { name: 'not', type: 'boolean', description: 'Invert the result' },
      { name: 'file name', type: 'boolean', description: 'Extract filename from path' },
      { name: 'sub domain', type: 'boolean', description: 'Extract subdomain' },
    ],
    examples: ['op: starts with\npath: event/FILE_PATH\nvalue: C:\\Windows\\'],
    category: 'string',
  },

  'ends with': {
    name: 'ends with',
    description: 'Suffix matching',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'case sensitive', type: 'boolean', description: 'Case-sensitive matching' },
      { name: 'not', type: 'boolean', description: 'Invert the result' },
      { name: 'file name', type: 'boolean', description: 'Extract filename from path' },
      { name: 'sub domain', type: 'boolean', description: 'Extract subdomain' },
    ],
    examples: ['op: ends with\npath: event/FILE_PATH\nvalue: .exe'],
    category: 'string',
  },

  matches: {
    name: 'matches',
    description: 'Regular expression matching',
    requiredFields: ['path', 're'],
    optionalFields: [
      { name: 'case sensitive', type: 'boolean', description: 'Case-sensitive matching' },
      { name: 'not', type: 'boolean', description: 'Invert the result' },
    ],
    examples: ['op: matches\npath: event/COMMAND_LINE\nre: "\\b(cmd|powershell)\\b"'],
    category: 'string',
  },

  'string distance': {
    name: 'string distance',
    description: 'Levenshtein distance comparison',
    requiredFields: ['path', 'value', 'max'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: string distance\npath: event/FILE_NAME\nvalue: cmd.exe\nmax: 2'],
    category: 'string',
  },

  // System Operators
  'is platform': {
    name: 'is platform',
    description: 'Check sensor platform',
    requiredFields: ['path', 'value'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: is platform\npath: routing/platform\nvalue: windows'],
    validTargets: ['edr'],
    category: 'system',
  },

  'is tagged': {
    name: 'is tagged',
    description: 'Check sensor tags',
    requiredFields: ['tag'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: is tagged\ntag: vip_asset'],
    validTargets: ['edr'],
    category: 'system',
  },

  'is 32 bit': {
    name: 'is 32 bit',
    description: 'Check if architecture is 32-bit',
    requiredFields: ['path'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: is 32 bit\npath: routing/arch'],
    validTargets: ['edr'],
    category: 'system',
  },

  'is 64 bit': {
    name: 'is 64 bit',
    description: 'Check if architecture is 64-bit',
    requiredFields: ['path'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: is 64 bit\npath: routing/arch'],
    validTargets: ['edr'],
    category: 'system',
  },

  'is arm': {
    name: 'is arm',
    description: 'Check if architecture is ARM',
    requiredFields: ['path'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: is arm\npath: routing/arch'],
    validTargets: ['edr'],
    category: 'system',
  },

  // Network Operators
  cidr: {
    name: 'cidr',
    description: 'CIDR network matching',
    requiredFields: ['path', 'cidr'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: cidr\npath: event/IP_ADDRESS\ncidr: 192.168.0.0/16'],
    category: 'network',
  },

  'is private address': {
    name: 'is private address',
    description: 'Check if IP is in private range',
    requiredFields: ['path'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: is private address\npath: event/SOURCE_IP'],
    category: 'network',
  },

  'is public address': {
    name: 'is public address',
    description: 'Check if IP is in public range',
    requiredFields: ['path'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: is public address\npath: event/DESTINATION_IP'],
    category: 'network',
  },

  // Numeric Comparison Operators
  'is greater than': {
    name: 'is greater than',
    description: 'Numeric greater than comparison',
    requiredFields: ['path', 'value'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: is greater than\npath: event/PROCESS_ID\nvalue: 1000'],
    category: 'numeric',
  },

  'is lower than': {
    name: 'is lower than',
    description: 'Numeric less than comparison',
    requiredFields: ['path', 'value'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: is lower than\npath: event/SIZE\nvalue: 1024'],
    category: 'numeric',
  },

  // Time Operator
  'is older than': {
    name: 'is older than',
    description: 'Check if timestamp is older than specified seconds',
    requiredFields: ['path', 'seconds'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: ['op: is older than\npath: event/TIMESTAMP\nseconds: 3600'],
    category: 'time',
  },

  // Advanced Operators
  lookup: {
    name: 'lookup',
    description: 'Threat intelligence lookup',
    requiredFields: ['path', 'lookup'],
    optionalFields: [
      { name: 'min_confidence', type: 'number', description: 'Minimum confidence threshold' },
      { name: 'not', type: 'boolean', description: 'Invert the result' },
    ],
    examples: ['op: lookup\npath: event/HASH\nlookup: sha256\nmin_confidence: 80'],
    category: 'advanced',
  },

  scope: {
    name: 'scope',
    description: 'Iterate over array elements and apply rule to each',
    requiredFields: ['path', 'rule'],
    optionalFields: [{ name: 'not', type: 'boolean', description: 'Invert the result' }],
    examples: [
      'op: scope\npath: event/NETWORK_ACTIVITY\nrule:\n  op: is\n  path: event/DESTINATION/PORT\n  value: 443',
    ],
    category: 'advanced',
  },

  // Transform Operators
  'file name': {
    name: 'file name',
    description: 'Extract filename from path before comparison',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'case sensitive', type: 'boolean', description: 'Case-sensitive matching' },
      { name: 'not', type: 'boolean', description: 'Invert the result' },
    ],
    examples: ['op: file name\npath: event/FILE_PATH\nvalue: malware.exe'],
    category: 'advanced',
  },

  'sub domain': {
    name: 'sub domain',
    description: 'Extract subdomain from domain before comparison',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'case sensitive', type: 'boolean', description: 'Case-sensitive matching' },
      { name: 'not', type: 'boolean', description: 'Invert the result' },
    ],
    examples: ['op: sub domain\npath: event/DOMAIN\nvalue: mail'],
    category: 'advanced',
  },
}

// ============================================================================
// Response Action Schemas
// ============================================================================

/**
 * Canonical schema for all response actions
 * This is the single source of truth for action validation and autocomplete
 */
export const ACTION_SCHEMAS: Record<ResponseAction, ActionSchema> = {
  report: {
    name: 'report',
    description: 'Generate detection alert',
    requiredFields: [{ name: 'name', type: 'string', description: 'Detection name' }],
    optionalFields: [
      {
        name: 'priority',
        type: 'number',
        description: 'Priority level (1-5)',
        values: ['1', '2', '3', '4', '5'],
        min: 1,
        max: 5,
      },
      { name: 'publish', type: 'boolean', description: 'Send to external systems' },
      { name: 'metadata', type: 'object', description: 'Custom metadata' },
      { name: 'detect_data', type: 'object', description: 'Event data to include' },
    ],
    examples: [
      '- action: report\n  name: suspicious_activity_detected\n  priority: 1\n  publish: true',
    ],
    category: 'core',
  },

  'add tag': {
    name: 'add tag',
    description: 'Add tag to sensor',
    requiredFields: [{ name: 'tag', type: 'string', description: 'Tag name' }],
    optionalFields: [
      { name: 'ttl', type: 'number', description: 'Time to live in seconds', min: 0 },
      { name: 'entire_device', type: 'boolean', description: 'Tag entire device' },
    ],
    examples: ['- action: add tag\n  tag: compromised\n  ttl: 3600\n  entire_device: true'],
    category: 'core',
  },

  'remove tag': {
    name: 'remove tag',
    description: 'Remove tag from sensor',
    requiredFields: [{ name: 'tag', type: 'string', description: 'Tag name' }],
    optionalFields: [
      { name: 'entire_device', type: 'boolean', description: 'Remove from entire device' },
    ],
    examples: ['- action: remove tag\n  tag: clean'],
    category: 'core',
  },

  'add var': {
    name: 'add var',
    description: 'Add variable to sensor',
    requiredFields: [
      { name: 'name', type: 'string', description: 'Variable name' },
      { name: 'value', type: 'string', description: 'Variable value (supports templates)' },
    ],
    optionalFields: [
      { name: 'ttl', type: 'number', description: 'Time to live in seconds', min: 0 },
    ],
    examples: ['- action: add var\n  name: threat_level\n  value: high\n  ttl: 7200'],
    category: 'core',
  },

  'del var': {
    name: 'del var',
    description: 'Delete variable from sensor',
    requiredFields: [{ name: 'name', type: 'string', description: 'Variable name' }],
    optionalFields: [],
    examples: ['- action: del var\n  name: old_variable'],
    category: 'core',
  },

  'isolate network': {
    name: 'isolate network',
    description: 'Isolate sensor from network',
    requiredFields: [],
    optionalFields: [],
    examples: ['- action: isolate network'],
    category: 'core',
  },

  'rejoin network': {
    name: 'rejoin network',
    description: 'Reconnect sensor to network',
    requiredFields: [],
    optionalFields: [],
    examples: ['- action: rejoin network'],
    category: 'core',
  },

  seal: {
    name: 'seal',
    description: 'Enable tamper resistance',
    requiredFields: [],
    optionalFields: [],
    examples: ['- action: seal'],
    category: 'advanced',
  },

  unseal: {
    name: 'unseal',
    description: 'Disable tamper resistance',
    requiredFields: [],
    optionalFields: [],
    examples: ['- action: unseal'],
    category: 'advanced',
  },

  'undelete sensor': {
    name: 'undelete sensor',
    description: 'Restore deleted sensor',
    requiredFields: [],
    optionalFields: [],
    examples: ['- action: undelete sensor'],
    category: 'advanced',
  },

  task: {
    name: 'task',
    description: 'Send command to sensor',
    requiredFields: [{ name: 'command', type: 'string', description: 'Command to execute' }],
    optionalFields: [{ name: 'investigation', type: 'string', description: 'Investigation ID' }],
    examples: [
      '- action: task\n  command: history_dump\n  investigation: incident_123',
      '- action: task\n  command: file_get {{ .event.FILE_PATH }}',
    ],
    category: 'task',
  },

  'extension request': {
    name: 'extension request',
    description: 'Trigger extension action',
    requiredFields: [
      { name: 'extension name', type: 'string', description: 'Extension name' },
      { name: 'extension action', type: 'string', description: 'Action to perform' },
      { name: 'extension request', type: 'object', description: 'Request payload (templated)' },
    ],
    optionalFields: [
      {
        name: 'based on report',
        type: 'boolean',
        description: 'Whether request is based on most recent report',
      },
    ],
    examples: [
      '- action: extension request\n  extension name: dumper\n  extension action: dump\n  extension request:\n    path: /tmp/dump',
    ],
    category: 'task',
  },

  'add hive tag': {
    name: 'add hive tag',
    description: 'Add tag to Hive record',
    requiredFields: [
      { name: 'hive name', type: 'string', description: 'Name of the hive' },
      { name: 'record name', type: 'string', description: 'Name of the record' },
      { name: 'tag', type: 'string', description: 'Tag to add' },
    ],
    optionalFields: [],
    examples: [
      '- action: add hive tag\n  hive name: my_hive\n  record name: my_record\n  tag: analyzed',
    ],
    category: 'advanced',
  },

  'remove hive tag': {
    name: 'remove hive tag',
    description: 'Remove tag from Hive record',
    requiredFields: [
      { name: 'hive name', type: 'string', description: 'Name of the hive' },
      { name: 'record name', type: 'string', description: 'Name of the record' },
      { name: 'tag', type: 'string', description: 'Tag to remove' },
    ],
    optionalFields: [],
    examples: [
      '- action: remove hive tag\n  hive name: my_hive\n  record name: my_record\n  tag: pending',
    ],
    category: 'advanced',
  },

  output: {
    name: 'output',
    description: 'Forward to output destination',
    requiredFields: [{ name: 'name', type: 'string', description: 'Output name' }],
    optionalFields: [],
    examples: ['- action: output\n  name: siem_output'],
    category: 'advanced',
  },

  wait: {
    name: 'wait',
    description: 'Add delay between actions',
    requiredFields: [
      {
        name: 'duration',
        type: 'string',
        description: 'Duration (e.g., 30s, 5m)',
        pattern: '^[0-9]+(ns|us|µs|ms|s|m|h)$',
      },
    ],
    optionalFields: [],
    examples: ['- action: wait\n  duration: 30s'],
    category: 'advanced',
  },
}

// ============================================================================
// Validation at compile time
// ============================================================================

// Ensure all operators in VALID_DETECT_OPERATORS have schemas
const _operatorCheck: Record<DetectOperator, OperatorSchema> = OPERATOR_SCHEMAS
void _operatorCheck // Suppress unused variable warning

// Ensure all actions in VALID_RESPONSE_ACTIONS have schemas
const _actionCheck: Record<ResponseAction, ActionSchema> = ACTION_SCHEMAS
void _actionCheck // Suppress unused variable warning
