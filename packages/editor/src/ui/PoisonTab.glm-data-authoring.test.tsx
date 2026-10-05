// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1（PoisonTab）：tick 增删清键与关系总览合同。
 * 去重（旧证据锚点）：
 * - PoisonTab.test.tsx（12 例）已证目录/搜索/深链、新建 prompt、名字批提交、删除+undo、
 *   tick 键盘重排、双序列删除（2→1）、fail-closed、self-relation、live 重验、oracle 失败。
 * - PoisonTab.glm-m.test.tsx 已证玩家 tick 四字段逐轴提交/撤销、敌人序列独立、
 *   致死配对/所克之毒写入关系键并产生 poison-poison 引用。
 * - PoisonTab.glm-leaf-wave.test.tsx 已证可解度切换、染色步进、未知深链回落。
 * 缺口（本文件）：
 * 1. 「添加回合」按钮与「删到零清键」——旧测只从 ≥2 格删到 1 格；onRemove 的
 *    `arr.length ? arr : undefined` 分支（清空=整键删除，落盘不留空数组）与
 *    添加按钮的缺省 `{hpDelta:-10}` 补格从未经 UI 证明。
 * 2. 关系总览（RelationOverview）派生——不对称致死对 ⚠ 警告、相克链闭环 ⟲ 推导、
 *    visited 去重只呈一条链、rel-poison 点击 onPick 联动选毒，全旧测零命中
 *    （关键词「不对称/相克链/rel-chain/rel-warn」全仓测试零命中）。
 * 底座为真实 blank 项目 + 生产 AddPoisonCommand/UpdatePoisonCommand 播种。
 */
import { act, useSyncExternalStore } from 'react'
import type { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { AddPoisonCommand, UpdatePoisonCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  buttonByText,
  createDataBattleHost,
  type DataBattleHost,
  destroyDataBattleHost,
  undoInAct,
} from './__tests__/glm-data-battle-kit.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { PoisonTab } from './PoisonTab.js'

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

function Harness(props: {
  session: EditSession
  onObjectFocus?: (id: string | undefined) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <PoisonTab
      poisons={current.poisons ?? []}
      items={current.items}
      session={props.session}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(next) => collectCurrentProjectReferenceIndex(next)}
      onObjectFocus={props.onObjectFocus}
    />
  )
}

async function mount(
  session: EditSession,
  onObjectFocus?: (id: string | undefined) => void,
): Promise<void> {
  await act(async () => {
    root.render(<Harness session={session} onObjectFocus={onObjectFocus} />)
    await Promise.resolve()
  })
}

async function legalSession(): Promise<EditSession> {
  const legal = await loadLegalUiProject('glm-data-battle-poison')
  assertProjectSaveValid(legal.state)
  return new EditSession(legal.state)
}

function poisonOf(session: EditSession, id: number) {
  const poison = session.getState().poisons?.find((entry) => entry.id === id)
  if (!poison) throw new Error(`poison not found: ${id}`)
  return poison
}

/** 按区块标题（玩家/敌人中毒 · 逐回合）定位 TicksEditor 作用域。 */
function tickSection(title: string): HTMLElement {
  const section = [...host.querySelectorAll<HTMLElement>('.ds-workbench-section')].find((node) =>
    node.querySelector('h2')?.textContent?.includes(title),
  )
  if (!section) throw new Error(`tick section not found: ${title}`)
  return section
}

