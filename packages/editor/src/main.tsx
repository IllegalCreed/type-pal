/**
 * @type-pal/editor 入口(B1.1)。
 *
 * 载 demo 工程 → toEditorState → EditSession → 渲染编辑器外壳(App)。
 * project(LoadedProject)透传给 App:assetBase/entryScene 是运行期派生物,不进 EditorState,
 * 画布渲染要用(见 project-io.ts 的说明)。
 */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { loadProject } from '@type-pal/reforge'
import type { LoadedProject } from '@type-pal/reforge'
import { EditSession } from './core/edit-session.js'
import { toEditorState } from './core/project-io.js'
import { App } from './ui/App.js'
import './ui/editor.css'

const PROJECT_ID = import.meta.env.VITE_PROJECT_ID ?? 'demo'

type Boot = { session: EditSession; project: LoadedProject } | { error: string } | null

function Root() {
  const [boot, setBoot] = useState<Boot>(null)
  useEffect(() => {
    let alive = true
    loadProject(PROJECT_ID)
      .then((project) => {
        if (!alive) return
        setBoot({ session: new EditSession(toEditorState(project)), project })
      })
      .catch((e: unknown) => {
        if (alive) setBoot({ error: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      alive = false
    }
  }, [])

  if (!boot) return <div className="boot">载入 demo 工程…</div>
  if ('error' in boot) return <div className="boot"><div className="err">载入失败: {boot.error}</div></div>
  return <App session={boot.session} project={boot.project} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
