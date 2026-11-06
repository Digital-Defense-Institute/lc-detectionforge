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
  <div id="app" class="detection-forge">
    <AnalyticsNotice />
    <RouterView />
    <footer class="privacy-footer">
      <RouterLink to="/privacy">Privacy & analytics</RouterLink>
    </footer>
    <Notifications />
    <PwaInstallPrompt />
    <UpdateNotifier />
  </div>
</template>

<script setup lang="ts">
import Notifications from './components/Notifications.vue'
import PwaInstallPrompt from './components/PwaInstallPrompt.vue'
import UpdateNotifier from './components/UpdateNotifier.vue'
import AnalyticsNotice from './components/AnalyticsNotice.vue'
import { useTheme } from './composables/useTheme'

// Initialize theme system
useTheme()

// Main app component with router outlet and notifications
</script>

<style scoped>
.privacy-footer {
  padding: 1rem;
  text-align: center;
}
.privacy-footer a {
  color: var(--link-color);
  text-decoration: underline;
}
</style>
