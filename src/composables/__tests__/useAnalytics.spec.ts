import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('hosted analytics availability', () => {
  it.each([
    { production: true, hostname: 'detectionforge.ddi.sh', available: true },
    { production: false, hostname: 'detectionforge.ddi.sh', available: false },
    { production: true, hostname: 'localhost', available: false },
    { production: true, hostname: 'self-hosted.example', available: false },
  ])('offers opt-in for production=$production on $hostname: $available', async (scenario) => {
    vi.stubEnv('PROD', scenario.production)
    // Normal production deployment must offer opt-in without an activation variable.
    vi.stubEnv('VITE_ANALYTICS_ENABLED', undefined)
    vi.stubGlobal('window', { location: { hostname: scenario.hostname } })
    vi.stubGlobal('document', { createElement: vi.fn(() => ({})) })
    const { analytics } = await import('../useAnalytics')
    expect(analytics.available).toBe(scenario.available)
    expect(analytics.status.value).toBe('idle')
    expect(analytics.consent.value).toBeNull()
  })
})
