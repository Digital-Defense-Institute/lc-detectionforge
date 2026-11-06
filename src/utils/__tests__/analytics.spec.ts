import { describe, expect, it, vi } from 'vitest'
import { CONSENT_KEY, createAnalytics, MEASUREMENT_ID, type UsageAction } from '../analytics'

function setup(available = true, saved?: string) {
  const values = new Map<string, string>(saved ? [[CONSENT_KEY, saved]] : [])
  const cookies = new Map<string, string>([
    ['df_usage_ga', 'old-browser-id'],
    ['df_usage_ga_P0C3RG2X1T', 'old-session-id'],
    ['unrelated_cookie', 'keep'],
  ])
  const scripts: HTMLScriptElement[] = []
  const listeners = new Map<string, (event: Partial<StorageEvent>) => void>()
  const browser = {
    localStorage: {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    },
    location: { reload: vi.fn(), search: '?api_key=SECRET', hash: '#TOKEN' },
    addEventListener: vi.fn((name: string, cb: (event: Partial<StorageEvent>) => void) => {
      listeners.set(name, cb)
    }),
    dataLayer: undefined as unknown[] | undefined,
    [`ga-disable-${MEASUREMENT_ID}`]: false,
  }
  const doc = {
    // Throw if analytics tries to inspect page content or dynamic metadata.
    get title(): string {
      throw new Error('Do not inspect document.title')
    },
    get referrer(): string {
      throw new Error('Do not inspect document.referrer')
    },
    get cookie() {
      return [...cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    },
    set cookie(value: string) {
      cookies.delete(value.split('=')[0])
    },
    createElement: vi.fn(() => ({ remove: vi.fn() })),
    head: { appendChild: vi.fn((script: HTMLScriptElement) => scripts.push(script)) },
  }
  const analytics = createAnalytics(
    browser as unknown as Window,
    doc as unknown as Document,
    available,
  )
  const load = () => scripts.at(-1)?.onload?.(new Event('load'))
  const commands = () => (browser.dataLayer ?? []).map((item) => Array.from(item as IArguments))
  const storageEvent = (value: string | null, key: string | null = CONSENT_KEY) => {
    if (value === null) values.delete(CONSENT_KEY)
    else values.set(CONSENT_KEY, value)
    listeners.get('storage')?.({ key })
  }
  return { analytics, browser, doc, scripts, cookies, values, load, commands, storageEvent }
}

describe('optional analytics consent and data boundaries', () => {
  it.each([undefined, 'denied', 'invalid', '{"granted":true}'])(
    'sends and queues nothing for %s',
    (saved) => {
      const s = setup(true, saved)
      s.analytics.initialize()
      s.analytics.trackPage('/config')
      s.analytics.trackAction('unit_test_run')
      expect(s.scripts).toHaveLength(0)
      expect(s.browser.dataLayer).toBeUndefined()
      expect([...s.cookies]).toEqual([['unrelated_cookie', 'keep']])
    },
  )

  it('keeps analytics unavailable outside the hosted production app, even with saved consent', () => {
    const s = setup(false, 'granted')
    s.analytics.initialize()
    s.analytics.setConsent('granted')
    s.analytics.trackAction('backtest_run')
    expect(s.scripts).toHaveLength(0)
    expect(s.commands()).toEqual([])
  })

  it('loads only after opt-in, once, with no script referrer', () => {
    const s = setup()
    s.analytics.initialize()
    s.analytics.trackAction('rule_export')
    s.analytics.setConsent('granted')
    s.analytics.setConsent('granted')
    expect(s.scripts).toHaveLength(1)
    expect(s.scripts[0].src).toBe(`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`)
    expect(s.scripts[0].referrerPolicy).toBe('no-referrer')
    expect(s.commands()).toEqual([])
    s.load()
    expect(
      s
        .commands()
        .filter((c) => c[0] === 'event')
        .map((c) => c[1]),
    ).toEqual(['page_view'])
    expect(s.values.get(CONSENT_KEY)).toBe('granted')
  })

  it('defers an early consent grant until the initial route is ready', () => {
    const s = setup()
    // The notice can be used while Vue Router is still loading a lazy route.
    s.analytics.setConsent('granted')
    s.analytics.trackAction('rule_export')
    expect(s.scripts).toHaveLength(0)
    expect(s.commands()).toEqual([])
    expect(s.values.get(CONSENT_KEY)).toBe('granted')

    s.analytics.trackPage('/config')
    s.analytics.initialize()
    s.load()
    s.analytics.initialize()
    expect(s.scripts).toHaveLength(1)
    expect(s.browser[`ga-disable-${MEASUREMENT_ID}`]).toBe(false)
    expect(s.analytics.status.value).toBe('active')
    expect(s.commands().find((c) => c[0] === 'config')?.[2]).toMatchObject({
      page_location: 'https://detectionforge.ddi.sh/config',
      page_title: 'Configuration',
    })
    expect(s.commands().filter((c) => c[0] === 'event')).toEqual([
      [
        'event',
        'page_view',
        {
          page_location: 'https://detectionforge.ddi.sh/config',
          page_title: 'Configuration',
          page_referrer: '',
        },
      ],
    ])
  })

  it('honors withdrawal of an early grant before route readiness without loading the tag', () => {
    const s = setup()
    s.analytics.setConsent('granted')
    s.analytics.setConsent('denied')
    s.analytics.trackPage('/workbench')
    s.analytics.initialize()
    expect(s.scripts).toHaveLength(0)
    expect(s.commands()).toEqual([])
    expect(s.analytics.consent.value).toBe('denied')
    expect(s.browser[`ga-disable-${MEASUREMENT_ID}`]).toBe(true)
    expect(s.browser.location.reload).not.toHaveBeenCalled()
  })

  it('preserves a failed early withdrawal through initialization and storage events', () => {
    const s = setup()
    s.analytics.setConsent('granted')
    s.browser.localStorage.setItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    s.browser.localStorage.removeItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    s.analytics.setConsent('denied')
    expect(s.values.get(CONSENT_KEY)).toBe('granted')

    s.analytics.trackPage('/config')
    s.analytics.initialize()
    expect(s.analytics.consent.value).toBe('denied')
    expect(s.scripts).toHaveLength(0)
    s.storageEvent('granted')
    expect(s.analytics.consent.value).toBe('denied')
    expect(s.analytics.storageError.value).toBe(true)
    expect(s.scripts).toHaveLength(0)
    expect(s.commands()).toEqual([])
    expect(s.browser[`ga-disable-${MEASUREMENT_ID}`]).toBe(true)

    // Only a new explicit grant that can be saved may override the withdrawal.
    s.analytics.setConsent('granted')
    expect(s.scripts).toHaveLength(0)
    s.browser.localStorage.setItem.mockImplementation((key, value) => s.values.set(key, value))
    s.analytics.setConsent('granted')
    s.load()
    expect(s.analytics.consent.value).toBe('granted')
    expect(s.scripts).toHaveLength(1)
    expect(s.browser[`ga-disable-${MEASUREMENT_ID}`]).toBe(false)
  })

  it('uses fixed page metadata and ignores arbitrary event parameters at runtime', () => {
    const s = setup(true, 'granted')
    s.analytics.trackPage('/workbench')
    s.analytics.initialize()
    s.load()
    // Even JS callers passing an extra argument cannot attach it to an event.
    Reflect.apply(s.analytics.trackAction, null, [
      'unit_test_run',
      { apiKey: 'SECRET', oid: 'ORG' },
    ])
    s.analytics.trackAction('SECRET' as UsageAction)
    s.analytics.trackPage('/config?apiKey=SECRET#TOKEN')
    s.analytics.trackPage('/private/SECRET')
    s.analytics.trackPage('toString')
    s.analytics.trackPage('/config')
    const payload = JSON.stringify(s.commands())
    expect(payload).not.toMatch(/SECRET|TOKEN|apiKey|ORG|private|toString/)
    expect(s.commands().filter((c) => c[0] === 'event')).toEqual([
      [
        'event',
        'page_view',
        {
          page_location: 'https://detectionforge.ddi.sh/workbench',
          page_title: 'Workbench',
          page_referrer: '',
        },
      ],
      [
        'event',
        'unit_test_run',
        {
          page_location: 'https://detectionforge.ddi.sh/workbench',
          page_title: 'Workbench',
          page_referrer: '',
        },
      ],
      ...Array.from({ length: 3 }, () => [
        'event',
        'page_view',
        {
          page_location: 'https://detectionforge.ddi.sh/other',
          page_title: 'Other',
          page_referrer: '',
        },
      ]),
      [
        'event',
        'page_view',
        {
          page_location: 'https://detectionforge.ddi.sh/config',
          page_title: 'Configuration',
          page_referrer: '',
        },
      ],
    ])
    expect(s.commands().find((c) => c[0] === 'config')?.[2]).toMatchObject({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: 'none',
      cookie_expires: 2592000,
      cookie_update: false,
    })
  })

  it('remembers decline without contacting Google', () => {
    const s = setup()
    s.analytics.initialize()
    s.analytics.setConsent('denied')
    expect(s.values.get(CONSENT_KEY)).toBe('denied')
    expect(s.analytics.consent.value).toBe('denied')
    expect(s.scripts).toHaveLength(0)
    expect(s.browser.location.reload).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    'withdraws safely while tag loaded=%s, and rejects late callbacks',
    (loaded) => {
      const s = setup(true, 'granted')
      s.analytics.initialize()
      if (loaded) s.load()
      s.analytics.setConsent('denied')
      s.load()
      s.analytics.trackAction('backtest_run')
      expect(s.browser[`ga-disable-${MEASUREMENT_ID}`]).toBe(true)
      expect(s.values.get(CONSENT_KEY)).toBe('denied')
      expect(s.commands()).toEqual([])
      expect(s.browser.location.reload).toHaveBeenCalledOnce()
      expect([...s.cookies]).toEqual([['unrelated_cookie', 'keep']])
    },
  )

  it('applies consent withdrawal and storage clearing across tabs', () => {
    const s = setup(true, 'granted')
    s.analytics.initialize()
    s.load()
    s.storageEvent('denied')
    expect(s.analytics.consent.value).toBe('denied')
    expect(s.browser.location.reload).toHaveBeenCalledOnce()
    const t = setup(true, 'granted')
    t.analytics.initialize()
    t.storageEvent(null, null)
    expect(t.analytics.consent.value).toBeNull()
    expect(t.browser.location.reload).toHaveBeenCalledOnce()
  })

  it('fails closed when consent storage is inaccessible', () => {
    const s = setup(true, 'granted')
    s.browser.localStorage.getItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    s.browser.localStorage.setItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    s.analytics.initialize()
    s.analytics.setConsent('granted')
    expect(s.analytics.storageError.value).toBe(true)
    expect(s.scripts).toHaveLength(0)
  })

  it('does not reload into a stale saved grant when both writing and removing storage fail', () => {
    const s = setup(true, 'granted')
    s.analytics.initialize()
    s.load()
    s.browser.localStorage.setItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    s.browser.localStorage.removeItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    s.analytics.setConsent('denied')
    expect(s.analytics.consent.value).toBe('denied')
    expect(s.browser[`ga-disable-${MEASUREMENT_ID}`]).toBe(true)
    expect(s.browser.location.reload).not.toHaveBeenCalled()
    expect(s.commands()).toEqual([])
  })

  it('handles blocked script loads without affecting app actions', () => {
    const s = setup(true, 'granted')
    s.analytics.initialize()
    s.scripts[0].onerror?.(new Event('error'))
    expect(() => s.analytics.trackAction('backtest_run')).not.toThrow()
    expect(s.analytics.status.value).toBe('blocked')
    expect(s.commands()).toEqual([])
  })
})
