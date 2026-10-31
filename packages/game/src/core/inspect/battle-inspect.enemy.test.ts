import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  inspectionNames,
  inspectionPoisons,
  makeBattleReadoutState,
  makeExploreState,
  makeInspectionState,
  makeSingleEnemyBattle,
  POISON_ID,
} from './__tests__/readout-fixture.js'
import { collectEnemyStatusReadouts } from './battle-inspect.js'

describe('Enemy values, effects and name projections', () => {
  it('collectEnemyStatusReadouts:读敌当前血量/名/未倒;非战斗空数组', () => {
    const readouts = collectEnemyStatusReadouts(makeBattleReadoutState())
    expect(readouts[0]!.hp).toBe(42)
    expect(readouts[0]!.name).toBe('飞贼')
    expect(readouts[0]!.defeated).toBe(false)
    expect(readouts[0]!.steal).toBe('不可偷')
    expect(readouts[0]!.attackEquivPoison).toBeNull() // 合法 Enemy 的两个字段均为0，不显示
    expect(collectEnemyStatusReadouts(makeExploreState())).toEqual([])
  })

  it('collectEnemyStatusReadouts:普攻毒(attackEquivItem>0 && rate>0 解析道具名#id+率/10;任一为 0 → null)', () => {
    const items: Item[] = [
      {
        id: 116,
        _name: '尸腐肉',
        bitmap: 0,
        price: 0,
        scriptOnUse: 0,
        scriptOnEquip: 0,
        scriptOnThrow: 0,
        scriptDesc: 0,
        flags: {
          usable: false,
          equipable: false,
          throwable: true,
          consuming: true,
          applyToAll: false,
          sellable: false,
          equipableBy: [false, false, false, false, false, false],
        },
      },
    ]
    const attackEffectState = (equivItem: number, equivRate: number) =>
      makeBattleReadoutState({ attackEquivItem: equivItem, attackEquivItemRate: equivRate })
    expect(
      collectEnemyStatusReadouts(attackEffectState(116, 7), [], items)[0]!.attackEquivPoison,
    ).toBe('尸腐肉#116（率 7/10）')
    expect(
      collectEnemyStatusReadouts(attackEffectState(999, 5), [], items)[0]!.attackEquivPoison,
    ).toBe('物品#999（率 5/10）') // 名缺 → #id
    expect(
      collectEnemyStatusReadouts(attackEffectState(116, 0), [], items)[0]!.attackEquivPoison,
    ).toBeNull() // rate=0 不触发
    expect(
      collectEnemyStatusReadouts(attackEffectState(0, 7), [], items)[0]!.attackEquivPoison,
    ).toBeNull() // 无道具
  })

  it('collectEnemyStatusReadouts:灵葫值 collectValue(零与非零原样,供灵葫咒判定)', () => {
    // 合法 Enemy 的 collectValue=0，灵葫咒收不掉。
    expect(collectEnemyStatusReadouts(makeBattleReadoutState())[0]!.collectValue).toBe(0)
    // 有灵葫值的敌人 → 原样读出(灵葫咒要求 ≠0 才收得掉,见 game-mechanics 紫金葫芦炼丹)
    const gs = makeBattleReadoutState({ id: 144, _name: '火神龙', health: 100, collectValue: 7 })
    expect(collectEnemyStatusReadouts(gs)[0]!.collectValue).toBe(7)
  })

  it('steal 三分支：金钱/知名物品/缺名物品', () => {
    const money = collectEnemyStatusReadouts(
      makeInspectionState(makeSingleEnemyBattle({ stealItemCount: 5 })),
    )[0]!
    expect(money.canSteal).toBe(true)
    expect(money.steal).toBe('金钱 ×5')
    const named = collectEnemyStatusReadouts(
      makeInspectionState(makeSingleEnemyBattle({ stealItem: POISON_ID, stealItemCount: 2 })),
      inspectionPoisons,
      inspectionNames,
    )[0]!
    expect(named.steal).toBe('毒蛇卵 ×2')
    const unknown = collectEnemyStatusReadouts(
      makeInspectionState(makeSingleEnemyBattle({ stealItem: 999, stealItemCount: 1 })),
      [],
      inspectionNames,
    )[0]!
    expect(unknown.steal).toBe('物品#999 ×1')
  })

  it('maxHp 优先 maxHealth，缺省取 prevHp；defeated 与巫抗行', () => {
    const explicitMaximum = collectEnemyStatusReadouts(
      makeInspectionState(makeSingleEnemyBattle({ health: 30 }, { maxHealth: 80, prevHp: 50 })),
    )[0]!
    expect(explicitMaximum.maxHp).toBe(80)
    const noMax = collectEnemyStatusReadouts(
      makeInspectionState(makeSingleEnemyBattle({ health: 42 })),
    )[0]!
    expect(noMax.maxHp).toBe(42) // maxHealth 缺 → prevHp 42
    const withPrev = collectEnemyStatusReadouts(
      makeInspectionState(makeSingleEnemyBattle({ health: 30 }, { prevHp: 50 })),
    )[0]!
    expect(withPrev.maxHp).toBe(50) // maxHealth 缺 → prevHp 50
    const dead = collectEnemyStatusReadouts(
      makeInspectionState(makeSingleEnemyBattle({ health: 0 }, { defeated: true })),
    )[0]!
    expect(dead.defeated).toBe(true)
    expect(dead.resistances.find((x) => x.label === '巫抗')?.value).toBe(4)
  })

  it('敌方状态与毒条：be.status/confused → 乱；be.poisons → 毒 entries/tags', () => {
    const battle = makeSingleEnemyBattle(
      {},
      {
        status: { confused: 4 },
        poisons: [{ poisonId: POISON_ID, scriptEntry: 9 }],
      },
    )
    const readout = collectEnemyStatusReadouts(
      makeInspectionState(battle),
      inspectionPoisons,
      inspectionNames,
    )[0]!
    expect(readout.statuses).toContainEqual({ name: '乱', kind: 'debuff', rounds: 4 })
    expect(readout.statusEntries).toContain('毒:毒蛇卵#551 L3 script:9')
  })
})
