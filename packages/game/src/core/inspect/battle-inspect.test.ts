// 战斗只读簇(从 dev-panel.ts 抽出的纯函数)语义回归。无 DEV 门,dev-panel + 生产工具面板共用。
// 最小 mock:仅填被读字段,其余 `as never` 绕完整类型(这是语义回归,不是类型测试)。
import { describe, expect, it } from 'vitest'
import type { PlayerRoles } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import {
  collectEnemyStatusReadouts,
  collectFieldInfoReadout,
  collectPartyStatusReadouts,
} from './battle-inspect.js'

function battleGs(over: Record<string, unknown> = {}): GameState {
  return {
    mode: 'battle',
    partyMembers: [0],
    rgPlayerStatus: {},
    rgPoisonStatus: {},
    PlayerRolesRuntime: {
      rgwLevel: [10], rgwHP: [100], rgwMaxHP: [120], rgwMP: [50], rgwMaxMP: [60],
      rgwElementalResistance: [[5], [0], [5], [0], [5]], rgwPoisonResistance: [8],
      rgwAttackStrength: [30], rgwMagicStrength: [40], rgwDefense: [12], rgwDexterity: [18], rgwFleeRate: [7],
    },
    rgEquipmentEffect: [], // 无装备 → 有效属性 = base
    Exp: { rgPrimaryExp: [{ wExp: 250 }] },
    battleState: {
      isBoss: false,
      players: [{ roleId: 0, status: { dualAttack: 32760, sleep: 3 } }],
      enemies: [
        {
          e: {
            id: 100, _name: '飞贼', health: 42, level: 3, attackStrength: 10,
            magicStrength: 0, defense: 5, dexterity: 8, fleeRate: 1, magic: 0,
            magicRate: 0, dualMove: 0, exp: 20, cash: 15,
            elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
            physicalResistance: 0, poisonResistance: 0, stealItem: 0, stealItemCount: 0,
          },
          defeated: false, maxHealth: 60, prevHp: 60, status: {}, poisons: [],
          resistanceToSorcery: 0,
        },
      ],
      field: { id: 7, screenWave: 0, magicEffect: { wind: 1, thunder: 0, water: 0, fire: -2, earth: 0 } },
    },
    ...over,
  } as never
}

const exploreGs = (): GameState => ({ mode: 'explore', partyMembers: [0], battleState: undefined }) as never
const roles: PlayerRoles = { roles: [{ id: 0, _name: '李逍遥' }] } as never

describe('battle-inspect(从 dev-panel 抽出,语义不变)', () => {
  it('collectFieldInfoReadout:战斗读 field(含 signed 场效);非战斗 null', () => {
    const f = collectFieldInfoReadout(battleGs())
    expect(f?.fieldId).toBe(7)
    expect(f?.elements.find((e) => e.label === '火')?.value).toBe(-2)
    expect(collectFieldInfoReadout(exploreGs())).toBeNull()
  })
  it('collectEnemyStatusReadouts:读敌当前血量/名/未倒;非战斗空数组', () => {
    const r = collectEnemyStatusReadouts(battleGs())
    expect(r[0]!.hp).toBe(42)
    expect(r[0]!.name).toBe('飞贼')
    expect(r[0]!.defeated).toBe(false)
    expect(r[0]!.steal).toBe('不可偷')
    expect(r[0]!.attackEquivPoison).toBeNull() // mock 敌无 attackEquivItem/Rate → 不显示
    expect(collectEnemyStatusReadouts(exploreGs())).toEqual([])
  })
  it('collectEnemyStatusReadouts:普攻毒(attackEquivItem>0 && rate>0 解析道具名#id+率/10;任一为 0 → null)', () => {
    const items = [{ id: 551, _name: '毒蛇卵' }] as never
    const mk = (equivItem: number, equivRate: number): GameState =>
      battleGs({
        battleState: {
          isBoss: false,
          players: [{ roleId: 0, status: {} }],
          enemies: [
            {
              e: {
                id: 100, _name: '蜜蜂', health: 10, attackEquivItem: equivItem, attackEquivItemRate: equivRate,
                elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
                stealItem: 0, stealItemCount: 0,
              },
              defeated: false, maxHealth: 10, prevHp: 10, status: {}, poisons: [], resistanceToSorcery: 0,
            },
          ],
          field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
        },
      })
    expect(collectEnemyStatusReadouts(mk(551, 7), [], items)[0]!.attackEquivPoison).toBe('毒蛇卵#551（率 7/10）')
    expect(collectEnemyStatusReadouts(mk(999, 5), [], items)[0]!.attackEquivPoison).toBe('物品#999（率 5/10）') // 名缺 → #id
    expect(collectEnemyStatusReadouts(mk(551, 0), [], items)[0]!.attackEquivPoison).toBeNull() // rate=0 不触发
    expect(collectEnemyStatusReadouts(mk(0, 7), [], items)[0]!.attackEquivPoison).toBeNull() // 无道具
  })
  it('collectPartyStatusReadouts:名/来源/HP/抗性 + 结构化状态(纯中文名+类型)', () => {
    const r = collectPartyStatusReadouts(battleGs(), roles)
    expect(r[0]!.roleName).toBe('李逍遥')
    expect(r[0]!.source).toBe('battle')
    expect(r[0]!.hp).toBe(100)
    expect(r[0]!.maxHp).toBe(120)
    expect(r[0]!.resistances.find((x) => x.label === '风')?.value).toBe(5)
    // statuses:中文名 + 类型 + 剩余回合(双攻=buff 32760>999=永久,眠=debuff 3);工具面板 chip 据此显示持续时间
    expect(r[0]!.statuses).toContainEqual({ name: '双攻', kind: 'buff', rounds: 32760 })
    expect(r[0]!.statuses).toContainEqual({ name: '眠', kind: 'debuff', rounds: 3 })
    // entries(dev 详细)仍含中英 + 回合
    expect(r[0]!.entries.some((e) => e.includes('双攻/dual'))).toBe(true)
    // 5 有效属性(含装备加成,无装备 → = base)+ 经验
    expect(r[0]!.attack).toBe(30)
    expect(r[0]!.magicPower).toBe(40)
    expect(r[0]!.defense).toBe(12)
    expect(r[0]!.dexterity).toBe(18)
    expect(r[0]!.fleeRate).toBe(7)
    expect(r[0]!.curExp).toBe(250)
    expect(r[0]!.nextExp).toBe(0) // 未传 levelUpExp → 0
    // 传 levelUpExp:nextExp = levelUpExp[level=10]
    const levelUp = Array.from({ length: 11 }, (_, i) => (i === 10 ? 5000 : 0))
    expect(collectPartyStatusReadouts(battleGs(), roles, [], [], levelUp)[0]!.nextExp).toBe(5000)
    // 五属性隐藏经验:标签顺序固定;mock 无 rgAttackExp.. 池 → cur/gained 0,next = levelUpExp[角色等级 10] = 5000
    const hp0 = collectPartyStatusReadouts(battleGs(), roles, [], [], levelUp)[0]!.hiddenExp
    expect(hp0.map((h) => h.label)).toEqual(['武术', '灵力', '防御', '身法', '吉运'])
    expect(hp0.every((h) => h.cur === 0 && h.gained === 0 && h.next === 5000)).toBe(true)
  })
})
