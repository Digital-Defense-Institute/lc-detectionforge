<template>
  <div
    class="logo-container"
    :class="{ 'logo-small': size === 'small', 'logo-large': size === 'large' }"
  >
    <img :src="logoSrc" :alt="altText" class="logo-image" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'

interface Props {
  variant?: 'white' | 'blue' | 'auto'
  size?: 'small' | 'medium' | 'large'
  altText?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'auto',
  size: 'medium',
  altText: 'DetectionForge Logo',
})

const { isDark } = useTheme()

const logoSrc = computed(() => {
  if (props.variant === 'auto') {
    // In dark theme, use white logo; in light theme, use blue logo
    return isDark.value ? '/detection_forge_white.svg' : '/detection_forge_blue.svg'
  }
  return props.variant === 'white' ? '/detection_forge_white.svg' : '/detection_forge_blue.svg'
})
</script>
