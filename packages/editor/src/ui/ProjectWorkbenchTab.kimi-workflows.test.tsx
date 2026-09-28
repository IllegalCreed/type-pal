// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K08：ProjectWorkbenchTab 项目页真实业务工作流补测。
 * 目标源 ProjectWorkbenchTab.tsx（锚 955/1066/1147/1889/2523）与调用域 ConnectedEditorPages.tsx:121。
 *
 * 旧断言去重（只登记缺口，不复制）：
 * - ProjectWorkbenchTab.test.tsx 全程手工 projectState()（as unknown as EditorState）+
 *   assetReader={} as never，从无 loadLegalUiProject / assertProjectSaveValid 自证：
 *   - '新增入口深拷当前入口，直接启动项与最后一项删除受不变式保护'：已证显式选中非默认入口时
 *     addEntry 深拷与删除 disabled。缺口：无深链默认选中直接启动入口时的深拷来源、深拷数据隔离、
 *     删除后回选直接启动入口与 onObjectFocus 回调（旧 projectTab 从未传 onObjectFocus）。
 *   - '[add-picker:project/startup-party]'、'开局状态在聚合弹窗内编辑…'、'移出队员在一条命令内同时清理…'、
 *     '当前 HP/MP 保持继承、零值和单字段稀疏覆盖…'：已证队伍添加/重排/移出/状态弹窗/稀疏覆盖的
 *     单命令边界与 undo（手工 state）。缺口：合法项目（loader→toEditorState）下同路径过保存门；
 *     金钱字段（start-world-money）从未编辑；无毒种项目的条件弹窗真实空态。
 *   - '[add-picker:project/startup-inventory]'、'[reorder-family:startup-inventory]'：已证库存添加
 *     count=1/数量/删除/重排 undo。缺口：合法项目版；行内「切换道具」DsSelect onValueChange 从未测。
 *   - '[add-picker:project/startup-resource]'、'资源面板落实 2×2 状态矩阵…'、'资源候选直接消费 live items…'：
 *     已证候选派生与增删（手工 state 或无 session 的 ResourceHarness）。缺口：合法项目经真命令与
 *     保存门的资源行增/改/删。
 *   - '全局资源绑定行使用共享选择器和打开动作'：只证绑定行 DOM/帮助/打开动作；
 *     DsSelect onValueChange→UpdateManifestAssetRolesCommand 命令链、解绑 delete 语义、undo 从未测。
 *   - '入口视频与全局视频使用相同的预览动作合同'：只证「前往预览」；入口视频绑定/解绑、起始场景切换、
 *     标签编辑（DsDraftTextField onCommit→patchEntry→SetStartupEntriesCommand）从未测。
 *   - '概览只用三张可读启动卡…'、'概览在 live 入口表变化后同步…'、'缺失场景和非当前诊断都 fail-closed…'、
 *     '缺损默认入口与单入口菜单…'、'启动资源卡随 live 绑定…'：已证概览卡 stale/failed/missing 文案与导航。
 *     缺口：显示名 RenameProjectCommand 与空名守卫、introVideo 已配置态、hero meta 的
 *     检查中/诊断失败/N 项问题。
 *   - '问题页左栏按类型聚合…'、'项目信息归概览…'：只证 advanced 的 current 态。缺口：advanced 的
 *     checking/stale/failed 三态（含 failed「显示上一版」与空列表不冒充健康）。
 *   - 入口 id 身份修复分支（blank/noncanonical/duplicate）旧测试未覆盖；但真实 loader
 *     （packages/content/src/validate.ts:216-220）与 SetStartupEntriesCommand 构造器
 *     （core/startup-commands.ts:57-77）双重拒绝非法入口 id，合法 fixture 不可达，按纪律主动放弃
 *     （不为触达分支伪造非法状态；守卫本身由命令构造器拒绝证明，见 startup-commands 既有测试）。
 * - ConnectedEditorPages.test.tsx 'store-only publish refreshes both connectors…'：mock 掉
 *   ActorMode/DataMode 只证两个兄弟 connector；ConnectedProjectWorkbench（ConnectedEditorPages.tsx:121）
 *   从未被渲染。缺口：真实调用域接线、编辑偏航即 stale、failed 保留上一版问题列表。
 *
 * 本文件全部走真实 EditSession/commands/EditorAssetReader 与 loadLegalUiProject 合法项目，
 * 唯一替身是浏览器硬件端口（kit.ts：Node Blob/crypto + createImageBitmap；本组件不触发图像/音视频解码）
 * 与 rAF 调度桩（同步回调，沿用旧测试口径）。派生诊断 store 是 ConnectedProjectWorkbench 的外部输入
 * 端口（生产由 worker 驱动），这里用实现同一 EditorDerivedStore 接口的受控发布器驱动（与
 * ConnectedEditorPages.test.tsx 同口径），被测组件与命令全链保持真实。
 */
