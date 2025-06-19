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

interface Props {
  variant?: 'white' | 'blue'
  size?: 'small' | 'medium' | 'large'
  altText?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'white',
  size: 'medium',
  altText: 'DetectionForge Logo',
})

const logoSrc = computed(() => {
  return props.variant === 'white' ? '/detection_forge_white.svg' : '/detection_forge_blue.svg'
})
</script>

<style scoped>
.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-image {
  height: auto;
  max-width: 100%;
  transition: opacity 0.2s ease;
}

.logo-small .logo-image {
  height: 32px;
}

.logo-container:not(.logo-small):not(.logo-large) .logo-image {
  height: 48px;
}

.logo-large .logo-image {
  height: 80px;
}

.logo-image:hover {
  opacity: 0.9;
}
</style>