describe('TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 PoisonTab', () => {
  test('删到零=整键删除不留空数组；「添加回合」以缺省 {hpDelta:-10} 补格，逐格单命令可撤销', async () => {
    const session = await legalSession()
    session.dispatch(new AddPoisonCommand(1, '赤蝎粉'))
    await mount(session)
    expect(host.querySelector('h1')?.textContent).toBe('赤蝎粉')
    expect(poisonOf(session, 1).playerTicks).toEqual([{ hpDelta: -10 }])
    expect(poisonOf(session, 1).enemyTicks).toEqual([{ hpDelta: -10 }])
    const historyAtMount = session.getHistoryVersion()

    // 删到零：playerTicks 整键删除（undefined，非空数组），enemyTicks 不受污染。
    await act(async () => {
      buttonByText(tickSection('玩家中毒 · 逐回合'), '删除回合 1').click()
    })
    expect(poisonOf(session, 1).playerTicks).toBeUndefined()
    expect(poisonOf(session, 1).enemyTicks).toEqual([{ hpDelta: -10 }])
    expect(session.getHistoryVersion()).toBe(historyAtMount + 1)
    assertProjectSaveValid(session.getState())

    // undo 精确还原整键（undo/redo 同样推进历史版本计数）。
    expect(undoInAct(session)).toBe(true)
    expect(poisonOf(session, 1).playerTicks).toEqual([{ hpDelta: -10 }])
    expect(session.getHistoryVersion()).toBe(historyAtMount + 2)

    // 敌人序列同样删到零清键；「添加回合」为玩家序列补一格缺省 tick。
    await act(async () => {
      buttonByText(tickSection('敌人中毒 · 逐回合'), '删除回合 1').click()
    })
    expect(poisonOf(session, 1).enemyTicks).toBeUndefined()
    await act(async () => {
      buttonByText(tickSection('玩家中毒 · 逐回合'), '添加回合').click()
    })
    expect(poisonOf(session, 1).playerTicks).toEqual([{ hpDelta: -10 }, { hpDelta: -10 }])
    expect(poisonOf(session, 1).enemyTicks).toBeUndefined()
    expect(session.getHistoryVersion()).toBe(historyAtMount + 4)
    assertProjectSaveValid(session.getState())
    // 播种键身份复核：UI 删除后添加的第二格与缺省深值一致。
    expect(undoInAct(session)).toBe(true)
    expect(poisonOf(session, 1).playerTicks).toEqual([{ hpDelta: -10 }])
  })

  test('关系总览：不对称致死对 ⚠ 警告、相克闭环单链 ⟲、rel-poison 点击联动选毒并回报 focus', async () => {
    const session = await legalSession()
    session.dispatch(new AddPoisonCommand(1, '赤蝎粉'))
    session.dispatch(new AddPoisonCommand(2, '孔雀胆'))
    session.dispatch(new AddPoisonCommand(3, '断肠草'))
    // 致死对单向（1→2，2 不指回）→ 不对称；相克 1→2→3→1 → 单条闭环链。
    session.dispatch(new UpdatePoisonCommand(1, { lethalWith: 2 }))
    session.dispatch(new UpdatePoisonCommand(1, { counters: 2 }))
    session.dispatch(new UpdatePoisonCommand(2, { counters: 3 }))
    session.dispatch(new UpdatePoisonCommand(3, { counters: 1 }))
    assertProjectSaveValid(session.getState())

    const focusLog: Array<string | undefined> = []
    await mount(session, (id) => focusLog.push(id))
    expect(host.querySelector('h1')?.textContent).toBe('赤蝎粉')
    const historyAtMount = session.getHistoryVersion()

    const relationsTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => candidate.textContent?.trim() === '关系',
    )
    if (!relationsTab) throw new Error('relations tab not found')
    await act(async () => {
      relationsTab.click()
    })

    // 致死对：唯一一对（去重），单向指回标 ⚠ 不对称。
    const pairLines = [...host.querySelectorAll<HTMLElement>('.rel-line:not(.rel-chain)')]
    expect(pairLines).toHaveLength(1)
    expect(pairLines[0]!.textContent).toContain('赤蝎粉')
    expect(pairLines[0]!.textContent).toContain('孔雀胆')
    const warn = pairLines[0]!.querySelector<HTMLElement>('.rel-warn')
    expect(warn?.textContent).toContain('不对称')
    expect(warn?.title).toBe('仅单向指回:另一侧 lethalWith 没指回来')

    // 相克链：visited 去重后只呈一条闭环链（1→2→3→1），尾部 ⟲ 收口标记。
    const chains = [...host.querySelectorAll<HTMLElement>('.rel-chain')]
    expect(chains).toHaveLength(1)
    const chainNodes = [...chains[0]!.querySelectorAll<HTMLElement>('.rel-poison')]
    expect(chainNodes.map((node) => node.textContent)).toEqual(['赤蝎粉', '孔雀胆', '断肠草'])
    expect(chains[0]!.querySelector<HTMLElement>('[title="首尾闭环"]')).not.toBeNull()

    // onPick：点击链上「断肠草」联动选毒（h1 + onObjectFocus 回报），零命令。
    await act(async () => {
      chainNodes[2]!.click()
    })
    expect(host.querySelector('h1')?.textContent).toBe('断肠草')
    expect(focusLog.at(-1)).toBe('3')
    expect(session.getHistoryVersion()).toBe(historyAtMount)
    assertProjectSaveValid(session.getState())
  })
})
