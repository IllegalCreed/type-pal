// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M01（BattleFieldTab.glm-m）：战场页当前合法作者操作的提交/取消/
 * 引用外资源失败边界。去重（旧证据 file:line 见 docs/testing/glm-next-triple/wave-M/README.md）：
 * BattleFieldTab.test.tsx 已证目录/搜索/深链、首次创建登记 manifest、引用面板与跳转、
 * fail-closed、live oracle 阻断与失败；BattleFieldTab.glm-leaf-wave.test.tsx 已证 background
 * pick/clear、五灵逐键 patch、名称清空删键。本文件只补：复制战场单命令与无关记录保全、
 * 创建表单取消零提交、非法编号零提交、常驻波动强度提交、预览资源失败面（catalog 缺失的
 * 背景 AssetId → 加载失败仍可编辑；无背景黑底空态）。
 * 底座为真实 blank 项目（loader→toEditorState 自证），assetBase/assetReader 走真实公开边界。
 */
import type { BattleFieldDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { loadLegalProject, stubNodeTestHost } from '../__tests__/glm-m/kit.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { BattleFieldTab } from './BattleFieldTab.js'

const field = (id: number, name = `战场 ${id}`): BattleFieldDef => ({
  id,
  name,
  screenWave: 0,
  magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
})

function Harness(props: {
  session: EditSession
  assetBase: import('@type-pal/reforge').AssetBase
  reader: ReturnType<typeof createEditorAssetReader>
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
      referenceIndex={collectCurrentProjectReferenceIndex(props.session.getState())}
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

function button(text: string): HTMLButtonElement {
  const hit = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) =>
      candidate.textContent?.trim() === text ||
      candidate.getAttribute('aria-label') === text ||
      candidate.title === text,
  )
  expect(hit, `button ${text}`).toBeDefined()
  return hit!
}

async function setInput(input: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** 真实 blank 项目 + 作者编排战场域；assetBase/assetReader 为真实公开边界。 */
async function mount(fields: BattleFieldDef[]): Promise<EditSession> {
  const legal = await loadLegalProject('glm-wave-m-battlefield')
  const session = new EditSession({ ...legal.state, battleFields: fields })
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  await act(async () => {
    root.render(<Harness session={session} assetBase={legal.assetBase} reader={reader} />)
    await Promise.resolve()
  })
  return session
}

describe('M01 BattleFieldTab 提交/取消/资源失败边界', () => {
  test('复制当前战场：单命令落账并选中新副本，undo 精确移除，源战场不受影响', async () => {
    // 不带深链焦点挂载：选择跟随 copy() 的 selectField（焦点吸附行为由旧测深链用例持有）。
    const session = await mount([field(6), field(24, '默认战场')])
    const before = session.getHistoryVersion()
    const beforeSnapshot = structuredClone(session.getState().battleFields)

    await act(async () => button('复制当前战场').click())
    const fields = session.getState().battleFields ?? []
    expect(fields).toHaveLength(3)
    // nextBattleFieldId = max(id)+1：源目录 [6,24] → 副本落在 25 并立即选中。
    expect(fields.find((candidate) => candidate.id === 25)).toEqual({ ...field(6), id: 25 })
    expect(fields.find((candidate) => candidate.id === 6)).toEqual(field(6))
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('#025')

    expect(session.undo()).toBe(true)
    expect(session.getState().battleFields).toEqual(beforeSnapshot)
  })

  test('创建表单「取消」零提交；非法编号提交零命令并给出可读 notice', async () => {
    const session = await mount([field(6)])
    const before = session.getHistoryVersion()

    await act(async () => button('新建战场').click())
    const inputs = host.querySelectorAll<HTMLInputElement>('.bf-create-grid input')
    expect(inputs[0]!.value).toBe(String(7))
    await act(async () => button('取消').click())
    expect(session.getHistoryVersion()).toBe(before)
    expect(session.getState().battleFields).toHaveLength(1)

    await act(async () => button('新建战场').click())
    const invalid = host.querySelectorAll<HTMLInputElement>('.bf-create-grid input')
    await setInput(invalid[0]!, '-3')
    await act(async () => button('创建战场').click())
    expect(session.getHistoryVersion()).toBe(before)
    expect(session.getState().battleFields).toHaveLength(1)
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('非负安全整数')
  })

  test('常驻波动强度 blur 一次提交精确值，undo 还原；兄弟战场键保持不变', async () => {
    const session = await mount([field(6), field(24)])
    const before = session.getHistoryVersion()
    const labels = [...host.querySelectorAll<HTMLLabelElement>('label')].filter(
      (candidate) => candidate.textContent?.trim() === '强度',
    )
    expect(labels).toHaveLength(1)
    const target = labels[0]!.htmlFor
      ? (document.getElementById(labels[0]!.htmlFor) as HTMLInputElement)
      : labels[0]!.querySelector<HTMLInputElement>('input')
    expect(target, '强度输入').not.toBeNull()

    await setInput(target!, '3')
    await act(async () => {
      target!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect((session.getState().battleFields ?? [])[0]).toEqual({ ...field(6), screenWave: 3 })
    expect((session.getState().battleFields ?? [])[1]).toEqual(field(24))
    expect(session.getHistoryVersion()).toBe(before + 1)

    expect(session.undo()).toBe(true)
    expect((session.getState().battleFields ?? [])[0]).toEqual(field(6))
  })

  test('预览资源失败面：catalog 缺失的背景 AssetId 加载失败仍可编辑；无背景显示黑底空态', async () => {
    // 背景指向 catalog 中不存在的 AssetId：合法作者输入下的真实资源缺失路径。
    const session = await mount([{ ...field(6), background: 'battle-background.missing' }])
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(host.querySelector('.bf-preview-error')?.textContent).toContain('背景加载失败')

    // 失败不影响工作台其它部分：字段仍可编辑，命令照常落账。
    const before = session.getHistoryVersion()
    const nameLabels = [...host.querySelectorAll<HTMLLabelElement>('label')].filter(
      (candidate) => candidate.textContent?.trim() === '名称',
    )
    const nameInput = document.getElementById(nameLabels[0]!.htmlFor!) as HTMLInputElement
    await setInput(nameInput, '改名战场')
    await act(async () => {
      nameInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect((session.getState().battleFields ?? [])[0]?.name).toBe('改名战场')
    expect(host.querySelector('.bf-preview-error')).not.toBeNull()

    // 换成无背景对象：零 I/O 分支显示「黑底战场」空态且无错误面。
    await mount([field(9)])
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(host.querySelector('.bf-preview-empty')?.textContent).toBe('黑底战场')
    expect(host.querySelector('.bf-preview-error')).toBeNull()
  })
})
