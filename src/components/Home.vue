<template>
  <body class="home">
    <div class="container home">
      <div class="header home">
        <Logo variant="white" size="large" />
        <p>
          A specialized environment for crafting, validating, and testing LimaCharlie detection
          rules
        </p>
      </div>

      <div class="content">
        <div class="section">
          <h2>Welcome to DetectionForge</h2>
          <p>
            DetectionForge is a comprehensive detection engineering environment designed to
            streamline the development, testing, and deployment of
            <a href="https://limacharlie.io" target="_blank" rel="noopener noreferrer"
              >LimaCharlie</a
            >
            detection rules. Built for security engineers and analysts, it provides an intuitive
            interface for crafting effective detection logic and validating it against real-world
            data.
          </p>
          <p>
            This app is a 100% client-side Single-Page Application (SPA), ensuring that all data
            processing occurs within your browser. Your configuration data (organizations, rules,
            settings) is stored locally in your browser only, while sensitive credentials remain in
            memory and are never persisted. All API interactions communicate directly with
            LimaCharlie API without any intermediary servers. You could even build the app locally
            and host it on your own system.
          </p>
        </div>

        <div class="section">
          <h2>🚀 Current Features</h2>
          <div class="features">
            <div class="feature">
              <h3>✅ Advanced Rule Editor</h3>
              <p>
                CodeMirror-powered editor with YAML syntax highlighting, dark theme, enhanced
                autocompletion for LimaCharlie operators and fields, and smart editing features for
                writing detection and response (D&R) logic with enhanced readability.
              </p>
            </div>
            <div class="feature">
              <h3>✅ Multi-Organization Support</h3>
              <p>
                Seamlessly work across multiple LimaCharlie organizations with automatic credential
                management, bulk organization import via OID lists, and organization-specific
                testing capabilities.
              </p>
            </div>
            <div class="feature">
              <h3>✅ Unit Testing Framework</h3>
              <p>
                Built-in unit testing with preset event samples, custom test data support,
                persistent test case storage with rules, and detailed result analysis to validate
                detection logic before deployment.
              </p>
            </div>
            <div class="feature">
              <h3>✅ Historical Backtesting</h3>
              <p>
                Test detection rules against historical telemetry data with multi-organization
                support, progress tracking, comprehensive match analysis, and exportable results for
                further investigation.
              </p>
            </div>
            <div class="feature">
              <h3>✅ Rule Management</h3>
              <p>
                Save, load, duplicate, and manage detection rules with persistent storage,
                auto-draft functionality, seamless rule lifecycle management, and automatic backup
                of work-in-progress rules.
              </p>
            </div>
            <div class="feature">
              <h3>✅ Infrastructure as Code Integration</h3>
              <p>
                Export detection rules in LimaCharlie IaC format with embedded unit tests, and
                import existing rules from IaC YAML files for version control, automated deployment,
                and integration with CI/CD pipelines.
              </p>
            </div>
            <div class="feature">
              <h3>✅ Event Schema Explorer</h3>
              <p>
                Browse and explore LimaCharlie event schemas directly from your organizations, view
                field types and structures, copy schema elements to clipboard, and reference real
                telemetry structure while crafting detection rules.
              </p>
            </div>
            <div class="feature">
              <h3>✅ Configuration Backup & Restore</h3>
              <p>
                Comprehensive configuration export/import system for backing up and sharing your
                entire workbench setup including organizations, settings, detection rules, and
                drafts across different browsers or team members.
              </p>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>🛠️ Detection Engineering Workflow</h2>
          <div class="workflow-steps">
            <div class="workflow-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>Configure Credentials</h4>
                <p>
                  Set up your LimaCharlie API credentials and select target organizations for
                  testing and deployment.
                </p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>Craft Detection Logic</h4>
                <p>
                  Use the advanced editor to write detection and response logic with syntax
                  highlighting and validation.
                </p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>Unit Test Rules</h4>
                <p>
                  Validate detection logic using preset event samples or custom test data to ensure
                  proper matching.
                </p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h4>Historical Validation</h4>
                <p>
                  Run backtests against historical telemetry to assess rule effectiveness and
                  identify false positives.
                </p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-number">5</div>
              <div class="step-content">
                <h4>Deploy & Monitor</h4>
                <p>
                  Export rules in IaC format for deployment through version control and automated
                  pipelines.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>💡 Key Benefits</h2>
          <div class="benefits">
            <div class="benefit">
              <strong>🎯 Reduce False Positives:</strong> Test rules against historical data before
              deployment to minimize noise and alert fatigue.
            </div>
            <div class="benefit">
              <strong>⚡ Accelerate Development:</strong> Intuitive interface and built-in
              validation streamline the detection engineering process.
            </div>
            <div class="benefit">
              <strong>🔄 Enable Collaboration:</strong> Export rules in standardized formats for
              team collaboration and version control.
            </div>
            <div class="benefit">
              <strong>📊 Data-Driven Decisions:</strong> Historical backtesting provides concrete
              evidence of rule effectiveness.
            </div>
          </div>
        </div>

        <div class="section">
          <h2>🔧 Prerequisites & Setup</h2>
          <p>
            <strong>Requirements:</strong> Active LimaCharlie account with API access, at least one
            organization with detection rule permissions, and API credentials (OID, UID, API Key)
            with appropriate permissions.
          </p>
          <p>
            <strong>Security:</strong> Credentials are handled entirely in memory within this
            browser tab, so they are not stored persistently anywhere. This dynamic approach ensures
            that sensitive data remains ephemeral and is only available during an active session,
            greatly enhancing security for production environments. Always follow your
            organization's security policies.
          </p>
          <p>
            <strong>Open Source:</strong> DetectionForge is open source software available on
            <a href="https://github.com/Digital-Defense-Institute/lc-detectionforge" target="_blank"
              >GitHub</a
            >. You can review the code, contribute improvements, or host it yourself for additional
            security.
          </p>
        </div>
      </div>

      <div class="cta-section">
        <h2 style="margin-top: 0">Ready to Start Detection Engineering?</h2>
        <p>
          Configure your LimaCharlie credentials and begin crafting detection rules for your
          security operations.
        </p>
        <RouterLink to="/config" class="btn home">Start Configuration</RouterLink>
        <RouterLink to="/workbench" class="btn home">Detection Workbench</RouterLink>
        <a
          href="https://docs.limacharlie.io/docs/detection-and-response"
          target="_blank"
          class="btn btn-secondary home"
        >
          LC Detection & Response Docs
        </a>
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
        </p>
      </div>
    </div>
  </body>
</template>

<script setup lang="ts">
import Logo from './Logo.vue'
// Home page component
</script>
