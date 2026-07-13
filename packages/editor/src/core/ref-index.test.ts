import type { SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildRefIndex } from './ref-index.js'

/** 最小场景 fixture(只填索引关心的字段)。 */
function scene(partial: Partial<SceneDef> & { id: string }): SceneDef {
  return {
    map: { reuseOriginalMap: 0 },
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    dialogues: [],
    ...partial,
  } as SceneDef
}

describe('buildRefIndex(N5 引用反向索引)', () => {
  test('onEnter 里 setFlag/setVar/giveItem 进写表;srcKey=__onEnter__', () => {
    const idx = buildRefIndex([
      scene({
        id: 's1',
        onEnter: [
          {
            body: [
              { kind: 'setFlag', flag: 'met-boss', value: true },
              { kind: 'setVar', var: 'count', value: 3 },
              { kind: 'addVar', var: 'count', delta: 1 },
              { kind: 'giveItem', itemId: '267', count: 2 },
              { kind: 'loseItem', itemId: '61' },
            ],
          },
        ],
      }),
    ])
    expect(idx.flags.get('met-boss')).toEqual([
      {
        sceneId: 's1',
        srcKey: '__onEnter__',
        srcLabel: '进场脚本',
        access: 'write',
        detail: '= true',
      },
    ])
    expect(idx.vars.get('count')?.map((r) => r.detail)).toEqual(['= 3', '+= 1'])
    expect(idx.items.get('267')?.[0]).toMatchObject({ access: 'write', detail: '+2' })
    expect(idx.items.get('61')?.[0]).toMatchObject({ access: 'write', detail: '-1' })
  })

  test('branch cond 递归(all/not 嵌套 + then/else 子命令);hasItem 进读表', () => {
    const idx = buildRefIndex([
      scene({
        id: 's2',
        entities: [
          {
            id: 'e1',
            pos: { col: 0, row: 0, height: 0 },
            sprite: 'x',
            pages: [
              {
                trigger: {
                  on: 'interact',
                  stages: [
                    {
                      body: [
                        {
                          kind: 'branch',
                          cond: {
                            kind: 'all',
                            of: [
                              { kind: 'flag', flag: 'door-open', is: false },
                              {
                                kind: 'not',
                                cond: { kind: 'hasItem', itemId: 'key-1', atLeast: 1 },
                              },
                            ],
                          },
                          then: [{ kind: 'setFlag', flag: 'door-open', value: true }],
                          else: [{ kind: 'giveItem', itemId: 'key-1' }],
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          } as SceneDef['entities'][number],
        ],
      }),
    ])
    const door = idx.flags.get('door-open')!
    expect(door).toHaveLength(2)
    expect(door[0]).toMatchObject({ access: 'read', detail: 'is false', srcKey: 'e1:trigger' })
    expect(door[1]).toMatchObject({ access: 'write', detail: '= true' })
    const key = idx.items.get('key-1')!
    expect(key.map((r) => r.access)).toEqual(['read', 'write'])
  })

  test('startBattle.onLose/confirm.onNo/setEntityAuto 内嵌命令都可达;hostile.onLose 标独立源', () => {
    const idx = buildRefIndex([
      scene({
        id: 's3',
        onEnter: [
          {
            body: [
              {
                kind: 'startBattle',
                team: 1,
                onLose: [{ kind: 'setFlag', flag: 'lost-once', value: true }],
              },
              { kind: 'confirm', onNo: [{ kind: 'setVar', var: 'refused', value: 1 }] },
              {
                kind: 'setEntityAuto',
                entity: 'e9',
                stages: [{ body: [{ kind: 'setFlag', flag: 'patrol-on', value: true }] }],
              },
            ],
          },
        ],
        entities: [
          {
            id: 'guard',
            pos: { col: 0, row: 0, height: 0 },
            sprite: 'x',
            hostile: {
              team: 2,
              onLose: [{ kind: 'setFlag', flag: 'spared', value: true }],
            },
          } as SceneDef['entities'][number],
        ],
      }),
    ])
    expect(idx.flags.get('lost-once')).toHaveLength(1)
    expect(idx.vars.get('refused')).toHaveLength(1)
    expect(idx.flags.get('patrol-on')).toHaveLength(1)
    expect(idx.flags.get('spared')?.[0]).toMatchObject({
      srcKey: 'guard:hostile',
      srcLabel: 'guard 战败命令',
    })
  })

  test('无引用 = 空表;不索引 entityState/chance 等非目标条件', () => {
    const idx = buildRefIndex([
      scene({
        id: 's4',
        onEnter: [
          {
            body: [
              {
                kind: 'branch',
                cond: { kind: 'chance', percent: 50 },
                then: [{ kind: 'wait', ms: 100 }],
              },
            ],
          },
        ],
      }),
    ])
    expect(idx.flags.size).toBe(0)
    expect(idx.vars.size).toBe(0)
    expect(idx.items.size).toBe(0)
  })
})
