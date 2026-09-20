/**
 * TEST-MIGRATION-BOUNDARIES-1 T08：pal-item-scheme-labels 剩余漂移轴。
 * 既有 pal-item-scheme-labels.test 已覆盖闭包/稳定序/零/多 root/环/悬空/opaque——不重复。
 * 本文件：期望计数单轴漂移（schemes/machineInners/itemRoots）精确拒绝、
 * 同 root 菱形（两 root 指向同一 hook）非环、完整 labels 报告与输入不变。
 */
import type {
  AuthorCommand,
  AuthorItemData,
  AuthorSceneDef,
  AuthorScriptFlow,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { assertPalItemSchemeLabelInvariant } from './pal-item-scheme-labels.js'

const target = (entity: string, behavior: string, sceneId = 's001'): AuthorCommand => ({
  kind: 'selectEntityBehavior',
  target: { scene: sceneId, entity },
  channel: 'auto',
  selection: { kind: 'use', value: behavior },
})

const hook = (id: string, sceneId = 's001'): AuthorCommand => ({
  kind: 'selectSceneHooks',
  scene: sceneId,
  selection: { onEnter: { kind: 'use', value: id } },
})

const stages = (body: AuthorCommand[]): AuthorScriptFlow => ({
  kind: 'stages',
  initial: 'main',
  stages: [{ id: 'main', body }],
})

const machine = (label: string): AuthorScriptFlow => ({
  kind: 'stateMachine',
  machine: {
    id: 'machine',
    label,
    initial: 'main',
    states: { main: { label: 'main', body: [], next: { kind: 'stay' } } },
  },
})

function item(id: string, body: AuthorCommand[]): AuthorItemData {
  return {
    id,
    name: `物品${id}`,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'itemPrivateScript', script: { id: 'use', body } }],
    },
  } as unknown as AuthorItemData
}

function scene(sceneId = 's001'): AuthorSceneDef {
  return {
    id: sceneId,
    mapId: 'map-1',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        pos: { col: 0, row: 0, height: 0 },
        zone: true,
        behaviors: {
          auto: {
            'c8-a': {
              label: '物品292剧情方案',
              order: 10,
              flow: machine('物品292剧情方案连续流程'),
            },
          },
        },
      },
    ],
    hooks: {
      onEnter: {
        variants: {
          // hook 正文选择实体行为（item → hook → behavior 链；不自选避免环）
          'c8-hook': {
            label: '物品292剧情方案 2',
            order: 20,
            flow: stages([target('e1', 'c8-a')]),
          },
        },
      },
    },
  } as unknown as AuthorSceneDef
}

function args() {
  return {
    items: [item('292', [hook('c8-hook')])],
    scenes: [scene()],
    expectedSchemes: 2,
    expectedMachineInners: 1,
    expectedItemRoots: 1,
  }
}

