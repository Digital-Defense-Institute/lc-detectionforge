<template>
  <body class="rules">
    <div class="container rules">
      <div class="header rules">
        <div class="header-left">
          <Logo variant="white" size="small" />
          <h1>Detection Workbench</h1>
        </div>
        <div class="nav-links">
          <RouterLink to="/" class="nav-link">← Home</RouterLink>
          <RouterLink to="/config" class="nav-link">Configuration</RouterLink>
        </div>
      </div>

      <!-- Configuration Warning Banner -->
      <div
        v-if="!storage.credentials.value || storage.organizations.value.length === 0"
        class="warning-text"
      >
        <strong>⚠️ Configuration Required</strong>
        <p>
          To test detection rules, you must first configure your LimaCharlie credentials and select
          at least one organization.
          <RouterLink to="/config" class="warning-link">Go to Configuration →</RouterLink>
        </p>
      </div>

      <div class="section-header">
        <h2>Detection Rule Builder</h2>
        <p>
          Create, test, and validate LimaCharlie detection rules with real-time feedback. Build
          detection logic, test with sample events, and export rules ready for deployment.
        </p>
      </div>

      <!-- Rule Editor Section -->
      <div class="section">
        <h2>Rule Editor</h2>

        <!-- Rule Information -->
        <div class="section rule-info-section">
          <div class="rule-info">
            <div class="input-row">
              <div class="input-group">
                <label for="ruleName">Rule Name</label>
                <input
                  id="ruleName"
                  v-model="currentRule.name"
                  type="text"
                  placeholder="Enter rule name..."
                />
              </div>
              <div class="input-group">
                <label for="ruleDescription">Rule Description</label>
                <input
                  id="ruleDescription"
                  v-model="currentRule.description"
                  type="text"
                  placeholder="Describe what this rule detects..."
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Rule Logic -->
        <div class="section rule-logic-section">
          <!-- Rule Logic Editors -->
          <div class="rule-editor">
            <div class="editor-panel">
              <div class="editor-header">
                <label for="detectEditor">Detect Logic</label>
              </div>
              <textarea
                id="detectEditor"
                ref="detectEditorRef"
                class="code-editor"
                placeholder="Enter detection logic here...&#10;&#10;Example:&#10;op: and&#10;rules:&#10;  - op: ends with&#10;    path: event/FILE_PATH&#10;    value: .exe&#10;  - op: is&#10;    path: event/EVENT_TYPE&#10;    value: FILE_CREATE"
              ></textarea>
            </div>
            <div class="editor-panel">
              <div class="editor-header">
                <label for="respondEditor">Respond Logic</label>
                <div v-if="hasUnsavedChanges" class="draft-indicator-inline">
                  <span class="draft-badge">📝 Unsaved Changes</span>
                </div>
              </div>
              <textarea
                id="respondEditor"
                ref="respondEditorRef"
                class="code-editor"
                placeholder="Enter response actions here...&#10;&#10;Example:&#10;- action: report&#10;  name: suspicious_file_creation&#10;- action: add tag&#10;  tag: suspicious_activity&#10;- action: isolate network"
              ></textarea>
            </div>
          </div>

          <!-- Spacing between editors and buttons -->
          <div class="editor-actions-spacing"></div>

          <div class="actions">
            <!-- Rule Operations -->
            <div class="action-group rule-operations">
              <button class="btn btn-secondary" @click="newRule">🆕 New Rule</button>
              <button class="btn btn-info" @click="showLoadRuleModal = true">
                📂 Load Saved Rule
              </button>
              <button class="btn btn-success" @click="saveRule">💾 Save Rule</button>
              <button class="btn btn-warning" @click="duplicateRule">📋 Duplicate Rule</button>
              <button class="btn btn-danger" @click="clearEditor">🧹 Clear</button>
            </div>

            <!-- Validation -->
            <div class="action-group validation">
              <button class="btn btn-primary" @click="validateRule">🔍 Validate Rule</button>
            </div>

            <!-- Import/Export -->
            <div class="action-group import-export">
              <button class="btn btn-info" @click="showImportIaCModal = true">
                📥 Import from IaC
              </button>
              <button class="btn btn-info" @click="exportToIaC">
                ⚙️ Export to IaC{{ unitTests.length > 0 ? ` (+${unitTests.length} tests)` : '' }}
              </button>
            </div>

            <!-- Reference & Help -->
            <div class="action-group reference-help">
              <button class="btn btn-info" @click="openEventSchemasModal">📋 Event Schemas</button>
              <a
                href="https://docs.limacharlie.io/docs/detection-logic-operators"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary"
              >
                📚 Operator Reference
              </a>
            </div>
          </div>

          <!-- Safe: HTML content is sanitized using DOMPurify before rendering -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-if="validationResult"
            class="validation-display"
            v-html="sanitizeHtml(validationResult)"
          ></div>
          <!-- eslint-enable vue/no-v-html -->
        </div>
        <!-- End of rule-logic-section -->
      </div>
      <!-- End of Rule Editor Section -->

      <!-- Rule Testing Section -->
      <div class="section">
        <h2>Rule Testing</h2>

        <!-- Unit Tests Section -->
        <div class="section test-event-section">
          <div class="collapsible-header" @click="toggleUnitTests">
            <h3>
              <span class="toggle-icon">{{ showUnitTests ? '▼' : '▶' }}</span>
              Unit Tests - Test Detection Logic
            </h3>
          </div>
          <div v-if="showUnitTests" class="test-event-content">
            <div class="unit-tests-header">
              <p>
                Create multiple test cases to validate your detection logic against various
                scenarios. Each test case can be expected to match or not match.
              </p>
              <div class="test-actions">
                <button class="btn btn-success" @click="addUnitTest">➕ Add Test Case</button>
                <button
                  class="btn btn-primary"
                  :disabled="unitTests.length === 0 || isRunningTests"
                  @click="runAllTests"
                >
                  {{ isRunningTests ? '🔄 Running Tests...' : '🧪 Run All Tests' }}
                </button>
                <button
                  class="btn btn-secondary"
                  :disabled="unitTests.length === 0"
                  @click="clearAllTests"
                >
                  Clear All Tests
                </button>
                <div v-if="unitTests.length > 0" class="collapse-controls">
                  <button class="btn btn-small btn-outline" @click="collapseAllTests">
                    📁 Collapse All
                  </button>
                  <button class="btn btn-small btn-outline" @click="expandAllTests">
                    📂 Expand All
                  </button>
                </div>
              </div>
            </div>

            <!-- Test Cases -->
            <div v-if="unitTests.length > 0" class="unit-tests-container">
              <div
                v-for="(test, index) in unitTests"
                :key="test.id"
                class="unit-test-item"
                :class="{
                  'test-passed': test.result?.passed,
                  'test-failed': test.result?.passed === false,
                  'test-collapsed': test.isCollapsed,
                }"
              >
                <div class="unit-test-header" @click="toggleTestCollapse(test)">
                  <div class="test-header-left">
                    <span class="collapse-toggle">{{ test.isCollapsed ? '▶' : '▼' }}</span>
                    <div class="test-info">
                      <input
                        v-model="test.name"
                        class="test-name-input"
                        :placeholder="`Test Case ${index + 1}`"
                        @click.stop
                      />
                      <div class="test-controls" @click.stop>
                        <label class="expected-match">
                          <input v-model="test.expectedMatch" type="checkbox" />
                          Expected to Match
                        </label>
                        <button class="btn btn-small btn-danger" @click="removeUnitTest(index)">
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  <div v-if="test.result" class="test-status">
                    <span
                      :class="['status-badge', test.result.passed ? 'status-pass' : 'status-fail']"
                    >
                      {{ test.result.passed ? '✅ PASS' : '❌ FAIL' }}
                    </span>
                    <span class="match-status">
                      ({{ test.result.didMatch ? 'Matched' : 'No Match' }})
                    </span>
                  </div>
                </div>

                <div v-if="!test.isCollapsed" class="unit-test-body">
                  <div class="input-group">
                    <label :for="`test-data-${test.id}`">Test Event Data (JSON)</label>
                    <div class="preset-controls">
                      <select
                        :id="`preset-${test.id}`"
                        class="preset-selector"
                        @change="
                          loadPreset(test, ($event.target as HTMLSelectElement)?.value || '')
                        "
                      >
                        <option value="">Load Preset Event...</option>
                        <option value="new_process">NEW_PROCESS - Generic Process Creation</option>
                        <option value="file_create">FILE_CREATE - Suspicious File Creation</option>
                        <option value="network_connect">
                          NETWORK_CONNECT - Outbound Connection
                        </option>
                        <option value="registry_write">
                          REGISTRY_WRITE - Registry Modification
                        </option>
                        <option value="dns_request">DNS_REQUEST - Domain Resolution</option>
                        <option value="code_identity">
                          CODE_IDENTITY - Unsigned Binary Execution
                        </option>
                      </select>
                      <button
                        class="btn btn-small btn-outline"
                        :disabled="!test.eventData.trim()"
                        @click="clearTestEventData(test)"
                      >
                        Clear
                      </button>
                    </div>
                    <textarea
                      :id="`test-data-${test.id}`"
                      v-model="test.eventData"
                      class="test-event-editor"
                      placeholder="Paste your test telemetry JSON here or select a preset above..."
                    ></textarea>
                  </div>

                  <!-- Test Result Display -->
                  <div v-if="test.result" class="individual-test-result">
                    <div class="result-summary" @click="test.showDetails = !test.showDetails">
                      <strong>Test Result Summary</strong>
                      <span class="toggle-details">{{ test.showDetails ? '▼' : '▶' }}</span>
                    </div>
                    <!-- Safe: HTML content is sanitized using DOMPurify before rendering -->
                    <!-- eslint-disable vue/no-v-html -->
                    <div
                      v-if="test.showDetails"
                      class="detailed-result"
                      v-html="sanitizeHtml(test.result.formattedResponse)"
                    ></div>
                    <!-- eslint-enable vue/no-v-html -->
                  </div>
                </div>
              </div>
            </div>

            <!-- Overall Test Results -->
            <div v-if="overallTestResults" class="overall-results">
              <h4>Overall Test Results</h4>
              <div class="results-summary">
                <div class="summary-stats">
                  <span class="stat-item stat-total">Total: {{ overallTestResults.total }}</span>
                  <span class="stat-item stat-passed">Passed: {{ overallTestResults.passed }}</span>
                  <span class="stat-item stat-failed">Failed: {{ overallTestResults.failed }}</span>
                  <span class="stat-item stat-success-rate"
                    >Success Rate: {{ overallTestResults.successRate }}%</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Backtesting Section -->
        <div class="section backtest-section">
          <div class="collapsible-header" @click="toggleBacktest">
            <h3>
              <span class="toggle-icon">{{ showBacktest ? '▼' : '▶' }}</span>
              Backtesting - Test Against Historical Data
            </h3>
          </div>
          <div v-if="showBacktest" class="backtest-content">
            <div class="backtest-header">
              <p>
                Test your detection rule against historical telemetry data from your organization's
                sensors. This allows you to see how your rule would have performed against
                real-world data.
              </p>
              <div class="backtest-warning">
                <strong>⚠️ Performance Note:</strong> Backtesting can be resource-intensive. Large
                time ranges and/or selecting many orgs may take several minutes to process.
              </div>
            </div>

            <!-- Organization Selection for Backtest -->
            <div class="backtest-org-selection">
              <h4>Select Organizations for Backtesting</h4>
              <div class="org-selection-header">
                <div class="org-count-badge">
                  <span class="org-icon">🏢</span>
                  <span class="org-count">{{ backtestSelectedOids.length }}</span>
                  <span class="org-label"
                    >of {{ availableOrgsForBacktest.length }}
                    {{ availableOrgsForBacktest.length === 1 ? 'Organization' : 'Organizations' }}
                    Selected</span
                  >
                </div>
                <div class="org-selection-actions">
                  <button
                    class="btn btn-small btn-secondary"
                    :disabled="backtestSelectedOids.length === availableOrgsForBacktest.length"
                    @click="selectAllBacktestOrgs"
                  >
                    Select All
                  </button>
                  <button
                    class="btn btn-small btn-secondary"
                    :disabled="backtestSelectedOids.length === 0"
                    @click="deselectAllBacktestOrgs"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div v-if="availableOrgsForBacktest.length === 0" class="no-orgs-warning">
                <span class="warning-icon">⚠️</span>
                <span
                  >No organizations configured. Please add organizations in the Configuration
                  page.</span
                >
              </div>

              <div v-else class="org-selection-list">
                <div
                  v-for="org in availableOrgsForBacktest"
                  :key="org.oid"
                  class="org-selection-item"
                  :class="{
                    selected: backtestSelectedOids.includes(org.oid),
                    primary: org.oid === auth.primaryOid.value,
                  }"
                  @click="toggleBacktestOrg(org.oid)"
                >
                  <div class="org-checkbox">
                    <input
                      type="checkbox"
                      :checked="backtestSelectedOids.includes(org.oid)"
                      @click.stop
                      @change="toggleBacktestOrg(org.oid)"
                    />
                  </div>
                  <div class="org-info">
                    <div class="org-name">{{ org.name }}</div>
                    <div class="org-id">{{ org.oid }}</div>
                  </div>
                  <div v-if="org.oid === auth.primaryOid.value" class="primary-badge">PRIMARY</div>
                </div>
              </div>

              <div
                v-if="backtestSelectedOids.length === 0 && availableOrgsForBacktest.length > 0"
                class="selection-warning"
              >
                <span class="warning-icon">⚠️</span>
                <span>Please select at least one organization to run backtest.</span>
              </div>
            </div>

            <div class="backtest-configuration">
              <div class="time-range-section">
                <h4>Time Range</h4>
                <div class="time-range-inputs">
                  <div class="input-group">
                    <label for="backtestStartDate">Start Date & Time</label>
                    <input
                      id="backtestStartDate"
                      v-model="backtestConfig.startDateTime"
                      type="datetime-local"
                      class="datetime-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="backtestEndDate">End Date & Time</label>
                    <input
                      id="backtestEndDate"
                      v-model="backtestConfig.endDateTime"
                      type="datetime-local"
                      class="datetime-input"
                    />
                  </div>
                </div>
                <div class="quick-ranges">
                  <span class="quick-range-label">Quick Ranges:</span>
                  <button class="btn btn-small btn-outline" @click="setQuickRange('1hour')">
                    Last Hour
                  </button>
                  <button class="btn btn-small btn-outline" @click="setQuickRange('6hours')">
                    Last 6 Hours
                  </button>
                  <button class="btn btn-small btn-outline" @click="setQuickRange('24hours')">
                    Last 24 Hours
                  </button>
                  <button class="btn btn-small btn-outline" @click="setQuickRange('7days')">
                    Last 7 Days
                  </button>
                  <button class="btn btn-small btn-outline" @click="setQuickRange('30days')">
                    Last 30 Days
                  </button>
                </div>
              </div>

              <div class="limits-section">
                <h4>Limits (Optional)</h4>
                <div class="limits-inputs">
                  <div class="input-group">
                    <label for="eventLimit">Event Limit</label>
                    <input
                      id="eventLimit"
                      v-model="backtestConfig.eventLimit"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0 = No limit"
                      class="number-input"
                    />
                    <small>Maximum number of events to process (0 = no limit)</small>
                  </div>
                  <div class="input-group">
                    <label for="evalLimit">Evaluation Limit</label>
                    <input
                      id="evalLimit"
                      v-model="backtestConfig.evalLimit"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0 = No limit"
                      class="number-input"
                    />
                    <small>Maximum number of rule evaluations (0 = no limit)</small>
                  </div>
                </div>
              </div>
            </div>

            <div class="backtest-actions">
              <button
                class="btn btn-primary btn-large"
                :disabled="!canRunBacktest || isRunningBacktest"
                @click="runBacktest"
              >
                {{
                  isRunningBacktest
                    ? `🔄 Running Backtest for ${backtestSelectedOids.length} Org${backtestSelectedOids.length !== 1 ? 's' : ''}...`
                    : `🔍 Run Backtest${backtestSelectedOids.length > 1 ? ` (${backtestSelectedOids.length} Orgs)` : ''}`
                }}
              </button>
              <button
                class="btn btn-secondary"
                :disabled="!backtestResults"
                @click="clearBacktestResults"
              >
                Clear Results
              </button>
            </div>

            <!-- Backtest Progress Indicator -->
            <div v-if="isRunningBacktest" class="backtest-progress">
              <div class="progress-header">
                <h4>🔄 Running Backtest</h4>
                <div class="progress-stats">
                  Organization {{ backtestProgress.current }} of {{ backtestProgress.total }}
                </div>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{
                    width: `${(backtestProgress.current / backtestProgress.total) * 100}%`,
                  }"
                ></div>
              </div>
              <div class="progress-current">
                <span class="current-org-icon">🏢</span>
                <div class="current-org-info">
                  <div class="current-org-name">
                    {{ getOrgNameOnly(backtestProgress.currentOid) }}
                  </div>
                  <div class="current-org-oid">{{ backtestProgress.currentOid }}</div>
                </div>
              </div>
            </div>

            <!-- Backtest Results -->
            <div v-if="backtestResults" class="backtest-results">
              <div class="results-header">
                <h4>Backtest Results</h4>
                <div class="results-timestamp">
                  Completed: {{ formatTimestamp(backtestResults.completedAt) }}
                </div>
              </div>

              <!-- Overall Statistics Summary -->
              <div class="stats-summary">
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.totalStats.n_proc.toLocaleString() }}
                  </div>
                  <div class="stat-label">Total Events Processed</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.totalStats.n_eval.toLocaleString() }}
                  </div>
                  <div class="stat-label">Total Rule Evaluations</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.totalStats.totalMatches.toLocaleString() }}
                  </div>
                  <div class="stat-label">Total Matches Found</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.totalStats.wall_time.toFixed(2) }}s
                  </div>
                  <div class="stat-label">Total Execution Time</div>
                </div>
              </div>

              <!-- Per-Organization Results -->
              <div class="org-results-section">
                <h5>Results by Organization ({{ backtestResults.orgResults.length }})</h5>

                <div
                  v-for="(orgResult, orgIndex) in backtestResults.orgResults"
                  :key="orgResult.oid"
                  class="org-result-card"
                  :class="{ error: orgResult.status === 'error' }"
                >
                  <div class="org-result-header" @click="toggleOrgResult(orgIndex)">
                    <div class="org-info">
                      <div class="org-name">{{ getOrgNameOnly(orgResult.oid) }}</div>
                      <div class="org-id">{{ orgResult.oid }}</div>
                    </div>
                    <div class="org-status-wrapper">
                      <span class="org-status" :class="orgResult.status">
                        {{ orgResult.status === 'success' ? '✅' : '❌' }}
                        {{ orgResult.status === 'success' ? 'Success' : 'Failed' }}
                      </span>
                    </div>
                    <div class="org-summary">
                      <span v-if="orgResult.status === 'success' && orgResult.results">
                        {{ orgResult.results.length }} matches
                      </span>
                      <span v-if="orgResult.status === 'error'" class="error-text">
                        {{ orgResult.error }}
                      </span>
                      <span class="toggle-icon">{{
                        expandedOrgResults.has(orgIndex) ? '▼' : '▶'
                      }}</span>
                    </div>
                  </div>

                  <div v-if="expandedOrgResults.has(orgIndex)" class="org-result-details">
                    <div v-if="orgResult.status === 'success'" class="org-success-details">
                      <!-- Organization Statistics -->
                      <div v-if="orgResult.stats" class="org-stats">
                        <div class="org-stat">
                          <span class="stat-value">{{
                            orgResult.stats.n_proc.toLocaleString()
                          }}</span>
                          <span class="stat-label">Events Processed</span>
                        </div>
                        <div class="org-stat">
                          <span class="stat-value">{{
                            orgResult.stats.n_eval.toLocaleString()
                          }}</span>
                          <span class="stat-label">Rule Evaluations</span>
                        </div>
                        <div class="org-stat">
                          <span class="stat-value">{{
                            (orgResult.results?.length || 0).toLocaleString()
                          }}</span>
                          <span class="stat-label">Matches</span>
                        </div>
                        <div class="org-stat">
                          <span class="stat-value"
                            >{{ orgResult.stats.wall_time.toFixed(2) }}s</span
                          >
                          <span class="stat-label">Execution Time</span>
                        </div>
                      </div>

                      <!-- Organization Matches -->
                      <div
                        v-if="orgResult.results && orgResult.results.length > 0"
                        class="org-matches"
                      >
                        <div class="matches-header">
                          <h6>Matched Events ({{ orgResult.results.length }})</h6>
                          <div class="matches-controls">
                            <button
                              class="btn btn-small btn-outline"
                              @click="exportOrgBacktestResults(orgResult)"
                            >
                              📄 Export
                            </button>
                          </div>
                        </div>

                        <div class="matches-list">
                          <div
                            v-for="(result, matchIndex) in orgResult.results.slice(
                              0,
                              getDisplayedResultsForOrg(orgIndex),
                            )"
                            :key="`${orgIndex}-${matchIndex}`"
                            class="match-item"
                          >
                            <div
                              class="match-header"
                              @click="toggleMatchDetails(orgIndex, matchIndex)"
                            >
                              <div class="match-info">
                                <span class="match-timestamp">{{
                                  formatTimestamp(result.data.detect.ts)
                                }}</span>
                                <span class="match-hostname">{{
                                  result.data.detect.routing.hostname
                                }}</span>
                                <span class="match-action"
                                  >{{ result.action }}: {{ result.data.cat }}</span
                                >
                              </div>
                              <div class="match-toggle">
                                {{ expandedMatches.has(`${orgIndex}-${matchIndex}`) ? '▼' : '▶' }}
                              </div>
                            </div>

                            <div
                              v-if="expandedMatches.has(`${orgIndex}-${matchIndex}`)"
                              class="match-details"
                            >
                              <div class="match-tabs">
                                <button
                                  :class="[
                                    'tab-btn',
                                    {
                                      active:
                                        activeMatchTab[`${orgIndex}-${matchIndex}`] === 'event',
                                    },
                                  ]"
                                  @click="setMatchTab(`${orgIndex}-${matchIndex}`, 'event')"
                                >
                                  Event Details
                                </button>
                                <button
                                  :class="[
                                    'tab-btn',
                                    {
                                      active: activeMatchTab[`${orgIndex}-${matchIndex}`] === 'raw',
                                    },
                                  ]"
                                  @click="setMatchTab(`${orgIndex}-${matchIndex}`, 'raw')"
                                >
                                  Raw JSON
                                </button>
                              </div>

                              <div
                                v-if="activeMatchTab[`${orgIndex}-${matchIndex}`] === 'event'"
                                class="match-event-details"
                              >
                                <div class="event-fields">
                                  <div v-if="result.data.detect.event.COMMAND_LINE" class="field">
                                    <strong>Command Line:</strong>
                                    {{ result.data.detect.event.COMMAND_LINE }}
                                  </div>
                                  <div v-if="result.data.detect.event.FILE_PATH" class="field">
                                    <strong>File Path:</strong>
                                    {{ result.data.detect.event.FILE_PATH }}
                                  </div>
                                  <div v-if="result.data.detect.event.PROCESS_ID" class="field">
                                    <strong>Process ID:</strong>
                                    {{ result.data.detect.event.PROCESS_ID }}
                                  </div>
                                  <div v-if="result.data.detect.event.USER_NAME" class="field">
                                    <strong>User:</strong> {{ result.data.detect.event.USER_NAME }}
                                  </div>
                                  <div v-if="result.data.detect.routing.sid" class="field">
                                    <strong>Sensor ID:</strong> {{ result.data.detect.routing.sid }}
                                  </div>
                                  <div v-if="result.data.link" class="field">
                                    <strong>Timeline Link:</strong>
                                    <a
                                      :href="result.data.link"
                                      target="_blank"
                                      class="timeline-link"
                                    >
                                      View in LimaCharlie
                                    </a>
                                  </div>
                                </div>
                              </div>

                              <div
                                v-if="activeMatchTab[`${orgIndex}-${matchIndex}`] === 'raw'"
                                class="match-raw-json"
                              >
                                <pre>{{ JSON.stringify(result, null, 2) }}</pre>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Load More for this org -->
                        <div
                          v-if="orgResult.results.length > getDisplayedResultsForOrg(orgIndex)"
                          class="load-more-section"
                        >
                          <button
                            class="btn btn-small btn-primary"
                            @click="loadMoreResultsForOrg(orgIndex)"
                          >
                            Load More ({{
                              orgResult.results.length - getDisplayedResultsForOrg(orgIndex)
                            }}
                            remaining)
                          </button>
                        </div>
                      </div>

                      <div v-else class="no-matches">
                        <p>No matches found for this organization.</p>
                      </div>
                    </div>

                    <div v-else class="org-error-details">
                      <div class="error-message"><strong>Error:</strong> {{ orgResult.error }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- End of Rule Testing Section -->

      <!-- Load Saved Rule Modal -->
      <div
        v-if="showLoadRuleModal"
        class="reference-modal-overlay"
        @click="showLoadRuleModal = false"
      >
        <div class="reference-modal" @click.stop>
          <div class="reference-modal-header">
            <h3>Load Saved Rule</h3>
            <button class="close-btn" @click="showLoadRuleModal = false">×</button>
          </div>
          <div class="reference-modal-content">
            <div class="saved-rules">
              <div v-if="savedRules.length === 0" class="empty-state">
                No saved rules yet. Create your first detection rule!
              </div>
              <div v-else>
                <div v-for="rule in savedRules" :key="rule.id" class="rule-item">
                  <div>
                    <div class="rule-name">{{ rule.name }}</div>
                    <div class="rule-meta">Modified: {{ formatDate(rule.modified) }}</div>
                    <div v-if="rule.description" class="rule-meta">{{ rule.description }}</div>
                  </div>
                  <div class="rule-actions">
                    <button
                      class="btn btn-primary btn-small"
                      @click="loadRuleAndCloseModal(rule.id)"
                    >
                      Load
                    </button>
                    <button class="btn btn-danger btn-small" @click="deleteRule(rule.id)">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Event Schemas Modal -->
      <div
        v-if="showEventSchemasModal"
        class="reference-modal-overlay"
        @click="showEventSchemasModal = false"
      >
        <div class="reference-modal" @click.stop>
          <div class="reference-modal-header">
            <h3>Event Schemas</h3>
            <button class="close-btn" @click="showEventSchemasModal = false">×</button>
          </div>
          <div class="reference-modal-content">
            <div class="event-schemas">
              <div class="schema-description">
                <p>
                  Select an event type to retrieve its schema definition from LimaCharlie. The
                  schema shows all available fields and their data types for the selected event
                  type.
                </p>
              </div>

              <div class="schema-controls">
                <div class="input-group">
                  <label for="orgSelector">Organization</label>
                  <select
                    id="orgSelector"
                    v-model="selectedOrgForSchema"
                    class="org-selector"
                    @change="onOrgChange"
                  >
                    <option value="">Select an organization...</option>
                    <option v-for="org in availableOrgsForSchema" :key="org.oid" :value="org.oid">
                      {{ org.name }} ({{ org.oid }})
                    </option>
                  </select>
                  <small v-if="!selectedOrgForSchema" class="org-description">
                    Choose an organization to load available schema types
                  </small>
                </div>
                <div class="input-group">
                  <label for="loadSchemasBtn">Available Schema Types</label>
                  <button
                    id="loadSchemasBtn"
                    class="btn btn-primary"
                    :disabled="!selectedOrgForSchema || isLoadingSchemas"
                    @click="fetchAvailableSchemas"
                  >
                    {{ isLoadingSchemas ? '🔄 Loading...' : '📥 Load Available Schemas' }}
                  </button>
                  <small v-if="availableSchemas.length > 0" class="schema-count">
                    {{ availableSchemas.length }} schema types available
                  </small>
                </div>
                <div class="input-group">
                  <label for="prefixSelector">Schema Category</label>
                  <select
                    id="prefixSelector"
                    v-model="selectedPrefix"
                    class="prefix-selector"
                    :disabled="availableSchemas.length === 0"
                    @change="onPrefixChange"
                  >
                    <option
                      v-for="prefix in schemaPrefixOptions"
                      :key="prefix.value"
                      :value="prefix.value"
                    >
                      {{ prefix.label }} ({{ prefix.value }}:)
                    </option>
                  </select>
                  <small class="prefix-description">
                    {{ schemaPrefixOptions.find((p) => p.value === selectedPrefix)?.description }}
                  </small>
                </div>
                <div class="input-group">
                  <label for="eventTypeSelector">Event Type</label>
                  <select
                    id="eventTypeSelector"
                    v-model="selectedEventType"
                    class="event-selector"
                    :disabled="filteredSchemas.length === 0"
                  >
                    <option value="">Select an event type...</option>
                    <option v-if="availableSchemas.length === 0 && !isLoadingSchemas" disabled>
                      Load schemas first by selecting an organization
                    </option>
                    <option
                      v-if="filteredSchemas.length === 0 && availableSchemas.length > 0"
                      disabled
                    >
                      No schemas available for {{ selectedPrefix }} prefix
                    </option>
                    <option
                      v-for="eventType in filteredSchemas"
                      :key="eventType"
                      :value="eventType"
                    >
                      {{ eventType.replace(`${selectedPrefix}:`, '') }}
                    </option>
                  </select>
                </div>
                <div class="schema-actions">
                  <button
                    class="btn btn-primary"
                    :disabled="!selectedEventType || isLoadingSchema"
                    @click="fetchEventSchema"
                  >
                    {{ isLoadingSchema ? '🔄 Loading...' : '📋 Get Schema' }}
                  </button>
                  <button
                    class="btn btn-secondary"
                    :disabled="!selectedEventType && !eventSchema"
                    @click="resetEventSchema"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div v-if="schemaError" class="error-message">
                <strong>Error:</strong> {{ schemaError }}
              </div>

              <div v-if="eventSchema" class="schema-results">
                <div class="schema-header">
                  <h4>Schema for {{ eventSchema.eventType }}</h4>
                  <div class="schema-stats">
                    {{ eventSchema.elements.length }} field{{
                      eventSchema.elements.length !== 1 ? 's' : ''
                    }}
                  </div>
                  <button
                    class="btn btn-small btn-secondary"
                    title="Copy entire schema to clipboard"
                    @click="copyAllSchemaToClipboard"
                  >
                    📋 Copy All
                  </button>
                </div>

                <div class="schema-elements">
                  <div class="schema-table">
                    <div class="schema-table-header">
                      <div class="schema-col-type">Type</div>
                      <div class="schema-col-path">Field Path</div>
                      <div class="schema-col-actions">Actions</div>
                    </div>
                    <div
                      v-for="element in eventSchema.elements"
                      :key="element.path"
                      class="schema-row"
                    >
                      <div class="schema-col-type">
                        <span :class="['type-badge', `type-${element.type}`]">
                          {{ element.type }}
                        </span>
                      </div>
                      <div class="schema-col-path">
                        <code>{{ element.path }}</code>
                      </div>
                      <div class="schema-col-actions">
                        <button
                          class="btn btn-small btn-outline"
                          title="Copy field path to clipboard"
                          @click="copyFieldPathToClipboard(element.path)"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Import from IaC Modal -->
      <div
        v-if="showImportIaCModal"
        class="reference-modal-overlay"
        @click="showImportIaCModal = false"
      >
        <div class="reference-modal import-iac-modal" @click.stop>
          <div class="reference-modal-header">
            <h3>Import Detection Rules from IaC</h3>
            <button class="close-btn" @click="showImportIaCModal = false">×</button>
          </div>
          <div class="reference-modal-content">
            <div class="import-iac-content">
              <div class="import-description">
                <p>
                  Paste your LimaCharlie Infrastructure as Code (IaC) YAML content below to import
                  detection rules. This supports importing multiple rules at once from a single IaC
                  file.
                </p>
                <div class="import-features">
                  <ul>
                    <li>✅ Automatically extracts detect and respond logic</li>
                    <li>✅ Imports unit tests if present in the IaC</li>
                    <li>✅ Supports multiple rules in one IaC file</li>
                    <li>✅ Validates YAML syntax before import</li>
                  </ul>
                </div>
              </div>

              <form @submit.prevent="importFromIaC">
                <div class="input-group">
                  <label for="iacContent">IaC YAML Content</label>
                  <textarea
                    id="iacContent"
                    v-model="iacImportContent"
                    class="iac-import-editor"
                    placeholder='Paste your LimaCharlie IaC YAML content here...

Example:
version: 3
hives:
    dr-general:
        "My Detection Rule":
            data:
                detect:
                    op: is
                    path: event/EVENT_TYPE
                    value: NEW_PROCESS
                respond:
                    - action: report
                      name: process_detected'
                    :disabled="isImportingIaC"
                  ></textarea>
                </div>

                <div class="import-actions">
                  <button
                    type="submit"
                    class="btn btn-primary btn-large"
                    :disabled="!iacImportContent.trim() || isImportingIaC"
                  >
                    {{ isImportingIaC ? '🔄 Importing...' : '📥 Import Rules' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    :disabled="isImportingIaC"
                    @click="clearIaCImport"
                  >
                    Clear
                  </button>
                </div>
              </form>

              <!-- Import Results -->
              <div v-if="iacImportResult" class="import-results">
                <div class="import-results-header">
                  <h4>
                    <span v-if="iacImportResult.success" class="success-icon">✅</span>
                    <span v-else class="error-icon">❌</span>
                    Import Results
                  </h4>
                </div>

                <div class="import-summary">
                  <p>{{ iacImportResult.message }}</p>
                </div>

                <div v-if="iacImportResult.importedRules.length > 0" class="imported-rules-list">
                  <h5>Rules Processed ({{ iacImportResult.importedRules.length }})</h5>
                  <div
                    v-for="(rule, index) in iacImportResult.importedRules"
                    :key="index"
                    class="imported-rule-item"
                    :class="{ success: rule.success, error: !rule.success }"
                  >
                    <span class="rule-status">
                      {{ rule.success ? '✅' : '❌' }}
                    </span>
                    <span class="rule-name">{{ rule.name }}</span>
                    <span v-if="rule.error" class="rule-error">{{ rule.error }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>
          Made with <span class="heart">💙</span> by
          <a href="https://digitaldefenseinstitute.com" target="_blank"
            >Digital Defense Institute</a
          >
          •
          <a href="https://github.com/Digital-Defense-Institute/lc-detectionforge" target="_blank"
            >Open Source on GitHub</a
          >
        </p>
      </div>
    </div>
  </body>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { useApi } from '../composables/useApi'
import { useStorage } from '../composables/useStorage'
import { useAuth } from '../composables/useAuth'
import { sanitizeHtml } from '../utils/sanitizer'
import { logger } from '../utils/logger'
import Logo from './Logo.vue'
// CodeMirror v6 imports
import {
  EditorView,
  keymap,
  highlightActiveLine,
  lineNumbers,
  drawSelection,
} from '@codemirror/view'
import {
  autocompletion,
  closeBrackets,
  CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { yaml as yamlLang } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'
import { search, searchKeymap } from '@codemirror/search'
import { foldGutter, codeFolding, foldKeymap } from '@codemirror/language'
import { bracketMatching } from '@codemirror/language'
import { linter, lintGutter } from '@codemirror/lint'
import * as yaml from 'js-yaml'

const appStore = useAppStore()
const api = useApi()
const storage = useStorage()
const auth = useAuth()

// Template refs
const detectEditorRef = ref<HTMLTextAreaElement>()
const respondEditorRef = ref<HTMLTextAreaElement>()

// CodeMirror v6 instances
let detectEditor: EditorView
let respondEditor: EditorView

// Helper functions for CodeMirror v6
function setEditorValue(editor: EditorView, value: string) {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: value },
  })
}

function _getEditorValue(editor: EditorView): string {
  return editor.state.doc.toString()
}

// YAML validation linter for CodeMirror
const yamlLinter = linter((view) => {
  const diagnostics: Array<{
    from: number
    to: number
    severity: 'error' | 'warning'
    message: string
  }> = []
  const doc = view.state.doc.toString()

  if (!doc.trim()) {
    return diagnostics // Empty document is valid
  }

  try {
    yaml.load(doc)
  } catch (error: unknown) {
    let from = 0
    let to = doc.length
    let message = 'YAML Syntax Error'

    // Handle YAML parsing errors with mark information
    if (error && typeof error === 'object' && 'mark' in error) {
      const yamlError = error as { mark: { line: number; column: number }; message?: string }
      const line = yamlError.mark.line
      const column = yamlError.mark.column
      const docLines = doc.split('\n')

      // Calculate position in document
      let pos = 0
      for (let i = 0; i < line && i < docLines.length; i++) {
        pos += docLines[i].length + 1 // +1 for newline
      }
      pos += column

      from = Math.max(0, pos - 10)
      to = Math.min(doc.length, pos + 10)

      if (yamlError.message) {
        message = `YAML Syntax Error: ${yamlError.message}`
      }
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = `YAML Syntax Error: ${(error as { message: string }).message}`
    }

    diagnostics.push({
      from,
      to,
      severity: 'error',
      message,
    })
  }

  return diagnostics
})

// Simplified LimaCharlie D&R autocompletion with editor awareness
const limaCharlieCompletions = (context: CompletionContext): CompletionResult | null => {
  const word = context.matchBefore(/\w*/)
  if (!word) return null

  // Get line context
  const line = context.state.doc.lineAt(context.pos)
  const beforeCursor = line.text.slice(0, context.pos - line.from)

  // Determine active editor - simpler approach using the view's DOM
  let activeEditor = 'detect'

  // Check if this CodeMirror instance is attached to the respond editor
  if (context.view?.dom) {
    // Look for the original textarea that was replaced by CodeMirror
    const parentPanel = context.view.dom.closest('.editor-panel')
    if (parentPanel) {
      const label = parentPanel.querySelector('label[for="respondEditor"]')
      if (label) {
        activeEditor = 'respond'
      } else {
        const detectLabel = parentPanel.querySelector('label[for="detectEditor"]')
        if (detectLabel) {
          activeEditor = 'detect'
        }
      }
    }
  }

  // Fallback: check if there's a respond editor textarea in the DOM and if it's focused
  if (activeEditor === 'detect') {
    const respondTextarea = document.getElementById('respondEditor')
    if (respondTextarea && respondTextarea.style.display !== 'none') {
      // If respond editor exists and is visible, check if CodeMirror replaced it
      const cmWrapper = respondTextarea.nextElementSibling
      if (cmWrapper && cmWrapper.classList.contains('cm-editor')) {
        if (context.view?.dom && cmWrapper.contains(context.view.dom)) {
          activeEditor = 'respond'
        }
      }
    }
  }

  // Context detection - handle YAML list items with dashes
  const isAfterColon = /(?:^|\s|-\s*)(\w+):\s*$/.test(beforeCursor)
  const contextMatch = beforeCursor.match(/(?:^|\s|-\s*)(\w+):\s*$/)
  const fieldContext = contextMatch ? contextMatch[1] : null

  // Detect if we're inside an action block by looking at previous lines
  const docText = context.state.doc.toString()
  const currentLine = context.state.doc.lineAt(context.pos)
  const linesBeforeCursor = docText.slice(0, currentLine.from).split('\n')

  let insideActionBlock = null
  const _actionIndentLevel = -1

  // Look backwards to find the most recent action declaration
  for (let i = linesBeforeCursor.length - 1; i >= 0; i--) {
    const line = linesBeforeCursor[i]
    const actionMatch = line.match(/^(\s*)-\s*action:\s*(\w+)/)

    if (actionMatch) {
      const indentLevel = actionMatch[1].length
      const indentMatch = currentLine.text.match(/^(\s*)/)
      const currentLineIndent = indentMatch ? indentMatch[1].length : 0

      // Check if current line is indented more than the action line (inside the block)
      if (currentLineIndent > indentLevel) {
        insideActionBlock = actionMatch[2] // The action type (report, task, etc.)
        void _actionIndentLevel // Suppressed unused variable
        break
      } else {
        // Found an action but we're not inside it (same or less indentation)
        break
      }
    }

    // If we hit another list item at the same level, we're not in the action block
    if (line.match(/^(\s*)-\s*\w+:/) && !line.includes('action:')) {
      break
    }
  }

  // Debug logging (only in development)
  logger.debug('beforeCursor:', JSON.stringify(beforeCursor))
  logger.debug('isAfterColon:', isAfterColon)
  logger.debug('fieldContext:', fieldContext)
  logger.debug('activeEditor:', activeEditor)
  logger.debug('insideActionBlock:', insideActionBlock)

  const completions = [
    // === DETECT EDITOR ONLY ===

    // Core detection structure
    { label: 'event', type: 'property', info: 'Event type to monitor', editor: 'detect' },
    { label: 'op', type: 'property', info: 'Operator for comparison', editor: 'detect' },
    { label: 'path', type: 'property', info: 'Field path in event data', editor: 'detect' },
    { label: 'value', type: 'property', info: 'Value to match against', editor: 'detect' },
    {
      label: 're',
      type: 'property',
      info: 'Regular expression pattern for matches operator',
      editor: 'detect',
    },
    {
      label: 'case sensitive',
      type: 'property',
      info: 'Case sensitivity flag (true/false)',
      editor: 'detect',
    },
    {
      label: 'not',
      type: 'property',
      info: 'Inverts the result of the rule (true/false)',
      editor: 'detect',
    },
    {
      label: 'max',
      type: 'property',
      info: 'Maximum value for string distance operator',
      editor: 'detect',
    },
    {
      label: 'name',
      type: 'property',
      info: 'Platform name for is platform operator',
      editor: 'detect',
    },
    {
      label: 'tag',
      type: 'property',
      info: 'Tag name for is tagged operator',
      editor: 'detect',
    },
    {
      label: 'resource',
      type: 'property',
      info: 'Resource path for lookup operator (e.g., lcr://lookup/malwaredomains)',
      editor: 'detect',
    },
    {
      label: 'rule',
      type: 'property',
      info: 'Single nested rule for scope operator',
      editor: 'detect',
    },
    {
      label: 'cidr',
      type: 'property',
      info: 'CIDR network mask for cidr operator (e.g., 10.16.1.0/24)',
      editor: 'detect',
    },
    {
      label: 'seconds',
      type: 'property',
      info: 'Number of seconds for "is older than" operator',
      editor: 'detect',
    },
    {
      label: 'sub domain',
      type: 'property',
      info: 'Sub domain index or slice notation for "sub domain" operator (e.g., 0, 1, -1)',
      editor: 'detect',
    },
    {
      label: 'rules',
      type: 'property',
      info: 'Nested rules for logical operations',
      editor: 'detect',
    },
    {
      label: 'times',
      type: 'property',
      info: 'Time descriptors specifying when the operator is valid (list of time constraints)',
      editor: 'detect',
    },
    {
      label: 'target',
      type: 'property',
      info: 'Target scope for the detection rule (e.g., deployment for sensor management events)',
      editor: 'detect',
    },

    // Time descriptor properties (for times: field)
    {
      label: 'day_of_week_start',
      type: 'property',
      info: 'Starting day of week (1=Monday, 7=Sunday)',
      editor: 'detect',
    },
    {
      label: 'day_of_week_end',
      type: 'property',
      info: 'Ending day of week (1=Monday, 7=Sunday)',
      editor: 'detect',
    },
    {
      label: 'time_of_day_start',
      type: 'property',
      info: 'Starting time of day in 24-hour format (0-2359, e.g., 1430 for 2:30 PM)',
      editor: 'detect',
    },
    {
      label: 'time_of_day_end',
      type: 'property',
      info: 'Ending time of day in 24-hour format (0-2359, e.g., 1730 for 5:30 PM)',
      editor: 'detect',
    },
    {
      label: 'tz',
      type: 'property',
      info: 'Time zone from TZ database (e.g., America/Los_Angeles, UTC, Europe/London)',
      editor: 'detect',
    },

    // Common operators (for op: field)
    { label: 'is', type: 'keyword', info: 'Exact match', editor: 'detect', field: 'op' },
    { label: 'contains', type: 'keyword', info: 'String contains', editor: 'detect', field: 'op' },
    {
      label: 'starts with',
      type: 'keyword',
      info: 'String starts with',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'ends with',
      type: 'keyword',
      info: 'String ends with',
      editor: 'detect',
      field: 'op',
    },
    { label: 'exists', type: 'keyword', info: 'Field exists check', editor: 'detect', field: 'op' },
    {
      label: 'matches',
      type: 'keyword',
      info: 'Regular expression match',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'string distance',
      type: 'keyword',
      info: 'Levenshtein distance comparison for similar strings',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'is 32 bit',
      type: 'keyword',
      info: 'Matches if sensor is 32-bit architecture',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'is 64 bit',
      type: 'keyword',
      info: 'Matches if sensor is 64-bit architecture',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'is arm',
      type: 'keyword',
      info: 'Matches if sensor is ARM architecture',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'is platform',
      type: 'keyword',
      info: 'Checks if the event is from a sensor of the given platform',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'is tagged',
      type: 'keyword',
      info: 'Determines if the tag supplied in the tag parameter is already associated with the sensor',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'lookup',
      type: 'keyword',
      info: 'Looks up a value against a lookup add-on (resource) such as a threat feed',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'scope',
      type: 'keyword',
      info: 'Limits the scope of matching to a specific part of the event',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'cidr',
      type: 'keyword',
      info: 'Checks if an IP address is contained within a given CIDR network mask',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'is private address',
      type: 'keyword',
      info: 'Checks if an IP address is a private address as defined by RFC 1918',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'is public address',
      type: 'keyword',
      info: 'Checks if an IP address is a public address as defined by RFC 1918',
      editor: 'detect',
      field: 'op',
    },

    // Transform operators
    {
      label: 'file name',
      type: 'keyword',
      info: 'Extracts the file name from a file path (transform operator)',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'sub domain',
      type: 'keyword',
      info: 'Extracts a sub domain from a domain or URL (transform operator)',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'is older than',
      type: 'keyword',
      info: 'Checks if a timestamp is older than the specified number of seconds (transform operator)',
      editor: 'detect',
      field: 'op',
    },

    { label: 'and', type: 'keyword', info: 'Logical AND', editor: 'detect', field: 'op' },
    { label: 'or', type: 'keyword', info: 'Logical OR', editor: 'detect', field: 'op' },
    {
      label: 'is greater than',
      type: 'keyword',
      info: 'Numeric greater than comparison (artifact target)',
      editor: 'detect',
      field: 'op',
    },
    {
      label: 'is lower than',
      type: 'keyword',
      info: 'Numeric less than comparison (artifact target)',
      editor: 'detect',
      field: 'op',
    },

    // EDR Event Types (for event: field)
    {
      label: 'AUTORUN_CHANGE',
      type: 'constant',
      info: 'Autorun registry entry change',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'CLOUD_NOTIFICATION',
      type: 'constant',
      info: 'Cloud platform notification',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'CODE_IDENTITY',
      type: 'constant',
      info: 'File/code signatures',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'CONNECTED',
      type: 'constant',
      info: 'Sensor connected to LC cloud',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'DATA_DROPPED',
      type: 'constant',
      info: 'Data was dropped due to rate limiting',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'DEBUG_DATA_REP',
      type: 'constant',
      info: 'Debug data response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'DELETED_SENSOR',
      type: 'constant',
      info: 'Sensor deletion events (for use with undelete sensor action)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'DIR_FINDHASH_REP',
      type: 'constant',
      info: 'Directory find hash response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'DIR_LIST_REP',
      type: 'constant',
      info: 'Directory listing response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'DISCONNECTED',
      type: 'constant',
      info: 'Sensor disconnected from LC cloud',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'DNS_REQUEST',
      type: 'constant',
      info: 'DNS queries',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'DRIVER_CHANGE',
      type: 'constant',
      info: 'Driver/kernel module change',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'EXEC_OOB',
      type: 'constant',
      info: 'Out-of-band execution',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'EXISTING_PROCESS',
      type: 'constant',
      info: 'Process already running when sensor started',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'EXPORT_COMPLETE',
      type: 'constant',
      info: 'Export operation completed',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FIM_ADD',
      type: 'constant',
      info: 'File integrity monitoring - file added',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FIM_DEL',
      type: 'constant',
      info: 'File integrity monitoring - file deleted',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FIM_HIT',
      type: 'constant',
      info: 'File integrity monitoring - file modified',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FILE_CREATE',
      type: 'constant',
      info: 'File creation',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FILE_DEL_REP',
      type: 'constant',
      info: 'File deletion response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FILE_DELETE',
      type: 'constant',
      info: 'File deletion',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FILE_GET_REP',
      type: 'constant',
      info: 'File get response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FILE_HASH_REP',
      type: 'constant',
      info: 'File hash response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FILE_INFO_REP',
      type: 'constant',
      info: 'File information response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FILE_MODIFIED',
      type: 'constant',
      info: 'File modification',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FILE_MOV_REP',
      type: 'constant',
      info: 'File move response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'FILE_TYPE_ACCESSED',
      type: 'constant',
      info: 'File type accessed',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'GET_DOCUMENT_REP',
      type: 'constant',
      info: 'Get document response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'GET_EXFIL_EVENT_REP',
      type: 'constant',
      info: 'Get exfiltration event response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'HIDDEN_MODULE_DETECTED',
      type: 'constant',
      info: 'Hidden module detected',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'HISTORY_DUMP_REP',
      type: 'constant',
      info: 'History dump response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'HTTP_REQUEST',
      type: 'constant',
      info: 'HTTP request',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'HTTP_REQUEST_HEADERS',
      type: 'constant',
      info: 'HTTP request headers',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'HTTP_RESPONSE_HEADERS',
      type: 'constant',
      info: 'HTTP response headers',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'INGEST',
      type: 'constant',
      info: 'Data ingestion event',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'LOG_GET_REP',
      type: 'constant',
      info: 'Log get response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'LOG_LIST_REP',
      type: 'constant',
      info: 'Log list response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'MEM_FIND_HANDLES_REP',
      type: 'constant',
      info: 'Memory find handles response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'MEM_FIND_STRING_REP',
      type: 'constant',
      info: 'Memory find string response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'MEM_HANDLES_REP',
      type: 'constant',
      info: 'Memory handles response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'MEM_MAP_REP',
      type: 'constant',
      info: 'Memory map response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'MEM_READ_REP',
      type: 'constant',
      info: 'Memory read response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'MEM_STRINGS_REP',
      type: 'constant',
      info: 'Memory strings response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'MODULE_LOAD',
      type: 'constant',
      info: 'Module/library load',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'MODULE_MEM_DISK_MISMATCH',
      type: 'constant',
      info: 'Module memory/disk mismatch',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NETSTAT_REP',
      type: 'constant',
      info: 'Network statistics response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NETWORK_CONNECTIONS',
      type: 'constant',
      info: 'Network activity',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NETWORK_SUMMARY',
      type: 'constant',
      info: 'Network summary information',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NEW_DOCUMENT',
      type: 'constant',
      info: 'New document created',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NEW_NAMED_PIPE',
      type: 'constant',
      info: 'Named pipe creation',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NEW_PROCESS',
      type: 'constant',
      info: 'Process creation',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NEW_REMOTE_THREAD',
      type: 'constant',
      info: 'Remote thread creation',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NEW_TCP4_CONNECTION',
      type: 'constant',
      info: 'New TCP IPv4 connection',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NEW_TCP6_CONNECTION',
      type: 'constant',
      info: 'New TCP IPv6 connection',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NEW_UDP4_CONNECTION',
      type: 'constant',
      info: 'New UDP IPv4 connection',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'NEW_UDP6_CONNECTION',
      type: 'constant',
      info: 'New UDP IPv6 connection',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OPEN_NAMED_PIPE',
      type: 'constant',
      info: 'Named pipe opened',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OS_AUTORUNS_REP',
      type: 'constant',
      info: 'OS autoruns response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OS_DRIVERS_REP',
      type: 'constant',
      info: 'OS drivers response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OS_KILL_PROCESS_REP',
      type: 'constant',
      info: 'OS kill process response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OS_PACKAGES_REP',
      type: 'constant',
      info: 'OS packages response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OS_PROCESSES_REP',
      type: 'constant',
      info: 'OS processes response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OS_RESUME_REP',
      type: 'constant',
      info: 'OS resume response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OS_SERVICES_REP',
      type: 'constant',
      info: 'OS services response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OS_SUSPEND_REP',
      type: 'constant',
      info: 'OS suspend response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OS_USERS_REP',
      type: 'constant',
      info: 'OS users response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'OS_VERSION_REP',
      type: 'constant',
      info: 'OS version response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'PCAP_LIST_INTERFACES_REP',
      type: 'constant',
      info: 'PCAP list interfaces response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'PROCESS_ENVIRONMENT',
      type: 'constant',
      info: 'Process environment variables',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'RECEIPT',
      type: 'constant',
      info: 'Receipt confirmation',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'REGISTRY_CREATE',
      type: 'constant',
      info: 'Registry key creation',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'REGISTRY_DELETE',
      type: 'constant',
      info: 'Registry key deletion',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'REGISTRY_LIST_REP',
      type: 'constant',
      info: 'Registry list response',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'REGISTRY_WRITE',
      type: 'constant',
      info: 'Registry key write',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'REJOIN_NETWORK',
      type: 'constant',
      info: 'Sensor rejoined network',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'REMOTE_PROCESS_HANDLE',
      type: 'constant',
      info: 'Remote process handle access',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'SEGREGATE_NETWORK',
      type: 'constant',
      info: 'Sensor network segregation',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'SENSITIVE_PROCESS_ACCESS',
      type: 'constant',
      info: 'Sensitive process access',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'SERVICE_CHANGE',
      type: 'constant',
      info: 'Service state change',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'SHUTTING_DOWN',
      type: 'constant',
      info: 'Sensor shutting down',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'SSH_LOGIN',
      type: 'constant',
      info: 'SSH login event',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'SSH_LOGOUT',
      type: 'constant',
      info: 'SSH logout event',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'STARTING_UP',
      type: 'constant',
      info: 'Sensor starting up',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'TERMINATE_PROCESS',
      type: 'constant',
      info: 'Process termination',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'TERMINATE_TCP4_CONNECTION',
      type: 'constant',
      info: 'TCP IPv4 connection termination',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'TERMINATE_TCP6_CONNECTION',
      type: 'constant',
      info: 'TCP IPv6 connection termination',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'TERMINATE_UDP4_CONNECTION',
      type: 'constant',
      info: 'UDP IPv4 connection termination',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'TERMINATE_UDP6_CONNECTION',
      type: 'constant',
      info: 'UDP IPv6 connection termination',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'THREAD_INJECTION',
      type: 'constant',
      info: 'Thread injection detected',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'USER_LOGIN',
      type: 'constant',
      info: 'User login event',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'USER_LOGOUT',
      type: 'constant',
      info: 'User logout event',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'USER_OBSERVED',
      type: 'constant',
      info: 'User activity observed',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'VOLUME_MOUNT',
      type: 'constant',
      info: 'Volume mount event',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'VOLUME_UNMOUNT',
      type: 'constant',
      info: 'Volume unmount event',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'WEL',
      type: 'constant',
      info: 'Windows Event Logs',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'YARA_DETECTION',
      type: 'constant',
      info: 'YARA rule detection',
      editor: 'detect',
      field: 'event',
    },

    // Platform (non-sensor) event types - available via various targets
    {
      label: 'ACK_MESSAGES',
      type: 'constant',
      info: 'Acknowledge messages event (used by some LC Sensors like USP)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'BACKOFF',
      type: 'constant',
      info: 'Flow control event - provides seconds sensor should wait before sending events',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'billing_record',
      type: 'constant',
      info: 'Billable records event for the Organization (billing target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'CLOUD_ADAPTER_DISABLED',
      type: 'constant',
      info: 'Cloud Adapter disabled due to errors',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'QUOTA_CHANGED',
      type: 'constant',
      info: 'Organization quota changed event',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'RUN',
      type: 'constant',
      info: 'Emitted after run command (payload, shell command, etc.)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'SELF_TEST_RESULT',
      type: 'constant',
      info: 'Power-on-self-test (POST) result from sensor',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'SENSOR_CRASH',
      type: 'constant',
      info: 'Sensor crash event with telemetry data',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'SET_PERFORMANCE_MODE',
      type: 'constant',
      info: 'Performance mode enabled in kernel (e.g., disables file tracking)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'SYNC',
      type: 'constant',
      info: 'Heartbeat event to cloud (sent every 10 minutes by default)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'UNLOAD_KERNEL',
      type: 'constant',
      info: 'Manual unloading of kernel component',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'UPDATE',
      type: 'constant',
      info: 'Configuration update for specific collector within endpoint',
      editor: 'detect',
      field: 'event',
    },

    // Common event paths (for path: field)
    {
      label: 'event/FILE_PATH',
      type: 'string',
      info: 'Executable path',
      editor: 'detect',
      field: 'path',
    },
    {
      label: 'event/COMMAND_LINE',
      type: 'string',
      info: 'Command line args',
      editor: 'detect',
      field: 'path',
    },
    {
      label: 'event/USER_NAME',
      type: 'string',
      info: 'User account',
      editor: 'detect',
      field: 'path',
    },
    { label: 'event/HASH', type: 'string', info: 'File hash', editor: 'detect', field: 'path' },
    {
      label: 'routing/hostname',
      type: 'string',
      info: 'Sensor hostname',
      editor: 'detect',
      field: 'path',
    },
    {
      label: 'routing/event_type',
      type: 'string',
      info: 'Event type, e.g., NEW_PROCESS',
      editor: 'detect',
      field: 'path',
    },
    {
      label: 'routing/sid',
      type: 'string',
      info: 'Sensor ID',
      editor: 'detect',
      field: 'path',
    },
    {
      label: 'routing/oid',
      type: 'string',
      info: 'Organization ID',
      editor: 'detect',
      field: 'path',
    },

    // Platform names (for name: field when using is platform operator)
    {
      label: 'windows',
      type: 'constant',
      info: 'Windows platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'linux',
      type: 'constant',
      info: 'Linux platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'macos',
      type: 'constant',
      info: 'macOS platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'ios',
      type: 'constant',
      info: 'iOS platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'android',
      type: 'constant',
      info: 'Android platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'chrome',
      type: 'constant',
      info: 'Chrome platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'vpn',
      type: 'constant',
      info: 'VPN platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'text',
      type: 'constant',
      info: 'Text platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'json',
      type: 'constant',
      info: 'JSON platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'gcp',
      type: 'constant',
      info: 'Google Cloud Platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'aws',
      type: 'constant',
      info: 'Amazon Web Services platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'carbon_black',
      type: 'constant',
      info: 'Carbon Black platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'crowdstrike',
      type: 'constant',
      info: 'CrowdStrike platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: '1password',
      type: 'constant',
      info: '1Password platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'office365',
      type: 'constant',
      info: 'Office 365 platform',
      editor: 'detect',
      field: 'name',
    },
    {
      label: 'msdefender',
      type: 'constant',
      info: 'Microsoft Defender platform',
      editor: 'detect',
      field: 'name',
    },

    // Target values (for target: field)
    {
      label: 'edr',
      type: 'constant',
      info: 'EDR target scope (default for endpoint detection rules)',
      editor: 'detect',
      field: 'target',
    },
    {
      label: 'detection',
      type: 'constant',
      info: 'Detection target scope (run rules on detections generated by other rules)',
      editor: 'detect',
      field: 'target',
    },
    {
      label: 'deployment',
      type: 'constant',
      info: 'Deployment target scope (sensor management events like enrollment, sensor_clone, deleted_sensor)',
      editor: 'detect',
      field: 'target',
    },
    {
      label: 'artifact',
      type: 'constant',
      info: 'Artifact target scope (parsed artifacts run through rule engine)',
      editor: 'detect',
      field: 'target',
    },
    {
      label: 'artifact_event',
      type: 'constant',
      info: 'Artifact event target scope (unparsed log lifecycle events like ingest, export_complete)',
      editor: 'detect',
      field: 'target',
    },
    {
      label: 'schedule',
      type: 'constant',
      info: 'Schedule target scope (scheduled rule execution)',
      editor: 'detect',
      field: 'target',
    },
    {
      label: 'audit',
      type: 'constant',
      info: 'Audit target scope (audit log events)',
      editor: 'detect',
      field: 'target',
    },
    {
      label: 'billing',
      type: 'constant',
      info: 'Billing target scope (billing-related events)',
      editor: 'detect',
      field: 'target',
    },

    // Artifact-specific properties (for artifact target)
    {
      label: 'artifact path',
      type: 'property',
      info: "Matches the start of the artifact's path string (e.g., /auth.log)",
      editor: 'detect',
    },
    {
      label: 'artifact type',
      type: 'property',
      info: "Matches the artifact's type string (e.g., pcap, zeek, auth, wel)",
      editor: 'detect',
    },
    {
      label: 'artifact source',
      type: 'property',
      info: "Matches the artifact's source string (e.g., hostname-123)",
      editor: 'detect',
    },

    // Common artifact types (for artifact type: field)
    {
      label: 'pcap',
      type: 'constant',
      info: 'Packet capture artifact type',
      editor: 'detect',
      field: 'artifact type',
    },
    {
      label: 'zeek',
      type: 'constant',
      info: 'Zeek network analysis artifact type',
      editor: 'detect',
      field: 'artifact type',
    },
    {
      label: 'auth',
      type: 'constant',
      info: 'Authentication log artifact type',
      editor: 'detect',
      field: 'artifact type',
    },
    {
      label: 'wel',
      type: 'constant',
      info: 'Windows Event Log artifact type',
      editor: 'detect',
      field: 'artifact type',
    },
    {
      label: 'syslog',
      type: 'constant',
      info: 'System log artifact type',
      editor: 'detect',
      field: 'artifact type',
    },
    {
      label: 'nginx',
      type: 'constant',
      info: 'Nginx log artifact type',
      editor: 'detect',
      field: 'artifact type',
    },
    {
      label: 'apache',
      type: 'constant',
      info: 'Apache log artifact type',
      editor: 'detect',
      field: 'artifact type',
    },
    {
      label: 'firewall',
      type: 'constant',
      info: 'Firewall log artifact type',
      editor: 'detect',
      field: 'artifact type',
    },

    // Common deployment events (for deployment target)
    {
      label: 'enrollment',
      type: 'constant',
      info: 'Sensor enrollment event',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'sensor_clone',
      type: 'constant',
      info: 'Sensor clone detected event (duplicate sensor IDs)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'sensor_over_quota',
      type: 'constant',
      info: 'Sensor over quota event',
      editor: 'detect',
      field: 'event',
    },

    // Common artifact lifecycle events (for artifact_event target)
    {
      label: 'ingest',
      type: 'constant',
      info: 'Artifact ingestion event',
      editor: 'detect',
      field: 'event',
    },
    {
      label: 'export_complete',
      type: 'constant',
      info: 'Artifact export completion event',
      editor: 'detect',
      field: 'event',
    },

    // Resource paths (for resource: field when using lookup operator)
    {
      label: 'lcr://lookup/dyn-dns',
      type: 'string',
      info: 'Dynamic DNS domains resource',
      editor: 'detect',
      field: 'resource',
    },
    {
      label: 'lcr://lookup/linux-malware-hashes',
      type: 'string',
      info: 'Linux malware file hashes resource',
      editor: 'detect',
      field: 'resource',
    },
    {
      label: 'lcr://lookup/netfilter-ip-ioc',
      type: 'string',
      info: 'Netfilter IP indicators of compromise resource',
      editor: 'detect',
      field: 'resource',
    },
    {
      label: 'lcr://lookup/ransomware-domains',
      type: 'string',
      info: 'Ransomware domains resource',
      editor: 'detect',
      field: 'resource',
    },
    {
      label: 'lcr://lookup/tor-ips',
      type: 'string',
      info: 'Tor IP addresses resource',
      editor: 'detect',
      field: 'resource',
    },

    // Common timezones (for tz: field in time descriptors)
    {
      label: 'UTC',
      type: 'constant',
      info: 'Coordinated Universal Time',
      editor: 'detect',
      field: 'tz',
    },
    {
      label: 'America/New_York',
      type: 'constant',
      info: 'Eastern Time (US & Canada)',
      editor: 'detect',
      field: 'tz',
    },
    {
      label: 'America/Chicago',
      type: 'constant',
      info: 'Central Time (US & Canada)',
      editor: 'detect',
      field: 'tz',
    },
    {
      label: 'America/Denver',
      type: 'constant',
      info: 'Mountain Time (US & Canada)',
      editor: 'detect',
      field: 'tz',
    },
    {
      label: 'America/Los_Angeles',
      type: 'constant',
      info: 'Pacific Time (US & Canada)',
      editor: 'detect',
      field: 'tz',
    },
    {
      label: 'Europe/London',
      type: 'constant',
      info: 'Greenwich Mean Time',
      editor: 'detect',
      field: 'tz',
    },
    {
      label: 'Europe/Paris',
      type: 'constant',
      info: 'Central European Time',
      editor: 'detect',
      field: 'tz',
    },
    {
      label: 'Asia/Tokyo',
      type: 'constant',
      info: 'Japan Standard Time',
      editor: 'detect',
      field: 'tz',
    },
    {
      label: 'Asia/Shanghai',
      type: 'constant',
      info: 'China Standard Time',
      editor: 'detect',
      field: 'tz',
    },
    {
      label: 'Australia/Sydney',
      type: 'constant',
      info: 'Australian Eastern Standard Time',
      editor: 'detect',
      field: 'tz',
    },

    // Common deployment event values
    {
      label: 'deleted_sensor',
      type: 'constant',
      info: 'Deleted sensor event type value',
      editor: 'detect',
      field: 'value',
    },

    // === RESPOND EDITOR ONLY ===

    // Response structure and action-specific parameters
    { label: 'action', type: 'property', info: 'Response action type', editor: 'respond' },

    // Parameters for specific action types (when inside action blocks)
    {
      label: 'name',
      type: 'property',
      info: 'Detection name',
      editor: 'respond',
      actionContext: ['report'],
    },
    {
      label: 'publish',
      type: 'property',
      info: 'Whether to publish the detection (true/false, defaults to true)',
      editor: 'respond',
      actionContext: ['report'],
    },
    {
      label: 'priority',
      type: 'property',
      info: 'Detection priority (integer, optional)',
      editor: 'respond',
      actionContext: ['report'],
    },
    {
      label: 'metadata',
      type: 'property',
      info: 'Free-form metadata for the detection (supports templating)',
      editor: 'respond',
      actionContext: ['report'],
    },
    {
      label: 'detect_data',
      type: 'property',
      info: 'Additional free-form field for extraction of specific elements (supports templating)',
      editor: 'respond',
      actionContext: ['report'],
    },
    {
      label: 'tag',
      type: 'property',
      info: 'Tag name',
      editor: 'respond',
      actionContext: ['add tag', 'remove tag', 'add hive tag', 'remove hive tag'],
    },
    {
      label: 'ttl',
      type: 'property',
      info: 'Time to live (seconds)',
      editor: 'respond',
      actionContext: ['add tag', 'add var'],
    },
    {
      label: 'entire_device',
      type: 'property',
      info: 'Apply tag to all sensors on the device (true/false)',
      editor: 'respond',
      actionContext: ['add tag'],
    },
    {
      label: 'command',
      type: 'property',
      info: 'Sensor command (supports templating like {{ .event.FILE_PATH }})',
      editor: 'respond',
      actionContext: ['task'],
    },
    {
      label: 'investigation',
      type: 'property',
      info: 'Unique identifier for the task and any events emitted from the sensor as a result',
      editor: 'respond',
      actionContext: ['task'],
    },
    {
      label: 'duration',
      type: 'property',
      info: 'Duration to wait (e.g., "10s", "30s", "1m" or integer seconds, max 1 minute)',
      editor: 'respond',
      actionContext: ['wait'],
    },
    {
      label: 'suppression',
      type: 'property',
      info: 'Suppression configuration to reduce frequency of repetitive alerts',
      editor: 'respond',
      actionContext: ['report', 'add tag', 'task', 'isolate'],
    },
    {
      label: 'name',
      type: 'property',
      info: 'Variable name',
      editor: 'respond',
      actionContext: ['add var', 'del var'],
    },
    {
      label: 'name',
      type: 'property',
      info: 'Output name',
      editor: 'respond',
      actionContext: ['output'],
    },
    {
      label: 'value',
      type: 'property',
      info: 'Variable value',
      editor: 'respond',
      actionContext: ['add var'],
    },
    {
      label: 'extension name',
      type: 'property',
      info: 'Name of the extension to request',
      editor: 'respond',
      actionContext: ['extension request'],
    },
    {
      label: 'extension action',
      type: 'property',
      info: 'Action to trigger on the extension',
      editor: 'respond',
      actionContext: ['extension request'],
    },
    {
      label: 'extension request',
      type: 'property',
      info: 'Request parameters to send to the extension',
      editor: 'respond',
      actionContext: ['extension request'],
    },
    {
      label: 'hive name',
      type: 'property',
      info: 'Name of the Hive to operate on (e.g., dr-general)',
      editor: 'respond',
      actionContext: ['add hive tag', 'remove hive tag'],
    },
    {
      label: 'record name',
      type: 'property',
      info: 'Name of the record within the Hive (e.g., my-rule)',
      editor: 'respond',
      actionContext: ['add hive tag', 'remove hive tag'],
    },
    {
      label: 'tag',
      type: 'property',
      info: 'Tag name for Hive record tagging',
      editor: 'respond',
      actionContext: ['add hive tag', 'remove hive tag'],
    },

    // Suppression properties (for suppression: field)
    {
      label: 'max_count',
      type: 'property',
      info: 'Maximum number of times action can execute during the period',
      editor: 'respond',
    },
    {
      label: 'min_count',
      type: 'property',
      info: 'Minimum number of activations required before action triggers (threshold activation)',
      editor: 'respond',
    },
    {
      label: 'count_path',
      type: 'property',
      info: 'Path to integer value used to increment suppression counter (e.g., event/record/v)',
      editor: 'respond',
    },
    {
      label: 'period',
      type: 'property',
      info: 'Time period for suppression (e.g., 1h, 30m, 300s)',
      editor: 'respond',
    },
    {
      label: 'is_global',
      type: 'property',
      info: 'Whether suppression operates globally within org (true) or per-sensor (false)',
      editor: 'respond',
    },
    {
      label: 'keys',
      type: 'property',
      info: 'List of template strings for uniqueness key (supports {{ .event.FIELD }} templating)',
      editor: 'respond',
    },

    // Common actions (for action: field)
    {
      label: 'report',
      type: 'keyword',
      info: 'Generate detection alert',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'add tag',
      type: 'keyword',
      info: 'Tag the sensor',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'remove tag',
      type: 'keyword',
      info: 'Remove tag from the sensor',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'task',
      type: 'keyword',
      info: 'Execute sensor command',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'isolate network',
      type: 'keyword',
      info: 'Persistently isolate sensor from network (survives reboots)',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'add var',
      type: 'keyword',
      info: 'Add variable to sensor',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'del var',
      type: 'keyword',
      info: 'Delete variable from sensor',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'extension request',
      type: 'keyword',
      info: 'Perform asynchronous request to subscribed extension',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'seal',
      type: 'keyword',
      info: 'Persistently seal sensor with tamper resistance (survives reboots)',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'unseal',
      type: 'keyword',
      info: 'Remove seal status from sensor',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'output',
      type: 'keyword',
      info: 'Output custom data',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'rejoin network',
      type: 'keyword',
      info: 'Removes the isolation status of a sensor that had it set using isolate network',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'undelete sensor',
      type: 'keyword',
      info: 'Un-deletes a sensor that was previously deleted (allows sensors to rejoin the fleet)',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'wait',
      type: 'keyword',
      info: 'Add delay (up to 1 minute) before running the next response action',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'add hive tag',
      type: 'keyword',
      info: 'Adds a tag to a Hive record (useful for marking D&R rules automatically)',
      editor: 'respond',
      field: 'action',
    },
    {
      label: 'remove hive tag',
      type: 'keyword',
      info: 'Removes a tag from a Hive record',
      editor: 'respond',
      field: 'action',
    },

    // Common commands (for command: field)
    {
      label: 'history_dump',
      type: 'constant',
      info: 'Get process history',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'file_get',
      type: 'constant',
      info: 'Download file',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'file_hash',
      type: 'constant',
      info: 'Hash file',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'artifact_get {{ .event.FILE_PATH }}',
      type: 'template',
      info: 'Download file using templated path',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'file_get {{ .event.FILE_PATH }}',
      type: 'template',
      info: 'Get file using templated path',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'file_hash {{ .event.FILE_PATH }}',
      type: 'template',
      info: 'Hash file using templated path',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'dir_list {{ .event.FILE_PATH }}',
      type: 'template',
      info: 'List directory contents using templated path',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'reg_list {{ .event.REGISTRY_KEY }}',
      type: 'template',
      info: 'List registry key using templated path',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'process_list',
      type: 'constant',
      info: 'List all running processes',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'network_list',
      type: 'constant',
      info: 'List network connections',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'mem_map {{ .event.PROCESS_ID }}',
      type: 'template',
      info: 'Get memory map of specific process',
      editor: 'respond',
      field: 'command',
    },
    {
      label: 'yara_scan {{ .event.FILE_PATH }}',
      type: 'template',
      info: 'YARA scan specific file',
      editor: 'respond',
      field: 'command',
    },

    // Template functions (for name:, value:, command:, investigation: fields, and suppression keys)
    {
      label: '{{ .routing.hostname }}',
      type: 'template',
      info: 'Sensor hostname',
      editor: 'respond',
      field: ['name', 'value', 'command', 'investigation', 'keys'],
    },
    {
      label: '{{ .event.FILE_PATH }}',
      type: 'template',
      info: 'Event file path',
      editor: 'respond',
      field: ['name', 'value', 'command', 'investigation', 'keys'],
    },
    {
      label: '{{ .event.COMMAND_LINE }}',
      type: 'template',
      info: 'Event command line',
      editor: 'respond',
      field: ['name', 'value', 'command', 'investigation', 'keys'],
    },
    {
      label: '{{ .event.USER_NAME }}',
      type: 'template',
      info: 'Event user name',
      editor: 'respond',
      field: ['name', 'value', 'command', 'investigation', 'keys'],
    },
    {
      label: '{{ .event.HASH }}',
      type: 'template',
      info: 'Event file hash',
      editor: 'respond',
      field: ['name', 'value', 'command', 'investigation', 'keys'],
    },
    {
      label: '{{ .event.PROCESS_ID }}',
      type: 'template',
      info: 'Event process ID',
      editor: 'respond',
      field: ['name', 'value', 'command', 'investigation', 'keys'],
    },
    {
      label: '{{ .routing.sid }}',
      type: 'template',
      info: 'Sensor ID',
      editor: 'respond',
      field: ['name', 'value', 'command', 'investigation', 'keys'],
    },
    {
      label: '{{ .routing.oid }}',
      type: 'template',
      info: 'Organization ID',
      editor: 'respond',
      field: ['name', 'value', 'command', 'investigation', 'keys'],
    },
    {
      label: 'susp-process-inv',
      type: 'constant',
      info: 'Suspicious process investigation identifier',
      editor: 'respond',
      field: 'investigation',
    },
    {
      label: 'malware-{{ .event.HASH }}',
      type: 'template',
      info: 'Malware investigation with hash identifier',
      editor: 'respond',
      field: 'investigation',
    },
    {
      label: 'incident-{{ .routing.hostname }}-{{ .event.PROCESS_ID }}',
      type: 'template',
      info: 'Incident investigation with hostname and process ID',
      editor: 'respond',
      field: 'investigation',
    },
    {
      label: 'forensic-{{ .routing.sid }}',
      type: 'template',
      info: 'Forensic investigation with sensor ID',
      editor: 'respond',
      field: 'investigation',
    },
    {
      label: 'sensor-mgmt-{{ .routing.hostname }}',
      type: 'template',
      info: 'Sensor management investigation with hostname',
      editor: 'respond',
      field: 'investigation',
    },

    // Duration values for wait action (for duration: field)
    {
      label: '5s',
      type: 'constant',
      info: '5 seconds duration',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '10s',
      type: 'constant',
      info: '10 seconds duration',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '15s',
      type: 'constant',
      info: '15 seconds duration',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '30s',
      type: 'constant',
      info: '30 seconds duration',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '45s',
      type: 'constant',
      info: '45 seconds duration',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '1m',
      type: 'constant',
      info: '1 minute duration (60 seconds)',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '500ms',
      type: 'constant',
      info: '500 milliseconds duration',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '1000ms',
      type: 'constant',
      info: '1000 milliseconds (1 second) duration',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '2s',
      type: 'constant',
      info: '2 seconds duration',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '5',
      type: 'constant',
      info: '5 seconds (integer format)',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '10',
      type: 'constant',
      info: '10 seconds (integer format)',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '30',
      type: 'constant',
      info: '30 seconds (integer format)',
      editor: 'respond',
      field: 'duration',
    },
    {
      label: '60',
      type: 'constant',
      info: '60 seconds (integer format)',
      editor: 'respond',
      field: 'duration',
    },

    // Hive name values
    {
      label: 'dr-general',
      type: 'constant',
      info: 'General detection rules hive',
      editor: 'respond',
      field: 'hive name',
    },

    // Record name examples
    {
      label: 'my-rule',
      type: 'constant',
      info: 'Example record name',
      editor: 'respond',
      field: 'record name',
    },

    // Additional common tag values for hive operations
    {
      label: 'high-volume',
      type: 'constant',
      info: 'High volume tag for hive records such as D&R rules',
      editor: 'respond',
      field: 'tag',
      actionContext: ['add hive tag', 'remove hive tag'],
    },

    // Wildcard pattern events (platform events with organization-specific suffixes)
    {
      label: '*_per_cloud_adapter',
      type: 'constant',
      info: 'Wildcard pattern for cloud adapter-specific events',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '*_per_org',
      type: 'constant',
      info: 'Wildcard pattern for organization-specific events',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '*_per_sensor',
      type: 'constant',
      info: 'Wildcard pattern for sensor-specific events',
      editor: 'detect',
      field: 'event',
    },

    // Schedule events (for schedule target) - triggered automatically at intervals
    {
      label: '30m_per_org',
      type: 'constant',
      info: 'Schedule event: every 30 minutes per organization (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '30m_per_sensor',
      type: 'constant',
      info: 'Schedule event: every 30 minutes per sensor (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '1h_per_org',
      type: 'constant',
      info: 'Schedule event: every 1 hour per organization (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '1h_per_sensor',
      type: 'constant',
      info: 'Schedule event: every 1 hour per sensor (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '3h_per_org',
      type: 'constant',
      info: 'Schedule event: every 3 hours per organization (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '3h_per_sensor',
      type: 'constant',
      info: 'Schedule event: every 3 hours per sensor (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '6h_per_org',
      type: 'constant',
      info: 'Schedule event: every 6 hours per organization (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '6h_per_sensor',
      type: 'constant',
      info: 'Schedule event: every 6 hours per sensor (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '12h_per_org',
      type: 'constant',
      info: 'Schedule event: every 12 hours per organization (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '12h_per_sensor',
      type: 'constant',
      info: 'Schedule event: every 12 hours per sensor (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '24h_per_org',
      type: 'constant',
      info: 'Schedule event: every 24 hours (daily) per organization (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '24h_per_sensor',
      type: 'constant',
      info: 'Schedule event: every 24 hours (daily) per sensor (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '168h_per_org',
      type: 'constant',
      info: 'Schedule event: every 168 hours (weekly) per organization (schedule target)',
      editor: 'detect',
      field: 'event',
    },
    {
      label: '168h_per_sensor',
      type: 'constant',
      info: 'Schedule event: every 168 hours (weekly) per sensor (schedule target)',
      editor: 'detect',
      field: 'event',
    },
  ]

  // Filter by active editor first
  let editorFiltered = completions.filter(
    (comp) => comp.editor === activeEditor || comp.editor === 'both',
  )

  // Filter by field context if we're after a colon
  if (isAfterColon && fieldContext) {
    // In a field context - only show values for that specific field
    editorFiltered = editorFiltered.filter((comp) => {
      if (!comp.field) return false

      if (Array.isArray(comp.field)) {
        return comp.field.includes(fieldContext)
      }
      return comp.field === fieldContext
    })
  } else {
    // Not in a field context - show structural properties
    editorFiltered = editorFiltered.filter((comp) => {
      if (comp.field) return false // Don't show field-specific values

      // If we're inside an action block, filter by action context
      if (insideActionBlock && comp.actionContext) {
        return comp.actionContext.includes(insideActionBlock)
      }

      // If we have actionContext requirement but we're not in an action block, don't show
      if (comp.actionContext && !insideActionBlock) {
        return false
      }

      return true
    })
  }

  // Filter by search term
  const searchFiltered = editorFiltered.filter((comp) =>
    comp.label.toLowerCase().includes(word.text.toLowerCase()),
  )

  return {
    from: word.from,
    options: searchFiltered,
  }
}

// Reactive state
const currentRule = reactive({
  id: null as string | null,
  name: '',
  description: '',
  detectLogic: '',
  respondLogic: '',
  created: '',
  modified: '',
})

// Track if component is still initializing
const isInitializing = ref(true)

const savedRules = ref<DetectionRule[]>([])
const validationResult = ref('')
const showLoadRuleModal = ref(false)
const showEventSchemasModal = ref(false)
const showImportIaCModal = ref(false)
const _savedRulesUpdateTrigger = ref(0) // Reactive trigger for localStorage changes

// Import from IaC functionality
const iacImportContent = ref('')
const isImportingIaC = ref(false)
const iacImportResult = ref<{
  success: boolean
  message: string
  importedRules: Array<{ name: string; success: boolean; error?: string }>
} | null>(null)

// Event Schemas functionality
const selectedEventType = ref('')
const selectedPrefix = ref('evt') // Default to 'evt' prefix
const selectedOrgForSchema = ref('') // Organization selected for schema fetching
const eventSchema = ref<{
  eventType: string
  elements: Array<{
    type: 'integer' | 'string' | 'boolean'
    path: string
  }>
} | null>(null)
const isLoadingSchema = ref(false)
const schemaError = ref('')
const availableSchemas = ref<string[]>([])
const isLoadingSchemas = ref(false)

// Event schema prefix options
const schemaPrefixOptions = [
  {
    value: 'evt',
    label: 'Event',
    description: 'Standard sensor events (NEW_PROCESS, FILE_CREATE, etc.)',
  },
  { value: 'dep', label: 'Deployment Event', description: 'Deployment lifecycle events' },
  { value: 'det', label: 'Detection', description: 'Detection rule outputs and alerts' },
  { value: 'art', label: 'Artifact Event', description: 'File and artifact processing events' },
  {
    value: 'sched',
    label: 'Scheduling Events',
    description: 'Scheduled task and automation events',
  },
]

// Computed property to filter schemas by selected prefix
const filteredSchemas = computed(() => {
  if (!selectedPrefix.value) {
    return availableSchemas.value.slice().sort()
  }

  return availableSchemas.value
    .filter((schema) => {
      // Handle different prefix formats that might exist in the API response
      const prefixPattern = `${selectedPrefix.value}:`
      return (
        schema.startsWith(prefixPattern) ||
        (!schema.includes(':') && selectedPrefix.value === 'evt')
      ) // Default to evt for unprefixed schemas
    })
    .sort()
})

// Computed property for organizations available for schema fetching
const availableOrgsForSchema = computed(() => {
  return storage.organizations.value || []
})

// Storage keys
const DRAFT_STORAGE_KEY = 'detectionforge_detection_draft' // Changed to be more specific
const DETECTION_RULES_KEY = 'detectionforge_detection_rules'

function saveDraft() {
  // Always save current state for persistence across navigation
  const draft = {
    id: currentRule.id, // Include ID to distinguish loaded rules from drafts
    name: currentRule.name,
    description: currentRule.description,
    detectLogic: currentRule.detectLogic,
    respondLogic: currentRule.respondLogic,
    unitTests: unitTests.value.map((test) => ({
      id: test.id,
      name: test.name,
      eventData: test.eventData,
      expectedMatch: test.expectedMatch,
      isCollapsed: test.isCollapsed || false,
    })), // Exclude test results from draft - they're ephemeral
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

function loadDraft() {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (stored) {
      const draft = JSON.parse(stored)
      currentRule.id = draft.id || null // Restore ID if it exists
      currentRule.name = draft.name || ''
      currentRule.description = draft.description || ''
      currentRule.detectLogic = draft.detectLogic || ''
      currentRule.respondLogic = draft.respondLogic || ''

      // Load unit tests from draft if they exist
      if (draft.unitTests && Array.isArray(draft.unitTests)) {
        unitTests.value = draft.unitTests
      }
    }
  } catch (error) {
    // Failed to load draft from localStorage - silently ignore
    void error // Suppress unused variable warning
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY)
}

function hasDraftContent(): boolean {
  return !!(
    currentRule.name.trim() ||
    currentRule.description.trim() ||
    currentRule.detectLogic.trim() ||
    currentRule.respondLogic.trim() ||
    unitTests.value.length > 0
  )
}

// Helper function to compare unit tests
function areUnitTestsEqual(current: UnitTest[], saved: UnitTest[] | undefined): boolean {
  if (!saved && current.length === 0) return true
  if (!saved || current.length !== saved.length) return false

  return current.every((currentTest, index) => {
    const savedTest = saved[index]
    return (
      currentTest.name === savedTest.name &&
      currentTest.eventData === savedTest.eventData &&
      currentTest.expectedMatch === savedTest.expectedMatch
    )
  })
}

const hasUnsavedChanges = computed(() => {
  // Use the trigger to ensure reactivity when localStorage changes
  void _savedRulesUpdateTrigger.value

  // If there's no current rule ID, it's a new rule with content
  if (!currentRule.id) {
    return hasDraftContent()
  }

  // If there's a rule ID, compare current content with saved version
  const savedRulesList = JSON.parse(localStorage.getItem(DETECTION_RULES_KEY) || '[]')
  const savedRule = savedRulesList.find((r: DetectionRule) => r.id === currentRule.id)

  if (!savedRule) {
    // Rule ID exists but saved rule not found - treat as new rule
    return hasDraftContent()
  }

  // Compare current values with saved values (trim strings for consistent comparison)
  return (
    currentRule.name.trim() !== (savedRule.name || '').trim() ||
    currentRule.description.trim() !== (savedRule.description || '').trim() ||
    currentRule.detectLogic.trim() !== (savedRule.detectLogic || '').trim() ||
    currentRule.respondLogic.trim() !== (savedRule.respondLogic || '').trim() ||
    !areUnitTestsEqual(unitTests.value, savedRule.unitTests)
  )
})
const showUnitTests = ref(false)

// Unit Tests
const unitTests = ref<UnitTest[]>([])
const isRunningTests = ref(false)
const overallTestResults = ref<OverallTestResults | null>(null)

// Backtesting
const showBacktest = ref(false)
const isRunningBacktest = ref(false)
const backtestProgress = ref({ current: 0, total: 0, currentOrgName: '', currentOid: '' })
const backtestResults = ref<BacktestResults | null>(null)
const displayedResults = ref(10) // Start by showing 10 results
const expandedMatches = ref(new Set<string>()) // Changed to string to support org-match format
const activeMatchTab = ref<Record<string, string>>({}) // Changed to string keys
const expandedOrgResults = ref(new Set<number>()) // Track which org results are expanded
const orgDisplayedResults = ref<Record<number, number>>({}) // Track displayed results per org

// Backtest-specific organization selection
const backtestSelectedOids = ref<string[]>([])

const backtestConfig = reactive({
  startDateTime: '',
  endDateTime: '',
  eventLimit: 0,
  evalLimit: 0,
})

// Computed property to check if backtest can run
const canRunBacktest = computed(() => {
  return (
    backtestConfig.startDateTime &&
    backtestConfig.endDateTime &&
    currentRule.detectLogic.trim() &&
    backtestSelectedOids.value.length > 0 &&
    new Date(backtestConfig.startDateTime) < new Date(backtestConfig.endDateTime)
  )
})

// Computed property to get available organizations for backtest selection
const availableOrgsForBacktest = computed(() => {
  return storage.organizations.value || []
})

// Initialize backtest org selection when organizations change
watch(
  () => storage.organizations.value,
  (newOrgs) => {
    if (newOrgs && newOrgs.length > 0 && backtestSelectedOids.value.length === 0) {
      // Auto-select all organizations initially for backtest
      backtestSelectedOids.value = newOrgs.map((org) => org.oid)
    }
  },
  { immediate: true },
)

// Functions to manage backtest organization selection
function toggleBacktestOrg(oid: string) {
  const index = backtestSelectedOids.value.indexOf(oid)
  if (index > -1) {
    backtestSelectedOids.value.splice(index, 1)
  } else {
    backtestSelectedOids.value.push(oid)
  }
}

function selectAllBacktestOrgs() {
  backtestSelectedOids.value = availableOrgsForBacktest.value.map((org) => org.oid)
}

function deselectAllBacktestOrgs() {
  backtestSelectedOids.value = []
}

interface UnitTest {
  id: string
  name: string
  eventData: string
  expectedMatch: boolean
  result?: TestResult
  showDetails?: boolean
  isCollapsed?: boolean
}

interface TestResult {
  didMatch: boolean
  passed: boolean
  formattedResponse: string
  rawResponse: BacktestResponse | null
}

interface OverallTestResults {
  total: number
  passed: number
  failed: number
  successRate: number
}

interface DetectionRule {
  id: string
  name: string
  description: string
  detectLogic: string
  respondLogic: string
  created: string
  modified: string
  unitTests?: UnitTest[]
}

interface BacktestResults {
  completedAt: string
  orgResults: BacktestOrgResult[]
  totalStats: {
    n_proc: number
    n_eval: number
    totalMatches: number
    wall_time: number
  }
}

interface BacktestResponse {
  did_match?: boolean
  results?: BacktestMatch[]
  stats?: {
    n_proc: number
    n_eval: number
    wall_time: number
    n_scan?: number
    n_bytes_scan?: number
  }
  trace?: string[]
  traces?: (string[] | string)[]
}

interface BacktestOrgResult {
  oid: string
  orgName: string
  status: 'success' | 'error'
  error?: string
  stats?: {
    n_scan: number
    n_bytes_scan: number
    n_proc: number
    n_shard: number
    n_eval: number
    wall_time: number
    cummulative_time: number
    sid_resolution_time: number
    n_batch_access: number
    n_billed: number
    n_free: number
  }
  results?: BacktestMatch[]
  did_match?: boolean
  is_dry_run?: boolean
}

interface BacktestMatch {
  action: string
  data: {
    cat: string
    detect: {
      event: Record<string, unknown>
      routing: Record<string, unknown>
      ts: string
    }
    detect_id: string
    gen_time: number
    link?: string
    mtd: Record<string, unknown>
    routing: Record<string, unknown>
    source: string
    source_rule: string
  }
}

// Initialize editors on mount
onMounted(async () => {
  // Load draft content first
  loadDraft()

  await nextTick()

  // CodeMirror v6 Extensions for YAML editing
  const baseExtensions = [
    yamlLang(),
    oneDark,
    lineNumbers(),
    foldGutter(),
    lintGutter(),
    yamlLinter,
    highlightActiveLine(),
    drawSelection(),
    bracketMatching(),
    closeBrackets(),
    autocompletion({
      override: [limaCharlieCompletions],
    }),
    search(),
    codeFolding(),
    // Configure line wrapping
    EditorView.lineWrapping,
    // Set fixed height and scrollable
    EditorView.theme({
      '&': {
        height: '400px',
        maxHeight: '400px',
      },
      '.cm-scroller': {
        fontFamily: 'Courier New, Monaco, Menlo, monospace',
        fontSize: '14px',
        lineHeight: '1.5',
      },
      '.cm-content': {
        padding: '10px',
        minHeight: '100%',
      },
      '.cm-focused': {
        outline: 'none',
      },
      // Enhanced bracket matching
      '.cm-matchingBracket': {
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderRadius: '2px',
      },
      '.cm-nonmatchingBracket': {
        backgroundColor: 'rgba(220, 53, 69, 0.2)',
        borderRadius: '2px',
      },
      // Enhanced search highlighting
      '.cm-searchMatch': {
        backgroundColor: 'rgba(255, 193, 7, 0.3)',
        border: '1px solid #ffc107',
        borderRadius: '2px',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(255, 193, 7, 0.5)',
      },
      // Line number improvements
      '.cm-lineNumbers': {
        color: '#6c757d',
        backgroundColor: '#f8f9fa',
        borderRight: '1px solid #e1e8ed',
        paddingRight: '8px',
        minWidth: '3em',
      },
      '.cm-lineNumbers .cm-activeLineGutter': {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        color: '#495057',
      },
    }),
    keymap.of([
      ...defaultKeymap,
      ...searchKeymap,
      ...foldKeymap,
      indentWithTab,
      // Custom shortcuts for YAML editing
      {
        key: 'Ctrl-/',
        run: ({ state, dispatch }) => {
          // Toggle line comments
          const changes = []
          for (const range of state.selection.ranges) {
            const line = state.doc.lineAt(range.from)
            const lineText = line.text
            if (lineText.trim().startsWith('#')) {
              // Remove comment
              const match = lineText.match(/^(\s*)# ?(.*)$/)
              if (match) {
                changes.push({
                  from: line.from,
                  to: line.to,
                  insert: match[1] + match[2],
                })
              }
            } else {
              // Add comment
              const match = lineText.match(/^(\s*)(.*)$/)
              if (match) {
                changes.push({
                  from: line.from,
                  to: line.to,
                  insert: match[1] + '# ' + match[2],
                })
              }
            }
          }
          if (changes.length > 0) {
            dispatch(state.update({ changes }))
          }
          return true
        },
      },
      // Format YAML shortcut
      {
        key: 'Shift-Alt-f',
        run: ({ state, dispatch }) => {
          try {
            const doc = state.doc.toString()
            const parsed = yaml.load(doc)
            const formatted = yaml.dump(parsed, {
              indent: 2,
              lineWidth: 80,
              noRefs: true,
            })
            dispatch(
              state.update({
                changes: { from: 0, to: state.doc.length, insert: formatted },
              }),
            )
            return true
          } catch {
            return false
          }
        },
      },
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !isInitializing.value) {
        // Handle document changes
        const editorElement = update.view.dom
        const isDetectEditor =
          editorElement.closest('.editor-panel')?.querySelector('textarea') ===
          detectEditorRef.value

        if (isDetectEditor) {
          currentRule.detectLogic = update.state.doc.toString()
        } else {
          currentRule.respondLogic = update.state.doc.toString()
        }

        // Clear test results when rule content changes as they're now invalid
        clearTestResults()

        debouncedSaveDraft()
      }
    }),
  ]

  if (detectEditorRef.value) {
    detectEditor = new EditorView({
      state: EditorState.create({
        doc: currentRule.detectLogic,
        extensions: baseExtensions,
      }),
      parent: detectEditorRef.value.parentElement!,
    })

    // Hide the original textarea
    detectEditorRef.value.style.display = 'none'
  }

  if (respondEditorRef.value) {
    respondEditor = new EditorView({
      state: EditorState.create({
        doc: currentRule.respondLogic,
        extensions: baseExtensions,
      }),
      parent: respondEditorRef.value.parentElement!,
    })

    // Hide the original textarea
    respondEditorRef.value.style.display = 'none'
  }

  loadSavedRules()

  // Add event listeners for page unload to ensure data is saved
  handleBeforeUnload = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    saveDraft() // Save immediately before unload
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('pagehide', handleBeforeUnload)

  // Mark initialization as complete
  isInitializing.value = false
})

// Handle page unload events
let handleBeforeUnload: (() => void) | null = null

// Cleanup event listeners on unmount
onUnmounted(() => {
  if (handleBeforeUnload) {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('pagehide', handleBeforeUnload)
  }

  // Final save before component unmount
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveDraft()
})

// Note: Auto-save is handled by CodeMirror event handlers for editor content
// and manual input events for name/description fields

// Debounced save function to prevent excessive localStorage writes
let saveTimeout: number | null = null
function debouncedSaveDraft() {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(saveDraft, 500) // Save after 500ms of inactivity
}

// Rule validation functions
function validateRule() {
  const detectLogic = currentRule.detectLogic.trim()
  const respondLogic = currentRule.respondLogic.trim()

  let isValid = true
  const errors: string[] = []

  try {
    if (detectLogic) {
      const detectErrors = validateDetectLogic(detectLogic)
      if (detectErrors) {
        errors.push(`Detect Logic: ${detectErrors}`)
        isValid = false
      }
    } else {
      errors.push('Detect logic cannot be empty')
      isValid = false
    }

    if (respondLogic) {
      const respondErrors = validateRespondLogic(respondLogic)
      if (respondErrors) {
        errors.push(`Respond Logic: ${respondErrors}`)
        isValid = false
      }
    }
  } catch (error: unknown) {
    errors.push('Invalid rule format: ' + (error instanceof Error ? error.message : String(error)))
    isValid = false
  }

  // Display validation results
  if (isValid && errors.length === 0) {
    validationResult.value =
      '<div class="rule-validation validation-success">✓ Rule validation passed! The rule structure appears to be valid.</div>'
    appStore.addNotification('success', 'Rule validation successful!')
  } else {
    validationResult.value = `<div class="rule-validation validation-error">✗ Validation failed:<br>• ${errors.join('<br>• ')}</div>`
    appStore.addNotification(
      'error',
      'Rule validation failed. Please check the errors above and reference guide below.',
    )
  }
}

interface DetectionRuleLogic {
  op: string
  path?: string
  value?: unknown
  event?: string
  events?: string[]
  rules?: DetectionRuleLogic[]
  target?: string
  [key: string]: unknown
}

function validateDetectLogic(
  detectLogicStr: string,
  requireTopLevelEvent = true,
  depth = 0,
): string | null {
  try {
    const rule = yaml.load(detectLogicStr) as DetectionRuleLogic

    if (Array.isArray(rule)) {
      return 'Operation should be a dictionary, not a list.'
    }

    if (!rule || typeof rule !== 'object' || !('op' in rule)) {
      return "Operation missing 'op' field."
    }

    // Check for top-level event or events requirement
    if (
      requireTopLevelEvent &&
      depth === 0 &&
      !('target' in rule && rule.target !== 'edr') &&
      !('event' in rule) &&
      !('events' in rule) &&
      !(
        rule.op === 'and' &&
        rule.rules &&
        rule.rules.length > 0 &&
        rule.rules[0].op === 'is tagged'
      )
    ) {
      return "Must specify either 'event' or 'events' at top level of rule, or have the top operator be an 'and' with its first 'rule' of 'is tagged'."
    }

    // Validate event field
    if (depth === 0 && 'event' in rule && typeof rule.event !== 'string') {
      return "'event' must be a string."
    }

    // Validate events field
    if (depth === 0 && 'events' in rule && !Array.isArray(rule.events)) {
      return "'events' must be a list."
    }

    // Check for both event and events
    if (depth === 0 && 'event' in rule && 'events' in rule) {
      return "Must specify either 'event' or 'events'; not both."
    }

    // Check nested event/events
    if (depth > 0 && ('event' in rule || 'events' in rule)) {
      return "'event' or 'events' must be specified at the root."
    }

    // Validate logical operators (and/or)
    if (['and', 'or'].includes(rule.op.toLowerCase())) {
      if (!('rules' in rule)) {
        return "'and' and 'or' ops require a 'rules' list of operations."
      }

      if (!Array.isArray(rule.rules)) {
        return "'rules' must be a list."
      }

      if (rule.rules.length < 2) {
        return "'and' and 'or' op require at least 2 rules."
      }

      // Recursively validate nested rules
      for (const nestedRule of rule.rules) {
        const nestedError = validateDetectLogic(
          yaml.dump(nestedRule),
          requireTopLevelEvent,
          depth + 1,
        )
        if (nestedError) {
          return nestedError
        }
      }
    }

    // Validate other operators
    const validOperators = [
      'and',
      'or',
      'is',
      'exists',
      'contains',
      'starts with',
      'ends with',
      'is greater than',
      'is lower than',
      'matches',
      'string distance',
      'is platform',
      'is tagged',
      'lookup',
      'scope',
      'cidr',
      'is private address',
      'is public address',
      'is 32 bit',
      'is 64 bit',
      'is arm',
      'is older than',
      'file name',
      'sub domain',
    ]

    if (!validOperators.includes(rule.op.toLowerCase())) {
      return `Unknown operator: '${rule.op}'. Valid operators are: ${validOperators.join(', ')}`
    }

    // Validate path requirement for most operators
    const pathRequiredOps = [
      'is',
      'exists',
      'contains',
      'starts with',
      'ends with',
      'is greater than',
      'is lower than',
      'matches',
      'string distance',
      'lookup',
      'cidr',
      'is private address',
      'is public address',
      'is older than',
      'file name',
      'sub domain',
    ]
    if (pathRequiredOps.includes(rule.op.toLowerCase()) && !('path' in rule)) {
      return `Operator '${rule.op}' requires a 'path' field.`
    }

    // Validate value requirement for comparison operators
    const valueRequiredOps = [
      'is',
      'contains',
      'starts with',
      'ends with',
      'is greater than',
      'is lower than',
      'string distance',
    ]
    if (valueRequiredOps.includes(rule.op.toLowerCase()) && !('value' in rule)) {
      return `Operator '${rule.op}' requires a 'value' field.`
    }

    // Validate re requirement for matches operator
    if (rule.op.toLowerCase() === 'matches' && !('re' in rule)) {
      return "Operator 'matches' requires a 're' field with the regular expression pattern."
    }

    // Validate seconds requirement for is older than operator
    if (rule.op.toLowerCase() === 'is older than' && !('seconds' in rule)) {
      return "Operator 'is older than' requires a 'seconds' field with the number of seconds."
    }

    return null // No errors
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error)
  }
}

interface ResponseAction {
  action: string
  name?: string
  tag?: string
  command?: string
  investigation?: string
  duration?: string | number
  path?: string
  value?: string
  'extension name'?: string
  'extension action'?: string
  'extension request'?: Record<string, unknown>
  'hive name'?: string
  'record name'?: string
  ttl?: number
  entire_device?: boolean
  publish?: boolean
  priority?: number
  metadata?: Record<string, unknown>
  detect_data?: Record<string, unknown>
  [key: string]: unknown
}

function validateRespondLogic(respondLogicStr: string): string | null {
  try {
    const responses = yaml.load(respondLogicStr) as ResponseAction[]

    if (!Array.isArray(responses)) {
      return 'Top level should be a list of actions.'
    }

    const validActions = [
      'report',
      'add tag',
      'remove tag',
      'task',
      'add var',
      'del var',
      'extension request',
      'isolate network',
      'seal',
      'unseal',
      'output',
      'rejoin network',
      'undelete sensor',
      'wait',
      'add hive tag',
      'remove hive tag',
      'kill',
      'suspend',
      'resume',
      'deny tree',
      'delete',
      'run command',
      'get file',
      'block',
      'unblock',
    ]

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]

      if (typeof response !== 'object' || !('action' in response)) {
        return `Item ${i + 1}: Each list item must specify an 'action' field`
      }

      if (!validActions.includes(response.action.toLowerCase())) {
        return `Item ${i + 1}: Unknown action '${response.action}'. Valid actions are: ${validActions.join(', ')}`
      }

      // Validate specific action requirements
      switch (response.action.toLowerCase()) {
        case 'report':
          if (!('name' in response)) {
            return `Item ${i + 1}: 'report' action requires a 'name' field`
          }
          break
        case 'add tag':
        case 'remove tag':
          if (!('tag' in response)) {
            return `Item ${i + 1}: '${response.action}' action requires a 'tag' field`
          }
          break
        case 'task':
          if (!('command' in response)) {
            return `Item ${i + 1}: 'task' action requires a 'command' field`
          }
          break
        case 'run command':
          if (!('command' in response)) {
            return `Item ${i + 1}: 'run command' action requires a 'command' field`
          }
          break
        case 'get file':
          if (!('path' in response)) {
            return `Item ${i + 1}: 'get file' action requires a 'path' field`
          }
          break
        case 'add var':
          if (!('name' in response)) {
            return `Item ${i + 1}: 'add var' action requires a 'name' field`
          }
          if (!('value' in response)) {
            return `Item ${i + 1}: 'add var' action requires a 'value' field`
          }
          break
        case 'del var':
          if (!('name' in response)) {
            return `Item ${i + 1}: 'del var' action requires a 'name' field`
          }
          break
        case 'extension request':
          if (!('extension name' in response)) {
            return `Item ${i + 1}: 'extension request' action requires an 'extension name' field`
          }
          if (!('extension action' in response)) {
            return `Item ${i + 1}: 'extension request' action requires an 'extension action' field`
          }
          if (!('extension request' in response)) {
            return `Item ${i + 1}: 'extension request' action requires an 'extension request' field`
          }
          break
        case 'output':
          if (!('name' in response)) {
            return `Item ${i + 1}: 'output' action requires a 'name' field`
          }
          break
        case 'wait':
          if (!('duration' in response)) {
            return `Item ${i + 1}: 'wait' action requires a 'duration' field`
          }
          // Validate duration format (string like "10s" or number for seconds)
          if (typeof response.duration !== 'string' && typeof response.duration !== 'number') {
            return `Item ${i + 1}: 'duration' must be a string (e.g., "10s") or number (seconds)`
          }
          if (
            typeof response.duration === 'number' &&
            (response.duration < 0 || response.duration > 60)
          ) {
            return `Item ${i + 1}: 'duration' must be between 0 and 60 seconds`
          }
          break
        case 'add hive tag':
          if (!('hive name' in response)) {
            return `Item ${i + 1}: 'add hive tag' action requires a 'hive name' field`
          }
          if (!('record name' in response)) {
            return `Item ${i + 1}: 'add hive tag' action requires a 'record name' field`
          }
          if (!('tag' in response)) {
            return `Item ${i + 1}: 'add hive tag' action requires a 'tag' field`
          }
          break
        case 'remove hive tag':
          if (!('hive name' in response)) {
            return `Item ${i + 1}: 'remove hive tag' action requires a 'hive name' field`
          }
          if (!('record name' in response)) {
            return `Item ${i + 1}: 'remove hive tag' action requires a 'record name' field`
          }
          if (!('tag' in response)) {
            return `Item ${i + 1}: 'remove hive tag' action requires a 'tag' field`
          }
          break
      }

      // Validate TTL if present
      if ('ttl' in response && (typeof response.ttl !== 'number' || response.ttl < 0)) {
        return `Item ${i + 1}: 'ttl' must be a positive number`
      }

      // Validate entire_device if present
      if ('entire_device' in response && typeof response.entire_device !== 'boolean') {
        return `Item ${i + 1}: 'entire_device' must be a boolean (true or false)`
      }
    }

    return null // No errors
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error)
  }
}

