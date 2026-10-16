import { describe, expect, it } from 'vitest'

import {
  applySuppressionToMatches,
  parseSuppressionFromRespondLogic,
  type SuppressionConfig,
  type SuppressionMatch,
} from '../utils/suppression'

const buildMatch = (eventTimeMs: number, extra?: Partial<SuppressionMatch>): SuppressionMatch => ({
  action: 'report',
  data: {
    detect: {
      event: {},
      routing: {
        event_time: eventTimeMs,
      },
      ts: new Date(eventTimeMs).toISOString(),
    },
    routing: {},
    gen_time: eventTimeMs,
    ...extra?.data,
  },
  ...extra,
})

const statusesFor = (result: ReturnType<typeof applySuppressionToMatches>) =>
  result.matches.map((match) => match.detectionforge_suppression?.status)

describe('suppression parsing', () => {
  it('parses suppression config from respond logic', () => {
    const respondLogic = [
      {
        action: 'report',
        name: 'test report',
        suppression: {
          max_count: 3,
          min_count: 2,
          period: '1h',
          is_global: false,
          keys: ['constant-key'],
        },
      },
    ]

    const parsed = parseSuppressionFromRespondLogic(respondLogic)

    expect(parsed).not.toBeNull()
    expect(parsed?.config.periodMs).toBe(60 * 60 * 1000)
    expect(parsed?.config.minCount).toBe(2)
    expect(parsed?.config.maxCount).toBe(3)
    expect(parsed?.config.keys).toEqual(['constant-key'])
  })

  it('finds the first report action in nested respond logic and normalizes its values', () => {
    const parsed = parseSuppressionFromRespondLogic({
      respond: [
        { action: 'tag', suppression: { period: '1d' } },
        {
          action: 'report',
          name: 42,
          suppression: {
            period: 30,
            max_count: '2',
            min_count: 4,
            is_global: 'yes',
            keys: ['{{ .event.host }}', 7],
          },
        },
      ],
    })

    expect(parsed).toEqual({
      config: {
        periodMs: 30_000,
        maxCount: 2,
        minCount: 2,
        isGlobal: true,
        keys: ['{{ .event.host }}', '7'],
        sourceActionName: '42',
        sourceActionIndex: 1,
      },
      issues: [
        'Suppression min_count is greater than max_count; min_count will be clamped to max_count.',
      ],
    })
  })

  it('rejects missing, invalid, and non-report suppression definitions', () => {
    expect(parseSuppressionFromRespondLogic(undefined)).toBeNull()
    expect(parseSuppressionFromRespondLogic([{ action: 'report' }])).toBeNull()
    expect(
      parseSuppressionFromRespondLogic([
        { action: 'report', suppression: { period: 'fortnight' } },
      ]),
    ).toBeNull()
    expect(
      parseSuppressionFromRespondLogic([{ action: 'tag', suppression: { period: '1h' } }]),
    ).toBeNull()
  })

  it('ignores non-positive limits while retaining valid period and key defaults', () => {
    const parsed = parseSuppressionFromRespondLogic({
      action: 'report',
      suppression: { period: '2w', max_count: 0, min_count: -1 },
    })

    expect(parsed?.config).toMatchObject({
      periodMs: 14 * 24 * 60 * 60 * 1000,
      maxCount: undefined,
      minCount: undefined,
      isGlobal: false,
      keys: [],
    })
    expect(parsed?.issues).toEqual([
      'Suppression max_count must be greater than 0; ignoring max_count.',
      'Suppression min_count must be greater than 0; ignoring min_count.',
    ])
  })
})

