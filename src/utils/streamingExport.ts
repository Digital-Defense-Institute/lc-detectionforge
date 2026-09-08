import { logger } from './logger'

/**
 * Streaming JSON export.
 *
 * Naive exports (`new Blob([JSON.stringify(data, null, 2)])`) have a hard
 * ceiling: the whole document must exist as a single JavaScript string, and V8
 * caps strings at 2^29 - 24 characters (~512 MB) on 64-bit builds. Past that
 * `JSON.stringify` throws `RangeError: Invalid string length`, which - inside a
 * click handler with no try/catch - looks to the user like the button did
 * nothing at all.
 *
 * This module never materializes the document. Records are serialized one at a
 * time and pushed to a sink:
 *
 *  - `file-system-access`: writes straight to the file the user picked, so peak
 *    memory is a single record regardless of export size.
 *  - `blob`: buffers a bounded window of chunks, converts each window to a
 *    `Blob` and releases the strings. Blob payloads live in the browser's blob
 *    store (disk-backed once large), so the JS heap stays bounded while the
 *    file itself can far exceed any string length limit.
 *
 * Both paths are effectively unbounded, so callers do not need to cap, chunk,
 * or sample their result sets before exporting.
 */

/** Chunk characters buffered before being folded into a Blob part. */
const BLOB_FLUSH_THRESHOLD_CHARS = 16 * 1024 * 1024

/**
 * Chunk characters buffered before a write to the file stream. Batching keeps
 * the number of awaited writes proportional to file size rather than to record
 * count, which matters at tens of thousands of records.
 */
const FILE_WRITE_THRESHOLD_CHARS = 4 * 1024 * 1024

/** Records serialized between progress reports / yield checks. */
const DEFAULT_BATCH_SIZE = 500

/**
 * Minimum time between yields back to the event loop. Yielding on a timer
 * rather than on every batch keeps large exports responsive without paying the
 * clamped-`setTimeout` penalty tens of thousands of times.
 */
const YIELD_INTERVAL_MS = 30

const JSON_MIME_TYPE = 'application/json'

/** Which sink actually produced the file. */
export type ExportTransport = 'file-system-access' | 'blob'

export interface StreamingExportResult {
  /** False when the user dismissed the save dialog. */
  completed: boolean
  transport: ExportTransport
  /** Records written. */
  records: number
  /** Bytes written (UTF-8). */
  bytes: number
}

/** Progress snapshot reported while an export runs. */
export interface ExportProgress {
  /** Records serialized so far. */
  records: number
  /** Total records, when the caller knew it up front. */
  recordCount?: number
  /** Bytes handed to the sink so far (UTF-8). */
  bytes: number
  /** 0-100, or undefined when the total is unknown. */
  percent?: number
}

export interface SerializeJsonObjectOptions<T> {
  /**
   * Properties written before the streamed array, in insertion order.
   * Serialized eagerly, so keep this to summary/metadata sized data.
   */
  properties?: Record<string, unknown>
  /** Key holding the streamed array. */
  arrayKey: string
  /**
   * The records to stream. Generators are preferred: they avoid materializing
   * the full array, keeping peak memory at one record.
   */
  records: Iterable<T> | AsyncIterable<T>
  /** Total record count, when known, for progress reporting. */
  recordCount?: number
  /** Indent output with 2 spaces (default true, matching prior exports). */
  pretty?: boolean
  /** Records serialized between progress reports. */
  batchSize?: number
  /** Called after each batch, and once when serialization finishes. */
  onRecords?: (recordsWritten: number, recordCount?: number) => void
}

export interface StreamingJsonExportOptions<T> extends SerializeJsonObjectOptions<T> {
  /** Suggested file name, including the `.json` extension. */
  fileName: string
  /** Called after each batch so callers can surface progress. */
  onProgress?: (progress: ExportProgress) => void
}

/** Minimal shape of the File System Access API bits used here. */
interface FileSystemWritableStream {
  write(data: BufferSource | Blob | string): Promise<void>
  close(): Promise<void>
  abort?(reason?: unknown): Promise<void>
}

interface SaveFileHandle {
  createWritable(): Promise<FileSystemWritableStream>
}

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}

type SaveFilePicker = (options?: SaveFilePickerOptions) => Promise<SaveFileHandle>