// Rule management functions
function saveRule() {
  if (!currentRule.name.trim()) {
    appStore.addNotification('error', 'Please enter a rule name')
    return
  }

  if (!currentRule.detectLogic.trim()) {
    appStore.addNotification('error', 'Please enter detect logic')
    return
  }

  const rule: DetectionRule = {
    id: currentRule.id || Date.now().toString(),
    name: currentRule.name,
    description: currentRule.description,
    detectLogic: currentRule.detectLogic,
    respondLogic: currentRule.respondLogic,
    created: currentRule.id
      ? getExistingRule(currentRule.id)?.created || new Date().toISOString()
      : new Date().toISOString(),
    modified: new Date().toISOString(),
    unitTests:
      unitTests.value.length > 0
        ? unitTests.value.map((test) => ({
            id: test.id,
            name: test.name,
            eventData: test.eventData,
            expectedMatch: test.expectedMatch,
            isCollapsed: test.isCollapsed || false,
          }))
        : undefined,
  }

  // Save to localStorage
  const savedRulesList = JSON.parse(localStorage.getItem(DETECTION_RULES_KEY) || '[]')
  const existingIndex = savedRulesList.findIndex((r: DetectionRule) => r.id === rule.id)

  if (existingIndex !== -1) {
    savedRulesList[existingIndex] = rule
  } else {
    savedRulesList.push(rule)
  }

  localStorage.setItem(DETECTION_RULES_KEY, JSON.stringify(savedRulesList))

  // Update currentRule to exactly match what was saved
  currentRule.id = rule.id
  currentRule.name = rule.name
  currentRule.description = rule.description
  currentRule.detectLogic = rule.detectLogic
  currentRule.respondLogic = rule.respondLogic

  // Also update the CodeMirror editors to match the saved values
  if (detectEditor) {
    setEditorValue(detectEditor, rule.detectLogic)
  }
  if (respondEditor) {
    setEditorValue(respondEditor, rule.respondLogic)
  }

  loadSavedRules()
  clearDraft() // Clear draft since we've saved the rule

  // Trigger reactivity update for hasUnsavedChanges computed property
  _savedRulesUpdateTrigger.value++

  appStore.addNotification('success', `Rule "${rule.name}" saved successfully!`)
}

