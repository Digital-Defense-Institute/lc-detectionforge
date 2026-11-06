<template>
  <aside
    v-if="analytics.available && (consent === null || storageError) && route.path !== '/privacy'"
    class="analytics-notice"
    aria-labelledby="analytics-notice-title"
  >
    <h2 id="analytics-notice-title">Help guide DetectionForge’s future</h2>
    <p>
      Optional Google Analytics helps us understand how often DetectionForge is used and which
      features matter. This guides improvements and helps justify the time needed to maintain the
      app.
    </p>
    <p>
      If enabled, we collect basic usage events. We do not include your API credentials,
      organization details, detection rules, or event data in analytics. Google Analytics uses
      cookies to measure visits. Your choice won’t affect any app features, and you can change it
      anytime.
    </p>
    <div class="analytics-choices">
      <button type="button" @click="analytics.setConsent('denied')">Keep analytics off</button>
      <button type="button" @click="analytics.setConsent('granted')">Allow analytics</button>
      <RouterLink to="/privacy">What we collect</RouterLink>
    </div>
    <p v-if="storageError" role="status">
      Your browser could not save this preference. Analytics is off in this tab. A previously saved
      choice may apply when you reopen the app. Clear this site’s browser storage to reset it.
    </p>
  </aside>
</template>

<script setup lang="ts">
import { analytics } from '../composables/useAnalytics'
import { useRoute } from 'vue-router'
const route = useRoute()
const { consent, storageError } = analytics
</script>

<style scoped>
.analytics-notice {
  max-width: 960px;
  margin: 1rem auto;
  padding: 1.25rem;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
}
h2 {
  font-size: 1.2rem;
  margin: 0 0 0.75rem;
  padding-right: 2.5rem;
}
p {
  line-height: 1.6;
  margin: 0.75rem 0;
}
.analytics-choices {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
button {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  padding: 0.65rem 1rem;
  cursor: pointer;
  font: inherit;
}
a {
  color: var(--link-color);
  text-decoration: underline;
}
@media (max-width: 600px) {
  .analytics-notice {
    margin: 0.75rem;
  }
}
</style>
