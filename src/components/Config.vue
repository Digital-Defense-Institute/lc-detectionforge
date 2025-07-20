<template>
  <body class="config">
    <div class="container config">
      <div class="header config">
        <div class="header-left">
          <Logo variant="white" size="small" />
          <h1>Configuration</h1>
        </div>
        <div class="nav-links">
          <RouterLink to="/" class="nav-link">← Home</RouterLink>
          <RouterLink to="/workbench" class="nav-link">Detection Workbench</RouterLink>
          <ThemeToggle />
        </div>
      </div>

      <div class="section-header">
        <h2>Configuration Setup</h2>
        <p>
          Configure your LimaCharlie organizations and credentials to start testing API
          interactions. Your settings will be saved locally for future sessions.
        </p>
      </div>

      <!-- Authentication Section -->
      <div class="auth-section">
        <h3>Authentication</h3>
        <div v-if="authStatus" :class="['auth-status', authStatus.type]">
          {{ authStatus.message }}
        </div>

        <div class="info-text">
          The provided User ID (UID) and API Key must have access to all organizations you plan to
          configure below. Ensure your credentials have appropriate permissions for each
          organization.
          <br />
          <br />
          <strong>🔒 Security:</strong> Your credentials and JWTs are stored in memory only and
          automatically clear when you close the app/browser for enhanced security. JWT tokens will
          be generated fresh for each API call (tokens expire after 1 hour). Adding an organization
          will automatically validate your credentials.
        </div>

        <div class="credentials-form">
          <div class="input-group">
            <label for="uidInput">User ID (UID):</label>
            <input
              id="uidInput"
              v-model="uidInput"
              type="text"
              class="credential-input"
              placeholder="Enter User ID..."
            />
          </div>

          <div class="input-group">
            <label for="apiKeyInput">API Key:</label>
            <input
              id="apiKeyInput"
              v-model="apiKeyInput"
              type="password"
              class="credential-input"
              placeholder="Enter API Key..."
            />
          </div>

          <div class="button-group">
            <button
              class="btn btn-primary"
              :disabled="!uidInput.trim() || !apiKeyInput.trim()"
              @click="saveCredentials"
            >
              Save Credentials
            </button>
            <button class="btn btn-danger" :disabled="!hasCredentials" @click="clearCredentials">
              Clear Credentials
            </button>
          </div>
        </div>
      </div>

      <!-- Organization Management Section -->
      <div class="org-section">
        <h3>Organizations</h3>

        <div class="info-text">
          Enter the Organization ID (OID) and the organization name will be automatically fetched
          from the API. This process will validate that your credentials have access to each
          organization. Your configured User ID (UID) and API Key must have access to each
          organization you add here.
        </div>

        <div v-if="!hasCredentials" class="warning-text">
          <strong>🔒 Credentials Required:</strong> You must save your credentials above before you
          can add organizations or perform API operations.
        </div>

        <!-- Add status indicator for background URL fetching -->
        <div v-if="isFetchingMissingUrls" class="info-text fetching-urls">
          <strong>🔄 Fetching URLs:</strong> Automatically retrieving organization URLs for testing
          and backtesting...
        </div>

        <div class="org-input-group">
          <input
            v-model="newOid"
            type="text"
            placeholder="Organization ID (OID)"
            class="org-input"
            :disabled="!hasCredentials"
            @keyup.enter="addOrganization"
          />
          <button
            class="btn btn-small btn-primary"
            :disabled="!newOid.trim() || isAddingOrg || !hasCredentials"
            @click="addOrganization"
          >
            {{ isAddingOrg ? 'Adding...' : 'Add Organization' }}
          </button>
          <button
            class="btn btn-small btn-secondary"
            :disabled="!hasCredentials || isAddingOrg || isBulkImporting"
            @click="showBulkImportDialog = true"
          >
            📋 Bulk Import
          </button>
        </div>

        <div class="org-list">
          <div v-if="organizations.length === 0" class="empty-state">No organizations saved</div>
          <div v-for="org in organizations" :key="org.oid" class="org-item">
            <div class="org-info">
              <div class="org-name">
                {{ org.name }}
                <!-- Add indicator for organizations without URLs -->
                <span
                  v-if="!organizationHasUrls(org.oid)"
                  class="missing-urls-indicator"
                  title="URLs not yet fetched"
                >
                  ⚠️
                </span>
              </div>
              <div class="org-id">{{ org.oid }}</div>
            </div>
            <div class="org-actions">
              <button
                class="btn btn-small btn-danger"
                :disabled="!hasCredentials"
                @click="removeOrganization(org.oid)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk Import Dialog -->
      <div v-if="showBulkImportDialog" class="modal-overlay" @click="closeBulkImportDialog">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Bulk Import Organizations</h3>
            <button class="close-btn" @click="closeBulkImportDialog">×</button>
          </div>

          <div class="modal-body">
            <div class="info-text">
              Enter one Organization ID (OID) per line. Each organization will be validated and
              added to your configuration.
            </div>

            <textarea
              v-model="bulkOidInput"
              placeholder="Enter Organization IDs, one per line:&#10;&#10;oid1&#10;oid2&#10;oid3"
              class="bulk-input"
              rows="8"
              :disabled="isBulkImporting"
            ></textarea>

            <div class="button-group">
              <button
                class="btn btn-primary"
                :disabled="!bulkOidInput.trim() || isBulkImporting"
                @click="bulkImportOrganizations"
              >
                {{ isBulkImporting ? 'Importing...' : 'Import Organizations' }}
              </button>
              <button
                class="btn btn-secondary"
                :disabled="isBulkImporting"
                @click="closeBulkImportDialog"
              >
                Cancel
              </button>
            </div>

            <!-- Bulk Import Results -->
            <div v-if="bulkImportResults" class="import-results">
              <h4>{{ isBulkImporting ? 'Import Progress' : 'Import Results' }}</h4>
              
              <!-- Progress indicator -->
              <div v-if="isBulkImporting" class="import-progress">
                <div class="progress-text">
                  Processing: {{ bulkImportResults.processed }} / {{ bulkImportResults.total }} organizations
                </div>
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: `${(bulkImportResults.processed / bulkImportResults.total) * 100}%` }"
                  ></div>
                </div>
              </div>
              
              <div class="import-summary">
                <div class="success-count">
                  ✅ Success: {{ bulkImportResults.success }}
                  <span v-if="isBulkImporting" class="count-detail">/ {{ bulkImportResults.total }}</span>
                </div>
                <div v-if="bulkImportResults.failed > 0" class="failed-count">
                  ❌ Failed: {{ bulkImportResults.failed }}
                </div>
              </div>

              <div v-if="bulkImportResults.errors.length > 0" class="import-errors">
                <h5>Errors:</h5>
                <ul>
                  <li v-for="error in bulkImportResults.errors" :key="error">{{ error }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- API Testing Section -->
      <div class="auth-section">
        <h3>API Testing</h3>
        <div class="info-text">
          Test your API connectivity across all configured organizations. Each organization will be
          tested individually with a fresh JWT token. This will also fetch and validate
          datacenter-specific URLs needed for backtesting and replay functionality.
        </div>

        <div class="button-group">
          <button
            :disabled="organizations.length === 0 || isTestingApi || !hasCredentials"
            :class="['btn', 'btn-primary', { 'btn-testing': isTestingApi }]"
            @click="testApiCall"
          >
            {{
              isTestingApi
                ? `Testing APIs for ${organizations.length} Organization${organizations.length !== 1 ? 's' : ''}...`
                : `Test API for ${organizations.length} Organization${organizations.length !== 1 ? 's' : ''}`
            }}
          </button>
          <div v-if="apiResults.length > 0" class="inline-results-summary">
            <span class="success-count"
              >✅ {{ apiResults.filter((r) => r.status === 'Success').length }} Successful</span
            >
            <span
              v-if="apiResults.filter((r) => r.status === 'Failed').length > 0"
              class="failed-count"
            >
              ❌ {{ apiResults.filter((r) => r.status === 'Failed').length }} Failed
            </span>
          </div>
        </div>

        <div v-if="apiResults.length > 0" id="results" class="api-results">
          <h4>API Test Results</h4>
          <div
            v-for="(result, index) in apiResults"
            :key="index"
            :class="['api-result', { error: result.error, success: result.status === 'Success' }]"
          >
            <div class="result-header" @click="toggleResultExpansion(index)">
              <strong>{{ result.name }}</strong
              >:
              <span :class="['status', result.status.toLowerCase()]">{{ result.status }}</span>
              <span class="expand-icon">{{ result.expanded ? '▼' : '▶' }}</span>
            </div>
            <div v-if="result.expanded" class="result-details">
              <div v-if="result.data" class="data-controls">
                <button
                  class="btn btn-small btn-secondary toggle-view-btn"
                  @click="toggleDataView(index)"
                >
                  {{ result.showRawData ? '📊 Formatted View' : '🔧 Raw JSON' }}
                </button>
              </div>
              <div v-if="result.data && !result.showRawData" class="formatted-data">
                <div v-for="(value, key) in formatApiData(result.data)" :key="key" class="data-row">
                  <span class="data-key">{{ key }}:</span>
                  <span class="data-value" :class="getValueClass(value)">{{ value }}</span>
                </div>
              </div>
              <pre v-if="result.data && result.showRawData" class="raw-data">{{
                JSON.stringify(result.data, null, 2)
              }}</pre>
              <div v-if="result.error" class="error-message">Error: {{ result.error }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuration Management Section -->
      <div class="config-section">
        <h3>Configuration Management</h3>

        <div class="info-text">
          Export your entire workbench configuration for backup or sharing, or import a previously
          saved configuration. This includes organizations, settings, detection rules, and drafts
          (credentials are never exported for security).
        </div>

        <!-- Configuration Summary -->
        <div class="config-summary">
          <h4>Current Configuration</h4>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-number">{{ configSummary.organizations }}</span>
              <span class="stat-label">Organizations</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ configSummary.rules }}</span>
              <span class="stat-label">Detection Rules</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ configSummary.settings }}</span>
              <span class="stat-label">Settings</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ configSummary.drafts }}</span>
              <span class="stat-label">Drafts</span>
            </div>
          </div>
        </div>

        <!-- Export Section -->
        <div class="config-actions-section">
          <h4>Export Configuration</h4>
          <div class="button-group export-button-group">
            <button
              class="btn btn-primary"
              :disabled="isExporting || configSummary.totalKeys === 0"
              @click="exportConfig"
            >
              {{ isExporting ? 'Exporting...' : '📦 Export & Download Configuration' }}
            </button>
          </div>
        </div>

        <!-- Import Section -->
        <div class="config-actions-section">
          <h4>Import Configuration</h4>
          <div class="import-controls">
            <div class="file-input-group">
              <input
                ref="configFileInput"
                type="file"
                accept=".json"
                style="display: none"
                @change="handleConfigFileSelected"
              />
              <button class="btn btn-secondary" :disabled="isImporting" @click="selectConfigFile">
                📁 Select Configuration File
              </button>
              <span v-if="selectedConfigFile" class="selected-file">
                {{ selectedConfigFile.name }}
              </span>
            </div>

            <div class="import-options">
              <label class="checkbox-label">
                <input v-model="importOptions.overwrite" type="checkbox" />
                Overwrite existing items
              </label>
              <label class="checkbox-label">
                <input v-model="importOptions.backup" type="checkbox" />
                Create backup before import
              </label>
            </div>

            <div class="button-group">
              <button
                class="btn btn-primary"
                :disabled="!selectedConfigFile || isImporting"
                @click="importConfig"
              >
                {{ isImporting ? 'Importing...' : '📥 Import Configuration' }}
              </button>
              <button
                v-if="configSummary.totalKeys > 0"
                class="btn btn-warning"
                :disabled="isImporting || configSummary.totalKeys === 0"
                @click="clearAllConfig"
              >
                🗑️ Clear All Configuration
              </button>
            </div>
          </div>
        </div>

        <!-- Import Results -->
        <div v-if="lastImportResult" class="import-results">
          <h4>Last Import Results</h4>
          <div :class="['import-status', lastImportResult.success ? 'success' : 'error']">
            {{ lastImportResult.success ? '✅ Import Successful' : '❌ Import Failed' }}
          </div>

          <div v-if="lastImportResult.success" class="import-summary">
            <div class="imported-items">
              <div>Organizations: {{ lastImportResult.imported.organizations }}</div>
              <div>Settings: {{ lastImportResult.imported.settings }}</div>
              <div>Detection Rules: {{ lastImportResult.imported.detectionRules }}</div>
              <div>Drafts: {{ lastImportResult.imported.drafts }}</div>
            </div>
          </div>

          <div v-if="lastImportResult.warnings.length > 0" class="import-warnings">
            <h5>Warnings:</h5>
            <ul>
              <li v-for="warning in lastImportResult.warnings" :key="warning">{{ warning }}</li>
            </ul>
          </div>

          <div v-if="lastImportResult.errors.length > 0" class="import-errors">
            <h5>Errors:</h5>
            <ul>
              <li v-for="error in lastImportResult.errors" :key="error">{{ error }}</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>
          Made with <span class="heart">💙</span> by
          <a href="https://digitaldefenseinstitute.com" target="_blank"
            >Digital Defense Institute</a
          >
          •
          <a href="https://github.com/Digital-Defense-Institute/lc-detectionforge" target="_blank"
            >Open Source on GitHub</a
          >
          • <RouterLink to="/changelog" class="version-link">v{{ currentVersion }}</RouterLink>
        </p>
      </div>
    </div>
  </body>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useStorage } from '../composables/useStorage'
