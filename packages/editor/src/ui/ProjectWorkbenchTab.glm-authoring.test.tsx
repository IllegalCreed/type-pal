// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-AUTHORING-PANELS-1 P 组：ProjectWorkbenchTab 作者面板残差合同。
 *
 * 去重（旧 fullName → 已证 → 本文件只补）：
 * - ProjectWorkbenchTab.test.tsx：`按严重度、稳定 code 和资源类型聚合`/`问题页左栏按类型聚合…`/
 *   `开局状态在聚合弹窗内编辑…`/`移出队员在一条命令内同时清理…`/`未知当前状态必须显式清理…`/
 *   `当前 HP/MP 保持继承、零值和单字段稀疏覆盖…`/入口增删与深链已证 → 不重复。
 * - ProjectWorkbenchTab.kimi-workflows.test.tsx：绑定/标签/场景/视频/金钱/种子/库存/资源/诊断三态
 *   已证；其「入口 id 修复分支合法 fixture 不可达」裁定沿用，不伪造非法状态。
 * - ProjectWorkbenchTab.glm-m.test.tsx：毒抗勾选/回显/键级 poisonResistance undefined 已证 →
 *   本文件补 seedConditions 整键删除与零改动保存零命令。
 * 本文件合同：条件弹窗空值整键删除（P1）、零改动保存零命令（P2）、entrypoint focus 活跃
 * 三分支（P3）、advanced 问题页 focus 入向同步（P4）。全部走合法 loader 项目 + 真命令播种 +
 * 真实组件 DOM；断言 session 序列化值、命令边界或业务 DOM，不只断言渲染存在。
 */
