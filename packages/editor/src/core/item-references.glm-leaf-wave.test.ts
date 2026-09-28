import type { AuthorCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { collectCanonicalItemTaggedReferences } from './item-references.js'

describe('collectCanonicalItemTaggedReferences 剩余合同', () => {
  test('giveItem/loseItem map to reward/lose with count detail', () => {
    expect(
      collectCanonicalItemTaggedReferences(
        { kind: 'giveItem', itemId: 'herb', count: 3 },
        'shared/user/route.body[0]',
      ),
    ).toEqual([
      {
        itemId: 'herb',
        access: 'reward',
        detail: '获得 ×3',
        where: 'shared/user/route.body[0].itemId',
      },
    ])
    expect(
      collectCanonicalItemTaggedReferences(
        { kind: 'loseItem', itemId: 'key', count: 1 },
        'shared/user/route.body[1]',
      ),
    ).toEqual([
      {
        itemId: 'key',
        access: 'lose',
        detail: '失去 ×1',
        where: 'shared/user/route.body[1].itemId',
      },
    ])
  })

  test('branch conditions scan item leaves as reads and non-item commands yield nothing', () => {
    const branch: AuthorCommand = {
      kind: 'branch',
      cond: { kind: 'hasItem', itemId: 'key', atLeast: 2 },
      then: [],
    }
    const references = collectCanonicalItemTaggedReferences(branch, 'shared/user/route.body[2]')
    expect(references).toHaveLength(1)
    const first = references[0]!
    expect(first).toMatchObject({
      itemId: 'key',
      access: 'read',
      detail: '检查背包数量 ≥ 2',
    })
    expect(first.where).toContain('.cond')

    expect(
      collectCanonicalItemTaggedReferences({ kind: 'setFlag', flag: 'x', value: true }, 'p'),
    ).toEqual([])
  })
})
