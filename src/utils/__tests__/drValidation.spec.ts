import yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'

import { validateDetectLogic } from '../drValidation'
import { validDetectRuleFixtures } from './fixtures/validDetectRules'

describe('validateDetectLogic operator-specific behaviour', () => {
  it("allows 'name' for 'is platform' operator", () => {
    const rule = `event: USER_OBSERVED\nop: and\nrules:\n  - op: exists\n    path: event/USER_NAME\n  - op: is platform\n    name: windows\n`

    expect(validateDetectLogic(rule)).toBeNull()
  })

  it('still enforces required fields for operator schemas', () => {
    const rule = `event: USER_OBSERVED\nop: is platform\n`

    expect(validateDetectLogic(rule)).toBe("Operator 'is platform' requires a 'name' field.")
  })

  it('allows exists truthy toggle', () => {
    const rule = `event: NEW_PROCESS\nop: exists\npath: event/PARENT\ntruthy: true\n`

    expect(validateDetectLogic(rule)).toBeNull()
  })

  it('rejects non-boolean truthy property', () => {
    const rule = `event: NEW_PROCESS\nop: exists\npath: event/PARENT\ntruthy: yes\n`

    expect(validateDetectLogic(rule)).toBe("Property 'truthy' must be a boolean (true or false).")
  })

  it('allows architecture checks without a path', () => {
    const rule = `event: NEW_PROCESS\nop: and\nrules:\n  - op: is 64 bit\n  - op: is arm\n    not: true\n`

    expect(validateDetectLogic(rule)).toBeNull()
  })
})

describe('validateDetectLogic real-world fixtures', () => {
  for (const fixture of validDetectRuleFixtures) {
    it(`accepts sanitized rule: ${fixture.name}`, () => {
      expect(validateDetectLogic(fixture.yaml)).toBeNull()
    })
  }

  it('flags lookup rules missing resource or lookup', () => {
    const fixture = validDetectRuleFixtures.find((item) => item.name.includes('Poor Reputation IP'))

    expect(fixture).toBeDefined()

    const parsed = yaml.load(fixture!.yaml) as any
    const mutated = JSON.parse(JSON.stringify(parsed))
    const lookupOrRules: any[] = mutated.rules[1].rules[1].rules
    let mutatedEntry: any | undefined
    for (const candidate of lookupOrRules) {
      if (candidate.op === 'lookup') {
        delete candidate.resource
        delete candidate.lookup
        mutatedEntry = candidate
        break
      }
    }

    expect(mutatedEntry).toBeDefined()

    const invalid = yaml.dump(mutated)

    expect(validateDetectLogic(invalid)).toBe(
      "Operator 'lookup' requires either a 'resource' or 'lookup' field.",
    )
  })

  it('validates metadata_rules payloads recursively', () => {
    const fixture = validDetectRuleFixtures.find((item) => item.name.includes('Poor Reputation IP'))

    expect(fixture).toBeDefined()

    const parsed = yaml.load(fixture!.yaml) as any

    const missingOp = JSON.parse(JSON.stringify(parsed))
    const lookupVariant = missingOp.rules[1].rules[1].rules.find(
      (entry: any) => entry.op === 'lookup' && entry.metadata_rules,
    )
    expect(lookupVariant).toBeDefined()
    delete lookupVariant.metadata_rules.op

    expect(validateDetectLogic(yaml.dump(missingOp))).toContain(
      "metadata_rules[0]: Operation missing 'op' field.",
    )

    const emptyRules = JSON.parse(JSON.stringify(parsed))
    const lookupEmpty = emptyRules.rules[1].rules[1].rules.find(
      (entry: any) => entry.op === 'lookup' && entry.metadata_rules,
    )
    expect(lookupEmpty).toBeDefined()
    lookupEmpty.metadata_rules = []

    expect(validateDetectLogic(yaml.dump(emptyRules))).toBe(
      "Property 'metadata_rules' must contain at least one rule.",
    )
  })
})

