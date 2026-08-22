/**
 * @type-pal/editor 入口。
 * dev(VITE_PROJECT_ID 注入)→ 自动载入该项目(开发便利);`?picker` 强制启动屏(测试用)，
 * `?ui_samples` 只在内存追加视觉评审数据，不改仓库项目。
 * 生产(无 env)→ ProjectPicker 启动屏:新建(克隆/空白)/ 打开本地 / 最近项目(P4)。
 */
import type { AuthorSceneDef, BaseSceneDef } from '@type-pal/content'
import type { LoadedCurrentProject } from '@type-pal/reforge'
import {
  httpSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadProjectMapById,
  loadStampTemplates,
} from '@type-pal/reforge'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EditSession } from './core/edit-session.js'
import type { Opened } from './core/open-actions.js'
import { toEditorState } from './core/project-io.js'
import { type ScriptEditorState, ScriptEditSession } from './core/script-editor.js'
import { withUiReviewSamples } from './core/ui-review-samples.js'
import {
  assertSamePalDevelopmentProof,
  createLocalWorkspaceContext,
  createPalDevelopmentWorkspaceContext,
  createSandboxWorkspaceContext,
  type WorkspaceContext,
} from './core/workspace-context.js'
import { App } from './ui/App.js'
import { ProjectPicker } from './ui/ProjectPicker.js'
import './ui/design-system/index.css'
import './ui/editor.css'
import './ui/design-system/form-scope.css'

const PROJECT_ID = import.meta.env.VITE_PROJECT_ID as string | undefined
const SEARCH_PARAMS = new URLSearchParams(window.location.search)
const FORCE_PICKER = SEARCH_PARAMS.has('picker')
const UI_REVIEW_SAMPLES = import.meta.env.DEV && SEARCH_PARAMS.has('ui_samples')
const DEV_AUTO = !!PROJECT_ID && !FORCE_PICKER

interface Booted {
  session: EditSession
  project: LoadedCurrentProject
  script: {
    session: ScriptEditSession
  }
  dir?: FileSystemDirectoryHandle
  workspace: WorkspaceContext
}

function currentCanonicalScriptState(
  project: LoadedCurrentProject,
  scenes: AuthorSceneDef[],
  sharedScripts = project.authorContent.sharedScripts,
): ScriptEditorState {
  return {
    scenes: structuredClone(scenes) as unknown as BaseSceneDef[],
    items: structuredClone(project.authorContent.items) as unknown as ScriptEditorState['items'],
    sharedScripts: structuredClone(sharedScripts) as unknown as ScriptEditorState['sharedScripts'],
  }
}
/** 四态摊开:loading 只属于 dev 首次自动载入;picker 在任何模式下都是真启动屏。
 *  ⚠ 曾用 null 一态两义(dev=载入占位/生产=启动屏)→ dev 下「新建项目」回 null 永远卡
 *  「载入项目…」(自动载入 effect 只跑一次,没人再载入;用户 FSA 烟测第一步撞死)。 */
type Boot = Booted | { error: string } | 'loading' | 'picker'

function Root() {
  const [boot, setBoot] = useState<Boot>(DEV_AUTO ? 'loading' : 'picker')

  useEffect(() => {
    if (!DEV_AUTO || !PROJECT_ID) return
    let alive = true
    const loadDevProject = async (): Promise<Booted> => {
      const source = httpSource(`projects/${PROJECT_ID}`)
      const palProofBefore =
        !UI_REVIEW_SAMPLES && PROJECT_ID === 'pal'
          ? await createPalDevelopmentWorkspaceContext(source)
          : undefined
      const project = await loadCurrentProjectFrom(source)
      // Workspace mode is fixed before any ui_samples projection mutates author data. Normal PAL
      // dev freezes a trusted HTTP proof; ui_samples never receives that authority and is sandbox.
      const workspace = UI_REVIEW_SAMPLES
        ? createSandboxWorkspaceContext(project.manifest.id, 'ui-samples')
        : project.manifest.id === 'pal'
          ? await createPalDevelopmentWorkspaceContext(source, project.manifest).then((after) => {
              if (!palProofBefore) throw new Error('PAL 开发基线载入缺少启动前的可信快照证明')
              assertSamePalDevelopmentProof(palProofBefore, after)
              return after
            })
          : createLocalWorkspaceContext(project.manifest.id, 'local-directory')
      const [scenes, stamps] = await Promise.all([
        loadAllAuthorScenes(project),
        loadStampTemplates(project),
      ])
      const reviewData = UI_REVIEW_SAMPLES
        ? withUiReviewSamples({
            scenes,
            sharedScripts: project.authorContent.sharedScripts,
            stamps,
            worldVariables: project.worldVariables,
            tilesetId: project.tilesets[0]?.id,
          })
        : {
            scenes,
            sharedScripts: project.authorContent.sharedScripts,
            stamps,
            worldVariables: project.worldVariables,
          }
      const reviewProject = UI_REVIEW_SAMPLES
        ? {
            ...project,
            authorContent: { ...project.authorContent, sharedScripts: reviewData.sharedScripts },
            worldVariables: reviewData.worldVariables,
          }
        : project
      const canonical = currentCanonicalScriptState(
        reviewProject,
        reviewData.scenes,
        reviewData.sharedScripts,
      )
      return {
        session: new EditSession(
          toEditorState(reviewProject, reviewData.scenes, {}, {}, reviewData.stamps),
          {
            loadMap: (mapId) => loadProjectMapById(reviewProject, mapId),
          },
        ),
        project: reviewProject,
        script: {
          session: new ScriptEditSession(canonical),
        },
        workspace,
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
      script: {
        session: new ScriptEditSession(canonical),
      },
      dir: o.dir,
      workspace: o.workspace,
    })
  }

  if (boot === 'loading') return <div className="boot">载入项目…</div>
  if (boot === 'picker')
    return <ProjectPicker onOpened={onOpened} forceSandbox={UI_REVIEW_SAMPLES} />
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
      key={boot.workspace.workspaceId}
      session={boot.session}
      project={boot.project}
      script={boot.script}
      initialDir={boot.dir}
      workspace={boot.workspace}
      forceSandbox={UI_REVIEW_SAMPLES}
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
