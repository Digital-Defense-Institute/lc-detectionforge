import { defineStore } from 'pinia'
import { useStorage } from '../composables/useStorage'
import { useAuth } from '../composables/useAuth'
import { useApi as _useApi } from '../composables/useApi'
import { logger } from '../utils/logger'

interface AppState {
  isInitialized: boolean
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    timestamp: number
  }>
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    isInitialized: false,
    notifications: [],
  }),

  getters: {
    // Get recent notifications (last 10)
    recentNotifications: (state) => {
      return state.notifications.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
    },

    // Check if there are any error notifications
    hasErrors: (state) => {
      return state.notifications.some((n) => n.type === 'error')
    },
  },

  actions: {
    // Initialize the application
    async initialize() {
      if (this.isInitialized) return

      try {
        // Initialize composables
        const _storage = useStorage()
        const _auth = useAuth()

        // Load initial data
        await this.loadInitialData()

        this.isInitialized = true
        this.addNotification('success', 'Application initialized successfully')
      } catch (error) {
        void error // Failed to initialize application
        this.addNotification('error', 'Failed to initialize application')
      }
    },

    // Load initial data from localStorage
    async loadInitialData() {
      // The composables handle their own initialization
      // This is a placeholder for any additional app-level initialization
    },

    // Add a notification
    addNotification(type: 'success' | 'error' | 'warning' | 'info', message: string) {
      const notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        message,
        timestamp: Date.now(),
      }

      this.notifications.push(notification)

      // Auto-remove all notifications after appropriate delays
      let delay = 5000 // Default 5 seconds

      // Error notifications stay a bit longer since they're more important
      if (type === 'error') {
        delay = 7000 // 7 seconds for errors
      }

      setTimeout(() => {
        this.removeNotification(notification.id)
      }, delay)
    },

    // Alias for addNotification for consistency with other components
    showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
      this.addNotification(type, message)
    },

    // Remove a notification
    removeNotification(id: string) {
      try {
        const index = this.notifications.findIndex((n) => n.id === id)
        if (index > -1) {
          this.notifications.splice(index, 1)
        }
      } catch (error) {
        // Silently handle any errors when removing notifications
        // This prevents external script conflicts from breaking our notification system
        logger.warn('Error removing notification:', error)
      }
    },

    // Clear all notifications
    clearNotifications() {
      try {
        this.notifications = []
      } catch (error) {
        // Silently handle any errors when clearing notifications
        logger.warn('Error clearing notifications:', error)
      }
    },

    // Clear notifications of a specific type
    clearNotificationsByType(type: 'success' | 'error' | 'warning' | 'info') {
      this.notifications = this.notifications.filter((n) => n.type !== type)
    },
  },
})
