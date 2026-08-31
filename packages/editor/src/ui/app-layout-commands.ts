import type { EditorAppCommand } from './app-command-registry.js'

export interface EditorLayoutCommandHandlers {
  toggleOutliner: () => void
  toggleScriptPanel: () => void
  toggleInspector: () => void
  resetLayout: () => void
}

export interface EditorLayoutCommandState {
  outlinerAvailable?: boolean
  outlinerVisible: boolean
  scriptPanelAvailable: boolean
  scriptPanelVisible: boolean
  inspectorAvailable: boolean
  inspectorVisible: boolean
}

export interface SceneScriptPanelState {
  open: boolean
  src: string | null
  internalScriptId: string | null
  commandPath: string | null
  focusRevision: number
}

export function editorPanelToolbarCommandIds(
  state: Pick<
    EditorLayoutCommandState,
    'outlinerAvailable' | 'scriptPanelAvailable' | 'inspectorAvailable'
  >,
): readonly string[] {
  return [
    ...(state.outlinerAvailable === false ? [] : ['view.toggle-outliner']),
    ...(state.scriptPanelAvailable ? ['view.toggle-script-panel'] : []),
    ...(state.inspectorAvailable ? ['view.toggle-inspector'] : []),
  ]
}

/** 所有纯开关入口共享该状态变换，避免菜单/快捷键残留陈旧的内部命令焦点。 */
export function toggleSceneScriptPanelState(state: SceneScriptPanelState): SceneScriptPanelState {
  return {
    open: !state.open,
    src: state.src,
    internalScriptId: null,
    commandPath: null,
    focusRevision: state.focusRevision,
  }
}

export function closeSceneScriptPanelState(state: SceneScriptPanelState): SceneScriptPanelState {
  return {
    open: false,
    src: state.src,
    internalScriptId: null,
    commandPath: null,
    focusRevision: state.focusRevision,
  }
}

export function createEditorLayoutCommands(
  handlers: EditorLayoutCommandHandlers,
  state: EditorLayoutCommandState,
): EditorAppCommand[] {
  return [
    {
      id: 'view.toggle-outliner',
      label: '对象列表',
      icon: 'panel-left',
      shortcut: '⌘⌥L',
      enabled: state.outlinerAvailable !== false,
      disabledReason: state.outlinerAvailable === false ? '当前页面没有左侧对象列表' : undefined,
      pressed: state.outlinerAvailable !== false && state.outlinerVisible,
      scope: 'global',
      defaultPlacement: 'fixed',
      execute: handlers.toggleOutliner,
    },
    {
      id: 'view.toggle-script-panel',
      label: '脚本面板',
      icon: 'panel-bottom',
      shortcut: '⌘⌥B',
      enabled: state.scriptPanelAvailable,
      disabledReason: state.scriptPanelAvailable ? undefined : '当前页面没有底部脚本面板',
      pressed: state.scriptPanelAvailable && state.scriptPanelVisible,
      scope: 'global',
      defaultPlacement: 'fixed',
      execute: handlers.toggleScriptPanel,
    },
    {
      id: 'view.toggle-inspector',
      label: 'Inspector',
      icon: 'panel-right',
      shortcut: '⌘⌥R',
      enabled: state.inspectorAvailable,
      disabledReason: state.inspectorAvailable ? undefined : '当前页面没有右侧属性面板',
      pressed: state.inspectorAvailable && state.inspectorVisible,
      scope: 'global',
      defaultPlacement: 'fixed',
      execute: handlers.toggleInspector,
    },
    {
      id: 'view.reset-layout',
      label: '重置布局',
      icon: 'redo',
      enabled: true,
      scope: 'global',
      execute: handlers.resetLayout,
    },
  ]
}

export function executeEditorLayoutShortcut(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey'>,
  handlers: EditorLayoutCommandHandlers,
  availability: Pick<
    EditorLayoutCommandState,
    'outlinerAvailable' | 'scriptPanelAvailable' | 'inspectorAvailable'
  > = {
    outlinerAvailable: true,
    scriptPanelAvailable: true,
    inspectorAvailable: true,
  },
): boolean {
  if (!(event.metaKey || event.ctrlKey) || !event.altKey) return false
  switch (event.key.toLocaleLowerCase()) {
    case 'l':
      if (availability.outlinerAvailable === false) return false
      handlers.toggleOutliner()
      return true
    case 'b':
      if (!availability.scriptPanelAvailable) return false
      handlers.toggleScriptPanel()
      return true
    case 'r':
      if (!availability.inspectorAvailable) return false
      handlers.toggleInspector()
      return true
    default:
      return false
  }
}
