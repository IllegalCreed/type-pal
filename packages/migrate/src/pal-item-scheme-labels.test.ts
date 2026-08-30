import type {
  AuthorCommand,
  AuthorItemData,
  AuthorSceneDef,
  AuthorScriptFlow,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { assertPalItemSchemeLabelInvariant } from './pal-item-scheme-labels.js'

const target = (entity: string, behavior: string): AuthorCommand => ({
  kind: 'selectEntityBehavior',
  target: { scene: 's001', entity },
  channel: 'auto',
  selection: { kind: 'use', value: behavior },
})

const hook = (id: string): AuthorCommand => ({
  kind: 'selectSceneHooks',
  scene: 's001',
  selection: { onEnter: { kind: 'use', value: id } },
})

const stages = (body: AuthorCommand[]): AuthorScriptFlow => ({
  kind: 'stages',
  initial: 'main',
  stages: [{ id: 'main', body }],
})

const machine = (label: string, body: AuthorCommand[] = []): AuthorScriptFlow => ({
  kind: 'stateMachine',
  machine: {
    id: 'machine',
    label,
    initial: 'main',
    states: { main: { label: 'main', body, next: { kind: 'stay' } } },
  },
})

function item(id: string, name: string, body: AuthorCommand[]): AuthorItemData {
  return {
    id,
    name,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'itemPrivateScript', script: { id: 'use', body } }],
    },
  }
}

function scene(args: {
  hookBody?: AuthorCommand[]
  behaviors?: Record<string, { label: string; order: number; flow: AuthorScriptFlow }>
}): AuthorSceneDef {
  return {
    id: 's001',
    mapId: 'map-1',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        pos: { col: 0, row: 0, height: 0 },
        zone: true,
        behaviors: { auto: args.behaviors ?? {} },
      },
    ],
    ...(args.hookBody
      ? {
          hooks: {
            onEnter: {
              variants: {
                'c8-hook': {
                  label: '信物剧情方案 3',
                  order: 20,
                  flow: stages(args.hookBody),
                },
              },
            },
          },
        }
      : {}),
  }
}

describe('PAL item scheme label invariant', () => {
  test('沿 hooks[channel].variants 与固有挂载方案闭包，并按 order + id 稳定消歧', () => {
    const result = assertPalItemSchemeLabelInvariant({
      items: [item('292', '信物', [hook('c8-hook')])],
      scenes: [
        scene({
          hookBody: [target('e1', 'c8-b'), target('e1', 'c8-a')],
          behaviors: {
            'c8-a': {
              label: '信物剧情方案 2',
              order: 20,
              flow: machine('信物剧情方案 2连续流程'),
            },
            'c8-b': { label: '信物剧情方案', order: 10, flow: stages([]) },
          },
        }),
      ],
      expectedSchemes: 3,
      expectedMachineInners: 1,
    })

    expect(result).toMatchObject({
      schemes: 3,
      machineInners: 1,
      itemRoots: 1,
      opaqueLabels: 0,
    })
    expect(result.labels.map(({ id, label }) => [id, label])).toEqual([
      ['c8-b', '信物剧情方案'],
      ['c8-a', '信物剧情方案 2'],
      ['c8-hook', '信物剧情方案 3'],
    ])
  })

  test('零 root fail-loud', () => {
    expect(() =>
      assertPalItemSchemeLabelInvariant({
        items: [item('1', '孤儿', [])],
        scenes: [
          scene({
            behaviors: {
              'c8-orphan': { label: '孤儿剧情方案', order: 1, flow: stages([]) },
            },
          }),
        ],
        expectedSchemes: 1,
        expectedMachineInners: 0,
      }),
    ).toThrow(/零 item root/)
  })

  test('多 root fail-loud', () => {
    expect(() =>
      assertPalItemSchemeLabelInvariant({
        items: [
          item('1', '甲', [target('e1', 'c8-shared')]),
          item('2', '乙', [target('e1', 'c8-shared')]),
        ],
        scenes: [
          scene({
            behaviors: {
              'c8-shared': { label: '甲剧情方案', order: 1, flow: stages([]) },
            },
          }),
        ],
        expectedSchemes: 1,
        expectedMachineInners: 0,
      }),
    ).toThrow(/多个 item root/)
  })

  test('选择图成环 fail-loud', () => {
    expect(() =>
      assertPalItemSchemeLabelInvariant({
        items: [item('1', '循环', [target('e1', 'c8-a')])],
        scenes: [
          scene({
            behaviors: {
              'c8-a': { label: '循环剧情方案', order: 1, flow: stages([target('e1', 'c8-b')]) },
              'c8-b': { label: '循环剧情方案 2', order: 2, flow: stages([target('e1', 'c8-a')]) },
            },
          }),
        ],
        expectedSchemes: 2,
        expectedMachineInners: 0,
      }),
    ).toThrow(/选择图成环/)
  })

  test('悬空选择 fail-loud', () => {
    expect(() =>
      assertPalItemSchemeLabelInvariant({
        items: [item('1', '悬空', [target('e1', 'c8-missing')])],
        scenes: [scene({})],
        expectedSchemes: 1,
        expectedMachineInners: 0,
      }),
    ).toThrow(/悬空引用/)
  })

  test('opaque label fail-loud', () => {
    expect(() =>
      assertPalItemSchemeLabelInvariant({
        items: [item('1', '药', [target('e1', 'c8-old')])],
        scenes: [
          scene({
            behaviors: {
              'c8-old': { label: '物品剧情行为 123456789abc', order: 1, flow: stages([]) },
            },
          }),
        ],
        expectedSchemes: 1,
        expectedMachineInners: 0,
      }),
    ).toThrow(/opaque label/)
  })
})