function getExistingRule(ruleId: string): DetectionRule | undefined {
  const savedRulesList = JSON.parse(localStorage.getItem(DETECTION_RULES_KEY) || '[]')
  return savedRulesList.find((r: DetectionRule) => r.id === ruleId)
}

function loadRule(ruleId: string) {
  // Check if there's existing unsaved content and confirm before loading
  if (hasUnsavedChanges.value) {
    if (!confirm('Are you sure you want to load this rule? Unsaved changes will be lost.')) {
      return
    }
  }

  const savedRulesList = JSON.parse(localStorage.getItem(DETECTION_RULES_KEY) || '[]')
  const rule = savedRulesList.find((r: DetectionRule) => r.id === ruleId)

  if (rule) {
    // Temporarily set initializing to prevent watchers from firing
    isInitializing.value = true

    currentRule.id = rule.id
    currentRule.name = rule.name
    currentRule.description = rule.description || ''
    currentRule.detectLogic = rule.detectLogic
    currentRule.respondLogic = rule.respondLogic || ''

    // Load unit tests from saved rule if they exist
    if (rule.unitTests && Array.isArray(rule.unitTests)) {
      unitTests.value = rule.unitTests
    } else {
      unitTests.value = [] // Clear unit tests if none saved
    }

    // Update CodeMirror editors
    if (detectEditor) setEditorValue(detectEditor, rule.detectLogic)
    if (respondEditor) setEditorValue(respondEditor, rule.respondLogic || '')

    clearDraft() // Clear draft since we're loading a saved rule
    isInitializing.value = false // Re-enable watchers

    // Trigger reactivity update for hasUnsavedChanges computed property
    _savedRulesUpdateTrigger.value++
  }
}