import type { PoisonDef } from '@type-pal/content'
import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { SetStartupEntriesCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  assertProjectSaveValid,
  collectProjectIssues,
  type ProjectIssue,
} from '../core/project-diagnostics.js'
import { toEditorState } from '../core/project-io.js'
import { buildBlankProject } from '../core/seed.js'
import {
  buildLegalBundle,
  dispatchAll,
  mp4Bytes,
  seededAssetCommand,
  wavBytes,
} from './__tests__/glm-authoring-kit.js'
import {
  buttonByLabel,
  clickCheckboxByLabel,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import {
  groupProjectIssues,
  type ProjectWorkbenchPage,
  ProjectWorkbenchTab,
} from './ProjectWorkbenchTab.js'

const POISONS: PoisonDef[] = [{ id: 1, name: '赤蝎粉', color: 0, curability: 'common' }]

interface Bundle {
  session: EditSession
  reader: EditorAssetReader
}

/**
 * 带合法毒表的 blank 项目装载器（K06 fixture 同款纪律）：blank seed 文件集 +
 * content/poisons.json（manifest.content.poisons 指向）→ 真实 loader → toEditorState →
 * assertProjectSaveValid 自证。保存门的毒表引用校验来自 state.poisons，因此条件种子
 * 合同必须携带真实毒表；不手搓 EditorState。
 */
async function legalPoisonBundle(name: string): Promise<Bundle> {
  const files = await buildBlankProject(name)
  const manifest = files['manifest.json'] as { content: Record<string, string> }
  manifest.content.poisons = 'content/poisons.json'
  files['content/poisons.json'] = structuredClone(POISONS)
  const disk = memoryAuthorDirectory(files)
  const source: FileSource = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  const session = new EditSession(state)
  return {
    session,
    reader: createEditorAssetReader(source, () => session.getState()),
  }
}

/** 无毒表需求的用例：直接用共享 kit 的合法 blank 项目。 */
async function legalBundle(name: string): Promise<Bundle> {
  return buildLegalBundle(name)
}

/** 父级直接持有 focus（导航深链场景）：focus 变化不依赖 onObjectFocus 回喂。 */
function WorkbenchHarness(props: {
  bundle: Bundle
  page: ProjectWorkbenchPage
  focus?: string
  issues?: readonly ProjectIssue[]
  onObjectFocus?: (id: string | undefined) => void
}) {
  const session = props.bundle.session
  useSyncExternalStore(
    (callback) => session.subscribe(callback),
    () => session.getVersion(),
  )
  const current = session.getState()
  return (
    <ProjectWorkbenchTab
      page={props.page}
      manifest={current.manifest}
      scenes={current.scenes}
      sceneIndex={current.sceneIndex}
      actors={current.actors}
      items={current.items}
      poisons={current.poisons ?? []}
      locale={current.locale}
      assetCatalog={current.assetCatalog}
      session={session}
      issues={props.issues ?? collectProjectIssues(current)}
      diagnosticsStatus="current"
      assetReader={props.bundle.reader}
      focusObjectId={props.focus}
      onObjectFocus={props.onObjectFocus}
    />
  )
}

/** 复选框：按 label 部分文本定位（定时状态 label 携带长描述，无法精确整串匹配）。 */
async function clickCheckboxByPartialLabel(host: ParentNode, fragment: string): Promise<void> {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find((candidate) =>
    candidate.textContent?.includes(fragment),
  )
  expect(label, `checkbox label 含「${fragment}」`).toBeDefined()
  const control = label!.htmlFor
    ? (document.getElementById(label!.htmlFor) as HTMLInputElement | null)
    : label!.querySelector<HTMLInputElement>('input')
  expect(control?.type, `checkbox control ${fragment}`).toBe('checkbox')
  await act(async () => {
    control!.click()
  })
}

async function openConditionDialog(host: ParentNode): Promise<void> {
  const edit = host.querySelector<HTMLButtonElement>('[aria-label="编辑主角开局当前状态"]')
  expect(edit, '编辑开局当前状态按钮').not.toBeNull()
  await act(async () => {
    edit!.click()
  })
}

/** 把默认入口的 startWorld 换成带合法 seedConditions 的版本（真命令播种）。 */
async function seedConditionStartWorld(bundle: Bundle, seedConditions: unknown): Promise<void> {
  const entry = structuredClone(bundle.session.getState().manifest.entryPoints[0]!)
  await act(async () => {
    bundle.session.dispatch(
      new SetStartupEntriesCommand({
        defaultEntryId: 'new-game',
        entryPoints: [
          {
            ...entry,
            startWorld: { ...entry.startWorld, seedConditions: seedConditions as never },
          },
        ],
      }),
    )
  })
}

async function addSecondEntry(bundle: Bundle): Promise<void> {
  const entry = structuredClone(bundle.session.getState().manifest.entryPoints[0]!)
  await act(async () => {
    bundle.session.dispatch(
      new SetStartupEntriesCommand({
        defaultEntryId: 'new-game',
        entryPoints: [
          entry,
          {
            id: 'entry-2',
            label: '序章线',
            scene: entry.scene,
            startWorld: structuredClone(entry.startWorld),
          },
        ],
      }),
    )
  })
}

function heroTitle(): string | null {
  return document.querySelector('.ds-object-hero__title')?.textContent ?? null
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  installBrowserHardwarePorts()
  useActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('P 组 ProjectWorkbenchTab 作者面板残差', () => {
  test('P1 条件弹窗全部取消勾选保存：seedConditions 整键删除、单命令、undo 精确还原', async () => {
    const bundle = await legalPoisonBundle('glm-authoring-pwt-condition-clear')
    const originalSeed = {
      poisonIds: [1],
      statuses: [{ status: 'confused', turns: 5 }],
      poisonResistance: 2,
    }
    await seedConditionStartWorld(bundle, { hero: originalSeed })
    const dispatch = vi.spyOn(bundle.session, 'dispatch')
    const historyAtMount = bundle.session.getHistoryVersion()

    await act(async () => {
      root.render(<WorkbenchHarness bundle={bundle} page="entrypoint" />)
      await Promise.resolve()
    })
    await openConditionDialog(host)
    await clickCheckboxByLabel(host, '赤蝎粉（1）')
    await clickCheckboxByPartialLabel(host, '混乱 ·')
    await clickCheckboxByLabel(host, '带入下一场战斗的临时毒抗')
    await act(async () => {
      buttonByLabel(host, '保存当前状态').click()
    })

    // 整键删除：不是留下空对象，而是 startWorld.seedConditions === undefined。
    expect(
      bundle.session.getState().manifest.entryPoints[0]!.startWorld.seedConditions,
    ).toBeUndefined()
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(bundle.session.getHistoryVersion()).toBe(historyAtMount + 1)
    // 摘要行回到无临时状态。
    expect(host.textContent).toContain('无临时状态')
    await act(async () => {
      expect(bundle.session.undo()).toBe(true)
    })
    expect(bundle.session.getState().manifest.entryPoints[0]!.startWorld.seedConditions).toEqual({
      hero: originalSeed,
    })
    assertProjectSaveValid(bundle.session.getState())
  })

  test('P2 零改动打开条件弹窗直接保存：零命令（规范化对合法输入是恒等，无修复可写）', async () => {
    const bundle = await legalPoisonBundle('glm-authoring-pwt-condition-noop')
    await seedConditionStartWorld(bundle, {
      hero: { poisonIds: [1], statuses: [{ status: 'confused', turns: 5 }], poisonResistance: 2 },
    })
    const dispatch = vi.spyOn(bundle.session, 'dispatch')

    await act(async () => {
      root.render(<WorkbenchHarness bundle={bundle} page="entrypoint" />)
      await Promise.resolve()
    })
    await openConditionDialog(host)
    expect(host.querySelector('.actor-condition-dialog')).not.toBeNull()
    await act(async () => {
      buttonByLabel(host, '保存当前状态').click()
    })
    expect(dispatch).not.toHaveBeenCalled()
    expect(bundle.session.getHistoryVersion()).toBe(1) // 仅播种命令一条
    expect(host.querySelector('.actor-condition-dialog')).toBeNull()
    expect(bundle.session.getState().manifest.entryPoints[0]!.startWorld.seedConditions).toEqual({
      hero: { poisonIds: [1], statuses: [{ status: 'confused', turns: 5 }], poisonResistance: 2 },
    })
  })

  test('P3 entrypoint focus 活跃同步：跟随存在入口、清空回落直接启动入口、陈旧 focus 保持当前选择', async () => {
    const bundle = await legalBundle('glm-authoring-pwt-entry-focus')
    await addSecondEntry(bundle)
    const dispatch = vi.spyOn(bundle.session, 'dispatch')
    const renderWith = async (focus: string | undefined): Promise<void> => {
      await act(async () => {
        root.render(<WorkbenchHarness bundle={bundle} page="entrypoint" focus={focus} />)
        await Promise.resolve()
      })
    }

    // 挂载无 focus：选中直接启动入口。
    await renderWith(undefined)
    expect(heroTitle()).toBe('新的故事')
    // focus 进入存在的非默认入口：选择跟随（导航深链）。
    await renderWith('entry-2')
    expect(heroTitle()).toBe('序章线')
    // focus 清空：回落直接启动入口，而不是维持上一个深链目标。
    await renderWith(undefined)
    expect(heroTitle()).toBe('新的故事')
    // focus 指向不存在 id：保持当前选择（不重置、不崩溃、不伪造选择）。
    await renderWith('missing-entry')
    expect(heroTitle()).toBe('新的故事')

    expect(dispatch).not.toHaveBeenCalled()
    expect(bundle.session.getHistoryVersion()).toBe(1) // 仅 addSecondEntry 播种
    const selected = host.querySelector('.project-entry-list .ds-catalog-row[data-selected="true"]')
    expect(selected?.querySelector('.ds-catalog-row__meta')?.textContent).toBe('new-game')
  })

  test('P4 advanced 问题页 focus 入向同步：选中目标分组、非法 focus 保持当前分组', async () => {
    const bundle = await legalBundle('glm-authoring-pwt-issue-focus')
    // 真命令制造两个可区分的未引用资源分组（音效/视频；音乐资源会触发音频角色全绑定要求，不采用）。
    const sound = await seededAssetCommand({
      id: 'sound.authored.issue',
      kind: 'sound',
      extension: 'wav',
      mediaType: 'audio/wav',
      directory: 'sounds',
      label: '未引用音',
      ref: 'unused.wav',
      bytes: wavBytes(2),
    })
    const video = await seededAssetCommand({
      id: 'video.authored.issue',
      kind: 'video',
      extension: 'mp4',
      mediaType: 'video/mp4',
      directory: 'video',
      label: '未引用片',
      ref: 'unused.mp4',
      bytes: mp4Bytes(32),
    })
    await dispatchAll(bundle.session, [sound.command, video.command])
    const issues = collectProjectIssues(bundle.session.getState())
    const groups = groupProjectIssues(issues)
    expect(groups.length, '至少两个分组').toBeGreaterThanOrEqual(2)
    const fallbackGroup = groups[0]!
    const otherGroup = groups.find((group) => group.id !== fallbackGroup.id)!
    const workspaceTitle = (group: (typeof groups)[number]): string =>
      group.resourceKind ? `${group.familyTitle} · ${group.title}` : group.title
    const dispatch = vi.spyOn(bundle.session, 'dispatch')

    const detailTitle = (): string | null =>
      document.querySelector('.project-center h1')?.textContent ?? null
    const renderWith = async (focus: string | undefined): Promise<void> => {
      await act(async () => {
        root.render(
          <WorkbenchHarness bundle={bundle} page="advanced" focus={focus} issues={issues} />,
        )
        await Promise.resolve()
      })
    }
    // 挂载无 focus：回退首个分组。
    await renderWith(undefined)
    expect(detailTitle()).toBe(workspaceTitle(fallbackGroup))
    // focus 进入另一分组：选中并呈现该分组明细。
    await renderWith(otherGroup.id)
    expect(detailTitle()).toBe(workspaceTitle(otherGroup))
    // 非法 focus：保持当前分组，不回退也不清空。
    await renderWith('diagnostic:warn:bogus:all')
    expect(detailTitle()).toBe(workspaceTitle(otherGroup))

    expect(dispatch).not.toHaveBeenCalled()
    expect(bundle.session.getHistoryVersion()).toBe(2) // 两条资源导入播种
    assertProjectSaveValid(bundle.session.getState())
  })
})
