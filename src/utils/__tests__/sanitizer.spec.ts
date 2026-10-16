import { beforeEach, describe, expect, it, vi } from 'vitest'

// Test wrapper policy selection and delegation; DOMPurify's XSS protection is not exercised here.
const { sanitize } = vi.hoisted(() => ({
  sanitize: vi.fn((html: string) => html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')),
}))

vi.mock('dompurify', () => ({
  default: { sanitize },
}))

import {
  isHtmlSafe,
  SANITIZER_CONFIGS,
  sanitizeForVue,
  sanitizeHtml,
  sanitizeHtmlPermissive,
  sanitizeHtmlStrict,
  stripHtml,
} from '../sanitizer'

describe('sanitizer public API', () => {
  beforeEach(() => {
    sanitize.mockClear()
  })

  it('returns empty text without invoking DOMPurify for non-string or empty input', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null as unknown as string)).toBe('')
    expect(sanitize).not.toHaveBeenCalled()
  })

  it('uses the default policy unless a caller supplies an override', () => {
    const override = { ALLOWED_TAGS: ['mark'] }

    sanitizeHtml('<mark>safe</mark>')
    sanitizeHtml('<mark>safe</mark>', override)

    expect(sanitize).toHaveBeenNthCalledWith(1, '<mark>safe</mark>', SANITIZER_CONFIGS.DEFAULT)
    expect(sanitize).toHaveBeenNthCalledWith(2, '<mark>safe</mark>', override)
  })

  it('selects strict, permissive, and Vue policies consistently', () => {
    sanitizeHtmlStrict('<img src="x"><b>safe</b>')
    sanitizeHtmlPermissive('<img src="x"><b>safe</b>')
    sanitizeForVue('<b>safe</b>', true)
    sanitizeForVue('<b>safe</b>')

    expect(sanitize.mock.calls.map(([, config]) => config)).toEqual([
      SANITIZER_CONFIGS.STRICT,
      SANITIZER_CONFIGS.PERMISSIVE,
      SANITIZER_CONFIGS.STRICT,
      SANITIZER_CONFIGS.DEFAULT,
    ])
    expect(SANITIZER_CONFIGS.PERMISSIVE.ALLOWED_TAGS).toContain('img')
    expect(SANITIZER_CONFIGS.STRICT.ALLOWED_TAGS).not.toContain('img')
  })

  it('strips tags with a no-tags policy and identifies altered HTML as unsafe', () => {
    stripHtml('<p>plain <b>text</b></p>')
    expect(sanitize).toHaveBeenLastCalledWith('<p>plain <b>text</b></p>', {
      ALLOWED_TAGS: [],
      KEEP_CONTENT: true,
    })

    expect(isHtmlSafe('<b>safe</b>')).toBe(true)
    expect(isHtmlSafe('<script>alert(1)</script>safe')).toBe(false)
    expect(isHtmlSafe('')).toBe(true)
  })
})
