import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'

import { DRCompletionEngine } from '../drCompletionEngine'

const completionFor = (document: string, editor: 'detect' | 'respond' = 'detect') => {
  const state = EditorState.create({ doc: document })
  const view =
    editor === 'respond'
      ? ({
          dom: {
            closest: () => ({
              querySelector: (selector: string) =>
                selector === 'label[for="respondEditor"]' ? {} : null,
            }),
          },
        } as unknown as EditorView)
      : undefined

  return DRCompletionEngine.getCompletions(
    new CompletionContext(state, document.length, true, view),
  )
}

const labelsFor = (document: string, editor?: 'detect' | 'respond') =>
  completionFor(document, editor)?.options.map((option) => option.label) ?? []

describe('DRCompletionEngine public completion source', () => {
  it('offers detection root keys with their insertion text', () => {
    const result = completionFor('')

    expect(result?.from).toBe(0)
    expect(result?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'op', apply: 'op: ' }),
        expect.objectContaining({ label: 'rules', apply: 'rules:\n  - ' }),
        expect.objectContaining({ label: 'events', apply: 'events:\n  - ' }),
      ]),
    )
  })

  it('replaces only the current field value when suggesting operators', () => {
    const document = 'op: '
    const result = completionFor(document)

    expect(result?.from).toBe('op: '.length)
    expect(result?.options.map((option) => option.label)).toContain('contains')
    expect(result?.options.map((option) => option.label)).toContain('is platform')
  })

  it('offers all event types for items in an events array', () => {
    const document = 'events:\n  - NE'
    const result = completionFor(document)

    expect(result?.from).toBe(document.lastIndexOf('NE'))
    expect(result?.options.map((option) => option.label)).toEqual(
      expect.arrayContaining(['NEW_PROCESS', 'NETWORK_SUMMARY']),
    )
  })

  it('prioritizes template suggestions and retains their apply text', () => {
    const document = 'value: {{ tok'
    const result = completionFor(document)

    expect(result?.from).toBe(document.indexOf('tok'))
    expect(result?.options).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'token', apply: 'token ' })]),
    )
  })

  it('does not re-suggest parameters already present in the current operator block', () => {
    const labels = labelsFor('rules:\n  - op: contains\n    path: event/COMMAND_LINE\n    ')

    expect(labels).toContain('value')
    expect(labels).not.toContain('op')
    expect(labels).not.toContain('path')
  })

  it('uses the response-editor context for actions and task commands', () => {
    expect(labelsFor('', 'respond')).toContain('action')
    expect(labelsFor('- action: task\n  command: ', 'respond')).toEqual(
      expect.arrayContaining(['process_list', 'exec', 'screenshot']),
    )
  })
})
