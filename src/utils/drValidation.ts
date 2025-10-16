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
 * D&R (Detection and Response) Logic Validation
 *
 * This module provides comprehensive validation for LimaCharlie D&R rules,
 * including detect logic operators, respond actions, and property validation.
 */

import yaml from 'js-yaml'
import {
  VALID_DETECT_OPERATORS,
  VALID_DETECT_PROPERTIES,
  VALID_RESPONSE_ACTIONS,
  PATH_REQUIRED_OPERATORS,
  VALUE_REQUIRED_OPERATORS,
} from './drConstants'
import { OPERATOR_SCHEMAS, ACTION_SCHEMAS } from './drSchema'

// ============================================================================
// Type Definitions
// ============================================================================

export interface DetectionRuleLogic {
  op: string
  path?: string
  value?: unknown
  event?: string
  events?: string[]
  rules?: DetectionRuleLogic[]
  target?: string
  [key: string]: unknown
}

export interface Suppression {
  max_count?: number
  min_count?: number
  period?: string | number
  is_global?: boolean
  keys?: string[]
  count_path?: string
}

export interface ResponseAction {
  action: string
  suppression?: Suppression
  name?: string
  tag?: string
  command?: string
  investigation?: string
  duration?: string | number
  value?: unknown
  'extension name'?: string
  'extension action'?: string
  'extension request'?: Record<string, unknown>
  'based on report'?: boolean
  'hive name'?: string
  'record name'?: string
  ttl?: number
  entire_device?: boolean
  publish?: boolean
  priority?: number
  metadata?: Record<string, unknown>
  detect_data?: Record<string, unknown>
  [key: string]: unknown
}

// ============================================================================
// Detect Logic Validation
// ============================================================================

/**
 * Validates LimaCharlie detection logic YAML
 *
 * @param detectLogicStr - YAML string containing detection logic
 * @param requireTopLevelEvent - Whether to require event/events at top level (default: true)
 * @param depth - Current recursion depth for nested rules (default: 0)
 * @returns Error message string if validation fails, null if valid
 */
