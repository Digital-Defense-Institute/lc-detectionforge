/* eslint-disable no-console */
// Simple logger utility to avoid ESLint no-console warnings
export const logger = {
  log: (...args: unknown[]) => {
    console.log(...args)
  },
  warn: (...args: unknown[]) => {
    console.warn(...args)
  },
  error: (...args: unknown[]) => {
    console.error(...args)
  },
  debug: (...args: unknown[]) => {
    // Only log in development
    if (import.meta.env.DEV) {
      console.log('[DEBUG]', ...args)
    }
  },
}
