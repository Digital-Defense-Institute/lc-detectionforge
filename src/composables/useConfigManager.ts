import { ref, computed } from 'vue'
import { useStorage } from './useStorage'
import { useAppStore } from '../stores/app'
import { getCurrentVersion } from '../utils/version'

interface ConfigurationExport {
  version: string
  exportDate: string
  appVersion: string
  data: {
    organizations: Record<string, unknown>[]
    settings: Record<string, unknown>
    detectionRules: Record<string, unknown>[]
    drafts: Record<string, Record<string, unknown>>
    metadata: {
      totalItems: number
      storageKeys: string[]
    }
  }
}

interface ImportResult {
  success: boolean
  imported: {
    organizations: number
    settings: number
    detectionRules: number
    drafts: number
  }
  errors: string[]
  warnings: string[]
}

// Configuration management composable
export function useConfigManager() {
  const storage = useStorage()
  const appStore = useAppStore()
  const isExporting = ref(false)
  const isImporting = ref(false)

  // Get reactive organizations and settings from storage
  const { organizations, settings } = storage

  // Storage prefix constant
  const STORAGE_PREFIX = 'detectionforge_'

  // Current configuration format version
  const CONFIG_VERSION = '1.0.0'

  // Known storage key patterns (for current and future items)
  const _STORAGE_PATTERNS = [
    'organizations',
    'setting_*', // Wildcard for all settings
    'detection_rules',
    'detection_draft', // Changed from 'detection_workbench_draft'
    'credentials', // Though this won't be exported for security
    'jwt', // This won't be exported for security
  ]

  // Security exclusions - these should never be exported
  const SECURITY_EXCLUSIONS = ['credentials', 'jwt', 'api_key', 'secret', 'password', 'token']

  /**
   * Get all DetectionForge localStorage keys
   */
  const getAllDetectionForgeKeys = (): string[] => {
    const keys: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keys.push(key)
      }
    }

    return keys.sort()
  }

  /**
   * Check if a key should be excluded for security reasons
   */
  const isSecurityExclusion = (key: string): boolean => {
    const keyLower = key.toLowerCase()
    return SECURITY_EXCLUSIONS.some((exclusion) => keyLower.includes(exclusion))
  }

  /**
   * Get the logical name of a storage key (without prefix)
   */
  const getLogicalKeyName = (fullKey: string): string => {
    return fullKey.startsWith(STORAGE_PREFIX) ? fullKey.substring(STORAGE_PREFIX.length) : fullKey
  }

  /**
   * Export all configuration data
   */
  const exportConfiguration = async (): Promise<string> => {
    try {
      isExporting.value = true

      const allKeys = getAllDetectionForgeKeys()
      const exportData: ConfigurationExport = {
        version: CONFIG_VERSION,
        exportDate: new Date().toISOString(),
        appVersion: getCurrentVersion(),
        data: {
          organizations: [],
          settings: {},
          detectionRules: [],
          drafts: {},
          metadata: {
            totalItems: 0,
            storageKeys: [],
          },
        },
      }

      let itemCount = 0
      const processedKeys: string[] = []

      for (const fullKey of allKeys) {
        // Skip security-sensitive items
        if (isSecurityExclusion(fullKey)) {
          // Skipping security-sensitive key
          continue
        }

        const logicalKey = getLogicalKeyName(fullKey)
        const value = localStorage.getItem(fullKey)

        if (value === null) continue

        let parsedValue
        try {
          parsedValue = JSON.parse(value)
        } catch {
          // If it's not JSON, store as string
          parsedValue = value
        }

        // Categorize the data based on logical key patterns
        if (logicalKey === 'organizations') {
          exportData.data.organizations = Array.isArray(parsedValue) ? parsedValue : []
        } else if (logicalKey === 'detection_rules') {
          exportData.data.detectionRules = Array.isArray(parsedValue) ? parsedValue : []
        } else if (logicalKey === 'detection_draft') {
          exportData.data.drafts[logicalKey] = parsedValue
        } else if (logicalKey.startsWith('setting_')) {
          // Settings with setting_ prefix
          const settingName = logicalKey.substring(8) // Remove 'setting_' prefix
          exportData.data.settings[settingName] = parsedValue
        } else {
          // Other settings or unknown items - store in settings
          exportData.data.settings[logicalKey] = parsedValue
        }

        processedKeys.push(fullKey)
        itemCount++
      }

      exportData.data.metadata.totalItems = itemCount
      exportData.data.metadata.storageKeys = processedKeys

      const exportJson = JSON.stringify(exportData, null, 2)

      appStore.addNotification(
        'success',
        `Configuration exported successfully! ${itemCount} items included.`,
      )

      return exportJson
    } catch (error) {
      void error // Export failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      appStore.addNotification('error', `Export failed: ${errorMessage}`)
      throw error
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Import configuration data
   */
  const importConfiguration = async (
    configJson: string,
    options = { overwrite: false, backup: true },
  ): Promise<ImportResult> => {
    try {
      isImporting.value = true

      const result: ImportResult = {
        success: false,
        imported: {
          organizations: 0,
          settings: 0,
          detectionRules: 0,
          drafts: 0,
        },
        errors: [],
        warnings: [],
      }

      // Parse and validate the import data
      let importData: ConfigurationExport
      try {
        importData = JSON.parse(configJson)
      } catch (_error) {
        result.errors.push('Invalid JSON format')
        return result
      }

      // Version compatibility check
      if (!importData.version) {
        result.warnings.push('Import data has no version information - proceeding with caution')
      } else if (importData.version !== CONFIG_VERSION) {
        result.warnings.push(
          `Version mismatch: importing ${importData.version}, current is ${CONFIG_VERSION}`,
        )
      }

      // App version compatibility check
      const currentAppVersion = getCurrentVersion()
      if (importData.appVersion) {
        if (importData.appVersion !== currentAppVersion) {
          result.warnings.push(
            `App version mismatch: config exported from v${importData.appVersion}, current app is v${currentAppVersion}`,
          )
        }
      } else {
        result.warnings.push(
          'Config has no app version info - exported from older DetectionForge version',
        )
      }

      // Create backup if requested
      if (options.backup) {
        try {
          const backupData = await exportConfiguration()
          const backupKey = `${STORAGE_PREFIX}backup_${Date.now()}`
          localStorage.setItem(backupKey, backupData)
          result.warnings.push(`Backup created at key: ${backupKey}`)
        } catch (_error) {
          result.warnings.push('Failed to create backup before import')
        }
      }

      // Import organizations
      if (importData.data.organizations && Array.isArray(importData.data.organizations)) {
        const orgKey = `${STORAGE_PREFIX}organizations`

        if (options.overwrite || !localStorage.getItem(orgKey)) {
          localStorage.setItem(orgKey, JSON.stringify(importData.data.organizations))
          result.imported.organizations = importData.data.organizations.length
        } else {
          // Merge organizations
          const existing = JSON.parse(localStorage.getItem(orgKey) || '[]')
          const merged = [...existing]

          for (const newOrg of importData.data.organizations) {
            if (!merged.find((org) => org.oid === newOrg.oid)) {
              merged.push(newOrg)
              result.imported.organizations++
            }
          }

          localStorage.setItem(orgKey, JSON.stringify(merged))
        }

        // If we imported organizations but don't have auth settings, create them
        if (result.imported.organizations > 0) {
          const hasPrimaryOid = localStorage.getItem(`${STORAGE_PREFIX}setting_primaryOid`)

          if (!hasPrimaryOid) {
            // Get the current organizations and set up auth state
            const currentOrgs = JSON.parse(localStorage.getItem(orgKey) || '[]')
            if (currentOrgs.length > 0) {
              const orgOids = currentOrgs.map((org: Record<string, unknown>) => org.oid)

              // Set primaryOid to first organization if not present
              localStorage.setItem(
                `${STORAGE_PREFIX}setting_primaryOid`,
                JSON.stringify(orgOids[0]),
              )
              result.imported.settings++
            }
          }
        }
      }

      // Import settings
      if (importData.data.settings) {
        for (const [settingName, settingValue] of Object.entries(importData.data.settings)) {
          const settingKey = `${STORAGE_PREFIX}setting_${settingName}`

          if (options.overwrite || !localStorage.getItem(settingKey)) {
            localStorage.setItem(settingKey, JSON.stringify(settingValue))
            result.imported.settings++
          } else {
            result.warnings.push(`Skipped existing setting: ${settingName}`)
          }
        }
      }

      // Import detection rules
      if (importData.data.detectionRules && Array.isArray(importData.data.detectionRules)) {
        const rulesKey = `${STORAGE_PREFIX}detection_rules`

        if (options.overwrite || !localStorage.getItem(rulesKey)) {
          localStorage.setItem(rulesKey, JSON.stringify(importData.data.detectionRules))
          result.imported.detectionRules = importData.data.detectionRules.length
        } else {
          // Merge rules
          const existing = JSON.parse(localStorage.getItem(rulesKey) || '[]')
          const merged = [...existing]

          for (const newRule of importData.data.detectionRules) {
            if (!merged.find((rule) => rule.id === newRule.id)) {
              merged.push(newRule)
              result.imported.detectionRules++
            }
          }

          localStorage.setItem(rulesKey, JSON.stringify(merged))
        }
      }

      // Import drafts
      if (importData.data.drafts) {
        for (const [draftKey, draftValue] of Object.entries(importData.data.drafts)) {
          const fullDraftKey = `${STORAGE_PREFIX}${draftKey}`

          if (options.overwrite || !localStorage.getItem(fullDraftKey)) {
            localStorage.setItem(fullDraftKey, JSON.stringify(draftValue))
            result.imported.drafts++
          } else {
            result.warnings.push(`Skipped existing draft: ${draftKey}`)
          }
        }
      }

      result.success = true

      const totalImported =
        result.imported.organizations +
        result.imported.settings +
        result.imported.detectionRules +
        result.imported.drafts

      appStore.addNotification('success', `Import completed! ${totalImported} items imported.`)

      if (result.warnings.length > 0) {
        appStore.addNotification(
          'warning',
          `Import completed with ${result.warnings.length} warnings. Check details.`,
        )
        void result.warnings // Import warnings
      }

      return result
    } catch (error) {
      void error // Import failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      appStore.addNotification('error', `Import failed: ${errorMessage}`)

      return {
        success: false,
        imported: { organizations: 0, settings: 0, detectionRules: 0, drafts: 0 },
        errors: [errorMessage],
        warnings: [],
      }
    } finally {
      isImporting.value = false
    }
  }

  /**
   * Download configuration as a file
   */
  const downloadConfiguration = async (filename?: string) => {
    try {
      const configData = await exportConfiguration()
      const blob = new Blob([configData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download =
        filename || `detectionforge-config-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      void error // Download failed
      throw error
    }
  } /**
   * Get configuration summary for display (reactive)
   */
  const getConfigurationSummary = computed(() => {
    // Use reactive organizations and settings which will update when refreshFromStorage() is called
    const orgCount = organizations.value.length
    const settingsCount = Object.keys(settings.value).length

    // Get current localStorage keys for other counts
    const keys = getAllDetectionForgeKeys()
    const summary = {
      totalKeys: keys.length,
      organizations: orgCount,
      settings: settingsCount,
      rules: 0,
      drafts: 0,
      other: 0,
      securityExclusions: 0,
    }

    // Only count keys that actually exist in localStorage
    for (const key of keys) {
      const value = localStorage.getItem(key)
      if (!value) {
        continue // Skip if key doesn't actually exist
      }

      if (isSecurityExclusion(key)) {
        summary.securityExclusions++
        continue
      }

      const logicalKey = getLogicalKeyName(key)

      if (logicalKey === 'detection_rules') {
        try {
          const rules = JSON.parse(value)
          summary.rules = Array.isArray(rules) ? rules.length : 1
        } catch {
          summary.rules = 1
        }
      } else if (logicalKey.includes('draft')) {
        summary.drafts++
      } else if (!logicalKey.startsWith('setting_') && logicalKey !== 'organizations') {
        summary.other++
      }
    }

    return summary
  })

  /**
   * Clear all configuration data (with confirmation)
   */
  const clearAllConfiguration = async (createBackup = true) => {
    try {
      if (createBackup) {
        await downloadConfiguration(`detectionforge-backup-before-clear-${Date.now()}.json`)
      }

      const keys = getAllDetectionForgeKeys()
      for (const key of keys) {
        localStorage.removeItem(key)
      }

      // Refresh reactive storage state to reflect cleared localStorage
      storage.refreshFromStorage()

      appStore.addNotification('success', `Cleared ${keys.length} configuration items`)
    } catch (error) {
      void error // Clear configuration failed
      throw error
    }
  }

  return {
    // State
    isExporting,
    isImporting,
    CONFIG_VERSION,

    // Actions
    exportConfiguration,
    importConfiguration,
    downloadConfiguration,
    getConfigurationSummary,
    clearAllConfiguration,
    getAllDetectionForgeKeys,

    // Utilities
    getLogicalKeyName,
    isSecurityExclusion,
  }
}
