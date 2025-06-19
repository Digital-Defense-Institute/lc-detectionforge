/*
 * DetectionForge - A comprehensive detection engineering environment
 * Copyright (C) 2025 Digital Defense Institute
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'

// Import styles
import './assets/styles.css'

// Define routes
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('./components/Home.vue'), // Dynamic import
      meta: { title: 'DetectionForge - Detection Engineering Workbench' },
    },
    {
      path: '/workbench',
      name: 'Workbench',
      component: () => import('./components/Rules.vue'), // Dynamic import
      meta: { title: 'Detection Workbench - DetectionForge' },
    },
    {
      path: '/config',
      name: 'Config',
      component: () => import('./components/Config.vue'), // Dynamic import
      meta: { title: 'Configuration - DetectionForge' },
    },
    { path: '/rules', redirect: '/workbench' }, // Redirect old route for backward compatibility
  ],
})

// Update page title on route change
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
  next()
})

// Create Pinia store
const pinia = createPinia()

const app = createApp(App)
app.use(router)
app.use(pinia)
app.mount('#app')
