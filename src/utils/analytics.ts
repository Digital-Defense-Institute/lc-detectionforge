import { readonly, ref } from 'vue'

// Purpose: understand adoption, prioritize improvements, and justify maintenance.
// This module must never import credentials, organization state, rules, or API data.
export const MEASUREMENT_ID = 'G-P0C3RG2X1T'
export const CONSENT_KEY = 'df_analytics_consent_v1'
export const COOKIE_PREFIX = 'df_usage'
type Consent = 'granted' | 'denied' | null
type GoogleWindow = Window & {
  dataLayer?: unknown[]
  [key: `ga-disable-${string}`]: boolean
}

const pages = {
  '/': 'Home',
  '/workbench': 'Workbench',
  '/config': 'Configuration',
  '/changelog': 'Changelog',
  '/privacy': 'Privacy & analytics',
} as const
const actions = ['unit_test_run', 'backtest_run', 'rule_export'] as const
export type UsageAction = (typeof actions)[number]

// Browser dependencies are explicit so consent and payload boundaries can be tested.
export function createAnalytics(browser: Window, doc: Document, available: boolean) {
  const win = browser as GoogleWindow
  const consent = ref<Consent>(null)
  const status = ref<'idle' | 'loading' | 'active' | 'blocked'>('idle')
  const storageError = ref(false)
  let currentPath = '/'
  let initialized = false
  let script: HTMLScriptElement | null = null

  const readConsent = (): Consent => {
    try {
      const stored = win.localStorage.getItem(CONSENT_KEY)
      return stored === 'granted' || stored === 'denied' ? stored : null
    } catch {
      return null
    }
  }

  // Construct metadata from constants; never read title, referrer, search or hash.
  const pageFields = () => {
    const path = Object.prototype.hasOwnProperty.call(pages, currentPath)
      ? (currentPath as keyof typeof pages)
      : null
    return {
      page_location: `https://detectionforge.ddi.sh${path ?? '/other'}`,
      page_title: path ? pages[path] : 'Other',
      page_referrer: '',
    }
  }

  function command(..._args: unknown[]) {
    // Collection failures must never interrupt detection engineering.
    try {
      // Use gtag's documented Arguments-object protocol, not a custom queue format.
      // eslint-disable-next-line prefer-rest-params -- Google's gtag command protocol uses Arguments objects.
      win.dataLayer?.push(arguments)
    } catch {
      status.value = 'blocked'
    }
  }

  const clearCookies = () => {
    try {
      for (const cookie of doc.cookie.split(';')) {
        const name = cookie.trim().split('=')[0]
        if (name.startsWith(`${COOKIE_PREFIX}_`)) {
          doc.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`
        }
      }
    } catch {
      // Storage restrictions must not prevent consent withdrawal.
    }
  }

  const stop = (reload = true) => {
    win[`ga-disable-${MEASUREMENT_ID}`] = true
    const needsReload = script !== null
    script?.remove()
    script = null
    if (win.dataLayer) win.dataLayer.length = 0
    status.value = 'idle'
    clearCookies()
    // Removing a tag does not unload code that already ran. Reload to do that.
    if (needsReload && reload) win.location.reload()
  }

  const sendPage = () => {
    if (consent.value === 'granted' && status.value === 'active') {
      command('set', pageFields())
      command('event', 'page_view', pageFields())
    }
  }

  const start = () => {
    // The notice can save consent while the initial lazy route is loading.
    // Wait for route-aware initialization before loading the tag or sending events.
    if (!initialized || !available || consent.value !== 'granted' || script) return
    win[`ga-disable-${MEASUREMENT_ID}`] = false
    win.dataLayer = []
    status.value = 'loading'
    const tag = doc.createElement('script')
    script = tag
    tag.async = true
    tag.referrerPolicy = 'no-referrer'
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
    tag.onload = () => {
      if (script !== tag || consent.value !== 'granted') return
      // Apply safe metadata before initialization, including automatic GA events.
      command('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })
      command('set', pageFields())
      command('js', new Date())
      command('config', MEASUREMENT_ID, {
        ...pageFields(),
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        ignore_referrer: true,
        cookie_prefix: COOKIE_PREFIX,
        cookie_domain: 'none',
        cookie_path: '/',
        cookie_expires: 60 * 60 * 24 * 30,
        cookie_update: false,
        cookie_flags: 'SameSite=Lax;Secure',
      })
      status.value = 'active'
      sendPage()
    }
    tag.onerror = () => {
      if (script === tag) status.value = 'blocked'
    }
    try {
      doc.head.appendChild(tag)
    } catch {
      status.value = 'blocked'
    }
  }

  const setConsent = (next: Exclude<Consent, null>) => {
    storageError.value = false
    let persisted = true
    try {
      win.localStorage.setItem(CONSENT_KEY, next)
    } catch {
      storageError.value = true
      // Never start collection if the preference cannot be remembered.
      if (next === 'granted') return
      // A persisted grant must not silently reactivate on the withdrawal reload.
      try {
        win.localStorage.removeItem(CONSENT_KEY)
      } catch {
        persisted = false
      }
    }
    consent.value = next
    if (next === 'granted') start()
    else stop(persisted)
  }

  const initialize = () => {
    if (initialized) return
    initialized = true
    consent.value = readConsent()
    win[`ga-disable-${MEASUREMENT_ID}`] = true
    if (available && consent.value === 'granted') start()
    else clearCookies()
    win.addEventListener('storage', (event) => {
      if (event.key !== CONSENT_KEY && event.key !== null) return
      consent.value = readConsent()
      if (consent.value === 'granted') start()
      else stop()
    })
  }

  const trackPage = (path: string) => {
    currentPath = path
    sendPage()
  }

  // No parameter bag: callers cannot accidentally attach app data. Runtime check
  // also rejects unknown names from JS callers. Events before consent are dropped.
  const trackAction = (action: UsageAction) => {
    if (!actions.includes(action) || consent.value !== 'granted' || status.value !== 'active')
      return
    command('event', action, pageFields())
  }

  return {
    available,
    consent: readonly(consent),
    status: readonly(status),
    storageError: readonly(storageError),
    initialize,
    setConsent,
    trackPage,
    trackAction,
  }
}
