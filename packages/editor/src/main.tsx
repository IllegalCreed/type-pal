/**
 * @type-pal/editor 入口。
 * dev(VITE_PROJECT_ID 注入)→ 自动载入该工程(开发便利);`?picker` 强制启动屏(测试用)。
 * 生产(无 env)→ ProjectPicker 启动屏:新建(克隆/空白)/ 打开本地 / 最近工程(P4)。
 */
import type { MusicDef } from '@type-pal/content'
import { loadAllScenes, loadProject } from '@type-pal/reforge'
import type { LoadedProject } from '@type-pal/reforge'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EditSession } from './core/edit-session.js'
import type { Opened } from './core/open-actions.js'
import { toEditorState } from './core/project-io.js'
import { App } from './ui/App.js'
import { ProjectPicker } from './ui/ProjectPicker.js'
import './ui/editor.css'

const PROJECT_ID = import.meta.env.VITE_PROJECT_ID as string | undefined
const FORCE_PICKER = new URLSearchParams(window.location.search).has('picker')
const DEV_AUTO = !!PROJECT_ID && !FORCE_PICKER

interface Booted {
  session: EditSession
  project: LoadedProject
  dir?: FileSystemDirectoryHandle
}
type Boot = Booted | { error: string } | null

function Root() {
  const [boot, setBoot] = useState<Boot>(null)

  useEffect(() => {
    if (!DEV_AUTO || !PROJECT_ID) return
    let alive = true
    loadProject(PROJECT_ID)
      .then(async (project) => {
        const scenes = await loadAllScenes(project)
        const musicRel = project.manifest.content['music']
        const music: MusicDef[] = musicRel
          ? await fetch(`projects/${PROJECT_ID}/${musicRel}`)
              .then((r) => (r.ok ? (r.json() as Promise<MusicDef[]>) : []))
              .catch(() => [])
          : []
        if (!alive) return
        setBoot({ session: new EditSession(toEditorState(project, scenes, music)), project })
      })
      .catch((e: unknown) => {
        if (alive) setBoot({ error: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      alive = false
    }
  }, [])

  const onOpened = (o: Opened): void => {
    setBoot({
      session: new EditSession(toEditorState(o.project, o.scenes, o.music)),
      project: o.project,
      dir: o.dir,
    })
  }

  if (boot && 'error' in boot)
    return (
      <div className="boot">
        <div className="err">载入失败: {boot.error}</div>
      </div>
    )
  if (boot)
    return (
      <App
        session={boot.session}
        project={boot.project}
        initialDir={boot.dir}
        onOpened={onOpened}
        onBackToPicker={() => setBoot(null)}
      />
    )
  if (DEV_AUTO) return <div className="boot">载入工程…</div>
  return <ProjectPicker onOpened={onOpened} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
