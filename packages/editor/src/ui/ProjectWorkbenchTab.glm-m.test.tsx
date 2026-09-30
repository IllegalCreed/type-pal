// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M06（ProjectWorkbenchTab.glm-m）：开局状态弹窗的临时毒抗轴。
 * 去重：ProjectWorkbenchTab.test.tsx（30+ 例）/ kimi-workflows 已证入口/队伍/金钱/种子 HP/
 * 开局状态弹窗（好状态与未知清理）/世界资源/诊断；关键词「临时毒抗」在全旧测零命中。
 * 本文件只补：弹窗「带入下一场战斗的临时毒抗」勾选 → 「加值」blur 草稿 →
 * 「保存当前状态」把 poisonResistance 写入 StartWorld.seedConditions（单输出、重开回显、
 * 取消勾选后键消失）；「未入队状态覆盖」摘要行显示「临时毒抗 +N」。
 * 挂载导出的 StartWorldFields（ConnectedEditorPages 同一 props 面）。
 */
import type { ActorDef, ItemData, PoisonDef, StartWorld } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buttonByText,
  clickCheckboxByLabelText,
  controlByLabel,
  fillAndBlur,
  stubNodeTestHost,
} from '../__tests__/glm-m/kit.js'
import { StartWorldFields } from './ProjectWorkbenchTab.js'

function actor(id: string, name: string): ActorDef {
  return {
    id,
    name,
    spriteId: 'hero',
    battler: {
      battleSprite: 'starter-fighter',
      baseStats: {
        level: 1,
        hp: 100,
        maxHP: 100,
        mp: 10,
        maxMP: 10,
        attack: 5,
        defense: 5,
        magicAttack: 5,
        speed: 5,
        luck: 5,
      },
      initialEquipment: {},
      initialMagic: [],
    },
  }
}

const ITEMS: ItemData[] = []
const POISONS: PoisonDef[] = [{ id: 1, name: '赤蝎粉', color: 0, curability: 'common' }]

/** StartWorld 微型外部 store：保存输出后重渲染宿主，验证回显与摘要。 */
function makeStore(initial: StartWorld) {
  let current = initial
  let version = 0
  const subscribers = new Set<() => void>()
  return {
    subscribe: (callback: () => void) => {
      subscribers.add(callback)
      return () => subscribers.delete(callback)
    },
    getVersion: () => version,
    get: () => current,
    set: (next: StartWorld) => {
      current = next
      version += 1
      subscribers.forEach((callback) => {
        callback()
      })
    },
  }
}

function Harness(props: { store: ReturnType<typeof makeStore>; changes: StartWorld[] }) {
  useSyncExternalStore(props.store.subscribe, props.store.getVersion)
  return (
    <StartWorldFields
      value={props.store.get()}
      actors={[actor('hero', 'name.hero')]}
      items={ITEMS}
      poisons={POISONS}
      locale={{ 'name.hero': '主角' }}
      onChange={(next) => {
        props.changes.push(structuredClone(next))
        props.store.set(next)
      }}
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

const BASE: StartWorld = { party: ['hero'], money: 0, inventory: [] }

async function openDialog(): Promise<void> {
  const edit = host.querySelector<HTMLButtonElement>('[aria-label="编辑主角开局当前状态"]')
  expect(edit, '编辑开局当前状态按钮').not.toBeNull()
  await act(async () => edit!.click())
}

describe('M06 开局状态弹窗 · 临时毒抗当前合同', () => {
  test('勾选毒抗→加值 3 保存进 seedConditions；重开回显；摘要行显示临时毒抗 +3', async () => {
    const store = makeStore(structuredClone(BASE))
    const changes: StartWorld[] = []
    await act(async () => {
      root.render(<Harness store={store} changes={changes} />)
      await Promise.resolve()
    })

    await openDialog()
    await clickCheckboxByLabelText(host, '带入下一场战斗的临时毒抗')
    const bonus = controlByLabel<HTMLInputElement>(host, '加值')
    expect(bonus.value).toBe('1')
    await fillAndBlur(bonus, '3')

    await act(async () => buttonByText(host, '保存当前状态').click())
    expect(changes).toHaveLength(1)
    expect(changes[0]!.seedConditions?.hero).toEqual({ poisonResistance: 3 })
    // 未入队状态覆盖摘要显示可读「临时毒抗 +3」。
    expect(host.textContent).toContain('临时毒抗 +3')

    // 重开弹窗：勾选与数值回显。
    await openDialog()
    expect(
      [...host.querySelectorAll('label')].some(
        (candidate) =>
          candidate.textContent?.includes('带入下一场战斗的临时毒抗') &&
          candidate.querySelector<HTMLInputElement>('input')?.checked,
      ),
    ).toBe(true)
    expect(controlByLabel<HTMLInputElement>(host, '加值').value).toBe('3')
    await act(async () => buttonByText(host, '取消').click())
  })

  test('已配置毒抗重开取消勾选后保存 → 输出不含 poisonResistance 键', async () => {
    const store = makeStore({
      ...structuredClone(BASE),
      seedConditions: { hero: { poisonResistance: 3 } },
    })
    const changes: StartWorld[] = []
    await act(async () => {
      root.render(<Harness store={store} changes={changes} />)
      await Promise.resolve()
    })

    await openDialog()
    const checkboxLabel = [...host.querySelectorAll('label')].find((candidate) =>
      candidate.textContent?.includes('带入下一场战斗的临时毒抗'),
    )
    expect(checkboxLabel!.querySelector<HTMLInputElement>('input')!.checked).toBe(true)
    await clickCheckboxByLabelText(host, '带入下一场战斗的临时毒抗')
    await act(async () => buttonByText(host, '保存当前状态').click())

    expect(changes).toHaveLength(1)
    expect(changes[0]!.seedConditions?.hero?.poisonResistance).toBeUndefined()
    expect(host.textContent).not.toContain('临时毒抗 +')
  })
})