import { useAuth } from '../composables/useAuth'
import { useApi } from '../composables/useApi'
import { useAppStore } from '../stores/app'
import { useConfigManager } from '../composables/useConfigManager'
import { logger } from '../utils/logger'
import { getCurrentVersion } from '../utils/version'
import Logo from './Logo.vue'
import ThemeToggle from './ThemeToggle.vue'

// Initialize composables
const storage = useStorage()
const auth = useAuth()
const api = useApi()
const appStore = useAppStore()
const configManager = useConfigManager()
const currentVersion = getCurrentVersion()

// Reactive form data
const newOid = ref('')
const uidInput = ref('')
const apiKeyInput = ref('')
const orgUrls = ref<{ url?: string } | null>(null)
const fetchingOrgUrls = ref(false)
const isAddingOrg = ref(false)
const isFetchingMissingUrls = ref(false)
const isTestingApi = ref(false)

// Bulk import state
const showBulkImportDialog = ref(false)
const bulkOidInput = ref('')
const isBulkImporting = ref(false)
const bulkImportResults = ref<{
  total: number
  processed: number
  success: number
  failed: number
  errors: string[]
} | null>(null)

// Auth status for display
const authStatus = ref<{ type: string; message: string } | null>(null)

// API test results
const apiResults = ref<
  Array<{
    name: string
    status: string
    data?: Record<string, unknown>
    error?: string
    expanded?: boolean
    showRawData?: boolean
  }>
