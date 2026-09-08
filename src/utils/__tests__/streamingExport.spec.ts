import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  exportJsonStream,
  formatBytes,
  serializeJsonObject,
  type ExportProgress,
} from '../streamingExport'

/** Drains the chunk generator into a single string for comparison. */
const collect = async (
  generator: AsyncGenerator<string, void, void>,
  onChunk?: (chunk: string) => void,
): Promise<string> => {
  let out = ''
  for await (const chunk of generator) {
    onChunk?.(chunk)
    out += chunk
  }
  return out
}

/**
 * The whole point of the streaming exporter is that it replaces
 * `JSON.stringify(data, null, 2)` without changing a single byte of output, so
 * downstream consumers of existing export files see no difference.
 */
const expectMatchesJsonStringify = async (
  properties: Record<string, unknown>,
  arrayKey: string,
  records: unknown[],
  pretty: boolean,
) => {
  const streamed = await collect(
    serializeJsonObject({
      properties,
      arrayKey,
      records,
      pretty,
      batchSize: 2,
    }),
  )

  const expected = JSON.stringify(
    { ...properties, [arrayKey]: records },
    null,
    pretty ? 2 : undefined,
  )

  expect(streamed).toBe(expected)
  // Guard against two identical-but-malformed strings: both must parse, and to
  // the same value. Compared post-parse because JSON.stringify is lossy for
  // undefined (dropped in objects, null in arrays).
  expect(JSON.parse(streamed)).toEqual(JSON.parse(expected))
}

const sampleMatch = (index: number) => ({
  action: 'report',
  data: {
    cat: 'Chromium Browser Spawning Unexpected Child From User-Writable Path',
    detect: {
      event: {
        COMMAND_LINE: `"C:\\Users\\svc\\AppData\\Local\\app-${index}.exe" --flag`,
        FILE_PATH: `C:\\Users\\svc\\AppData\\Local\\app-${index}.exe`,
        HASH: 'a'.repeat(64),
        PARENT: { FILE_PATH: 'C:\\Program Files\\Google\\Chrome\\chrome.exe' },
      },
      routing: { event_time: 1757332600000 + index, hostname: `WKS-${index}`, tags: ['windows'] },
      ts: '2026-09-08T11:56:40Z',
    },
    detect_id: `detect-${index}`,
    detect_mtd: { level: 'medium' },
    gen_time: 1757332600000 + index,
    mtd: {},
    routing: {},
    source: 'sensor',
    source_rule: 'chromium-unexpected-child',
  },
})