function loadRuleAndCloseModal(ruleId: string) {
  loadRule(ruleId)
  showLoadRuleModal.value = false
}

function deleteRule(ruleId: string) {
  if (confirm('Are you sure you want to delete this rule?')) {
    const savedRulesList = JSON.parse(localStorage.getItem(DETECTION_RULES_KEY) || '[]')
    const filteredRules = savedRulesList.filter((r: DetectionRule) => r.id !== ruleId)
    localStorage.setItem(DETECTION_RULES_KEY, JSON.stringify(filteredRules))

    if (currentRule.id === ruleId) {
      newRule()
    }

    loadSavedRules()
    appStore.addNotification('success', 'Rule deleted successfully')
  }
}

function loadSavedRules() {
  const savedRulesList = JSON.parse(localStorage.getItem(DETECTION_RULES_KEY) || '[]')
  savedRules.value = savedRulesList
}

function newRule() {
  // Check if there's existing content and confirm before clearing
  if (hasUnsavedChanges.value) {
    if (!confirm('Are you sure you want to start a new rule? Unsaved changes will be lost.')) {
      return
    }
  }

  // Temporarily set initializing to prevent watchers from firing
  isInitializing.value = true

  currentRule.id = null
  currentRule.name = ''
  currentRule.description = ''
  currentRule.detectLogic = ''
  currentRule.respondLogic = ''

  // Clear unit tests when starting a new rule
  unitTests.value = []
  overallTestResults.value = null

  if (detectEditor) setEditorValue(detectEditor, '')
  if (respondEditor) setEditorValue(respondEditor, '')

  validationResult.value = ''
  clearDraft() // Clear the persisted draft
  isInitializing.value = false // Re-enable watchers
}

