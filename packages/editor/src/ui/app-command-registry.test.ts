import { describe, expect, test, vi } from 'vitest'
import {
  createEditorAppCommandRegistry,
  requireEditorAppCommand,
  toolbarCommandView,
} from './app-command-registry.js'

describe('editor app command registry', () => {
  test('keeps menu, toolbar and shortcut views on one handler identity', () => {
    const execute = vi.fn()
    const registry = createEditorAppCommandRegistry([
      { id: 'file.save', label: '保存', icon: 'save', enabled: true, scope: 'global', execute },
    ])
    const menu = requireEditorAppCommand(registry, 'file.save')
    const toolbar = toolbarCommandView(menu)
    menu.execute()
    toolbar.execute()
    requireEditorAppCommand(registry, 'file.save').execute()
    expect(execute).toHaveBeenCalledTimes(3)
    expect(toolbar.execute).toBe(execute)
  })

  test('projects toggle state without manufacturing another handler', () => {
    const execute = vi.fn()
    const registry = createEditorAppCommandRegistry([
      {
        id: 'view.toggle-left',
        label: '对象列表',
        icon: 'panel-left',
        enabled: true,
        pressed: true,
        scope: 'global',
        execute,
      },
    ])
    const command = requireEditorAppCommand(registry, 'view.toggle-left')
    const toolbar = toolbarCommandView(command)
    expect(toolbar.pressed).toBe(true)
    expect(toolbar.execute).toBe(execute)
  })

  test('rejects duplicate and missing command ids', () => {
    const command = { id: 'edit.undo', label: '撤销', icon: 'undo' as const, enabled: true, scope: 'global' as const, execute: () => {} }
    expect(() => createEditorAppCommandRegistry([command, command])).toThrow('命令 id 重复')
    const registry = createEditorAppCommandRegistry([command])
    expect(() => requireEditorAppCommand(registry, 'edit.redo')).toThrow('命令不存在')
  })
})
