import { createAnalytics } from '../utils/analytics'

export const analytics = createAnalytics(
  window,
  document,
  import.meta.env.PROD && import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
)
