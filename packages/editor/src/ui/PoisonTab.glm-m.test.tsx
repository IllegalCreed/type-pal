// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M04（PoisonTab.glm-m）：毒逐回合序列与关系当前合同。
 * 去重：PoisonTab.test.tsx（12 例）/ glm-leaf-wave 已证目录/新建/可解度/染色/删除门/live oracle；
 * 关键词「扣血/半血/产道具/自解/致死配对/所克之毒」在全旧测零命中。本文件只补：
 * 玩家 tick 四字段逐轴提交与撤销、敌人序列独立（改敌人不动玩家）、致死配对/所克之毒
 * 选择写入关系键并产生 poison-poison 引用，undo 精确删键。
 */
import type { ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  clickCheckboxByLabelText,
  comboboxTrigger,
  controlByLabel,
  fillAndBlur,
  loadLegalProject,
  pickCombobox,
  stubNodeTestHost,
} from '../__tests__/glm-m/kit.js'
import { collectBattleDataReferences } from '../core/battle-data-references.js'
import { EditSession } from '../core/edit-session.js'
import { AddPoisonCommand } from '../core/poison-commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { PoisonTab } from './PoisonTab.js'

const ITEMS: ItemData[] = [
  { id: 'item-poison-m', name: '解毒丹', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
]

function Harness(props: { session: EditSession }) {
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
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  await stubNodeTestHost()
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

/** 合法项目 + 真实建毒（缺省双序列 [{hpDelta:-10}]），可选第二毒供关系选择。 */
async function poisonedSession(withSecond = false): Promise<EditSession> {
  const { state } = await loadLegalProject('glm-wave-m-poison')
  const next = { ...state, items: ITEMS }
  assertProjectSaveValid(next)
  const session = new EditSession(next)
  session.dispatch(new AddPoisonCommand(1, '赤蝎粉'))
  if (withSecond) session.dispatch(new AddPoisonCommand(2, '孔雀胆'))
  return session
}

async function mountSession(session: EditSession): Promise<void> {
  await act(async () => {
    root.render(<Harness session={session} />)
    await Promise.resolve()
  })
}

function poison(session: EditSession, id = 1) {
  return session.getState().poisons!.find((entry) => entry.id === id)!
}

describe('M04 PoisonTab 逐回合序列与关系当前合同', () => {
  test('玩家 tick 四轴：扣血/半血/产道具/自解逐字段提交，undo 逐步还原', async () => {
    const session = await poisonedSession()
    await mountSession(session)
    const before = session.getHistoryVersion()

    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '扣血'), '-25')
    expect(poison(session).playerTicks).toEqual([{ hpDelta: -25 }])
    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '半血上限'), '2')
    expect(poison(session).playerTicks).toEqual([{ hpDelta: -25, halveHp: 2 }])

    await pickCombobox(comboboxTrigger(host, '产道具'), '解毒丹')
    expect(poison(session).playerTicks).toEqual([
      { hpDelta: -25, halveHp: 2, grantItem: 'item-poison-m' },
    ])

    await clickCheckboxByLabelText(host, '自解')
    expect(poison(session).playerTicks).toEqual([
      { hpDelta: -25, halveHp: 2, grantItem: 'item-poison-m', selfCure: true },
    ])
    expect(session.getHistoryVersion()).toBe(before + 4)
    assertProjectSaveValid(session.getState())

    expect(session.undo()).toBe(true)
    expect(poison(session).playerTicks).toEqual([
      { hpDelta: -25, halveHp: 2, grantItem: 'item-poison-m' },
    ])
    expect(session.undo()).toBe(true)
    expect(poison(session).playerTicks).toEqual([{ hpDelta: -25, halveHp: 2 }])
    expect(session.undo()).toBe(true)
    expect(poison(session).playerTicks).toEqual([{ hpDelta: -25 }])
    expect(session.undo()).toBe(true)
    expect(poison(session).playerTicks).toEqual([{ hpDelta: -10 }])
  })

  test('敌人序列独立：改敌人 tick 不动玩家序列', async () => {
    const session = await poisonedSession()
    await mountSession(session)
    const sections = [...host.querySelectorAll('.ds-workbench-section')].filter((node) =>
      node.textContent?.includes('敌人中毒 · 逐回合'),
    )
    expect(sections).toHaveLength(1)
    const enemyHpLabel = [...sections[0]!.querySelectorAll<HTMLLabelElement>('label')].find(
      (candidate) => candidate.textContent?.trim() === '扣血',
    )
    expect(enemyHpLabel).not.toBeNull()
    const input = enemyHpLabel!.htmlFor
      ? (document
          .querySelector(`[data-ds-control-id="${enemyHpLabel!.htmlFor}"]`)
          ?.querySelector<HTMLInputElement>('input') ??
        (document.getElementById(enemyHpLabel!.htmlFor) as HTMLInputElement | null))
      : enemyHpLabel!.querySelector<HTMLInputElement>('input')
    expect(input, '敌人扣血输入').not.toBeNull()
    await fillAndBlur(input!, '-40')
    expect(poison(session).enemyTicks).toEqual([{ hpDelta: -40 }])
    expect(poison(session).playerTicks).toEqual([{ hpDelta: -10 }])
  })

  test('致死配对/所克之毒写入关系键并产生 poison-poison 引用；undo 精确删键', async () => {
    const session = await poisonedSession(true)
    await mountSession(session)
    const before = session.getHistoryVersion()
    const referencesBefore = collectBattleDataReferences(session.getState(), 'poison', {
      includeScriptCommands: false,
    }).filter((entry) => entry.kind === 'poison-counter')

    await pickCombobox(comboboxTrigger(host, '致死配对'), '孔雀胆')
    expect(poison(session).lethalWith).toBe(2)
    await pickCombobox(comboboxTrigger(host, '所克之毒'), '孔雀胆')
    expect(poison(session).counters).toBe(2)
    expect(session.getHistoryVersion()).toBe(before + 2)

    const counters = collectBattleDataReferences(session.getState(), 'poison', {
      includeScriptCommands: false,
    }).filter((entry) => entry.kind === 'poison-counter')
    expect(counters.length).toBe(referencesBefore.length + 1)
    // 相克边：owner=毒1，指向毒2（targetId 是被克的目标毒）。
    expect(counters.at(-1)).toMatchObject({ targetId: '2', detail: '相克关系' })
    expect(counters.at(-1)?.locator).toEqual({ kind: 'poison', poisonId: 1 })
    assertProjectSaveValid(session.getState())

    expect(session.undo()).toBe(true)
    expect(poison(session).counters).toBeUndefined()
    expect(session.undo()).toBe(true)
    expect(poison(session).lethalWith).toBeUndefined()
  })
})
