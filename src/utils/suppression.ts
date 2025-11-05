import { logger } from './logger'

interface TemplateContext {
  [key: string]: unknown
}

export type SuppressionStatus =
  | 'actual-alert'
  | 'suppressed-pre-threshold'
  | 'suppressed-post-threshold'
  | 'evaluation-error'

export interface MatchSuppressionMetadata {
  status: SuppressionStatus
  keySignature: string
  reasons?: string[]
}

export interface SuppressionSummaryPerKey {
  key: string
  actualAlerts: number
  suppressedPreThreshold: number
  suppressedPostThreshold: number
}

export interface SuppressionComputationSummary {
  actualAlerts: number
  suppressedPreThreshold: number
  suppressedPostThreshold: number
  suppressedTotal: number
  issues: string[]
  perKey: SuppressionSummaryPerKey[]
}

export interface SuppressionConfig {
  periodMs: number
  maxCount?: number
  minCount?: number
  isGlobal: boolean
  keys: string[]
  sourceActionName?: string
  sourceActionIndex?: number
}

export interface ParsedSuppressionConfig {
  config: SuppressionConfig
  issues: string[]
}

export interface SuppressionMatch {
  action: string
  data: {
    detect?: {
      event?: Record<string, unknown>
      routing?: Record<string, unknown>
      ts?: string
      [key: string]: unknown
    }
    routing?: Record<string, unknown>
    gen_time?: number
    [key: string]: unknown
  }
}

export interface ApplySuppressionResult<TMatch extends SuppressionMatch> {
  matches: Array<TMatch & { detectionforge_suppression?: MatchSuppressionMetadata }>
  summary: SuppressionComputationSummary
}

const PERIOD_MULTIPLIERS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
}

const isWhitespace = (character: string) =>
  character === ' ' || character === '\t' || character === '\n' || character === '\r'

const TEMPLATE_PATTERN = /{{\s*([^{}]+?)\s*}}/g

const isEmptyValue = (value: unknown) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0
  return false
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) return null
    const parsed = Number(trimmed)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const ensureString = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (error) {
      logger.warn('Failed to stringify object while rendering template', error)
      return String(value)
    }
  }
  return String(value)
}

const encodeWithBtoa = (value: string): string | null => {
  if (typeof globalThis.btoa !== 'function') return null

  try {
    const latin1 = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    return globalThis.btoa(latin1)
  } catch (error) {
    logger.warn('Failed to base64 encode via btoa', error)
    return null
  }
}

const decodeWithAtob = (value: string): string | null => {
  if (typeof globalThis.atob !== 'function') return null

  try {
    const binary = globalThis.atob(value)
    const percentEncoded = Array.from(binary)
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('')
    return decodeURIComponent(percentEncoded)
  } catch (error) {
    logger.warn('Failed to base64 decode via atob', error)
    return null
  }
}

const getNodeBuffer = () =>
  (
    globalThis as unknown as {
      Buffer?: {
        from: (input: string, encoding: string) => { toString: (encoding: string) => string }
      }
    }
  ).Buffer

const cloneMatchWithSuppression = <TMatch extends SuppressionMatch>(
  match: TMatch,
  suppression: MatchSuppressionMetadata,
): TMatch & { detectionforge_suppression?: MatchSuppressionMetadata } => {
  return {
    ...match,
    detectionforge_suppression: suppression,
  }
}

const parseTemplateTokens = (segment: string): string[] => {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  for (let i = 0; i < segment.length; i++) {
    const char = segment[i]
    if ((char === '"' || char === "'") && segment[i - 1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
        current += char
        continue
      }
      if (quoteChar === char) {
        inQuotes = false
        quoteChar = ''
        current += char
        continue
      }
    }

    if (!inQuotes && isWhitespace(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

const splitPipelineSegments = (expression: string): string[] => {
  const segments: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i]
    if ((char === '"' || char === "'") && expression[i - 1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
        current += char
        continue
      }
      if (quoteChar === char) {
        inQuotes = false
        quoteChar = ''
        current += char
        continue
      }
    }

    if (char === '|' && !inQuotes) {
      if (current.trim().length > 0) {
        segments.push(current.trim())
      }
      current = ''
      continue
    }

    current += char
  }

  if (current.trim().length > 0) {
    segments.push(current.trim())
  }

  return segments
}

const unquote = (value: string): string => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    try {
      return JSON.parse(value)
    } catch (error) {
      logger.warn('Failed to parse quoted string in template expression', {
        value,
        error,
      })
      return value.slice(1, -1)
    }
  }
  return value
}