const getSaveFilePicker = (): SaveFilePicker | null => {
  if (typeof window === 'undefined') return null
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  if (typeof picker !== 'function') return null

  // The picker is unavailable in cross-origin frames; a same-origin check on
  // window.top throws there, which is itself the signal to fall back.
  try {
    if (window.self !== window.top) return null
  } catch {
    return null
  }

  return picker
}

/** True when the browser can stream directly to a user-chosen file. */
export const supportsFileSystemAccess = (): boolean => getSaveFilePicker() !== null

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException ? error.name === 'AbortError' : false

interface SchedulerWithYield {
  yield(): Promise<void>
}

/**
 * Hands control back to the browser so it can paint and process input.
 *
 * Prefers `scheduler.yield()`, which resumes with priority and avoids the ~4ms
 * clamp browsers apply to nested `setTimeout(0)` calls.
 */
const yieldToEventLoop = (): Promise<void> => {
  const scheduler = (globalThis as { scheduler?: SchedulerWithYield }).scheduler
  if (scheduler && typeof scheduler.yield === 'function') {
    return scheduler.yield()
  }
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/** Indent every line after the first by `spaces`, matching JSON.stringify nesting. */
const indentNested = (serialized: string, spaces: number): string =>
  spaces > 0 ? serialized.replace(/\n/g, '\n' + ' '.repeat(spaces)) : serialized

/**
 * Emits the export document as a sequence of small strings. Output matches
 * `JSON.stringify({ ...properties, [arrayKey]: records }, null, pretty ? 2 : undefined)`
 * exactly, but no single string ever holds more than one record.
 */
export async function* serializeJsonObject<T>(
  options: SerializeJsonObjectOptions<T>,
): AsyncGenerator<string, void, void> {
  const pretty = options.pretty !== false
  const indent = pretty ? 2 : 0
  const newline = pretty ? '\n' : ''
  const keySeparator = pretty ? ': ' : ':'
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE

  // JSON.stringify drops properties whose values serialize to undefined
  // (undefined itself, functions, symbols); mirror that here.
  const properties = Object.entries(options.properties ?? {}).flatMap(([key, value]) => {
    const serialized = JSON.stringify(value, null, indent || undefined)
    return serialized === undefined ? [] : [[key, serialized] as const]
  })

  const propertyIndent = ' '.repeat(indent)
  const recordIndent = ' '.repeat(indent * 2)

  let prefix = '{' + newline
  for (const [key, serialized] of properties) {
    prefix +=
      propertyIndent +
      JSON.stringify(key) +
      keySeparator +
      indentNested(serialized, indent) +
      ',' +
      newline
  }
  prefix += propertyIndent + JSON.stringify(options.arrayKey) + keySeparator + '['
  yield prefix

  let written = 0
  let lastYieldAt = Date.now()

  for await (const record of options.records) {
    const serialized = JSON.stringify(record, null, indent || undefined)

    // A record that serializes to undefined becomes null inside an array.
    const body = serialized === undefined ? 'null' : indentNested(serialized, indent * 2)
    yield (written === 0 ? '' : ',') + newline + recordIndent + body

    written += 1
    if (written % batchSize === 0) {
      options.onRecords?.(written, options.recordCount)

      // Keep the UI responsive on large exports, but only as often as needed:
      // small exports finish without ever yielding.
      const now = Date.now()
      if (now - lastYieldAt >= YIELD_INTERVAL_MS) {
        await yieldToEventLoop()
        lastYieldAt = Date.now()
      }
    }
  }

  // An empty array renders as `[]`, the same as JSON.stringify would.
  yield (written === 0 ? '' : newline + propertyIndent) + ']' + newline + '}'

  options.onRecords?.(written, options.recordCount)
}

/**
 * Bridges the serializer's record callback to the caller's richer progress
 * callback, folding in the byte count the sink is tracking.
 */
const makeRecordReporter = <T>(
  options: StreamingJsonExportOptions<T>,
  getBytes: () => number,
  setRecords: (records: number) => void,
): SerializeJsonObjectOptions<T>['onRecords'] => {
  return (records, recordCount) => {
    setRecords(records)
    options.onProgress?.({
      records,
      recordCount,
      bytes: getBytes(),
      percent:
        recordCount && recordCount > 0 ? Math.min(100, (records / recordCount) * 100) : undefined,
    })
  }
}

/**
 * Streams straight to the file the user picks. Peak memory is one record.
 *
 * The picker must be invoked while the page still holds transient user
 * activation, so it runs before any other awaiting work.
 *
 * Returns null when the picker itself is unusable, signalling the caller to
 * fall back to the Blob sink.
 */
const writeViaFileSystemAccess = async <T>(
  picker: SaveFilePicker,
  options: StreamingJsonExportOptions<T>,
): Promise<StreamingExportResult | null> => {
  let handle: SaveFileHandle
  try {
    handle = await picker({
      suggestedName: options.fileName,
      types: [{ description: 'JSON', accept: { [JSON_MIME_TYPE]: ['.json'] } }],
    })
  } catch (error) {
    if (isAbortError(error)) {
      return { completed: false, transport: 'file-system-access', records: 0, bytes: 0 }
    }
    // Permission or environment problem rather than a user decision.
    logger.warn('File System Access picker unavailable, falling back to Blob download:', error)
    return null
  }

  const writable = await handle.createWritable()
  const encoder = new TextEncoder()
  let bytes = 0
  let records = 0

  // Buffered so the awaited write count tracks file size, not record count.
  let pending: string[] = []
  let pendingChars = 0

  const flush = async () => {
    if (pendingChars === 0) return
    const encoded = encoder.encode(pending.join(''))
    pending = []
    pendingChars = 0
    await writable.write(encoded)
    bytes += encoded.byteLength
  }

  try {
    for await (const chunk of serializeJsonObject({
      ...options,
      onRecords: makeRecordReporter(
        options,
        () => bytes,
        (n) => {
          records = n
        },
      ),
    })) {
      pending.push(chunk)
      pendingChars += chunk.length
      if (pendingChars >= FILE_WRITE_THRESHOLD_CHARS) await flush()
    }
    await flush()
    await writable.close()
  } catch (error) {
    try {
      await writable.abort?.(error)
    } catch {
      // Aborting is best-effort; surface the original failure instead.
    }
    throw error
  }

  return { completed: true, transport: 'file-system-access', records, bytes }
}

const triggerBlobDownload = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  // The browser reads from this URL for as long as the download takes, and
  // there is no completion event for an anchor download. Revoking on a timer
  // would impose an implicit size ceiling - a download slower than the timer
  // gets cut off - so the URL is instead released when the page goes away.
  // Blob payloads are disk-backed, so holding the reference costs no heap.
  const release = () => {
    URL.revokeObjectURL(url)
    window.removeEventListener('pagehide', release)
  }
  window.addEventListener('pagehide', release)
}

