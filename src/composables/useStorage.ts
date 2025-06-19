import { ref, computed } from 'vue'

// Singleton storage state - shared across all components
const prefix = 'detectionforge_'

// Reactive state (global/singleton)
// SECURITY: Credentials are kept in memory only - they auto-clear when app/browser closes
const credentials = ref<{ uid: string; apiKey: string; lastUsed: number } | null>(null)
const organizations = ref<
  Array<{
    oid: string
    name: string
    description?: string
    addedAt: number
    urls?: unknown // Store organization URLs directly in the org object
  }>
>([])
const settings = ref<Record<string, unknown>>({})

let isInitialized = false

// Enhanced storage composable for LimaCharlie Testbench
export function useStorage() {
  // Load initial data from localStorage (only once)
  const loadInitialData = () => {
    if (isInitialized) return

    // NOTE: We intentionally do NOT load credentials from localStorage
    // Credentials stay in memory only for security - they clear when app closes

    // Load organizations (these can persist)
    const storedOrgs = localStorage.getItem(prefix + 'organizations')
    if (storedOrgs) {
      organizations.value = JSON.parse(storedOrgs)
    }

    isInitialized = true
  }

  // Force refresh data from localStorage (for after imports)
  const refreshFromStorage = () => {
    // Reload organizations
    const storedOrgs = localStorage.getItem(prefix + 'organizations')
    if (storedOrgs) {
      organizations.value = JSON.parse(storedOrgs)
    } else {
      organizations.value = []
    }

    // Reload settings
    settings.value = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix + 'setting_')) {
        const settingKey = key.substring((prefix + 'setting_').length)
        const value = localStorage.getItem(key)
        if (value) {
          try {
            settings.value[settingKey] = JSON.parse(value)
          } catch {
            settings.value[settingKey] = value
          }
        }
      }
    }
  }

  // Credentials management - IN MEMORY ONLY for security
  const setCredentials = (uid: string, apiKey: string) => {
    const data = { uid, apiKey, lastUsed: Date.now() }
    // Store in reactive memory state only - NOT in localStorage
    credentials.value = data
    // Credentials stored in memory only - will clear when app closes
  }

  const getCredentials = () => {
    return credentials.value
  }

  const clearCredentials = () => {
    credentials.value = null
    // Also clean up any legacy credentials that might be in localStorage
    localStorage.removeItem(prefix + 'credentials')
  }

  // Organization management
  const addOrganization = (oid: string, name: string, description = '') => {
    const existing = organizations.value.findIndex((org) => org.oid === oid)
    const orgData = { oid, name, description, addedAt: Date.now(), urls: undefined as unknown }

    if (existing >= 0) {
      // Preserve existing URLs when updating organization
      orgData.urls = organizations.value[existing].urls
      organizations.value[existing] = orgData
    } else {
      organizations.value.push(orgData)
    }

    localStorage.setItem(prefix + 'organizations', JSON.stringify(organizations.value))
  }

  const removeOrganization = (oid: string) => {
    organizations.value = organizations.value.filter((org) => org.oid !== oid)
    localStorage.setItem(prefix + 'organizations', JSON.stringify(organizations.value))
    // No need to clean up separate URL keys anymore - they're nested in the org data
  }

  // Organization-specific URL management (now nested in org data)
  const setOrganizationUrls = (oid: string, urls: unknown) => {
    const existing = organizations.value.findIndex((org) => org.oid === oid)
    if (existing >= 0) {
      organizations.value[existing].urls = urls
      localStorage.setItem(prefix + 'organizations', JSON.stringify(organizations.value))
    }
  }

  const getOrganizationUrls = (oid: string) => {
    const org = organizations.value.find((org) => org.oid === oid)
    return org?.urls || null
  }

  const getOrganizationReplayUrl = (oid: string): string | null => {
    const urls = getOrganizationUrls(oid)
    if (urls && typeof urls === 'object' && urls !== null) {
      const urlObj = urls as { url?: { replay?: string } }
      const replayUrl = urlObj.url?.replay
      if (replayUrl) {
        return replayUrl.startsWith('http') ? replayUrl : `https://${replayUrl}`
      }
    }
    return null
  }

  // Generic settings
  const setSetting = (key: string, value: unknown) => {
    settings.value[key] = value
    localStorage.setItem(prefix + 'setting_' + key, JSON.stringify(value))
  }

  const getSetting = (key: string, defaultValue: unknown = null) => {
    if (key in settings.value) {
      return settings.value[key]
    }

    const stored = localStorage.getItem(prefix + 'setting_' + key)
    if (stored) {
      const value = JSON.parse(stored)
      settings.value[key] = value
      return value
    }

    // Don't add to reactive settings if there's no stored value
    return defaultValue
  }

  const clearAllData = () => {
    // Clear all testbench data from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key)
      }
    })

    // Reset reactive state (credentials will be null already since they're memory-only)
    credentials.value = null
    organizations.value = []
    settings.value = {}
  }

  // Computed properties
  const hasCredentials = computed(() => {
    return credentials.value && credentials.value.uid && credentials.value.apiKey
  })

  const organizationCount = computed(() => organizations.value.length)

  // Initialize data on first use
  loadInitialData()

  return {
    // State
    credentials,
    organizations,
    settings,

    // Actions
    setCredentials,
    getCredentials,
    clearCredentials,
    addOrganization,
    removeOrganization,
    setOrganizationUrls,
    getOrganizationUrls,
    getOrganizationReplayUrl,
    setSetting,
    getSetting,
    clearAllData,
    loadInitialData,
    refreshFromStorage,

    // Computed
    hasCredentials,
    organizationCount,
  }
}
