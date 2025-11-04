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

    const matches = [
      buildMatch(Date.UTC(2024, 0, 1, 0, 0)),
      buildMatch(Date.UTC(2024, 0, 1, 0, 1)),
    ]

    const result = applySuppressionToMatches(config, matches, {
      organizationId: 'oid',
    })

    expect(result.summary.actualAlerts).toBe(2)
    expect(result.summary.issues.length).toBeGreaterThan(0)
    expect(
      result.matches.every(
        (match) => match.detectionforge_suppression?.status === 'evaluation-error',
      ),
    ).toBe(
      true,
    )
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

    expect(result.matches.map((match) => match.detectionforge_suppression?.status)).toEqual([
      'actual-alert',
      'suppressed-post-threshold',
      'actual-alert',
    ])
  })
})
