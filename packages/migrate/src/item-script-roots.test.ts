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
  test('最终 overlay 后 use 的 runScript 成为审计根，独立投掷效果不产生伪根', () => {
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
            target: 'oneEnemy',
            effects: [{ kind: 'fixedDamage', amount: 10 }],
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
    ])
  })
})
