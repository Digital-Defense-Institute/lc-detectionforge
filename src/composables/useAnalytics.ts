import { createAnalytics } from '../utils/analytics'

export const analytics = createAnalytics(
  window,
  document,
  import.meta.env.PROD && window.location.hostname === 'detectionforge.ddi.sh',
)
