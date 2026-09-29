/**
 * TEST-GLM-NEW-F-1 F01 专属夹具：真实 App + 内存磁盘的脚本库挂载底座。
 * 只被本卡 F01 测试导入；与既有 App.leave-guard 测试的装配方式同构但不共享其文件。
 * vi.mock 声明必须留在测试文件内（文件局部生效），本文件只提供可复用的装配函数。
 */
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { memoryAuthorDirectory } from '../../../core/__tests__/author-save-fixture.js'
import { battleTrialProjectFiles } from '../../../core/__tests__/battle-trial-project.js'
import { EditSession } from '../../../core/edit-session.js'
import { EditorHistoryCoordinator } from '../../../core/editor-history-coordinator.js'
import { finishOpen, type Opened } from '../../../core/open-actions.js'
import { toEditorState } from '../../../core/project-io.js'
import { ScriptEditSession } from '../../../core/script-editor.js'
import { projectEditorItemShells } from '../../../core/script-editor-projection.js'
import { App } from '../../../ui/App.js'

export interface AppScriptContext {
  opened: Opened
  main: EditSession
  script: ScriptEditSession
  history: EditorHistoryCoordinator
  mount(initialUrl: string): Promise<void>
  unmount(): Promise<void>
  host: HTMLDivElement
}

export async function createAppScriptContext(): Promise<AppScriptContext> {
  const disk = memoryAuthorDirectory(await battleTrialProjectFiles())
  const opened = await finishOpen(disk.dir)
  const main = new EditSession({
    ...toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps),
    items: projectEditorItemShells(opened.project),
  })
  const sharedScripts = structuredClone(opened.project.authorContent.sharedScripts ?? {})
  sharedScripts['leave-script'] = {
    name: '离开测试',
    self: 'none',
    body: [{ kind: 'wait', ms: 17 }],
  }
  const script = new ScriptEditSession({
    scenes: opened.scenes,
    items: opened.project.authorContent.items,
    sharedScripts,
  })
  const history = new EditorHistoryCoordinator(main, script)
  const host = document.createElement('div')
  let root: Root | undefined
  let mounted = false
  return {
    opened,
    main,
    script,
    history,
    host,
    async mount(initialUrl: string) {
      window.history.replaceState({}, '', initialUrl)
      document.body.append(host)
      root = createRoot(host)
      mounted = true
      await act(async () =>
        root!.render(
          <StrictMode>
            <App
              session={main}
              history={history}
              script={{ session: script }}
              project={opened.project}
              workspace={opened.workspace}
              initialDir={disk.dir}
              authorBaseline={opened.authorBaseline}
              onOpened={() => undefined}
              onBackToPicker={() => undefined}
            />
          </StrictMode>,
        ),
      )
    },
    async unmount() {
      if (!mounted || !root) return
      mounted = false
      await act(async () => root!.unmount())
      host.remove()
    },
  }
}
