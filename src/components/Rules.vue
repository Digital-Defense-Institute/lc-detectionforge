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
          <ThemeToggle />
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
                        <option value="existing_process">EXISTING_PROCESS - Running Process</option>
                        <option value="new_document">NEW_DOCUMENT - File Creation</option>
                        <option value="network_connections">
                          NETWORK_CONNECTIONS - Multiple Network Activity
                        </option>
                        <option value="registry_write">
                          REGISTRY_WRITE - Registry Modification
                        </option>
                        <option value="wel">WEL - Windows Event Log</option>
                        <option value="dns_request">DNS_REQUEST - Domain Resolution</option>
                        <option value="code_identity">
                          CODE_IDENTITY - Binary Signature Check
                        </option>
                        <option value="service_change">
                          SERVICE_CHANGE - Windows Service State Change
                        </option>
                        <option value="sensitive_process_access">
                          SENSITIVE_PROCESS_ACCESS - Process Memory Access
                        </option>
                        <option value="new_remote_thread">
                          NEW_REMOTE_THREAD - Remote Thread Creation
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
              <div
                class="results-header"
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 16px;
                "
              >
                <div>
                  <h4>Overall Test Results</h4>
                </div>
                <button
                  class="btn btn-info btn-small"
                  title="Copy unit test summary as Markdown table to clipboard"
                  @click="exportUnitTestSummaryAsMarkdown"
                >
                  📋 Copy Summary
                </button>
              </div>
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
                    <label for="backtestStartDate">Start Date & Time (UTC)</label>
                    <input
                      id="backtestStartDate"
                      v-model="backtestConfig.startDateTime"
                      type="datetime-local"
                      class="datetime-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="backtestEndDate">End Date & Time (UTC)</label>
                    <input
                      id="backtestEndDate"
                      v-model="backtestConfig.endDateTime"
                      type="datetime-local"
                      class="datetime-input"
                    />
                  </div>
                </div>
                <div class="time-zone-note">
                  <small
                    >ℹ️ All times are displayed in UTC (LimaCharlie's storage timezone). Enter times
                    in UTC.</small
                  >
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
                    <label for="eventLimit">
                      Event Limit
                      <button
                        class="help-icon"
                        type="button"
                        @click.stop="showEventLimitHelp = true"
                        title="Click for detailed help"
                      >
                        ?
                      </button>
                    </label>
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
                    <label for="evalLimit">
                      Evaluation Limit
                      <button
                        class="help-icon"
                        type="button"
                        @click.stop="showEvalLimitHelp = true"
                        title="Click for detailed help"
                      >
                        ?
                      </button>
                    </label>
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
                  <div class="input-group">
                    <label class="toggle-label">
                      <input
                        v-model="backtestConfig.runInParallel"
                        type="checkbox"
                        class="toggle-input"
                      />
                      <div
                        class="toggle-switch"
                        :class="{ active: backtestConfig.runInParallel }"
                      ></div>
                      <span class="toggle-text">Run organizations in parallel</span>
                    </label>
                    <small>
                      (Recommended) Parallel execution is faster but may hit rate or local bandwidth
                      throughput limits. Disable if you encounter errors.
                    </small>
                  </div>

                  <!-- Performance Optimization Settings -->

                  <div class="input-group">
                    <label class="toggle-label">
                      <input
                        v-model="backtestConfig.useChunkedResults"
                        type="checkbox"
                        class="toggle-input"
                      />
                      <div
                        class="toggle-switch"
                        :class="{ active: backtestConfig.useChunkedResults }"
                      ></div>
                      <span class="toggle-text">Use chunked results for massive datasets</span>
                    </label>
                    <small>
                      ⚠️ WARNING: Only enable for extremely large datasets that cause timeouts.
                      Creates multiple API calls which can be slower for normal datasets.
                    </small>
                  </div>
                </div>
              </div>

              <div class="advanced-section">
                <h4>Advanced Options</h4>
                <div class="advanced-inputs">
                  <div class="input-row">
                    <div class="input-group">
                      <label for="sensorId">Sensor ID (Optional)</label>
                      <input
                        id="sensorId"
                        v-model="backtestConfig.sid"
                        type="text"
                        placeholder="SID to scan telemetry for - leave blank for org-wide scan"
                        class="text-input"
                      />
                      <small>Target a specific sensor</small>
                    </div>

                    <div class="input-group">
                      <label for="dataStream">Data Stream</label>
                      <select
                        id="dataStream"
                        v-model="backtestConfig.stream"
                        class="stream-selector"
                      >
                        <option value="event">Event</option>
                        <option value="audit">Audit</option>
                        <option value="detect">Detect</option>
                      </select>
                      <small>Stream type to replay</small>
                    </div>
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
                v-if="isRunningBacktest"
                class="btn btn-warning"
                :disabled="isCancellingBacktest"
                @click="cancelBacktest"
              >
                {{ isCancellingBacktest ? '⏹️ Cancelling...' : '⏹️ Cancel Backtest' }}
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
                <div v-if="!backtestConfig.runInParallel" class="serial-progress">
                  <span class="current-org-icon">🏢</span>
                  <div class="current-org-info">
                    <div class="current-org-name">
                      {{ getOrgNameOnly(backtestProgress.currentOid) }}
                    </div>
                    <div class="current-org-oid">{{ backtestProgress.currentOid }}</div>
                  </div>
                </div>
                <div v-else class="parallel-progress">
                  <h5>Organization Status</h5>
                  <div
                    class="org-status-list"
                    :style="{
                      maxHeight: Math.min(backtestProgress.orgStatuses.length * 40, 20 * 40) + 'px',
                      overflowY: 'auto',
                    }"
                  >
                    <div
                      v-for="orgStatus in sortedOrgStatuses"
                      :key="orgStatus.oid"
                      class="org-status-item"
                      :class="orgStatus.status"
                      style="display: flex; align-items: center; gap: 8px; min-height: 40px"
                    >
                      <span class="org-status-icon" style="flex-shrink: 0">
                        {{
                          orgStatus.status === 'pending'
                            ? '⏳'
                            : orgStatus.status === 'running'
                              ? '🔄'
                              : orgStatus.status === 'completed'
                                ? '✅'
                                : orgStatus.status === 'cancelled'
                                  ? '⏹️'
                                  : orgStatus.status === 'timeout'
                                    ? '⏰'
                                    : '❌'
                        }}
                      </span>
                      <div class="org-status-info" style="flex: 1; min-width: 0">
                        <div class="org-status-name">{{ getOrgNameOnly(orgStatus.oid) }}</div>
                        <div class="org-status-oid">{{ orgStatus.oid }}</div>
                      </div>
                      <div
                        v-if="orgStatus.startTime"
                        class="org-timing"
                        style="
                          display: flex;
                          align-items: center;
                          white-space: nowrap;
                          flex-shrink: 0;
                          margin-right: 10px;
                        "
                      >
                        <span style="margin-right: 4px">⏱️</span>
                        <span v-if="orgStatus.status === 'running'" class="running-time">
                          {{ getRunningTime(orgStatus.startTime) }}
                        </span>
                        <span v-else-if="orgStatus.duration" class="completed-time">
                          {{ formatDuration(orgStatus.duration) }}
                        </span>
                      </div>
                      <div class="org-status-label" style="flex-shrink: 0; min-width: 100px; text-align: center">
                        <span v-if="orgStatus.status === 'pending'">Waiting</span>
                        <span v-else-if="orgStatus.status === 'running'">Running</span>
                        <span v-else-if="orgStatus.status === 'completed'">
                          <span 
                            v-if="orgStatus.matchCount !== undefined"
                            :title="`${orgStatus.eventCount || 0} events processed, ${orgStatus.evalCount || 0} evaluations`"
                            style="cursor: help; font-weight: 600; color: var(--accent)"
                          >
                            {{ orgStatus.matchCount }} {{ orgStatus.matchCount === 1 ? 'match' : 'matches' }}
                          </span>
                          <span v-else>Complete</span>
                        </span>
                        <span v-else-if="orgStatus.status === 'cancelled'">Cancelled</span>
                        <span v-else-if="orgStatus.status === 'timeout'">Timeout</span>
                        <span v-else>Failed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Backtest Results -->
            <div v-if="backtestResults || backtestLiveResults.length > 0" class="backtest-results">
              <div
                class="results-header"
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 16px;
                "
              >
                <div>
                  <h4>Backtest Results {{ isRunningBacktest ? '(In Progress)' : '' }}</h4>
                  <div v-if="backtestResults" class="results-timestamp">
                    Started: {{ formatTimestamp(backtestResults.executionStats.startedAt) }} (UTC) |
                    Completed: {{ formatTimestamp(backtestResults.completedAt) }} (UTC) | Duration:
                    {{ backtestResults.executionStats.totalExecutionTime.toFixed(2) }}s
                  </div>
                  <div v-else-if="isRunningBacktest" class="results-timestamp">
                    Running... {{ backtestProgress.current }} of {{ backtestProgress.total }} organizations completed
                  </div>
                </div>
                <button
                  v-if="backtestResults"
                  class="btn btn-info btn-small"
                  title="Copy backtest summary as Markdown table to clipboard"
                  @click="exportBacktestSummaryAsMarkdown"
                >
                  📋 Copy Summary
                </button>
              </div>

              <!-- Overall Statistics Summary -->
              <div v-if="backtestResults" class="stats-summary">
                <div
                  class="stat-card"
                  :title="
                    backtestResults.totalStats.n_proc === 0
                      ? 'Events Processed shows 0 when LimaCharlie\'s pre-filtering (by time range, event type, and content matching) efficiently eliminates events before full rule evaluation. This indicates optimal performance - your rule was tested, but no events needed expensive processing.'
                      : ''
                  "
                >
                  <div class="stat-number">
                    {{ backtestResults.totalStats.n_proc.toLocaleString() }}
                  </div>
                  <div class="stat-label">
                    Total Events Processed
                    <span
                      v-if="backtestResults.totalStats.n_proc === 0"
                      class="info-icon"
                      style="margin-left: 4px; color: #4a90e2; cursor: help; font-size: 0.9em"
                    >
                      ℹ️
                    </span>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.totalStats.n_eval.toLocaleString() }}
                  </div>
                  <div class="stat-label" style="word-wrap: break-word; overflow-wrap: break-word">
                    Total Rule Evaluations
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.totalStats.totalMatches.toLocaleString() }}
                  </div>
                  <div class="stat-label" style="word-wrap: break-word; overflow-wrap: break-word">
                    Total Matches Found
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.totalStats.wall_time.toFixed(2) }}s
                  </div>
                  <div class="stat-label" style="word-wrap: break-word; overflow-wrap: break-word">
                    API Processing Time
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.executionStats.totalExecutionTime.toFixed(2) }}s
                  </div>
                  <div class="stat-label" style="word-wrap: break-word; overflow-wrap: break-word">
                    Total Backtest Time
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.timeframe.durationDays.toFixed(1) }}
                  </div>
                  <div class="stat-label">Days Covered</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.completionStats.completedOrgs }} /
                    {{ backtestResults.completionStats.totalOrgs }}
                  </div>
                  <div class="stat-label" style="word-wrap: break-word; overflow-wrap: break-word">
                    Orgs Completed
                  </div>
                </div>
                <div
                  v-if="
                    backtestResults.completionStats.failedOrgs > 0 ||
                    backtestResults.completionStats.cancelledOrgs > 0 ||
                    backtestResults.completionStats.timeoutOrgs > 0
                  "
                  class="stat-card"
                >
                  <div class="stat-number">
                    {{
                      backtestResults.completionStats.failedOrgs +
                      backtestResults.completionStats.cancelledOrgs +
                      backtestResults.completionStats.timeoutOrgs
                    }}
                  </div>
                  <div
                    class="stat-label"
                    style="
                      word-wrap: break-word;
                      overflow-wrap: break-word;
                      hyphens: auto;
                      text-align: center;
                    "
                  >
                    {{
                      backtestResults.completionStats.wasCancelled
                        ? 'Failed / Cancelled / Timeout'
                        : 'Failed / Timeout Orgs'
                    }}
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.completionStats.orgsWithZeroHits }}
                  </div>
                  <div class="stat-label" style="word-wrap: break-word; overflow-wrap: break-word">
                    Orgs with 0 Hits
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">
                    {{ backtestResults.completionStats.avgMatchesPerOrg.toFixed(1) }}
                  </div>
                  <div class="stat-label" style="word-wrap: break-word; overflow-wrap: break-word">
                    Avg Matches per Org
                  </div>
                </div>
              </div>

              <!-- Timeframe Information -->
              <div class="timeframe-info">
                <h5>Telemetry Search Timeline</h5>
                <div class="timeline-container">
                  <div class="timeline-endpoint timeline-start">
                    <div class="timeline-label">Start Time</div>
                    <div class="timeline-time">
                      {{ formatTimestamp(backtestResults.timeframe.startTime) }}
                    </div>
                  </div>
                  <div class="timeline-bar">
                    <div class="timeline-line"></div>
                    <div class="timeline-duration">
                      {{
                        formatSearchDuration(
                          backtestResults.timeframe.startTime,
                          backtestResults.timeframe.endTime,
                        )
                      }}
                    </div>
                  </div>
                  <div class="timeline-endpoint timeline-end">
                    <div class="timeline-label">End Time</div>
                    <div class="timeline-time">
                      {{ formatTimestamp(backtestResults.timeframe.endTime) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Per-Organization Results -->
              <div class="org-results-section">
                <h5>Results by Organization ({{ 
                  backtestResults ? backtestResults.orgResults.length : backtestLiveResults.length 
                }})</h5>

                <div
                  v-for="(orgResult, orgIndex) in (backtestResults ? backtestResults.orgResults : backtestLiveResults)"
                  :key="orgResult.oid"
                  class="org-result-card"
                  :class="{ 
                    error: orgResult.status === 'error',
                    timeout: orgResult.status === 'timeout',
                    cancelled: orgResult.status === 'cancelled'
                  }"
                >
                  <div class="org-result-header" @click="toggleOrgResult(orgIndex)">
                    <div class="org-info">
                      <div class="org-name">{{ getOrgNameOnly(orgResult.oid) }}</div>
                      <div class="org-id">{{ orgResult.oid }}</div>
                    </div>
                    <div class="org-status-wrapper">
                      <span class="org-status" :class="orgResult.status">
                        {{
                          orgResult.status === 'success'
                            ? '✅'
                            : orgResult.status === 'cancelled'
                              ? '⏹️'
                              : orgResult.status === 'timeout'
                                ? '⏰'
                                : '❌'
                        }}
                        {{
                          orgResult.status === 'success'
                            ? 'Success'
                            : orgResult.status === 'cancelled'
                              ? 'Cancelled'
                              : orgResult.status === 'timeout'
                                ? 'Timeout'
                                : 'Failed'
                        }}
                      </span>
                    </div>
                    <div class="org-summary">
                      <span v-if="orgResult.status === 'success' && orgResult.results">
                        {{ orgResult.results.length }} matches
                      </span>
                      <span v-if="orgResult.status === 'error'" class="error-text">
                        {{ orgResult.error }}
                      </span>
                      <span v-if="orgResult.status === 'cancelled'" class="cancelled-text">
                        Cancelled during execution
                      </span>
                      <span v-if="orgResult.status === 'timeout'" class="timeout-text">
                        Exceeded 30 minute limit
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
                          v-if="
                            backtestConfig.useChunkedResults
                              ? orgHasMore[orgIndex]
                              : orgResult.results.length > getDisplayedResultsForOrg(orgIndex)
                          "
                          class="load-more-section"
                        >
                          <button
                            class="btn btn-small btn-primary"
                            :disabled="orgLoadingMore[orgIndex]"
                            @click="loadMoreResultsForOrg(orgIndex)"
                          >
                            <span v-if="orgLoadingMore[orgIndex]">🔄 Loading more results...</span>
                            <span v-else-if="backtestConfig.useChunkedResults">
                              📥 Fetch More Results
                            </span>
                            <span v-else>
                              Load More ({{
                                orgResult.results.length - getDisplayedResultsForOrg(orgIndex)
                              }}
                              remaining)
                            </span>
                          </button>
                        </div>
                      </div>

                      <div v-else class="no-matches">
                        <p>No matches found for this organization.</p>
                      </div>
                    </div>

                    <div v-else-if="orgResult.status === 'error'" class="org-error-details">
                      <div class="error-message"><strong>Error:</strong> {{ orgResult.error }}</div>
                    </div>
                    <div v-else-if="orgResult.status === 'cancelled'" class="org-cancelled-details">
                      <div class="cancelled-message">
                        <strong>Cancelled:</strong> This organization was cancelled during backtest
                        execution.
                      </div>
                    </div>
                    <div v-else-if="orgResult.status === 'timeout'" class="org-timeout-details">
                      <div class="timeout-message">
                        <strong>Timeout:</strong> This organization exceeded the 30-minute execution
                        limit.
                      </div>
                      <div class="timeout-guidance">
                        The query timed out because the result set may be too large. Try narrowing
                        the time range, adding more filters, or use the LC Query Console, which
                        supports pagination for large datasets.
                      </div>
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

                <div class="import-options">
                  <label class="checkbox-wrapper">
                    <input v-model="autoOpenTopRule" type="checkbox" :disabled="isImportingIaC" />
                    <span class="checkbox-label">Automatically open first imported rule</span>
                  </label>
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

      <!-- Event Limit Help Modal -->
      <div
        v-if="showEventLimitHelp"
        class="reference-modal-overlay"
        @click="showEventLimitHelp = false"
      >
        <div class="reference-modal help-modal" @click.stop>
          <div class="reference-modal-header">
            <h3>Event Limit - Use Cases & Examples</h3>
            <button class="close-btn" @click="showEventLimitHelp = false">×</button>
          </div>
          <div class="reference-modal-content help-content">
            <div class="help-section">
              <h4>What is an Event?</h4>
              <p>An event is a single telemetry record from a sensor - such as a process execution, network connection, file modification, or registry change. The event limit controls how many events to scan through before stopping.</p>
            </div>

            <div class="help-section">
              <h4>1. Performance Testing</h4>
              <div class="code-example">
                <code>limit_event: 10000  # Process only first 10K events</code>
              </div>
              <p><strong>Use case:</strong> Quick sampling of large datasets to test rule performance without processing millions of events.</p>
            </div>

            <div class="help-section">
              <h4>2. Resource Protection</h4>
              <div class="code-example">
                <code>limit_event: 50000  # Prevent runaway queries</code>
              </div>
              <p><strong>Use case:</strong> Avoid overwhelming the replay service when testing against production data.</p>
            </div>

            <div class="help-section">
              <h4>3. Time-Bounded Sampling</h4>
              <div class="code-example">
                <code>limit_event: 5000</code>
              </div>
              <p><strong>Use case:</strong> "Sample the first 5K events from this timeframe" - useful for spot-checking rule behavior.</p>
            </div>

            <div class="help-section">
              <h4>4. Development/Testing</h4>
              <div class="code-example">
                <code>limit_event: 100</code>
              </div>
              <p><strong>Use case:</strong> Quick rule testing without processing massive datasets - ideal for iterative development.</p>
            </div>

            <div class="help-section">
              <h4>5. Capacity Planning</h4>
              <div class="code-example">
                <code>limit_event: 1000</code>
              </div>
              <div class="code-example">
                <code>limit_eval: 10</code>
              </div>
              <p><strong>Use case:</strong> "In the first 1000 events, how many matches do we get?"</p>
              <p>Helps estimate match rate: 10/1000 = 1% match rate</p>
            </div>

            <div class="help-section">
              <h4>Practical Combinations</h4>
              <div class="practical-examples">
                <div class="example">
                  <h5>Rule validation (fast)</h5>
                  <code>limit_eval: 1</code>
                  <code>limit_event: 100000</code>
                  <p>Safety net to prevent runaway queries. Stop as soon as we get one match to validate the rule works.</p>
                </div>

                <div class="example">
                  <h5>Performance testing (bounded)</h5>
                  <code>limit_event: 10000</code>
                  <code>limit_eval: 100</code>
                  <p>"Max 100 matches from first 10K events" - controlled testing.</p>
                </div>

                <div class="example">
                  <h5>Sampling</h5>
                  <code>limit_event: 5000</code>
                  <code>limit_eval: 0</code>
                  <p>No limit on evaluations. Process exactly 5K events and see all matches within them.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Evaluation Limit Help Modal -->
      <div
        v-if="showEvalLimitHelp"
        class="reference-modal-overlay"
        @click="showEvalLimitHelp = false"
      >
        <div class="reference-modal help-modal" @click.stop>
          <div class="reference-modal-header">
            <h3>Evaluation Limit - Use Cases & Examples</h3>
            <button class="close-btn" @click="showEvalLimitHelp = false">×</button>
          </div>
          <div class="reference-modal-content help-content">
            <div class="help-section">
              <h4>⚠️ Important: Evaluations ≠ Matches</h4>
              <p><strong>An evaluation occurs when the detection engine processes your rule against an event - NOT when it finds a match.</strong> This is a critical distinction that affects how you use this limit.</p>
              <p>For example: If you process 7 events and get "6 rule evaluations, 3 matches" - the engine evaluated your rule 6 times, and 3 of those evaluations resulted in matches.</p>
            </div>

            <div class="help-section">
              <h4>Why This Matters</h4>
              <div class="code-example">
                <code>❌ WRONG: limit_eval: 1  # "Stop after first match"</code>
              </div>
              <p><strong>This will likely return 0 matches!</strong> The engine stops after evaluating just one event, which probably won't match your rule.</p>
              
              <div class="code-example">
                <code>✅ RIGHT: limit_eval: 100  # "Evaluate up to 100 events"</code>
              </div>
              <p>This gives the engine enough evaluations to potentially find matches within those 100 evaluated events.</p>
            </div>

            <div class="help-section">
              <h4>No True "Match Limit"</h4>
              <p>Unfortunately, there is no parameter to say "stop after finding X matches". You can only control:</p>
              <ul>
                <li><strong>limit_event</strong>: How many events to process from the data stream</li>
                <li><strong>limit_eval</strong>: How many times to evaluate your rule (regardless of matches)</li>
              </ul>
              <p>Since you can't predict how many evaluations will occur before finding a match, you must set limit_eval high enough to allow matches to be found.</p>
            </div>

            <div class="help-section">
              <h4>Pro Tips</h4>
              <ul>
                <li><strong>Never use <code>limit_eval: 1</code></strong> - it won't find matches, just evaluate one event</li>
                <li>Start with <code>limit_eval: 10000</code> minimum for meaningful results</li>
                <li>The evaluation count includes ALL rule processing, not just matches</li>
                <li>If you get 0 matches, try increasing limit_eval significantly</li>
                <li>Watch the results: "X events processed, Y rule evaluations, Z matches" to understand the ratios</li>
                <li>Remember: You're limiting evaluations, not matches - there's no way to say "stop after 10 matches"</li>
              </ul>
            </div>

            <div class="help-section">
              <h4>1. Rule Testing (Recommended Minimums)</h4>
              <p><strong>Option 1: Quick testing</strong></p>
              <div class="code-example">
                <code>limit_eval: 1000</code>
              </div>
              <p><strong>Option 2: Thorough validation</strong></p>
              <div class="code-example">
                <code>limit_eval: 10000</code>
              </div>
              <p><strong>Use case:</strong> Give the engine enough evaluations to likely find some matches. Since you don't know the match rate, err on the side of more evaluations.</p>
            </div>

            <div class="help-section">
              <h4>2. Understanding Match Rates</h4>
              <div class="code-example">
                <code>limit_eval: 100000</code>
              </div>
              <p>After running, check results like: "Evaluated 100000 events, found 50 matches"</p>
              <p>Match rate = 50/100000 = 0.05%</p>
              <p><strong>Use case:</strong> Evaluate a large number of events to understand your rule's match rate. This helps you estimate how noisy the rule might be in production.</p>
            </div>

            <div class="help-section">
              <h4>3. Performance Protection</h4>
              <div class="code-example">
                <code>limit_eval: 50000  # Safety cap</code>
              </div>
              <p><strong>Use case:</strong> Prevent runaway evaluations when testing against large datasets. Even if you have millions of events, this caps the processing work.</p>
            </div>

            <div class="help-section">
              <h4>4. Controlled Sampling</h4>
              <div class="code-example">
                <code>limit_eval: 50</code>
              </div>
              <div class="code-example">
                <code>limit_event: 50000</code>
              </div>
              <p><strong>Use case:</strong> "Find up to 50 matches within the first 50K events" - balanced approach for rule testing.</p>
            </div>

            <div class="help-section">
              <h4>Common Patterns</h4>
              <div class="practical-examples">
                <div class="example">
                  <h5>Finding rare events</h5>
                  <code>limit_event: 1000000</code>
                  <code>limit_eval: 1000000</code>
                  <p>Process and evaluate 1M events. For high-fidelity rules with low match rates, you need to evaluate many events to find any matches.</p>
                </div>

                <div class="example">
                  <h5>Quick spot check</h5>
                  <code>limit_event: 10000</code>
                  <code>limit_eval: 10000</code>
                  <p>Process and evaluate 10K events to get a quick sense of matches without waiting too long.</p>
                </div>

                <div class="example">
                  <h5>Threat hunting</h5>
                  <code>limit_eval: 0</code>
                  <p>No limit on evaluations. When hunting for threats, evaluate everything. Just be prepared for long processing times.</p>
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
          • <RouterLink to="/changelog" class="version-link">v{{ currentVersion }}</RouterLink>
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
import { getCurrentVersion } from '../utils/version'
import Logo from './Logo.vue'
import ThemeToggle from './ThemeToggle.vue'
// CodeMirror v6 imports
import {
  EditorView,
  keymap,
  highlightActiveLine,
  lineNumbers,
  drawSelection,
} from '@codemirror/view'
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { yaml as yamlLang } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'
import { search, searchKeymap } from '@codemirror/search'
import { foldGutter, codeFolding, foldKeymap } from '@codemirror/language'
import { bracketMatching } from '@codemirror/language'
import { linter, lintGutter } from '@codemirror/lint'
import * as yaml from 'js-yaml'
import { DRCompletionEngine } from '../utils/drCompletionEngine'

const appStore = useAppStore()
const api = useApi()
const storage = useStorage()
const auth = useAuth()
const currentVersion = getCurrentVersion()

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
const showEventLimitHelp = ref(false)
const showEvalLimitHelp = ref(false)
const _savedRulesUpdateTrigger = ref(0) // Reactive trigger for localStorage changes

// Import from IaC functionality
const iacImportContent = ref('')
const isImportingIaC = ref(false)
const iacImportResult = ref<{
  success: boolean
  message: string
  importedRules: Array<{ name: string; success: boolean; error?: string }>
} | null>(null)

// Auto-open top rule checkbox state (persistent)
const autoOpenTopRule = ref(localStorage.getItem('detectionforge_auto_open_top_rule') === 'true')

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
const isCancellingBacktest = ref(false)
let backtestAbortController: AbortController | null = null
const timingUpdateInterval = ref<number | null>(null)
const currentTime = ref(Date.now())

// Computed property for sorted org statuses during execution
const sortedOrgStatuses = computed(() => {
  if (!isRunningBacktest.value) {
    // When not running, maintain original order
    return backtestProgress.value.orgStatuses
  }

  // During execution, sort: running first, then pending, then completed/failed/timeout/cancelled
  return [...backtestProgress.value.orgStatuses].sort((a, b) => {
    const statusPriority = {
      running: 1,
      pending: 2,
      completed: 3,
      timeout: 3,
      error: 3,
      cancelled: 3,
    }

    const aPriority = statusPriority[a.status] || 4
    const bPriority = statusPriority[b.status] || 4

    // If same priority, maintain original order by using the original index
    if (aPriority === bPriority) {
      const aIndex = backtestProgress.value.orgStatuses.findIndex((org) => org.oid === a.oid)
      const bIndex = backtestProgress.value.orgStatuses.findIndex((org) => org.oid === b.oid)
      return aIndex - bIndex
    }

    return aPriority - bPriority
  })
})
const backtestProgress = ref({
  current: 0,
  total: 0,
  currentOrgName: '',
  currentOid: '',
  orgStatuses: [] as Array<{
    oid: string
    orgName: string
    status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled' | 'timeout'
    startTime?: number
    endTime?: number
    duration?: number
    matchCount?: number
    eventCount?: number
    evalCount?: number
  }>,
})

// Live results that update as each org completes
const backtestLiveResults = ref<BacktestOrgResult[]>([])
const backtestResults = ref<BacktestResults | null>(null)
const displayedResults = ref(10) // Start by showing 10 results
const expandedMatches = ref(new Set<string>()) // Changed to string to support org-match format
const activeMatchTab = ref<Record<string, string>>({}) // Changed to string keys
const expandedOrgResults = ref(new Set<number>()) // Track which org results are expanded
const orgDisplayedResults = ref<Record<number, number>>({}) // Track displayed results per org

// Cursor-based pagination state
const orgCursors = ref<Record<number, string>>({}) // Track cursors per org
const orgHasMore = ref<Record<number, boolean>>({}) // Track if more results available per org
const orgLoadingMore = ref<Record<number, boolean>>({}) // Track loading state per org

// Backtest-specific organization selection
const backtestSelectedOids = ref<string[]>([])

const backtestConfig = reactive({
  startDateTime: '',
  endDateTime: '',
  eventLimit: 0,
  evalLimit: 0,
  runInParallel: true, // Default to parallel execution for better performance
  useChunkedResults: false, // Opt-in for chunked results
  sid: '', // Optional sensor ID for targeted testing
  stream: 'event', // Data stream to replay (event, audit, detect)
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
  timeframe: {
    startTime: string
    endTime: string
    durationDays: number
  }
  executionStats: {
    startedAt: string
    completedAt: string
    totalExecutionTime: number
  }
  completionStats: {
    totalOrgs: number
    completedOrgs: number
    failedOrgs: number
    cancelledOrgs: number
    timeoutOrgs: number
    wasCancelled: boolean
    orgsWithZeroHits: number
    avgMatchesPerOrg: number
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
  status: 'success' | 'error' | 'cancelled' | 'timeout'
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
      activateOnTyping: true,
      closeOnBlur: true,
      override: [DRCompletionEngine.getCompletions],
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
        BASE_ADDRESS: 140697158615040,
        COMMAND_LINE: 'C:\\Windows\\System32\\notepad.exe',
        FILE_IS_SIGNED: 1,
        FILE_PATH: 'C:\\Windows\\System32\\notepad.exe',
        HASH: 'abc123def456789012345678901234567890123456789012345678901234abcd',
        MEMORY_USAGE: 8388608,
        PARENT: {
          COMMAND_LINE: 'C:\\Windows\\explorer.exe',
          FILE_IS_SIGNED: 1,
          FILE_PATH: '\\Device\\HarddiskVolume4\\Windows\\explorer.exe',
          HASH: 'def456abc789012345678901234567890123456789012345678901234567890',
          MEMORY_USAGE: 67108864,
          PARENT_ATOM: 'grandparent123456789abc567890ab',
          PARENT_PROCESS_ID: 1000,
          PROCESS_ID: 2000,
          THIS_ATOM: 'parent123456789abcdef567890123456',
          THREADS: 8,
          TIMESTAMP: 1700000000000,
          USER_NAME: 'DESKTOP\\TestUser',
        },
        PARENT_PROCESS_ID: 2000,
        PROCESS_ID: 3000,
        THREADS: 4,
        USER_NAME: 'DESKTOP\\TestUser',
      },
      routing: {
        arch: 2,
        did: '',
        event_id: '12345678-1234-5678-9abc-def012345678',
        event_time: 1700000001000,
        event_type: 'NEW_PROCESS',
        ext_ip: '192.168.1.100',
        hostname: 'test-workstation',
        iid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        int_ip: '192.168.1.50',
        latency: 100,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        parent: 'parent123456789abcdef567890123456',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-workstation', 'windows', 'workstation'],
        this: 'child123456789abcdef567890123456',
      },
      ts: '2023-11-15 00:00:01',
    },
  },
  existing_process: {
    name: 'EXISTING_PROCESS - Running Process',
    data: {
      event: {
        BASE_ADDRESS: 140701487005696,
        COMMAND_LINE: 'C:\\Program Files\\Internet Explorer\\iexplore.exe',
        CREATION_TIME: 1700000000500,
        FILE_IS_SIGNED: 1,
        FILE_PATH: 'C:\\Program Files\\Internet Explorer\\iexplore.exe',
        HASH: 'f985650d229148704d7037c8d5485a780ed6d6cd27eba497bcf8d29c3c5a101d',
        MEMORY_USAGE: 154771456,
        PARENT: {
          BASE_ADDRESS: 140700942467072,
          COMMAND_LINE: 'C:\\Windows\\explorer.exe',
          CREATION_TIME: 1700000000000,
          FILE_IS_SIGNED: 1,
          FILE_PATH: 'C:\\Windows\\explorer.exe',
          HASH: '9ab0e290352c8826e3126eab13e8598260a06149de9e39206705510aa5a03b1e',
          MEMORY_USAGE: 95064064,
          PARENT_ATOM: 'grandparent567890123456789012345',
          PARENT_PROCESS_ID: 2000,
          PROCESS_ID: 2500,
          THIS_ATOM: '97a488029a3990f53557555268614269',
          THREADS: 32,
          TIMESTAMP: 1700000000000,
          USER_NAME: 'DESKTOP\\TestUser',
        },
        PARENT_PROCESS_ID: 2500,
        PROCESS_ID: 3500,
        THREADS: 28,
        USER_NAME: 'DESKTOP\\TestUser',
      },
      routing: {
        arch: 2,
        did: '',
        event_id: '11111111-2222-3333-4444-555555555555',
        event_time: 1700000001500,
        event_type: 'EXISTING_PROCESS',
        ext_ip: '192.168.1.100',
        hostname: 'test-workstation',
        iid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        int_ip: '192.168.1.50',
        latency: 150,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        parent: '97a488029a3990f53557555268614269',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-workstation', 'windows', 'workstation'],
        this: '1127d54639137a98a0fb202d6861426a',
      },
      ts: '2023-11-15 00:00:01.5',
    },
  },
  new_document: {
    name: 'NEW_DOCUMENT - File Creation',
    data: {
      event: {
        FILE_PATH: 'C:\\Users\\TestUser\\Documents\\report.docx',
        HASH: 'fedcba987654321098765432109876543210987654321098765432109876ab',
        PROCESS_ID: 4000,
      },
      routing: {
        arch: 2,
        did: '',
        event_id: 'abcdef12-3456-7890-abcd-ef1234567890',
        event_time: 1700000002000,
        event_type: 'NEW_DOCUMENT',
        ext_ip: '192.168.1.100',
        hostname: 'test-workstation',
        iid: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
        int_ip: '192.168.1.50',
        latency: 50,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        parent: 'parent123456789abcdef567890123456',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-workstation', 'windows', 'workstation'],
        this: 'document123456789abcd567890123456',
      },
      ts: '2023-11-15 00:00:02',
    },
  },
  network_connections: {
    name: 'NETWORK_CONNECTIONS - Multiple Network Activity',
    data: {
      event: {
        COMMAND_LINE: 'C:\\Windows\\System32\\svchost.exe -k NetworkService',
        CREATION_TIME: 1700000000000,
        FILE_IS_SIGNED: 1,
        FILE_PATH: 'C:\\Windows\\System32\\svchost.exe',
        HASH: '31780ff2aaf7bc71f755ba0e4fef1d61b060d1d2741eafb33cbab44d889595a0',
        NETWORK_ACTIVITY: [
          {
            DESTINATION: {
              IP_ADDRESS: '192.168.1.50',
              PORT: 3389,
            },
            IS_OUTGOING: 0,
            PROTOCOL: 'tcp4',
            SOURCE: {
              IP_ADDRESS: '203.0.113.45',
              PORT: 49152,
            },
            TIMESTAMP: 1700000001000,
          },
          {
            DESTINATION: {
              IP_ADDRESS: '192.168.1.50',
              PORT: 443,
            },
            IS_OUTGOING: 1,
            PROTOCOL: 'tcp4',
            SOURCE: {
              IP_ADDRESS: '192.168.1.50',
              PORT: 54321,
            },
            TIMESTAMP: 1700000002000,
          },
          {
            DESTINATION: {
              IP_ADDRESS: '192.168.1.50',
              PORT: 80,
            },
            IS_OUTGOING: 1,
            PROTOCOL: 'tcp4',
            SOURCE: {
              IP_ADDRESS: '192.168.1.50',
              PORT: 54322,
            },
            TIMESTAMP: 1700000003000,
          },
        ],
        PARENT_PROCESS_ID: 1000,
        PROCESS_ID: 6000,
        USER_NAME: 'NT AUTHORITY\\NETWORK SERVICE',
      },
      routing: {
        arch: 2,
        did: '',
        event_id: '33333333-4444-5555-6666-777777777777',
        event_time: 1700000006000,
        event_type: 'NETWORK_CONNECTIONS',
        ext_ip: '192.168.1.100',
        hostname: 'test-workstation',
        iid: 'ffffffff-0000-1111-2222-333333333333',
        int_ip: '192.168.1.50',
        latency: 75,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        parent: 'parent123456789abcdef567890123456',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-workstation', 'windows', 'workstation'],
        this: 'net123456789abcdef000567890123456',
      },
      ts: '2023-11-15 00:00:06',
    },
  },
  registry_write: {
    name: 'REGISTRY_WRITE - Registry Modification',
    data: {
      event: {
        PROCESS_ID: 7000,
        USER_NAME: 'DESKTOP\\TestUser',
        FILE_PATH: 'C:\\Windows\\regedit.exe',
        REGISTRY_KEY: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        REGISTRY_VALUE: 'TestApplication',
        REGISTRY_DATA: 'C:\\Program Files\\TestApp\\app.exe',
        REGISTRY_TYPE: 'REG_SZ',
      },
      routing: {
        arch: 2,
        did: '',
        event_id: '44444444-5555-6666-7777-888888888888',
        event_time: 1700000007000,
        event_type: 'REGISTRY_WRITE',
        ext_ip: '192.168.1.100',
        hostname: 'test-workstation',
        iid: '00000000-1111-2222-3333-444444444444',
        int_ip: '192.168.1.50',
        latency: 20,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        parent: 'parent123456789abcdef567890123456',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-workstation', 'windows', 'workstation'],
        this: 'reg123456789abcdef000567890123456',
      },
      ts: '2023-11-15 00:00:07',
    },
  },
  wel: {
    name: 'WEL - Windows Event Log',
    data: {
      event: {
        EVENT: {
          EventData: {
            AuthenticationPackageName: 'Kerberos',
            ElevatedToken: '%%1842',
            ImpersonationLevel: '%%1833',
            IpAddress: '192.168.1.25',
            IpPort: '52496',
            KeyLength: '0',
            LmPackageName: '-',
            LogonGuid: '{a271f26a-567b-84a9-21c9-df633d10bc44}',
            LogonProcessName: 'Kerberos',
            LogonType: '3',
            ProcessId: '0x0',
            ProcessName: '-',
            RestrictedAdminMode: '-',
            SubjectDomainName: '-',
            SubjectLogonId: '0x0',
            SubjectUserName: '-',
            SubjectUserSid: 'S-1-0-0',
            TargetDomainName: 'TESTDOMAIN',
            TargetLinkedLogonId: '0x0',
            TargetLogonId: '0x11668894c',
            TargetOutboundDomainName: '-',
            TargetOutboundUserName: '-',
            TargetUserName: 'TestUser',
            TargetUserSid: 'S-1-5-21-1234567890-123456789-123456789-1001',
            TransmittedServices: '-',
            VirtualAccount: '%%1843',
            WorkstationName: '-',
          },
          System: {
            Channel: 'Security',
            Computer: 'test-server.testdomain.local',
            EventID: '4624',
            EventRecordID: '12345678',
            Execution: {
              ProcessID: '796',
              ThreadID: '1234',
            },
            Keywords: '0x8020000000000000',
            Level: '0',
            Provider: {
              Guid: '{54849625-5478-4994-a5ba-3e3b0328c30d}',
              Name: 'Microsoft-Windows-Security-Auditing',
            },
            Task: '12544',
            TimeCreated: {
              SystemTime: '2023-11-15T00:00:04.000Z',
            },
            Version: '2',
            _event_id: '4624',
          },
        },
      },
      routing: {
        arch: 2,
        did: '',
        event_id: '11111111-2222-3333-4444-555555555555',
        event_time: 1700000004000,
        event_type: 'WEL',
        ext_ip: '192.168.1.100',
        hostname: 'test-server',
        iid: 'dddddddd-eeee-ffff-0000-111111111111',
        int_ip: '192.168.1.25',
        latency: 10,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-server', 'windows', 'server'],
        this: 'wel123456789abcdef000567890123456',
      },
      ts: '2023-11-15 00:00:04',
    },
  },
  dns_request: {
    name: 'DNS_REQUEST - Domain Resolution',
    data: {
      event: {
        CNAME: 'example-service.cloudprovider.net',
        DNS_TYPE: 5,
        DOMAIN_NAME: 'example.com',
        MESSAGE_ID: 12345,
        PROCESS_ID: 5000,
      },
      routing: {
        arch: 2,
        did: '',
        event_id: '22222222-3333-4444-5555-666666666666',
        event_time: 1700000005000,
        event_type: 'DNS_REQUEST',
        ext_ip: '192.168.1.100',
        hostname: 'test-workstation',
        iid: 'eeeeeeee-ffff-0000-1111-222222222222',
        int_ip: '192.168.1.50',
        latency: 15,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        parent: 'parent123456789abcdef567890123456',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-workstation', 'windows', 'workstation'],
        this: 'dns123456789abcdef000567890123456',
      },
      ts: '2023-11-15 00:00:05',
    },
  },
  code_identity: {
    name: 'CODE_IDENTITY - Binary Signature Check',
    data: {
      event: {
        ACCESS_TIME: 1700000003000,
        ATTRIBUTES: 0,
        CREATION_TIME: 1700000000000,
        ERROR: 0,
        FILE_INFO: '10.0.19041.1234',
        FILE_PATH: 'C:\\Users\\TestUser\\AppData\\Local\\Temp\\example.dll',
        FILE_SIZE: 524288,
        HASH: '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        HASH_MD5: '123456789abcdef0123456789abcdef01',
        HASH_SHA1: '123456789abcdef0123456789abcdef0123456789a',
        MODIFICATION_TIME: 1700000001000,
        ORIGINAL_FILE_NAME: 'example.dll',
        SIGNATURE: {
          CERT_ISSUER: 'C=US, O=Test Corporation, CN=Test Code Signing CA',
          CERT_SUBJECT: 'C=US, O=Test Corporation, CN=Test Application',
          FILE_CERT_IS_VERIFIED_LOCAL: 1,
          FILE_IS_SIGNED: 1,
          FILE_PATH: 'C:\\Users\\TestUser\\AppData\\Local\\Temp\\example.dll',
        },
      },
      routing: {
        arch: 2,
        did: '',
        event_id: 'fedcba98-7654-3210-fedc-ba9876543210',
        event_time: 1700000003000,
        event_type: 'CODE_IDENTITY',
        ext_ip: '192.168.1.100',
        hostname: 'test-workstation',
        iid: 'cccccccc-dddd-eeee-ffff-000000000000',
        int_ip: '192.168.1.50',
        latency: 25,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        parent: 'parent123456789abcdef567890123456',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-workstation', 'windows', 'workstation'],
        this: 'code123456789abcdef00567890123456',
      },
      ts: '2023-11-15 00:00:03',
    },
  },
  service_change: {
    name: 'SERVICE_CHANGE - Windows Service State Change',
    data: {
      event: {
        EXECUTABLE: '%SystemRoot%\\servicing\\TrustedInstaller.exe',
        FILE_IS_SIGNED: 1,
        HASH: 'aa058fa0508579588f0bef5859ee85307eb1618271daf0a7c9d9e02ed4682a71',
        PROCESS_ID: 0,
        SVC_DISPLAY_NAME: 'Windows Modules Installer',
        SVC_NAME: 'TrustedInstaller',
        SVC_STATE: 1,
        SVC_TYPE: 16,
      },
      routing: {
        arch: 2,
        did: '',
        event_id: 'b2ca2d38-23ed-4125-b353-23db27fb5cb6',
        event_time: 1700000008000,
        event_type: 'SERVICE_CHANGE',
        ext_ip: '192.168.1.100',
        hostname: 'test-server',
        iid: '11111111-2222-3333-4444-555555555555',
        int_ip: '192.168.1.50',
        latency: 25,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-server', 'windows', 'server'],
        this: '8d32f20ffee0a94a94acb7cd660323ac',
      },
      ts: '2023-11-15 00:00:08',
    },
  },
  sensitive_process_access: {
    name: 'SENSITIVE_PROCESS_ACCESS - Process Memory Access',
    data: {
      event: {
        EVENTS: [
          {
            event: {
              BASE_ADDRESS: 140696725291008,
              COMMAND_LINE: 'C:\\Windows\\system32\\lsass.exe',
              CREATION_TIME: 1700000000000,
              FILE_IS_SIGNED: 1,
              FILE_PATH: 'C:\\Windows\\system32\\lsass.exe',
              HASH: '99e842b7f440dbd3806563c251bda45bb494684b934bd1a2d0c5b4bec379df81',
              MEMORY_USAGE: 16060416,
              PARENT: {
                FILE_IS_SIGNED: 1,
                FILE_PATH: '\\Device\\HarddiskVolume3\\Windows\\System32\\wininit.exe',
                HASH: 'f2041d07388d41fa657b48cc49735899f27baed095458da7bae53e28c126f092',
                MEMORY_USAGE: 7356416,
                PARENT_PROCESS_ID: 420,
                PROCESS_ID: 496,
                THIS_ATOM: '8aaed2fc6aa8490647a3abd465f11872',
                THREADS: 8,
                TIMESTAMP: 1700000000000,
                USER_NAME: 'NT AUTHORITY\\SYSTEM',
              },
              PARENT_PROCESS_ID: 496,
              PROCESS_ID: 640,
              THREADS: 12,
              USER_NAME: 'NT AUTHORITY\\SYSTEM',
            },
            routing: {
              arch: 2,
              did: '',
              event_id: '60d890d8-3999-4c44-b499-d825784b904f',
              event_time: 1700000009000,
              event_type: 'EXISTING_PROCESS',
              ext_ip: '192.168.1.100',
              hostname: 'test-server',
              iid: '22222222-3333-4444-5555-666666666666',
              int_ip: '192.168.1.50',
              moduleid: 2,
              oid: '11111111-1111-1111-1111-111111111111',
              parent: '8aaed2fc6aa8490647a3abd465f11872',
              plat: 268435456,
              sid: '22222222-2222-2222-2222-222222222222',
              tags: ['test-server', 'windows', 'server'],
              this: 'fe7f6452d1451d5a9d2a043065f11872',
            },
          },
          {
            event: {
              ACCESS_FLAGS: 5136,
              PARENT_PROCESS_ID: 3924,
              PROCESS_ID: 640,
              SOURCE: {
                BASE_ADDRESS: 140694709075968,
                COMMAND_LINE: 'C:\\Windows\\system32\\wbem\\wmiprvse.exe -secured -Embedding',
                FILE_IS_SIGNED: 1,
                FILE_PATH: 'C:\\Windows\\system32\\wbem\\wmiprvse.exe',
                HASH: '1792731e030b7fe35a7eb21c9f907eae6e4ac381de918003f2709185c4ce0a5a',
                MEMORY_USAGE: 14254080,
                PARENT_ATOM: '79a5cb4219b4f9e3f635cf8565f11873',
                PARENT_PROCESS_ID: 752,
                PROCESS_ID: 3924,
                THIS_ATOM: 'bcb4eb3725611a5887d299c8660326c2',
                THREADS: 10,
                TIMESTAMP: 1700000009500,
                USER_NAME: 'NT AUTHORITY\\NETWORK SERVICE',
              },
              TARGET: {
                BASE_ADDRESS: 140696725291008,
                COMMAND_LINE: 'C:\\Windows\\system32\\lsass.exe',
                CREATION_TIME: 1700000000000,
                FILE_IS_SIGNED: 1,
                FILE_PATH: 'C:\\Windows\\system32\\lsass.exe',
                HASH: '99e842b7f440dbd3806563c251bda45bb494684b934bd1a2d0c5b4bec379df81',
                MEMORY_USAGE: 16060416,
                PARENT_ATOM: '8aaed2fc6aa8490647a3abd465f11872',
                PARENT_PROCESS_ID: 496,
                PROCESS_ID: 640,
                THIS_ATOM: 'fe7f6452d1451d5a9d2a043065f11872',
                THREADS: 12,
                TIMESTAMP: 1700000000000,
                USER_NAME: 'NT AUTHORITY\\SYSTEM',
              },
            },
            routing: {
              arch: 2,
              did: '',
              event_id: 'b29791e7-e210-4c43-9997-ae48780603a4',
              event_time: 1700000009600,
              event_type: 'REMOTE_PROCESS_HANDLE',
              ext_ip: '192.168.1.100',
              hostname: 'test-server',
              iid: '33333333-4444-5555-6666-777777777777',
              int_ip: '192.168.1.50',
              moduleid: 2,
              oid: '11111111-1111-1111-1111-111111111111',
              parent: 'bcb4eb3725611a5887d299c8660326c2',
              plat: 268435456,
              sid: '22222222-2222-2222-2222-222222222222',
              tags: ['test-server', 'windows', 'server'],
              target: 'fe7f6452d1451d5a9d2a043065f11872',
              this: '6c1038719972ce7c7c60b78e660326c2',
            },
          },
        ],
      },
      routing: {
        arch: 2,
        did: '',
        event_id: 'd6402af1-5491-4f71-b2e2-04caebf52e3e',
        event_time: 1700000009700,
        event_type: 'SENSITIVE_PROCESS_ACCESS',
        ext_ip: '192.168.1.100',
        hostname: 'test-server',
        iid: '44444444-5555-6666-7777-888888888888',
        int_ip: '192.168.1.50',
        latency: 30,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        parent: 'bcb4eb3725611a5887d299c8660326c2',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-server', 'windows', 'server'],
        target: 'fe7f6452d1451d5a9d2a043065f11872',
        this: 'cb47c14f70f1c304bb5ab6ba660326c2',
      },
      ts: '2023-11-15 00:00:09.7',
    },
  },
  new_remote_thread: {
    name: 'NEW_REMOTE_THREAD - Remote Thread Creation',
    data: {
      event: {
        PARENT_PROCESS_ID: 632,
        PROCESS_ID: 4432,
        SOURCE: {
          FILE_IS_SIGNED: 1,
          FILE_PATH: '\\Device\\HarddiskVolume3\\Windows\\System32\\services.exe',
          HASH: '854780206e7abbf5a46704f1e75c5075881e4e914c7b44bea45fac1677781096',
          MEMORY_USAGE: 9617408,
          PARENT_ATOM: '515e2eb7c461a443719a5e0d6603337d',
          PARENT_PROCESS_ID: 500,
          PROCESS_ID: 632,
          THIS_ATOM: '5774ceb193c7e448c663a5a66603337d',
          THREADS: 34,
          TIMESTAMP: 1700000010000,
          USER_NAME: 'NT AUTHORITY\\SYSTEM',
        },
        TARGET: {
          BASE_ADDRESS: 140695964876800,
          COMMAND_LINE: 'C:\\Windows\\System32\\msdtc.exe',
          FILE_IS_SIGNED: 1,
          FILE_PATH: 'C:\\Windows\\System32\\msdtc.exe',
          HASH: '5c298ea8d4b45394c87358935b97a7f6d7e9d77d8ded02dd43e8acbfb2375649',
          MEMORY_USAGE: 11493376,
          PARENT_ATOM: '5774ceb193c7e448c663a5a66603337d',
          PARENT_PROCESS_ID: 632,
          PROCESS_ID: 4432,
          THIS_ATOM: '81371386aacc50c4ce82233866033381',
          THREADS: 15,
          TIMESTAMP: 1700000010000,
          USER_NAME: 'NT AUTHORITY\\NETWORK SERVICE',
        },
        THREAD_ID: 4436,
      },
      routing: {
        arch: 2,
        did: '',
        event_id: '2b897430-142d-4bb2-aa97-36e6b2dce4d0',
        event_time: 1700000010000,
        event_type: 'NEW_REMOTE_THREAD',
        ext_ip: '192.168.1.100',
        hostname: 'test-server',
        iid: '55555555-6666-7777-8888-999999999999',
        int_ip: '192.168.1.50',
        latency: 35,
        moduleid: 2,
        oid: '11111111-1111-1111-1111-111111111111',
        parent: '5774ceb193c7e448c663a5a66603337d',
        plat: 268435456,
        sid: '22222222-2222-2222-2222-222222222222',
        tags: ['test-server', 'windows', 'server'],
        target: '81371386aacc50c4ce82233866033381',
        this: 'ff809f4508ffb66e25e49c1766033383',
      },
      ts: '2023-11-15 00:00:10',
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

  // Auto-collapse all tests before running
  collapseAllTests()

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
    isCancellingBacktest.value = false

    // Create AbortController for this backtest session
    backtestAbortController = new AbortController()

    // Start timing update interval for real-time display
    timingUpdateInterval.value = window.setInterval(() => {
      currentTime.value = Date.now()
    }, 1000)

    const backtestStartTime = Date.now()
    const backtestStartTimestamp = new Date().toISOString()

    // Clear previous results before starting new backtest
    backtestResults.value = null
    backtestLiveResults.value = []
    expandedMatches.value.clear()
    activeMatchTab.value = {}
    expandedOrgResults.value.clear()
    displayedResults.value = 10

    // Clear cursor-based pagination state
    orgCursors.value = {}
    orgHasMore.value = {}
    orgLoadingMore.value = {}

    // Ensure we have selected organizations for backtest
    if (!backtestSelectedOids.value || backtestSelectedOids.value.length === 0) {
      throw new Error('No organizations selected for backtest')
    }

    // Convert datetime strings to Unix timestamps
    // Treat datetime-local inputs as UTC time (since LimaCharlie stores events in UTC)
    const startTimestamp = Math.floor(new Date(backtestConfig.startDateTime + 'Z').getTime() / 1000)
    const endTimestamp = Math.floor(new Date(backtestConfig.endDateTime + 'Z').getTime() / 1000)

    // Calculate timeframe statistics
    const startTime = new Date(backtestConfig.startDateTime + 'Z')
    const endTime = new Date(backtestConfig.endDateTime + 'Z')
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationDays = Math.round((durationMs / (1000 * 60 * 60 * 24)) * 100) / 100 // Round to 2 decimal places

    appStore.addNotification(
      'info',
      `Starting ${backtestConfig.runInParallel ? 'parallel' : 'sequential'} backtest for ${backtestSelectedOids.value.length} organization(s)... This may take several minutes for large time ranges.`,
    )

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
      currentOrgName: backtestConfig.runInParallel ? 'Running in parallel...' : '',
      currentOid: '',
      orgStatuses: backtestSelectedOids.value.map((oid) => ({
        oid,
        orgName: auth.getOrgName(oid),
        status: 'pending' as const,
      })),
    }

    let orgResults: BacktestOrgResult[] = []

    if (backtestConfig.runInParallel) {
      // PARALLEL EXECUTION
      // Create backtest promises for all organizations
      const backtestPromises = backtestSelectedOids.value.map(async (oid) => {
        try {
          // Check for cancellation before starting
          if (isCancellingBacktest.value) {
            throw new Error('Backtest cancelled')
          }

          // Update status to running and track start time
          const orgStatus = backtestProgress.value.orgStatuses.find((org) => org.oid === oid)
          if (orgStatus) {
            orgStatus.status = 'running'
            orgStatus.startTime = Date.now()
          }

          // Get the replay URL specific to this organization
          const orgReplayUrl = storage.getOrganizationReplayUrl(oid)
          if (!orgReplayUrl) {
            throw new Error(`Replay URL not available for organization ${oid}`)
          }

          // Check for cancellation before API call
          if (isCancellingBacktest.value) {
            throw new Error('Backtest cancelled')
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
            backtestAbortController || undefined,
            30 * 60 * 1000, // 30 minute timeout
            undefined, // Let backend auto-detect stateful requirements
            false, // isDryRun
            '', // Initial cursor (empty string for new queries)
            backtestConfig.sid, // Optional sensor ID
            false, // isValidation (always false since we removed the toggle)
            backtestConfig.stream, // Data stream
          )

          // Update progress for completed organization (atomic operation)
          backtestProgress.value.current++

          // Update status to completed and track end time
          if (orgStatus) {
            orgStatus.status = 'completed'
            orgStatus.endTime = Date.now()
            if (orgStatus.startTime) {
              orgStatus.duration = orgStatus.endTime - orgStatus.startTime
            }
            // Add result summary for parallel execution
            orgStatus.matchCount = response.results?.length || 0
            orgStatus.eventCount = response.stats?.n_event || 0
            orgStatus.evalCount = response.stats?.n_evals || 0
          }

          // Store cursor information for pagination
          const orgIndex = backtestSelectedOids.value.indexOf(oid)
          if (orgIndex >= 0 && backtestConfig.useChunkedResults) {
            orgCursors.value[orgIndex] = response.cursor || ''
            orgHasMore.value[orgIndex] = response.has_more || false
          }

          // Return successful result
          return {
            oid,
            orgName: auth.getOrgName(oid),
            status: 'success' as const,
            stats: response.stats,
            results: response.results || [],
            did_match: response.did_match,
            is_dry_run: response.is_dry_run,
          }
        } catch (error: unknown) {
          // Update progress for failed organization (atomic operation)
          backtestProgress.value.current++

          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const isCancelled =
            errorMessage === 'Backtest cancelled' ||
            (error instanceof DOMException && error.name === 'AbortError')
          const isTimeout = errorMessage.includes('Backtest timeout')

          // Update status appropriately and track end time
          const orgStatus = backtestProgress.value.orgStatuses.find((org) => org.oid === oid)
          if (orgStatus) {
            orgStatus.status = isCancelled ? 'cancelled' : isTimeout ? 'timeout' : 'error'
            orgStatus.endTime = Date.now()
            if (orgStatus.startTime) {
              orgStatus.duration = orgStatus.endTime - orgStatus.startTime
            }
          }

          // Return appropriate result
          return {
            oid,
            orgName: auth.getOrgName(oid),
            status: (isCancelled ? 'cancelled' : isTimeout ? 'timeout' : 'error') as
              | 'cancelled'
              | 'timeout'
              | 'error',
            ...(isCancelled || isTimeout ? {} : { error: errorMessage }),
          }
        }
      })

      // Wait for all backtests to complete or handle cancellation with total timeout
      const totalTimeoutMs = 45 * 60 * 1000 // 45 minutes for parallel execution
      const totalTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Parallel backtest total timeout: Exceeded 45 minutes'))
        }, totalTimeoutMs)
      })

      const settledPromises = await Promise.race([
        Promise.allSettled(backtestPromises),
        totalTimeoutPromise,
      ]).catch(async (error) => {
        // If total timeout occurred, abort all operations and wait for settled results
        if (error.message.includes('total timeout')) {
          if (backtestAbortController) {
            backtestAbortController.abort()
          }
          // Wait a bit for abort to propagate then get settled results
          await new Promise((resolve) => setTimeout(resolve, 1000))
          return Promise.allSettled(backtestPromises)
        }
        throw error
      })

      // Extract results from settled promises (each promise already handles its own error/cancellation state)
      orgResults = settledPromises.map((result) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          // This should rarely happen since promises handle their own errors, but just in case
          const errorMessage =
            result.reason instanceof Error ? result.reason.message : 'Unknown error'
          return {
            oid: 'unknown',
            orgName: 'Unknown',
            status: 'error' as const,
            error: errorMessage,
          }
        }
      })
    } else {
      // SERIAL EXECUTION (Original behavior)
      for (let i = 0; i < backtestSelectedOids.value.length; i++) {
        // Check for cancellation before processing each org
        if (isCancellingBacktest.value) {
          // Mark remaining orgs as cancelled
          for (let j = i; j < backtestSelectedOids.value.length; j++) {
            const remainingOid = backtestSelectedOids.value[j]
            const orgStatus = backtestProgress.value.orgStatuses.find(
              (org) => org.oid === remainingOid,
            )
            if (orgStatus) {
              orgStatus.status = 'cancelled'
            }
            const cancelledResult = {
              oid: remainingOid,
              orgName: auth.getOrgName(remainingOid),
              status: 'cancelled' as const,
            }
            orgResults.push(cancelledResult)
            backtestLiveResults.value.push(cancelledResult)
          }
          break
        }

        const oid = backtestSelectedOids.value[i]

        try {
          // Update progress
          backtestProgress.value.current = i + 1
          backtestProgress.value.currentOid = oid
          backtestProgress.value.currentOrgName = auth.getOrgName(oid)

          // Update org status if tracking and start timing
          const runningOrgStatus = backtestProgress.value.orgStatuses.find((org) => org.oid === oid)
          if (runningOrgStatus) {
            runningOrgStatus.status = 'running'
            runningOrgStatus.startTime = Date.now()
          }

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
            backtestAbortController || undefined,
            30 * 60 * 1000, // 30 minute timeout
            undefined, // Let backend auto-detect stateful requirements
            false, // isDryRun
            '', // Initial cursor (empty string for new queries)
            backtestConfig.sid, // Optional sensor ID
            false, // isValidation (always false since we removed the toggle)
            backtestConfig.stream, // Data stream
          )

          // Store cursor information for pagination
          const orgIndex = orgResults.length // Current index before pushing
          if (backtestConfig.useChunkedResults) {
            orgCursors.value[orgIndex] = response.cursor || ''
            orgHasMore.value[orgIndex] = response.has_more || false
          }

          // Add successful result
          const result = {
            oid,
            orgName: auth.getOrgName(oid),
            status: 'success' as const,
            stats: response.stats,
            results: response.results || [],
            did_match: response.did_match,
            is_dry_run: response.is_dry_run,
          }
          orgResults.push(result)
          backtestLiveResults.value.push(result)

          // Update org status to completed and track timing
          const completedOrgStatus = backtestProgress.value.orgStatuses.find(
            (org) => org.oid === oid,
          )
          if (completedOrgStatus) {
            completedOrgStatus.status = 'completed'
            completedOrgStatus.endTime = Date.now()
            if (completedOrgStatus.startTime) {
              completedOrgStatus.duration =
                completedOrgStatus.endTime - completedOrgStatus.startTime
            }
            // Add result summary
            completedOrgStatus.matchCount = response.results?.length || 0
            completedOrgStatus.eventCount = response.stats?.n_event || 0
            completedOrgStatus.evalCount = response.stats?.n_evals || 0
          }
        } catch (error: unknown) {
          // Backtest failed for this organization - handle error
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const isCancelled =
            errorMessage === 'Backtest cancelled' ||
            (error instanceof DOMException && error.name === 'AbortError')
          const isTimeout = errorMessage.includes('Backtest timeout')

          // Add appropriate result
          const errorResult = {
            oid,
            orgName: auth.getOrgName(oid),
            status: (isCancelled ? 'cancelled' : isTimeout ? 'timeout' : 'error') as
              | 'cancelled'
              | 'timeout'
              | 'error',
            ...(isCancelled || isTimeout ? {} : { error: errorMessage }),
          }
          orgResults.push(errorResult)
          backtestLiveResults.value.push(errorResult)

          // Update org status appropriately and track timing
          const errorOrgStatus = backtestProgress.value.orgStatuses.find((org) => org.oid === oid)
          if (errorOrgStatus) {
            errorOrgStatus.status = isCancelled ? 'cancelled' : isTimeout ? 'timeout' : 'error'
            errorOrgStatus.endTime = Date.now()
            if (errorOrgStatus.startTime) {
              errorOrgStatus.duration = errorOrgStatus.endTime - errorOrgStatus.startTime
            }
          }
        }
      }
    }

    // Calculate total stats from all successful results
    orgResults.forEach((result) => {
      if (result.status === 'success' && result.stats) {
        totalStats.n_proc += result.stats.n_proc || 0
        totalStats.n_eval += result.stats.n_eval || 0
        totalStats.totalMatches += result.results?.length || 0
        totalStats.wall_time += result.stats.wall_time || 0
      }
    })

    // Calculate execution timing
    const backtestEndTime = Date.now()
    const backtestCompletedTimestamp = new Date().toISOString()
    const totalExecutionTime = (backtestEndTime - backtestStartTime) / 1000 // Convert to seconds

    // Calculate additional metrics
    const successfulOrgs = orgResults.filter((r) => r.status === 'success')
    const orgsWithZeroHits = successfulOrgs.filter(
      (r) => !r.results || r.results.length === 0,
    ).length
    const totalMatchesAcrossOrgs = successfulOrgs.reduce(
      (sum, r) => sum + (r.results?.length || 0),
      0,
    )
    const avgMatchesPerOrg =
      successfulOrgs.length > 0 ? totalMatchesAcrossOrgs / successfulOrgs.length : 0

    // Calculate completion stats
    const completionStats = {
      totalOrgs: backtestSelectedOids.value.length,
      completedOrgs: orgResults.filter((r) => r.status === 'success').length,
      failedOrgs: orgResults.filter((r) => r.status === 'error').length,
      cancelledOrgs: orgResults.filter((r) => r.status === 'cancelled').length,
      timeoutOrgs: orgResults.filter((r) => r.status === 'timeout').length,
      wasCancelled: isCancellingBacktest.value,
      orgsWithZeroHits,
      avgMatchesPerOrg,
    }

    // Store results with completion timestamp
    backtestResults.value = {
      completedAt: backtestCompletedTimestamp,
      orgResults,
      totalStats,
      timeframe: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationDays: durationDays,
      },
      executionStats: {
        startedAt: backtestStartTimestamp,
        completedAt: backtestCompletedTimestamp,
        totalExecutionTime: totalExecutionTime,
      },
      completionStats,
    }

    // Reset display state
    expandedMatches.value.clear()
    activeMatchTab.value = {}
    displayedResults.value = 10

    const completedOrgs = orgResults.filter((r) => r.status === 'success')
    const errorOrgs = orgResults.filter((r) => r.status === 'error')
    const abortedOrgs = orgResults.filter((r) => r.status === 'cancelled')
    const timedOutOrgs = orgResults.filter((r) => r.status === 'timeout')

    let message = ''
    if (isCancellingBacktest.value) {
      message = `Backtest cancelled! Showing results from ${completedOrgs.length} completed organization(s).`
      const issues = []
      if (errorOrgs.length > 0) issues.push(`${errorOrgs.length} failed`)
      if (abortedOrgs.length > 0) issues.push(`${abortedOrgs.length} cancelled`)
      if (timedOutOrgs.length > 0) issues.push(`${timedOutOrgs.length} timed out`)
      if (issues.length > 0) {
        message += ` ${issues.join(', ')}.`
      }
      message += ` Found ${totalStats.totalMatches} total matches.`
      appStore.addNotification('warning', message)
    } else {
      message = `Backtest completed! Found ${totalStats.totalMatches} total matches out of ${totalStats.n_proc.toLocaleString()} events processed across ${completedOrgs.length} organization(s).`
      const issues = []
      if (errorOrgs.length > 0) issues.push(`${errorOrgs.length} failed`)
      if (timedOutOrgs.length > 0) issues.push(`${timedOutOrgs.length} timed out`)
      if (issues.length > 0) {
        message += ` ${issues.join(', ')}.`
      }
      const notificationType =
        timedOutOrgs.length > 0 || errorOrgs.length > 0 ? 'warning' : 'success'
      appStore.addNotification(notificationType, message)
    }
  } catch (error: unknown) {
    // Backtest execution failed - handle error
    void error // Suppress unused variable warning
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    appStore.addNotification('error', `Backtest failed: ${errorMessage}`)
  } finally {
    isRunningBacktest.value = false
    isCancellingBacktest.value = false
    backtestAbortController = null

    // Clear timing update interval
    if (timingUpdateInterval.value) {
      clearInterval(timingUpdateInterval.value)
      timingUpdateInterval.value = null
    }

    backtestProgress.value = {
      current: 0,
      total: 0,
      currentOrgName: '',
      currentOid: '',
      orgStatuses: [],
    }
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

async function loadMoreResultsForOrg(orgIndex: number) {
  // If not using chunked results, fall back to simple display increment
  if (!backtestConfig.useChunkedResults || !backtestResults.value) {
    orgDisplayedResults.value[orgIndex] = (orgDisplayedResults.value[orgIndex] || 10) + 10
    return
  }

  const orgResult = backtestResults.value.orgResults[orgIndex]
  if (!orgResult || orgResult.status !== 'success' || !orgCursors.value[orgIndex]) {
    return
  }

  // Set loading state
  orgLoadingMore.value[orgIndex] = true

  try {
    const storage = useStorage()
    const api = useApi()

    // Get organization details
    const oid = orgResult.oid
    const orgReplayUrl = storage.getOrganizationReplayUrl(oid)
    if (!orgReplayUrl) {
      throw new Error(`Replay URL not available for organization ${oid}`)
    }

    // Parse timeframe from backtest results
    const timeframe = backtestResults.value.timeframe
    const startTimestamp = new Date(timeframe.startTime).getTime()
    const endTimestamp = new Date(timeframe.endTime).getTime()

    // Fetch more results using the stored cursor
    const response = await api.backtestDetectionRule(
      orgReplayUrl,
      oid,
      currentRule.detectLogic,
      currentRule.respondLogic,
      startTimestamp,
      endTimestamp,
      0, // Use chunk size for limits
      0,
      undefined, // No abort controller for additional fetches
      10 * 60 * 1000, // 10 minute timeout
      undefined, // Let backend auto-detect stateful requirements
      false, // isDryRun
      orgCursors.value[orgIndex], // Use stored cursor
      backtestConfig.sid, // Optional sensor ID
      backtestConfig.validateRule, // Validation mode
      backtestConfig.stream, // Data stream
    )

    // Append new results to existing results
    if (response.results && Array.isArray(response.results)) {
      orgResult.results = [...(orgResult.results || []), ...response.results]
    }

    // Update cursor for next fetch
    if (response.cursor) {
      orgCursors.value[orgIndex] = response.cursor
      orgHasMore.value[orgIndex] = response.has_more || false
    } else {
      // No more results available
      orgHasMore.value[orgIndex] = false
    }

    // Update display count to show new results
    orgDisplayedResults.value[orgIndex] = orgResult.results?.length || 0
  } catch (error) {
    logger.error('Failed to fetch more results:', error)
    // Fall back to simple display increment on error
    orgDisplayedResults.value[orgIndex] = (orgDisplayedResults.value[orgIndex] || 10) + 10
  } finally {
    // Clear loading state
    orgLoadingMore.value[orgIndex] = false
  }
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
      timeframe: backtestResults.value?.timeframe,
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
      timeframe: backtestResults.value.timeframe,
      total_stats: backtestResults.value.totalStats,
      execution_stats: backtestResults.value.executionStats,
      completion_stats: backtestResults.value.completionStats,
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

function exportBacktestSummaryAsMarkdown() {
  if (!backtestResults.value) return

  const results = backtestResults.value

  // Format execution timeline (use UTC timestamps)
  const startedTime = new Date(results.executionStats.startedAt).toISOString()
  const completedTime = new Date(results.completedAt).toISOString()
  const duration = `${results.executionStats.totalExecutionTime.toFixed(2)}s`

  // Format telemetry timeframe (use UTC timestamps)
  const telemetryStart = new Date(results.timeframe.startTime).toISOString()
  const telemetryEnd = new Date(results.timeframe.endTime).toISOString()

  // Calculate additional metrics
  const failedTimeoutCount =
    results.completionStats.failedOrgs +
    results.completionStats.cancelledOrgs +
    results.completionStats.timeoutOrgs

  const markdown = `# Backtest Summary

**Rule:** ${currentRule.name}

## Execution Timeline
**Started:** ${startedTime} | **Completed:** ${completedTime} | **Duration:** ${duration}

## Telemetry Timeframe
**Start:** ${telemetryStart} | **End:** ${telemetryEnd} | **Days Covered:** ${results.timeframe.durationDays.toFixed(1)}

## Metrics Summary

| Metric | Value |
|--------|-------|
| Total Events Processed | ${results.totalStats.n_proc.toLocaleString()} |
| Total Rule Evaluations | ${results.totalStats.n_eval.toLocaleString()} |
| Total Matches Found | ${results.totalStats.totalMatches.toLocaleString()} |
| API Processing Time | ${results.totalStats.wall_time.toFixed(2)}s |
| Total Backtest Time | ${results.executionStats.totalExecutionTime.toFixed(2)}s |
| Organizations Completed | ${results.completionStats.completedOrgs} / ${results.completionStats.totalOrgs} |
| Failed / Cancelled / Timeout | ${failedTimeoutCount} |
| Organizations with 0 Hits | ${results.completionStats.orgsWithZeroHits} |
| Average Matches per Org | ${results.completionStats.avgMatchesPerOrg.toFixed(1)} |

## Organization Breakdown

| Organization | Status | Matches | Duration |
|-------------|--------|---------|----------|
${results.orgResults
  .map((org) => {
    const matchCount = org.results?.length || 0
    const duration = org.stats?.wall_time ? `${org.stats.wall_time.toFixed(2)}s` : 'N/A'
    const statusIcon =
      org.status === 'success'
        ? '✅'
        : org.status === 'timeout'
          ? '⏰'
          : org.status === 'cancelled'
            ? '⏹️'
            : '❌'
    return `| ${org.orgName} | ${statusIcon} ${org.status} | ${matchCount} | ${duration} |`
  })
  .join('\n')}

---
*Generated by DetectionForge on ${new Date().toISOString()}*`

  // Copy to clipboard
  navigator.clipboard
    .writeText(markdown)
    .then(() => {
      appStore.addNotification('success', 'Backtest summary copied to clipboard as Markdown')
    })
    .catch((err) => {
      logger.error('Failed to copy to clipboard:', err)
      appStore.addNotification('error', 'Failed to copy to clipboard')
    })
}

function exportUnitTestSummaryAsMarkdown() {
  if (!overallTestResults.value || unitTests.value.length === 0) return

  const results = overallTestResults.value

  // Format test results (use UTC timestamp)
  const completedTime = new Date().toISOString()

  const markdown = `# Unit Test Summary

**Rule:** ${currentRule.name}

## Test Results Overview

| Metric | Value |
|--------|-------|
| Total Tests | ${results.total} |
| Passed | ${results.passed} |
| Failed | ${results.failed} |
| Success Rate | ${results.successRate}% |
| Executed | ${completedTime} |

## Test Case Details

| Test Case | Status | Expected | Actual | Result |
|-----------|--------|----------|---------|---------|
${unitTests.value
  .map((test, index) => {
    const testName = test.name || `Test Case ${index + 1}`
    const expectedMatch = test.expectedMatch ? 'Match' : 'No Match'
    const actualMatch = test.result?.didMatch ? 'Match' : 'No Match'
    const statusIcon = test.result?.passed ? '✅' : test.result?.passed === false ? '❌' : '⚪'
    const status = test.result?.passed ? 'PASS' : test.result?.passed === false ? 'FAIL' : 'NOT RUN'
    return `| ${testName} | ${statusIcon} ${status} | ${expectedMatch} | ${actualMatch} | ${test.result?.passed ? 'Correct' : test.result?.passed === false ? 'Incorrect' : 'Pending'} |`
  })
  .join('\n')}

---
*Generated by DetectionForge on ${new Date().toISOString()}*`

  // Copy to clipboard
  navigator.clipboard
    .writeText(markdown)
    .then(() => {
      appStore.addNotification('success', 'Unit test summary copied to clipboard as Markdown')
    })
    .catch((err) => {
      logger.error('Failed to copy to clipboard:', err)
      appStore.addNotification('error', 'Failed to copy to clipboard')
    })
}

function clearBacktestResults() {
  backtestResults.value = null
  backtestLiveResults.value = []
  expandedMatches.value.clear()
  activeMatchTab.value = {}
  expandedOrgResults.value.clear()
  orgDisplayedResults.value = {}
  displayedResults.value = 10

  // Clear cursor-based pagination state
  orgCursors.value = {}
  orgHasMore.value = {}
  orgLoadingMore.value = {}

  backtestProgress.value = {
    current: 0,
    total: 0,
    currentOrgName: '',
    currentOid: '',
    orgStatuses: [],
  }
}

function cancelBacktest() {
  if (!isRunningBacktest.value) return

  isCancellingBacktest.value = true

  // Abort all in-flight requests
  if (backtestAbortController) {
    backtestAbortController.abort()
  }

  appStore.addNotification(
    'info',
    'Cancelling backtest... Will save results from completed organizations.',
  )
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
  // Return UTC timestamp with 'Z' suffix to clearly indicate UTC timezone
  return date.toISOString()
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  // Return UTC date in ISO format (YYYY-MM-DD)
  return date.toISOString().split('T')[0]
}

function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${remainingSeconds}s`
}

function formatSearchDuration(startTime: string | number, endTime: string | number): string {
  const start = typeof startTime === 'string' ? new Date(startTime) : new Date(startTime * 1000)
  const end = typeof endTime === 'string' ? new Date(endTime) : new Date(endTime * 1000)

  const durationMs = end.getTime() - start.getTime()
  const totalHours = durationMs / (1000 * 60 * 60)
  const totalDays = totalHours / 24

  // Less than 1 hour
  if (totalHours < 1) {
    const minutes = Math.round(durationMs / (1000 * 60))
    if (minutes === 1) {
      return '1 minute searched'
    } else if (minutes < 60) {
      return `${minutes} minutes searched`
    }
  }

  // Less than 1 day but >= 1 hour
  if (totalDays < 1) {
    const hours = Math.round(totalHours)
    return hours === 1 ? '1 hour searched' : `${hours} hours searched`
  }

  // 1 day or more
  const days = Math.floor(totalDays)
  const remainingHours = Math.round((totalDays - days) * 24)

  if (remainingHours === 0) {
    // Exactly whole days
    return days === 1 ? '1 day searched' : `${days} days searched`
  } else {
    // Days and hours
    let result = days === 1 ? '1 day' : `${days} days`
    if (remainingHours === 1) {
      result += ' 1 hour'
    } else {
      result += ` ${remainingHours} hours`
    }
    return `${result} searched`
  }
}

// Create a computed function for real-time updates
const getRunningTime = (startTime: number) => {
  // Force reactivity by reading currentTime
  const now = currentTime.value
  const durationMs = now - startTime
  return formatDuration(durationMs)
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

      // Auto-open the first successfully imported rule if checkbox is checked
      if (autoOpenTopRule.value) {
        const firstSuccessfulImport = importedRules.find((rule) => rule.success)
        if (firstSuccessfulImport) {
          // Find the rule ID by name from the saved rules
          const savedRulesList = JSON.parse(localStorage.getItem(DETECTION_RULES_KEY) || '[]')
          const ruleToOpen = savedRulesList.find(
            (r: DetectionRule) => r.name === firstSuccessfulImport.name,
          )
          if (ruleToOpen) {
            // Use nextTick to ensure the DOM is updated before loading the rule
            nextTick(() => {
              loadRule(ruleToOpen.id)
              // Add notification that rule was loaded to editor
              appStore.addNotification('info', `Loaded "${firstSuccessfulImport.name}" to editor`)
              // Close the import modal
              showImportIaCModal.value = false
            })
          }
        }
      }
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

// Watch for auto-open checkbox changes to persist state
watch(autoOpenTopRule, (newValue) => {
  localStorage.setItem('detectionforge_auto_open_top_rule', newValue.toString())
})
</script>
