// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M02（ItemUseEffectEditor.glm-m）：未被旧断言触达的使用效果分支。
 * 去重：ItemUseEffectEditor.test.tsx / glm-ui-wave U1c / kimi-workflows K10 已证结构化默认、
 * 链增删改排、目标/菜单/battleOnly、消耗自材料守卫、场景钩子独占、可复用脚本、解毒/施毒、
 * 投掷字段族与复活字段（revive hpPercent 45 由 K10 逐步落库）；本文件只补
 * 永久成长（属性/增量）与明雷感知（感知范围/持续毫秒）两条链上字段的真实会话提交。
 * 接线与 K10 同构：onChange 直接 dispatch UpdateItemCommand 到真实 EditSession。
 */

import type { ItemData, UseSpec } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buttonByText,
  controlByLabel,
  fillAndBlur,
  loadLegalProject,
  pickCombobox,
  stubNodeTestHost,
} from '../__tests__/glm-m/kit.js'
import { UpdateItemCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { ItemEffectChainEditor } from './ItemUseEffectEditor.js'

function plain(id: string, name: string): ItemData {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
}

const USE: UseSpec = { target: 'oneAlly', consuming: true, effects: [] }

async function legalSessionWithUse(): Promise<EditSession> {
  const { state } = await loadLegalProject('glm-wave-m-use-effects')
  const items: ItemData[] = [
    { ...plain('item-use-m', '醒神丹'), use: structuredClone(USE) },
    plain('item-use-other', '旁证物品'),
  ]
  const next = { ...state, items }
  assertProjectSaveValid(next)
  return new EditSession(next)
}

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const item = current.items[0]!
  const spec = item.use ?? USE
  return (
    <ItemEffectChainEditor
      ability="use"
      spec={spec}
      items={current.items}
      poisons={current.poisons ?? []}
      scripts={[]}
      itemId={item.id}
      scenes={current.scenes}
      sceneIndex={current.sceneIndex}
      draftScope={`item:${item.id}:use`}
      syncToken={props.session.getHistoryVersion()}
      onChange={(next) => {
        props.session.dispatch(new UpdateItemCommand(item.id, { use: next }))
      }}
      onError={() => undefined}
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

/** 效果卡类型切换（第一张卡的 `效果 1 类型` 组合框）。 */
async function switchEffectKind(session: EditSession, label: string): Promise<void> {
  const card = host.querySelector<HTMLElement>('[data-effect-editor-card]')
  expect(card, '效果卡').not.toBeNull()
  const trigger = card!.querySelector<HTMLButtonElement>('[aria-label="效果 1 类型"]')
  expect(trigger, '效果 1 类型').not.toBeNull()
  await pickCombobox(trigger!, label)
  expect(session.getHistoryVersion()).toBeGreaterThan(0)
}

describe('M02 ItemUseEffectEditor 未触达效果分支', () => {
  test('永久成长：改类落默认 maxHP+5，属性/增量逐字段提交，undo/redo 对称且过保存门', async () => {
    const session = await legalSessionWithUse()
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()

    // 空链先经「添加效果」产生首卡（默认 healHp），再切到目标类型。
    await buttonByText(host, '添加效果').click()
    expect(session.getState().items[0]!.use?.effects).toEqual([{ kind: 'healHp', amount: 100 }])
    await switchEffectKind(session, '永久成长')
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'maxHP', delta: 5 },
    ])
    assertProjectSaveValid(session.getState())

    const card = () => host.querySelector<HTMLElement>('[data-effect-editor-card]')!
    await pickCombobox(
      card().querySelector<HTMLButtonElement>('[aria-label="永久成长属性"]')!,
      '灵力',
    )
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'magicAttack', delta: 5 },
    ])

    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '增量'), '12')
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'magicAttack', delta: 12 },
    ])
    expect(session.getHistoryVersion()).toBe(before + 4)

    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'magicAttack', delta: 5 },
    ])
    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'maxHP', delta: 5 },
    ])
    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]!.use?.effects).toEqual([{ kind: 'healHp', amount: 100 }])
    expect(session.redo()).toBe(true)
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'maxHP', delta: 5 },
    ])
  })

  test('明雷感知：改类落默认停止追逐 60 秒，扩 3 倍与持续毫秒逐字段提交', async () => {
    const session = await legalSessionWithUse()
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()

    await buttonByText(host, '添加效果').click()
    await switchEffectKind(session, '调整明雷感知')
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 60_000 },
    ])

    const card = () => host.querySelector<HTMLElement>('[data-effect-editor-card]')!
    await pickCombobox(
      card().querySelector<HTMLButtonElement>('[aria-label="明雷感知范围"]')!,
      '扩大至 3 倍',
    )
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'modifyHostileAwareness', rangeMultiplier: 3, durationMs: 60_000 },
    ])

    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '持续毫秒'), '120000')
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'modifyHostileAwareness', rangeMultiplier: 3, durationMs: 120_000 },
    ])
    expect(session.getHistoryVersion()).toBe(before + 4)
    assertProjectSaveValid(session.getState())

    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'modifyHostileAwareness', rangeMultiplier: 3, durationMs: 60_000 },
    ])
    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 60_000 },
    ])
  })
})
