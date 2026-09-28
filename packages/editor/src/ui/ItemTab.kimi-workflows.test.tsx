// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K10（批C）：ItemTab 物品页真实业务工作流补测。
 * 目标源 ItemTab.tsx（锚 666/1150：组件本体与 addPrivateScript/patchUse）。
 *
 * 旧断言去重（旧 file/title → 已证合同 → 本组缺口，只测缺口）：
 * - ItemTab.test.tsx '空项目可直接创建第一个物品并进入完整工作台' → 新建流与三能力开关存在性；
 *   缺口：开关写出的合法默认 UseSpec/ThrowSpec 完整内容、保存门与撤销重做（旧从未过保存门）。
 * - ItemTab.test.tsx '检查器支持方向键切换，删除后撤销会恢复原选择' → 确认删除+撤销恢复选中；
 *   缺口：确认框「取消」点击零提交（旧只覆盖 revision/focus 变化自动关闭），成功通知文本。
 * - ItemTab.test.tsx '新建私有脚本:一次跨会话历史入帐→编辑正文→配对撤销重做→投影含正文' 与
 *   '物品私有脚本由 shell 原子增删排序，撤销重做保留 canonical 正文' → 按钮添加/正文编辑/
 *   链上删除的配对撤销；缺口：成功/失败通知文本、序列化落盘形态（items.json 完整输出）、
 *   script 在场但缺 historyCoordinator 时 addPrivateScript 的拒绝（旧 '缺少配对历史时新建、
 *   复制、删除明确拒绝且零写入' 不传 script，添加按钮根本不渲染）。
 * - ItemTab.test.tsx '新建后不重开即可编辑私有正文，复制使用未保存正文且副本独立' → 复制隔离；
 *   缺口：两个存量物品各自私有脚本的 owner 身份隔离（旧全程单物品）。
 * - ItemTab.test.tsx '复杂炼化 effect 在物品页只显示摘要，并把 owner 精确交给独立页面' →
 *   机制物品的开关禁用；本组不复制。
 * - editor-history-paired-workflows.test.ts P06/P07/P19 → 命令层配对增删与保存重开；
 *   缺口：从真实组件 DOM 入口驱动同一链路到序列化输出。
 * - ItemUseEffectEditor 三旧文件（含 glm-ui-wave U1c）→ 链编辑器回调层合同；
 *   本文件只经 ItemTab 真实接线触达，组件直挂合同由 ItemUseEffectEditor.kimi-workflows.test.tsx 承担。
 *
 * 本文件全部走真实 EditSession/ScriptEditSession/EditorHistoryCoordinator/EditorAssetReader
 * 与 k10-fixtures 的合法项目（loader→生产装配→保存门自证），唯一替身是浏览器硬件端口
 * （kit.ts：Node Blob/crypto + createImageBitmap；本组件不触发图像解码）。
 */
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { serializeProjectWithMapCopies } from '../core/project-io.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import type { ScriptEditSession } from '../core/script-editor.js'
import { mergeEditorProjectionWithCurrentAuthorState } from '../core/script-editor-projection.js'
import { buttonByLabel, deepSnapshot, useActEnvironment } from './__tests__/glm-ui-wave-kit.js'
import {
  assertK10SaveValid,
  type K10ItemRig,
  loadK10ItemProject,
} from './__tests__/kimi-editor-workflows/k10-fixtures.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { ItemTab } from './ItemTab.js'

type Notice = { kind: 'info' | 'error'; message: string } | undefined

