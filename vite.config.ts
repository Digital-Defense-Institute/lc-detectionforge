import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.png',
        'robots.txt',
        'detection_forge_blue.svg',
        'detection_forge_white.svg',
      ],
      manifest: false, // Use our existing manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Don't cache API calls or external resources
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.limacharlie\.io\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate CodeMirror into its own chunk
          codemirror: [
            '@codemirror/view',
            '@codemirror/state',
            '@codemirror/commands',
            '@codemirror/autocomplete',
            '@codemirror/lang-yaml',
            '@codemirror/theme-one-dark',
            '@codemirror/search',
            '@codemirror/language',
            '@codemirror/lint',
          ],
          // Separate Vue ecosystem
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          // Separate utilities
          utils: ['js-yaml', 'dompurify'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Set base for GitHub Pages deployment
  // Use '/' for custom domains, '/repo-name/' for github.io project pages
  base: '/',
})