function duplicateRule() {
  // Check if there's content to duplicate
  if (!currentRule.name && !currentRule.detectLogic.trim() && !currentRule.respondLogic.trim()) {
    appStore.addNotification(
      'error',
      'No rule content to duplicate. Please load or create a rule first.',
    )
    return
  }

  // Create the copy with "COPY - " prefix
  const copyName = currentRule.name ? `COPY - ${currentRule.name}` : 'COPY - Untitled Rule'

  // Reset current rule ID to make it a new unsaved rule
  currentRule.id = null
  currentRule.name = copyName // Clear validation results
  validationResult.value = ''

  appStore.addNotification(
    'success',
    `Rule duplicated as "${copyName}". Save to create a new rule.`,
  )
}

function exportToIaC() {
  // Check if there's content to export
  if (!currentRule.name.trim() || !currentRule.detectLogic.trim()) {
    appStore.addNotification('error', 'Please enter a rule name and detect logic before exporting.')
    return
  }

  try {
    // Helper function to format unit tests for IaC
    const formatUnitTestsForIaC = (): string => {
      if (!unitTests.value || unitTests.value.length === 0) {
        return ''
      }

      const matchTests: string[] = []
      const nonMatchTests: string[] = []

      unitTests.value.forEach((test, index) => {
        try {
          const eventData = JSON.parse(test.eventData)

          // Create a formatted test case with comment
          const testComment = `                      # Test ${index + 1}: ${test.name}`

          // Convert JSON event data to YAML format
          const yamlEventData = yaml.dump(eventData, {
            indent: 2,
            lineWidth: -1,
            noArrayIndent: false,
            skipInvalid: true,
            flowLevel: -1,
          })

          // Format the YAML with proper indentation for IaC structure
          const indentedYaml = yamlEventData
            .split('\n')
            .filter((line) => line.trim() !== '') // Remove empty lines
            .map((line) => '                          ' + line)
            .join('\n')

          const testCase = `                      - - ${indentedYaml.substring(26)}`

          if (test.expectedMatch) {
            matchTests.push(testComment)
            matchTests.push(testCase)
          } else {
            nonMatchTests.push(testComment)
            nonMatchTests.push(testCase)
          }
        } catch (error) {
          // Skip invalid test data - silently handle
          void error
        }
      })

      let testsSection = ''
      if (matchTests.length > 0 || nonMatchTests.length > 0) {
        testsSection = '\n                tests:'

        if (matchTests.length > 0) {
          testsSection += '\n                    match:'
          testsSection += '\n' + matchTests.join('\n')
        }

        if (nonMatchTests.length > 0) {
          testsSection += '\n                    non_match:'
          testsSection += '\n' + nonMatchTests.join('\n')
        }
      }

      return testsSection
    }

    // Create proper LimaCharlie IaC YAML format
    const iacContent = `# LimaCharlie Detection Rule - Infrastructure as Code
# Generated by DetectionForge
# Generated on: ${new Date().toISOString()}
# Rule: ${currentRule.name}

version: 3
hives:
    dr-general:
        "${currentRule.name}":
            data:
                detect:
${currentRule.detectLogic
  .split('\n')
  .map((line) => '                    ' + line)
  .join('\n')}${
      currentRule.respondLogic.trim()
        ? `
                respond:
${currentRule.respondLogic
  .split('\n')
  .map((line) => '                    ' + line)
  .join('\n')}`
        : ''
    }${formatUnitTestsForIaC()}
            usr_mtd:
                enabled: true
                expiry: 0
                tags: []
                comment: "${currentRule.description || ''}"
`

    // Copy to clipboard
    navigator.clipboard
      .writeText(iacContent)
      .then(() => {
        appStore.addNotification(
          'success',
          `Rule exported to clipboard in LimaCharlie IaC format${unitTests.value.length > 0 ? ` with ${unitTests.value.length} unit tests` : ''}!`,
        )
      })
      .catch((_err) => {
        // Failed to copy to clipboard - use fallback
        // Silently handle error and proceed with fallback
        const textArea = document.createElement('textarea')
        textArea.value = iacContent
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)

        appStore.addNotification(
          'success',
          `Rule exported to clipboard in LimaCharlie IaC format${unitTests.value.length > 0 ? ` with ${unitTests.value.length} unit tests` : ''}!`,
        )
      })
  } catch (error: unknown) {
    // Failed to copy to clipboard - use fallback
    void error // Suppress unused variable warning
    appStore.addNotification(
      'error',
      `Export failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function clearEditor() {
  if (confirm('Are you sure you want to clear the editor? Unsaved changes will be lost.')) {
    currentRule.id = null
    currentRule.name = ''
    currentRule.description = ''
    currentRule.detectLogic = ''
    currentRule.respondLogic = ''

    // Clear unit tests when clearing the editor
    unitTests.value = []
    overallTestResults.value = null

    if (detectEditor) setEditorValue(detectEditor, '')
    if (respondEditor) setEditorValue(respondEditor, '')

    validationResult.value = ''
    clearDraft() // Clear the persisted draft
  }
}

function toggleUnitTests() {
  showUnitTests.value = !showUnitTests.value
}

function toggleBacktest() {
  showBacktest.value = !showBacktest.value
}

function formatTestResponse(response: BacktestResponse): string {
  try {
    // Check if the rule matched using the did_match field
    const didMatch =
      response.did_match !== undefined
        ? response.did_match
        : response.results && response.results.length > 0

    let html = ''

    if (didMatch) {
      html = '<div class="test-result-success">✅ <strong>Detection Rule Matched!</strong><br><br>'
    } else {
      html =
        '<div class="test-result-error">❌ <strong>Detection Rule Did Not Match</strong><br><br>'
    }

    // Show match status explicitly
    html += `<strong>Match Status:</strong> ${didMatch ? 'TRUE' : 'FALSE'}<br><br>`

    // Show execution traces if available
    if (response.traces && response.traces.length > 0) {
      html += '<strong>Execution Traces:</strong><br>'
      html += '<div class="traces-container">'
      response.traces.forEach((traceGroup: string[] | string, groupIndex: number) => {
        if (Array.isArray(traceGroup)) {
          traceGroup.forEach((trace: string, index: number) => {
            html += `<div class="trace-item">${groupIndex + 1}.${index + 1}. ${trace}</div>`
          })
        } else {
          html += `<div class="trace-item">${groupIndex + 1}. ${traceGroup}</div>`
        }
      })
      html += '</div><br>'
    } else if (response.trace && response.trace.length > 0) {
      // Fallback for old trace format
      html += '<strong>Execution Trace:</strong><br>'
      html += '<div class="traces-container">'
      response.trace.forEach((trace: string, index: number) => {
        html += `<div class="trace-item">${index + 1}. ${trace}</div>`
      })
      html += '</div><br>'
    }

    // Show statistics if available
    if (response.stats) {
      html += '<strong>Execution Statistics:</strong><br>'
      html += '<div class="stats-container">'
      html += `<div class="stat-item"><strong>Events Processed:</strong> ${response.stats.n_proc || 0}</div>`
      html += `<div class="stat-item"><strong>Evaluations:</strong> ${response.stats.n_eval || 0}</div>`
      html += `<div class="stat-item"><strong>Wall Time:</strong> ${(response.stats.wall_time || 0).toFixed(6)} seconds</div>`
      if (response.stats.n_scan && response.stats.n_scan > 0) {
        html += `<div class="stat-item"><strong>Scans:</strong> ${response.stats.n_scan}</div>`
        html += `<div class="stat-item"><strong>Bytes Scanned:</strong> ${response.stats.n_bytes_scan}</div>`
      }
      html += '</div><br>'
    }

    // Show results if available
    if (response.results && response.results.length > 0) {
      html += '<strong>Detection Results:</strong><br>'
      html += '<div class="results-container">'
      response.results.forEach((result: BacktestMatch, index: number) => {
        html += `<div class="result-item">`
        html += `<strong>Result ${index + 1}:</strong><br>`

        // Show key information prominently
        if (result.action) {
          html += `<div class="result-field"><strong>Action:</strong> ${result.action}</div>`
        }

        if (result.data) {
          if (result.data.cat) {
            html += `<div class="result-field"><strong>Category:</strong> ${result.data.cat}</div>`
          }

          if (result.data.detect_id) {
            html += `<div class="result-field"><strong>Detection ID:</strong> ${result.data.detect_id}</div>`
          }

          if (result.data.link) {
            html += `<div class="result-field"><strong>Timeline Link:</strong> <a href="${result.data.link}" target="_blank">View in LC Console</a></div>`
          }

          if (result.data.routing && result.data.routing.hostname) {
            html += `<div class="result-field"><strong>Hostname:</strong> ${result.data.routing.hostname}</div>`
          }
        }

        // Show full result as collapsible JSON
        html += `<details class="result-json">`
        html += `<summary>Full Result JSON</summary>`
        html += `<pre>${JSON.stringify(result, null, 2)}</pre>`
        html += `</details>`

        html += `</div>`
      })
      html += '</div>'
    }

    html += '</div>'
    return html
  } catch (error) {
    return `<div class="test-result-error">❌ Error formatting response: ${error}</div>`
  }
}

// Unit Test Management Functions
// Preset sample events for testing
const presetEvents: Record<string, { name: string; data: Record<string, unknown> }> = {
  new_process: {
    name: 'NEW_PROCESS - Generic Process Creation',
    data: {
      event: {
        COMMAND_LINE: '/usr/bin/python3 /usr/lib/ubuntu-advantage/apt_news.py',
        FILE_PATH: '/usr/bin/python3',
        HASH: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
        MEMORY_USAGE: 30375936,
        PARENT: {
          COMMAND_LINE: '/sbin/init',
          FILE_PATH: '/usr/lib/systemd/systemd',
          HASH: '12345678901234567890123456789012345678901234567890123456789012345678',
          MEMORY_USAGE: 15319040,
          PARENT_PROCESS_ID: 0,
          PROCESS_ID: 1,
          THIS_ATOM: '1234567890abcdef1234567890abcdef',
          THREADS: 1,
          TIMESTAMP: 1704067200000,
          USER_ID: 0,
          USER_NAME: 'root',
        },
        PARENT_PROCESS_ID: 1,
        PROCESS_ID: 12345,
        THREADS: 1,
        USER_ID: 0,
        USER_NAME: 'root',
      },
      routing: {
        arch: 2,
        did: '',
        event_id: '12345678-1234-1234-1234-123456789012',
        event_time: 1704067200000,
        event_type: 'NEW_PROCESS',
        ext_ip: '192.168.1.100',
        hostname: 'test-workstation.domain.local',
        iid: '87654321-4321-4321-4321-210987654321',
        int_ip: '192.168.1.100',
        latency: 50,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        parent: '1234567890abcdef1234567890abcdef',
        plat: 536870912,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test', 'linux', 'workstation'],
        this: 'abcdef1234567890abcdef1234567890',
      },
      ts: '2025-06-14 12:00:00',
    },
  },
  file_create: {
    name: 'FILE_CREATE - Suspicious File Creation',
    data: {
      routing: {
        hostname: 'test-workstation',
        oid: '12345678-1234-1234-1234-123456789012',
        sid: '87654321-4321-4321-4321-210987654321',
        iid: '11111111-1111-1111-1111-111111111111',
        ext_ip: '192.168.1.100',
        int_ip: '192.168.1.100',
        this: 'test-workstation.domain.local',
        arch: 2,
        plat: 268435456,
        tags: ['test'],
      },
      event: {
        TIMESTAMP: 1704067200,
        EVENT_TYPE: 'NEW_DOCUMENT',
        PROCESS_ID: 4567,
        PARENT_PROCESS_ID: 1234,
        USER_NAME: 'testuser',
        DOMAIN_NAME: 'DOMAIN',
        FILE_PATH: 'C:\\Users\\testuser\\AppData\\Local\\Temp\\suspicious.exe',
        HASH: 'bad1beef2dead3cafe4babe5feed6deed7dead8beef9cafe0babe1feed2dead3',
        PARENT_ATOM: '0x1a2b3c4d',
        ATOM: '0x5e6f7a8b',
        SIZE: 1048576,
      },
    },
  },
  network_connect: {
    name: 'NETWORK_CONNECT - Outbound Connection',
    data: {
      routing: {
        hostname: 'test-workstation',
        oid: '12345678-1234-1234-1234-123456789012',
        sid: '87654321-4321-4321-4321-210987654321',
        iid: '11111111-1111-1111-1111-111111111111',
        ext_ip: '192.168.1.100',
        int_ip: '192.168.1.100',
        this: 'test-workstation.domain.local',
        arch: 2,
        plat: 268435456,
        tags: ['test'],
      },
      event: {
        TIMESTAMP: 1704067200,
        EVENT_TYPE: 'NETWORK_CONNECT',
        PROCESS_ID: 4567,
        USER_NAME: 'testuser',
        DOMAIN_NAME: 'DOMAIN',
        FILE_PATH: 'C:\\Windows\\System32\\cmd.exe',
        IP_ADDRESS: '192.168.1.50',
        PORT: 443,
        DESTINATION: '192.168.1.50',
        DESTINATION_PORT: 443,
        PROTOCOL: 'TCP',
        ATOM: '0x5e6f7a8b',
      },
    },
  },
  registry_write: {
    name: 'REGISTRY_WRITE - Registry Modification',
    data: {
      routing: {
        hostname: 'test-workstation',
        oid: '12345678-1234-1234-1234-123456789012',
        sid: '87654321-4321-4321-4321-210987654321',
        iid: '11111111-1111-1111-1111-111111111111',
        ext_ip: '192.168.1.100',
        int_ip: '192.168.1.100',
        this: 'test-workstation.domain.local',
        arch: 2,
        plat: 268435456,
        tags: ['test'],
      },
      event: {
        TIMESTAMP: 1704067200,
        EVENT_TYPE: 'REGISTRY_WRITE',
        PROCESS_ID: 4567,
        USER_NAME: 'testuser',
        DOMAIN_NAME: 'DOMAIN',
        FILE_PATH: 'C:\\Windows\\System32\\reg.exe',
        REGISTRY_KEY: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run',
        REGISTRY_VALUE: 'suspicious_app',
        REGISTRY_DATA: 'C:\\Users\\testuser\\AppData\\Local\\Temp\\malware.exe',
        ATOM: '0x5e6f7a8b',
      },
    },
  },
  dns_request: {
    name: 'DNS_REQUEST - Domain Resolution',
    data: {
      routing: {
        hostname: 'test-workstation',
        oid: '12345678-1234-1234-1234-123456789012',
        sid: '87654321-4321-4321-4321-210987654321',
        iid: '11111111-1111-1111-1111-111111111111',
        ext_ip: '192.168.1.100',
        int_ip: '192.168.1.100',
        this: 'test-workstation.domain.local',
        arch: 2,
        plat: 268435456,
        tags: ['test'],
      },
      event: {
        TIMESTAMP: 1704067200,
        EVENT_TYPE: 'DNS_REQUEST',
        PROCESS_ID: 4567,
        USER_NAME: 'testuser',
        DOMAIN_NAME: 'DOMAIN',
        FILE_PATH: 'C:\\Windows\\System32\\svchost.exe',
        DOMAIN_NAME_REQ: 'suspicious-domain.com',
        ATOM: '0x5e6f7a8b',
      },
    },
  },
  code_identity: {
    name: 'CODE_IDENTITY - Unsigned Binary Execution',
    data: {
      routing: {
        hostname: 'test-workstation',
        oid: '12345678-1234-1234-1234-123456789012',
        sid: '87654321-4321-4321-4321-210987654321',
        iid: '11111111-1111-1111-1111-111111111111',
        ext_ip: '192.168.1.100',
        int_ip: '192.168.1.100',
        this: 'test-workstation.domain.local',
        arch: 2,
        plat: 268435456,
        tags: ['test'],
      },
      event: {
        TIMESTAMP: 1704067200,
        EVENT_TYPE: 'CODE_IDENTITY',
        PROCESS_ID: 4567,
        USER_NAME: 'testuser',
        FILE_PATH: 'C:\\Users\\testuser\\Downloads\\unsigned_tool.exe',
        CERT_CHAIN: [],
        IS_SIGNED: false,
        ATOM: '0x5e6f7a8b',
      },
    },
  },
}

function loadPreset(test: UnitTest, presetKey: string) {
  if (!presetKey || !presetEvents[presetKey]) {
    return
  }

  const preset = presetEvents[presetKey]
  test.eventData = JSON.stringify(preset.data, null, 2)

  // Reset the select dropdown
  const selectElement = document.getElementById(`preset-${test.id}`) as HTMLSelectElement
  if (selectElement) {
    selectElement.value = ''
  }
}

function clearTestEventData(test: UnitTest) {
  test.eventData = ''
}

function addUnitTest() {
  const newTest: UnitTest = {
    id: Date.now().toString(),
    name: `Test Case ${unitTests.value.length + 1}`,
    eventData: '',
    expectedMatch: true,
    showDetails: false,
    isCollapsed: false,
  }
  unitTests.value.push(newTest)
}

function toggleTestCollapse(test: UnitTest) {
  test.isCollapsed = !test.isCollapsed
}

function collapseAllTests() {
  unitTests.value.forEach((test) => {
    test.isCollapsed = true
  })
}

function expandAllTests() {
  unitTests.value.forEach((test) => {
    test.isCollapsed = false
  })
}

function removeUnitTest(index: number) {
  unitTests.value.splice(index, 1)
  updateOverallResults()
}

function clearTestResults() {
  // Clear all test results and overall results when rule content changes
  unitTests.value.forEach((test) => {
    test.result = undefined
    test.showDetails = false
  })
  overallTestResults.value = null
}

function updateOverallResults() {
  if (unitTests.value.length === 0) {
    overallTestResults.value = null
    return
  }

  const total = unitTests.value.length
  const passed = unitTests.value.filter((test) => test.result?.passed === true).length
  const failed = total - passed
  const successRate = total > 0 ? Math.round((passed / total) * 100) : 0

  overallTestResults.value = {
    total,
    passed,
    failed,
    successRate,
  }
}

function clearAllTests() {
  unitTests.value = []
  overallTestResults.value = null
  activeMatchTab.value = {}
}

async function runAllTests() {
  if (!currentRule.detectLogic) {
    appStore.addNotification('error', 'Please enter detection logic before running tests')
    return
  }

  isRunningTests.value = true

  try {
    let _completedTests = 0
    const totalTests = unitTests.value.length

    for (const test of unitTests.value) {
      try {
        await runSingleUnitTest(test)
        _completedTests++
      } catch (error) {
        // Test execution failed - handle silently
        void error // Suppress unused variable warning
        test.result = {
          didMatch: false,
          passed: false,
          formattedResponse: `<div class="test-result-error">❌ Test execution failed: ${error}</div>`,
          rawResponse: null,
        }
      }
    }

    updateOverallResults()
    appStore.addNotification(
      'success',
      `All tests completed! ${overallTestResults.value?.passed}/${totalTests} passed`,
    )
  } catch (error) {
    // Error running all tests - handle silently
    void error // Suppress unused variable warning
    appStore.addNotification('error', 'Failed to run all tests')
  } finally {
    isRunningTests.value = false
  }
}

async function runSingleUnitTest(test: UnitTest) {
  if (!test.eventData.trim()) {
    throw new Error('Test event data is empty')
  }

  // Parse and validate the test event JSON
  let sampleEvent
  try {
    sampleEvent = JSON.parse(test.eventData)
  } catch (_e) {
    throw new Error('Invalid JSON format in test event data')
  }

  // Get organization ID and replay URL
  if (!auth.primaryOid.value) {
    throw new Error('No primary organization selected')
  }

  const orgReplayUrl = storage.getOrganizationReplayUrl(auth.primaryOid.value)
  if (!orgReplayUrl) {
    throw new Error(`Replay URL not available for organization ${auth.primaryOid.value}`)
  }

  // Call the API to test the detection rule
  const response = await api.testDetectionRule(
    orgReplayUrl,
    auth.primaryOid.value,
    currentRule.detectLogic,
    currentRule.respondLogic,
    sampleEvent,
  )

  // Format the response and determine if test passed
  const didMatch =
    response.did_match !== undefined
      ? response.did_match
      : response.results && response.results.length > 0
  const passed = didMatch === test.expectedMatch
  const formattedResponse = formatTestResponse(response)

  test.result = {
    didMatch,
    passed,
    formattedResponse,
    rawResponse: response,
  }

  return test.result
}

function setQuickRange(range: string) {
  const now = new Date()
  const endDateTime = now.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
  let startDateTime: string

  switch (range) {
    case '1hour':
      startDateTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString().slice(0, 16)
      break
    case '6hours':
      startDateTime = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 16)
      break
    case '24hours':
      startDateTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
      break
    case '7days':
      startDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
      break
    case '30days':
      startDateTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
      break
    default:
      startDateTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  }

  backtestConfig.startDateTime = startDateTime
  backtestConfig.endDateTime = endDateTime
}

async function runBacktest() {
  if (!canRunBacktest.value) {
    appStore.addNotification(
      'error',
      'Please configure backtest parameters and ensure detection logic is entered',
    )
    return
  }

  try {
    isRunningBacktest.value = true

    // Ensure we have selected organizations for backtest
    if (!backtestSelectedOids.value || backtestSelectedOids.value.length === 0) {
      throw new Error('No organizations selected for backtest')
    }

    // Convert datetime strings to Unix timestamps
    const startTimestamp = Math.floor(new Date(backtestConfig.startDateTime).getTime() / 1000)
    const endTimestamp = Math.floor(new Date(backtestConfig.endDateTime).getTime() / 1000)

    appStore.addNotification(
      'info',
      `Starting backtest for ${backtestSelectedOids.value.length} organization(s)... This may take several minutes for large time ranges.`,
    )

    const orgResults: BacktestOrgResult[] = []
    const totalStats = {
      n_proc: 0,
      n_eval: 0,
      totalMatches: 0,
      wall_time: 0,
    }

    // Initialize progress tracking
    backtestProgress.value = {
      current: 0,
      total: backtestSelectedOids.value.length,
      currentOrgName: '',
      currentOid: '',
    }

    // Run backtest for each selected organization
    for (let i = 0; i < backtestSelectedOids.value.length; i++) {
      const oid = backtestSelectedOids.value[i]

      try {
        // Update progress
        backtestProgress.value.current = i + 1
        backtestProgress.value.currentOid = oid
        backtestProgress.value.currentOrgName = auth.getOrgName(oid)

        // Get the replay URL specific to this organization
        const orgReplayUrl = storage.getOrganizationReplayUrl(oid)
        if (!orgReplayUrl) {
          throw new Error(`Replay URL not available for organization ${oid}`)
        }

        // Run the backtest for this org
        const response = await api.backtestDetectionRule(
          orgReplayUrl,
          oid,
          currentRule.detectLogic,
          currentRule.respondLogic,
          startTimestamp,
          endTimestamp,
          backtestConfig.eventLimit,
          backtestConfig.evalLimit,
        )

        // Add successful result
        orgResults.push({
          oid,
          orgName: auth.getOrgName(oid),
          status: 'success',
          stats: response.stats,
          results: response.results || [],
          did_match: response.did_match,
          is_dry_run: response.is_dry_run,
        })

        // Update total stats
        totalStats.n_proc += response.stats?.n_proc || 0
        totalStats.n_eval += response.stats?.n_eval || 0
        totalStats.totalMatches += response.results?.length || 0
        totalStats.wall_time += response.stats?.wall_time || 0
      } catch (error: unknown) {
        // Backtest failed for this organization - handle error
        void error // Suppress unused variable warning
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Add failed result
        orgResults.push({
          oid,
          orgName: auth.getOrgName(oid),
          status: 'error',
          error: errorMessage,
        })
      }
    }

    // Store results with completion timestamp
    backtestResults.value = {
      completedAt: new Date().toISOString(),
      orgResults,
      totalStats,
    }

    // Reset display state
    expandedMatches.value.clear()
    activeMatchTab.value = {}
    displayedResults.value = 10

    const successfulOrgs = orgResults.filter((r) => r.status === 'success')
    const failedOrgs = orgResults.filter((r) => r.status === 'error')

    let message = `Backtest completed! Found ${totalStats.totalMatches} total matches out of ${totalStats.n_proc.toLocaleString()} events processed across ${successfulOrgs.length} organization(s).`
    if (failedOrgs.length > 0) {
      message += ` ${failedOrgs.length} organization(s) failed.`
    }

    appStore.addNotification('success', message)
  } catch (error: unknown) {
    // Backtest execution failed - handle error
    void error // Suppress unused variable warning
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    appStore.addNotification('error', `Backtest failed: ${errorMessage}`)
  } finally {
    isRunningBacktest.value = false
    backtestProgress.value = { current: 0, total: 0, currentOrgName: '', currentOid: '' }
  }
}

function toggleMatchDetails(orgIndex: number, matchIndex: number) {
  const key = `${orgIndex}-${matchIndex}`
  if (expandedMatches.value.has(key)) {
    expandedMatches.value.delete(key)
    delete activeMatchTab.value[key]
  } else {
    expandedMatches.value.add(key)
    activeMatchTab.value[key] = 'event'
  }
}

function setMatchTab(key: string, tab: string) {
  activeMatchTab.value[key] = tab
}

function toggleOrgResult(orgIndex: number) {
  if (expandedOrgResults.value.has(orgIndex)) {
    expandedOrgResults.value.delete(orgIndex)
  } else {
    expandedOrgResults.value.add(orgIndex)
    // Initialize displayed results for this org if not set
    if (!(orgIndex in orgDisplayedResults.value)) {
      orgDisplayedResults.value[orgIndex] = 10
    }
  }
}

function getDisplayedResultsForOrg(orgIndex: number): number {
  return orgDisplayedResults.value[orgIndex] || 10
}

function loadMoreResultsForOrg(orgIndex: number) {
  orgDisplayedResults.value[orgIndex] = (orgDisplayedResults.value[orgIndex] || 10) + 10
}

function _loadMoreResults() {
  displayedResults.value += 10
}

function exportOrgBacktestResults(orgResult: BacktestOrgResult) {
  if (!orgResult.results || orgResult.status !== 'success') return

  const exportData = {
    backtest_metadata: {
      rule_name: currentRule.name,
      organization: orgResult.orgName,
      oid: orgResult.oid,
      completed_at: backtestResults.value?.completedAt,
      stats: orgResult.stats,
    },
    matches: orgResult.results,
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backtest-results-${orgResult.orgName}-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function _exportBacktestResults() {
  if (!backtestResults.value) return

  const exportData = {
    backtest_metadata: {
      rule_name: currentRule.name,
      completed_at: backtestResults.value.completedAt,
      total_stats: backtestResults.value.totalStats,
      organizations: backtestResults.value.orgResults.length,
    },
    org_results: backtestResults.value.orgResults,
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backtest-results-all-orgs-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  appStore.addNotification('success', 'Backtest results exported successfully')
}

function clearBacktestResults() {
  backtestResults.value = null
  expandedMatches.value.clear()
  activeMatchTab.value = {}
  expandedOrgResults.value.clear()
  orgDisplayedResults.value = {}
  displayedResults.value = 10
  backtestProgress.value = { current: 0, total: 0, currentOrgName: '', currentOid: '' }
}

function _formatOrgDisplay(oid: string): string {
  const orgName = auth.getOrgName(oid)
  // If orgName is different from oid, show "Name (OID)", otherwise just show the OID
  return orgName !== oid ? `${orgName} (${oid})` : oid
}

function getOrgNameOnly(oid: string): string {
  // Get the actual org name without fallback to OID
  const organizations = storage.organizations.value
  const org = organizations.find((o: { oid: string; name: string }) => o.oid === oid)
  return org?.name || 'Unknown Organization'
}

function getOrgName(oid: string): string {
  // Get the actual org name with fallback to OID
  const organizations = storage.organizations.value
  const org = organizations.find((o: { oid: string; name: string }) => o.oid === oid)
  return org?.name || oid
}

function formatTimestamp(timestamp: string | number): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp * 1000)
  return date.toLocaleString()
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

// Event Schema Functions
interface EventSchemaElement {
  type: 'integer' | 'string' | 'boolean'
  path: string
}

interface EventSchemaResponse {
  schema: {
    elements: string[]
    event_type: string
  }
}

interface SchemasListResponse {
  event_types: string[]
}

async function fetchAvailableSchemas() {
  // Check if we have credentials and at least one organization
  if (!storage.credentials.value || storage.organizations.value.length === 0) {
    schemaError.value = 'Please configure your LimaCharlie credentials and organizations first'
    return
  }

  // Check if an organization is selected
  if (!selectedOrgForSchema.value) {
    schemaError.value = 'Please select an organization first'
    return
  }

  isLoadingSchemas.value = true
  availableSchemas.value = []
  schemaError.value = ''

  try {
    const response = await api.getJson(`/orgs/${selectedOrgForSchema.value}/schema`)
    const schemasData = response as SchemasListResponse

    // Set available schemas with proper filtering for known prefixes
    availableSchemas.value = schemasData.event_types || []

    appStore.addNotification(
      'success',
      `Loaded ${availableSchemas.value.length} available schema types from ${getOrgName(selectedOrgForSchema.value)}`,
    )
  } catch (_error) {
    schemaError.value = 'Failed to fetch available schemas from the selected organization'
    // Fallback to a basic set of common event types if API fails
    availableSchemas.value = [
      'NEW_PROCESS',
      'TERMINATE_PROCESS',
      'FILE_CREATE',
      'FILE_DELETE',
      'FILE_MODIFIED',
      'NETWORK_CONNECT',
      'DNS_REQUEST',
      'REGISTRY_WRITE',
      'REGISTRY_CREATE',
      'REGISTRY_DELETE',
      'CODE_IDENTITY',
      'MODULE_LOAD',
      'HTTP_REQUEST',
      'WEL',
      'YARA_DETECTION',
    ]
  } finally {
    isLoadingSchemas.value = false
  }
}

async function openEventSchemasModal() {
  showEventSchemasModal.value = true
  // Set default organization to primary org if available
  if (!selectedOrgForSchema.value && auth.primaryOid.value) {
    selectedOrgForSchema.value = auth.primaryOid.value
  }
  // Don't automatically fetch schemas - wait for user to select org and click "Load Schemas"
}

function onOrgChange() {
  // Clear everything when organization changes
  selectedEventType.value = ''
  eventSchema.value = null
  schemaError.value = ''
  availableSchemas.value = []
}

function onPrefixChange() {
  // Clear selected event type when prefix changes
  selectedEventType.value = ''
  eventSchema.value = null
  schemaError.value = ''
}

async function fetchEventSchema() {
  if (!selectedEventType.value) {
    schemaError.value = 'Please select an event type first'
    return
  }

  // Check if we have credentials and at least one organization
  if (!storage.credentials.value || storage.organizations.value.length === 0) {
    schemaError.value = 'Please configure your LimaCharlie credentials and organizations first'
    return
  }

  // Use the selected organization for schema fetching
  if (!selectedOrgForSchema.value) {
    schemaError.value = 'Please select an organization first'
    return
  }

  isLoadingSchema.value = true
  schemaError.value = ''
  eventSchema.value = null

  try {
    const response = await api.getJson(
      `/orgs/${selectedOrgForSchema.value}/schema/${selectedEventType.value}`,
    )
    const schemaData = response as EventSchemaResponse

    // Parse the schema elements
    const parsedElements: EventSchemaElement[] = schemaData.schema.elements.map(
      (element: string) => {
        const [typePrefix, path] = element.split(':')
        let type: 'integer' | 'string' | 'boolean'

        switch (typePrefix) {
          case 'i':
            type = 'integer'
            break
          case 's':
            type = 'string'
            break
          case 'b':
            type = 'boolean'
            break
          default:
            type = 'string'
        }

        return { type, path }
      },
    )

    eventSchema.value = {
      eventType: schemaData.schema.event_type,
      elements: parsedElements,
    }

    appStore.addNotification(
      'success',
      `Schema for ${selectedEventType.value} loaded successfully from ${getOrgName(selectedOrgForSchema.value)}!`,
    )
  } catch (error) {
    schemaError.value = error instanceof Error ? error.message : 'Failed to fetch schema'
    appStore.addNotification('error', `Failed to fetch schema: ${schemaError.value}`)
  } finally {
    isLoadingSchema.value = false
  }
}

function resetEventSchema() {
  selectedEventType.value = ''
  eventSchema.value = null
  schemaError.value = ''
}

// Clipboard functions for Event Schemas
async function copyAllSchemaToClipboard() {
  if (!eventSchema.value) {
    appStore.addNotification('error', 'No schema available to copy')
    return
  }

  try {
    // Create a formatted schema representation suitable for documentation/reference
    const schemaText = `# Event Schema: ${eventSchema.value.eventType}
# Total fields: ${eventSchema.value.elements.length}

${eventSchema.value.elements
  .map((element) => `${element.type.padEnd(8)} | ${element.path}`)
  .join('\n')}

# Usage examples:
# path: ${eventSchema.value.elements[0]?.path || 'event/FIELD_NAME'}
# op: exists
# ---
# path: ${eventSchema.value.elements[0]?.path || 'event/FIELD_NAME'}
# op: is
# value: "your_value_here"`

    await navigator.clipboard.writeText(schemaText)
    appStore.addNotification(
      'success',
      `Copied schema for ${eventSchema.value.eventType} (${eventSchema.value.elements.length} fields) to clipboard`,
    )
  } catch (error) {
    appStore.addNotification('error', 'Failed to copy schema to clipboard')
    logger.error('Clipboard error:', error)
  }
}

