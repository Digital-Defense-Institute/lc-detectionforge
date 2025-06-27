import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'

export type Theme = 'light' | 'dark'

interface UseThemeReturn {
  theme: Ref<Theme>
  isDark: Ref<boolean>
  toggleTheme: () => void
  setTheme: (newTheme: Theme) => void
}

const THEME_KEY = 'detectionforge_theme'
const theme = ref<Theme>('light')

// Initialize theme from localStorage or system preference
const initializeTheme = () => {
  // Check localStorage first
  const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null
  if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
    theme.value = savedTheme
    return
  }

  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme.value = 'dark'
  }
}

// Apply theme to document
const applyTheme = (newTheme: Theme) => {
  document.documentElement.setAttribute('data-theme', newTheme)

  // Also update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', newTheme === 'dark' ? '#1a1a1a' : '#f5f5f5')
  }
}

// Watch for theme changes
watch(theme, (newTheme) => {
  localStorage.setItem(THEME_KEY, newTheme)
  applyTheme(newTheme)
})

// Listen for system theme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only update if user hasn't manually set a preference
    if (!localStorage.getItem(THEME_KEY)) {
      theme.value = e.matches ? 'dark' : 'light'
    }
  })
}

// Initialize on first import
initializeTheme()
applyTheme(theme.value)

export function useTheme(): UseThemeReturn {
  const isDark = computed(() => theme.value === 'dark')

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
  }

  return {
    theme,
    isDark,
    toggleTheme,
    setTheme,
  }
}
