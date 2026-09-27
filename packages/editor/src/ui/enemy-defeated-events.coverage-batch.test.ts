import {
  type AuthorCondition,
  type AuthorEnemyDef,
  type ItemData,
  validateItems,
  validateWorldVariableRegistryV1,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  createEnemyDefeatedPresentationContext,
  presentEnemyDefeatedEvents,
} from './enemy-defeated-events.js'

const items: ItemData[] = validateItems([
  { id: 'herb', name: 'name.herb', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
])
const context = createEnemyDefeatedPresentationContext({
  items,
  locale: { 'name.herb': '止血草', 'name.hero': '李逍遥' },
  assetCatalog: { version: 1, assets: {} },
  worldVariables: validateWorldVariableRegistryV1({
    opened: { kind: 'flag', name: '已开门', description: '', initial: false },
    score: { kind: 'number', name: '积分', description: '', initial: 0 },
  }),
  actors: [{ id: 'hero', name: 'name.hero', spriteId: 'hero' }],
  scenes: [
    {
      id: 'room',
      mapId: 'map',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    },
  ],
})
type Events = NonNullable<AuthorEnemyDef['onDefeated']>

describe('当前敌人击败事件展示的条件边界', () => {
  test.each([
    [{ kind: 'flag', flag: 'opened', is: false }, '开关 已开门 为关闭', false],
    [{ kind: 'flag', flag: 'unknown', is: true }, '开关 unknown 为开启', true],
    [{ kind: 'var', var: 'score', op: '!=', value: 2 }, '积分 ≠ 2', false],
    [{ kind: 'var', var: 'score', op: '==', value: 2 }, '积分 = 2', false],
    [{ kind: 'var', var: 'score', op: '<=', value: 2 }, '积分 ≤ 2', false],
    [{ kind: 'currentScene', scene: 'room' }, '当前场景是 room', false],
    [{ kind: 'currentScene', scene: 'missing' }, '当前场景是 missing', true],
    [{ kind: 'chance', percent: 40 }, '40% 概率', false],
    [{ kind: 'hasItem', itemId: 'herb', atLeast: 2 }, '背包有 止血草 ×2', false],
    [{ kind: 'ownsItem', itemId: 'herb' }, '持有 止血草 ×1', false],
    [{ kind: 'itemEquipped', itemId: 'missing' }, '已装备 missing ×1', true],
    [{ kind: 'allFullHp' }, '全队 HP 已满', false],
    [{ kind: 'hasMoney', atLeast: 100 }, '金钱不少于 100', false],
    [{ kind: 'inParty', actorId: 'hero' }, '李逍遥 在队伍中', false],
    [{ kind: 'inParty', actorId: 'ghost' }, 'ghost 在队伍中', true],
    [{ kind: 'not', cond: { kind: 'allFullHp' } }, '不满足（全队 HP 已满）', false],
  ] satisfies Array<
    [AuthorCondition, string, boolean]
  >)('$0 呈现为 $1 并保留引用风险', (cond, label, invalid) => {
    const events: Events = [
      { kind: 'branch', cond, then: [{ kind: 'giveMoney', delta: 1 }], else: [] },
    ]
    const before = structuredClone(events)
    const result = presentEnemyDefeatedEvents(events, context)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]?.label).toBe(cond.kind === 'chance' ? `${label}时` : `如果 ${label}`)
    expect(result.nodes[0]?.invalid).toBe(invalid ? true : undefined)
    expect(result.nodes[0]?.arms).toEqual([
      {
        kind: 'then',
        path: 'onDefeated[0].then',
        label: '满足时',
        nodes: [expect.objectContaining({ kind: 'giveMoney', label: '获得金钱 1' })],
      },
      { kind: 'else', path: 'onDefeated[0].else', label: '否则', nodes: [] },
    ])
    expect(events).toEqual(before)
  })
})
