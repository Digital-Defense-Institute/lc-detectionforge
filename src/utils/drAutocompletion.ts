/**
 * LimaCharlie Detection & Response Autocompletion Engine
 *
 * This module provides structured, context-aware autocompletion for D&R rules
 */

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

export interface TemplateFunction {
  name: string
  description: string
  parameters: string[]
  examples: string[]
  returnType: 'string' | 'number' | 'object'
}

// Detection Logic Operators
export const OPERATORS: Record<string, OperatorDefinition> = {
  // Logical Operators
  and: {
    name: 'and',
    description: 'All conditions must be true',
    requiredFields: ['rules'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
      { name: 'times', type: 'number', required: false, description: 'Number of occurrences' },
      { name: 'seconds', type: 'number', required: false, description: 'Time window in seconds' },
    ],
    examples: ['op: and\nrules:\n  - op: is\n    path: event/EVENT_TYPE\n    value: NEW_PROCESS'],
    category: 'logical',
  },

  or: {
    name: 'or',
    description: 'Any condition can be true',
    requiredFields: ['rules'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
      { name: 'times', type: 'number', required: false, description: 'Number of occurrences' },
      { name: 'seconds', type: 'number', required: false, description: 'Time window in seconds' },
    ],
    examples: ['op: or\nrules:\n  - op: ends with\n    path: event/FILE_PATH\n    value: .exe'],
    category: 'logical',
  },

  not: {
    name: 'not',
    description: 'Invert condition result',
    requiredFields: ['rule'],
    optionalFields: [],
    examples: ['op: not\nrule:\n  op: is\n  path: event/USER_NAME\n  value: system'],
    category: 'logical',
  },

  // String Comparison Operators
  is: {
    name: 'is',
    description: 'Exact match comparison',
    requiredFields: ['path', 'value'],
    optionalFields: [
      {
        name: 'case sensitive',
        type: 'boolean',
        required: false,
        description: 'Case-sensitive matching',
      },
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
      {
        name: 'file name',
        type: 'boolean',
        required: false,
        description: 'Extract filename from path',
      },
      { name: 'sub domain', type: 'boolean', required: false, description: 'Extract subdomain' },
    ],
    examples: ['op: is\npath: event/FILE_NAME\nvalue: cmd.exe\ncase sensitive: true'],
    category: 'string',
  },

  contains: {
    name: 'contains',
    description: 'Substring search',
    requiredFields: ['path', 'value'],
    optionalFields: [
      {
        name: 'case sensitive',
        type: 'boolean',
        required: false,
        description: 'Case-sensitive matching',
      },
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
      {
        name: 'file name',
        type: 'boolean',
        required: false,
        description: 'Extract filename from path',
      },
      { name: 'sub domain', type: 'boolean', required: false, description: 'Extract subdomain' },
    ],
    examples: ['op: contains\npath: event/COMMAND_LINE\nvalue: powershell'],
    category: 'string',
  },

  'starts with': {
    name: 'starts with',
    description: 'Prefix matching',
    requiredFields: ['path', 'value'],
    optionalFields: [
      {
        name: 'case sensitive',
        type: 'boolean',
        required: false,
        description: 'Case-sensitive matching',
      },
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
      {
        name: 'file name',
        type: 'boolean',
        required: false,
        description: 'Extract filename from path',
      },
      { name: 'sub domain', type: 'boolean', required: false, description: 'Extract subdomain' },
    ],
    examples: ['op: starts with\npath: event/FILE_PATH\nvalue: C:\\Windows\\'],
    category: 'string',
  },

  'ends with': {
    name: 'ends with',
    description: 'Suffix matching',
    requiredFields: ['path', 'value'],
    optionalFields: [
      {
        name: 'case sensitive',
        type: 'boolean',
        required: false,
        description: 'Case-sensitive matching',
      },
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
      {
        name: 'file name',
        type: 'boolean',
        required: false,
        description: 'Extract filename from path',
      },
      { name: 'sub domain', type: 'boolean', required: false, description: 'Extract subdomain' },
    ],
    examples: ['op: ends with\npath: event/FILE_PATH\nvalue: .exe'],
    category: 'string',
  },

  matches: {
    name: 'matches',
    description: 'Regular expression matching',
    requiredFields: ['path', 're'],
    optionalFields: [
      {
        name: 'case sensitive',
        type: 'boolean',
        required: false,
        description: 'Case-sensitive matching',
      },
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: matches\npath: event/COMMAND_LINE\nre: "\\\\b(cmd|powershell)\\\\b"'],
    category: 'string',
  },

  // Existence and Numeric Operators
  exists: {
    name: 'exists',
    description: 'Check if field exists',
    requiredFields: ['path'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: exists\npath: event/NETWORK_ACTIVITY'],
    category: 'numeric',
  },

  'is greater than': {
    name: 'is greater than',
    description: 'Numeric greater than comparison',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: is greater than\npath: event/PROCESS_ID\nvalue: 1000'],
    category: 'numeric',
  },

  'is lower than': {
    name: 'is lower than',
    description: 'Numeric less than comparison',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: is lower than\npath: event/SIZE\nvalue: 1024'],
    category: 'numeric',
  },

  'string distance': {
    name: 'string distance',
    description: 'Levenshtein distance comparison',
    requiredFields: ['path', 'value', 'max'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: string distance\npath: event/FILE_NAME\nvalue: cmd.exe\nmax: 2'],
    category: 'string',
  },

  // Network Operators
  cidr: {
    name: 'cidr',
    description: 'CIDR network matching',
    requiredFields: ['path', 'cidr'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: cidr\npath: event/IP_ADDRESS\ncidr: 192.168.0.0/16'],
    category: 'network',
  },

  'is private address': {
    name: 'is private address',
    description: 'Check if IP is in private range',
    requiredFields: ['path'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: is private address\npath: event/SOURCE_IP'],
    category: 'network',
  },

  'is public address': {
    name: 'is public address',
    description: 'Check if IP is in public range',
    requiredFields: ['path'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: is public address\npath: event/DESTINATION_IP'],
    category: 'network',
  },

  // System Operators
  'is platform': {
    name: 'is platform',
    description: 'Check sensor platform',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: is platform\npath: routing/platform\nvalue: windows'],
    validTargets: ['edr'],
    category: 'system',
  },

  'is 32 bit': {
    name: 'is 32 bit',
    description: 'Check if architecture is 32-bit',
    requiredFields: ['path'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: is 32 bit\npath: routing/arch'],
    validTargets: ['edr'],
    category: 'system',
  },

  'is 64 bit': {
    name: 'is 64 bit',
    description: 'Check if architecture is 64-bit',
    requiredFields: ['path'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: is 64 bit\npath: routing/arch'],
    validTargets: ['edr'],
    category: 'system',
  },

  'is arm': {
    name: 'is arm',
    description: 'Check if architecture is ARM',
    requiredFields: ['path'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: is arm\npath: routing/arch'],
    validTargets: ['edr'],
    category: 'system',
  },

  'is tagged': {
    name: 'is tagged',
    description: 'Check sensor tags',
    requiredFields: ['tag'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: is tagged\ntag: vip_asset'],
    validTargets: ['edr'],
    category: 'system',
  },

  // Additional Operators
  'is ip address': {
    name: 'is ip address',
    description: 'Check if value is valid IP address',
    requiredFields: ['path'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: is ip address\\npath: event/SOURCE_IP'],
    category: 'network',
  },

  sentinel: {
    name: 'sentinel',
    description: 'Match against value lists',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: sentinel\\npath: event/HASH\\nvalue:\\n  - hash1\\n  - hash2'],
    category: 'advanced',
  },

  yaml: {
    name: 'yaml',
    description: 'Parse and match YAML structured data',
    requiredFields: ['path', 'value'],
    optionalFields: [
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: yaml\\npath: event/STRUCTURED_DATA\\nvalue:\\n  field: expected_value'],
    category: 'advanced',
  },

  // Advanced Operators
  lookup: {
    name: 'lookup',
    description: 'Threat intelligence lookup',
    requiredFields: ['path', 'lookup'],
    optionalFields: [
      {
        name: 'min_confidence',
        type: 'number',
        required: false,
        description: 'Minimum confidence threshold',
      },
      { name: 'not', type: 'boolean', required: false, description: 'Invert the result' },
    ],
    examples: ['op: lookup\npath: event/HASH\nlookup: sha256\nmin_confidence: 80'],
    category: 'advanced',
  },

  scope: {
    name: 'scope',
    description: 'Limit matching scope',
    requiredFields: ['rule', 'scope'],
    optionalFields: [],
    examples: [
      'op: scope\nrule:\n  op: contains\n  path: event/COMMAND_LINE\n  value: malware\nscope: process',
    ],
    category: 'advanced',
  },
}

// Response Actions
export const ACTIONS: Record<string, ActionDefinition> = {
  report: {
    name: 'report',
    description: 'Generate detection alert',
    requiredParams: [
      { name: 'name', type: 'string', required: true, description: 'Detection name' },
    ],
    optionalParams: [
      {
        name: 'priority',
        type: 'number',
        required: false,
        description: 'Priority level (1-5)',
        values: ['1', '2', '3', '4', '5'],
      },
      {
        name: 'publish',
        type: 'boolean',
        required: false,
        description: 'Send to external systems',
      },
      { name: 'metadata', type: 'object', required: false, description: 'Custom metadata' },
      {
        name: 'detect_data',
        type: 'string',
        required: false,
        description: 'Event data to include',
        values: ['event', 'custom'],
      },
      {
        name: 'detect',
        type: 'string',
        required: false,
        description: 'Detection mode',
        values: ['simple'],
      },
    ],
    examples: [
      '- action: report\n  name: suspicious_activity_detected\n  priority: 1\n  publish: true',
    ],
    category: 'core',
  },

  'add tag': {
    name: 'add tag',
    description: 'Add tag to sensor',
    requiredParams: [{ name: 'tag', type: 'string', required: true, description: 'Tag name' }],
    optionalParams: [
      { name: 'ttl', type: 'number', required: false, description: 'Time to live in seconds' },
      { name: 'entire_device', type: 'boolean', required: false, description: 'Tag entire device' },
    ],
    examples: ['- action: add tag\n  tag: compromised\n  ttl: 3600\n  entire_device: true'],
    category: 'core',
  },

  'remove tag': {
    name: 'remove tag',
    description: 'Remove tag from sensor',
    requiredParams: [{ name: 'tag', type: 'string', required: true, description: 'Tag name' }],
    optionalParams: [
      {
        name: 'entire_device',
        type: 'boolean',
        required: false,
        description: 'Remove from entire device',
      },
    ],
    examples: ['- action: remove tag\n  tag: clean'],
    category: 'core',
  },

  'add var': {
    name: 'add var',
    description: 'Add variable to sensor',
    requiredParams: [
      { name: 'name', type: 'string', required: true, description: 'Variable name' },
      {
        name: 'value',
        type: 'string',
        required: true,
        description: 'Variable value (supports templates)',
      },
    ],
    optionalParams: [
      { name: 'ttl', type: 'number', required: false, description: 'Time to live in seconds' },
    ],
    examples: ['- action: add var\n  name: threat_level\n  value: high\n  ttl: 7200'],
    category: 'core',
  },

  'del var': {
    name: 'del var',
    description: 'Delete variable from sensor',
    requiredParams: [
      { name: 'name', type: 'string', required: true, description: 'Variable name' },
    ],
    optionalParams: [],
    examples: ['- action: del var\n  name: old_variable'],
    category: 'core',
  },

  'isolate network': {
    name: 'isolate network',
    description: 'Isolate sensor from network',
    requiredParams: [],
    optionalParams: [],
    examples: ['- action: isolate network'],
    category: 'core',
  },

  'rejoin network': {
    name: 'rejoin network',
    description: 'Reconnect sensor to network',
    requiredParams: [],
    optionalParams: [],
    examples: ['- action: rejoin network'],
    category: 'core',
  },

  task: {
    name: 'task',
    description: 'Send command to sensor',
    requiredParams: [
      { name: 'command', type: 'string', required: true, description: 'Command to execute' },
    ],
    optionalParams: [
      { name: 'investigation', type: 'string', required: false, description: 'Investigation ID' },
    ],
    examples: [
      '- action: task\n  command: history_dump\n  investigation: incident_123',
      '- action: task\n  command: file_get {{ .event.FILE_PATH }}',
    ],
    category: 'task',
  },

  'extension request': {
    name: 'extension request',
    description: 'Trigger extension action',
    requiredParams: [
      { name: 'extension name', type: 'string', required: true, description: 'Extension name' },
      {
        name: 'extension action',
        type: 'string',
        required: true,
        description: 'Action to perform',
      },
    ],
    optionalParams: [
      {
        name: 'extension parameters',
        type: 'object',
        required: false,
        description: 'Action parameters',
      },
    ],
    examples: ['- action: extension request\n  extension name: dumper\n  extension action: dump'],
    category: 'task',
  },

  output: {
    name: 'output',
    description: 'Forward to output destination',
    requiredParams: [{ name: 'name', type: 'string', required: true, description: 'Output name' }],
    optionalParams: [],
    examples: ['- action: output\n  name: siem_output'],
    category: 'advanced',
  },

  seal: {
    name: 'seal',
    description: 'Enable tamper resistance',
    requiredParams: [],
    optionalParams: [],
    examples: ['- action: seal'],
    category: 'advanced',
  },

  unseal: {
    name: 'unseal',
    description: 'Disable tamper resistance',
    requiredParams: [],
    optionalParams: [],
    examples: ['- action: unseal'],
    category: 'advanced',
  },

  wait: {
    name: 'wait',
    description: 'Add delay between actions',
    requiredParams: [
      { name: 'duration', type: 'string', required: true, description: 'Duration (e.g., 30s, 5m)' },
    ],
    optionalParams: [],
    examples: ['- action: wait\n  duration: 30s'],
    category: 'advanced',
  },

  'add hive tag': {
    name: 'add hive tag',
    description: 'Add tag to Hive record',
    requiredParams: [{ name: 'tag', type: 'string', required: true, description: 'Tag name' }],
    optionalParams: [],
    examples: ['- action: add hive tag\n  tag: analyzed'],
    category: 'advanced',
  },

  'remove hive tag': {
    name: 'remove hive tag',
    description: 'Remove tag from Hive record',
    requiredParams: [{ name: 'tag', type: 'string', required: true, description: 'Tag name' }],
    optionalParams: [],
    examples: ['- action: remove hive tag\n  tag: pending'],
    category: 'advanced',
  },
}

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
