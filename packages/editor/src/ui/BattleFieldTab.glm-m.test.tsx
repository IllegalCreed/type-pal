// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M01（BattleFieldTab.glm-m）：战场页当前合法作者操作的提交/取消/
 * 引用外资源失败边界。去重（旧证据 file:line 见 docs/testing/glm-next-triple/wave-M/README.md）：
 * BattleFieldTab.test.tsx 已证目录/搜索/深链、首次创建登记 manifest、引用面板与跳转、
 * fail-closed、live oracle 阻断与失败；BattleFieldTab.glm-leaf-wave.test.tsx 已证 background
 * pick/clear、五灵逐键 patch、名称清空删键。本文件只补：复制战场单命令与无关记录保全、
 * 创建表单取消零提交、非法编号零提交、常驻波动强度提交、预览资源失败面（加载失败可编辑恢复）。
 */
import type { BattleFieldDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ProjectReferenceIndex } from '../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { BattleFieldTab } from './BattleFieldTab.js'

const field = (id: number, name = `战场 ${id}`): BattleFieldDef => ({
  id,
  name,
  screenWave: 0,
  magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
})

/** 与 BattleFieldTab.test.tsx 同构的最小合法 state（引用索引按此收集）。 */
function state(fields: BattleFieldDef[]): EditorState {
  return {
    manifest: {
      id: 'test',
      name: '测试',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {
        scenes: 'content/scenes/index.json',
        items: 'content/items.json',
        skills: 'content/skills.json',
        actors: 'content/actors.json',
        locale: 'content/locale.json',
        sprites: 'content/sprites.json',
        maps: 'content/maps/index.json',
        sharedScripts: 'content/shared-scripts.json',
        battleFields: 'content/battle-fields.json',
      },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's001',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [
      {
        id: 's001',
        mapId: 'map-001',
        battleFieldId: fields[0]?.id,
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
      },
    ],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    battleFields: fields,
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
  } as unknown as EditorState
}

function Harness(props: {
  session: EditSession
  focusObjectId?: string
  referenceStatus?: EditorDerivedStatus
  referenceIndex?: ProjectReferenceIndex
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <BattleFieldTab
      battleFields={current.battleFields ?? []}
      assetBase={{} as never}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={{} as never}
      referenceIndex={
        props.referenceIndex ?? collectCurrentProjectReferenceIndex(props.session.getState())
      }
      referenceStatus={props.referenceStatus ?? 'current'}
      getCurrentReferenceIndex={(next) => collectCurrentProjectReferenceIndex(next)}
      focusObjectId={props.focusObjectId}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  const nodeBufferModule = 'node:buffer'
  const nodeCryptoModule = 'node:crypto'
  const buffer = (await import(nodeBufferModule)) as { Blob: typeof Blob }
  const webcrypto = (await import(nodeCryptoModule)) as { webcrypto: typeof crypto }
  vi.stubGlobal('Blob', buffer.Blob)
  vi.stubGlobal('crypto', webcrypto.webcrypto)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
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

async function mount(fields: BattleFieldDef[], focus?: string): Promise<EditSession> {
  const session = new EditSession(state(fields))
  await act(async () => {
    root.render(<Harness session={session} focusObjectId={focus} />)
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
    const session = await mount([field(6), field(24)], '6')
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

  test('预览资源失败面：加载失败显示错误但工作台仍可编辑；无背景显示黑底空态', async () => {
    const session = new EditSession(state([{ ...field(6), background: 'bg-asset' }]))
    await act(async () => {
      root.render(<Harness session={session} focusObjectId="6" />)
      // assetBase 为空壳 → loadStandardPalette 的 readRoleText 拒绝 → 预览进入失败面。
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
    const clean = new EditSession(state([field(9)]))
    await act(async () => {
      root.render(<Harness session={clean} focusObjectId="9" />)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(host.querySelector('.bf-preview-empty')?.textContent).toBe('黑底战场')
    expect(host.querySelector('.bf-preview-error')).toBeNull()
  })
})
