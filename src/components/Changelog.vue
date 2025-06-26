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
  <body class="home">
    <div class="container home">
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
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<style scoped>
/* Minimal custom styles - leveraging global CSS classes */
.nav-button {
  position: absolute;
  top: 30px;
  left: 30px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-button:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.icon {
  font-size: 1.2rem;
  font-weight: bold;
}

/* Version-specific styling */
.version-header {
  margin-bottom: 1.5rem;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.version {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
  color: var(--brand-purple);
  transition: color var(--transition-speed) ease;
}

.date {
  color: var(--text-secondary);
  font-size: 1rem;
  transition: color var(--transition-speed) ease;
}

.current-badge {
  background: #4ade80;
  color: #022c22;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.changes {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.change-section {
  margin: 0;
}

.change-type {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.change-type.added {
  color: #4ade80;
}
.change-type.changed {
  color: #60a5fa;
}
.change-type.fixed {
  color: #fbbf24;
}
.change-type.removed {
  color: #f87171;
}
.change-type.security {
  color: #a78bfa;
}

.change-section ul {
  margin: 0;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.change-section li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
  color: var(--text-primary);
  transition: color var(--transition-speed) ease;
}

.heart {
  color: #f472b6;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .nav-button {
    top: 0.5rem;
    left: 0.5rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }

  .version-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .version {
    font-size: 1.5rem;
  }
}
</style>