/**
 * Buffers a bounded window of chunks, folding each window into a Blob part and
 * releasing the strings. The JS heap stays bounded by the flush threshold while
 * the assembled Blob can far exceed the string length limit.
 */
const writeViaBlob = async <T>(
  options: StreamingJsonExportOptions<T>,
): Promise<StreamingExportResult> => {
  const parts: Blob[] = []
  let buffer: string[] = []
  let bufferedChars = 0
  let records = 0
  // Character count, used only to drive the progress readout. The exact UTF-8
  // size comes from `blob.size` once the parts are assembled.
  let bytes = 0

  const flush = () => {
    if (bufferedChars === 0) return
    parts.push(new Blob(buffer, { type: JSON_MIME_TYPE }))
    // Drop the references so the strings become collectable immediately.
    buffer = []
    bufferedChars = 0
  }

  for await (const chunk of serializeJsonObject({
    ...options,
    onRecords: makeRecordReporter(
      options,
      () => bytes,
      (n) => {
        records = n
      },
    ),
  })) {
    buffer.push(chunk)
    bytes += chunk.length
    bufferedChars += chunk.length
    if (bufferedChars >= BLOB_FLUSH_THRESHOLD_CHARS) flush()
  }
  flush()

  const blob = new Blob(parts, { type: JSON_MIME_TYPE })
  triggerBlobDownload(blob, options.fileName)

  return { completed: true, transport: 'blob', records, bytes: blob.size }
}

/**
 * Exports a JSON object whose bulk lives in one array, without ever holding the
 * document in memory. Works for arbitrarily large record sets.
 *
 * Must be called from a user gesture (e.g. a click handler) so the save dialog
 * is permitted; pass a generator for `records` to keep peak memory flat.
 */
export const exportJsonStream = async <T>(
  options: StreamingJsonExportOptions<T>,
): Promise<StreamingExportResult> => {
  const picker = getSaveFilePicker()

  if (picker) {
    const result = await writeViaFileSystemAccess(picker, options)
    if (result) return result
  }

  return writeViaBlob(options)
}

/** Human-readable byte count for progress and completion messages. */
export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${exponent === 0 ? value : value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`
}
