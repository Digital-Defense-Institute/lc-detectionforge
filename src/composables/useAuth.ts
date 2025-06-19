import { ref, computed } from 'vue'
import { useStorage } from './useStorage'

interface _Credentials {
  uid: string
  apiKey: string
}

// Global auth state (singleton pattern)
const currentToken = ref<string | null>(null)
const primaryOid = ref<string | null>(null) // The org used for JWT generation
const isAuthenticating = ref(false)
let isInitialized = false

// Authentication composable for LimaCharlie
export function useAuth() {
  const storage = useStorage()

  // Load initial state (only once)
  const loadInitialState = () => {
    if (isInitialized) return

    // JWTs are kept in memory only for security - no localStorage loading
    // Clean up any legacy JWT tokens that might be in localStorage
    localStorage.removeItem('lc_testbench_jwt')

    // Load primary OID from storage
    const storedPrimaryOid = storage.getSetting('primaryOid')
    if (storedPrimaryOid) {
      primaryOid.value = storedPrimaryOid
    }

    // Backward compatibility: migrate single selectedOid to primaryOid
    const legacyOid = storage.getSetting('selectedOid')
    if (legacyOid && !primaryOid.value) {
      primaryOid.value = legacyOid
      storage.setSetting('primaryOid', primaryOid.value)
      storage.setSetting('selectedOid', null) // Clear legacy setting
    }

    isInitialized = true
  }

  // Token management - JWTs are kept in memory only for security
  const setToken = (token: string) => {
    currentToken.value = token
    // No persistence to localStorage for security
  }

  const getToken = () => {
    return currentToken.value
  }

  const clearToken = () => {
    currentToken.value = null
    // No localStorage cleanup needed since JWTs are memory-only
  }

  // Organization selection (simplified)
  const setPrimaryOid = (oid: string) => {
    primaryOid.value = oid
    storage.setSetting('primaryOid', oid)
  }

  const clearPrimaryOid = () => {
    primaryOid.value = null
    storage.setSetting('primaryOid', null)
  }

  // Check if token is valid
  const isTokenValid = (token?: string) => {
    const checkToken = token || currentToken.value
    if (!checkToken) return false

    try {
      const payload = JSON.parse(atob(checkToken.split('.')[1]))
      return payload.exp * 1000 > Date.now()
    } catch (_e) {
      return false
    }
  }

  // Generate fresh JWT from stored credentials
  const generateFreshJWT = async () => {
    const credentials = storage.getCredentials()
    if (!credentials) {
      throw new Error('No stored credentials available')
    }

    if (!primaryOid.value) {
      throw new Error('No primary organization selected')
    }

    const currentOid = primaryOid.value
    try {
      isAuthenticating.value = true
      const url = `https://jwt.limacharlie.io?oid=${currentOid}&uid=${credentials.uid}&secret=${credentials.apiKey}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `JWT generation failed: ${response.status} ${response.statusText} - ${errorText}`,
        )
      }

      const data = await response.json()
      const jwt = data.jwt

      if (!jwt) {
        throw new Error('No JWT token received from server')
      }

      setToken(jwt)
      return jwt
    } catch (error) {
      throw error
    } finally {
      isAuthenticating.value = false
    }
  }

  // Generate JWT for a specific organization (without changing the stored token)
  const generateJWTForOrg = async (oid: string): Promise<string> => {
    const credentials = storage.getCredentials()
    if (!credentials) {
      throw new Error('No stored credentials available')
    }

    try {
      const url = `https://jwt.limacharlie.io?oid=${oid}&uid=${credentials.uid}&secret=${credentials.apiKey}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `JWT generation failed for ${oid}: ${response.status} ${response.statusText} - ${errorText}`,
        )
      }

      const data = await response.json()
      const jwt = data.jwt

      if (!jwt) {
        throw new Error(`No JWT token received from server for ${oid}`)
      }

      return jwt
    } catch (error) {
      throw error
    }
  }

  // Test credentials by generating a JWT
  const testCredentials = async (uid: string, apiKey: string, oid?: string) => {
    const targetOid = oid || primaryOid.value
    if (!targetOid) {
      throw new Error('No organization ID provided')
    }

    try {
      isAuthenticating.value = true
      const url = `https://jwt.limacharlie.io?oid=${targetOid}&uid=${uid}&secret=${apiKey}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Authentication failed: ${response.status} ${response.statusText} - ${errorText}`,
        )
      }

      const data = await response.json()
      const jwt = data.jwt

      if (!jwt) {
        throw new Error('No JWT token received from server')
      }

      return true
    } catch (error) {
      throw error
    } finally {
      isAuthenticating.value = false
    }
  }

  // Get authorization header
  const getAuthHeader = () => {
    const token = currentToken.value
    return token ? `Bearer ${token}` : null
  }

  // Computed properties
  const isAuthenticated = computed(() => {
    return currentToken.value && isTokenValid()
  })

  const hasCredentials = computed(() => {
    return storage.hasCredentials.value
  })

  const hasSelectedOrganization = computed(() => {
    return primaryOid.value !== null
  })

  const canAuthenticate = computed(() => {
    return hasCredentials.value && hasSelectedOrganization.value
  })

  const getOrgName = (oid: string): string => {
    const organizations = storage.organizations.value || []
    const org = organizations.find((o) => o.oid === oid)
    return org ? org.name : oid
  }

  // Method to reload auth state from storage (for after imports)
  const reloadFromStorage = () => {
    // Reset initialization flag to allow reloading
    isInitialized = false
    loadInitialState()

    // If we still don't have a primary org but have organizations, set the first one as primary
    if (!primaryOid.value) {
      const organizations = storage.organizations.value
      if (organizations && organizations.length > 0) {
        primaryOid.value = organizations[0].oid
        storage.setSetting('primaryOid', primaryOid.value)
      }
    }
  }

  // Initialize on first use
  loadInitialState()

  return {
    // State
    currentToken,
    primaryOid,
    isAuthenticating,

    // Actions
    setToken,
    getToken,
    clearToken,
    setPrimaryOid,
    clearPrimaryOid,
    generateFreshJWT,
    generateJWTForOrg,
    testCredentials,
    getAuthHeader,
    isTokenValid,
    getOrgName,
    reloadFromStorage,

    // Computed
    isAuthenticated,
    hasCredentials,
    hasSelectedOrganization,
    canAuthenticate,
  }
}
