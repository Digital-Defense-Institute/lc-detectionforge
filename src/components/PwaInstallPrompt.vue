<template>
  <div>
    <div v-if="showInstallPrompt" class="pwa-install-prompt">
      <div class="prompt-content">
        <h3>Install DetectionForge</h3>
        <p>Install the app for quick access and a better experience.</p>
        <div class="prompt-buttons">
          <button class="install-button" @click="installPWA">Install</button>
          <button class="dismiss-button" @click="dismissPrompt">Not now</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const showInstallPrompt = ref(false)
let deferredPrompt: BeforeInstallPromptEvent | null = null

// Define the BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const handleBeforeInstallPrompt = (e: Event) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault()
  // Stash the event so it can be triggered later
  deferredPrompt = e as BeforeInstallPromptEvent
  // Update UI notify the user they can install the PWA
  showInstallPrompt.value = true
}

const installPWA = async () => {
  if (!deferredPrompt) return

  // Show the install prompt
  deferredPrompt.prompt()

  // Wait for the user to respond to the prompt
  const { outcome: _outcome } = await deferredPrompt.userChoice

  // Clear the deferred prompt
  deferredPrompt = null
  showInstallPrompt.value = false

  // Could log analytics event here if needed
  // Analytics would track: outcome === 'accepted' ? 'installed' : 'dismissed'
}

const dismissPrompt = () => {
  showInstallPrompt.value = false
  // Set a flag in localStorage to not show again for some time
  localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
}

onMounted(() => {
  // Check if prompt was recently dismissed
  const dismissed = localStorage.getItem('pwa-prompt-dismissed')
  if (dismissed) {
    const dismissedTime = parseInt(dismissed)
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
    // Don't show prompt for 7 days after dismissal
    if (daysSinceDismissed < 7) {
      return
    }
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})
</script>

<style scoped>
.pwa-install-prompt {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-width: 400px;
  width: calc(100% - 40px);
}

.prompt-content h3 {
  margin: 0 0 10px 0;
  color: var(--color-heading);
}

.prompt-content p {
  margin: 0 0 20px 0;
  color: var(--color-text);
}

.prompt-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.install-button,
.dismiss-button {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.install-button {
  background: var(--color-primary);
  color: var(--color-text)
}

.install-button:hover {
  background: var(--color-primary-hover);
}

.dismiss-button {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.dismiss-button:hover {
  background: var(--color-background-mute);
}

@media (max-width: 600px) {
  .pwa-install-prompt {
    bottom: 10px;
    width: calc(100% - 20px);
  }
}

.pwa-debug-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 999;
}

.pwa-debug-button:hover {
  background: var(--color-primary-hover);
}
</style>