export function validateDetectLogic(
  detectLogicStr: string,
  requireTopLevelEvent = true,
  depth = 0,
): string | null {
  try {
    const rule = yaml.load(detectLogicStr) as DetectionRuleLogic

    if (Array.isArray(rule)) {
      return 'Operation should be a dictionary, not a list.'
    }

    if (!rule || typeof rule !== 'object' || !('op' in rule)) {
      return "Operation missing 'op' field."
    }

    // Check for top-level event or events requirement
    if (
      requireTopLevelEvent &&
      depth === 0 &&
      !('target' in rule && rule.target !== 'edr') &&
      !('event' in rule) &&
      !('events' in rule) &&
      !(
        rule.op === 'and' &&
        rule.rules &&
        rule.rules.length > 0 &&
        rule.rules[0].op === 'is tagged'
      )
    ) {
      return "Must specify either 'event' or 'events' at top level of rule, or have the top operator be an 'and' with its first 'rule' of 'is tagged'."
    }

    // Validate event field
    if (depth === 0 && 'event' in rule && typeof rule.event !== 'string') {
      return "'event' must be a string."
    }

    // Validate events field
    if (depth === 0 && 'events' in rule && !Array.isArray(rule.events)) {
      return "'events' must be a list."
    }

    // Check for both event and events
    if (depth === 0 && 'event' in rule && 'events' in rule) {
      return "Must specify either 'event' or 'events'; not both."
    }

    // Check nested event/events
    if (depth > 0 && ('event' in rule || 'events' in rule)) {
      return "'event' or 'events' must be specified at the root."
    }

    // Validate logical operators (and/or)
    if (['and', 'or'].includes(rule.op.toLowerCase())) {
      if (!('rules' in rule)) {
        return "'and' and 'or' ops require a 'rules' list of operations."
      }

      if (!Array.isArray(rule.rules)) {
        return "'rules' must be a list."
      }

      if (rule.rules.length < 2) {
        return "'and' and 'or' op require at least 2 rules."
      }

      // Recursively validate nested rules
      for (const nestedRule of rule.rules) {
        const nestedError = validateDetectLogic(
          yaml.dump(nestedRule),
          requireTopLevelEvent,
          depth + 1,
        )
        if (nestedError) {
          return nestedError
        }
      }
    }

    // Validate operator using shared constants
    const normalizedOp = rule.op.toLowerCase()
    if (!VALID_DETECT_OPERATORS.includes(normalizedOp as (typeof VALID_DETECT_OPERATORS)[number])) {
      // Try to find similar operator names to suggest
      const suggestions = VALID_DETECT_OPERATORS.filter((op) => {
        // Strict fuzzy matching for operators
        const opLower = op.toLowerCase()
        const normalizedOpLower = normalizedOp.toLowerCase()

        // Check if they're very similar (substring match or length difference <= 2)
        return (
          opLower.includes(normalizedOpLower) ||
          normalizedOpLower.includes(opLower) ||
          (Math.abs(op.length - normalizedOp.length) <= 2 &&
            // Additional check: at least 60% of characters match
            op.split('').filter((c) => normalizedOp.includes(c)).length >= op.length * 0.6)
        )
      }).slice(0, 3) // Limit to top 3 suggestions

      let errorMsg = `Unknown operator: '${rule.op}'.`
      if (suggestions.length > 0) {
        errorMsg += ` Did you mean: ${suggestions.map((s) => `'${s}'`).join(', ')}?`
      } else {
        errorMsg += ` Valid operators are: ${VALID_DETECT_OPERATORS.join(', ')}`
      }
      return errorMsg
    }

    // Validate path requirement for operators using shared constants
    if (
      PATH_REQUIRED_OPERATORS.includes(normalizedOp as (typeof PATH_REQUIRED_OPERATORS)[number]) &&
      !('path' in rule)
    ) {
      return `Operator '${rule.op}' requires a 'path' field.`
    }

    // Validate value requirement for comparison operators using shared constants
    if (
      VALUE_REQUIRED_OPERATORS.includes(
        normalizedOp as (typeof VALUE_REQUIRED_OPERATORS)[number],
      ) &&
      !('value' in rule)
    ) {
      return `Operator '${rule.op}' requires a 'value' field.`
    }

    // Validate operator-specific required fields using schema
    const operatorSchema = OPERATOR_SCHEMAS[normalizedOp as (typeof VALID_DETECT_OPERATORS)[number]]
    if (operatorSchema) {
      for (const requiredField of operatorSchema.requiredFields) {
        if (!rule.hasOwnProperty(requiredField)) {
          return `Operator '${rule.op}' requires a '${requiredField}' field.`
        }
      }
    }

    // Validate unknown properties using shared constants - catch typos and invalid fields
    const validProperties = new Set<string>(VALID_DETECT_PROPERTIES)

    // Check all properties in the rule
    const ruleKeys = Object.keys(rule)
    for (const key of ruleKeys) {
      if (!validProperties.has(key)) {
        // Try to find similar property names to suggest
        const suggestions = VALID_DETECT_PROPERTIES.filter(
          (prop) =>
            // Levenshtein-like fuzzy matching for common typos
            prop.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(prop.toLowerCase()) ||
            // Check if only 1-2 chars different (common typos)
            Math.abs(prop.length - key.length) <= 2,
        )

        let errorMsg = `Unknown property: '${key}'.`
        if (suggestions.length > 0) {
          errorMsg += ` Did you mean: ${suggestions.map((s) => `'${s}'`).join(', ')}?`
        } else {
          errorMsg += ` Valid properties include: ${VALID_DETECT_PROPERTIES.slice(0, 10).join(', ')}, etc.`
        }
        return errorMsg
      }
    }

    // Validate 'not' property value - must be true if present
    if ('not' in rule) {
      if (rule.not !== true) {
        return `Property 'not' must be set to true (boolean). The 'not' operator inverts the result of a rule and can only be true or omitted.`
      }
    }

    return null // No errors
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error)
  }
}

// ============================================================================
// Helper Validation Functions
// ============================================================================

/**
 * Validates duration format (e.g., 1h, 30m, 5s) or integer seconds
 */
function validateDuration(duration: unknown): string | null {
  if (typeof duration === 'number') {
    if (duration < 0) {
      return 'Duration must be a non-negative number'
    }
    return null
  }

  if (typeof duration === 'string') {
    // Duration pattern: number followed by unit (ns, us, µs, ms, s, m, h)
    const durationPattern = /^[0-9]+(ns|us|µs|ms|s|m|h)$/
    if (!durationPattern.test(duration)) {
      return 'Duration must match format like "30s", "5m", "1h" or be an integer'
    }
    return null
  }

  return 'Duration must be a string (e.g., "30s") or integer (seconds)'
}

