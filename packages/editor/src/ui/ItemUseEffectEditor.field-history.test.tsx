// @vitest-environment jsdom
/**
 * 永久成长与明雷感知字段经真实效果组件和 UpdateItemCommand 提交。
 * 与纯默认值测试分开：这里观察字段修改、保存校验和撤销重做。
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

function makeItem(id: string, name: string): ItemData {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
}

const emptyUseSpec: UseSpec = { target: 'oneAlly', consuming: true, effects: [] }

async function legalSessionWithUse(): Promise<EditSession> {
  const { state } = await loadLegalProject('glm-wave-m-use-effects')
  const items: ItemData[] = [
    { ...makeItem('item-use-m', '醒神丹'), use: structuredClone(emptyUseSpec) },
    makeItem('item-use-other', '旁证物品'),
  ]
  const next = { ...state, items }
  assertProjectSaveValid(next)
  return new EditSession(next)
}

function EffectFieldsHarness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const item = current.items[0]!
  const spec = item.use ?? emptyUseSpec
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
      onError={(message) => effectErrors.push(message)}
    />
  )
}

let root: Root
let host: HTMLDivElement
let effectErrors: string[]

beforeEach(async () => {
  effectErrors = []
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  await stubNodeTestHost()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
    expect(effectErrors).toEqual([])
  } finally {
    host.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

/** 效果卡类型切换（第一张卡的 `效果 1 类型` 组合框）。 */
async function switchEffectKind(label: string): Promise<void> {
  const card = host.querySelector<HTMLElement>('[data-effect-editor-card]')
  expect(card, '效果卡').not.toBeNull()
  const trigger = card!.querySelector<HTMLButtonElement>('[aria-label="效果 1 类型"]')
  expect(trigger, '效果 1 类型').not.toBeNull()
  await pickCombobox(trigger!, label)
}

describe('ItemEffectChainEditor 字段与历史', () => {
  test('永久成长：改类落默认 maxHP+5，属性/增量逐字段提交，undo/redo 对称且过保存门', async () => {
    const session = await legalSessionWithUse()
    await act(async () => {
      root.render(<EffectFieldsHarness session={session} />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()

    // 空链先经「添加效果」产生首卡（默认 healHp），再切到目标类型。
    await act(async () => buttonByText(host, '添加效果').click())
    expect(session.getState().items[0]!.use?.effects).toEqual([{ kind: 'healHp', amount: 100 }])
    await switchEffectKind('永久成长')
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

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'magicAttack', delta: 5 },
    ])
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'maxHP', delta: 5 },
    ])
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().items[0]!.use?.effects).toEqual([{ kind: 'healHp', amount: 100 }])
    await act(async () => {
      expect(session.redo()).toBe(true)
    })
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'maxHP', delta: 5 },
    ])
  })

  test('明雷感知：改类落默认停止追逐 60 秒，扩 3 倍与持续毫秒逐字段提交', async () => {
    const session = await legalSessionWithUse()
    await act(async () => {
      root.render(<EffectFieldsHarness session={session} />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()

    await act(async () => buttonByText(host, '添加效果').click())
    await switchEffectKind('调整明雷感知')
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

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'modifyHostileAwareness', rangeMultiplier: 3, durationMs: 60_000 },
    ])
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().items[0]!.use?.effects).toEqual([
      { kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 60_000 },
    ])
  })
})
