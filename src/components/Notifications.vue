<template>
  <div v-if="notifications.length > 0" class="notification-container">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      :class="['notification', `notification-${notification.type}`]"
    >
      <span class="notification-message">{{ notification.message }}</span>
      <button class="notification-close" @click="removeNotificationSafely(notification.id)">
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { logger } from '../utils/logger'

const appStore = useAppStore()

const notifications = computed(() => appStore.recentNotifications)

// Safe wrapper for removing notifications to prevent external script conflicts
const removeNotificationSafely = (id: string) => {
  try {
    appStore.removeNotification(id)
  } catch (error) {
    // Log error but don't let it break the UI
    logger.warn('Error removing notification from UI:', error)
  }
}
</script>
