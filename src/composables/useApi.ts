import { ref } from 'vue'
import { useAuth } from './useAuth'
import { useStorage } from './useStorage'
import { logger } from '../utils/logger'
import * as yaml from 'js-yaml'

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
}

// API client composable for LimaCharlie
export function useApi(baseUrl = 'https://api.limacharlie.io/v1') {
  const auth = useAuth()
  const _storage = useStorage()
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  // Generic request method
  const request = async (endpoint: string, options: RequestOptions = {}) => {
    const url = `${baseUrl}${endpoint}`
    // Making API request to the URL

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Clear previous error
    lastError.value = null

    // Generate fresh JWT for this request
    try {
      isLoading.value = true
      const jwt = await auth.generateFreshJWT()
      headers['Authorization'] = `Bearer ${jwt}`
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      lastError.value = `Failed to authenticate request: ${errorMessage}`
      throw new Error(lastError.value)
    }

    const config: RequestInit = {
      method: 'GET',
      ...options,
      headers,
    }

    try {
      const response = await fetch(url, config)

      // Handle authentication errors
      if (response.status === 401) {
        lastError.value = 'Authentication failed - please check your credentials'
        throw new Error(lastError.value)
      }

      if (!response.ok) {
        const errorText = await response.text()
        lastError.value = `API request failed: ${response.status} ${response.statusText} - ${errorText}`
        throw new Error(lastError.value)
      }

      return response
    } catch (error) {
      void error // API request failed
      if (!lastError.value) {
        lastError.value = error instanceof Error ? error.message : 'Unknown API error'
      }
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Convenience methods
  const get = async (endpoint: string, options: Omit<RequestOptions, 'method'> = {}) => {
    return request(endpoint, { ...options, method: 'GET' })
  }

  const post = async (
    endpoint: string,
    data: Record<string, unknown>,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ) => {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  const put = async (
    endpoint: string,
    data: Record<string, unknown>,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ) => {
    return request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  const del = async (endpoint: string, options: Omit<RequestOptions, 'method'> = {}) => {
    return request(endpoint, { ...options, method: 'DELETE' })
  }

  // JSON response helpers
  const getJson = async (endpoint: string, options?: Omit<RequestOptions, 'method'>) => {
    const response = await get(endpoint, options)
    return response.json()
  }

  const postJson = async (
    endpoint: string,
    data: Record<string, unknown>,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => {
    const response = await post(endpoint, data, options)
    return response.json()
  }

  const putJson = async (
    endpoint: string,
    data: Record<string, unknown>,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => {
    const response = await put(endpoint, data, options)
    return response.json()
  }

  // Test API connectivity
  const testConnection = async () => {
    try {
      await get('/orgs')
      return true
    } catch (error) {
      void error // API connection test failed
      return false
    }
  }

  // Test detection rule against sample telemetry
  const testDetectionRule = async (
    replayUrl: string,
    organizationId: string,
    detectLogic: Record<string, unknown> | string,
    respondLogic: Record<string, unknown> | string,
    sampleEvent: Record<string, unknown>,
  ) => {
    try {
      // Parse the detect and respond logic
      const detectRule = typeof detectLogic === 'string' ? yaml.load(detectLogic) : detectLogic
      const respondRule = typeof respondLogic === 'string' ? yaml.load(respondLogic) : respondLogic

      // Build the request payload matching Python SDK structure
      const payload = {
        oid: organizationId,
        rule_source: {
          rule_name: '', // Empty string as we're providing rule content
          namespace: '', // Empty string as we're providing rule content
          rule: {
            detect: detectRule,
            respond: respondRule || [],
          },
        },
        event_source: {
          stream: 'event',
          sensor_events: {
            sid: '', // Empty string for testing
            start_time: 0,
            end_time: 0,
            cursor: '',
          },
          events: [sampleEvent], // Specific event for testing
        },
        trace: true, // Enable trace for test debugging
        limit_event: 0,
        limit_eval: 0,
        is_dry_run: false,
      }

      // Generate fresh JWT for authentication
      const jwt = await auth.generateFreshJWT()

      // Make the request to the replay URL
      const response = await fetch(replayUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json, text/plain, */*',
          authorization: `Bearer ${jwt}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Detection test failed: ${response.status} ${response.statusText} - ${errorText}`,
        )
      }

      const result = await response.json()

      // Check if the response contains an error field (API can return 200 OK with errors)
      if (result.error) {
        throw new Error(`Detection test failed: ${result.error}`)
      }

      return result
    } catch (error) {
      void error // Detection rule test failed
      throw error
    }
  }

  // Get organization URLs (including replay URL)
  const getOrganizationUrls = async (organizationId: string) => {
    try {
      const response = await getJson(`/orgs/${organizationId}/url`)
      return response
    } catch (error) {
      void error // Failed to fetch organization URLs
      throw error
    }
  }

  // Backtest detection rule against historical telemetry data
  const backtestDetectionRule = async (
    replayUrl: string,
    organizationId: string,
    detectLogic: Record<string, unknown> | string,
    respondLogic: Record<string, unknown> | string,
    startTime: number,
    endTime: number,
    limitEvent: number = 0,
    limitEval: number = 0,
    abortController?: AbortController,
    timeoutMs: number = 30 * 60 * 1000, // Default 30 minutes
    isStateful?: boolean, // Deprecated - backend auto-detects stateful requirements
    isDryRun: boolean = false, // Default to actual execution
    cursor: string = '', // For pagination/chunked results
    sid: string = '', // Optional sensor ID for targeted testing
    isValidation: boolean = false, // Validate rule syntax only
    stream: string = 'event', // Data stream to replay
    selector: string = '', // Optional sensor selector expression for filtering
  ) => {
    try {
      // Parse the detect and respond logic
      const detectRule = typeof detectLogic === 'string' ? yaml.load(detectLogic) : detectLogic
      const respondRule = typeof respondLogic === 'string' ? yaml.load(respondLogic) : respondLogic

      // Build the request payload matching Python SDK structure
      const payload = {
        oid: organizationId,
        rule_source: {
          rule_name: '', // Empty string as we're providing rule content
          namespace: '', // Empty string as we're providing rule content
          rule: {
            detect: detectRule,
            respond: respondRule || [],
          },
        },
        event_source: {
          stream: stream, // Use provided stream (event, audit, detect)
          sensor_events: {
            sid: sid, // Use provided sensor ID or empty for org-wide
            start_time: startTime,
            end_time: endTime,
            cursor: cursor,
            selector: selector, // Use provided sensor selector expression or empty
          },
          events: null, // No specific events, scanning historical data
        },
        trace: false, // Set to false for performance on large datasets
        limit_event: limitEvent, // Use limits as provided by caller
        limit_eval: limitEval, // Use limits as provided by caller
        is_dry_run: isDryRun,
      }

      // Add is_validation if rule validation mode is enabled
      if (isValidation) {
        ;(payload as Record<string, unknown>).is_validation = true
      }

      // Don't send is_stateful - let backend auto-detect stateful requirements
      // per LimaCharlie team recommendation

      // Generate JWT for the specific organization
      const jwt = await auth.generateJWTForOrg(organizationId)

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Backtest timeout: Organization ${organizationId} exceeded ${timeoutMs / 1000}s limit`,
            ),
          )
        }, timeoutMs)
      })

      // Make the request to the replay URL with timeout
      const fetchPromise = fetch(replayUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json, text/plain, */*',
          authorization: `Bearer ${jwt}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortController?.signal,
      })

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise])

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Backtest failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()

      // Check if the response contains an error field (API can return 200 OK with errors)
      if (result.error) {
        throw new Error(`Backtest failed: ${result.error}`)
      }

      return result
    } catch (error) {
      // Don't log AbortError as an error - it's intentional cancellation
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error // Re-throw without logging
      }
      logger.error('Detection rule backtest failed:', error)
      throw error
    }
  }

  return {
    // State
    isLoading,
    lastError,

    // Methods
    request,
    get,
    post,
    put,
    delete: del,

    // JSON helpers
    getJson,
    postJson,
    putJson,

    // Utilities
    testConnection,
    testDetectionRule,
    getOrganizationUrls,
    backtestDetectionRule,
  }
}
