# DetectionForge

Vue 3 + TypeScript + Vite single-page application for designing, validating, and
backtesting LimaCharlie Detection & Response rules. Production code is in `src/`.

## Development

- Install locked dependencies with `npm ci`.
- Run the unit suite with `npm test`.
- Run TypeScript validation with `npm run type-check`.
- Run a production build with `npm run build` when a change affects bundling or
  runtime integration.

## Test conventions

- Use Vitest for unit tests. Place utility tests in `src/utils/__tests__/` and
  cross-cutting tests in `src/__tests__/`.
- Favor observable public behavior, deterministic fixtures, and mocked browser
  or network boundaries. Never require live LimaCharlie credentials or services
  for unit tests.
- Add an error or boundary case alongside each new core behavior. Keep tests
  independent: do not rely on suite order or mutable module state from another
  test.
- Core high-risk logic includes D&R validation, suppression computation,
  streaming exports, autocomplete, and sanitization. Preserve or extend their
  coverage when modifying them.

## Guardrails

- Do not expose, commit, or test with user API credentials, exported configs,
  or live organization data.
- `npm run lint` includes `--fix`; do not run it for read-only validation unless
  formatting changes are intended.
- Keep generated output (`dist/`, `coverage/`, `node_modules/`) untracked.
