/**
 * LimaCharlie Detection & Response Completion Engine
 *
 * This module provides intelligent, context-aware autocompletion for D&R rules
 * with proper YAML structure understanding and field validation.
 *
 * NOTE: This module uses detailed operator/action metadata from drAutocompletion.ts
 * for autocomplete suggestions. The canonical list of valid operators/actions is
 * defined in drConstants.ts and used by drValidation.ts. All three modules should
 * be kept in sync to ensure validation and autocomplete are consistent.
 */

import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete'
import type { Line } from '@codemirror/state'
import {
  OPERATORS,
  ACTIONS,
  TEMPLATE_FUNCTIONS,
  EVENT_PATHS,
  EVENT_TYPES,
  STATEFUL_KEYWORDS,
  TASK_COMMANDS,
} from './drAutocompletion'
import { logger } from './logger'

export interface CompletionContext_DR {
  editor: 'detect' | 'respond'
  fieldContext: string | null
  lineContent: string
  beforeCursor: string
  fullDocumentBeforeCursor: string
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

    // DEBUG: Log context in development mode only
    logger.debug('🔍 DRCompletionEngine.getCompletions called', {
      beforeCursor: drContext.beforeCursor,
      lineContent: drContext.lineContent,
      isAfterColon: drContext.isAfterColon,
      fieldContext: drContext.fieldContext,
      isInArray: drContext.isInArray,
      operatorContext: drContext.operatorContext,
      editor: drContext.editor,
    })

    // Determine completion context and positioning
    const completionInfo = DRCompletionEngine.getCompletionInfo(context, drContext)

    logger.debug('📍 getCompletionInfo result', {
      from: completionInfo.from,
      typedText: completionInfo.typedText,
    })

    const completions = DRCompletionEngine.generateCompletions(drContext, completionInfo.typedText)