>([])

// Configuration manager state
const selectedConfigFile = ref<File | null>(null)
const configFileInput = ref<HTMLInputElement>()
const importOptions = ref({
  overwrite: false,
  backup: true,
})

// Last import result for display
const lastImportResult = ref<{
  success: boolean
  imported: {
    organizations: number
    settings: number
    detectionRules: number
    drafts: number
  }
  warnings: string[]
  errors: string[]
} | null>(null)

// Destructure reactive properties from composables
const { credentials, organizations, hasCredentials, settings: _settings } = storage
const { isAuthenticated: _isAuthenticated, canAuthenticate: _canAuthenticate } = auth
const { lastError: _lastError } = api
const {
  isExporting,
  isImporting,
  exportConfiguration: _exportConfiguration,
  importConfiguration,
  downloadConfiguration,
  getConfigurationSummary,
  clearAllConfiguration,
} = configManager

// Computed properties
const configSummary = getConfigurationSummary // This is now a computed ref, not a function

// Helper function to get org name by OID
const _getOrgName = (oid: string) => {
  const org = organizations.value.find((o) => o.oid === oid)
  return org ? org.name : oid
}

// Helper function to check if organization has URLs
const organizationHasUrls = (oid: string): boolean => {
  const storedUrls = storage.getOrganizationUrls(oid)
  const replayUrl = storage.getOrganizationReplayUrl(oid)
  return !!(storedUrls && replayUrl)
}

