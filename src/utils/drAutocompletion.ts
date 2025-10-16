/**
 * LimaCharlie Detection & Response Autocompletion Engine
 *
 * This module provides structured, context-aware autocompletion for D&R rules
 *
 * NOTE: This file uses schemas from drSchema.ts as the single source of truth.
 * All operator and action metadata is derived from the canonical schema to ensure
 * consistency between validation and autocomplete.
 */

import {
  VALID_DETECT_OPERATORS as _VALID_DETECT_OPERATORS,
  VALID_RESPONSE_ACTIONS as _VALID_RESPONSE_ACTIONS,
  type DetectOperator as _DetectOperator,
  type ResponseAction as _ResponseAction,
} from './drConstants'
import {
  OPERATOR_SCHEMAS,
  ACTION_SCHEMAS,
  type FieldDefinition as SchemaFieldDefinition,
  type OperatorSchema,
  type ActionSchema,
} from './drSchema'

// Re-export types for autocomplete-specific use
export interface FieldDefinition {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  required: boolean
  description: string
  values?: string[] // For enum-like fields
  examples?: string[]
}

export interface OperatorDefinition {
  name: string
  description: string
  requiredFields: string[]
  optionalFields: FieldDefinition[]
  examples: string[]
  validTargets?: string[]
  category: 'logical' | 'string' | 'numeric' | 'network' | 'system' | 'advanced' | 'time'
}

export interface ActionDefinition {
  name: string
  description: string
  requiredParams: FieldDefinition[]
  optionalParams: FieldDefinition[]
  examples: string[]
  category: 'core' | 'task' | 'advanced'
}

/**
 * Convert schema field definition to autocomplete field definition
 */
function toAutocompleteField(field: SchemaFieldDefinition, required: boolean): FieldDefinition {
  return {
    name: field.name,
    type: field.type,
    required,
    description: field.description,
    values: field.values,
  }
}

/**
 * Convert operator schema to autocomplete operator definition
 */
function toOperatorDefinition(schema: OperatorSchema): OperatorDefinition {
  return {
    name: schema.name,
    description: schema.description,
    requiredFields: schema.requiredFields,
    optionalFields: schema.optionalFields.map((f) => toAutocompleteField(f, false)),
    examples: schema.examples,
    validTargets: schema.validTargets,
    category: schema.category,
  }
}

/**
 * Convert action schema to autocomplete action definition
 */
function toActionDefinition(schema: ActionSchema): ActionDefinition {
  return {
    name: schema.name,
    description: schema.description,
    requiredParams: schema.requiredFields.map((f) => toAutocompleteField(f, true)),
    optionalParams: schema.optionalFields.map((f) => toAutocompleteField(f, false)),
    examples: schema.examples,
    category: schema.category,
  }
}

export interface TemplateFunction {
  name: string
  description: string
  parameters: string[]
  examples: string[]
  returnType: 'string' | 'number' | 'object'
}

// ============================================================================
// Detection Logic Operators (derived from schema)
// ============================================================================

/**
 * Generate OPERATORS record from canonical schema
 * This ensures autocomplete always matches validation
 */
const generateOperators = (): Record<string, OperatorDefinition> => {
  const operators: Record<string, OperatorDefinition> = {}
  for (const [key, schema] of Object.entries(OPERATOR_SCHEMAS)) {
    operators[key] = toOperatorDefinition(schema)
  }
  return operators
}

export const OPERATORS: Record<string, OperatorDefinition> = generateOperators()

// ============================================================================
// Response Actions (derived from schema)
// ============================================================================

/**
 * Generate ACTIONS record from canonical schema
 * This ensures autocomplete always matches validation
 */
const generateActions = (): Record<string, ActionDefinition> => {
  const actions: Record<string, ActionDefinition> = {}
  for (const [key, schema] of Object.entries(ACTION_SCHEMAS)) {
    actions[key] = toActionDefinition(schema)
  }
  return actions
}

export const ACTIONS: Record<string, ActionDefinition> = generateActions()

