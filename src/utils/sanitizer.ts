import DOMPurify from 'dompurify'
import type { Config } from 'dompurify'

/**
 * HTML Sanitization Utility
 *
 * This utility provides safe HTML sanitization using DOMPurify to prevent XSS attacks
 * while preserving safe HTML formatting.
 */

/**
 * Default safe HTML configuration for DOMPurify
 * Allows common formatting tags while blocking dangerous content
 */
const DEFAULT_CONFIG: Config = {
  ALLOWED_TAGS: [
    'b',
    'i',
    'em',
    'strong',
    'u',
    's',
    'del',
    'ins',
    'p',
    'br',
    'div',
    'span',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'a',
    'code',
    'pre',
    'blockquote',
    'hr',
    'table',
    'thead',
    'tbody',
    'tr',
    'td',
    'th',
  ],
  ALLOWED_ATTR: ['href', 'title', 'class', 'id', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
}

/**
 * Strict configuration for minimal HTML sanitization
 * Only allows basic text formatting
 */
const STRICT_CONFIG: Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
}

/**
 * Permissive configuration for rich content
 * Allows more HTML elements but still blocks dangerous content
 */
const PERMISSIVE_CONFIG: Config = {
  ...DEFAULT_CONFIG,
  ALLOWED_TAGS: [
    ...DEFAULT_CONFIG.ALLOWED_TAGS!,
    'img',
    'figure',
    'figcaption',
    'details',
    'summary',
    'mark',
    'small',
    'sub',
    'sup',
  ],
  ALLOWED_ATTR: [...DEFAULT_CONFIG.ALLOWED_ATTR!, 'src', 'alt', 'width', 'height'],
}

/**
 * Sanitizes HTML content using DOMPurify with default safe configuration
 *
 * @param html - The HTML string to sanitize
 * @param config - Optional DOMPurify configuration (uses DEFAULT_CONFIG if not provided)
 * @returns Sanitized HTML string safe for insertion into DOM
 */
export function sanitizeHtml(html: string, config?: Config): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  return DOMPurify.sanitize(html, config || DEFAULT_CONFIG) as string
}

/**
 * Sanitizes HTML with strict rules - only basic text formatting allowed
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string with minimal formatting
 */
export function sanitizeHtmlStrict(html: string): string {
  return sanitizeHtml(html, STRICT_CONFIG)
}

/**
 * Sanitizes HTML with permissive rules - allows rich content formatting
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string with rich formatting preserved
 */
export function sanitizeHtmlPermissive(html: string): string {
  return sanitizeHtml(html, PERMISSIVE_CONFIG)
}

/**
 * Strips all HTML tags and returns plain text
 *
 * @param html - The HTML string to strip
 * @returns Plain text with all HTML removed
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], KEEP_CONTENT: true })
}

/**
 * Vue.js directive helper for safe HTML rendering
 * Usage in template: v-html="sanitizeForVue(content)"
 *
 * @param html - The HTML string to sanitize for Vue
 * @param strict - Whether to use strict sanitization (default: false)
 * @returns Sanitized HTML string safe for v-html directive
 */
export function sanitizeForVue(html: string, strict: boolean = false): string {
  return strict ? sanitizeHtmlStrict(html) : sanitizeHtml(html)
}

/**
 * Validates if HTML content contains potentially dangerous elements
 *
 * @param html - The HTML string to validate
 * @returns True if content appears safe, false if dangerous content detected
 */
export function isHtmlSafe(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return true
  }

  const sanitized = sanitizeHtml(html)
  return sanitized === html
}

// Export configurations for advanced use cases
export const SANITIZER_CONFIGS = {
  DEFAULT: DEFAULT_CONFIG,
  STRICT: STRICT_CONFIG,
  PERMISSIVE: PERMISSIVE_CONFIG,
} as const

export default {
  sanitizeHtml,
  sanitizeHtmlStrict,
  sanitizeHtmlPermissive,
  stripHtml,
  sanitizeForVue,
  isHtmlSafe,
  CONFIGS: SANITIZER_CONFIGS,
}
