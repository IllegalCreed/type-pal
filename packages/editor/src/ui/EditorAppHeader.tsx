import type { MouseEvent } from 'react'
import { DsMenuBar, DsToolbar, type DsMenuDefinition } from './design-system/index.js'
import {
  type EditorAppCommandRegistry,
  requireEditorAppCommand,
  toolbarCommandView,
} from './app-command-registry.js'

export function EditorAppHeader(props: {
  projectName: string
  menus: readonly DsMenuDefinition[]
  commands: EditorAppCommandRegistry
  toolbarCommandGroups: readonly (readonly string[])[]
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}) {
  const toolbarCommandGroups = props.toolbarCommandGroups.map((group) =>
    group.map((id) => {
      const command = toolbarCommandView(requireEditorAppCommand(props.commands, id))
      return {
        ...command,
        emphasis: id === 'file.save' ? ('primary' as const) : undefined,
        showLabel: id === 'file.save',
      }
    }),
  )

  return (
    <header className="editor-app-header">
      <div className="editor-header-context" aria-label={`当前工程 ${props.projectName}`}>
        <img
          className="editor-header-context__logo"
          src="/type-pal-editor-mark.svg"
          alt=""
          aria-hidden="true"
        />
        <span className="editor-header-context__project" title={props.projectName}>
          {props.projectName}
        </span>
      </div>
      <DsMenuBar
        label="编辑器主菜单"
        menus={props.menus}
        onNavigate={(event, item) => {
          if (item.href) props.onNavigate(event, item.href)
        }}
      />
      <DsToolbar label="常用操作" groups={toolbarCommandGroups} size="compact" />
    </header>
  )
}
