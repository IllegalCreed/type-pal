/**
 * @type-pal/editor 入口。
 * dev(VITE_PROJECT_ID 注入)→ 自动载入该工程(开发便利);`?picker` 强制启动屏(测试用)。
 * 生产(无 env)→ ProjectPicker 启动屏:新建(克隆/空白)/ 打开本地 / 最近工程(P4)。
 */
import type { SceneDefV14, SceneDefV5 } from '@type-pal/content'
import type { LoadedProjectV15 } from '@type-pal/reforge'
import {
  httpSource,
  loadAllAuthorScenesV15,
  loadProjectMapById,
  loadProjectV15From,
  loadStampTemplatesV15,
} from '@type-pal/reforge'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EditSession } from './core/edit-session.js'
import type { Opened } from './core/open-actions.js'
import { toEditorState } from './core/project-io.js'
import { type ScriptEditorStateV5, ScriptV5EditSession } from './core/script-v5-editor.js'
import { App } from './ui/App.js'
import { ProjectPicker } from './ui/ProjectPicker.js'
import './ui/design-system/index.css'
import './ui/editor.css'
import './ui/design-system/form-scope.css'

const PROJECT_ID = import.meta.env.VITE_PROJECT_ID as string | undefined
const FORCE_PICKER = new URLSearchParams(window.location.search).has('picker')
const DEV_AUTO = !!PROJECT_ID && !FORCE_PICKER

interface Booted {
  session: EditSession
  project: LoadedProjectV15
  scriptV5?: {
    session: ScriptV5EditSession
  }
  dir?: FileSystemDirectoryHandle
}

function currentCanonicalScriptState(
  project: LoadedProjectV15,
  scenes: SceneDefV14[],
): ScriptEditorStateV5 {
  return {
    contentVersion: project.manifest.contentVersion,
    scenes: structuredClone(scenes) as unknown as SceneDefV5[],
    items: structuredClone(project.authorContent.items) as unknown as ScriptEditorStateV5['items'],
    sharedScripts: structuredClone(
      project.authorContent.sharedScripts,
    ) as unknown as ScriptEditorStateV5['sharedScripts'],
    migrationSidecars: Object.values(project.migrationRegistry).map((blob) =>
      structuredClone(blob.sidecar),
    ),
  }
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
      const project = await loadProjectV15From(source)
      const [scenes, stamps] = await Promise.all([
        loadAllAuthorScenesV15(project),
        loadStampTemplatesV15(project),
      ])
      const canonical = currentCanonicalScriptState(project, scenes)
      return {
        session: new EditSession(toEditorState(project, scenes, {}, {}, stamps), {
          loadMap: (mapId) => loadProjectMapById(project, mapId),
        }),
        project,
        scriptV5: {
          session: new ScriptV5EditSession(canonical),
        },
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
    const project = o.project
    const canonical = currentCanonicalScriptState(project, o.scenes)
    setBoot({
      session: new EditSession(toEditorState(project, o.scenes, {}, {}, o.stamps), {
        loadMap: (mapId) => loadProjectMapById(project, mapId),
      }),
      project,
      scriptV5: {
        session: new ScriptV5EditSession(canonical),
      },
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