// Function to fetch URLs for organizations that don't have them
const fetchMissingOrganizationUrls = async (): Promise<void> => {
  const credentials = storage.getCredentials()
  if (!credentials || !hasCredentials.value) {
    return
  }

  const orgsWithoutUrls = organizations.value.filter((org) => !organizationHasUrls(org.oid))

  if (orgsWithoutUrls.length === 0) {
    return
  }

  isFetchingMissingUrls.value = true

  try {
    for (const org of orgsWithoutUrls) {
      try {
        await fetchOrganizationUrls(org.oid)
      } catch (error) {
        logger.error(`Failed to fetch URLs for ${org.oid}:`, error)
        // Continue with other organizations even if one fails
      }
    }

    const successCount = orgsWithoutUrls.filter((org) => organizationHasUrls(org.oid)).length

    if (successCount > 0) {
      // Only show notification if significant number of URLs were fetched
      if (successCount >= 3) {
        appStore.addNotification(
          'success',
          `Automatically fetched URLs for ${successCount} organization(s)`,
        )
      }
    }
  } catch (error) {
    logger.error('Failed to fetch missing organization URLs:', error)
  } finally {
    isFetchingMissingUrls.value = false
  }
}

// Helper functions for formatting API data
const formatApiData = (data: Record<string, unknown>): Record<string, string> => {
  const formatted: Record<string, string> = {}

  // Define preferred order for common organization fields
  const fieldOrder = [
    'name',
    'oid',
    'site_name',
    'sensor_quota',
    'sensor_version',
    'n_installation_keys',
    'n_outputs',
    'n_rules',
    'latest_versions',
  ]

  // Helper function to format values
  const formatValue = (value: unknown, key: string): string => {
    if (value === null || value === undefined) {
      return 'N/A'
    }

    if (typeof value === 'object') {
      // Handle nested objects (like latest_versions)
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return '[]'
        }
        return `[${value.length} item${value.length !== 1 ? 's' : ''}]`
      } else {
        const obj = value as Record<string, unknown>
        const entries = Object.entries(obj)
        if (entries.length === 0) {
          return '{}'
        }

        // For objects with few entries, show them inline
        if (entries.length <= 3) {
          return entries.map(([k, v]) => `${k}: ${formatValue(v, k)}`).join(', ')
        } else {
          // For larger objects, show a summary
          return `{${entries.length} properties}`
        }
      }
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }

    if (typeof value === 'number') {
      // Format certain numeric fields with context
      if (key.includes('quota') || key.includes('count') || key.startsWith('n_')) {
        return value.toLocaleString()
      }
      // Handle timestamps - display in UTC
      if (key.includes('time') || key.includes('date') || key.includes('timestamp')) {
        if (value > 1000000000 && value < 9999999999) {
          // Looks like a Unix timestamp
          return new Date(value * 1000).toISOString()
        } else if (value > 1000000000000 && value < 9999999999999) {
          // Looks like a millisecond timestamp
          return new Date(value).toISOString()
        }
      }
      return value.toString()
    }

    const strValue = String(value)

    // Handle common patterns
    if (strValue.includes('@') && strValue.includes('.')) {
      // Looks like an email
      return strValue
    }

    // Handle URLs
    if (strValue.startsWith('http://') || strValue.startsWith('https://')) {
      // Truncate very long URLs for display
      return strValue.length > 50 ? strValue.substring(0, 47) + '...' : strValue
    }

    // Handle UUIDs and similar identifiers
    if (/^[0-9a-f-]{36}$/i.test(strValue)) {
      return strValue // UUIDs are already well-formatted
    }

    // Truncate very long strings
    if (strValue.length > 100) {
      return strValue.substring(0, 97) + '...'
    }

    return strValue
  }

  // Helper function to format field names for display
  const formatFieldName = (key: string): string => {
    // Handle common abbreviations and technical terms
    const replacements: Record<string, string> = {
      oid: 'Organization ID',
      n_installation_keys: 'Installation Keys',
      n_outputs: 'Outputs',
      n_rules: 'Rules',
      sensor_quota: 'Sensor Quota',
      sensor_version: 'Sensor Version',
      site_name: 'Site',
      latest_versions: 'Latest Versions',
    }

    if (replacements[key]) {
      return replacements[key]
    }

    // Convert snake_case to Title Case
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Add fields in preferred order first
  fieldOrder.forEach((key) => {
    if (key in data) {
      formatted[formatFieldName(key)] = formatValue(data[key], key)
    }
  })

  // Add any remaining fields not in the preferred order
  Object.entries(data).forEach(([key, value]) => {
    const formattedKey = formatFieldName(key)
    if (!(formattedKey in formatted)) {
      formatted[formattedKey] = formatValue(value, key)
    }
  })

  return formatted
}

