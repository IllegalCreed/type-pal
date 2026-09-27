// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U1c：ItemUseEffectEditor 残差。
 * 去重：ItemUseEffectEditor.test.tsx 已证缺省效果、配方自材料排除、排序/删除/独占切换、
 * 私有脚本内联、场景实体切换、投掷链——本文件只补当前公开入口仍未证明的业务交互：
 * 使用目标与成功后菜单提交、仅战斗可用开关键语义、patchEffects 的 target/battleOnly
 * 联动（scene/hideParty 往返）、成功后消耗自材料失败零提交、解除状态末项 no-op 守卫。
 */
import type { ItemData, ItemUseEffect, SceneDef, UseSpec } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { ItemEffectChainEditor } from './ItemUseEffectEditor.js'

function item(id: string): ItemData {
  return { id, name: id, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
}

function Harness(props: {
  initial: UseSpec
  itemId?: string
  scenes?: readonly SceneDef[]
  onChange?: (next: UseSpec) => void
  onError?: (message: string) => void
}) {
  const [spec, setSpec] = useState(props.initial)
  return (
    <ItemEffectChainEditor
      ability="use"
      spec={spec}
      items={[item('tool'), item('material')]}
      poisons={[]}
      scripts={[]}
      itemId={props.itemId ?? 'tool'}
      scenes={props.scenes}
      onChange={(next) => {
        const use = structuredClone(next as UseSpec)
        setSpec(use)
        props.onChange?.(use)
      }}
      onError={props.onError}
    />
  )
}

let root: Root
let host: HTMLDivElement

async function chooseSelect(trigger: HTMLButtonElement, label: string): Promise<void> {
  await act(async () => trigger.click())
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
    candidate.textContent?.includes(label),
  )
  if (!option) throw new Error(`找不到选择项：${label}`)
  await act(async () => option.click())
}

function selectByAriaLabel(ariaLabel: string): HTMLButtonElement {
  const trigger = host.querySelector<HTMLButtonElement>(`[aria-label="${ariaLabel}"]`)
  expect(trigger, `combobox ${ariaLabel}`).not.toBeNull()
  return trigger!
}

async function clickCheckbox(text: string): Promise<void> {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(label, `checkbox ${text}`).not.toBeNull()
  const input = label!.querySelector<HTMLInputElement>('input')!
  await act(async () => input.click())
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const healHpSpec = (): UseSpec =>
  ({
    target: 'oneAlly',
    consuming: false,
    effects: [{ kind: 'healHp', amount: 30 }],
  }) as UseSpec

async function mountHealHp(options: {
  onChange?: (next: UseSpec) => void
  onError?: (message: string) => void
  effects?: ItemUseEffect[]
  itemId?: string
  scenes?: readonly SceneDef[]
}): Promise<void> {
  const initial = healHpSpec()
  if (options.effects) initial.effects = options.effects
  await act(async () => {
    root.render(
      <Harness
        initial={initial}
        itemId={options.itemId}
        scenes={options.scenes}
        onChange={options.onChange}
        onError={options.onError}
      />,
    )
    await Promise.resolve()
  })
}

describe('U1c ItemUseEffectEditor 残差', () => {
  test('使用目标提交 allAllies；成功后菜单提交 close；仅战斗可用开关键语义', async () => {
    const seen: UseSpec[] = []
    await mountHealHp({ onChange: (next) => seen.push(next) })
    await chooseSelect(selectByAriaLabel('使用目标'), '全体队友')
    expect(seen.at(-1)!.target).toBe('allAllies')
    await chooseSelect(selectByAriaLabel('使用成功后菜单'), '关闭菜单')
    expect(seen.at(-1)!.menuAfterUse).toBe('close')
    await clickCheckbox('仅战斗可用')
    expect(seen.at(-1)!.battleOnly).toBe(true)
    await clickCheckbox('仅战斗可用')
    expect(seen.at(-1)!.battleOnly).toBeUndefined()
  })

  test('成功后消耗自材料守卫：onError 精确提示且零提交', async () => {
    const seen: UseSpec[] = []
    const errors: string[] = []
    const selfRecipe: ItemUseEffect = {
      kind: 'craftRecipe',
      recipes: [
        {
          ingredients: [{ itemId: 'tool', count: 1 }],
          products: [{ itemId: 'material', count: 1 }],
        },
      ],
      unavailableMessage: '材料不足。',
    } as ItemUseEffect
    await mountHealHp({
      onChange: (next) => seen.push(next),
      onError: (message) => errors.push(message),
      effects: [{ kind: 'healHp', amount: 30 }, selfRecipe],
    })
    const before = seen.length
    await clickCheckbox('成功后消耗')
    expect(errors).toEqual(['先从配方材料中移除当前工具，再开启“成功后消耗”。'])
    expect(seen.length).toBe(before)
  })

  test('链切换的 target/battleOnly 联动：场景钩子→scene，退回→oneAlly，全队隐身→allAllies+battleOnly', async () => {
    const seen: UseSpec[] = []
    await mountHealHp({
      onChange: (next) => seen.push(next),
      effects: [
        { kind: 'healHp', amount: 30 },
        { kind: 'healMp', amount: 20 },
      ],
      scenes: [
        {
          id: 'scene-a',
          mapId: 'map-a',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [{ id: 'entity-a', sprite: 'npc', pos: { col: 1, row: 1, height: 0 } }],
        } as never,
      ],
    })
    await chooseSelect(selectByAriaLabel('效果 2 类型'), '调用场景钩子')
    expect(seen.at(-1)!.target).toBe('scene')
    expect(seen.at(-1)!.battleOnly).toBeUndefined()
    expect(seen.at(-1)!.effects).toHaveLength(1)
    await chooseSelect(selectByAriaLabel('效果 1 类型'), '回复体力')
    expect(seen.at(-1)!.target).toBe('oneAlly')
    await chooseSelect(selectByAriaLabel('效果 1 类型'), '全队隐身')
    expect(seen.at(-1)!.target).toBe('allAllies')
    expect(seen.at(-1)!.battleOnly).toBe(true)
  })

  test('解除状态末项不可取消：no-op 零提交', async () => {
    const seen: UseSpec[] = []
    await mountHealHp({
      onChange: (next) => seen.push(next),
      effects: [{ kind: 'removeStatus', statuses: ['sleep'] } as ItemUseEffect],
    })
    await clickCheckbox('睡眠')
    expect(seen).toHaveLength(0)
  })
})
