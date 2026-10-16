import { describe, expect, it } from 'vitest'

import { VALID_DETECT_OPERATORS, VALID_RESPONSE_ACTIONS } from '../drConstants'
import {
  ACTIONS,
  EVENT_PATHS,
  EVENT_TYPES,
  OPERATORS,
  TASK_COMMANDS,
  TEMPLATE_FUNCTIONS,
} from '../drAutocompletion'
import { ACTION_SCHEMAS, OPERATOR_SCHEMAS } from '../drSchema'

describe('D&R autocomplete metadata', () => {
  it('exposes every canonical operator with its schema details', () => {
    expect(Object.keys(OPERATORS).sort()).toEqual([...VALID_DETECT_OPERATORS].sort())

    for (const operator of VALID_DETECT_OPERATORS) {
      const autocomplete = OPERATORS[operator]
      const schema = OPERATOR_SCHEMAS[operator]

      expect(autocomplete).toMatchObject({
        name: schema.name,
        description: schema.description,
        requiredFields: schema.requiredFields,
        category: schema.category,
        validTargets: schema.validTargets,
      })
      expect(autocomplete.optionalFields).toEqual(
        schema.optionalFields.map(({ name, type, description, values }) => ({
          name,
          type,
          required: false,
          description,
          values,
        })),
      )
    }
  })

  it('exposes every canonical response action and preserves required parameters', () => {
    expect(Object.keys(ACTIONS).sort()).toEqual([...VALID_RESPONSE_ACTIONS].sort())

    for (const action of VALID_RESPONSE_ACTIONS) {
      const autocomplete = ACTIONS[action]
      const schema = ACTION_SCHEMAS[action]

      expect(autocomplete).toMatchObject({
        name: schema.name,
        description: schema.description,
        category: schema.category,
      })
      expect(autocomplete.requiredParams).toEqual(
        schema.requiredFields.map(({ name, type, description, values }) => ({
          name,
          type,
          required: true,
          description,
          values,
        })),
      )
    }
  })

  it('keeps template, event, and task suggestion catalogs usable', () => {
    expect(TEMPLATE_FUNCTIONS.token).toMatchObject({
      parameters: ['value'],
      returnType: 'string',
    })
    expect(TEMPLATE_FUNCTIONS.split.returnType).toBe('object')
    expect(EVENT_PATHS).toContain('event/COMMAND_LINE')
    expect(EVENT_TYPES).toContain('NEW_PROCESS')
    expect(TASK_COMMANDS).toEqual(expect.arrayContaining(['process_list', 'exec', 'screenshot']))
  })
})