/**
 * Validates suppression object
 */
function validateSuppression(suppression: unknown, actionIndex: number): string | null {
  if (typeof suppression !== 'object' || suppression === null || Array.isArray(suppression)) {
    return `Item ${actionIndex + 1}: 'suppression' must be an object`
  }

  const sup = suppression as Suppression

  // Must have at least one of: max_count, min_count, or count_path
  if (!('max_count' in sup) && !('min_count' in sup) && !('count_path' in sup)) {
    return `Item ${actionIndex + 1}: 'suppression' must specify at least one of: max_count, min_count, or count_path`
  }

  // Validate max_count
  if ('max_count' in sup) {
    if (
      typeof sup.max_count !== 'number' ||
      sup.max_count < 0 ||
      !Number.isInteger(sup.max_count)
    ) {
      return `Item ${actionIndex + 1}: 'suppression.max_count' must be a non-negative integer`
    }
  }

  // Validate min_count
  if ('min_count' in sup) {
    if (
      typeof sup.min_count !== 'number' ||
      sup.min_count < 0 ||
      !Number.isInteger(sup.min_count)
    ) {
      return `Item ${actionIndex + 1}: 'suppression.min_count' must be a non-negative integer`
    }
  }

  // Validate period
  if ('period' in sup) {
    const periodError = validateDuration(sup.period)
    if (periodError) {
      return `Item ${actionIndex + 1}: suppression.period - ${periodError}`
    }
  }

  // Validate is_global
  if ('is_global' in sup && typeof sup.is_global !== 'boolean') {
    return `Item ${actionIndex + 1}: 'suppression.is_global' must be a boolean`
  }

  // Validate keys
  if ('keys' in sup) {
    if (!Array.isArray(sup.keys)) {
      return `Item ${actionIndex + 1}: 'suppression.keys' must be an array`
    }
    for (let i = 0; i < sup.keys.length; i++) {
      if (typeof sup.keys[i] !== 'string') {
        return `Item ${actionIndex + 1}: 'suppression.keys[${i}]' must be a string`
      }
    }
  }

  // Validate count_path
  if ('count_path' in sup && typeof sup.count_path !== 'string') {
    return `Item ${actionIndex + 1}: 'suppression.count_path' must be a string`
  }

  return null
}

/**
 * Validates a field value against a field definition from schema
 */
function validateFieldType(
  value: unknown,
  fieldDef: { name: string; type: string; min?: number; max?: number; pattern?: string },
  actionIndex: number,
): string | null {
  const fieldName = fieldDef.name

  switch (fieldDef.type) {
    case 'string':
      if (typeof value !== 'string') {
        return `Item ${actionIndex + 1}: '${fieldName}' must be a string`
      }
      if (fieldDef.pattern) {
        const regex = new RegExp(fieldDef.pattern)
        if (!regex.test(value)) {
          return `Item ${actionIndex + 1}: '${fieldName}' must match pattern ${fieldDef.pattern}`
        }
      }
      break

    case 'number':
      if (typeof value !== 'number') {
        return `Item ${actionIndex + 1}: '${fieldName}' must be a number`
      }
      if (fieldDef.min !== undefined && value < fieldDef.min) {
        return `Item ${actionIndex + 1}: '${fieldName}' must be at least ${fieldDef.min}`
      }
      if (fieldDef.max !== undefined && value > fieldDef.max) {
        return `Item ${actionIndex + 1}: '${fieldName}' must be at most ${fieldDef.max}`
      }
      // Special handling for priority (must be integer)
      if (fieldName === 'priority' || fieldName === 'ttl') {
        if (!Number.isInteger(value)) {
          return `Item ${actionIndex + 1}: '${fieldName}' must be an integer`
        }
      }
      break

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `Item ${actionIndex + 1}: '${fieldName}' must be a boolean (true or false)`
      }
      break

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `Item ${actionIndex + 1}: '${fieldName}' must be an object`
      }
      break

    case 'array':
      if (!Array.isArray(value)) {
        return `Item ${actionIndex + 1}: '${fieldName}' must be an array`
      }
      break

    default:
      // Unknown type - skip validation
      break
  }

  return null
}

// ============================================================================
// Respond Logic Validation
// ============================================================================

