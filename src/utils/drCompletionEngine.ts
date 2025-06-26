/**
 * LimaCharlie Detection & Response Completion Engine
 *
 * This module provides intelligent, context-aware autocompletion for D&R rules
 * with proper YAML structure understanding and field validation.
 */

import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete'
import {
  OPERATORS,
  ACTIONS,
  TEMPLATE_FUNCTIONS,
  EVENT_PATHS,
  EVENT_TYPES,
  STATEFUL_KEYWORDS,
  TASK_COMMANDS,
} from './drAutocompletion'

export interface CompletionContext_DR {
  editor: 'detect' | 'respond'
  fieldContext: string | null
  lineContent: string
  beforeCursor: string
  afterCursor: string
  indentLevel: number
  isInArray: boolean
  isAfterColon: boolean
  yamlPath: string[]
  isInTemplate: boolean
  templateContext: string | null
  actionContext: string | null
  operatorContext: string | null
  isStateful: boolean
}

export class DRCompletionEngine {
  /**
   * Main completion function for CodeMirror
   */
  public static getCompletions(context: CompletionContext): CompletionResult | null {
    const drContext = DRCompletionEngine.analyzeDRContext(context)

    // Determine completion context and positioning
    const completionInfo = DRCompletionEngine.getCompletionInfo(context, drContext)
    const completions = DRCompletionEngine.generateCompletions(drContext, completionInfo.typedText)

    if (completions.length === 0) return null

    return {
      from: completionInfo.from,
      options: completions.map((completion) => ({
        label: completion.label,
        type: completion.type || 'keyword',
        info: completion.info,
        detail: completion.detail,
        apply: completion.apply || completion.label,
      })),
    }
  }

