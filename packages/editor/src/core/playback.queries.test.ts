import type { AuthorCondition } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { flowOf, preview, target } from './__tests__/playback-canonical-fixtures.js'

describe('Canonical preview query and scratch boundaries', () => {
  test.each<{ name: string; cond: AuthorCondition; expected: number }>([
    { name: 'inventory', cond: { kind: 'hasItem', itemId: 'potion', atLeast: 2 }, expected: -1 },
    { name: 'ownership', cond: { kind: 'ownsItem', itemId: 'potion' }, expected: -1 },
    { name: 'equipment', cond: { kind: 'itemEquipped', itemId: 'potion' }, expected: -1 },
    { name: 'party', cond: { kind: 'inParty', actorId: 'hero' }, expected: -1 },
    { name: 'money', cond: { kind: 'hasMoney', atLeast: 1 }, expected: -1 },
    { name: 'full-health', cond: { kind: 'allFullHp' }, expected: 1 },
    { name: 'current-entity', cond: { kind: 'entityInScene', target }, expected: 1 },
    {
      name: 'foreign-entity',
      cond: { kind: 'entityInScene', target: { scene: 'elsewhere', entity: 'npc' } },
      expected: -1,
    },
    { name: 'facing-local', cond: { kind: 'facingEntity', target, range: 2 }, expected: -1 },
    {
      name: 'facing-foreign',
      cond: { kind: 'facingEntity', target: { scene: 'elsewhere', entity: 'npc' } },
      expected: -1,
    },
  ])('stub query $name selects the explicit arm', async ({ cond, expected }) => {
    const r = preview()
    await r.run([
      {
        kind: 'branch',
        cond,
        then: [{ kind: 'giveMoney', delta: 1 }],
        else: [{ kind: 'giveMoney', delta: -1 }],
      },
    ])
    expect(r.p.view.logs).toEqual([`💰 ${expected > 0 ? '+' : ''}${expected} 钱`])
  })

  test('scratch flag and variable changes drive branches but are discarded on the next run', async () => {
    const r = preview()
    const query = flowOf([
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'visited', is: true },
        then: [{ kind: 'giveMoney', delta: 1 }],
        else: [{ kind: 'giveMoney', delta: -1 }],
      },
    ])
    await r.run([
      { kind: 'setFlag', flag: 'visited', value: true },
      { kind: 'setVar', var: 'count', value: 2 },
      { kind: 'addVar', var: 'count', delta: 3 },
      {
        kind: 'branch',
        cond: {
          kind: 'all',
          of: [
            { kind: 'flag', flag: 'visited', is: true },
            { kind: 'var', var: 'count', op: '==', value: 5 },
          ],
        },
        then: [{ kind: 'giveMoney', delta: 5 }],
      },
    ])
    expect(r.p.view.logs).toEqual(['💰 +5 钱'])
    await r.start(query)
    expect(r.p.view.logs).toEqual(['💰 -1 钱'])
    expect(r.p.mode).toBe('done')
    r.unchanged()
  })

  test('foreign relative placement fails visibly without committing a following command', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        {
          kind: 'setEntityPosRelParty',
          target: { scene: 'elsewhere', entity: 'npc' },
          dcol: 1,
          drow: 2,
        },
        { kind: 'giveMoney', delta: 99 },
      ]),
    )
    expect(p.mode).toBe('done')
    expect(p.activePath).toBeNull()
    expect(p.view.entity.size).toBe(0)
    expect(p.view.logs).toEqual(['⚠ 预览中断：预览相对摆位不属于当前场景: elsewhere/npc'])
    r.unchanged()
  })
})