const getValueClass = (value: string): string => {
  if (value === 'N/A' || value === '0' || value === 'No') {
    return 'value-neutral'
  }
  if (value === 'Yes' || value.includes('✅')) {
    return 'value-positive'
  }
  if (value.includes('❌') || value.toLowerCase().includes('error')) {
    return 'value-negative'
  }
  return 'value-default'
}

// Organization management
const addOrganization = async () => {
  const oid = newOid.value.trim()

  if (!oid) {
    appStore.addNotification('error', 'Please enter an Organization ID')
    return
  }

  // Check if organization already exists
  if (organizations.value.some((org) => org.oid === oid)) {
    appStore.addNotification('warning', 'Organization already exists')
    return
  }

  // Check if we have credentials
  const credentials = storage.getCredentials()
  if (!credentials) {
    appStore.addNotification('error', 'Please save credentials first before adding organizations')
    return
  }

  // Show starting notification
  appStore.addNotification('info', `Adding organization ${oid}...`)

  isAddingOrg.value = true

  try {
    // Generate JWT for this organization
    const jwt = await generateJWTForOrg(oid)

    // Fetch organization info from API
    const response = await fetch(`https://api.limacharlie.io/v1/orgs/${oid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch organization info: ${response.status} ${response.statusText}`,
      )
    }

    const orgData = await response.json()
    const orgName = orgData.name || `Unknown Organization`

    // Add organization to storage with fetched name
    storage.addOrganization(oid, orgName)

    // Set as primary if this is the first organization
    if (!auth.primaryOid.value) {
      auth.setPrimaryOid(oid)
    }

    appStore.addNotification('success', `Organization "${orgName}" added successfully!`)

    // Fetch and store organization URLs for use by other components
    await fetchOrganizationUrls(oid)

    // Clear form
    newOid.value = ''
  } catch (error) {
    void error // Failed to add organization
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    appStore.addNotification('error', `Failed to add organization: ${errorMessage}`)
  } finally {
    isAddingOrg.value = false
  }
}

