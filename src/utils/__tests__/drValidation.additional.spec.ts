import { describe, expect, it } from 'vitest'

import { validateDetectLogic, validateRespondLogic } from '../drValidation'

describe('validateDetectLogic public input boundaries', () => {
  it('requires an operation object rather than a list or object without op', () => {
    expect(validateDetectLogic('- op: exists\n  path: event/USER_NAME\n')).toBe(
      'Operation should be a dictionary, not a list.',
    )
    expect(validateDetectLogic('event: NEW_PROCESS\n')).toBe("Operation missing 'op' field.")
  })

  it('enforces root event placement and permits documented root exemptions', () => {
    expect(validateDetectLogic('op: exists\npath: event/USER_NAME\n')).toContain(
      "Must specify either 'event' or 'events' at top level",
    )

    expect(validateDetectLogic('target: cloud\nop: is platform\nname: windows\n')).toBeNull()

    expect(
      validateDetectLogic(
        'op: and\nrules:\n  - op: is tagged\n    tag: production\n  - op: exists\n    path: event/USER_NAME\n',
      ),
    ).toBeNull()
  })

  it('rejects invalid event declarations at the root and nested levels', () => {
    expect(validateDetectLogic('event: [NEW_PROCESS]\nop: exists\npath: event/PID\n')).toBe(
      "'event' must be a string.",
    )
    expect(validateDetectLogic('events: NEW_PROCESS\nop: exists\npath: event/PID\n')).toBe(
      "'events' must be a list.",
    )
    expect(
      validateDetectLogic(
        'event: NEW_PROCESS\nop: and\nrules:\n  - op: exists\n    path: event/PID\n    event: USER_OBSERVED\n  - op: exists\n    path: event/USER_NAME\n',
      ),
    ).toBe("'event' or 'events' must be specified at the root.")
  })

  it('rejects both event selectors and malformed logical rule collections', () => {
    expect(
      validateDetectLogic(
        'event: NEW_PROCESS\nevents: [USER_OBSERVED]\nop: exists\npath: event/PID\n',
      ),
    ).toBe("Must specify either 'event' or 'events'; not both.")
    expect(validateDetectLogic('event: NEW_PROCESS\nop: and\nrules: invalid\n')).toBe(
      "'rules' must be a list.",
    )
  })

  it('accepts case-insensitive operators and identifies unknown properties', () => {
    expect(validateDetectLogic('event: NEW_PROCESS\nop: EXISTS\npath: event/PID\n')).toBeNull()
    expect(
      validateDetectLogic('event: NEW_PROCESS\nop: exists\npath: event/PID\npathh: event/PID\n'),
    ).toContain("Unknown property: 'pathh'.")
  })

  it('validates metadata rule shapes and not inversion semantics', () => {
    expect(
      validateDetectLogic(
        'event: NEW_PROCESS\nop: lookup\npath: event/HASH\nlookup: hashes\nmetadata_rules: invalid\n',
      ),
    ).toBe('metadata_rules[0] must be an object describing a rule.')
    expect(
      validateDetectLogic('event: NEW_PROCESS\nop: exists\npath: event/PID\nnot: false\n'),
    ).toContain("Property 'not' must be set to true (boolean).")
  })
})

describe('validateRespondLogic public input boundaries', () => {
  it('requires a top-level list and an action for every item', () => {
    expect(validateRespondLogic('action: report\nname: suspicious\n')).toBe(
      'Top level should be a list of actions.',
    )
    expect(validateRespondLogic('- name: suspicious\n')).toBe(
      "Item 1: Each list item must specify an 'action' field",
    )
  })

  it('accepts a case-insensitive multi-action response payload', () => {
    expect(
      validateRespondLogic(
        '- action: REPORT\n  name: suspicious_process\n  priority: 5\n  publish: true\n  metadata:\n    source: detectionforge\n- action: add tag\n  tag: reviewed\n  ttl: 3600\n  entire_device: false\n',
      ),
    ).toBeNull()
  })

  it('validates required fields, schema types, numeric ranges, and patterns', () => {
    expect(validateRespondLogic('- action: task\n')).toBe(
      "Item 1: 'task' action requires a 'command' field",
    )
    expect(validateRespondLogic('- action: report\n  name: detection\n  priority: 3.5\n')).toBe(
      "Item 1: 'priority' must be an integer",
    )
    expect(validateRespondLogic('- action: add tag\n  tag: suspicious\n  ttl: -1\n')).toBe(
      "Item 1: 'ttl' must be at least 0",
    )
    expect(validateRespondLogic('- action: wait\n  duration: tomorrow\n')).toBe(
      "Item 1: 'duration' must match pattern ^[0-9]+(ns|us|µs|ms|s|m|h)$",
    )
  })

  it('validates extension request object fields and rejects action-specific extras', () => {
    expect(
      validateRespondLogic(
        '- action: extension request\n  extension name: enrichment\n  extension action: enrich\n  extension request: invalid\n',
      ),
    ).toBe("Item 1: 'extension request' must be an object")
    expect(validateRespondLogic('- action: seal\n  reason: maintenance\n')).toContain(
      "Item 1: Unknown field: 'reason' for action 'seal'.",
    )
  })

  it('validates suppression fields and reports the action index that fails', () => {
    expect(validateRespondLogic('- action: report\n  name: detection\n  suppression: []\n')).toBe(
      "Item 1: 'suppression' must be an object",
    )
    expect(
      validateRespondLogic(
        '- action: report\n  name: first\n- action: add tag\n  tag: suspicious\n  suppression:\n    max_count: 1\n    keys:\n      - event/PID\n      - 99\n',
      ),
    ).toBe("Item 2: 'suppression.keys[1]' must be a string")
    expect(
      validateRespondLogic(
        '- action: report\n  name: detection\n  suppression:\n    count_path: event/COUNT\n    period: invalid\n',
      ),
    ).toBe(
      'Item 1: suppression.period - Duration must match format like "30s", "5m", "1h" or be an integer',
    )
  })
})