function Harness(props: { rig: K10ItemRig; reader: EditorAssetReader; notices: Notice[] }) {
  useSyncExternalStore(
    (callback) => props.rig.session.subscribe(callback),
    () => props.rig.session.getVersion(),
  )
  useSyncExternalStore(
    (callback) => props.rig.scriptSession.subscribe(callback),
    () => props.rig.scriptSession.getVersion(),
  )
  const current = props.rig.session.getState()
  const scriptSnapshot = props.rig.scriptSession.getStateSnapshot()
  return (
    <ItemTab
      items={current.items}
      actors={current.actors}
      skills={current.skills}
      poisons={current.poisons ?? []}
      locale={current.locale}
      session={props.rig.session}
      assetCatalog={current.assetCatalog}
      assetReader={props.reader}
      battleSprites={current.battleSprites}
      script={{ state: scriptSnapshot, session: props.rig.scriptSession }}
      historyCoordinator={props.rig.history}
      referenceIndex={collectCurrentProjectReferenceIndex(current, scriptSnapshot)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) =>
        collectCurrentProjectReferenceIndex(state, props.rig.scriptSession.getStateSnapshot())
      }
      onStatusNotice={(notice) => props.notices.push(notice)}
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

async function mountTab(rig: K10ItemRig): Promise<{ notices: Notice[] }> {
  const reader = createEditorAssetReader(rig.source, () => rig.session.getState())
  const notices: Notice[] = []
  await act(async () => {
    root.render(<Harness rig={rig} reader={reader} notices={notices} />)
    await Promise.resolve()
  })
  return { notices }
}

/** 能力开关：按 label 精确文本定位 input[role="switch"]。 */
function capabilitySwitch(label: string): HTMLInputElement {
  const control = [...host.querySelectorAll<HTMLInputElement>('input[role="switch"]')].find(
    (candidate) => candidate.closest('label')?.textContent === label,
  )
  expect(control, `开关 ${label}`).toBeDefined()
  return control!
}

function useChain(): HTMLElement {
  const chain = host.querySelector<HTMLElement>('[data-effect-editor-family="item/use-effects"]')
  expect(chain, '使用效果链').not.toBeNull()
  return chain!
}

function itemAt(rig: K10ItemRig, index = 0) {
  const item = rig.session.getState().items[index]
  expect(item, `物品[${index}]`).toBeDefined()
  return item!
}

function canonicalItemAt(scriptSession: ScriptEditSession, index = 0) {
  const item = scriptSession.getStateSnapshot().items[index]
  expect(item, `canonical 物品[${index}]`).toBeDefined()
  return item!
}

function undo(rig: K10ItemRig): void {
  act(() => {
    expect(rig.session.undo()).toBe(true)
  })
}

function redo(rig: K10ItemRig): void {
  act(() => {
    expect(rig.session.redo()).toBe(true)
  })
}

const PRIVATE_CHUNK = '__author-item-private-runtime'

describe('K10 ItemTab 物品页真实业务工作流', () => {
  test('使用/投掷能力开关写入合法默认并经保存门；删除确认取消零提交、确认删除带通知可撤销', async () => {
    const rig = await loadK10ItemProject('k10-tab-capability', {
      items: [
        {
          id: 'herb',
          name: '止血草',
          desc: ['止血。'],
          buyPrice: 10,
          sellPrice: 5,
          sellable: true,
        },
      ],
    })
    const { notices } = await mountTab(rig)
    const initialItem = deepSnapshot(itemAt(rig))

    // 启用使用能力：开关 → patch → UpdateItemCommand，完整 UseSpec 落库。
    const history0 = rig.session.getHistoryVersion()
    await act(async () => capabilitySwitch('启用使用能力').click())
    expect(rig.session.getHistoryVersion()).toBe(history0 + 1)
    expect(itemAt(rig).use).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'healHp', amount: 100 }],
    })
    assertK10SaveValid(rig)

    // 启用投掷能力：合法默认 ThrowSpec 落库。
    await act(async () => capabilitySwitch('启用投掷能力').click())
    expect(itemAt(rig).throw).toEqual({
      target: 'oneEnemy',
      effects: [{ kind: 'fixedDamage', amount: 1 }],
    })
    assertK10SaveValid(rig)

    // 关闭两侧：无私有脚本时为普通 UpdateItemCommand 删键。
    await act(async () => capabilitySwitch('启用使用能力').click())
    expect(itemAt(rig).use).toBeUndefined()
    expect('use' in itemAt(rig)).toBe(false)
    await act(async () => capabilitySwitch('启用投掷能力').click())
    expect(itemAt(rig).throw).toBeUndefined()
    expect(itemAt(rig)).toEqual(initialItem)
    assertK10SaveValid(rig)

    // 撤销/重做对称：四步逐格回退再重做。
    undo(rig)
    expect(itemAt(rig).throw).toEqual({
      target: 'oneEnemy',
      effects: [{ kind: 'fixedDamage', amount: 1 }],
    })
    undo(rig)
    expect(itemAt(rig).use).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'healHp', amount: 100 }],
    })
    undo(rig)
    undo(rig)
    expect(itemAt(rig)).toEqual(initialItem)
    redo(rig)
    redo(rig)
    expect(itemAt(rig).use).toBeDefined()
    expect(itemAt(rig).throw).toBeDefined()
    redo(rig)
    redo(rig)
    expect(itemAt(rig)).toEqual(initialItem)

    // 删除确认取消：零提交、物品完好、确认框关闭、无通知。
    const hero = host.querySelector<HTMLElement>('.item-title-actions')
    expect(hero).not.toBeNull()
    await act(async () => buttonByLabel(hero!, '删除').click())
    expect(hero!.querySelector('.item-delete-confirm')).not.toBeNull()
    const historyBeforeCancel = rig.session.getHistoryVersion()
    const noticesBeforeCancel = notices.length
    await act(async () => buttonByLabel(hero!, '取消').click())
    expect(hero!.querySelector('.item-delete-confirm')).toBeNull()
    expect(rig.session.getHistoryVersion()).toBe(historyBeforeCancel)
    expect(itemAt(rig)).toEqual(initialItem)
    expect(notices.length).toBe(noticesBeforeCancel)

    // 确认删除：真实引用 oracle 放行，带成功通知；撤销恢复完整物品。
    await act(async () => buttonByLabel(hero!, '删除').click())
    await act(async () => buttonByLabel(hero!, '确认').click())
    expect(notices.at(-1)).toEqual({ kind: 'info', message: '已删除 止血草；可用撤销恢复。' })
    expect(rig.session.getState().items).toEqual([])
    expect(host.textContent).toContain('项目还没有物品')
    undo(rig)
    expect(itemAt(rig)).toEqual(initialItem)
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('herb')
    assertK10SaveValid(rig)
  })

  test('添加当前物品脚本：壳引用/canonical 身份/通知/序列化落盘全输出与配对撤销重做；缺协调器拒绝', async () => {
    const rig = await loadK10ItemProject('k10-tab-private-add', {
      items: [
        {
          id: 'orb',
          name: '圣灵珠',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 10 }] },
        },
      ],
    })
    const { notices } = await mountTab(rig)

    const history0 = rig.session.getHistoryVersion()
    await act(async () => buttonByLabel(useChain(), '添加当前物品脚本').click())

    // 壳侧：追加的 runtime 私有引用精确落库（旧前缀不得复活：chunk 全等断言）。
    expect(rig.session.getHistoryVersion()).toBe(history0 + 1)
    expect(itemAt(rig).use).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [
        { kind: 'healHp', amount: 10 },
        { kind: 'runScript', script: { chunk: PRIVATE_CHUNK, id: 'orb' } },
      ],
    })
    // canonical 侧：身份（固定 id 'use' + 以当前物品名生成的 label）与空正文。
    expect(canonicalItemAt(rig.scriptSession).use?.effects).toEqual([
      { kind: 'healHp', amount: 10 },
      { kind: 'itemPrivateScript', script: { id: 'use', label: '圣灵珠使用脚本', body: [] } },
    ])
    expect(notices.at(-1)).toEqual({
      kind: 'info',
      message: '已添加当前物品脚本「圣灵珠使用脚本」，可直接编辑正文。',
    })
    expect(host.querySelector('[data-item-private-script="圣灵珠使用脚本"]')).not.toBeNull()
    assertK10SaveValid(rig)

    // 经真实内联编辑器写入正文：壳侧引用不动，canonical 正文落库。
    // 选「等待」指令（无世界变量引用），保存门对世界变量登记 fail-closed。
    const privateCard = host.querySelector<HTMLElement>(
      '[data-item-private-script="圣灵珠使用脚本"]',
    )!
    await act(async () => buttonByLabel(privateCard, '添加第一条指令').click())
    const insertWait = host.querySelector<HTMLButtonElement>('[data-command-kinds="wait"]')
    expect(insertWait, '插入指令 wait').not.toBeNull()
    await act(async () => insertWait!.click())
    const body = [{ kind: 'wait', ms: 200 }]
    expect(canonicalItemAt(rig.scriptSession).use?.effects).toEqual([
      { kind: 'healHp', amount: 10 },
      { kind: 'itemPrivateScript', script: { id: 'use', label: '圣灵珠使用脚本', body } },
    ])
    expect(itemAt(rig).use?.effects).toEqual([
      { kind: 'healHp', amount: 10 },
      { kind: 'runScript', script: { chunk: PRIVATE_CHUNK, id: 'orb' } },
    ])

    // 完整输出：保存合并 → 真实序列化 → items.json 落盘形态含 canonical 私有正文。
    assertK10SaveValid(rig)
    const merged = assertK10SaveValidAndMerge(rig)
    const outputs = await serializeProjectWithMapCopies(merged, rig.source)
    const written = outputs['content/items.json']
    const diskItems = typeof written === 'string' ? JSON.parse(written) : written
    expect(diskItems).toEqual([
      {
        id: 'orb',
        name: '圣灵珠',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [
            { kind: 'healHp', amount: 10 },
            { kind: 'itemPrivateScript', script: { id: 'use', label: '圣灵珠使用脚本', body } },
          ],
        },
      },
    ])

    // 配对撤销：先撤正文编辑（脚本侧条目），再一次成对撤壳引用+canonical 壳。
    undo(rig)
    expect(canonicalItemAt(rig.scriptSession).use?.effects).toEqual([
      { kind: 'healHp', amount: 10 },
      { kind: 'itemPrivateScript', script: { id: 'use', label: '圣灵珠使用脚本', body: [] } },
    ])
    expect(itemAt(rig).use?.effects).toHaveLength(2)
    undo(rig)
    expect(itemAt(rig).use?.effects).toEqual([{ kind: 'healHp', amount: 10 }])
    expect(canonicalItemAt(rig.scriptSession).use?.effects).toEqual([
      { kind: 'healHp', amount: 10 },
    ])
    redo(rig)
    expect(itemAt(rig).use?.effects).toHaveLength(2)
    redo(rig)
    expect(canonicalItemAt(rig.scriptSession).use?.effects).toEqual([
      { kind: 'healHp', amount: 10 },
      { kind: 'itemPrivateScript', script: { id: 'use', label: '圣灵珠使用脚本', body } },
    ])
    assertK10SaveValid(rig)

    // 缺历史协调器：script 在场时入口仍渲染，点击明确拒绝且双侧零提交。
    const solo = await loadK10ItemProject(
      'k10-tab-private-add-solo',
      {
        items: [
          {
            id: 'orb',
            name: '圣灵珠',
            desc: [],
            buyPrice: 0,
            sellPrice: 0,
            sellable: false,
            use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 10 }] },
          },
        ],
      },
      { paired: false },
    )
    const soloMount = await mountTab(solo)
    const soloNotices = soloMount.notices
    const soloMain = deepSnapshot(solo.session.getState().items)
    const soloCanonical = deepSnapshot(solo.scriptSession.getStateSnapshot().items)
    const soloHistory = [solo.session.getHistoryVersion(), solo.scriptSession.getHistoryVersion()]
    await act(async () => buttonByLabel(useChain(), '添加当前物品脚本').click())
    expect(soloNotices.at(-1)).toEqual({
      kind: 'error',
      message: '缺 EditorHistoryCoordinator，无法安全添加当前物品脚本',
    })
    expect(solo.session.getState().items).toEqual(soloMain)
    expect(solo.scriptSession.getStateSnapshot().items).toEqual(soloCanonical)
    expect([solo.session.getHistoryVersion(), solo.scriptSession.getHistoryVersion()]).toEqual(
      soloHistory,
    )
  })

  test('两个物品各自的私有脚本 owner 身份隔离：选中切换与正文编辑只写当前物品', async () => {
    const rig = await loadK10ItemProject('k10-tab-private-owner', {
      items: [
        {
          id: 'orb-a',
          name: '风灵珠',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: false,
            effects: [
              {
                kind: 'itemPrivateScript',
                script: { id: 'use', label: '风灵珠使用', body: [{ kind: 'clearDialog' }] },
              },
            ],
          },
        },
        {
          id: 'orb-b',
          name: '雷灵珠',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: {
            target: 'scene',
            consuming: false,
            effects: [
              {
                kind: 'itemPrivateScript',
                script: { id: 'use', label: '雷灵珠使用', body: [{ kind: 'wait', ms: 5 }] },
              },
            ],
          },
        },
      ],
    })
    const { notices } = await mountTab(rig)

    // 装载即隔离：壳侧各自带 owner 身份的 runtime 引用，canonical 各自正文。
    expect(itemAt(rig, 0).use?.effects).toEqual([
      { kind: 'runScript', script: { chunk: PRIVATE_CHUNK, id: 'orb-a' } },
    ])
    expect(itemAt(rig, 1).use?.effects).toEqual([
      { kind: 'runScript', script: { chunk: PRIVATE_CHUNK, id: 'orb-b' } },
    ])
    expect(canonicalItemAt(rig.scriptSession, 0).use?.effects).toEqual([
      {
        kind: 'itemPrivateScript',
        script: { id: 'use', label: '风灵珠使用', body: [{ kind: 'clearDialog' }] },
      },
    ])
    expect(canonicalItemAt(rig.scriptSession, 1).use?.effects).toEqual([
      {
        kind: 'itemPrivateScript',
        script: { id: 'use', label: '雷灵珠使用', body: [{ kind: 'wait', ms: 5 }] },
      },
    ])
    expect(host.querySelector('[data-item-private-script="风灵珠使用"]')).not.toBeNull()

    // 选中雷灵珠：内联编辑器切换到当前物品的绑定。
    const rowB = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find((row) =>
      row.textContent?.includes('雷灵珠'),
    )
    expect(rowB, '目录行 雷灵珠').toBeDefined()
    await act(async () => rowB!.click())
    const cardB = host.querySelector<HTMLElement>('[data-item-private-script="雷灵珠使用"]')
    expect(cardB).not.toBeNull()
    expect(host.querySelector('[data-item-private-script="风灵珠使用"]')).toBeNull()

    // 在雷灵珠正文追加一条指令：只有 orb-b 的 canonical 正文变化。
    await act(async () => buttonByLabel(cardB!, '添加指令').click())
    const insertWait = host.querySelector<HTMLButtonElement>('[data-command-kinds="wait"]')
    expect(insertWait, '插入指令 wait').not.toBeNull()
    await act(async () => insertWait!.click())
    const bodyB = [
      { kind: 'wait', ms: 5 },
      { kind: 'wait', ms: 200 },
    ]
    expect(canonicalItemAt(rig.scriptSession, 1).use?.effects).toEqual([
      { kind: 'itemPrivateScript', script: { id: 'use', label: '雷灵珠使用', body: bodyB } },
    ])
    expect(canonicalItemAt(rig.scriptSession, 0).use?.effects).toEqual([
      {
        kind: 'itemPrivateScript',
        script: { id: 'use', label: '风灵珠使用', body: [{ kind: 'clearDialog' }] },
      },
    ])
    // 壳侧两件物品都仍只是各自 owner 的引用（正文不进壳）。
    expect(itemAt(rig, 0).use?.effects).toEqual([
      { kind: 'runScript', script: { chunk: PRIVATE_CHUNK, id: 'orb-a' } },
    ])
    expect(itemAt(rig, 1).use?.effects).toEqual([
      { kind: 'runScript', script: { chunk: PRIVATE_CHUNK, id: 'orb-b' } },
    ])
    assertK10SaveValid(rig)

    // 正文编辑经协调器撤销/重做，另一物品全程不动。
    undo(rig)
    expect(canonicalItemAt(rig.scriptSession, 1).use?.effects).toEqual([
      {
        kind: 'itemPrivateScript',
        script: { id: 'use', label: '雷灵珠使用', body: [{ kind: 'wait', ms: 5 }] },
      },
    ])
    redo(rig)
    expect(canonicalItemAt(rig.scriptSession, 1).use?.effects).toEqual([
      { kind: 'itemPrivateScript', script: { id: 'use', label: '雷灵珠使用', body: bodyB } },
    ])

    // 切回风灵珠：绑定仍指向 orb-a 的正文。
    const rowA = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find((row) =>
      row.textContent?.includes('风灵珠'),
    )
    await act(async () => rowA!.click())
    expect(host.querySelector('[data-item-private-script="风灵珠使用"]')).not.toBeNull()
    expect(host.querySelector('[data-item-private-script="雷灵珠使用"]')).toBeNull()
    expect(canonicalItemAt(rig.scriptSession, 0).use?.effects).toEqual([
      {
        kind: 'itemPrivateScript',
        script: { id: 'use', label: '风灵珠使用', body: [{ kind: 'clearDialog' }] },
      },
    ])
    expect(notices.every((notice) => notice === undefined || notice.kind === 'info')).toBe(true)
  })

  test('关闭使用能力配对删除私有脚本并通知；缺历史协调器时拒绝且双侧零提交', async () => {
    const seedItem = {
      id: 'orb-c',
      name: '土灵珠',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene' as const,
        consuming: false,
        effects: [
          {
            kind: 'itemPrivateScript' as const,
            script: { id: 'use', label: '土灵珠使用', body: [{ kind: 'clearDialog' as const }] },
          },
        ],
      },
    }
    const rig = await loadK10ItemProject('k10-tab-private-remove', { items: [seedItem] })
    const { notices } = await mountTab(rig)
    expect(capabilitySwitch('启用使用能力').checked).toBe(true)

    // 取消（关闭开关）侧：配对删除壳引用 + canonical 正文，一条信息通知。
    const history0 = rig.session.getHistoryVersion()
    await act(async () => capabilitySwitch('启用使用能力').click())
    expect(rig.session.getHistoryVersion()).toBe(history0 + 1)
    expect(notices.at(-1)).toEqual({ kind: 'info', message: '已删除 土灵珠 的当前物品脚本。' })
    expect(itemAt(rig).use).toBeUndefined()
    expect('use' in itemAt(rig)).toBe(false)
    expect(canonicalItemAt(rig.scriptSession).use?.effects).toEqual([])
    expect(capabilitySwitch('启用使用能力').checked).toBe(false)
    assertK10SaveValid(rig)

    // 一次撤销成对恢复壳引用与 canonical 正文；重做再删。
    undo(rig)
    expect(itemAt(rig).use).toEqual({
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'runScript', script: { chunk: PRIVATE_CHUNK, id: 'orb-c' } }],
    })
    expect(canonicalItemAt(rig.scriptSession).use?.effects).toEqual([
      {
        kind: 'itemPrivateScript',
        script: { id: 'use', label: '土灵珠使用', body: [{ kind: 'clearDialog' }] },
      },
    ])
    expect(capabilitySwitch('启用使用能力').checked).toBe(true)
    redo(rig)
    expect(itemAt(rig).use).toBeUndefined()
    expect(canonicalItemAt(rig.scriptSession).use?.effects).toEqual([])
    assertK10SaveValid(rig)

    // 缺历史协调器：拒绝并保留双侧原状，开关仍处开启态。
    const solo = await loadK10ItemProject(
      'k10-tab-private-remove-solo',
      { items: [seedItem] },
      { paired: false },
    )
    const soloMount = await mountTab(solo)
    const soloMain = deepSnapshot(solo.session.getState().items)
    const soloCanonical = deepSnapshot(solo.scriptSession.getStateSnapshot().items)
    const soloHistory = [solo.session.getHistoryVersion(), solo.scriptSession.getHistoryVersion()]
    await act(async () => capabilitySwitch('启用使用能力').click())
    expect(soloMount.notices.at(-1)).toEqual({
      kind: 'error',
      message: '缺少脚本历史协调器，无法安全删除当前物品脚本。',
    })
    expect(solo.session.getState().items).toEqual(soloMain)
    expect(solo.scriptSession.getStateSnapshot().items).toEqual(soloCanonical)
    expect([solo.session.getHistoryVersion(), solo.scriptSession.getHistoryVersion()]).toEqual(
      soloHistory,
    )
    expect(capabilitySwitch('启用使用能力').checked).toBe(true)
  })
})

/** 保存门 + 返回合并态（供序列化输出断言）。 */
function assertK10SaveValidAndMerge(rig: K10ItemRig) {
  assertK10SaveValid(rig)
  return mergeEditorProjectionWithCurrentAuthorState(
    rig.scriptSession.getState(),
    rig.session.getState(),
  )
}