const fetchOrganizationUrls = async (oid: string) => {
  try {
    fetchingOrgUrls.value = true

    const urls = await api.getOrganizationUrls(oid)
    orgUrls.value = urls

    // Store the URLs for this specific organization
    if (urls.url) {
      storage.setOrganizationUrls(oid, urls)
    }
  } catch (error) {
    logger.error('Failed to fetch organization URLs:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    appStore.addNotification('error', `Failed to fetch organization URLs: ${errorMessage}`)
    orgUrls.value = null

    // Clear stored URLs on error for this organization
    storage.setOrganizationUrls(oid, null)
  } finally {
    fetchingOrgUrls.value = false
  }
}

const removeOrganization = (oid: string) => {
  // Clear API test results when organization is removed
  apiResults.value = []

  // Remove from storage
  storage.removeOrganization(oid)

  // Update primary OID if this was the primary org
  if (auth.primaryOid.value === oid) {
    const remainingOrgs = storage.organizations.value
    if (remainingOrgs.length > 0) {
      auth.setPrimaryOid(remainingOrgs[0].oid)
    } else {
      auth.clearPrimaryOid()
    }
  }
}

// Bulk import organizations
const bulkImportOrganizations = async () => {
  if (!bulkOidInput.value.trim()) {
    appStore.addNotification('error', 'Please enter organization IDs')
    return
  }

  // Check if we have credentials
  const credentials = storage.getCredentials()
  if (!credentials) {
    appStore.addNotification('error', 'Please save credentials first before adding organizations')
    return
  }

  isBulkImporting.value = true
  bulkImportResults.value = { total: 0, processed: 0, success: 0, failed: 0, errors: [] }

  try {
    // Split by newlines and clean up the OIDs
    const oids = bulkOidInput.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((oid) => !organizations.value.some((org) => org.oid === oid)) // Skip duplicates

    if (oids.length === 0) {
      appStore.addNotification('warning', 'No new organization IDs found')
      return
    }

    // Set the total count
    bulkImportResults.value.total = oids.length

    appStore.addNotification('info', `Importing ${oids.length} organization(s)...`)

    // Import each OID
    for (const oid of oids) {
      try {
        // Generate JWT for this organization (same as addOrganization)
        const jwt = await generateJWTForOrg(oid)

        // Fetch organization info from API (same as addOrganization)
        const response = await fetch(`https://api.limacharlie.io/v1/orgs/${oid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
        })

        if (!response.ok) {
          throw new Error(
            `Failed to fetch organization info: ${response.status} ${response.statusText}`,
          )
        }

        const orgData = await response.json()
        const orgName = orgData.name || `Unknown Organization`

        // Add organization to storage with fetched name
        storage.addOrganization(oid, orgName)

        // Set as primary if this is the first organization
        if (!auth.primaryOid.value) {
          auth.setPrimaryOid(oid)
        }

        // Fetch and store organization URLs for use by other components
        await fetchOrganizationUrls(oid)

        bulkImportResults.value!.success++
      } catch (error) {
        logger.error(`Failed to import organization ${oid}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        bulkImportResults.value!.failed++
        bulkImportResults.value!.errors.push(`${oid}: ${errorMessage}`)
      } finally {
        // Always increment processed count
        bulkImportResults.value!.processed++
      }
    }

    // Show results
    const { success, failed } = bulkImportResults.value!
    if (success > 0 && failed === 0) {
      appStore.addNotification('success', `Successfully imported ${success} organization(s)!`)
    } else if (success > 0 && failed > 0) {
      appStore.addNotification('warning', `Imported ${success} organization(s), ${failed} failed`)
    } else {
      appStore.addNotification('error', `Failed to import all ${failed} organization(s)`)
    }
  } catch (error) {
    logger.error('Bulk import failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    appStore.addNotification('error', `Bulk import failed: ${errorMessage}`)
  } finally {
    isBulkImporting.value = false
  }
}

const closeBulkImportDialog = () => {
  showBulkImportDialog.value = false
  bulkOidInput.value = ''
  bulkImportResults.value = null
}

// Credential management
const saveCredentials = () => {
  const uid = uidInput.value.trim()
  const apiKey = apiKeyInput.value.trim()

  if (!uid || !apiKey) {
    appStore.addNotification('error', 'Please enter both UID and API Key')
    return
  }

  storage.setCredentials(uid, apiKey)
  appStore.addNotification(
    'success',
    'Credentials saved in memory - will clear when app closes for security!',
  )
  updateAuthStatus()
}

const clearCredentials = () => {
  storage.clearCredentials()
  auth.clearToken()
  uidInput.value = ''
  apiKeyInput.value = ''
  authStatus.value = null
  appStore.addNotification('warning', 'Credentials cleared')
  updateAuthStatus()
}

// API testing
const testApiCall = async () => {
  isTestingApi.value = true

  try {
    // Verify we have organizations
    if (organizations.value.length === 0) {
      throw new Error('No organizations configured')
    }

    // Show starting notification
    appStore.addNotification(
      'info',
      `Starting API tests for ${organizations.value.length} organization(s)...`,
    )

    // Clear previous results
    apiResults.value = []

    // Test each organization
    for (const org of organizations.value) {
      try {
        // Generate JWT for this specific organization
        const jwt = await generateJWTForOrg(org.oid)

        // Make API call with the JWT for this organization
        const response = await fetch(`https://api.limacharlie.io/v1/orgs/${org.oid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
        })

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // Also fetch organization URLs if not already cached
        let urlData = null
        try {
          await fetchOrganizationUrls(org.oid)
          const storedUrls = storage.getOrganizationUrls(org.oid)
          const replayUrl = storage.getOrganizationReplayUrl(org.oid)

          if (storedUrls || replayUrl) {
            const urlObj =
              storedUrls && typeof storedUrls === 'object' && storedUrls !== null
                ? (storedUrls as { url?: { api?: string; [key: string]: unknown } })
                : null
            urlData = {
              replayUrl: replayUrl || 'Not available',
              apiUrl: urlObj?.url?.api || 'Not available',
              datacenterUrls: urlObj?.url || 'Not available',
            }
          }
        } catch (urlError) {
          logger.error(`Failed to fetch URLs for ${org.oid}:`, urlError)
          urlData = {
            replayUrl: 'Failed to fetch',
            apiUrl: 'Failed to fetch',
            datacenterUrls: 'Failed to fetch',
          }
        }

        // Merge organization data with URL data
        const combinedData = {
          ...data,
          ...(urlData && { urls: urlData }),
        }

        apiResults.value.push({
          name: `${org.name} (${org.oid})`,
          status: 'Success',
          data: combinedData,
          expanded: false,
          showRawData: false,
        })
      } catch (error) {
        logger.error(`API test failed for ${org.oid}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        apiResults.value.push({
          name: `${org.name} (${org.oid})`,
          status: 'Failed',
          error: errorMessage,
          expanded: false,
          showRawData: false,
        })
      }
    }

    // Summary notification
    const successCount = apiResults.value.filter((r) => r.status === 'Success').length
    const failedCount = apiResults.value.filter((r) => r.status === 'Failed').length

    if (failedCount === 0) {
      appStore.addNotification(
        'success',
        `API calls successful for all ${successCount} organizations!`,
      )
    } else if (successCount === 0) {
      appStore.addNotification('error', `API calls failed for all ${failedCount} organizations`)
    } else {
      appStore.addNotification(
        'warning',
        `API calls: ${successCount} succeeded, ${failedCount} failed`,
      )
    }
  } catch (error) {
    logger.error('API test failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    apiResults.value = [
      {
        name: 'API Test',
        status: 'Failed',
        error: errorMessage,
        expanded: false,
        showRawData: false,
      },
    ]
    appStore.addNotification('error', `API test failed: ${errorMessage}`)
  } finally {
    isTestingApi.value = false
  }
}

// Helper function to generate JWT for a specific organization
const generateJWTForOrg = async (oid: string) => {
  // Get fresh credentials from storage to avoid stale references
  const credentials = storage.getCredentials()
  if (!credentials) {
    throw new Error('No stored credentials available')
  }

  // Double-check that we have the required fields
  if (!credentials.uid || !credentials.apiKey) {
    throw new Error('Incomplete credentials - missing UID or API Key')
  }

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
}

// Configuration management functions
const exportConfig = async () => {
  if (isExporting.value) return

  // Show starting notification
  appStore.addNotification('info', 'Exporting configuration...')

  try {
    await downloadConfiguration(`detectionforge-config-${Date.now()}.json`)
    appStore.addNotification('success', 'Configuration exported successfully')
  } catch (error) {
    logger.error('Export failed:', error)
    appStore.addNotification(
      'error',
      `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

const selectConfigFile = () => {
  configFileInput.value?.click()
}

const handleConfigFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedConfigFile.value = target.files[0]
  }
}

const importConfig = async () => {
  if (!selectedConfigFile.value || isImporting.value) return

  // Show starting notification
  appStore.addNotification(
    'info',
    `Importing configuration from ${selectedConfigFile.value.name}...`,
  )

  try {
    const fileContent = await selectedConfigFile.value.text()
    const result = await importConfiguration(fileContent, importOptions.value)
    lastImportResult.value = result

    if (result.success) {
      // Refresh all reactive state to reflect imported items
      storage.refreshFromStorage()
      auth.reloadFromStorage() // Reload auth state to set primary organization
      loadSavedCredentials()
      updateAuthStatus()

      // Clear any cached API results since organizations may have changed
      apiResults.value = []

      // Reset the file input
      selectedConfigFile.value = null
      if (configFileInput.value) {
        configFileInput.value.value = ''
      }

      // Automatically fetch URLs for any imported organizations that don't have them
      setTimeout(() => {
        fetchMissingOrganizationUrls()
      }, 500) // Small delay to ensure storage is fully updated

      appStore.addNotification('success', 'Configuration imported successfully')
    } else {
      appStore.addNotification('error', 'Configuration import failed - see details below')
    }
  } catch (error) {
    logger.error('Import failed:', error)
    lastImportResult.value = {
      success: false,
      imported: { organizations: 0, settings: 0, detectionRules: 0, drafts: 0 },
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: [],
    }
    appStore.addNotification('error', 'Configuration import failed')
  }
}

const clearAllConfig = async () => {
  if (
    !confirm(
      'Are you sure you want to clear ALL configuration data? This action cannot be undone. A backup will be downloaded first.',
    )
  ) {
    return
  }

  try {
    await clearAllConfiguration(true)

    // Refresh all reactive state instead of reloading the page
    storage.refreshFromStorage()
    loadSavedCredentials()
    updateAuthStatus()

    // Clear any cached data
    apiResults.value = []
    selectedConfigFile.value = null
    lastImportResult.value = null

    // Clear form inputs
    newOid.value = ''
    uidInput.value = ''
    apiKeyInput.value = ''

    appStore.addNotification('success', 'All configuration cleared successfully')
  } catch (error) {
    logger.error('Clear configuration failed:', error)
    appStore.addNotification('error', 'Failed to clear configuration')
  }
}

// Load saved organization URLs
const loadSavedOrgUrls = () => {
  const savedUrls = storage.getSetting('orgUrls')
  if (savedUrls) {
    orgUrls.value = { url: savedUrls }
  }
}

// Update auth status display
const updateAuthStatus = () => {
  if (hasCredentials.value && organizations.value.length > 0) {
    authStatus.value = { type: 'success', message: 'Ready to authenticate' }
  } else if (hasCredentials.value) {
    authStatus.value = { type: 'loading', message: 'Credentials saved, please add organizations' }
  } else {
    authStatus.value = null
  }
}

// Load saved credentials into form
const loadSavedCredentials = () => {
  if (credentials.value) {
    uidInput.value = credentials.value.uid || ''
    apiKeyInput.value = credentials.value.apiKey || ''
  }
}

// Watch for changes to update auth status
watch([hasCredentials, organizations], updateAuthStatus)

// Watch for changes to credentials and organizations to auto-fetch missing URLs
watch([hasCredentials, organizations], async () => {
  updateAuthStatus()

  // If we now have credentials and organizations, check for missing URLs
  if (hasCredentials.value && organizations.value.length > 0) {
    // Small delay to avoid rapid successive calls
    setTimeout(() => {
      fetchMissingOrganizationUrls()
    }, 500)
  }
})

// Initialize on mount
onMounted(async () => {
  loadSavedCredentials()
  loadSavedOrgUrls()
  updateAuthStatus()
  appStore.initialize()

  // Automatically fetch URLs for organizations that don't have them
  // Wait a bit for everything to initialize
  setTimeout(() => {
    fetchMissingOrganizationUrls()
  }, 1000)
})

// Toggle expansion of API test results
const toggleResultExpansion = (index: number) => {
  if (apiResults.value[index]) {
    apiResults.value[index].expanded = !apiResults.value[index].expanded
  }
}

// Toggle between formatted and raw data view
const toggleDataView = (index: number) => {
  if (apiResults.value[index]) {
    apiResults.value[index].showRawData = !apiResults.value[index].showRawData
  }
}
</script>
