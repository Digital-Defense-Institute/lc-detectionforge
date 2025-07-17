<template>
  <Transition name="fade">
    <div v-if="updateReady" class="update-notifier">
      <span class="update-icon">⬆</span>
      <span class="update-text">Update available - will apply on next restart</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const updateReady = ref(false)

onMounted(() => {
  // Listen for service worker update events
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      // Check if there's already a waiting worker
      if (registration.waiting) {
        updateReady.value = true
      }

      // Listen for new service workers
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready but waiting
              updateReady.value = true
            }
          })
        }
      })
    })
  }
})
</script>

<style scoped>
.update-notifier {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.update-icon {
  color: var(--color-primary);
  font-size: 16px;
}

.update-text {
  color: var(--color-text);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .update-notifier {
    left: 10px;
    right: 10px;
    bottom: 10px;
    font-size: 13px;
  }
}
</style>
