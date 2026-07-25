import { describe, expect, test } from 'vitest'
import { validateItemsV5, validateScenesV5 } from './validate.js'

const flow = {
  kind: 'stages' as const,
  initial: 'start',
  stages: [{ id: 'start', body: [] }],
}

const scene = (over: Record<string, unknown> = {}) => ({
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [
    {
      id: 'e1',
      sprite: 'npc',
      pos: { col: 1, row: 1, height: 0 },
      initialPage: 'default',
      pages: [{ id: 'default', label: '默认', trigger: 'talk' }],
      behaviors: {
        trigger: {
          talk: { label: '对话', order: 0, flow },
        },
      },
    },
  ],
  ...over,
})

const item = (effect: unknown) => ({
  id: 'item',
  name: '测试物品',
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  use: {
    target: 'scene',
    consuming: true,
    effects: [effect],
  },
})

describe('canonical v5 scene validation', () => {
  test('accepts local behavior registries and named scene hook variants', () => {
    expect(() =>
      validateScenesV5([
        scene({
          hooks: {
            onTeleport: {
              initial: 'default',
              variants: {
                default: { label: '默认出口', order: 0, flow },
              },
            },
          },
        }),
      ]),
    ).not.toThrow()
  })

  test('rejects v4 top-level hooks and positional behavior pages', () => {
    expect(() => validateScenesV5([scene({ onEnter: [] })])).toThrow(/v5 已迁移至 hooks/)
    expect(() =>
      validateScenesV5([
        scene({
          entities: [
            {
              id: 'e1',
              sprite: 'npc',
              pos: { col: 1, row: 1, height: 0 },
              initialPage: 'default',
              pages: [
                {
                  id: 'default',
                  label: '默认',
                  trigger: { on: 'interact', stages: [{ body: [] }] },
                },
              ],
            },
          ],
        }),
      ]),
    ).toThrow(/trigger: 期望非空字符串/)
  })
})

describe('canonical v5 item script validation', () => {
  test('accepts stable shared ids and one inline item-private use slot', () => {
    expect(() =>
      validateItemsV5([
        item({ kind: 'runScript', script: 'shared/user/teleport' }),
        {
          ...item({
            kind: 'itemPrivateScript',
            script: {
              id: 'use',
              label: '使用',
              body: [{ kind: 'setFlag', flag: 'used', value: true }],
            },
          }),
          id: 'private',
        },
      ]),
    ).not.toThrow()
  })

  test('rejects v4 ScriptRef and malformed private ownership', () => {
    expect(() =>
      validateItemsV5([
        item({ kind: 'runScript', script: { chunk: 'shared/c00', id: 'legacy' } }),
      ]),
    ).toThrow(/稳定 shared script id/)
    expect(() =>
      validateItemsV5([
        item({
          kind: 'itemPrivateScript',
          script: { id: 'other', body: [] },
        }),
      ]),
    ).toThrow(/固定为 use/)
  })

  test('retains the single external effect and scene-target contracts', () => {
    expect(() =>
      validateItemsV5([
        {
          ...item({ kind: 'runScript', script: 'shared/user/teleport' }),
          use: {
            target: 'scene',
            consuming: true,
            effects: [
              { kind: 'runScript', script: 'shared/user/teleport' },
              { kind: 'healHp', amount: 1 },
            ],
          },
        },
      ]),
    ).toThrow(/必须作为唯一效果/)
    expect(() =>
      validateItemsV5([
        {
          ...item({ kind: 'runScript', script: 'shared/user/teleport' }),
          use: {
            target: 'oneAlly',
            consuming: true,
            effects: [{ kind: 'runScript', script: 'shared/user/teleport' }],
          },
        },
      ]),
    ).toThrow(/必须使用 scene/)
  })
})
