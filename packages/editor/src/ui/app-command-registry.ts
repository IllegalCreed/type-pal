import type { DsIconName, DsToolbarCommand } from './design-system/index.js'

export interface EditorAppCommand {
  id: string
  label: string
  icon: DsIconName
  shortcut?: string
  enabled: boolean
  disabledReason?: string
  busy?: boolean
  /** Toggle commands expose the same state to menu, toolbar and shortcuts. */
  pressed?: boolean
  scope: 'global' | 'context'
  defaultPlacement?: 'fixed' | 'common' | 'context'
  execute: () => void
}

export type EditorAppCommandRegistry = ReadonlyMap<string, EditorAppCommand>

export function createEditorAppCommandRegistry(
  commands: readonly EditorAppCommand[],
): EditorAppCommandRegistry {
  const registry = new Map<string, EditorAppCommand>()
  for (const command of commands) {
    if (!command.id.trim()) throw new Error('编辑器命令 id 不能为空')
    if (registry.has(command.id)) throw new Error(`编辑器命令 id 重复：${command.id}`)
    registry.set(command.id, Object.freeze({ ...command }))
  }
  return registry
}

export function requireEditorAppCommand(
  registry: EditorAppCommandRegistry,
  id: string,
): EditorAppCommand {
  const command = registry.get(id)
  if (!command) throw new Error(`编辑器命令不存在：${id}`)
  return command
}

export function toolbarCommandView(command: EditorAppCommand): DsToolbarCommand {
  return {
    id: command.id,
    label: command.label,
    icon: command.icon,
    shortcut: command.shortcut,
    disabled: !command.enabled,
    disabledReason: command.disabledReason,
    busy: command.busy,
    pressed: command.pressed,
    execute: command.execute,
  }
}