import type { AssetRecordV1 } from '@type-pal/content'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import {
  AddItemCommand,
  AddSceneCommand,
  RenameProjectCommand,
  SetStartupEntriesCommand,
  UpdateManifestAssetRolesCommand,
  UpsertAssetCommand,
} from '../core/commands.js'
import { type EditorState, EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedData } from '../core/editor-derived-contract.js'
import type {
  EditorDerivedStore,
  EditorDerivedStoreSnapshot,
} from '../core/editor-derived-store.js'
import {
  assertProjectSaveValid,
  collectProjectIssues,
  type ProjectIssue,
} from '../core/project-diagnostics.js'
import { buildProjectReferenceSnapshot } from '../core/project-reference.js'
import { ScriptEditSession } from '../core/script-editor.js'
import {
  buttonByLabel,
  deepSnapshot,
  loadLegalUiProject,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { ConnectedProjectWorkbench } from './ConnectedEditorPages.js'
import { type ProjectWorkbenchPage, ProjectWorkbenchTab } from './ProjectWorkbenchTab.js'

type DiagnosticsStatus = 'checking' | 'stale' | 'current' | 'failed'

const K08_VIDEO_ID = 'video.k08.trademark'

function DirectHarness(props: {
  session: EditSession
  reader: EditorAssetReader
  page: ProjectWorkbenchPage
  diagnosticsStatus: DiagnosticsStatus
  issues?: readonly ProjectIssue[]
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  // 模拟真实父级的深链焦点回路：组件 onObjectFocus 上报后，父级把 focusObjectId 回喂下来
  // （entryPoints 变化时组件据此保持选中，而不是回落到默认入口）。
  const [focus, setFocus] = useState<string | undefined>(props.focusObjectId)
  const current = props.session.getState()
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
      session={props.session}
      issues={props.issues ?? collectProjectIssues(current)}
      diagnosticsStatus={props.diagnosticsStatus}
      assetReader={props.reader}
      focusObjectId={focus}
      onObjectFocus={(id) => {
        setFocus(id)
        props.onObjectFocus?.(id)
      }}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

async function nextFrame(): Promise<void> {
  await act(
    async () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      }),
  )
}

async function mountWorkbench(options: {
  name: string
  page: ProjectWorkbenchPage
  diagnosticsStatus?: DiagnosticsStatus
  issues?: readonly ProjectIssue[]
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
}): Promise<{
  session: EditSession
  reader: EditorAssetReader
  render: (overrides?: {
    page?: ProjectWorkbenchPage
    diagnosticsStatus?: DiagnosticsStatus
    issues?: readonly ProjectIssue[]
  }) => Promise<void>
}> {
  const legal = await loadLegalUiProject(options.name)
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const render = async (
    overrides: {
      page?: ProjectWorkbenchPage
      diagnosticsStatus?: DiagnosticsStatus
      issues?: readonly ProjectIssue[]
    } = {},
  ): Promise<void> => {
    await act(async () => {
      root.render(
        <DirectHarness
          session={session}
          reader={reader}
          page={overrides.page ?? options.page}
          diagnosticsStatus={overrides.diagnosticsStatus ?? options.diagnosticsStatus ?? 'current'}
          issues={overrides.issues ?? options.issues}
          focusObjectId={options.focusObjectId}
          onObjectFocus={options.onObjectFocus}
        />,
      )
      await Promise.resolve()
    })
  }
  await render()
  return { session, reader, render }
}

/** 真实命令播种：真实字节 + 真实 sha256 的视频资产（本组件只作目录绑定，不解码视频）。 */
async function seedVideoAsset(session: EditSession): Promise<AssetRecordV1> {
  const payload = new TextEncoder().encode('K08 项目页视频目录载荷字节')
  const record: AssetRecordV1 = {
    kind: 'video',
    path: 'assets/authored/video/k08-trademark.mp4',
    mediaType: 'video/mp4',
    bytes: payload.byteLength,
    sha256: await sha256Hex(payload),
    label: '开场商标',
    origin: { kind: 'authored' },
  }
  const buffer = payload.buffer.slice(
    payload.byteOffset,
    payload.byteOffset + payload.byteLength,
  ) as ArrayBuffer
  await act(async () => {
    session.dispatch(new UpsertAssetCommand(K08_VIDEO_ID, record, buffer))
  })
  return record
}

/** 真实命令播种：第二个合法场景（复用起始地图），供起始场景切换。 */
async function seedChallengeScene(session: EditSession): Promise<void> {
  await act(async () => {
    session.dispatch(
      new AddSceneCommand(
        { id: 'challenge', name: '挑战场景', path: 'content/scenes/challenge.json' },
        {
          id: 'challenge',
          mapId: 'start',
          entry: { pos: { col: 12, row: 0, height: 0 }, facing: 'down' },
          entities: [],
        },
      ),
    )
  })
}

/** 真实命令播种：两个普通道具 + 一个使用 drawFromResourcePool 的资源道具。 */
async function seedItems(session: EditSession): Promise<void> {
  await act(async () => {
    session.dispatch(
      new AddItemCommand({
        id: 'herb',
        name: '止血草',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      }),
    )
    session.dispatch(
      new AddItemCommand({
        id: 'pill',
        name: '还神丹',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      }),
    )
    session.dispatch(
      new AddItemCommand({
        id: 'lamp',
        name: '炼化壶',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'drawFromResourcePool',
              resource: 'alchemyEnergy',
              maxRoll: 1,
              rewards: [{ itemId: 'lamp', count: 1 }],
            },
          ],
        },
      }),
    )
  })
}

function entryAt(session: EditSession, index: number) {
  return session.getState().manifest.entryPoints[index]!
}

function defaultEntryOf(session: EditSession) {
  const { manifest } = session.getState()
  const entry = manifest.entryPoints.find((candidate) => candidate.id === manifest.defaultEntryId)
  expect(entry, '直接启动入口').toBeDefined()
  return entry!
}

