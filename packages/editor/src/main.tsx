/**
 * @type-pal/editor 入口。
 * dev(VITE_PROJECT_ID 注入)→ 自动载入该工程(开发便利);`?picker` 强制启动屏(测试用)。
 * 生产(无 env)→ ProjectPicker 启动屏:新建(克隆/空白)/ 打开本地 / 最近工程(P4)。
 */
import { emptyWorldScriptStateV5 } from '@type-pal/content'
import type { LoadedProject, LoadedProjectV5 } from '@type-pal/reforge'
import {
  httpSource,
  legacyProjectShellFromV5,
  legacySceneFromV5,
  loadAllScenes,
  loadAllScenesV5,
  loadAllScriptChunks,
  loadProject,
  loadProjectMapById,
  loadProjectV5,
  loadStampTemplates,
  loadStampTemplatesV5,
} from '@type-pal/reforge'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EditSession } from './core/edit-session.js'
import type { Opened } from './core/open-actions.js'
import { toEditorState } from './core/project-io.js'
import { type EditorStateV5, toEditorStateV5 } from './core/project-io-v5.js'
import { ScriptV5EditSession } from './core/script-v5-editor.js'
import { App } from './ui/App.js'
import { ProjectPicker } from './ui/ProjectPicker.js'
import './ui/editor.css'

const PROJECT_ID = import.meta.env.VITE_PROJECT_ID as string | undefined
const FORCE_PICKER = new URLSearchParams(window.location.search).has('picker')
const DEV_AUTO = !!PROJECT_ID && !FORCE_PICKER

interface Booted {
  session: EditSession
  project: LoadedProject
  scriptV5?: {
    baseState: EditorStateV5
    session: ScriptV5EditSession
  }
  dir?: FileSystemDirectoryHandle
}
/** 四态摊开:loading 只属于 dev 首次自动载入;picker 在任何模式下都是真启动屏。
 *  ⚠ 曾用 null 一态两义(dev=载入占位/生产=启动屏)→ dev 下「新建工程」回 null 永远卡
 *  「载入工程…」(自动载入 effect 只跑一次,没人再载入;用户 FSA 烟测第一步撞死)。 */
type Boot = Booted | { error: string } | 'loading' | 'picker'

function Root() {
  const [boot, setBoot] = useState<Boot>(DEV_AUTO ? 'loading' : 'picker')

  useEffect(() => {
    if (!DEV_AUTO || !PROJECT_ID) return
    let alive = true
    const loadDevProject = async (): Promise<Booted> => {
      const source = httpSource(`projects/${PROJECT_ID}`)
      const manifest = await source.readJson<{ contentVersion?: number }>('manifest.json')
      if (manifest.contentVersion === 5) {
        const projectV5: LoadedProjectV5 = await loadProjectV5(PROJECT_ID)
        const [scenesV5, stamps] = await Promise.all([
          loadAllScenesV5(projectV5),
          loadStampTemplatesV5(projectV5),
        ])
        const baseState = toEditorStateV5(projectV5, scenesV5, {}, stamps)
        const world = emptyWorldScriptStateV5()
        const project = legacyProjectShellFromV5(projectV5, world)
        const scenes = scenesV5.map((scene) => legacySceneFromV5(scene, world))
        return {
          session: new EditSession(toEditorState(project, scenes, {}, {}, stamps), {
            loadMap: (mapId) => loadProjectMapById(project, mapId),
          }),
          project,
          scriptV5: {
            baseState,
            session: new ScriptV5EditSession(baseState),
          },
        }
      }
      const project = await loadProject(PROJECT_ID)
      const [scenes, scriptChunks, stamps] = await Promise.all([
        loadAllScenes(project),
        loadAllScriptChunks(project),
        loadStampTemplates(project),
      ])
      return {
        session: new EditSession(toEditorState(project, scenes, {}, scriptChunks, stamps), {
          loadMap: (mapId) => loadProjectMapById(project, mapId),
        }),
        project,
      }
    }
    loadDevProject()
      .then((booted) => {
        if (!alive) return
        setBoot(booted)
      })
      .catch((e: unknown) => {
        if (alive) setBoot({ error: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      alive = false
    }
  }, [])

  const onOpened = (o: Opened): void => {
    if (o.kind === 'v5') {
      const baseState = toEditorStateV5(o.canonicalV5.project, o.canonicalV5.scenes, {}, o.stamps)
      const project = o.project
      const scenes = o.scenes
      setBoot({
        session: new EditSession(toEditorState(project, scenes, {}, {}, o.stamps), {
          loadMap: (mapId) => loadProjectMapById(project, mapId),
        }),
        project,
        scriptV5: {
          baseState,
          session: new ScriptV5EditSession(baseState),
        },
        dir: o.dir,
      })
      return
    }
    const project = o.project
    const { scenes, scriptChunks, stamps } = o
    setBoot({
      session: new EditSession(toEditorState(project, scenes, {}, scriptChunks, stamps), {
        loadMap: (mapId) => loadProjectMapById(project, mapId),
      }),
      project,
      dir: o.dir,
    })
  }

  if (boot === 'loading') return <div className="boot">载入工程…</div>
  if (boot === 'picker') return <ProjectPicker onOpened={onOpened} />
  if ('error' in boot)
    return (
      <div className="boot">
        <div className="err">载入失败: {boot.error}</div>
        {/* 错误也不能是死胡同:回启动屏换条路(打开/克隆/新建) */}
        <button type="button" onClick={() => setBoot('picker')}>
          回启动屏
        </button>
      </div>
    )
  return (
    <App
      key={boot.project.manifest.id}
      session={boot.session}
      project={boot.project}
      scriptV5={boot.scriptV5}
      initialDir={boot.dir}
      onOpened={onOpened}
      onBackToPicker={() => setBoot('picker')}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
