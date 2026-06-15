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
    },
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
    expect(collectEnemyStatusReadouts(exploreGs())).toEqual([])
  })
  it('collectPartyStatusReadouts:名/来源/HP/抗性 + 结构化状态(纯中文名+类型)', () => {
    const r = collectPartyStatusReadouts(battleGs(), roles)
    expect(r[0]!.roleName).toBe('李逍遥')
    expect(r[0]!.source).toBe('battle')
    expect(r[0]!.hp).toBe(100)
    expect(r[0]!.maxHp).toBe(120)
    expect(r[0]!.resistances.find((x) => x.label === '风')?.value).toBe(5)
    // statuses:纯中文名 + 类型(双攻=buff,眠=debuff),无英文/回合/来源
    expect(r[0]!.statuses).toContainEqual({ name: '双攻', kind: 'buff' })
    expect(r[0]!.statuses).toContainEqual({ name: '眠', kind: 'debuff' })
    // entries(dev 详细)仍含中英 + 回合
    expect(r[0]!.entries.some((e) => e.includes('双攻/dual'))).toBe(true)
  })
})
