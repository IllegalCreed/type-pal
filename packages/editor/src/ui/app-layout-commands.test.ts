import { describe, expect, test, vi } from 'vitest'
import {
  closeSceneScriptPanelState,
  createEditorLayoutCommands,
  type EditorLayoutCommandHandlers,
  editorPanelToolbarCommandIds,
  executeEditorLayoutShortcut,
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
  test('toolbar hides panel toggles when the current page has no matching panel', () => {
    expect(
      editorPanelToolbarCommandIds({
        scriptPanelAvailable: false,
        inspectorAvailable: false,
      }),
    ).toEqual(['view.toggle-outliner'])
    expect(
      editorPanelToolbarCommandIds({
        scriptPanelAvailable: true,
        inspectorAvailable: true,
      }),
    ).toEqual(['view.toggle-outliner', 'view.toggle-script-panel', 'view.toggle-inspector'])
  })

  test('single mechanism pages hide and disable a nonexistent object list', () => {
    const actions = handlers()
    expect(
      editorPanelToolbarCommandIds({
        outlinerAvailable: false,
        scriptPanelAvailable: false,
        inspectorAvailable: true,
      }),
    ).toEqual(['view.toggle-inspector'])
    const command = createEditorLayoutCommands(actions, {
      outlinerAvailable: false,
      outlinerVisible: false,
      scriptPanelAvailable: false,
      scriptPanelVisible: false,
      inspectorAvailable: true,
      inspectorVisible: true,
    }).find((candidate) => candidate.id === 'view.toggle-outliner')
    expect(command).toMatchObject({
      enabled: false,
      pressed: false,
      disabledReason: '当前页面没有左侧对象列表',
    })
    expect(
      executeEditorLayoutShortcut(
        { key: 'l', metaKey: true, ctrlKey: false, altKey: true },
        actions,
        {
          outlinerAvailable: false,
          scriptPanelAvailable: false,
          inspectorAvailable: true,
        },
      ),
    ).toBe(false)
    expect(actions.toggleOutliner).not.toHaveBeenCalled()
  })

  test('menu and toolbar projections keep the exact same handlers used by shortcuts', () => {
    const actions = handlers()
    const commands = createEditorLayoutCommands(actions, {
      outlinerVisible: true,
      scriptPanelAvailable: true,
      scriptPanelVisible: false,
      inspectorAvailable: true,
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

    expect(
      executeEditorLayoutShortcut(
        { key: 'b', metaKey: true, ctrlKey: false, altKey: true },
        actions,
      ),
    ).toBe(true)
    expect(actions.toggleScriptPanel).toHaveBeenCalledOnce()
  })

  test('does not consume unrelated or incomplete shortcuts', () => {
    const actions = handlers()
    expect(
      executeEditorLayoutShortcut(
        { key: 'b', metaKey: false, ctrlKey: false, altKey: true },
        actions,
      ),
    ).toBe(false)
    expect(
      executeEditorLayoutShortcut(
        { key: 'x', metaKey: true, ctrlKey: false, altKey: true },
        actions,
      ),
    ).toBe(false)
    expect(actions.toggleScriptPanel).not.toHaveBeenCalled()
  })

  test('disables the contextual script panel command outside scene workspace', () => {
    const actions = handlers()
    const command = createEditorLayoutCommands(actions, {
      outlinerVisible: true,
      scriptPanelAvailable: false,
      scriptPanelVisible: false,
      inspectorAvailable: true,
      inspectorVisible: true,
    }).find((candidate) => candidate.id === 'view.toggle-script-panel')
    expect(command).toMatchObject({
      enabled: false,
      disabledReason: '当前页面没有底部脚本面板',
      pressed: false,
    })
  })

  test('disables the inspector command on pages without object-specific properties', () => {
    const actions = handlers()
    const command = createEditorLayoutCommands(actions, {
      outlinerVisible: true,
      scriptPanelAvailable: false,
      scriptPanelVisible: false,
      inspectorAvailable: false,
      inspectorVisible: false,
    }).find((candidate) => candidate.id === 'view.toggle-inspector')
    expect(command).toMatchObject({
      enabled: false,
      disabledReason: '当前页面没有右侧属性面板',
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
