import type { ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { itemScriptCommandRoots } from './item-script-roots.js'

const base = (id: string): ItemData => ({
  id,
  name: id,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
})

describe('C8 · itemScriptCommandRoots', () => {
  test('最终 overlay 后 use/throw 的 runScript 都成为审计根，其他效果不产生伪根', () => {
    expect(
      itemScriptCommandRoots([
        {
          ...base('bundle'),
          use: {
            target: 'scene',
            consuming: true,
            effects: [
              { kind: 'runScript', script: { chunk: 'shared/c00', id: 'shared/item/bundle' } },
            ],
          },
        },
        {
          ...base('bomb'),
          throw: {
            effects: [
              { kind: 'runScript', script: { chunk: 'shared/c01', id: 'shared/item/bomb' } },
            ],
          },
        },
        {
          ...base('heal'),
          use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 10 }] },
        },
      ]),
    ).toEqual([
      {
        id: 'global/items/bundle/use-0',
        body: [{ kind: 'callScript', ref: { chunk: 'shared/c00', id: 'shared/item/bundle' } }],
      },
      {
        id: 'global/items/bomb/throw-0',
        body: [{ kind: 'callScript', ref: { chunk: 'shared/c01', id: 'shared/item/bomb' } }],
      },
    ])
  })
})