    logger.debug('✅ generateCompletions result', {
      count: completions.length,
      labels: completions.map((c) => c.label).slice(0, 10),
    })

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
    // This must come BEFORE array item completion to handle cases like "- op: value"
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
    // Only match if we're NOT after a colon (to avoid matching "- op: ")
    if (drContext.isInArray && !drContext.isAfterColon) {
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
    const fullDocumentBeforeCursor = context.state.doc.sliceString(0, context.pos)
    const beforeCursor = line.text.slice(0, context.pos - line.from)
    const afterCursor = line.text.slice(context.pos - line.from)
    const lineContent = line.text

    // Determine active editor
    const editor = DRCompletionEngine.determineActiveEditor(context)

    // Basic line analysis
    const indentLevel = DRCompletionEngine.getIndentLevel(lineContent)
    // Detect if cursor is positioned after a field name and colon (with optional space)
    // Match field names after colons, excluding the dash from array items (e.g., "- op: " captures "op")
    const fieldColonRegex = /(?:^|\s|-\s*)([\w-_\s]+?):\s*$/
    const isAfterColon = fieldColonRegex.test(beforeCursor)
    const fieldContextMatch = beforeCursor.match(fieldColonRegex)
    // Extract just the field name, trimming any leading dash that might be captured
    const fieldContext = fieldContextMatch ? fieldContextMatch[1].trim().replace(/^-\s*/, '') : null
    const isInArray = /^\s*-\s*/.test(lineContent)

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
      fullDocumentBeforeCursor,
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
    // Array item completions for events array
    else if (drContext.isInArray && DRCompletionEngine.isInEventsArray(drContext)) {
      // Suggest EVENT_TYPES for array items under "events:"
      EVENT_TYPES.forEach((eventType) => {
        completions.push({
          label: eventType,
          type: 'constant',
          info: `Event type: ${eventType}`,
        })
      })
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

    // Always suggest 'op' for nested rules (even if we have an operator context)
    if (!DRCompletionEngine.isParameterAlreadyPresent(drContext, 'op')) {
      completions.push({
        label: 'op',
        type: 'property',
        info: 'Detection operator (for nested rules)',
        apply: 'op: ',
      })
    }

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
      // Detection logic keywords (core fields)
      completions.push(
        { label: 'op', type: 'keyword', info: 'Detection operator', apply: 'op: ' },
        { label: 'path', type: 'keyword', info: 'Event field path', apply: 'path: ' },
        { label: 'value', type: 'keyword', info: 'Value to match', apply: 'value: ' },
      )

      // Modifier fields
      completions.push(
        {
          label: 'case sensitive',
          type: 'keyword',
          info: 'Case-sensitive matching',
          apply: 'case sensitive: ',
        },
        { label: 're', type: 'keyword', info: 'Regular expression pattern', apply: 're: ' },
        { label: 'max', type: 'keyword', info: 'Maximum string distance', apply: 'max: ' },
        { label: 'seconds', type: 'keyword', info: 'Time window in seconds', apply: 'seconds: ' },
        { label: 'tag', type: 'keyword', info: 'Tag name for is tagged operator', apply: 'tag: ' },
        {
          label: 'resource',
          type: 'keyword',
          info: 'Resource identifier for lookup',
          apply: 'resource: ',
        },
      )

      // Structure fields
      completions.push(
        { label: 'rules', type: 'keyword', info: 'Nested rules array', apply: 'rules:\n  - ' },
        { label: 'rule', type: 'keyword', info: 'Single nested rule', apply: 'rule:\n  ' },
        {
          label: 'event',
          type: 'keyword',
          info: 'Event type for stateful rules',
          apply: 'event: ',
        },
        {
          label: 'events',
          type: 'keyword',
          info: 'Multiple event types',
          apply: 'events:\n  - ',
        },
        {
          label: 'target',
          type: 'keyword',
          info: 'Target source (e.g., edr, artifact)',
          apply: 'target: ',
        },
      )

      // Special fields
      completions.push(
        { label: 'not', type: 'keyword', info: 'Invert result (must be true)', apply: 'not: ' },
        {
          label: 'count',
          type: 'keyword',
          info: 'Count occurrences for stateful rules',
          apply: 'count: ',
        },
        {
          label: 'length of',
          type: 'keyword',
          info: 'Check array/string length',
          apply: 'length of: ',
        },
        { label: 'times', type: 'keyword', info: 'Number of occurrences', apply: 'times: ' },
        {
          label: 'with child',
          type: 'keyword',
          info: 'Stateful child event matching',
          apply: 'with child:\n  ',
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

  /**
   * Get the base indentation of a line (before any - array marker)
   * For "  - op: is", returns 2 (the spaces before -)
   * For "    path: foo", returns 4
   */
  private static getBaseIndent(lineContent: string): number {
    const match = lineContent.match(/^(\s*)/)
    return match ? match[1].length : 0
  }

  /**
   * Get the content indentation level (where actual content starts)
   * For "  - op: is", the content starts after "  - " so indent is 4
   * For "    path: foo", content starts at 4
   */
  private static getContentIndent(lineContent: string): number {
    // If line starts with array marker "- ", add 2 to account for it
    if (/^\s*-\s/.test(lineContent)) {
      const baseIndent = this.getBaseIndent(lineContent)
      return baseIndent + 2 // "- " takes 2 characters
    }
    return this.getBaseIndent(lineContent)
  }

  private static getYAMLPath(_context: CompletionContext, _currentLine: Line): string[] {
    // Simplified YAML path detection - could be enhanced
    return []
  }

  private static getActionContext(context: CompletionContext, currentLine: Line): string | null {
    // Look backwards for the most recent action declaration
    const lineNumber = currentLine.number
    const doc = context.state.doc

    // Track the closest action we find and validate it's in scope
    let closestAction: string | null = null
    let closestActionIndent = -1
    let closestActionLine = -1

    for (let i = lineNumber; i >= 1; i--) {
      const line = doc.line(i)
      const lineText = line.text
      const lineBaseIndent = DRCompletionEngine.getBaseIndent(lineText)

      // Check if this line has an action declaration
      const actionMatch = lineText.match(/^\s*-?\s*action:\s*(.+)/)
      if (actionMatch && closestAction === null) {
        // Found the closest action declaration
        closestAction = actionMatch[1].trim()
        closestActionIndent = lineBaseIndent
        closestActionLine = i

        // If we're on the same line, definitely use this context
        if (i === lineNumber) {
          return closestAction
        }
        // Don't check this line as a sibling - continue to next iteration
        continue
      }

      // If we found an action, now check if we've exited its scope
      if (closestAction !== null && i < lineNumber && i !== closestActionLine) {
        // Check for lines that would indicate we've left the action's scope
        const trimmedLine = lineText.trim()

        // Empty lines don't break scope
        if (!trimmedLine) continue

        // If we hit another line with "- " at the same or lower indentation as the action,
        // we've hit a sibling item and should stop
        if (lineBaseIndent <= closestActionIndent && /^\s*-\s/.test(lineText)) {
          // This is a sibling array item to our action - we've exited scope
          break
        }
      }
    }

    return closestAction
  }

  private static getOperatorContext(context: CompletionContext, currentLine: Line): string | null {
    // Look backwards for the most recent operator declaration
    const lineNumber = currentLine.number
    const doc = context.state.doc

    // Track the closest operator we find and validate it's in scope
    let closestOperator: string | null = null
    let closestOperatorIndent = -1
    let closestOperatorLine = -1

    for (let i = lineNumber; i >= 1; i--) {
      const line = doc.line(i)
      const lineText = line.text
      const lineBaseIndent = DRCompletionEngine.getBaseIndent(lineText)

      // Check if this line has an operator declaration
      const opMatch = lineText.match(/^\s*-?\s*op:\s*(.+)/)
      if (opMatch && closestOperator === null) {
        // Found the closest operator declaration
        closestOperator = opMatch[1].trim()
        closestOperatorIndent = lineBaseIndent
        closestOperatorLine = i

        // If we're on the same line, definitely use this context
        if (i === lineNumber) {
          return closestOperator
        }
        // Don't check this line as a sibling - continue to next iteration
        continue
      }

      // If we found an operator, now check if we've exited its scope
      if (closestOperator !== null && i < lineNumber && i !== closestOperatorLine) {
        // Check for lines that would indicate we've left the operator's scope
        const trimmedLine = lineText.trim()

        // Empty lines don't break scope
        if (!trimmedLine) continue

        // If we hit another line with "- " at the same or lower indentation as the operator,
        // we've hit a sibling item and should stop
        if (lineBaseIndent <= closestOperatorIndent && /^\s*-\s/.test(lineText)) {
          // This is a sibling array item to our operator - we've exited scope
          break
        }
      }
    }

    return closestOperator
  }

  private static isStatefulRule(context: CompletionContext): boolean {
    const docText = context.state.doc.toString()
    return STATEFUL_KEYWORDS.some((keyword) => docText.includes(keyword))
  }

  private static isParameterAlreadyPresent(
    drContext: CompletionContext_DR,
    paramName: string,
  ): boolean {
    // Get the current block text (from array item start or document start to cursor)
    const lines = drContext.fullDocumentBeforeCursor.split('\n')
    const currentLineIndex = lines.length - 1
    const currentLine = lines[currentLineIndex]
    const currentIndent = drContext.indentLevel

    // If the current line starts an array item, the block is just from this line onwards
    // This prevents including previous sibling array items
    let blockStartIndex = currentLineIndex
    if (!/^\s*-\s/.test(currentLine)) {
      // Current line is NOT an array item start, so look backwards for where this block started
      for (let i = currentLineIndex - 1; i >= 0; i--) {
        const line = lines[i]
        const lineIndent = DRCompletionEngine.getIndentLevel(line)

        // If we find a line starting with "- " at current or lower indent, that's the block start
        if (lineIndent <= currentIndent && /^\s*-\s/.test(line)) {
          blockStartIndex = i
          break
        }

        // If we find any non-empty line at lower indent that isn't an array marker, stop
        if (lineIndent < currentIndent && line.trim() && !line.trim().startsWith('-')) {
          break
        }
      }
    }

    // Extract the current block text
    const currentBlock = lines.slice(blockStartIndex, currentLineIndex + 1).join('\n')

    // Check for parameter in current block with proper word boundaries
    const paramRegex = new RegExp(
      `(?:^|\\s|-)\\s*${paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*`,
      'm',
    )
    return paramRegex.test(currentBlock)
  }

  /**
   * Check if the current array context is within an "events:" field
   */
  private static isInEventsArray(drContext: CompletionContext_DR): boolean {
    // Look backwards for "events:" at a less-indented level
    const lines = drContext.fullDocumentBeforeCursor.split('\n')
    const currentIndent = drContext.indentLevel

    // Search backwards through previous lines
    for (let i = lines.length - 2; i >= 0; i--) {
      const line = lines[i]
      const lineIndent = DRCompletionEngine.getIndentLevel(line)

      // If we find a line at lower indentation, check if it's "events:"
      if (lineIndent < currentIndent) {
        if (/^\s*events:\s*$/.test(line)) {
          return true
        }
        // If it's a different field at lower indentation, we've exited the events array
        if (line.trim().length > 0 && !line.trim().startsWith('-')) {
          return false
        }
      }
    }

    return false
  }
}
