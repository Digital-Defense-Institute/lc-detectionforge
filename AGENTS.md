# DetectionForge

Vue 3, TypeScript, Vite, Pinia, and CodeMirror browser application, deployed to GitHub Pages.
Read `CONTRIBUTING.md` before making changes. Maintainers handle version bumps and release changelogs.

## Checks

- `npm test`
- `npm run type-check`
- `npx eslint . --max-warnings 0` (read-only; `npm run lint` fixes files)
- `npm run build`

## Credentials and optional analytics

Credentials and JWTs are memory-only. Preserve direct browser-to-LimaCharlie API flows.
Read `docs/analytics.md` before changing instrumentation or consent. Google Analytics must not load
before explicit opt-in. Analytics code must not access app credentials, organizations, rule content,
samples, API responses, URLs containing user data, or errors. Keep the event allowlist and privacy
page aligned. Do not add a generic event parameter bag or automatic form/click tracking.

Production analytics requires the explicit `ANALYTICS_ENABLED=true` Actions variable and a verified
GA property checklist. Development and ordinary self-hosted builds stay off. Do not enable the
deployment switch without completing and recording that checklist. Dashboard configuration and
live receipt verification are separate from code checks. Third-party Google code runs in the app's
page after opt-in; memory-only credentials do not provide script isolation.

Consent withdrawal reloads to unload third-party code. Keep the warning about saving work and
re-entering credentials, cross-tab withdrawal, and fail-closed behavior when storage is unavailable.
