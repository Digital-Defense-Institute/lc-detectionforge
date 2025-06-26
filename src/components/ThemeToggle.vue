<template>
  <button
    class="theme-toggle"
    :class="{ 'theme-toggle--dark': isDark }"
    :title="`Switch to ${isDark ? 'light' : 'dark'} mode`"
    :aria-label="`Switch to ${isDark ? 'light' : 'dark'} mode`"
    @click="toggleTheme"
  >
    <span class="theme-toggle__icon">
      <svg
        v-if="!isDark"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </span>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from '../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<style scoped>
.theme-toggle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  background: transparent;
  border: 2px solid var(--theme-toggle-border, #ddd);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
}

.theme-toggle:hover {
  background: var(--theme-toggle-hover-bg, rgba(0, 0, 0, 0.05));
  border-color: var(--theme-toggle-hover-border, #999);
}

.theme-toggle:focus-visible {
  box-shadow: 0 0 0 3px var(--theme-toggle-focus, rgba(102, 126, 234, 0.25));
}

.theme-toggle--dark {
  border-color: var(--theme-toggle-dark-border, #555);
}

.theme-toggle--dark:hover {
  background: var(--theme-toggle-dark-hover-bg, rgba(255, 255, 255, 0.1));
  border-color: var(--theme-toggle-dark-hover-border, #888);
}

.theme-toggle__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-toggle-icon-color, #666);
  transition: transform 0.3s ease;
}

.theme-toggle:hover .theme-toggle__icon {
  transform: rotate(15deg);
}

.theme-toggle--dark .theme-toggle__icon {
  color: var(--theme-toggle-dark-icon-color, #ccc);
}

/* Animation for icon transitions */
.theme-toggle__icon svg {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8) rotate(-15deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}
</style>