async function copyFieldPathToClipboard(fieldPath: string) {
  try {
    // Copy the field path in a format ready for detection rules
    const pathText = `path: ${fieldPath}`
    await navigator.clipboard.writeText(pathText)
    appStore.addNotification('success', `Copied field path: ${fieldPath}`)
  } catch (error) {
    appStore.addNotification('error', 'Failed to copy field path to clipboard')
    logger.error('Clipboard error:', error)
  }
}

// Import from IaC functionality
function clearIaCImport() {
  iacImportContent.value = ''
  iacImportResult.value = null
}

// Interface for IaC data structure
interface IaCData {
  version?: number
  hives: Record<
    string,
    Record<
      string,
      {
        data: {
          detect: unknown
          respond?: Array<{
            metadata?: {
              description?: string
            }
            [key: string]: unknown
          }>
          tests?: {
            match?: unknown[][]
            non_match?: unknown[][]
          }
        }
        usr_mtd?: {
          comment?: string
        }
      }
    >
  >
}

async function importFromIaC() {
  if (!iacImportContent.value.trim()) {
    appStore.addNotification('error', 'Please enter IaC YAML content to import')
    return
  }

  isImportingIaC.value = true
  iacImportResult.value = null

  try {
    // Parse the YAML content
    const iacData = yaml.load(iacImportContent.value.trim()) as IaCData

    if (!iacData || typeof iacData !== 'object') {
      throw new Error('Invalid YAML format')
    }

    // Validate basic IaC structure
    if (!iacData.hives || typeof iacData.hives !== 'object') {
      throw new Error('Invalid IaC format: missing hives section')
    }

    const importedRules: Array<{ name: string; success: boolean; error?: string }> = []
    let successCount = 0

    // Process each hive
    for (const hiveName of Object.keys(iacData.hives)) {
      const hive = iacData.hives[hiveName]

      if (!hive || typeof hive !== 'object') {
        continue
      }

      // Process each rule in the hive
      for (const ruleName of Object.keys(hive)) {
        try {
          const ruleData = hive[ruleName]

          if (!ruleData?.data) {
            importedRules.push({
              name: ruleName,
              success: false,
              error: 'Missing data section',
            })
            continue
          }

          // Extract detect logic
          if (!ruleData.data.detect) {
            importedRules.push({
              name: ruleName,
              success: false,
              error: 'Missing detect logic',
            })
            continue
          }

          const detectLogic = yaml.dump(ruleData.data.detect, {
            indent: 2,
            lineWidth: -1,
            noArrayIndent: false,
          })

          // Extract respond logic (optional)
          let respondLogic = ''
          if (ruleData.data.respond) {
            respondLogic = yaml.dump(ruleData.data.respond, {
              indent: 2,
              lineWidth: -1,
              noArrayIndent: false,
            })
          }

          // Extract description from usr_mtd comment or metadata
          let description = ''
          if (ruleData.usr_mtd?.comment) {
            description = ruleData.usr_mtd.comment
          } else if (ruleData.data.respond?.[0]?.metadata?.description) {
            description = ruleData.data.respond[0].metadata.description
          }

          // Extract unit tests if present
          const extractedUnitTests: UnitTest[] = []
          if (ruleData.data.tests) {
            let testIndex = 1

            // Process match tests
            if (ruleData.data.tests.match && Array.isArray(ruleData.data.tests.match)) {
              for (const testCase of ruleData.data.tests.match) {
                if (Array.isArray(testCase) && testCase.length > 0) {
                  extractedUnitTests.push({
                    id: Date.now().toString() + '_' + testIndex,
                    name: `Match Test ${testIndex}`,
                    eventData: JSON.stringify(testCase[0], null, 2),
                    expectedMatch: true,
                    isCollapsed: false,
                  })
                  testIndex++
                }
              }
            }

            // Process non_match tests
            if (ruleData.data.tests.non_match && Array.isArray(ruleData.data.tests.non_match)) {
              for (const testCase of ruleData.data.tests.non_match) {
                if (Array.isArray(testCase) && testCase.length > 0) {
                  extractedUnitTests.push({
                    id: Date.now().toString() + '_' + testIndex,
                    name: `Non-Match Test ${testIndex}`,
                    eventData: JSON.stringify(testCase[0], null, 2),
                    expectedMatch: false,
                    isCollapsed: false,
                  })
                  testIndex++
                }
              }
            }
          }

          // Create and save the rule
          const newRule: DetectionRule = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
            name: ruleName,
            description: description,
            detectLogic: detectLogic.trim(),
            respondLogic: respondLogic.trim(),
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            unitTests: extractedUnitTests,
          }

          // Save to localStorage
          const savedRulesList = JSON.parse(localStorage.getItem(DETECTION_RULES_KEY) || '[]')
          savedRulesList.push(newRule)
          localStorage.setItem(DETECTION_RULES_KEY, JSON.stringify(savedRulesList))

          importedRules.push({
            name: ruleName,
            success: true,
          })
          successCount++
        } catch (error) {
          importedRules.push({
            name: ruleName,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    // Update the saved rules list
    loadSavedRules()

    // Set import result
    iacImportResult.value = {
      success: successCount > 0,
      message:
        successCount > 0
          ? `Successfully imported ${successCount} rule${successCount !== 1 ? 's' : ''} from IaC`
          : 'No rules could be imported from the IaC content',
      importedRules: importedRules,
    }

    if (successCount > 0) {
      appStore.addNotification(
        'success',
        `Imported ${successCount} detection rule${successCount !== 1 ? 's' : ''} from IaC`,
      )
    } else {
      appStore.addNotification('error', 'Failed to import any rules from IaC content')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    iacImportResult.value = {
      success: false,
      message: `Failed to parse IaC content: ${errorMessage}`,
      importedRules: [],
    }
    appStore.addNotification('error', `Import failed: ${errorMessage}`)
  } finally {
    isImportingIaC.value = false
  }
}

// Watch for prefix changes to reset selection
watch(selectedPrefix, () => {
  onPrefixChange()
})
</script>