const resolvePath = (identifier: string, context: TemplateContext): unknown => {
  const trimmed = identifier.trim()
  if (trimmed === '.' || trimmed === '') return context

  const parts = trimmed.replace(/^\./, '').split('.')
  let current: unknown = context

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (Array.isArray(current)) {
      const index = Number(part)
      if (Number.isNaN(index) || index < 0 || index >= current.length) {
        return undefined
      }
      current = current[index]
      continue
    }

    if (typeof current === 'object') {
      const record = current as Record<string, unknown>
      current = record[part]
      continue
    }

    return undefined
  }

  return current
}

const parseLiteral = (token: string): unknown => {
  if (token === 'true') return true
  if (token === 'false') return false
  if (token === 'nil' || token === 'null') return null
  if (token === 'undefined') return undefined

  const numeric = toNumber(token)
  if (numeric !== null) {
    return numeric
  }

  return unquote(token)
}

type TransformFunction = (input: unknown, ...args: unknown[]) => unknown

const transformLibrary: Record<string, TransformFunction> = {
  lower: (input: unknown) => ensureString(input).toLowerCase(),
  upper: (input: unknown) => ensureString(input).toUpperCase(),
  title: (input: unknown) =>
    ensureString(input).replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
    ),
  trim: (input: unknown, cutset?: unknown) => {
    const value = ensureString(input)
    if (cutset === undefined) return value.trim()
    const cutString = ensureString(cutset)
    const regex = new RegExp(`^[${cutString}]+|[${cutString}]+$`, 'g')
    return value.replace(regex, '')
  },
  trimPrefix: (input: unknown, prefix: unknown) => {
    const value = ensureString(input)
    const prefixStr = ensureString(prefix)
    return value.startsWith(prefixStr) ? value.slice(prefixStr.length) : value
  },
  trimSuffix: (input: unknown, suffix: unknown) => {
    const value = ensureString(input)
    const suffixStr = ensureString(suffix)
    return value.endsWith(suffixStr) ? value.slice(0, -suffixStr.length) : value
  },
  split: (input: unknown, separator?: unknown) => {
    const value = ensureString(input)
    const sep = separator === undefined ? '' : ensureString(separator)
    return value.split(sep)
  },
  join: (input: unknown, separator?: unknown) => {
    const array = Array.isArray(input) ? input : [input]
    const sep = separator === undefined ? '' : ensureString(separator)
    return array.map((item) => ensureString(item)).join(sep)
  },
  index: (input: unknown, ...args: unknown[]) => {
    if (args.length === 0) return undefined
    let current = input
    const indices = args
    for (const rawIndex of indices) {
      if (Array.isArray(current)) {
        const idx = toNumber(rawIndex)
        if (idx === null || idx < 0 || idx >= current.length) {
          return undefined
        }
        current = current[idx]
      } else if (typeof current === 'object' && current !== null) {
        const key = ensureString(rawIndex)
        current = (current as Record<string, unknown>)[key]
      } else {
        return undefined
      }
    }
    return current
  },
  replace: (input: unknown, oldValue: unknown, newValue: unknown, count?: unknown) => {
    const value = ensureString(input)
    const oldStr = ensureString(oldValue)
    const newStr = ensureString(newValue)
    if (count === undefined) {
      return value.split(oldStr).join(newStr)
    }
    const limit = toNumber(count) ?? -1
    if (limit < 0) {
      return value.split(oldStr).join(newStr)
    }
    let replaced = 0
    let result = value
    while (replaced < limit && result.includes(oldStr)) {
      result = result.replace(oldStr, newStr)
      replaced += 1
    }
    return result
  },
  substr: (input: unknown, start: unknown, length?: unknown) => {
    const value = ensureString(input)
    const startIndex = toNumber(start) ?? 0
    if (startIndex >= value.length) return ''
    if (length === undefined) {
      return value.slice(startIndex)
    }
    const lengthNumber = toNumber(length) ?? value.length
    return value.slice(startIndex, startIndex + lengthNumber)
  },
  atoi: (input: unknown) => {
    const value = ensureString(input)
    const parsed = parseInt(value, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  },
  default: (input: unknown, fallback?: unknown, candidateOverride?: unknown) => {
    const candidate = candidateOverride !== undefined ? candidateOverride : input
    if (isEmptyValue(candidate)) {
      return fallback
    }
    return candidate
  },
  json: (input: unknown) => {
    try {
      return JSON.stringify(input)
    } catch (error) {
      logger.warn('Failed to stringify value for json transform', error)
      return ''
    }
  },
  prettyjson: (input: unknown) => {
    try {
      return JSON.stringify(input, null, 2)
    } catch (error) {
      logger.warn('Failed to stringify value for prettyjson transform', error)
      return ''
    }
  },
  base64enc: (input: unknown) => {
    const value = ensureString(input)
    const encoded = encodeWithBtoa(value)
    if (encoded !== null) return encoded

    const buffer = getNodeBuffer()
    if (buffer) {
      try {
        return buffer.from(value, 'utf-8').toString('base64')
      } catch (error) {
        logger.warn('Failed to base64 encode value via Buffer', error)
      }
    }

    logger.warn('Base64 encoding not supported in this environment')
    return ''
  },
  base64dec: (input: unknown) => {
    const value = ensureString(input)
    const decoded = decodeWithAtob(value)
    if (decoded !== null) return decoded

    const buffer = getNodeBuffer()
    if (buffer) {
      try {
        return buffer.from(value, 'base64').toString('utf-8')
      } catch (error) {
        logger.warn('Failed to base64 decode value via Buffer', error)
      }
    }

    logger.warn('Base64 decoding not supported in this environment')
    return ''
  },
  urlenc: (input: unknown) => encodeURIComponent(ensureString(input)),
  urldec: (input: unknown) => {
    try {
      return decodeURIComponent(ensureString(input))
    } catch (error) {
      logger.warn('Failed to decode URI component', error)
      return ''
    }
  },
  escape: (input: unknown) => ensureString(input).replace(/(["'\\])/g, '\\$1'),
  unescape: (input: unknown) => ensureString(input).replace(/\\(["'\\])/g, '$1'),
  len: (input: unknown) => {
    if (typeof input === 'string' || Array.isArray(input)) return input.length
    if (input && typeof input === 'object')
      return Object.keys(input as Record<string, unknown>).length
    return 0
  },
  hasPrefix: (input: unknown, prefix: unknown) =>
    ensureString(input).startsWith(ensureString(prefix)),
  hasSuffix: (input: unknown, suffix: unknown) =>
    ensureString(input).endsWith(ensureString(suffix)),
  contains: (input: unknown, substr: unknown) => ensureString(input).includes(ensureString(substr)),
}

const applyTransform = (name: string, input: unknown, args: unknown[]): unknown => {
  const transform = transformLibrary[name]
  if (!transform) {
    throw new Error(`Unsupported template transform: ${name}`)
  }
  return transform(input, ...args)
}

const evaluateExpression = (expression: string, context: TemplateContext) => {
  const segments = splitPipelineSegments(expression)
  const errors: string[] = []
  if (segments.length === 0) {
    return { value: '', errors }
  }

  let currentValue: unknown

  segments.forEach((segment, index) => {
    if (errors.length > 0) {
      return
    }

    const tokens = parseTemplateTokens(segment)
    if (tokens.length === 0) {
      errors.push('Empty template segment encountered')
      return
    }

    if (index === 0) {
      // First segment can be literal, identifier, or function call
      if (tokens[0].startsWith('.') || tokens[0].includes('.')) {
        currentValue = resolvePath(tokens[0], context)
        if (tokens.length > 1) {
          // Remaining tokens treated as function invocation with resolved value as input
          const fnName = tokens[1]
          const args = tokens
            .slice(2)
            .map((token) =>
              token.startsWith('.') ? resolvePath(token, context) : parseLiteral(token),
            )
          try {
            currentValue = applyTransform(fnName, currentValue, args)
          } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error))
          }
        }
      } else {
        const fnName = tokens[0]
        const args = tokens
          .slice(1)
          .map((token) =>
            token.startsWith('.') ? resolvePath(token, context) : parseLiteral(token),
          )
        try {
          currentValue = applyTransform(fnName, undefined, args)
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error))
        }
      }
      return
    }

    const fnName = tokens[0]
    const args = tokens
      .slice(1)
      .map((token) => (token.startsWith('.') ? resolvePath(token, context) : parseLiteral(token)))

    try {
      currentValue = applyTransform(fnName, currentValue, args)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  })

  return {
    value: currentValue,
    errors,
  }
}

const renderTemplate = (template: string, context: TemplateContext) => {
  const errors: string[] = []
  let output = template

  output = output.replace(TEMPLATE_PATTERN, (_, expression) => {
    const evaluation = evaluateExpression(expression, context)
    if (evaluation.errors.length > 0) {
      errors.push(...evaluation.errors)
      return ''
    }
    return ensureString(evaluation.value)
  })

  return {
    value: output,
    errors,
  }
}

const parsePeriod = (rawPeriod: unknown): number | null => {
  if (typeof rawPeriod === 'number' && Number.isFinite(rawPeriod)) {
    return rawPeriod >= 0 ? rawPeriod * 1000 : null
  }

  if (typeof rawPeriod !== 'string') {
    return null
  }

  const trimmed = rawPeriod.trim().toLowerCase()
  if (trimmed.length === 0) return null

  const match = trimmed.match(/^(\d+)([a-z]+)$/)
  if (!match) {
    return null
  }

  const amount = Number(match[1])
  const unit = match[2]
  const multiplier = PERIOD_MULTIPLIERS[unit]
  if (!multiplier) return null

  return amount * multiplier
}

const findFirstReportAction = (respondLogic: unknown) => {
  if (!respondLogic) return null

  if (Array.isArray(respondLogic)) {
    for (let index = 0; index < respondLogic.length; index++) {
      const entry = respondLogic[index]
      if (
        entry &&
        typeof entry === 'object' &&
        (entry as Record<string, unknown>).action === 'report'
      ) {
        return { action: entry as Record<string, unknown>, index }
      }
    }
    return null
  }

  if (typeof respondLogic === 'object') {
    const record = respondLogic as Record<string, unknown>
    if (record.action === 'report') {
      return { action: record, index: 0 }
    }
    if (record.respond && Array.isArray(record.respond)) {
      return findFirstReportAction(record.respond)
    }
  }

  return null
}

export const parseSuppressionFromRespondLogic = (
  respondLogic: unknown,
): ParsedSuppressionConfig | null => {
  const reportActionEntry = findFirstReportAction(respondLogic)
  if (!reportActionEntry) {
    return null
  }

  const suppression = reportActionEntry.action.suppression as Record<string, unknown> | undefined
  if (!suppression) {
    return null
  }

  const issues: string[] = []

  const rawPeriod = suppression.period
  const periodMs = parsePeriod(rawPeriod)
  if (periodMs === null) {
    issues.push('Suppression period is missing or invalid; suppression metrics will be skipped.')
    return null
  }

  const rawMaxCount = suppression.max_count
  const rawMinCount = suppression.min_count

  const maxCount = rawMaxCount === undefined ? undefined : (toNumber(rawMaxCount) ?? undefined)
  const minCount = rawMinCount === undefined ? undefined : (toNumber(rawMinCount) ?? undefined)

  const isGlobal = Boolean(suppression.is_global)
  const rawKeys = Array.isArray(suppression.keys)
    ? (suppression.keys as unknown[]).map((key) => ensureString(key))
    : []

  if (maxCount !== undefined && maxCount <= 0) {
    issues.push('Suppression max_count must be greater than 0; ignoring max_count.')
  }

  if (minCount !== undefined && minCount <= 0) {
    issues.push('Suppression min_count must be greater than 0; ignoring min_count.')
  }

  const config: SuppressionConfig = {
    periodMs,
    maxCount: maxCount !== undefined && maxCount > 0 ? maxCount : undefined,
    minCount: minCount !== undefined && minCount > 0 ? minCount : undefined,
    isGlobal,
    keys: rawKeys,
    sourceActionName: ensureString(reportActionEntry.action.name ?? ''),
    sourceActionIndex: reportActionEntry.index,
  }

  if (config.minCount && config.maxCount && config.minCount > config.maxCount) {
    issues.push(
      'Suppression min_count is greater than max_count; min_count will be clamped to max_count.',
    )
    config.minCount = config.maxCount
  }

  return {
    config,
    issues,
  }
}

interface SuppressionWindowEntry {
  timestamp: number
  isAlert: boolean
}

interface SuppressionWindowState {
  entries: SuppressionWindowEntry[]
  alertCountInWindow: number
}

const getMatchTimestamp = (match: SuppressionMatch): number => {
  const routingEventTime = match.data?.detect?.routing?.event_time
  if (typeof routingEventTime === 'number') {
    return routingEventTime > 10 ** 12 ? routingEventTime : routingEventTime * 1000
  }

  const detectTs = match.data?.detect?.ts
  if (typeof detectTs === 'string' && detectTs.trim().length > 0) {
    const isoLike = detectTs.includes('T') ? detectTs : detectTs.replace(' ', 'T')
    const timestamp = Date.parse(isoLike.endsWith('Z') ? isoLike : `${isoLike}Z`)
    if (!Number.isNaN(timestamp)) {
      return timestamp
    }
  }

  const genTime = match.data?.gen_time
  if (typeof genTime === 'number') {
    return genTime > 10 ** 12 ? genTime : genTime * 1000
  }

  return Date.now()
}

const buildTemplateContext = (
  match: SuppressionMatch,
  organizationId: string,
  organizationName?: string,
): TemplateContext => {
  return {
    event: match.data?.detect?.event ?? {},
    routing: match.data?.detect?.routing ?? {},
    detect: match.data?.detect ?? {},
    report: match.data ?? {},
    org: {
      oid: organizationId,
      name: organizationName,
    },
    match,
  }
}

const buildKeySignature = (
  keys: string[],
  match: SuppressionMatch,
  organizationId: string,
  issues: string[],
  organizationName?: string,
): { keySignature: string; evaluationIssues: string[] } => {
  if (!keys || keys.length === 0) {
    return { keySignature: '__suppression::default__', evaluationIssues: [] }
  }

  const context = buildTemplateContext(match, organizationId, organizationName)
  const values: string[] = []
  const evaluationIssues: string[] = []

  keys.forEach((keyTemplate) => {
    const result = renderTemplate(keyTemplate, context)
    if (result.errors.length > 0) {
      evaluationIssues.push(
        `Failed to evaluate suppression key template "${keyTemplate}": ${result.errors.join('; ')}`,
      )
      values.push('__suppression::error__')
    } else {
      values.push(result.value)
    }
  })

  if (evaluationIssues.length > 0) {
    issues.push(...evaluationIssues)
  }

  return {
    keySignature: values.join('::'),
    evaluationIssues,
  }
}

export const applySuppressionToMatches = <TMatch extends SuppressionMatch>(
  config: SuppressionConfig,
  matches: readonly TMatch[],
  options: { organizationId: string; organizationName?: string },
): ApplySuppressionResult<TMatch> => {
  const issues: string[] = []
  const windowStates = new Map<string, SuppressionWindowState>()
  const annotatedMatches: Array<
    TMatch & { detectionforge_suppression?: MatchSuppressionMetadata }
  > = new Array(matches.length)
  const perKeySummary = new Map<string, SuppressionSummaryPerKey>()

  const indexedMatches = matches.map((match, index) => ({ match, index }))
  const sortedMatches = [...indexedMatches].sort(
    (a, b) => getMatchTimestamp(a.match) - getMatchTimestamp(b.match),
  )

  const minCount = config.minCount ?? 1
  const maxCount = config.maxCount ?? Number.POSITIVE_INFINITY

  sortedMatches.forEach(({ match, index }) => {
    const timestamp = getMatchTimestamp(match)
    const { keySignature, evaluationIssues } = buildKeySignature(
      config.keys,
      match,
      options.organizationId,
      issues,
      options.organizationName,
    )

    const state = windowStates.get(keySignature) ?? { entries: [], alertCountInWindow: 0 }

    // Remove expired entries
    while (state.entries.length > 0) {
      const entry = state.entries[0]
      if (timestamp - entry.timestamp > config.periodMs) {
        state.entries.shift()
        if (entry.isAlert) {
          state.alertCountInWindow = Math.max(0, state.alertCountInWindow - 1)
        }
      } else {
        break
      }
    }

    let status: SuppressionStatus = 'actual-alert'
    let reasons: string[] | undefined
    let isAlert = true

    if (evaluationIssues.length > 0) {
      status = 'evaluation-error'
      reasons = evaluationIssues
    } else {
      const windowCount = state.entries.length + 1
      if (windowCount < minCount) {
        status = 'suppressed-pre-threshold'
        isAlert = false
        reasons = [
          `Threshold requires at least ${minCount} matches within ${config.periodMs / 1000}s`,
        ]
      } else if (state.alertCountInWindow >= maxCount) {
        status = 'suppressed-post-threshold'
        isAlert = false
        reasons = [`Maximum of ${maxCount} alerts reached within suppression period`]
      }
    }

    state.entries.push({
      timestamp,
      isAlert,
    })

    if (isAlert) {
      state.alertCountInWindow += 1
    }

    windowStates.set(keySignature, state)

    const summary =
      perKeySummary.get(keySignature) ??
      ({
        key: keySignature,
        actualAlerts: 0,
        suppressedPreThreshold: 0,
        suppressedPostThreshold: 0,
      } as SuppressionSummaryPerKey)

    if (status === 'actual-alert' || status === 'evaluation-error') {
      summary.actualAlerts += 1
    } else if (status === 'suppressed-pre-threshold') {
      summary.suppressedPreThreshold += 1
    } else if (status === 'suppressed-post-threshold') {
      summary.suppressedPostThreshold += 1
    }

    perKeySummary.set(keySignature, summary)

    const annotated = cloneMatchWithSuppression(match, {
      status,
      keySignature,
      reasons,
    })
    annotatedMatches[index] = annotated
  })

  const summary: SuppressionComputationSummary = {
    actualAlerts: 0,
    suppressedPreThreshold: 0,
    suppressedPostThreshold: 0,
    suppressedTotal: 0,
    issues,
    perKey: Array.from(perKeySummary.values()),
  }

  summary.perKey.forEach((perKey) => {
    summary.actualAlerts += perKey.actualAlerts
    summary.suppressedPreThreshold += perKey.suppressedPreThreshold
    summary.suppressedPostThreshold += perKey.suppressedPostThreshold
  })

  summary.suppressedTotal = summary.suppressedPreThreshold + summary.suppressedPostThreshold

  const normalizedMatches = annotatedMatches.filter(Boolean) as Array<
    TMatch & { detectionforge_suppression?: MatchSuppressionMetadata }
  >

  return {
    matches: normalizedMatches,
    summary,
  }
}