describe('serializeJsonObject', () => {
  it('matches JSON.stringify with 2-space indent for a metadata + array document', async () => {
    await expectMatchesJsonStringify(
      {
        backtest_metadata: {
          rule_name: 'Chromium Browser Spawning Unexpected Child',
          total_matches: 3,
          nested: { deep: { deeper: [1, 2, { three: true }] } },
        },
      },
      'matches',
      [sampleMatch(0), sampleMatch(1), sampleMatch(2)],
      true,
    )
  })

  it('matches JSON.stringify in compact mode', async () => {
    await expectMatchesJsonStringify(
      { backtest_metadata: { rule_name: 'r', total_matches: 2 } },
      'matches',
      [sampleMatch(0), sampleMatch(1)],
      false,
    )
  })

  it('renders an empty array the same as JSON.stringify', async () => {
    await expectMatchesJsonStringify({ backtest_metadata: { total: 0 } }, 'matches', [], true)
    await expectMatchesJsonStringify({ backtest_metadata: { total: 0 } }, 'matches', [], false)
  })

  it('handles a document with no leading properties', async () => {
    await expectMatchesJsonStringify({}, 'matches', [sampleMatch(0)], true)
  })

  it('drops properties that serialize to undefined, as JSON.stringify does', async () => {
    // `detectionforge_suppression` is genuinely undefined for orgs without a
    // suppression summary, so this path is exercised by real exports.
    await expectMatchesJsonStringify(
      { kept: 1, dropped: undefined, also_kept: 'yes' },
      'matches',
      [sampleMatch(0)],
      true,
    )
  })

  it('emits null for records that serialize to undefined, as JSON.stringify does', async () => {
    await expectMatchesJsonStringify({ a: 1 }, 'matches', [undefined, sampleMatch(0)], true)
  })

  it('preserves unicode and escaping identically', async () => {
    await expectMatchesJsonStringify(
      { note: 'quote " backslash \\ newline \n tab \t emoji 📥 cyrillic Ж' },
      'matches',
      [{ path: 'C:\\Users\\Ünïcødé\\app.exe', label: '日本語' }],
      true,
    )
  })

  it('never emits a chunk larger than a single record', async () => {
    // The string-length ceiling only bites when one string holds the whole
    // document; this asserts chunks stay record-sized.
    const records = Array.from({ length: 50 }, (_, i) => sampleMatch(i))
    const oneRecord = JSON.stringify(sampleMatch(0), null, 2).length

    let largest = 0
    await collect(
      serializeJsonObject({
        properties: { backtest_metadata: { total: records.length } },
        arrayKey: 'matches',
        records,
        batchSize: 10,
      }),
      (chunk) => {
        largest = Math.max(largest, chunk.length)
      },
    )

    // Allow headroom for the prefix chunk (metadata) and per-record punctuation.
    expect(largest).toBeLessThan(oneRecord * 2)
  })

  it('consumes a generator lazily, holding one record at a time', async () => {
    // Proves peak memory does not scale with record count: the source is only
    // advanced as chunks are pulled.
    let produced = 0
    let maxOutstanding = 0
    let consumed = 0

    function* lazyRecords() {
      for (let i = 0; i < 20; i += 1) {
        produced += 1
        maxOutstanding = Math.max(maxOutstanding, produced - consumed)
        yield sampleMatch(i)
      }
    }

    for await (const chunk of serializeJsonObject({
      properties: {},
      arrayKey: 'matches',
      records: lazyRecords(),
      batchSize: 5,
    })) {
      if (chunk.includes('detect_id')) consumed += 1
    }

    expect(produced).toBe(20)
    expect(maxOutstanding).toBeLessThanOrEqual(1)
  })

  it('reports progress and a final total', async () => {
    const records = Array.from({ length: 25 }, (_, i) => sampleMatch(i))
    const progress: Array<[number, number | undefined]> = []

    await collect(
      serializeJsonObject({
        properties: {},
        arrayKey: 'matches',
        records,
        recordCount: records.length,
        batchSize: 10,
        onRecords: (written, total) => progress.push([written, total]),
      }),
    )

    expect(progress).toEqual([
      [10, 25],
      [20, 25],
      [25, 25],
    ])
  })

  it('streams a large record set without a string-length failure', async () => {
    // 20k records at ~500 chars each is ~10 MB: far below the ceiling, but it
    // exercises the batching/yield path end to end.
    const count = 20_000
    function* many() {
      for (let i = 0; i < count; i += 1) yield sampleMatch(i)
    }

    let bytes = 0
    let records = 0
    for await (const chunk of serializeJsonObject({
      properties: { backtest_metadata: { total_matches: count } },
      arrayKey: 'matches',
      records: many(),
      recordCount: count,
    })) {
      bytes += chunk.length
      if (chunk.includes('detect_id')) records += 1
    }

    expect(records).toBe(count)
    expect(bytes).toBeGreaterThan(1_000_000)
  })
})

describe('formatBytes', () => {
  it('formats byte counts across units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(-1)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(15 * 1024)).toBe('15 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(700 * 1024 * 1024)).toBe('700 MB')
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB')
  })
})

/**
 * Drives the real `exportJsonStream` File System Access path through a fake
 * picker, covering the progress reporting and failure surfacing that the UI
 * depends on.
 */
