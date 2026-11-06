<template>
  <main class="privacy-page">
    <RouterLink to="/">← DetectionForge</RouterLink>
    <h1>Privacy & analytics</h1>
    <p>
      DetectionForge runs in your browser. Your API credentials and JWTs are held in memory and sent
      directly to LimaCharlie for authentication and API requests. They are not sent to a
      DetectionForge backend. Organizations, saved rules, and preferences can be stored locally.
    </p>
    <h2>Why we ask</h2>
    <p>
      We want to understand whether people use DetectionForge and which features help them. That
      evidence guides improvements and helps justify the time needed to maintain the app. Analytics
      is optional; every feature works with it off or blocked.
    </p>
    <h2>Your choice</h2>
    <p v-if="!analytics.available">Analytics is not enabled in this deployment.</p>
    <p v-else>
      Analytics is <strong>{{ consent === 'granted' ? 'allowed' : 'off' }}</strong> in this browser.
      <span v-if="consent === 'granted' && status === 'blocked'">
        The Google tag could not load or was blocked. No action is needed to use the app.
      </span>
    </p>
    <p>
      Before you allow analytics, we do not load Google Analytics, send analytics requests, or queue
      your activity for later. Your choice is saved only in this browser. Clearing browser storage
      resets it. We do not count your decision to decline.
    </p>
    <p v-if="consent === 'granted'">
      Turning analytics off reloads the app to unload Google’s script. Save or export your work
      first. The reload clears credentials held in memory; you will need to enter them again.
      Turning it off stops future collection and removes DetectionForge’s analytics cookies. It does
      not delete data already sent to Google.
    </p>
    <div v-if="analytics.available" class="privacy-actions">
      <button v-if="consent !== 'granted'" type="button" @click="analytics.setConsent('granted')">
        Allow analytics
      </button>
      <button type="button" @click="analytics.setConsent('denied')">
        {{ consent === 'granted' ? 'Turn off analytics & reload' : 'Keep analytics off' }}
      </button>
    </div>
    <p v-if="storageError" role="status">
      Your browser could not save this preference. New permission cannot take effect until it can be
      saved. A request to turn analytics off still stops collection in this tab. If your browser
      also prevents removing the saved choice, we cannot safely reload to unload Google’s script;
      the previously saved choice may apply when you reopen the app. Clear this site’s storage in
      your browser settings to remove it.
    </p>
    <h2>What is measured when you allow it</h2>
    <ul>
      <li>
        Visits to fixed app sections: Home, Workbench, Configuration, Changelog, and this page.
      </li>
      <li>Counts of individual unit test runs, backtest starts, and rule export attempts.</li>
      <li>
        Google’s standard visit, session, and engagement measurements and browser/device
        information.
      </li>
    </ul>
    <p>
      Our event payloads use fixed names and page labels. They exclude credentials, JWTs, user and
      organization IDs, organization names, rule names and contents, event samples, test results,
      filenames, API URLs, and error messages. We replace page URLs with fixed section URLs and omit
      query strings, fragments, and referrers. We do not enable automatic form, search, download, or
      outbound-link tracking, advertising personalization, or Google Signals.
    </p>
    <h2>Google’s involvement</h2>
    <p>
      If you allow analytics, your browser loads Google’s analytics script and sends usage data
      directly to Google for property G-P0C3RG2X1T. Google receives network information, including
      your IP address, when your browser connects. This is not an anonymous or isolated execution
      environment: third-party JavaScript runs on the same page as the app. Keeping credentials in
      memory does not isolate them from scripts on that page. Our analytics integration does not
      read or attach them to events.
    </p>
    <p>
      We configure first-party analytics cookies with the prefix <code>df_usage_</code>, a 30-day
      lifetime without renewal on each visit, and no sharing across subdomains. They distinguish
      visits and returning browsers. The local consent preference remains until you change it or
      clear browser storage. Declining analytics prevents Google Analytics from loading.
    </p>
    <p>
      Our deployment policy requires two-month event/user data retention in Google Analytics with
      renewal on new activity disabled. Standard aggregated reports can be retained longer; this is
      not a promise that all Google-held data is deleted after two months. See
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
        >Google’s privacy policy</a
      >
      and
      <a
        href="https://support.google.com/analytics/answer/11397207"
        target="_blank"
        rel="noopener noreferrer"
        >analytics cookie information</a
      >.
    </p>
    <p>
      The exact event list and deployment controls are documented in
      <a
        href="https://github.com/Digital-Defense-Institute/lc-detectionforge/blob/main/docs/analytics.md"
        target="_blank"
        rel="noopener noreferrer"
        >the public source</a
      >. Usage counts reflect consenting, unblocked browsers, not every person who uses
      DetectionForge.
    </p>
  </main>
</template>

<script setup lang="ts">
import { analytics } from '../composables/useAnalytics'
const { consent, status, storageError } = analytics
</script>

<style scoped>
.privacy-page {
  max-width: 850px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
  color: var(--text-primary);
}
h1 {
  margin: 1.5rem 0;
}
h2 {
  margin-top: 2rem;
  font-size: 1.3rem;
}
p,
li {
  line-height: 1.7;
}
li {
  margin-bottom: 0.5rem;
}
a {
  color: var(--link-color);
  text-decoration: underline;
}
.privacy-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
button {
  padding: 0.65rem 1rem;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
}
</style>