describe('suppression application', () => {
  const baseConfig: SuppressionConfig = {
    periodMs: 10 * 60 * 1000,
    minCount: 2,
    maxCount: 2,
    isGlobal: false,
    keys: ['constant'],
  }

  it('respects threshold and max alert limits', () => {
    const matches = [0, 1, 2, 3].map((offsetMinutes) =>
      buildMatch(Date.UTC(2024, 0, 1, 0, offsetMinutes)),
    )

    const result = applySuppressionToMatches(baseConfig, matches, {
      organizationId: 'test-oid',
      organizationName: 'Test Org',
    })

    expect(result.summary.actualAlerts).toBe(2)
    expect(result.summary.suppressedPreThreshold).toBe(1)
    expect(result.summary.suppressedPostThreshold).toBe(1)

    expect(result.matches[0].detectionforge_suppression?.status).toBe('suppressed-pre-threshold')
    expect(result.matches[1].detectionforge_suppression?.status).toBe('actual-alert')
    expect(result.matches[2].detectionforge_suppression?.status).toBe('actual-alert')
    expect(result.matches[3].detectionforge_suppression?.status).toBe('suppressed-post-threshold')
  })

  it('treats all matches as actual when templates fail', () => {
    const config: SuppressionConfig = {
      ...baseConfig,
      keys: ['{{ bogus .event }}'],
    }

    const matches = [buildMatch(Date.UTC(2024, 0, 1, 0, 0)), buildMatch(Date.UTC(2024, 0, 1, 0, 1))]

    const result = applySuppressionToMatches(config, matches, {
      organizationId: 'oid',
    })

    expect(result.summary.actualAlerts).toBe(2)
    expect(result.summary.issues.length).toBeGreaterThan(0)
    expect(
      result.matches.every(
        (match) => match.detectionforge_suppression?.status === 'evaluation-error',
      ),
    ).toBe(true)
  })

  it('handles consecutive windows when period expires', () => {
    const config: SuppressionConfig = {
      periodMs: 60 * 1000,
      minCount: 1,
      maxCount: 1,
      isGlobal: true,
      keys: ['constant'],
    }

    const matches = [
      buildMatch(Date.UTC(2024, 0, 1, 0, 0, 0)),
      buildMatch(Date.UTC(2024, 0, 1, 0, 0, 30)),
      buildMatch(Date.UTC(2024, 0, 1, 0, 2, 0)),
    ]

    const result = applySuppressionToMatches(config, matches, {
      organizationId: 'oid',
    })

    expect(statusesFor(result)).toEqual([
      'actual-alert',
      'suppressed-post-threshold',
      'actual-alert',
    ])
  })

  it('renders paths, organization values, and pipelines into a stable key signature', () => {
    const config: SuppressionConfig = {
      periodMs: 60_000,
      minCount: 1,
      maxCount: 1,
      isGlobal: false,
      keys: ['{{ .event.user | trim | lower }}', '{{ .routing.source | upper }}', '{{ .org.oid }}'],
    }
    const matches = [
      buildMatch(Date.UTC(2024, 0, 1), {
        data: {
          detect: {
            event: { user: '  ALICE  ' },
            routing: { event_time: Date.UTC(2024, 0, 1), source: 'edr' },
          },
        },
      }),
      buildMatch(Date.UTC(2024, 0, 1, 0, 0, 1), {
        data: {
          detect: {
            event: { user: 'alice' },
            routing: { event_time: Date.UTC(2024, 0, 1, 0, 0, 1), source: 'EDR' },
          },
        },
      }),
    ]

    const result = applySuppressionToMatches(config, matches, { organizationId: 'oid-123' })

    expect(statusesFor(result)).toEqual(['actual-alert', 'suppressed-post-threshold'])
    expect(result.matches[0].detectionforge_suppression?.keySignature).toBe('alice::EDR::oid-123')
    expect(result.summary.perKey).toEqual([
      {
        key: 'alice::EDR::oid-123',
        actualAlerts: 1,
        suppressedPreThreshold: 0,
        suppressedPostThreshold: 1,
      },
    ])
  })

  it('maintains independent thresholds for each rendered key group', () => {
    const config: SuppressionConfig = {
      periodMs: 60_000,
      minCount: 1,
      maxCount: 1,
      isGlobal: false,
      keys: ['{{ .event.host }}', '{{ .routing.sensor }}'],
    }
    const at = Date.UTC(2024, 0, 1)
    const matches = [
      buildMatch(at, {
        data: { detect: { event: { host: 'a' }, routing: { event_time: at, sensor: 'one' } } },
      }),
      buildMatch(at + 1_000, {
        data: {
          detect: { event: { host: 'b' }, routing: { event_time: at + 1_000, sensor: 'one' } },
        },
      }),
      buildMatch(at + 2_000, {
        data: {
          detect: { event: { host: 'a' }, routing: { event_time: at + 2_000, sensor: 'one' } },
        },
      }),
      buildMatch(at + 3_000, {
        data: {
          detect: { event: { host: 'b' }, routing: { event_time: at + 3_000, sensor: 'one' } },
        },
      }),
    ]

    const result = applySuppressionToMatches(config, matches, { organizationId: 'oid' })

    expect(statusesFor(result)).toEqual([
      'actual-alert',
      'actual-alert',
      'suppressed-post-threshold',
      'suppressed-post-threshold',
    ])
    expect(result.summary.perKey).toEqual([
      { key: 'a::one', actualAlerts: 1, suppressedPreThreshold: 0, suppressedPostThreshold: 1 },
      { key: 'b::one', actualAlerts: 1, suppressedPreThreshold: 0, suppressedPostThreshold: 1 },
    ])
  })

  it('uses the default key and counts events exactly at the window boundary', () => {
    const config: SuppressionConfig = {
      periodMs: 60_000,
      minCount: 2,
      maxCount: 1,
      isGlobal: true,
      keys: [],
    }
    const at = Date.UTC(2024, 0, 1)

    const result = applySuppressionToMatches(
      config,
      [buildMatch(at), buildMatch(at + 60_000), buildMatch(at + 60_001)],
      { organizationId: 'oid' },
    )

    expect(statusesFor(result)).toEqual([
      'suppressed-pre-threshold',
      'actual-alert',
      'suppressed-post-threshold',
    ])
    expect(
      result.matches.every(
        (match) => match.detectionforge_suppression?.keySignature === '__suppression::default__',
      ),
    ).toBe(true)
    expect(result.summary).toMatchObject({
      actualAlerts: 1,
      suppressedPreThreshold: 1,
      suppressedPostThreshold: 1,
      suppressedTotal: 2,
    })
  })

  it('sorts by routing event time and preserves the caller input order in its output', () => {
    const config: SuppressionConfig = {
      periodMs: 60_000,
      minCount: 1,
      maxCount: 1,
      isGlobal: true,
      keys: ['constant'],
    }
    const at = Date.UTC(2024, 0, 1)
    const later = buildMatch(at + 30_000)
    const earlier = buildMatch(at)

    const result = applySuppressionToMatches(config, [later, earlier], { organizationId: 'oid' })

    expect(statusesFor(result)).toEqual(['suppressed-post-threshold', 'actual-alert'])
  })

  it('falls back from routing event time to detect timestamp and then generation time', () => {
    const config: SuppressionConfig = {
      periodMs: 60_000,
      minCount: 1,
      maxCount: 1,
      isGlobal: true,
      keys: ['constant'],
    }
    const at = Date.UTC(2024, 0, 1)
    const fromIso = buildMatch(at, {
      data: {
        detect: { event: {}, routing: {}, ts: '2024-01-01 00:00:00' },
        gen_time: at + 120_000,
      },
    })
    const fromGenTime = buildMatch(at + 1_000, {
      data: { detect: { event: {}, routing: {} }, gen_time: (at + 30_000) / 1000 },
    })

    const result = applySuppressionToMatches(config, [fromGenTime, fromIso], {
      organizationId: 'oid',
    })

    expect(statusesFor(result)).toEqual(['suppressed-post-threshold', 'actual-alert'])
  })

  it('records template errors per match without suppressing the affected alert', () => {
    const config: SuppressionConfig = { ...baseConfig, keys: ['{{ .event.user | doesNotExist }}'] }
    const matches = [
      buildMatch(Date.UTC(2024, 0, 1), { data: { detect: { event: { user: 'alice' } } } }),
      buildMatch(Date.UTC(2024, 0, 1, 0, 1), { data: { detect: { event: { user: 'bob' } } } }),
    ]

    const result = applySuppressionToMatches(config, matches, { organizationId: 'oid' })

    expect(statusesFor(result)).toEqual(['evaluation-error', 'evaluation-error'])
    expect(result.summary.actualAlerts).toBe(2)
    expect(result.summary.suppressedTotal).toBe(0)
    expect(result.summary.issues).toHaveLength(2)
    expect(
      result.summary.issues.every((issue) =>
        issue.includes('Unsupported template transform: doesNotExist'),
      ),
    ).toBe(true)
    expect(result.matches[0].detectionforge_suppression?.keySignature).toBe(
      '__suppression::error__',
    )
  })
})
