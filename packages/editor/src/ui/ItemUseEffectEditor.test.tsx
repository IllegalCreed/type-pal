// @vitest-environment jsdom
import {
  type AuthorCommandV5,
  ITEM_USE_EFFECT_KINDS,
  type ItemData,
  type ItemUseEffect,
  type SceneDef,
  type ThrowSpec,
  type UseSpec,
} from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defaultItemUseEffect, ItemEffectChainEditor } from './ItemUseEffectEditor.js'

function item(id: string): ItemData {
  return { id, name: id, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
}

function Harness(props: {
  initial: UseSpec
  onChange?: (next: UseSpec) => void
  scenes?: readonly SceneDef[]
}) {
  const [spec, setSpec] = useState(props.initial)
  return (
    <ItemEffectChainEditor
      ability="use"
      spec={spec}
      items={[item('tool'), item('material')]}
      poisons={[]}
      scripts={[]}
      itemId="tool"
      scenes={props.scenes}
      onChange={(next) => {
        const use = next as UseSpec
        setSpec(use)
        props.onChange?.(use)
      }}
    />
  )
}

function PrivateHarness(props: {
  initial: UseSpec
  onChange?: (next: UseSpec) => void
  onBodyChange?: (body: AuthorCommandV5[]) => void
}) {
  const [spec, setSpec] = useState(props.initial)
  const privateIndex = spec.effects.findIndex(
    (effect) =>
      effect.kind === 'runScript' &&
      effect.script.chunk === '__script-v5-runtime' &&
      effect.script.id === 'item:tool:use',
  )
  return (
    <ItemEffectChainEditor
      ability="use"
      spec={spec}
      items={[item('tool'), item('material')]}
      poisons={[]}
      scripts={[]}
      itemId="tool"
      privateScriptsV5={
        privateIndex < 0
          ? {}
          : {
              [privateIndex]: {
                label: '物品私有脚本',
                body: [],
                onChange: props.onBodyChange ?? (() => undefined),
              },
            }
      }
      onChange={(next) => {
        const use = next as UseSpec
        setSpec(use)
        props.onChange?.(use)
      }}
    />
  )
}

function ThrowHarness(props: { initial: ThrowSpec; onChange?: (next: ThrowSpec) => void }) {
  const [spec, setSpec] = useState(props.initial)
  return (
    <ItemEffectChainEditor
      ability="throw"
      spec={spec}
      items={[item('tool'), item('material')]}
      poisons={[{ id: 7, name: '赤毒', color: 0, curability: 'common' }]}
      scripts={[]}
      itemId="tool"
      onChange={(next) => {
        const throwSpec = next as ThrowSpec
        setSpec(throwSpec)
        props.onChange?.(throwSpec)
      }}
    />
  )
}

let root: Root
let host: HTMLDivElement

async function input(element: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function buttonByText(rootNode: ParentNode, text: string): HTMLButtonElement | undefined {
  return [...rootNode.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
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

describe('ItemEffectChainEditor', () => {
  test('全部结构化效果都能创建确定的默认值', () => {
    const items = [item('tool'), item('material')]
    const poisons = [{ id: 7, name: '赤毒', color: 0, curability: 'common' as const }]
    const scripts = [
      {
        ref: { id: 'shared/item/use', chunk: 'shared/c00' },
        label: '物品使用脚本',
      },
    ]
    const kinds = Object.keys(ITEM_USE_EFFECT_KINDS) as ItemUseEffect['kind'][]
    const scenes: SceneDef[] = [
      {
        id: 'scene-a',
        mapId: 'map-a',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'entity-a', sprite: 'npc', pos: { col: 1, row: 1, height: 0 } }],
      },
    ]

    expect(
      Object.fromEntries(
        kinds.map((kind) => [
          kind,
          defaultItemUseEffect(kind, items, poisons, scripts, 'tool', scenes),
        ]),
      ),
    ).toEqual({
      healHp: { kind: 'healHp', amount: 100 },
      healMp: { kind: 'healMp', amount: 50 },
      revive: { kind: 'revive', hpPercent: 30 },
      applyStatus: { kind: 'applyStatus', status: 'protect', turns: 3 },
      removeStatus: { kind: 'removeStatus', statuses: ['confused'] },
      applyPoison: { kind: 'applyPoison', poisonId: '7' },
      curePoison: { kind: 'curePoison', curesTier: 'common' },
      permanentStatBoost: { kind: 'permanentStatBoost', stat: 'maxHP', delta: 5 },
      gate: { kind: 'gate', chance: 50 },
      dieIfNotPoisoned: { kind: 'dieIfNotPoisoned' },
      runScript: {
        kind: 'runScript',
        script: { id: 'shared/item/use', chunk: 'shared/c00' },
      },
      runSceneHook: {
        kind: 'runSceneHook',
        hook: 'onTeleport',
        unavailableMessage: '此处无法使用。',
      },
      craftRecipe: {
        kind: 'craftRecipe',
        recipes: [
          {
            ingredients: [{ itemId: 'material', count: 1 }],
            products: [{ itemId: 'tool', count: 1 }],
          },
        ],
        unavailableMessage: '材料不足。',
      },
      drawFromResourcePool: {
        kind: 'drawFromResourcePool',
        resource: 'resource',
        maxRoll: 1,
        rewards: [{ itemId: 'tool', count: 1 }],
        unavailableMessage: '当前没有可抽取的资源。',
      },
      extraPoisonRes: { kind: 'extraPoisonRes', amount: 10 },
      hideParty: { kind: 'hideParty', turns: 3 },
      modifyHostileAwareness: {
        kind: 'modifyHostileAwareness',
        rangeMultiplier: 0,
        durationMs: 60_000,
      },
      scaleCurrentHp: { kind: 'scaleCurrentHp', numerator: 1, denominator: 2 },
      levelUp: { kind: 'levelUp', levels: 1 },
      currentHpDamage: {
        kind: 'currentHpDamage',
        numerator: 1,
        denominator: 2,
        bonus: 1,
        cap: 1000,
      },
      placeEntityInFront: {
        kind: 'placeEntityInFront',
        target: { scene: 'scene-a', entity: 'entity-a' },
        state: 2,
        unavailableMessage: '前方没有足够空间。',
      },
    })
    expect(() =>
      defaultItemUseEffect('placeEntityInFront', items, poisons, scripts, 'tool'),
    ).toThrow('没有场景实体')
  })

  test('消耗型工具创建配方时不会把自身设为材料', () => {
    const effect = defaultItemUseEffect(
      'craftRecipe',
      [item('tool'), item('material')],
      [],
      [],
      'tool',
    )
    expect(effect).toMatchObject({
      kind: 'craftRecipe',
      recipes: [{ ingredients: [{ itemId: 'material', count: 1 }] }],
    })
    expect(() => defaultItemUseEffect('craftRecipe', [item('tool')], [], [], 'tool')).toThrow()
  })

  test('毒抗编辑器钳到正整数，资源键失焦时去掉首尾空格', async () => {
    const onPoisonChange = vi.fn()
    await act(async () =>
      root.render(
        <Harness
          key="poison"
          initial={{
            target: 'oneAlly',
            consuming: true,
            effects: [{ kind: 'extraPoisonRes', amount: 10 }],
          }}
          onChange={onPoisonChange}
        />,
      ),
    )
    const poisonInput = [...host.querySelectorAll<HTMLInputElement>('input[type="number"]')].find(
      (input) => input.closest('label')?.textContent?.includes('毒抗增量'),
    )!
    await input(poisonInput, '-8')
    expect(onPoisonChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ effects: [{ kind: 'extraPoisonRes', amount: 1 }] }),
    )

    const onPoolChange = vi.fn()
    await act(async () =>
      root.render(
        <Harness
          key="pool"
          initial={{
            target: 'scene',
            consuming: false,
            effects: [
              {
                kind: 'drawFromResourcePool',
                resource: ' pool ',
                maxRoll: 1,
                rewards: [{ itemId: 'material', count: 1 }],
              },
            ],
          }}
          onChange={onPoolChange}
        />,
      ),
    )
    const resourceInput = host.querySelector<HTMLInputElement>(
      'input[list="item-world-resource-keys"]',
    )!
    expect(resourceInput.getAttribute('aria-invalid')).toBe('true')
    await act(async () =>
      resourceInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true })),
    )
    expect(onPoolChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        effects: [expect.objectContaining({ kind: 'drawFromResourcePool', resource: 'pool' })],
      }),
    )
  })

  test('效果链支持排序、删除并允许保留空效果链', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <Harness
          initial={{
            target: 'oneAlly',
            consuming: true,
            effects: [
              { kind: 'healHp', amount: 10 },
              { kind: 'healMp', amount: 20 },
            ],
          }}
          onChange={onChange}
        />,
      ),
    )

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="下移效果 1"]')!.click(),
    )
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        effects: [
          { kind: 'healMp', amount: 20 },
          { kind: 'healHp', amount: 10 },
        ],
      }),
    )

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 2"]')!.click(),
    )
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ effects: [{ kind: 'healMp', amount: 20 }] }),
    )
    expect(host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 1"]')?.disabled).toBe(
      false,
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 1"]')!.click(),
    )
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ effects: [] }))
    expect(host.textContent).toContain('当前没有效果')
    expect(buttonByText(host, '添加效果')?.disabled).toBe(false)
  })

  test('物品私有脚本可与其他效果组合、排序和删除，私有正文始终跟随效果', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <PrivateHarness
          initial={{
            target: 'scene',
            consuming: true,
            effects: [
              {
                kind: 'runScript',
                script: { chunk: '__script-v5-runtime', id: 'item:tool:use' },
              },
            ],
          }}
          onChange={onChange}
        />,
      ),
    )

    expect(buttonByText(host, '添加效果')?.disabled).toBe(false)
    expect(host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 1"]')?.disabled).toBe(
      false,
    )
    await act(async () => buttonByText(host, '添加效果')!.click())
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: 'oneAlly',
        effects: [
          {
            kind: 'runScript',
            script: { chunk: '__script-v5-runtime', id: 'item:tool:use' },
          },
          { kind: 'healHp', amount: 100 },
        ],
      }),
    )
    expect(host.textContent).toContain('归当前物品拥有')

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="下移效果 1"]')!.click(),
    )
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        effects: [
          { kind: 'healHp', amount: 100 },
          {
            kind: 'runScript',
            script: { chunk: '__script-v5-runtime', id: 'item:tool:use' },
          },
        ],
      }),
    )
    expect(host.querySelector('[data-item-private-script="物品私有脚本"]')).not.toBeNull()

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 2"]')!.click(),
    )
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ effects: [{ kind: 'healHp', amount: 100 }] }),
    )
    expect(host.querySelector('[data-item-private-script]')).toBeNull()
  })

  test('场景实体效果显式保留失效引用，并在切换场景时选中该场景首个实体', async () => {
    const onChange = vi.fn()
    const scenes: SceneDef[] = [
      {
        id: 'scene-a',
        mapId: 'map-a',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'entity-a', sprite: 'npc-a', pos: { col: 1, row: 1, height: 0 } }],
      },
      {
        id: 'scene-b',
        mapId: 'map-b',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'entity-b', sprite: 'npc-b', pos: { col: 2, row: 2, height: 0 } }],
      },
    ]
    await act(async () =>
      root.render(
        <Harness
          initial={{
            target: 'scene',
            consuming: true,
            effects: [
              {
                kind: 'placeEntityInFront',
                target: { scene: 'missing-scene', entity: 'missing-entity' },
                state: 2,
              },
            ],
          }}
          scenes={scenes}
          onChange={onChange}
        />,
      ),
    )

    const sceneSelect = [...host.querySelectorAll<HTMLSelectElement>('select')].find((candidate) =>
      [...(candidate.closest('label')?.querySelectorAll('span') ?? [])].some(
        (label) => label.textContent === '场景',
      ),
    )!
    expect(sceneSelect.textContent).toContain('⚠ missing-scene')
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
      setter.call(sceneSelect, 'scene-b')
      sceneSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        effects: [
          expect.objectContaining({
            kind: 'placeEntityInFront',
            target: { scene: 'scene-b', entity: 'entity-b' },
          }),
        ],
      }),
    )
  })

  test('非法投掷效果显式报错并可一键重置为施毒', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <ThrowHarness
          initial={
            {
              effects: [{ kind: 'healHp', amount: 10 }],
            } as unknown as ThrowSpec
          }
          onChange={onChange}
        />,
      ),
    )

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('无法保存')
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.includes('重置为施毒'))!
        .click(),
    )
    expect(onChange).toHaveBeenLastCalledWith({ effects: [{ kind: 'applyPoison', poisonId: '7' }] })
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  test('v5 物品私有脚本在物品效果内联编辑，不显示共享脚本跳转', async () => {
    const onBodyChange = vi.fn()
    await act(async () =>
      root.render(
        <ItemEffectChainEditor
          ability="use"
          spec={{
            target: 'scene',
            consuming: true,
            effects: [
              {
                kind: 'runScript',
                script: { chunk: '__script-v5-runtime', id: 'item:tool:use' },
              },
            ],
          }}
          items={[item('tool')]}
          poisons={[]}
          scripts={[]}
          itemId="tool"
          onChange={() => undefined}
          privateScriptsV5={{
            0: {
              label: '土灵珠使用',
              body: [{ kind: 'setFlag', flag: 'before', value: true }],
              onChange: onBodyChange,
            },
          }}
        />,
      ),
    )
    expect(host.textContent).toContain('物品私有脚本')
    expect(host.textContent).toContain('归当前物品拥有')
    expect(host.textContent).not.toContain('打开脚本')
    expect(host.querySelector('[aria-label="土灵珠使用正文"]')).toBeNull()
    expect(host.textContent).toContain('before = 真')
    await act(async () =>
      host
        .querySelector<HTMLElement>('.cmd-row')!
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    const flagInput = [...host.querySelectorAll<HTMLInputElement>('input')].find(
      (candidate) => candidate.value === 'before',
    )!
    await input(flagInput, 'after')
    expect(onBodyChange).toHaveBeenCalledWith([{ kind: 'setFlag', flag: 'after', value: true }])
  })
})
