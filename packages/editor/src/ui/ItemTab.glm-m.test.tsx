// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M02（ItemTab.glm-m）：交易信息与显示文本当前合同。
 * 去重：ItemTab.test.tsx（24 例）与 ItemTab.kimi-workflows.test.tsx 已证目录/新建/复制/删除门/
 * 私有脚本/能力开关/图标/投掷演出/炼化摘要；grep 全旧测无「买价/卖价/商店可收购/介绍」断言。
 * 本文件只补：价格字段 blur 提交与撤销、收购开关、多行说明的空行剥离，及无关物品字段保全。
 */
import type { ItemData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  clickCheckboxByLabelText,
  controlByLabel,
  fillAndBlur,
  loadLegalProject,
  stubNodeTestHost,
} from '../__tests__/glm-m/kit.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { ItemTab } from './ItemTab.js'

function item(id: string, name: string): ItemData {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
}

function Harness(props: {
  session: EditSession
  focusObjectId?: string
  reader: ReturnType<typeof createEditorAssetReader>
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <ItemTab
      items={current.items}
      actors={current.actors}
      skills={current.skills}
      poisons={current.poisons ?? []}
      locale={current.locale}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={props.reader}
      battleSprites={current.battleSprites ?? []}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(next) => collectCurrentProjectReferenceIndex(next)}
      focusObjectId={props.focusObjectId}
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

async function mount(items: ItemData[], focus?: string): Promise<EditSession> {
  const legal = await loadLegalProject('glm-wave-m-item')
  const next = { ...legal.state, items }
  assertProjectSaveValid(next)
  const session = new EditSession(next)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  await act(async () => {
    root.render(<Harness session={session} focusObjectId={focus ?? items[0]!.id} reader={reader} />)
    await Promise.resolve()
  })
  return session
}

describe('M02 ItemTab 交易/说明字段当前合同', () => {
  test('买价/卖价 blur 各提交一次精确值，商店可收购开关键入账，undo 逐步还原', async () => {
    const session = await mount([item('item-m-a', '桂花糕'), item('item-m-b', '糯米')])
    const before = session.getHistoryVersion()
    expect(session.getState().items[0]).toEqual(item('item-m-a', '桂花糕'))

    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '买价'), '120')
    expect(session.getState().items[0]).toEqual({
      ...item('item-m-a', '桂花糕'),
      buyPrice: 120,
    })
    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '卖价'), '60')
    expect(session.getState().items[0]).toMatchObject({ buyPrice: 120, sellPrice: 60 })
    expect(session.getHistoryVersion()).toBe(before + 2)

    await clickCheckboxByLabelText(host, '商店可收购')
    expect(session.getState().items[0]).toMatchObject({ sellable: true })
    expect(session.getHistoryVersion()).toBe(before + 3)
    assertProjectSaveValid(session.getState())

    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]).toMatchObject({ sellable: false })
    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]).toMatchObject({ buyPrice: 120, sellPrice: 0 })
    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]).toEqual(item('item-m-a', '桂花糕'))
    // 无关物品的四个交易/说明字段全程零变化。
    expect(session.getState().items[1]).toEqual(item('item-m-b', '糯米'))
  })

  test('介绍按换行拆分并剥离空行，blur 一次提交；undo 恢复空说明', async () => {
    const session = await mount([item('item-m-a', '桂花糕')])
    const before = session.getHistoryVersion()

    const desc = host.querySelector<HTMLTextAreaElement>('textarea')
    expect(desc, '介绍 textarea').not.toBeNull()
    await fillAndBlur(desc!, ' recover\n\n第二行\n   \n第三行 ')
    // 当前合同：按换行拆分，丢弃空白行，其余行保留原样（不 trim）。
    expect(session.getState().items[0]?.desc).toEqual([' recover', '第二行', '第三行 '])
    expect(session.getHistoryVersion()).toBe(before + 1)

    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]?.desc).toEqual([])
  })
})