describe('T08 scheme-labels 剩余漂移轴', () => {
  test('合法报告完整 labels（含 machineLabel）；输入深快照不变', () => {
    const input = args()
    const snapshot = structuredClone(input)
    const report = assertPalItemSchemeLabelInvariant(input)
    expect(report.labels).toEqual([
      {
        id: 'c8-a',
        itemId: '292',
        path: 'scenes.s001.entities.e1.behaviors.auto.c8-a',
        label: '物品292剧情方案',
        machineLabel: '物品292剧情方案连续流程',
      },
      {
        id: 'c8-hook',
        itemId: '292',
        path: 'scenes.s001.hooks.onEnter.variants.c8-hook',
        label: '物品292剧情方案 2',
      },
    ])
    expect(structuredClone(input)).toEqual(snapshot)
  })
  test('期望计数单轴漂移（schemes/machineInners/itemRoots）各自精确拒绝', () => {
    expect(() => assertPalItemSchemeLabelInvariant({ ...args(), expectedSchemes: 3 })).toThrow(
      'PAL 物品剧情方案数量漂移: 2 != 3',
    )
    expect(() =>
      assertPalItemSchemeLabelInvariant({ ...args(), expectedMachineInners: 2 }),
    ).toThrow('PAL 物品剧情方案 machine-inner 数漂移: 1 != 2')
    expect(() => assertPalItemSchemeLabelInvariant({ ...args(), expectedItemRoots: 2 })).toThrow(
      'PAL 物品剧情方案 item root 数漂移: 1 != 2',
    )
  })
  test('两个 item 各指各的 hook（共享底层行为）→ 各自独立成方案、报告合法且输入不变', () => {
    // 第二场景：同名 c8-a 行为（独立节点）+ 自己的 hook；两个 root 各自成链（共享行为名非环）
    const secondScene = scene('s002')
    const secondEntity = secondScene.entities[0] as {
      behaviors: { auto: Record<string, unknown>; trigger: Record<string, unknown> }
    }
    secondEntity.behaviors.auto['c8-a'] = {
      label: '物品293剧情方案 2',
      order: 10,
      flow: machine('物品293剧情方案 2连续流程'),
    }
    secondScene.hooks = {
      onEnter: {
        variants: {
          'c9-hook': {
            label: '物品293剧情方案 2',
            order: 20,
            flow: stages([target('e1', 'c8-a', 's002')]),
          },
        },
      },
    }
    // 同实体第二个通道（trigger）复用同 id：channel 是地址键的一维（去通道即误判重复）
    const triggerTarget = (entity: string, behavior: string, sceneId: string): AuthorCommand => ({
      kind: 'selectEntityBehavior',
      target: { scene: sceneId, entity },
      channel: 'trigger',
      selection: { kind: 'use', value: behavior },
    })
    const secondWithTrigger = {
      ...secondScene,
      entities: [
        {
          ...secondEntity,
          behaviors: {
            ...secondEntity.behaviors,
            trigger: {
              'c8-a': { label: '物品293剧情方案', order: 5, flow: stages([]) }, // 同 id 复用于另一通道：channel 是地址键一维
            },
          },
        },
      ],
      hooks: {
        onEnter: {
          variants: {
            'c9-hook': {
              label: '物品293剧情方案 3',
              order: 20,
              flow: stages([target('e1', 'c8-a', 's002'), triggerTarget('e1', 'c8-a', 's002')]),
            },
          },
        },
      },
    } as unknown as AuthorSceneDef
    const input = {
      items: [item('292', [hook('c8-hook')]), item('293', [hook('c9-hook', 's002')])],
      scenes: [scene(), secondWithTrigger],
      expectedSchemes: 5,
      expectedMachineInners: 2,
      expectedItemRoots: 2,
    }
    const snapshot = structuredClone(input)
    /** 拒绝见证取值形式（mutation 负控下 produces 纯 AssertionError）。 */
    const report = (() => {
      try {
        return assertPalItemSchemeLabelInvariant(input)
      } catch (error) {
        return (error as Error).message
      }
    })()
    expect(report).toBeTypeOf('object') // 合法输入不得拒绝（拒绝消息以值形式可见）
    const typed = report as Exclude<typeof report, string>
    expect(typed.schemes).toBe(5)
    expect(typed.itemRoots).toBe(2)
    expect(new Set(typed.labels.map(({ itemId }) => itemId))).toEqual(new Set(['292', '293']))
    expect(typed.labels.map(({ label }) => label)).toEqual([
      '物品292剧情方案',
      '物品292剧情方案 2',
      '物品293剧情方案',
      '物品293剧情方案 2',
      '物品293剧情方案 3',
    ])
    expect(structuredClone(input)).toEqual(snapshot)
  })
  test('同 root 菱形：item 经 hook 与直连两条路径达同一行为 → 非环、方案计数按节点不按路径', () => {
    // item292 的脚本既直连 c8-a，又经 c8-hook 到 c8-a（同一 root 两条路径 = 菱形，不是环）
    const diamondScene = scene()
    diamondScene.hooks = {
      onEnter: {
        variants: {
          'c8-hook': {
            label: '物品292剧情方案 2',
            order: 20,
            flow: stages([target('e1', 'c8-a')]),
          },
        },
      },
    }
    const input = {
      items: [item('292', [hook('c8-hook'), target('e1', 'c8-a')])],
      scenes: [diamondScene],
      expectedSchemes: 2, // c8-a(10) + c8-hook(20)：同一 c8-a 只计一次（去重按地址）
      expectedMachineInners: 1,
      expectedItemRoots: 1,
    }
    const report = (() => {
      try {
        return assertPalItemSchemeLabelInvariant(input)
      } catch (error) {
        return (error as Error).message
      }
    })()
    expect(report).toBeTypeOf('object') // 菱形不触发成环拒绝
    const typed = report as Exclude<typeof report, string>
    expect(typed.schemes).toBe(2)
    expect(typed.itemRoots).toBe(1)
    expect(typed.labels.map(({ id }) => id)).toEqual(['c8-a', 'c8-hook']) // 菱形终点只出现一次
    expect(typed.labels.map(({ label }) => label)).toEqual(['物品292剧情方案', '物品292剧情方案 2'])
  })
})