describe('validateDetectLogic aligns with LimaCharlie docs', () => {
  const baseEvent = 'event: TEST_EVENT'

  it('enforces list requirements for and/or', () => {
    const valid = `${baseEvent}\nop: and\nrules:\n  - op: exists\n    path: event/FOO\n  - op: exists\n    path: event/BAR\n`
    expect(validateDetectLogic(valid)).toBeNull()

    const invalid = `${baseEvent}\nop: or\nrules:\n  - op: exists\n    path: event/ONLY\n`
    expect(validateDetectLogic(invalid)).toBe("'and' and 'or' op require at least 2 rules.")
  })

  it('requires path and value for is/contains family', () => {
    const valid = `${baseEvent}\nop: is\npath: event/PROCESS_ID\nvalue: 9999\ncase sensitive: false\n`
    expect(validateDetectLogic(valid)).toBeNull()

    const missingValue = `${baseEvent}\nop: contains\npath: event/COMMAND_LINE\n`
    expect(validateDetectLogic(missingValue)).toBe("Operator 'contains' requires a 'value' field.")

    const missingPath = `${baseEvent}\nop: starts with\nvalue: powershell\n`
    expect(validateDetectLogic(missingPath)).toBe("Operator 'starts with' requires a 'path' field.")
  })

  it('requires regex for matches operator', () => {
    const valid = `${baseEvent}\nop: matches\npath: event/COMMAND_LINE\nre: \\b(cmd|powershell)\\b\n`
    expect(validateDetectLogic(valid)).toBeNull()

    const invalid = `${baseEvent}\nop: matches\npath: event/COMMAND_LINE\n`
    expect(validateDetectLogic(invalid)).toBe("Operator 'matches' requires a 're' field.")
  })

  it('requires path/value/max for string distance', () => {
    const valid = `${baseEvent}\nop: string distance\npath: event/DOMAIN_NAME\nvalue:\n  - example.com\nmax: 2\n`
    expect(validateDetectLogic(valid)).toBeNull()

    const invalid = `${baseEvent}\nop: string distance\npath: event/DOMAIN_NAME\nmax: 2\n`
    expect(validateDetectLogic(invalid)).toBe(
      "Operator 'string distance' requires a 'value' field.",
    )
  })

  it('covers platform and architecture operators', () => {
    const platformValid = `${baseEvent}\nop: is platform\nname: windows\n`
    expect(validateDetectLogic(platformValid)).toBeNull()

    const platformInvalid = `${baseEvent}\nop: is platform\n`
    expect(validateDetectLogic(platformInvalid)).toBe(
      "Operator 'is platform' requires a 'name' field.",
    )

    const archValid = `${baseEvent}\nop: and\nrules:\n  - op: is 32 bit\n  - op: is 64 bit\n    not: true\n`
    expect(validateDetectLogic(archValid)).toBeNull()
  })

  it('requires path-related operands for cidr and address checks', () => {
    const cidrValid = `${baseEvent}\nop: cidr\npath: event/IP\ncidr: 10.0.0.0/24\n`
    expect(validateDetectLogic(cidrValid)).toBeNull()

    const cidrMissing = `${baseEvent}\nop: cidr\npath: event/IP\n`
    expect(validateDetectLogic(cidrMissing)).toBe("Operator 'cidr' requires a 'cidr' field.")

    const publicValid = `${baseEvent}\nop: is public address\npath: event/IP\n`
    expect(validateDetectLogic(publicValid)).toBeNull()

    const publicMissing = `${baseEvent}\nop: is private address\n`
    expect(validateDetectLogic(publicMissing)).toBe(
      "Operator 'is private address' requires a 'path' field.",
    )
  })

  it('enforces lookup resource and metadata rules shape', () => {
    const lookupValid = `${baseEvent}\nop: lookup\npath: event/DOMAIN\nresource: hive://lookups/sample\ncase sensitive: false\n`
    expect(validateDetectLogic(lookupValid)).toBeNull()

    const lookupMissing = `${baseEvent}\nop: lookup\npath: event/DOMAIN\n`
    expect(validateDetectLogic(lookupMissing)).toBe(
      "Operator 'lookup' requires either a 'resource' or 'lookup' field.",
    )

    const lookupMetadata = `${baseEvent}\nop: lookup\npath: event/DOMAIN\nresource: hive://lookups/sample\nmetadata_rules:\n  op: contains\n  path: event/geoip/city_name\n  value: Test\n`
    expect(validateDetectLogic(lookupMetadata)).toBeNull()

    const lookupMetadataEmpty = `${baseEvent}\nop: lookup\npath: event/DOMAIN\nresource: hive://lookups/sample\nmetadata_rules: []\n`
    expect(validateDetectLogic(lookupMetadataEmpty)).toBe(
      "Property 'metadata_rules' must contain at least one rule.",
    )
  })

  it('requires scope path and nested rule', () => {
    const scopeValid = `${baseEvent}\nop: scope\npath: event/NETWORK_ACTIVITY\nrule:\n  op: is\n  path: event/DESTINATION/PORT\n  value: 443\n`
    expect(validateDetectLogic(scopeValid)).toBeNull()

    const scopeMissingRule = `${baseEvent}\nop: scope\npath: event/NETWORK_ACTIVITY\n`
    expect(validateDetectLogic(scopeMissingRule)).toBe("Operator 'scope' requires a 'rule' field.")
  })

  it('requires temporal operands to provide seconds', () => {
    const valid = `${baseEvent}\nop: is older than\npath: routing/event_time\nseconds: 3600\n`
    expect(validateDetectLogic(valid)).toBeNull()

    const invalid = `${baseEvent}\nop: is older than\npath: routing/event_time\n`
    expect(validateDetectLogic(invalid)).toBe(
      "Operator 'is older than' requires a 'seconds' field.",
    )
  })

  it('permits documented transforms and times modifiers', () => {
    const rule = `${baseEvent}\nop: ends with\npath: event/FILE_PATH\nvalue: chrome.exe\ncase sensitive: false\nfile name: true\ntimes:\n  - day_of_week_start: 2\n    day_of_week_end: 6\n    time_of_day_start: 2200\n    time_of_day_end: 2359\n    tz: America/Los_Angeles\n`
    expect(validateDetectLogic(rule)).toBeNull()
  })
})