describe('exportJsonStream (file system access path)', () => {
  interface FakeFile {
    chunks: Uint8Array[]
    closed: boolean
    aborted: boolean
  }

  const stubPicker = (
    file: FakeFile,
    behaviour: { pickerError?: unknown; writeError?: unknown } = {},
  ) => {
    const showSaveFilePicker = async () => {
      if (behaviour.pickerError) throw behaviour.pickerError
      return {
        createWritable: async () => ({
          write: async (data: Uint8Array) => {
            if (behaviour.writeError) throw behaviour.writeError
            file.chunks.push(data)
          },
          close: async () => {
            file.closed = true
          },
          abort: async () => {
            file.aborted = true
          },
        }),
      }
    }
    const fakeWindow = { showSaveFilePicker } as unknown as Window & typeof globalThis
    ;(fakeWindow as unknown as { self: unknown }).self = fakeWindow
    ;(fakeWindow as unknown as { top: unknown }).top = fakeWindow
    vi.stubGlobal('window', fakeWindow)
  }

  const makeFile = (): FakeFile => ({ chunks: [], closed: false, aborted: false })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('streams to the picked file and reports monotonic percentage up to 100', async () => {
    const file = makeFile()
    stubPicker(file)

    const records = Array.from({ length: 1000 }, (_, i) => sampleMatch(i))
    const seen: ExportProgress[] = []

    const result = await exportJsonStream({
      fileName: 'backtest-all-matches.json',
      properties: { backtest_metadata: { total_matches: records.length } },
      arrayKey: 'matches',
      records,
      recordCount: records.length,
      batchSize: 100,
      onProgress: (p) => seen.push({ ...p }),
    })

    expect(result.completed).toBe(true)
    expect(result.transport).toBe('file-system-access')
    expect(result.records).toBe(1000)
    expect(file.closed).toBe(true)
    expect(file.aborted).toBe(false)

    // Percentages arrive in order and finish at exactly 100.
    const percents = seen.map((p) => p.percent)
    expect(percents).toEqual([...percents].sort((a, b) => (a ?? 0) - (b ?? 0)))
    expect(percents.at(-1)).toBe(100)
    expect(seen.at(-1)?.records).toBe(1000)
    expect(seen.every((p) => (p.percent ?? 0) >= 0 && (p.percent ?? 0) <= 100)).toBe(true)

    // The bytes written match the file that was actually produced, and parse.
    const written = Buffer.concat(file.chunks.map((c) => Buffer.from(c)))
    expect(written.byteLength).toBe(result.bytes)
    const parsed = JSON.parse(written.toString('utf8'))
    expect(parsed.matches).toHaveLength(1000)
    expect(parsed.backtest_metadata.total_matches).toBe(1000)
  })

  it('omits percent when the total is unknown', async () => {
    const file = makeFile()
    stubPicker(file)

    const seen: ExportProgress[] = []
    await exportJsonStream({
      fileName: 'x.json',
      arrayKey: 'matches',
      records: Array.from({ length: 20 }, (_, i) => sampleMatch(i)),
      batchSize: 10,
      onProgress: (p) => seen.push({ ...p }),
    })

    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((p) => p.percent === undefined)).toBe(true)
  })

  it('reports cancellation rather than an error when the dialog is dismissed', async () => {
    const file = makeFile()
    stubPicker(file, { pickerError: new DOMException('cancelled', 'AbortError') })

    const result = await exportJsonStream({
      fileName: 'x.json',
      arrayKey: 'matches',
      records: [sampleMatch(0)],
      recordCount: 1,
    })

    expect(result.completed).toBe(false)
    expect(result.records).toBe(0)
    expect(file.closed).toBe(false)
  })

  it('propagates a mid-export write failure and aborts the file', async () => {
    // This is the path that must never fail silently: the caller needs the
    // rejection so it can tell the user the file is incomplete.
    const file = makeFile()
    stubPicker(file, { writeError: new Error('disk full') })

    await expect(
      exportJsonStream({
        fileName: 'x.json',
        properties: { backtest_metadata: {} },
        arrayKey: 'matches',
        records: Array.from({ length: 10 }, (_, i) => sampleMatch(i)),
        recordCount: 10,
      }),
    ).rejects.toThrow('disk full')

    expect(file.aborted).toBe(true)
    expect(file.closed).toBe(false)
  })

  it('surfaces a failure from the record source itself', async () => {
    const file = makeFile()
    stubPicker(file)

    function* failing() {
      yield sampleMatch(0)
      throw new Error('result set went away')
    }

    await expect(
      exportJsonStream({
        fileName: 'x.json',
        arrayKey: 'matches',
        records: failing(),
        recordCount: 2,
      }),
    ).rejects.toThrow('result set went away')

    expect(file.aborted).toBe(true)
  })
})
