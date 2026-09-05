import { describe, expect, test } from 'vitest'
import { validateAuthorItemCore, validateBaseScenes } from './validate.js'

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

describe('canonical author scene validation', () => {
  test('accepts local behavior registries and named scene hook variants', () => {
    expect(() =>
      validateBaseScenes([
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

  test('rejects non-current top-level hooks and positional behavior pages', () => {
    expect(() => validateBaseScenes([scene({ onEnter: [] })])).toThrow(/hooks/)
    expect(() =>
      validateBaseScenes([
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

  test('accepts dynamic-only behavior registries without inventing a static page', () => {
    expect(() =>
      validateBaseScenes([
        scene({
          entities: [
            {
              id: 'e1',
              sprite: 'npc',
              pos: { col: 1, row: 1, height: 0 },
              behaviors: {
                trigger: {
                  alternate: { label: '动态对话', order: 1, flow },
                },
              },
            },
          ],
        }),
      ]),
    ).not.toThrow()
    expect(() =>
      validateBaseScenes([
        scene({
          entities: [
            {
              id: 'e1',
              sprite: 'npc',
              pos: { col: 1, row: 1, height: 0 },
              initialPage: 'default',
            },
          ],
        }),
      ]),
    ).toThrow(/initialPage.*pages/)
  })
})

describe('canonical author item script validation', () => {
  test('accepts stable shared ids and one inline item-private use slot', () => {
    expect(() =>
      validateAuthorItemCore([
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

  test('allows an empty authoring chain and composes item-private script with pure effects', () => {
    const privateScript = {
      kind: 'itemPrivateScript' as const,
      script: {
        id: 'use' as const,
        label: '使用',
        body: [{ kind: 'setFlag' as const, flag: 'used', value: true }],
      },
    }
    expect(() =>
      validateAuthorItemCore([
        {
          ...item(privateScript),
          id: 'empty',
          use: { target: 'scene', consuming: false, effects: [] },
        },
        {
          ...item(privateScript),
          id: 'private-character',
          use: {
            target: 'oneAlly',
            consuming: true,
            effects: [privateScript, { kind: 'healHp', amount: 1 }],
          },
        },
        {
          ...item(privateScript),
          id: 'private-scene',
          use: {
            target: 'scene',
            consuming: false,
            effects: [
              privateScript,
              {
                kind: 'modifyHostileAwareness',
                rangeMultiplier: 0,
                durationMs: 1,
              },
            ],
          },
        },
      ]),
    ).not.toThrow()
  })

  test('rejects non-current ScriptRef ownership and malformed private ownership', () => {
    expect(() =>
      validateAuthorItemCore([
        item({ kind: 'runScript', script: { chunk: 'shared/c00', id: 'legacy' } }),
      ]),
    ).toThrow(/稳定 shared script id/)
    expect(() =>
      validateAuthorItemCore([
        item({
          kind: 'itemPrivateScript',
          script: { id: 'other', body: [] },
        }),
      ]),
    ).toThrow(/固定为 use/)
  })

  test('retains the single external effect and scene-target contracts', () => {
    expect(() =>
      validateAuthorItemCore([
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
      validateAuthorItemCore([
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
