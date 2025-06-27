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
    <RouterView />
    <Notifications />
  </div>
</template>

<script setup lang="ts">
import Notifications from './components/Notifications.vue'
import { useTheme } from './composables/useTheme'

// Initialize theme system
useTheme()

// Main app component with router outlet and notifications
</script>
