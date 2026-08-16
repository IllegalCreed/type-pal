import { describe, expect, test, vi } from 'vitest'
import {
  closeSceneScriptPanelState,
  createEditorLayoutCommands,
  executeEditorLayoutShortcut,
  type EditorLayoutCommandHandlers,
  toggleSceneScriptPanelState,
} from './app-layout-commands.js'

function handlers(): EditorLayoutCommandHandlers {
  return {
    toggleOutliner: vi.fn(),
    toggleScriptPanel: vi.fn(),
    toggleInspector: vi.fn(),
    resetLayout: vi.fn(),
  }
}

describe('editor layout commands', () => {
  test('menu and toolbar projections keep the exact same handlers used by shortcuts', () => {
    const actions = handlers()
    const commands = createEditorLayoutCommands(actions, {
      outlinerVisible: true,
      scriptPanelAvailable: true,
      scriptPanelVisible: false,
      inspectorVisible: true,
    })
    expect(commands.find((command) => command.id === 'view.toggle-outliner')?.execute).toBe(
      actions.toggleOutliner,
    )
    expect(commands.find((command) => command.id === 'view.toggle-script-panel')?.execute).toBe(
      actions.toggleScriptPanel,
    )
    expect(commands.find((command) => command.id === 'view.toggle-inspector')?.execute).toBe(
      actions.toggleInspector,
    )
    expect(commands.find((command) => command.id === 'view.reset-layout')?.execute).toBe(
      actions.resetLayout,
    )

    expect(executeEditorLayoutShortcut({ key: 'b', metaKey: true, ctrlKey: false, altKey: true }, actions)).toBe(true)
    expect(actions.toggleScriptPanel).toHaveBeenCalledOnce()
  })

  test('does not consume unrelated or incomplete shortcuts', () => {
    const actions = handlers()
    expect(executeEditorLayoutShortcut({ key: 'b', metaKey: false, ctrlKey: false, altKey: true }, actions)).toBe(false)
    expect(executeEditorLayoutShortcut({ key: 'x', metaKey: true, ctrlKey: false, altKey: true }, actions)).toBe(false)
    expect(actions.toggleScriptPanel).not.toHaveBeenCalled()
  })

  test('disables the contextual script panel command outside scene workspace', () => {
    const actions = handlers()
    const command = createEditorLayoutCommands(actions, {
      outlinerVisible: true,
      scriptPanelAvailable: false,
      scriptPanelVisible: false,
      inspectorVisible: true,
    }).find((candidate) => candidate.id === 'view.toggle-script-panel')
    expect(command).toMatchObject({
      enabled: false,
      disabledReason: '当前页面没有底部脚本面板',
      pressed: false,
    })
  })

  test('pure panel toggles preserve source context and clear stale internal focus', () => {
    const focused = {
      open: true,
      src: 'scene:s001:onEnter',
      internalScriptId: 'internal-1',
      commandPath: '/body/3',
      focusRevision: 7,
    }
    const closed = toggleSceneScriptPanelState(focused)
    expect(closed).toEqual({
      open: false,
      src: focused.src,
      internalScriptId: null,
      commandPath: null,
      focusRevision: 7,
    })
    expect(toggleSceneScriptPanelState(closed)).toEqual({ ...closed, open: true })
    expect(closeSceneScriptPanelState({ ...closed, open: true })).toEqual(closed)
  })
})