// Template Functions
export const TEMPLATE_FUNCTIONS: Record<string, TemplateFunction> = {
  token: {
    name: 'token',
    description: 'Generate MD5 hash token',
    parameters: ['value'],
    examples: ['{{ token .event.FILE_PATH }}'],
    returnType: 'string',
  },
  anon: {
    name: 'anon',
    description: 'Generate anonymized hash with secret',
    parameters: ['value'],
    examples: ['{{ anon .routing.int_ip }}'],
    returnType: 'string',
  },
  json: {
    name: 'json',
    description: 'Convert to JSON string',
    parameters: ['object'],
    examples: ['{{ json .event }}'],
    returnType: 'string',
  },
  prettyjson: {
    name: 'prettyjson',
    description: 'Convert to formatted JSON',
    parameters: ['object'],
    examples: ['{{ prettyjson .event }}'],
    returnType: 'string',
  },
  parsetime: {
    name: 'parsetime',
    description: 'Format time string',
    parameters: ['time', 'format'],
    examples: ['{{ parsetime .routing.event_time "2006-01-02 15:04:05" }}'],
    returnType: 'string',
  },
  split: {
    name: 'split',
    description: 'Split string into array',
    parameters: ['string', 'delimiter'],
    examples: ['{{ split .event.COMMAND_LINE " " }}'],
    returnType: 'object',
  },
  join: {
    name: 'join',
    description: 'Join array into string',
    parameters: ['array', 'delimiter'],
    examples: ['{{ join .array " " }}'],
    returnType: 'string',
  },
  replace: {
    name: 'replace',
    description: 'Replace substrings',
    parameters: ['string', 'old', 'new'],
    examples: ['{{ replace .event.FILE_PATH "\\\\" "/" }}'],
    returnType: 'string',
  },
  base: {
    name: 'base',
    description: 'Extract filename from path',
    parameters: ['path'],
    examples: ['{{ base .event.FILE_PATH }}'],
    returnType: 'string',
  },
  dir: {
    name: 'dir',
    description: 'Extract directory from path',
    parameters: ['path'],
    examples: ['{{ dir .event.FILE_PATH }}'],
    returnType: 'string',
  },
}

// Common Event Paths
export const EVENT_PATHS = [
  // Process events
  'event/FILE_PATH',
  'event/COMMAND_LINE',
  'event/PROCESS_ID',
  'event/PARENT_PROCESS_ID',
  'event/USER_NAME',
  'event/EVENT_TYPE',

  // File events
  'event/SIZE',
  'event/HASH',
  'event/CREATE_TIME',
  'event/MODIFY_TIME',

  // Network events
  'event/DESTINATION',
  'event/SOURCE',
  'event/PROTOCOL',
  'event/PORT',
  'event/IP_ADDRESS',
  'event/SOURCE_IP',
  'event/DESTINATION_IP',

  // Routing information
  'routing/hostname',
  'routing/platform',
  'routing/arch',
  'routing/event_time',
  'routing/sensor_id',
  'routing/int_ip',
]

// Event Types
export const EVENT_TYPES = [
  'NEW_PROCESS',
  'TERMINATE_PROCESS',
  'FILE_CREATE',
  'FILE_DELETE',
  'FILE_MODIFY',
  'NETWORK_SUMMARY',
  'DNS_REQUEST',
  'HTTP_REQUEST',
  'CONNECTED',
  'DISCONNECTED',
  'AUTORUN_CHANGE',
  'CLOUD_NOTIFICATION',
  'CODE_IDENTITY',
]

// Stateful rule keywords
export const STATEFUL_KEYWORDS = [
  'event',
  'with child',
  'with descendant',
  'with events',
  'count',
  'within',
  'is stateless',
  'report latest event',
]

// Common task commands
export const TASK_COMMANDS = [
  'history_dump',
  'file_get',
  'file_hash',
  'file_info',
  'file_del',
  'process_list',
  'process_tree',
  'kill_process',
  'network_list',
  'network_connections',
  'mem_map',
  'mem_read',
  'mem_dump',
  'os_version',
  'os_info',
  'dir_list',
  'dir_create',
  'reg_list',
  'reg_get',
  'reg_set',
  'service_list',
  'service_start',
  'service_stop',
  'driver_list',
  'autorun_list',
  'user_list',
  'logged_in_users',
  'env_vars',
  'volume_list',
  'exec',
  'screenshot',
  'pcap_start',
  'pcap_stop',
]