  /**
   * Get completion positioning and typed text information
   */
  private static getCompletionInfo(
    context: CompletionContext,
    drContext: CompletionContext_DR,
  ): { from: number; typedText: string } {
    const line = context.state.doc.lineAt(context.pos)
    const beforeCursor = line.text.slice(0, context.pos - line.from)

    // Case 1: Field value completion (after "field: " or "field:")
    if (drContext.isAfterColon && drContext.fieldContext) {
      // Match patterns like "field: value" or "field:value" or "field: " (including multi-word fields)
      const fieldValueMatch = beforeCursor.match(/([\w\s-_]+?)\s*:\s*([\w-_]*)$/)
      if (fieldValueMatch) {
        const _fieldName = fieldValueMatch[1].trim()
        const currentValue = fieldValueMatch[2]

        // Calculate position after "field: " (preserving space if it exists)
        const colonIndex = beforeCursor.lastIndexOf(':')
        const afterColonText = beforeCursor.slice(colonIndex + 1)
        const spaceMatch = afterColonText.match(/^(\s*)/)
        const spacesAfterColon = spaceMatch ? spaceMatch[1] : ''

        return {
          from: line.from + colonIndex + 1 + spacesAfterColon.length,
          typedText: currentValue,
        }
      }
    }

    // Case 2: Array item completion (after "- " or "-")
    if (drContext.isInArray) {
      const arrayItemMatch = beforeCursor.match(/-\s*([\w-_]*)$/)
      if (arrayItemMatch) {
        const currentValue = arrayItemMatch[1]
        const dashIndex = beforeCursor.lastIndexOf('-')
        const afterDashText = beforeCursor.slice(dashIndex + 1)
        const spaceMatch = afterDashText.match(/^(\s*)/)
        const spacesAfterDash = spaceMatch ? spaceMatch[1] : ''

        return {
          from: line.from + dashIndex + 1 + spacesAfterDash.length,
          typedText: currentValue,
        }
      }
    }

    // Case 3: Template completion (inside {{ }})
    if (drContext.isInTemplate) {
      const templateMatch = beforeCursor.match(/\{\{\s*([\w-_.]*)$/)
      if (templateMatch) {
        const currentValue = templateMatch[1]
        const openBraceIndex = beforeCursor.lastIndexOf('{{')
        const afterBracesText = beforeCursor.slice(openBraceIndex + 2)
        const spaceMatch = afterBracesText.match(/^(\s*)/)
        const spacesAfterBraces = spaceMatch ? spaceMatch[1] : ''

        return {
          from: line.from + openBraceIndex + 2 + spacesAfterBraces.length,
          typedText: currentValue,
        }
      }
    }

    // Case 4: Root level or general word completion
    const word = context.matchBefore(/[\w-_\s]*/)
    return {
      from: word ? word.from : context.pos,
      typedText: word ? word.text.trim() : '',
    }
  }

  /**
   * Analyze the current context to determine what completions to offer
   */
  private static analyzeDRContext(context: CompletionContext): CompletionContext_DR {
    const line = context.state.doc.lineAt(context.pos)
    const beforeCursor = line.text.slice(0, context.pos - line.from)
    const afterCursor = line.text.slice(context.pos - line.from)
    const lineContent = line.text

    // Determine active editor
    const editor = DRCompletionEngine.determineActiveEditor(context)

    // Basic line analysis
    const indentLevel = DRCompletionEngine.getIndentLevel(lineContent)
    // Detect if cursor is positioned after a field name and colon (with optional space)
    const fieldColonRegex = /(?:^|\s|-\s*)([\w-_\s]+):\s*$/
    const isAfterColon = fieldColonRegex.test(beforeCursor)
    const fieldContextMatch = beforeCursor.match(fieldColonRegex)
    const fieldContext = fieldContextMatch ? fieldContextMatch[1].trim() : null
    const isInArray = /^\s*-\s/.test(lineContent)

    // YAML path analysis
    const yamlPath = DRCompletionEngine.getYAMLPath(context, line)

    // Template analysis
    const isInTemplate = /\{\{[^}]*$/.test(beforeCursor)
    const templateMatch = beforeCursor.match(/\{\{\s*([^}]*)$/)
    const templateContext = templateMatch ? templateMatch[1] : null

    // Action and operator context
    const actionContext = DRCompletionEngine.getActionContext(context, line)
    const operatorContext = DRCompletionEngine.getOperatorContext(context, line)

    // Stateful rule detection
    const isStateful = DRCompletionEngine.isStatefulRule(context)

    return {
      editor,
      fieldContext,
      lineContent,
      beforeCursor,
      afterCursor,
      indentLevel,
      isInArray,
      isAfterColon,
      yamlPath,
      isInTemplate,
      templateContext,
      actionContext,
      operatorContext,
      isStateful,
    }
  }

  /**
   * Generate appropriate completions based on context
   */
  private static generateCompletions(
    drContext: CompletionContext_DR,
    typedText: string,
  ): Completion[] {
    let completions: Completion[] = []

    // Template completions take priority
    if (drContext.isInTemplate) {
      completions = DRCompletionEngine.getTemplateCompletions(drContext, typedText)
    }
    // Field-specific completions
    else if (drContext.isAfterColon && drContext.fieldContext) {
      completions = DRCompletionEngine.getFieldValueCompletions(drContext, typedText)
    }
    // Action parameter completions
    else if (drContext.actionContext && drContext.editor === 'respond') {
      completions = DRCompletionEngine.getActionParameterCompletions(drContext, typedText)
    }
    // Operator parameter completions
    else if (drContext.operatorContext && drContext.editor === 'detect') {
      completions = DRCompletionEngine.getOperatorParameterCompletions(drContext, typedText)
    }
    // Root level completions
    else {
      completions = DRCompletionEngine.getRootLevelCompletions(drContext, typedText)
    }

    // Filter by typed text
    return completions.filter((completion) =>
      completion.label.toLowerCase().includes(typedText.toLowerCase()),
    )
  }

  /**
   * Get completions for template functions and variables
   */
  private static getTemplateCompletions(
    _drContext: CompletionContext_DR,
    _typedText: string,
  ): Completion[] {
    const completions: Completion[] = []

    // Template functions
    Object.values(TEMPLATE_FUNCTIONS).forEach((func) => {
      completions.push({
        label: func.name,
        type: 'function',
        info: func.description,
        detail: `(${func.parameters.join(', ')})`,
        apply: `${func.name} `,
      })
    })

    // Template variables
    const templateVars = [
      // Event variables
      '.event.FILE_PATH',
      '.event.COMMAND_LINE',
      '.event.PROCESS_ID',
      '.event.PARENT_PROCESS_ID',
      '.event.USER_NAME',
      '.event.EVENT_TYPE',
      '.event.SIZE',
      '.event.HASH',
      '.event.DESTINATION',
      '.event.SOURCE',
      '.event.IP_ADDRESS',
      '.event.NETWORK_ACTIVITY',
      // Routing variables
      '.routing.hostname',
      '.routing.platform',
      '.routing.arch',
      '.routing.event_time',
      '.routing.sensor_id',
      '.routing.int_ip',
      '.routing.ext_ip',
      // Meta variables
      '.meta.investigation_id',
      '.meta.alert_id',
      '.meta.rule_name',
      // Detection variables (for stateful rules)
      '.detect.event',
      '.detect.child_events',
      '.detect.routing',
      // Variable storage
      '.var.custom_variable',
    ]

    templateVars.forEach((variable) => {
      completions.push({
        label: variable,
        type: 'variable',
        info: `Template variable: ${variable}`,
        apply: variable,
      })
    })

    return completions
  }

  /**
   * Get completions for field values based on field name
   */
  private static getFieldValueCompletions(
    drContext: CompletionContext_DR,
    _typedText: string,
  ): Completion[] {
    const completions: Completion[] = []
    const field = drContext.fieldContext!

    switch (field) {
      case 'op':
        // Operator completions
        Object.values(OPERATORS).forEach((op) => {
          completions.push({
            label: op.name,
            type: 'keyword',
            info: op.description,
            detail: `Category: ${op.category}`,
          })
        })
        break

      case 'action':
        // Action completions (respond editor only)
        if (drContext.editor === 'respond') {
          Object.values(ACTIONS).forEach((action) => {
            completions.push({
              label: action.name,
              type: 'keyword',
              info: action.description,
              detail: `Category: ${action.category}`,
            })
          })
        }
        break

      case 'event':
        // Event type completions (for stateful rules)
        EVENT_TYPES.forEach((eventType) => {
          completions.push({
            label: eventType,
            type: 'constant',
            info: `Event type: ${eventType}`,
          })
        })
        break

      case 'path':
        // Event path completions
        EVENT_PATHS.forEach((path) => {
          completions.push({
            label: path,
            type: 'property',
            info: `Event path: ${path}`,
          })
        })
        break

      case 'value':
        // Context-dependent value completions
        if (drContext.beforeCursor.includes('event/EVENT_TYPE')) {
          EVENT_TYPES.forEach((eventType) => {
            completions.push({
              label: eventType,
              type: 'constant',
              info: `Event type: ${eventType}`,
            })
          })
        }
        break

      case 'command':
        // Task command completions
        if (drContext.actionContext === 'task') {
          TASK_COMMANDS.forEach((cmd) => {
            completions.push({
              label: cmd,
              type: 'function',
              info: `Task command: ${cmd}`,
            })
          })
        }
        break

      case 'case sensitive':
      case 'not':
      case 'publish':
      case 'entire_device':
        // Boolean completions
        completions.push(
          { label: 'true', type: 'constant', info: 'Boolean true' },
          { label: 'false', type: 'constant', info: 'Boolean false' },
        )
        break

      case 'priority':
        // Priority level completions
        for (let i = 1; i <= 5; i++) {
          completions.push({
            label: i.toString(),
            type: 'constant',
            info: `Priority level ${i} (${i === 1 ? 'highest' : i === 5 ? 'lowest' : 'medium'})`,
          })
        }
        break

      case 'lookup':
        // Lookup type completions
        ;['sha256', 'md5', 'ip', 'domain'].forEach((type) => {
          completions.push({
            label: type,
            type: 'constant',
            info: `Lookup type: ${type}`,
          })
        })
        break

      case 'scope':
        // Scope completions
        ;['process', 'file', 'network'].forEach((scope) => {
          completions.push({
            label: scope,
            type: 'constant',
            info: `Scope: ${scope}`,
          })
        })
        break

      case 'platform':
        // Platform completions
        ;['windows', 'linux', 'macos', 'android', 'ios'].forEach((platform) => {
          completions.push({
            label: platform,
            type: 'constant',
            info: `Platform: ${platform}`,
          })
        })
        break

      case 'arch':
        // Architecture completions
        ;['x86', 'x64', 'arm', 'arm64'].forEach((arch) => {
          completions.push({
            label: arch,
            type: 'constant',
            info: `Architecture: ${arch}`,
          })
        })
        break

      case 'tag':
        // Common tag suggestions
        ;['compromised', 'suspicious', 'clean', 'vip_asset', 'server', 'workstation'].forEach(
          (tag) => {
            completions.push({
              label: tag,
              type: 'constant',
              info: `Tag: ${tag}`,
            })
          },
        )
        break

      case 'cidr':
        // Common CIDR network suggestions
        ;['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '127.0.0.0/8'].forEach((cidr) => {
          completions.push({
            label: cidr,
            type: 'constant',
            info: `CIDR range: ${cidr}`,
          })
        })
        break

      case 're':
        // Common regex pattern suggestions
        ;[
          '\\\\b(cmd|powershell)\\\\b',
          '\\\\.(exe|dll|bat|ps1)$',
          '^[a-fA-F0-9]{32}$',
          '^[a-fA-F0-9]{64}$',
        ].forEach((pattern) => {
          completions.push({
            label: `"${pattern}"`,
            type: 'string',
            info: `Regex pattern: ${pattern}`,
          })
        })
        break
    }

    return completions
  }

  /**
   * Get parameter completions for specific actions
   */
  private static getActionParameterCompletions(
    drContext: CompletionContext_DR,
    _typedText: string,
  ): Completion[] {
    const completions: Completion[] = []
    const actionDef = ACTIONS[drContext.actionContext!]

    if (!actionDef) return completions

    // Add required parameters
    actionDef.requiredParams.forEach((param) => {
      if (!DRCompletionEngine.isParameterAlreadyPresent(drContext, param.name)) {
        completions.push({
          label: param.name,
          type: 'property',
          info: `Required: ${param.description}`,
          detail: `Type: ${param.type}`,
          apply: `${param.name}: `,
        })
      }
    })

    // Add optional parameters
    actionDef.optionalParams.forEach((param) => {
      if (!DRCompletionEngine.isParameterAlreadyPresent(drContext, param.name)) {
        completions.push({
          label: param.name,
          type: 'property',
          info: `Optional: ${param.description}`,
          detail: `Type: ${param.type}`,
          apply: `${param.name}: `,
        })
      }
    })

    return completions
  }

  /**
   * Get parameter completions for specific operators
   */
  private static getOperatorParameterCompletions(
    drContext: CompletionContext_DR,
    _typedText: string,
  ): Completion[] {
    const completions: Completion[] = []
    const operatorDef = OPERATORS[drContext.operatorContext!]

    if (!operatorDef) return completions

    // Add required fields
    operatorDef.requiredFields.forEach((field) => {
      if (!DRCompletionEngine.isParameterAlreadyPresent(drContext, field)) {
        completions.push({
          label: field,
          type: 'property',
          info: `Required field for ${operatorDef.name}`,
          apply: `${field}: `,
        })
      }
    })

    // Add optional fields
    operatorDef.optionalFields.forEach((field) => {
      if (!DRCompletionEngine.isParameterAlreadyPresent(drContext, field.name)) {
        completions.push({
          label: field.name,
          type: 'property',
          info: `Optional: ${field.description}`,
          detail: `Type: ${field.type}`,
          apply: `${field.name}: `,
        })
      }
    })

    return completions
  }

  /**
   * Get root-level completions based on editor and context
   */
  private static getRootLevelCompletions(
    drContext: CompletionContext_DR,
    _typedText: string,
  ): Completion[] {
    const completions: Completion[] = []

    if (drContext.editor === 'detect') {
      // Detection logic keywords
      completions.push(
        { label: 'op', type: 'keyword', info: 'Detection operator', apply: 'op: ' },
        { label: 'path', type: 'keyword', info: 'Event field path', apply: 'path: ' },
        { label: 'value', type: 'keyword', info: 'Value to match', apply: 'value: ' },
        { label: 'rules', type: 'keyword', info: 'Nested rules array', apply: 'rules:\n  - ' },
        { label: 'rule', type: 'keyword', info: 'Single nested rule', apply: 'rule:\n  ' },
        {
          label: 'event',
          type: 'keyword',
          info: 'Event type for stateful rules',
          apply: 'event: ',
        },
        { label: 'not', type: 'keyword', info: 'Invert result', apply: 'not: ' },
        { label: 'times', type: 'keyword', info: 'Number of occurrences', apply: 'times: ' },
        { label: 'seconds', type: 'keyword', info: 'Time window in seconds', apply: 'seconds: ' },
        {
          label: 'case sensitive',
          type: 'keyword',
          info: 'Case-sensitive matching',
          apply: 'case sensitive: ',
        },
      )

      // Stateful keywords
      if (drContext.isStateful) {
        STATEFUL_KEYWORDS.forEach((keyword) => {
          completions.push({
            label: keyword,
            type: 'keyword',
            info: `Stateful rule: ${keyword}`,
            apply: keyword.includes(' ') ? `${keyword}: ` : `${keyword}:\n  `,
          })
        })
      }
    } else if (drContext.editor === 'respond') {
      // Response action structure
      if (drContext.isInArray || drContext.indentLevel === 0) {
        completions.push({
          label: 'action',
          type: 'keyword',
          info: 'Response action',
          apply: 'action: ',
        })
      }
    }

    return completions
  }

  /**
   * Helper methods
   */
  private static determineActiveEditor(context: CompletionContext): 'detect' | 'respond' {
    if (context.view?.dom) {
      const parentPanel = context.view.dom.closest('.editor-panel')
      if (parentPanel) {
        const respondLabel = parentPanel.querySelector('label[for="respondEditor"]')
        if (respondLabel) return 'respond'
      }
    }
    return 'detect'
  }

  private static getIndentLevel(lineContent: string): number {
    const match = lineContent.match(/^(\s*)/)
    return match ? match[1].length : 0
  }

  private static getYAMLPath(_context: CompletionContext, _currentLine: any): string[] {
    // Simplified YAML path detection - could be enhanced
    return []
  }

  private static getActionContext(context: CompletionContext, currentLine: any): string | null {
    // Look backwards for the most recent action declaration
    const lineNumber = currentLine.number
    const doc = context.state.doc

    for (let i = lineNumber; i >= 1; i--) {
      const line = doc.line(i)
      const actionMatch = line.text.match(/^\s*-?\s*action:\s*(.+)/)
      if (actionMatch) {
        return actionMatch[1].trim()
      }
      // Stop if we hit a line with less indentation (end of action block)
      if (i < lineNumber && line.text.trim() && !line.text.startsWith(' ')) {
        break
      }
    }
    return null
  }

  private static getOperatorContext(context: CompletionContext, currentLine: any): string | null {
    // Look backwards for the most recent operator declaration
    const lineNumber = currentLine.number
    const doc = context.state.doc

    for (let i = lineNumber; i >= 1; i--) {
      const line = doc.line(i)
      const opMatch = line.text.match(/^\s*-?\s*op:\s*(.+)/)
      if (opMatch) {
        return opMatch[1].trim()
      }
      // Stop if we hit a line with less indentation
      if (i < lineNumber && line.text.trim() && !line.text.startsWith(' ')) {
        break
      }
    }
    return null
  }

  private static isStatefulRule(context: CompletionContext): boolean {
    const docText = context.state.doc.toString()
    return STATEFUL_KEYWORDS.some((keyword) => docText.includes(keyword))
  }

  private static isParameterAlreadyPresent(
    drContext: CompletionContext_DR,
    paramName: string,
  ): boolean {
    // Check for parameter in current block with proper word boundaries
    const currentBlock = drContext.beforeCursor
    const paramRegex = new RegExp(
      `(?:^|\\s|-)\\s*${paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*`,
      'm',
    )
    return paramRegex.test(currentBlock)
  }
}
