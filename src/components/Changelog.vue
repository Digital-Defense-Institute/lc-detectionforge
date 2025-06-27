<!--
  DetectionForge - A comprehensive detection engineering environment
  Copyright (C) 2025 Digital Defense Institute

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<template>
  <body class="home changelog">
    <div class="container home changelog">
      <div class="header home">
        <div class="header-theme-toggle">
          <ThemeToggle />
        </div>
        <button class="nav-button" @click="navigateHome">
          <span class="icon">←</span>
          Back to Home
        </button>
        <Logo variant="auto" size="large" />
        <h1>Changelog</h1>
        <p>Track the evolution of DetectionForge</p>
      </div>

      <div class="content">
        <div class="section">
          <h2>Release Notes</h2>
          <p>
            This changelog follows
            <a href="https://semver.org/" target="_blank" rel="noopener noreferrer"
              >Semantic Versioning</a
            >
            and
            <a href="https://keepachangelog.com/" target="_blank" rel="noopener noreferrer"
              >Keep a Changelog</a
            >
            principles.
          </p>
        </div>

        <div v-for="entry in changelog" :key="entry.version" class="section">
          <div class="version-header">
            <div class="version-info">
              <h2 class="version">{{ entry.version }}</h2>
              <span class="date">{{ formatDate(entry.date) }}</span>
              <span v-if="entry.version === currentVersion" class="current-badge">Current</span>
            </div>
          </div>

          <div class="changes">
            <div v-if="entry.changes.added" class="change-section">
              <h3 class="change-type added">✨ Added</h3>
              <ul>
                <li v-for="change in entry.changes.added" :key="change">{{ change }}</li>
              </ul>
            </div>

            <div v-if="entry.changes.changed" class="change-section">
              <h3 class="change-type changed">🔄 Changed</h3>
              <ul>
                <li v-for="change in entry.changes.changed" :key="change">{{ change }}</li>
              </ul>
            </div>

            <div v-if="entry.changes.fixed" class="change-section">
              <h3 class="change-type fixed">🐛 Fixed</h3>
              <ul>
                <li v-for="change in entry.changes.fixed" :key="change">{{ change }}</li>
              </ul>
            </div>

            <div v-if="entry.changes.removed" class="change-section">
              <h3 class="change-type removed">🗑️ Removed</h3>
              <ul>
                <li v-for="change in entry.changes.removed" :key="change">{{ change }}</li>
              </ul>
            </div>

            <div v-if="entry.changes.security" class="change-section">
              <h3 class="change-type security">🔒 Security</h3>
              <ul>
                <li v-for="change in entry.changes.security" :key="change">{{ change }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="footer home">
        <p>
          Made with <span class="heart">💙</span> by
          <a href="https://digitaldefenseinstitute.com" target="_blank"
            >Digital Defense Institute</a
          >
          •
          <a href="https://github.com/Digital-Defense-Institute/lc-detectionforge" target="_blank"
            >Open Source on GitHub</a
          >
          • v{{ currentVersion }}
        </p>
      </div>
    </div>
  </body>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Logo from './Logo.vue'
import ThemeToggle from './ThemeToggle.vue'
import { getAllChangelog, getCurrentVersion } from '../utils/version'

const router = useRouter()
const changelog = getAllChangelog()
const currentVersion = getCurrentVersion()

const navigateHome = () => {
  router.push('/')
}

const formatDate = (dateString: string): string => {
  // Parse the date string manually to avoid timezone conversion
  // dateString format is 'YYYY-MM-DD'
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day) // month is 0-indexed
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>