/** DsSelect 驱动：点击触发器后在 aria-controls 指向的 listbox 内按标签文本选 option。 */
async function chooseSelectOption(trigger: HTMLButtonElement, label: string): Promise<void> {
  await act(async () => {
    trigger.click()
  })
  const controls = trigger.getAttribute('aria-controls')
  const scope = (controls ? document.getElementById(controls) : null) ?? document
  const option = [...scope.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) =>
      candidate.querySelector('.ds-select-option__label')?.textContent === label ||
      candidate.textContent?.trim() === label,
  )
  expect(option, `下拉选项「${label}」`).toBeDefined()
  await act(async () => {
    option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** 撤销/重做纳入 act：订阅通知触发的组件更新不逃逸 act 域。 */
function undo(session: EditSession): boolean {
  let result = false
  act(() => {
    result = session.undo()
  })
  return result
}

function redo(session: EditSession): boolean {
  let result = false
  act(() => {
    result = session.redo()
  })
  return result
}

/** DsAddPickerDialog 驱动：打开对话框、点选包含给定文本的 option，返回对话框供确认/取消。 */
async function chooseAddPickerOption(
  trigger: HTMLButtonElement,
  label: string,
): Promise<HTMLElement> {
  await act(async () => {
    trigger.focus()
    trigger.click()
  })
  await nextFrame()
  const dialog = host.querySelector<HTMLElement>('dialog[open]')
  expect(dialog, '添加选择对话框').not.toBeNull()
  const option = [...dialog!.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
    candidate.textContent?.includes(label),
  )
  expect(option, `添加选项「${label}」`).toBeDefined()
  await act(async () => {
    option!.click()
  })
  return dialog!
}

function checkboxByText(scope: ParentNode, text: string): HTMLInputElement {
  const label = [...scope.querySelectorAll<HTMLLabelElement>('label')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  const input = label?.querySelector<HTMLInputElement>('input[type="checkbox"]')
  if (!input) throw new Error(`缺少复选项 ${text}`)
  return input
}

async function listHeaderMenuButton(text: string): Promise<HTMLButtonElement> {
  const trigger = host.querySelector<HTMLButtonElement>(
    '.project-outliner .ds-list-header [aria-label="更多操作"]',
  )
  expect(trigger, '更多操作菜单触发器').not.toBeNull()
  if (trigger!.getAttribute('aria-expanded') !== 'true')
    await act(async () => {
      trigger!.click()
    })
  const item = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
    (candidate) => candidate.textContent?.includes(text),
  )
  expect(item, `菜单项「${text}」`).toBeDefined()
  return item!
}

function liveAnnouncement(): HTMLElement {
  const node = host.querySelector<HTMLElement>('.ds-visually-hidden[role="status"]')
  expect(node, '实时通报').not.toBeNull()
  return node!
}

function heroMeta(): HTMLElement {
  const node = host.querySelector<HTMLElement>('.ds-object-hero__meta')
  expect(node, 'hero meta').not.toBeNull()
  return node!
}

function summaryCard(title: string): HTMLElement {
  const card = [...host.querySelectorAll<HTMLElement>('.project-startup-summary-card')].find(
    (candidate) => candidate.querySelector('h2')?.textContent === title,
  )
  expect(card, `摘要卡「${title}」`).toBeDefined()
  return card!
}

/** 受控派生发布器：实现真实 EditorDerivedStore 接口的外部输入端口（生产由 worker 驱动）。 */
function controlledDerivedStore(initial: EditorDerivedStoreSnapshot): {
  store: EditorDerivedStore
  publish: (snapshot: EditorDerivedStoreSnapshot) => void
} {
  let snapshot = initial
  const listeners = new Set<() => void>()
  return {
    store: {
      start: () => () => undefined,
      retry: () => undefined,
      subscribe: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      getSnapshot: () => snapshot,
    },
    publish(next) {
      snapshot = next
      for (const listener of listeners) listener()
    },
  }
}

function derivedFromState(state: EditorState): EditorDerivedData {
  return {
    statusIssues: [],
    projectIssues: collectProjectIssues(state),
    projectReferences: buildProjectReferenceSnapshot([]),
    assetDiagnostics: [],
  }
}

describe('K08 ProjectWorkbenchTab 项目页真实业务工作流', () => {
  test('startup 页角色绑定经真实选择器写 UpdateManifestAssetRolesCommand：绑定、解绑与撤销全链对称', async () => {
    const mounted = await mountWorkbench({ name: 'k08-startup-roles', page: 'startup' })
    const { session } = mounted
    const record = await seedVideoAsset(session)
    await flush()

    const trigger = () =>
      host.querySelector<HTMLButtonElement>('#project-role-video-startupTrademark')!
    const roleRow = () => trigger().closest<HTMLElement>('.project-role-row')!
    const startupGroupMeta = () =>
      [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')]
        .find(
          (row) => row.querySelector('.ds-catalog-row__title')?.textContent === '启动与标题菜单',
        )
        ?.querySelector('.ds-catalog-row__meta')?.textContent

    expect(session.getState().manifest.assets.roles['video.startupTrademark']).toBeUndefined()
    expect(startupGroupMeta()).toBe('0/3 已配置')
    expect(heroMeta().textContent).toContain('1/12 已配置')

    // 绑定：DsSelect onValueChange → UpdateManifestAssetRolesCommand 真实落 session。
    const bindHistory = session.getHistoryVersion()
    await chooseSelectOption(trigger(), `开场商标 · ${K08_VIDEO_ID}`)
    expect(session.getHistoryVersion()).toBe(bindHistory + 1)
    expect(session.getState().manifest.assets.roles['video.startupTrademark']).toBe(K08_VIDEO_ID)
    assertProjectSaveValid(session.getState())
    await flush()
    expect(roleRow().querySelector('.project-role-resource')?.textContent).toContain('开场商标')
    expect(roleRow().querySelector('.project-role-resource')?.getAttribute('title')).toBe(
      record.path,
    )
    expect(startupGroupMeta()).toBe('1/3 已配置')
    expect(heroMeta().textContent).toContain('2/12 已配置')

    expect(undo(session)).toBe(true)
    expect(session.getState().manifest.assets.roles['video.startupTrademark']).toBeUndefined()
    expect(redo(session)).toBe(true)
    expect(session.getState().manifest.assets.roles['video.startupTrademark']).toBe(K08_VIDEO_ID)

    // 解绑：选「未绑定」→ undefined 语义为删除键；undo 完整还原绑定。
    await flush()
    const boundRoles = deepSnapshot(session.getState().manifest.assets.roles)
    const unbindHistory = session.getHistoryVersion()
    await chooseSelectOption(trigger(), '未绑定')
    expect(session.getHistoryVersion()).toBe(unbindHistory + 1)
    expect('video.startupTrademark' in session.getState().manifest.assets.roles).toBe(false)
    assertProjectSaveValid(session.getState())
    await flush()
    expect(roleRow().querySelector('.project-role-resource')).toBeNull()
    expect(startupGroupMeta()).toBe('0/3 已配置')
    expect(undo(session)).toBe(true)
    expect(session.getState().manifest.assets.roles).toEqual(boundRoles)
    expect(redo(session)).toBe(true)
    expect('video.startupTrademark' in session.getState().manifest.assets.roles).toBe(false)
  })

  test('entrypoint 页标签、起始场景与入口视频经 SetStartupEntriesCommand 原子提交，undo/redo 对称且全程过保存门', async () => {
    const mounted = await mountWorkbench({ name: 'k08-entry-edits', page: 'entrypoint' })
    const { session } = mounted
    await seedVideoAsset(session)
    await seedChallengeScene(session)
    await flush()

    const entry = () => entryAt(session, 0)
    const initialEntry = deepSnapshot(entry())
    expect(initialEntry).toEqual({
      id: 'new-game',
      label: '新的故事',
      scene: 'start',
      startWorld: { party: ['hero'], money: 0, inventory: [] },
    })

    // 标签编辑：DsDraftTextField onCommit → patchEntry → SetStartupEntriesCommand（旧测试未触达）。
    const labelHistory = session.getHistoryVersion()
    await setInputValue(host.querySelector<HTMLInputElement>('#entry-label')!, '新的故事·改')
    expect(session.getHistoryVersion()).toBe(labelHistory + 1)
    expect(entry()).toEqual({ ...initialEntry, label: '新的故事·改' })
    assertProjectSaveValid(session.getState())
    await flush()
    expect(
      host.querySelector('.ds-catalog-row[data-selected="true"] .ds-catalog-row__title')
        ?.textContent,
    ).toBe('新的故事·改')
    expect(undo(session)).toBe(true)
    expect(entry()).toEqual(initialEntry)
    await flush()
    expect(host.querySelector<HTMLInputElement>('#entry-label')!.value).toBe('新的故事')
    expect(redo(session)).toBe(true)
    expect(entry().label).toBe('新的故事·改')

    // 起始场景切换：DsSelectField onValueChange → patchEntry（旧测试未触达）。
    await flush()
    const sceneHistory = session.getHistoryVersion()
    await chooseSelectOption(
      host.querySelector<HTMLButtonElement>('#entry-scene')!,
      '挑战场景 · challenge',
    )
    expect(session.getHistoryVersion()).toBe(sceneHistory + 1)
    expect(entry().scene).toBe('challenge')
    assertProjectSaveValid(session.getState())
    expect(undo(session)).toBe(true)
    expect(entry().scene).toBe('start')
    expect(redo(session)).toBe(true)
    expect(entry().scene).toBe('challenge')

    // 入口视频绑定与解绑（旧测试只证「前往预览」动作，从未改绑定）。
    await flush()
    const bindHistory = session.getHistoryVersion()
    await chooseSelectOption(
      host.querySelector<HTMLButtonElement>('#entry-intro-video')!,
      '开场商标',
    )
    expect(session.getHistoryVersion()).toBe(bindHistory + 1)
    expect(entry().introVideo).toBe(K08_VIDEO_ID)
    assertProjectSaveValid(session.getState())
    await flush()
    // 选择器回显绑定值（「前往预览」按钮合同属旧测试已证范围，且需要 onOpenLocation 才渲染）。
    expect(host.querySelector<HTMLButtonElement>('#entry-intro-video')!.textContent).toContain(
      '开场商标',
    )
    expect(undo(session)).toBe(true)
    expect('introVideo' in entry()).toBe(false)
    expect(redo(session)).toBe(true)
    expect(entry().introVideo).toBe(K08_VIDEO_ID)

    // 选「无」解绑：命令构造器删除 undefined 键，完整入口对象回到无视频形态。
    await flush()
    const clearHistory = session.getHistoryVersion()
    await chooseSelectOption(
      host.querySelector<HTMLButtonElement>('#entry-intro-video')!,
      '无（由场景脚本负责叙事）',
    )
    expect(session.getHistoryVersion()).toBe(clearHistory + 1)
    expect(entry()).toEqual({ ...initialEntry, label: '新的故事·改', scene: 'challenge' })
    expect('introVideo' in entry()).toBe(false)
    assertProjectSaveValid(session.getState())
    expect(undo(session)).toBe(true)
    expect(entry().introVideo).toBe(K08_VIDEO_ID)
    expect(redo(session)).toBe(true)
    expect('introVideo' in entry()).toBe(false)
  })

  test('新增入口默认深拷直接启动入口且数据隔离；删除选中入口后回选直接启动入口并通知 focus', async () => {
    const onObjectFocus = vi.fn()
    const mounted = await mountWorkbench({
      name: 'k08-entry-add',
      page: 'entrypoint',
      onObjectFocus,
    })
    const { session } = mounted

    // 先把直接启动入口金钱改为 88（真命令），作为深拷来源证据。
    await setInputValue(host.querySelector<HTMLInputElement>('#start-world-money')!, '88')
    expect(defaultEntryOf(session).startWorld.money).toBe(88)

    // 无显式深链时默认选中直接启动入口；新增入口必须深拷它（selected ?? findDefaultEntry）。
    const addHistory = session.getHistoryVersion()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="新增入口"]')!.click()
    })
    expect(session.getHistoryVersion()).toBe(addHistory + 1)
    expect(session.getState().manifest.entryPoints.map((entry) => entry.id)).toEqual([
      'new-game',
      'entry-1',
    ])
    const created = entryAt(session, 1)
    expect(created).toEqual({
      id: 'entry-1',
      label: '新入口',
      scene: 'start',
      startWorld: { party: ['hero'], money: 88, inventory: [] },
    })
    expect(created.startWorld).not.toBe(entryAt(session, 0).startWorld)
    expect(onObjectFocus).toHaveBeenLastCalledWith('entry-1')
    await flush()
    expect(host.querySelector('.project-center h1')?.textContent).toBe('新入口')
    expect(heroMeta().textContent).toContain('菜单入口 · 稳定 id')

    // 深拷隔离：编辑新入口金钱不回流直接启动入口。
    await setInputValue(host.querySelector<HTMLInputElement>('#start-world-money')!, '12')
    expect(entryAt(session, 1).startWorld.money).toBe(12)
    expect(entryAt(session, 0).startWorld.money).toBe(88)

    // 默认入口联动：设为直接启动入口后删除保护随之迁移。
    await flush()
    const setDefault = await listHeaderMenuButton('设为直接启动入口')
    expect(setDefault.disabled).toBe(false)
    const defaultHistory = session.getHistoryVersion()
    await act(async () => {
      setDefault.click()
    })
    expect(session.getHistoryVersion()).toBe(defaultHistory + 1)
    expect(session.getState().manifest.defaultEntryId).toBe('entry-1')
    await flush()
    expect(heroMeta().textContent).toContain('直接启动 · 稳定 id')
    expect((await listHeaderMenuButton('删除当前入口')).disabled).toBe(true)

    // 选中另一入口并删除：commit + chooseEntry(defaultEntryId) 必须回到直接启动入口。
    await act(async () => {
      ;[...host.querySelectorAll<HTMLElement>('.ds-catalog-row')]
        .find((row) => row.querySelector('.ds-catalog-row__title')?.textContent === '新的故事')!
        .click()
    })
    expect(onObjectFocus).toHaveBeenLastCalledWith('new-game')
    await flush()
    expect(host.querySelector('.project-center h1')?.textContent).toBe('新的故事')
    const removeButton = await listHeaderMenuButton('删除当前入口')
    expect(removeButton.disabled).toBe(false)
    const removeHistory = session.getHistoryVersion()
    await act(async () => {
      removeButton.click()
    })
    expect(session.getHistoryVersion()).toBe(removeHistory + 1)
    expect(session.getState().manifest.entryPoints.map((entry) => entry.id)).toEqual(['entry-1'])
    expect(onObjectFocus).toHaveBeenLastCalledWith('entry-1')
    await flush()
    expect(host.querySelector('.project-center h1')?.textContent).toBe('新入口')

    // 撤销链逐格回退：删除 → 设默认。
    expect(undo(session)).toBe(true)
    expect(session.getState().manifest.entryPoints.map((entry) => entry.id)).toEqual([
      'new-game',
      'entry-1',
    ])
    expect(session.getState().manifest.defaultEntryId).toBe('entry-1')
    expect(undo(session)).toBe(true)
    expect(session.getState().manifest.defaultEntryId).toBe('new-game')
    expect(redo(session)).toBe(true)
    expect(redo(session)).toBe(true)
    expect(session.getState().manifest.entryPoints.map((entry) => entry.id)).toEqual(['entry-1'])
    assertProjectSaveValid(session.getState())
  })

  test('初始队伍与金钱在合法项目下编辑：金钱、种子 HP、开局状态弹窗、移出与重新加入均单命令可撤销', async () => {
    const mounted = await mountWorkbench({ name: 'k08-party', page: 'entrypoint' })
    const { session } = mounted
    const startWorld = () => defaultEntryOf(session).startWorld
    expect(startWorld()).toEqual({ party: ['hero'], money: 0, inventory: [] })

    // 金钱字段（旧测试从未编辑 start-world-money）。
    const moneyHistory = session.getHistoryVersion()
    await setInputValue(host.querySelector<HTMLInputElement>('#start-world-money')!, '250')
    expect(session.getHistoryVersion()).toBe(moneyHistory + 1)
    expect(startWorld().money).toBe(250)
    assertProjectSaveValid(session.getState())
    expect(undo(session)).toBe(true)
    expect(startWorld().money).toBe(0)
    expect(redo(session)).toBe(true)
    expect(startWorld().money).toBe(250)

    // 种子 HP 稀疏覆盖与清空（合法项目 + 保存门）。
    await flush()
    const hpHistory = session.getHistoryVersion()
    await setInputValue(
      host.querySelector<HTMLInputElement>('input[aria-label^="hero 开局当前 HP"]')!,
      '40',
    )
    expect(session.getHistoryVersion()).toBe(hpHistory + 1)
    expect(startWorld().seedStats).toEqual({ hero: { hp: 40 } })
    assertProjectSaveValid(session.getState())
    await setInputValue(
      host.querySelector<HTMLInputElement>('input[aria-label^="hero 开局当前 HP"]')!,
      '',
    )
    expect(startWorld().seedStats).toBeUndefined()
    expect(undo(session)).toBe(true)
    expect(startWorld().seedStats).toEqual({ hero: { hp: 40 } })
    expect(redo(session)).toBe(true)
    expect(startWorld().seedStats).toBeUndefined()

    // 开局状态弹窗：合法项目无毒种（真实空态），状态与临时毒抗保存为一条命令。
    await flush()
    await act(async () => {
      buttonByLabel(host, '当前状态').click()
    })
    await nextFrame()
    const dialog = host.querySelector<HTMLElement>('dialog[open]')
    expect(dialog, '开局状态弹窗').not.toBeNull()
    expect(dialog!.textContent).toContain('当前项目没有可选毒种')
    const conditionHistory = session.getHistoryVersion()
    await act(async () => {
      checkboxByText(dialog!, '护体').click()
    })
    await act(async () => {
      checkboxByText(dialog!, '带入下一场战斗的临时毒抗').click()
    })
    expect(session.getHistoryVersion()).toBe(conditionHistory)
    await act(async () => {
      buttonByLabel(dialog!, '保存当前状态').click()
    })
    expect(session.getHistoryVersion()).toBe(conditionHistory + 1)
    const savedConditions = {
      hero: { statuses: [{ status: 'protect', turns: 7 }], poisonResistance: 1 },
    }
    expect(startWorld().seedConditions).toEqual(savedConditions)
    assertProjectSaveValid(session.getState())
    await flush()
    expect(host.querySelector('dialog[open]')).toBeNull()
    expect(liveAnnouncement().textContent).toContain('已更新 hero 的开局当前状态')
    expect(
      [...host.querySelectorAll<HTMLElement>('.project-party-condition-summary .ds-tag')].map(
        (tag) => tag.textContent,
      ),
    ).toEqual(['护体 7 回合', '临时毒抗 +1'])
    expect(undo(session)).toBe(true)
    expect(startWorld().seedConditions).toBeUndefined()
    expect(redo(session)).toBe(true)
    expect(startWorld().seedConditions).toEqual(savedConditions)

    // 移出队员：一条命令同时清掉种子 HP/状态覆盖；撤销完整还原。
    await flush()
    const beforeRemove = deepSnapshot(startWorld())
    const removeHistory = session.getHistoryVersion()
    await act(async () => {
      buttonByLabel(host, '移出主角').click()
    })
    expect(session.getHistoryVersion()).toBe(removeHistory + 1)
    expect(startWorld().party).toEqual([])
    expect(startWorld().seedStats).toBeUndefined()
    expect(startWorld().seedConditions).toBeUndefined()
    expect(liveAnnouncement().textContent).toContain('已将主角移出初始队伍')
    assertProjectSaveValid(session.getState())
    await flush()
    expect(host.textContent).toContain('暂无初始队员')
    expect(undo(session)).toBe(true)
    expect(startWorld()).toEqual(beforeRemove)
    expect(redo(session)).toBe(true)
    expect(startWorld().party).toEqual([])

    // 重新加入：同一队员经添加选择器回到队伍，种子覆盖不复活。
    await flush()
    const readdHistory = session.getHistoryVersion()
    const readdDialog = await chooseAddPickerOption(buttonByLabel(host, '添加队员'), '主角')
    await act(async () => {
      buttonByLabel(readdDialog, '加入队伍').click()
    })
    await nextFrame()
    expect(session.getHistoryVersion()).toBe(readdHistory + 1)
    expect(startWorld().party).toEqual(['hero'])
    expect(startWorld().seedConditions).toBeUndefined()
    expect(liveAnnouncement().textContent).toContain('已将主角加入初始队伍')
    assertProjectSaveValid(session.getState())
    expect(undo(session)).toBe(true)
    expect(startWorld().party).toEqual([])
    expect(redo(session)).toBe(true)
    expect(startWorld().party).toEqual(['hero'])
  })

  test('初始道具与世界资源行在合法项目下增删改：行内切换、数量与资源值编辑均过保存门', async () => {
    const mounted = await mountWorkbench({ name: 'k08-inventory', page: 'entrypoint' })
    const { session } = mounted
    await seedItems(session)
    await flush()
    const startWorld = () => defaultEntryOf(session).startWorld
    expect(startWorld().inventory).toEqual([])

    // 添加道具：真实选择器 → 单命令 count=1。
    const addHistory = session.getHistoryVersion()
    const addItemDialog = await chooseAddPickerOption(buttonByLabel(host, '添加道具'), '止血草')
    await act(async () => {
      buttonByLabel(addItemDialog, '添加道具').click()
    })
    await nextFrame()
    expect(session.getHistoryVersion()).toBe(addHistory + 1)
    expect(startWorld().inventory).toEqual([{ itemId: 'herb', count: 1 }])
    assertProjectSaveValid(session.getState())

    // 数量编辑：提交为独立一条命令。
    await flush()
    const countHistory = session.getHistoryVersion()
    await setInputValue(
      host.querySelector<HTMLInputElement>('[aria-label="止血草的初始数量"]')!,
      '6',
    )
    expect(session.getHistoryVersion()).toBe(countHistory + 1)
    expect(startWorld().inventory).toEqual([{ itemId: 'herb', count: 6 }])
    assertProjectSaveValid(session.getState())

    // 行内切换道具（旧测试从未触达 inventory DsSelect onValueChange）：数量保留。
    await flush()
    const switchHistory = session.getHistoryVersion()
    await chooseSelectOption(
      host.querySelector<HTMLButtonElement>('[aria-label="第 1 项初始道具"]')!,
      '还神丹',
    )
    expect(session.getHistoryVersion()).toBe(switchHistory + 1)
    expect(startWorld().inventory).toEqual([{ itemId: 'pill', count: 6 }])
    assertProjectSaveValid(session.getState())

    // 撤销链逐格回退：切换 → 数量 → 添加；redo 恢复终态。
    expect(undo(session)).toBe(true)
    expect(startWorld().inventory).toEqual([{ itemId: 'herb', count: 6 }])
    expect(undo(session)).toBe(true)
    expect(startWorld().inventory).toEqual([{ itemId: 'herb', count: 1 }])
    expect(undo(session)).toBe(true)
    expect(startWorld().inventory).toEqual([])
    expect(redo(session)).toBe(true)
    expect(redo(session)).toBe(true)
    expect(redo(session)).toBe(true)
    expect(startWorld().inventory).toEqual([{ itemId: 'pill', count: 6 }])

    // 删除行：单命令且可撤销。
    await flush()
    const deleteHistory = session.getHistoryVersion()
    await act(async () => {
      buttonByLabel(host, '删除初始道具还神丹').click()
    })
    expect(session.getHistoryVersion()).toBe(deleteHistory + 1)
    expect(startWorld().inventory).toEqual([])
    expect(undo(session)).toBe(true)
    expect(startWorld().inventory).toEqual([{ itemId: 'pill', count: 6 }])

    // 世界资源：候选来自真实 live 物品的 drawFromResourcePool 效果，添加初值为 0。
    await flush()
    const resourceDialog = await chooseAddPickerOption(
      buttonByLabel(host, '添加资源'),
      '炼化壶使用的资源',
    )
    const addResourceHistory = session.getHistoryVersion()
    await act(async () => {
      buttonByLabel(resourceDialog, '添加资源').click()
    })
    await nextFrame()
    expect(session.getHistoryVersion()).toBe(addResourceHistory + 1)
    expect(startWorld().resources).toEqual({ alchemyEnergy: 0 })
    assertProjectSaveValid(session.getState())

    // 资源值编辑与 undo/redo。
    await flush()
    await setInputValue(
      host.querySelector<HTMLInputElement>('[aria-label="炼化壶（资源 alchemyEnergy）初始值"]')!,
      '9',
    )
    expect(startWorld().resources).toEqual({ alchemyEnergy: 9 })
    assertProjectSaveValid(session.getState())
    expect(undo(session)).toBe(true)
    expect(startWorld().resources).toEqual({ alchemyEnergy: 0 })
    expect(redo(session)).toBe(true)
    expect(startWorld().resources).toEqual({ alchemyEnergy: 9 })

    // 删除资源行：单命令、通报与撤销还原。
    await flush()
    const removeResourceHistory = session.getHistoryVersion()
    await act(async () => {
      buttonByLabel(host, '删除炼化壶使用的初始世界资源').click()
    })
    expect(session.getHistoryVersion()).toBe(removeResourceHistory + 1)
    expect(startWorld().resources).toBeUndefined()
    expect(liveAnnouncement().textContent).toContain('已删除炼化壶使用的初始世界资源')
    expect(undo(session)).toBe(true)
    expect(startWorld().resources).toEqual({ alchemyEnergy: 9 })
    assertProjectSaveValid(session.getState())
  })

  test('概览显示名经 RenameProjectCommand 改名：空名守卫零命令，改名带脏标记且 undo/redo 对称', async () => {
    const mounted = await mountWorkbench({ name: 'k08-overview-rename', page: 'overview' })
    const { session } = mounted
    expect(session.getState().manifest.name).toBe('k08-overview-rename')
    const nameInput = () => host.querySelector<HTMLInputElement>('#project-display-name')!
    expect(nameInput().value).toBe('k08-overview-rename')

    // 空名守卫：DsDraftTextField validate 拒绝，零命令、状态不变、错误落在控件 title。
    const guardHistory = session.getHistoryVersion()
    await setInputValue(nameInput(), '   ')
    expect(session.getHistoryVersion()).toBe(guardHistory)
    expect(session.getState().manifest.name).toBe('k08-overview-rename')
    expect(nameInput().title).toBe('项目显示名不能为空。')

    // 合法改名：真实命令到 session，脏标记与概览同步。
    const renameHistory = session.getHistoryVersion()
    await setInputValue(nameInput(), '仙剑复刻版')
    expect(session.getHistoryVersion()).toBe(renameHistory + 1)
    expect(session.getState().manifest.name).toBe('仙剑复刻版')
    expect(session.isDirty()).toBe(true)
    assertProjectSaveValid(session.getState())
    await flush()
    expect(host.querySelector('.project-center h1')?.textContent).toBe('仙剑复刻版')
    expect(host.querySelector('.project-summary-list')?.textContent).toContain('有未保存改动')
    expect(undo(session)).toBe(true)
    expect(session.getState().manifest.name).toBe('k08-overview-rename')
    expect(redo(session)).toBe(true)
    expect(session.getState().manifest.name).toBe('仙剑复刻版')
  })

  test('概览诊断态与入口视频联动：空白项目零诊断，checking/failed 不冒充健康，绑定与问题计数真实呈现', async () => {
    const mounted = await mountWorkbench({ name: 'k08-overview-health', page: 'overview' })
    const { session, render } = mounted
    const summaryGrid = () => host.querySelector<HTMLElement>('.project-startup-summary-grid')!

    // 前提真值：合法空白项目经真实诊断聚合后零问题（后续 meta 断言的依据）。
    expect(collectProjectIssues(session.getState())).toEqual([])

    // checking：诊断未回报时不显示「配置健康」。
    await render({ diagnosticsStatus: 'checking' })
    expect(heroMeta().textContent).toContain('检查中')
    expect(heroMeta().textContent).not.toContain('配置健康')
    expect(summaryCard('默认开局').textContent).toContain('正在检查')
    expect(summaryCard('启动资源').textContent).toContain('正在检查资源配置')

    // current：零诊断时显示真实健康态；入口视频未配置为可选项。
    await render({ diagnosticsStatus: 'current' })
    expect(heroMeta().textContent).toContain('配置健康')
    expect(summaryCard('默认开局').textContent).toContain('起始位置已就绪')
    expect(summaryCard('默认开局').textContent).toContain('未配置（可选）')
    expect(summaryCard('标题菜单').textContent).toContain('均未配置（可选）')
    expect(summaryGrid()).toBeDefined()

    // 经真实命令绑定入口视频后：概览「已配置」与计数联动（旧测试只证未配置态）。
    await seedVideoAsset(session)
    const entry = entryAt(session, 0)
    await act(async () => {
      session.dispatch(
        new SetStartupEntriesCommand({
          defaultEntryId: session.getState().manifest.defaultEntryId,
          entryPoints: [{ ...entry, introVideo: K08_VIDEO_ID }],
        }),
      )
    })
    await render({ diagnosticsStatus: 'current' })
    expect(summaryCard('默认开局').textContent).toContain('已配置')
    expect(summaryCard('标题菜单').textContent).toContain('1 个入口已配置')
    expect(collectProjectIssues(session.getState())).toEqual([])
    assertProjectSaveValid(session.getState())

    // failed：不把空列表/上一版当作健康；菜单计数不伪装成诊断结论。
    await render({ diagnosticsStatus: 'failed' })
    expect(heroMeta().textContent).toContain('诊断失败')
    expect(summaryCard('默认开局').textContent).toContain('诊断暂不可用')
    expect(summaryCard('默认开局').textContent).not.toContain('已配置')
    expect(summaryCard('启动资源').textContent).toContain('诊断暂不可用')

    // 绑定悬空角色：问题计数真实呈现；保存门拒绝该状态（守卫本身成为合同）。
    await act(async () => {
      session.dispatch(
        new UpdateManifestAssetRolesCommand({ 'audio.openingMenuMusic': 'music.k08.missing' }),
      )
    })
    const issues = collectProjectIssues(session.getState())
    expect(issues.some((issue) => issue.code === 'manifest-assets-invalid')).toBe(true)
    await render({ diagnosticsStatus: 'current' })
    expect(heroMeta().textContent).toContain(`${issues.length} 项问题`)
    expect(() => assertProjectSaveValid(session.getState())).toThrow('资源角色校验失败')
  })

  test('advanced 页 checking/stale/failed 三态：空列表不冒充健康，失败保留上一版问题列表', async () => {
    const mounted = await mountWorkbench({ name: 'k08-advanced-status', page: 'advanced' })
    const { session, render } = mounted
    const issueDetail = () => host.querySelector<HTMLElement>('#project-issue-detail')!

    // checking + 空列表：等待诊断，不判定健康。
    await render({ diagnosticsStatus: 'checking', issues: [] })
    expect(host.textContent).toContain('等待当前诊断')
    expect(host.textContent).toContain('正在检查当前项目；暂不判定配置健康。')
    expect(heroMeta().textContent).toContain('正在检查')
    expect(issueDetail().querySelector('p[role="status"]')?.textContent).toBe('诊断检查中…')
    expect(issueDetail().querySelector('.ds-diagnostic-panel')).toBeNull()

    // failed + 空列表：明示诊断不可用，不把空列表视为健康。
    await render({ diagnosticsStatus: 'failed', issues: [] })
    expect(host.textContent).toContain('当前诊断不可用，未把空列表视为健康。')
    expect(heroMeta().textContent).toContain('诊断失败 · 显示上一版')
    expect(issueDetail().querySelector('p[role="status"]')?.textContent).toBe(
      '诊断失败，请从底部状态栏重试。',
    )
    expect(host.textContent).toContain('等待当前诊断')

    // 真实问题列表（悬空角色绑定，经真命令产生）。
    await act(async () => {
      session.dispatch(
        new UpdateManifestAssetRolesCommand({ 'audio.openingMenuMusic': 'music.k08.missing' }),
      )
    })
    const lastKnownIssues = collectProjectIssues(session.getState())
    expect(lastKnownIssues.length).toBeGreaterThan(0)

    // stale + 上一版问题：分组与详情继续可见，带「正在刷新 · 显示上一版」。
    await render({ diagnosticsStatus: 'stale', issues: lastKnownIssues })
    expect(heroMeta().textContent).toContain('正在刷新 · 显示上一版')
    expect(host.textContent).toContain('全局资源配置无效')
    expect(host.querySelectorAll('.ds-diagnostic-row').length).toBeGreaterThan(0)

    // failed + 上一版问题：同样保留，标签切换为「诊断失败 · 显示上一版」。
    await render({ diagnosticsStatus: 'failed', issues: lastKnownIssues })
    expect(heroMeta().textContent).toContain('诊断失败 · 显示上一版')
    expect(host.textContent).toContain('全局资源配置无效')
    expect(host.querySelectorAll('.ds-diagnostic-row').length).toBeGreaterThan(0)

    // current + 零问题：真实健康态回归。
    await render({ diagnosticsStatus: 'current', issues: [] })
    expect(host.textContent).toContain('当前项目没有错误或警告。')
    expect(host.textContent).toContain('暂无错误')
    expect(host.textContent).toContain('暂无警告')
  })

  test('ConnectedProjectWorkbench 真实调用域：derived 发布驱动诊断态，编辑偏航即 stale，failed 显示上一版', async () => {
    const legal = await loadLegalUiProject('k08-connected')
    const session = new EditSession(legal.state)
    const scriptSession = new ScriptEditSession({ scenes: [], items: [], sharedScripts: {} })
    const reader = createEditorAssetReader(legal.source, () => session.getState())
    const revision = () => ({
      mainHistoryVersion: session.getHistoryVersion(),
      scriptHistoryVersion: scriptSession.getHistoryVersion(),
    })
    const controlled = controlledDerivedStore({ status: 'checking', targetRevision: revision() })
    const renderConnected = async (page: ProjectWorkbenchPage): Promise<void> => {
      await act(async () => {
        root.render(
          <ConnectedProjectWorkbench
            page={page}
            session={session}
            scriptSession={scriptSession}
            derivedStore={controlled.store}
            assetReader={reader}
          />,
        )
        await Promise.resolve()
      })
    }

    // checking：worker 尚未回报，不冒充健康。
    await renderConnected('overview')
    expect(heroMeta().textContent).toContain('检查中')
    expect(summaryCard('默认开局').textContent).toContain('正在检查')

    // current@当前 revision：真实派生数据（零问题）→ 健康文案。
    await act(async () => {
      controlled.publish({
        status: 'current',
        revision: revision(),
        data: derivedFromState(session.getState()),
      })
    })
    expect(heroMeta().textContent).toContain('配置健康')
    expect(summaryCard('默认开局').textContent).toContain('起始位置已就绪')

    // 真实命令偏航：session revision 前进、store 滞留 → effective 立即 stale（fail-closed），
    // 同时 session 驱动的标题保持 live。
    await act(async () => {
      session.dispatch(new RenameProjectCommand('偏航项目'))
    })
    expect(heroMeta().textContent).toContain('检查中')
    expect(host.querySelector('.project-center h1')?.textContent).toBe('偏航项目')
    expect(summaryCard('默认开局').textContent).toContain('正在检查')

    // failed@当前 revision + lastKnown：显示失败态而非健康。
    await act(async () => {
      controlled.publish({
        status: 'failed',
        targetRevision: revision(),
        message: 'K08 注入派生失败',
        lastKnown: {
          revision: { mainHistoryVersion: 0, scriptHistoryVersion: 0 },
          data: derivedFromState(legal.state),
        },
      })
    })
    expect(heroMeta().textContent).toContain('诊断失败')
    expect(summaryCard('默认开局').textContent).toContain('诊断暂不可用')

    // 恢复 current@当前 revision。
    await act(async () => {
      controlled.publish({
        status: 'current',
        revision: revision(),
        data: derivedFromState(session.getState()),
      })
    })
    expect(heroMeta().textContent).toContain('配置健康')

    // advanced 页：真实问题（悬空角色绑定）经 derived 数据进入组件。
    await act(async () => {
      session.dispatch(
        new UpdateManifestAssetRolesCommand({ 'audio.openingMenuMusic': 'music.k08.missing' }),
      )
    })
    await act(async () => {
      controlled.publish({
        status: 'current',
        revision: revision(),
        data: derivedFromState(session.getState()),
      })
    })
    await renderConnected('advanced')
    expect(heroMeta().textContent).not.toContain('显示上一版')
    expect(host.textContent).toContain('全局资源配置无效')
    expect(host.querySelectorAll('.ds-diagnostic-row').length).toBeGreaterThan(0)

    // failed + lastKnown：上一版问题列表保留并带「诊断失败 · 显示上一版」。
    await act(async () => {
      controlled.publish({
        status: 'failed',
        targetRevision: revision(),
        message: 'K08 注入派生失败',
        lastKnown: {
          revision: revision(),
          data: derivedFromState(session.getState()),
        },
      })
    })
    expect(heroMeta().textContent).toContain('诊断失败 · 显示上一版')
    expect(host.textContent).toContain('全局资源配置无效')
    expect(host.querySelectorAll('.ds-diagnostic-row').length).toBeGreaterThan(0)

    // undo 偏航：revision 错位 → effective stale → 「正在刷新 · 显示上一版」+ 上一版问题。
    await act(async () => {
      session.undo()
    })
    expect(heroMeta().textContent).toContain('正在刷新 · 显示上一版')
    expect(host.textContent).toContain('全局资源配置无效')

    // 追平 current：标签消失；undo 已撤销悬空绑定，诊断归零。
    await act(async () => {
      controlled.publish({
        status: 'current',
        revision: revision(),
        data: derivedFromState(session.getState()),
      })
    })
    expect(
      host.querySelector<HTMLElement>('.ds-object-hero__meta')?.textContent ?? '',
    ).not.toContain('显示上一版')
    expect(host.textContent).toContain('当前项目没有错误或警告。')
  })
})
