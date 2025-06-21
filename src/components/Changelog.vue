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
  <div class="container">
    <div class="header">
      <div class="nav">
        <button class="nav-button" @click="navigateHome">
          <span class="icon">←</span>
          Back to Home
        </button>
      </div>
      <Logo variant="blue" size="medium" />
      <h1>Changelog</h1>
      <p class="subtitle">Track the evolution of DetectionForge</p>
    </div>

    <div class="content">
      <div class="changelog-info">
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

      <div class="changelog-entries">
        <div v-for="entry in changelog" :key="entry.version" class="changelog-entry">
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
    </div>

    <div class="footer">
      <p>
        Made with <span class="heart">💙</span> by
        <a href="https://digitaldefenseinstitute.com" target="_blank">Digital Defense Institute</a>
        •
        <a href="https://github.com/Digital-Defense-Institute/lc-detectionforge" target="_blank"
          >Open Source on GitHub</a
        >
        • v{{ currentVersion }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Logo from './Logo.vue'
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
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  text-align: center;
  padding: 1rem;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.nav {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
}

.nav-button {
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

.header h1 {
  font-size: 3rem;
  margin: 0.5rem 0;
  font-weight: 300;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
  margin: 0 0 1rem 0;
}

.content {
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
  width: 100%;
}

.changelog-info {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: center;
}

.changelog-info a {
  color: #a8d8ff;
  text-decoration: underline;
}

.changelog-info a:hover {
  color: white;
}

.changelog-entries {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.changelog-entry {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

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
  color: #a8d8ff;
}

.date {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
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
  color: rgba(255, 255, 255, 0.9);
}

.footer {
  text-align: center;
  padding: 2rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

.footer a {
  color: #a8d8ff;
  text-decoration: none;
}

.footer a:hover {
  color: white;
  text-decoration: underline;
}

.heart {
  color: #f472b6;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .header {
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .nav {
    top: 0.5rem;
    left: 0.5rem;
  }

  .nav-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }

  .header h1 {
    font-size: 2rem;
    margin: 0.5rem 0;
  }

  .subtitle {
    font-size: 1rem;
  }

  .content {
    padding: 1rem;
  }

  .changelog-entry {
    padding: 1rem;
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