/**
 * Validates LimaCharlie response action YAML according to specification
 *
 * @param respondLogicStr - YAML string containing response actions
 * @returns Error message string if validation fails, null if valid
 */
export function validateRespondLogic(respondLogicStr: string): string | null {
  try {
    const responses = yaml.load(respondLogicStr) as ResponseAction[]

    if (!Array.isArray(responses)) {
      return 'Top level should be a list of actions.'
    }

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]

      if (typeof response !== 'object' || !('action' in response)) {
        return `Item ${i + 1}: Each list item must specify an 'action' field`
      }

      const normalizedAction = response.action.toLowerCase()
      if (
        !VALID_RESPONSE_ACTIONS.includes(
          normalizedAction as (typeof VALID_RESPONSE_ACTIONS)[number],
        )
      ) {
        // Try to find similar action names to suggest
        const suggestions = VALID_RESPONSE_ACTIONS.filter((action) => {
          // Strict fuzzy matching for actions
          const actionLower = action.toLowerCase()
          const normalizedActionLower = normalizedAction.toLowerCase()

          // Check if they're very similar (substring match or length difference <= 2)
          return (
            actionLower.includes(normalizedActionLower) ||
            normalizedActionLower.includes(actionLower) ||
            (Math.abs(action.length - normalizedAction.length) <= 2 &&
              // Additional check: at least 60% of characters match
              action.split('').filter((c) => normalizedAction.includes(c)).length >=
                action.length * 0.6)
          )
        }).slice(0, 3) // Limit to top 3 suggestions

        let errorMsg = `Item ${i + 1}: Unknown action '${response.action}'.`
        if (suggestions.length > 0) {
          errorMsg += ` Did you mean: ${suggestions.map((s) => `'${s}'`).join(', ')}?`
        } else {
          errorMsg += ` Valid actions are: ${VALID_RESPONSE_ACTIONS.join(', ')}`
        }
        return errorMsg
      }

      // Validate suppression if present (all actions support suppression)
      if ('suppression' in response) {
        const suppressionError = validateSuppression(response.suppression, i)
        if (suppressionError) return suppressionError
      }

      // Validate action-specific fields using schema
      const actionSchema =
        ACTION_SCHEMAS[normalizedAction as (typeof VALID_RESPONSE_ACTIONS)[number]]
      if (!actionSchema) {
        return `Item ${i + 1}: Unknown action schema for '${response.action}'`
      }

      // Validate required fields
      for (const fieldDef of actionSchema.requiredFields) {
        if (!(fieldDef.name in response)) {
          return `Item ${i + 1}: '${response.action}' action requires a '${fieldDef.name}' field`
        }

        // Type validation
        const fieldValue = response[fieldDef.name]
        const fieldError = validateFieldType(fieldValue, fieldDef, i)
        if (fieldError) return fieldError
      }

      // Validate optional fields if present
      for (const fieldDef of actionSchema.optionalFields) {
        if (fieldDef.name in response) {
          const fieldValue = response[fieldDef.name]
          const fieldError = validateFieldType(fieldValue, fieldDef, i)
          if (fieldError) return fieldError
        }
      }

      // Build set of valid fields for unknown field detection
      const validFieldsForAction = new Set<string>(['action', 'suppression'])
      actionSchema.requiredFields.forEach((f) => validFieldsForAction.add(f.name))
      actionSchema.optionalFields.forEach((f) => validFieldsForAction.add(f.name))

      // Check for unknown fields
      const responseKeys = Object.keys(response)
      for (const key of responseKeys) {
        if (!validFieldsForAction.has(key)) {
          // Try to find similar field names to suggest
          const validFields = Array.from(validFieldsForAction)
          const suggestions = validFields.filter(
            (field) =>
              field.toLowerCase().includes(key.toLowerCase()) ||
              key.toLowerCase().includes(field.toLowerCase()) ||
              Math.abs(field.length - key.length) <= 2,
          )

          let errorMsg = `Item ${i + 1}: Unknown field: '${key}' for action '${response.action}'.`
          if (suggestions.length > 0) {
            errorMsg += ` Did you mean: ${suggestions.map((s) => `'${s}'`).join(', ')}?`
          } else {
            errorMsg += ` Valid fields for this action: ${validFields.join(', ')}`
          }
          return errorMsg
        }
      }
    }

    return null // No errors
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error)
  }
}
