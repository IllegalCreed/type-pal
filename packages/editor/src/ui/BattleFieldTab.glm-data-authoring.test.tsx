// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1（BattleFieldTab）：战场删除链与深链 focus 合同。
 * 去重（旧证据锚点）：
 * - BattleFieldTab.test.tsx 已证目录/搜索/深链挂载、首次创建登记 manifest、引用面板与跳转、
 *   checking/stale/failed fail-closed、current-without-index、live oracle 阻断与失败。
 * - BattleFieldTab.glm-m.test.tsx 已证复制、创建取消/非法编号、常驻波动提交、预览资源失败面。
 * - BattleFieldTab.glm-leaf-wave.test.tsx 已证背景选/清、五灵逐键 patch、名称清空删键。
 * 缺口（本文件）：
 * 1. 零引用战场确认删除全链——旧测只证「被引用时阻断」，从未证 confirm=true 的成功删除：
 *    单命令落账、选中经 stale-selection effect 回退 sorted[0] 并回报 onObjectFocus、
 *    undo 原位还原（完整深值）。seed 的场景不引用任何战场，删除面为零引用。
 * 2. 创建卡打开时收到深链 focus（focus effect 的 setCreating(false) 臂）——旧测深链只在
 *    挂载期生效，未证创建中途被父级深链打断会退出创建且零命令。
 * 底座为真实 blank 项目（loader→toEditorState 自证）+ 生产 AddBattleFieldCommand 播种。
 */
import type { BattleFieldDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import type { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AddBattleFieldCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  clickButton,
  createDataBattleHost,
  type DataBattleHost,
  destroyDataBattleHost,
  undoInAct,
} from './__tests__/glm-data-battle-kit.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { BattleFieldTab } from './BattleFieldTab.js'

const EMPTY_MAGIC_EFFECT = { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }

function field(id: number, name: string): BattleFieldDef {
  return { id, name, screenWave: 0, magicEffect: { ...EMPTY_MAGIC_EFFECT } }
}

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(async () => {
  const mounted = await createDataBattleHost()
  host = mounted.host
  root = mounted.root
})

afterEach(async () => {
  await destroyDataBattleHost({ host, root } satisfies DataBattleHost)
})

/** 订阅 session 版本的真实挂载；focus 由父级 prop 深链驱动（同 DataMode 调用域）。 */
function Harness(props: {
  session: EditSession
  assetBase: import('@type-pal/reforge').AssetBase
  reader: ReturnType<typeof createEditorAssetReader>
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <BattleFieldTab
      battleFields={current.battleFields ?? []}
      assetBase={props.assetBase}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={props.reader}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(next) => collectCurrentProjectReferenceIndex(next)}
      focusObjectId={props.focusObjectId}
      onObjectFocus={props.onObjectFocus}
    />
  )
}

interface MountedBattleField {
  session: EditSession
  assetBase: import('@type-pal/reforge').AssetBase
  reader: ReturnType<typeof createEditorAssetReader>
}

/** 合法 blank 项目 + 真实命令播种战场；播种即断言可保存。 */
async function seeded(fields: BattleFieldDef[]): Promise<MountedBattleField> {
  const legal = await loadLegalUiProject('glm-data-battle-battlefield')
  let state = legal.state
  for (const entry of fields) state = new AddBattleFieldCommand(entry).apply(state)
  assertProjectSaveValid(state)
  const session = new EditSession(state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  return { session, assetBase: legal.assetBase, reader }
}

async function mount(
  bundle: MountedBattleField,
  props: { focusObjectId?: string; onObjectFocus?: (id: string | undefined) => void } = {},
): Promise<void> {
  await act(async () => {
    root.render(
      <Harness
        session={bundle.session}
        assetBase={bundle.assetBase}
        reader={bundle.reader}
        focusObjectId={props.focusObjectId}
        onObjectFocus={props.onObjectFocus}
      />,
    )
    await Promise.resolve()
  })
}

describe('TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 BattleFieldTab', () => {
  test('零引用战场确认删除：单命令落账、选中回退并回报 focus，undo 原位还原完整深值', async () => {
    const bundle = await seeded([field(6, '云海'), field(7, '荒原')])
    const focusLog: Array<string | undefined> = []
    await mount(bundle, { focusObjectId: '7', onObjectFocus: (id) => focusLog.push(id) })
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('#007')

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const historyBefore = bundle.session.getHistoryVersion()
    const fieldsBefore = structuredClone(bundle.session.getState().battleFields)
    await clickButton(host, '删除战场')
    expect(confirm).toHaveBeenCalledWith('删除“荒原”？此操作可以撤销。')
    expect(bundle.session.getHistoryVersion()).toBe(historyBefore + 1)
    expect(bundle.session.getState().battleFields?.map((entry) => entry.id)).toEqual([6])
    assertProjectSaveValid(bundle.session.getState())
    // 删除成功后 notice 清空；选中经 stale-selection effect 回退到剩余第一项并回报父级。
    expect(host.querySelector('[role="alert"]')).toBeNull()
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('#006')
    expect(focusLog.at(-1)).toBe('6')

    // undo 原位还原完整战场深值；父级深链 '7' 仍在，战场回归后被 focus effect 重新选中。
    expect(undoInAct(bundle.session)).toBe(true)
    expect(bundle.session.getState().battleFields).toEqual(fieldsBefore)
    assertProjectSaveValid(bundle.session.getState())
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('#007')
  })

  test('创建卡打开时收到深链 focus：退出创建、聚焦目标战场且零命令', async () => {
    const bundle = await seeded([field(6, '云海'), field(7, '荒原')])
    const focusLog: Array<string | undefined> = []
    await mount(bundle, { onObjectFocus: (id) => focusLog.push(id) })
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('#006')

    const historyBefore = bundle.session.getHistoryVersion()
    await clickButton(host, '新建战场')
    expect(host.querySelector('.bf-create-card')).not.toBeNull()
    // beginCreate 交出 focus（创建未定前不属于任何战场）。
    expect(focusLog.at(-1)).toBeUndefined()

    // 父级深链到达（同 DataMode 调用域的受控 focus prop）：创建卡退出、选中聚焦 #007。
    await act(async () => {
      root.render(
        <Harness
          session={bundle.session}
          assetBase={bundle.assetBase}
          reader={bundle.reader}
          focusObjectId="7"
          onObjectFocus={(id) => focusLog.push(id)}
        />,
      )
    })
    expect(host.querySelector('.bf-create-card')).toBeNull()
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('#007')
    expect(bundle.session.getHistoryVersion()).toBe(historyBefore)
    expect(bundle.session.getState().battleFields).toHaveLength(2)
    assertProjectSaveValid(bundle.session.getState())
  })
})
