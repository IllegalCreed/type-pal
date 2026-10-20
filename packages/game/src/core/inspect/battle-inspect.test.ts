// 战斗只读簇(从 dev-panel.ts 抽出的纯函数)语义回归。无 DEV 门,dev-panel + 生产工具面板共用。
// 使用公开状态工厂和显式 hydrate，fixture 与生产 runtime 的读取域一致。

import type { Enemy, Item, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeBattle, makeEnemy, makeRole } from '../../__tests__/coverage85-glm-game/harness.js'
import { createInitialGameState, type GameState, hydratePlayerRolesRuntime } from '../game-state.js'
import {
  collectEnemyStatusReadouts,
  collectFieldInfoReadout,
  collectPartyStatusReadouts,
} from './battle-inspect.js'

function battleGs(enemy: Partial<Enemy> = {}): GameState {
  const { gs, state, playerRoles } = makeBattle({
    roles: [
      makeRole(0, {
        _name: '李逍遥',
        level: 10,
        hp: 100,
        maxHP: 120,
        mp: 50,
        maxMP: 60,
        attackStrength: 30,
        magicStrength: 40,
        defense: 12,
        dexterity: 18,
        fleeRate: 7,
        poisonResistance: 8,
      }),
    ],
    enemies: [
      makeEnemy({
        id: 100,
        _name: '飞贼',
        health: 42,
        level: 3,
        attackStrength: 10,
        magicStrength: 0,
        defense: 5,
        dexterity: 8,
        fleeRate: 1,
        exp: 20,
        cash: 15,
        physicalResistance: 0,
        ...enemy,
      }),
    ],
  })
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
  gs.mode = 'battle'
  gs.PlayerRolesRuntime.rgwElementalResistance[0]![0] = 5
  gs.PlayerRolesRuntime.rgwElementalResistance[2]![0] = 5
  gs.PlayerRolesRuntime.rgwElementalResistance[4]![0] = 5
  gs.Exp.rgPrimaryExp[0]!.wExp = 250
  for (const key of [
    'rgAttackExp',
    'rgMagicPowerExp',
    'rgDefenseExp',
    'rgDexterityExp',
    'rgFleeExp',
  ] as const)
    gs.Exp[key][0]!.wLevel = 10
  state.players[0]!.status.dualAttack = 32760
  state.players[0]!.status.sleep = 3
  state.enemies[0]!.maxHealth = 60
  state.enemies[0]!.prevHp = 60
  state.field = {
    id: 7,
    screenWave: 0,
    magicEffect: { wind: 1, thunder: 0, water: 0, fire: -2, earth: 0 },
  }
  return gs
}
const exploreGs = (): GameState => createInitialGameState({ x: 0, y: 0, facing: 'down' })
const roles: PlayerRoles = { roles: [makeRole(0, { _name: '李逍遥' })] }

describe('battle-inspect(从 dev-panel 抽出,语义不变)', () => {
  it('重复角色队伍的只读快照按显示槽读取毒，不复用首个同角色槽', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [4, 5, 4]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 552, wPoisonScript: 0 }
    const rows = collectPartyStatusReadouts(gs, {
      roles: Array.from({ length: 6 }, (_, id) => makeRole(id)),
    })
    expect(rows.map((row) => row.statuses)).toEqual([[{ name: '毒#552', kind: 'poison' }], [], []])
    expect(rows.map((row) => row.entries)).toEqual([['毒槽0:#552'], [], []])
  })

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
    expect(r[0]!.attackEquivPoison).toBeNull() // 合法 Enemy 的两个字段均为0，不显示
    expect(collectEnemyStatusReadouts(exploreGs())).toEqual([])
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
    const mk = (equivItem: number, equivRate: number) =>
      battleGs({ attackEquivItem: equivItem, attackEquivItemRate: equivRate })
    expect(collectEnemyStatusReadouts(mk(116, 7), [], items)[0]!.attackEquivPoison).toBe(
      '尸腐肉#116（率 7/10）',
    )
    expect(collectEnemyStatusReadouts(mk(999, 5), [], items)[0]!.attackEquivPoison).toBe(
      '物品#999（率 5/10）',
    ) // 名缺 → #id
    expect(collectEnemyStatusReadouts(mk(116, 0), [], items)[0]!.attackEquivPoison).toBeNull() // rate=0 不触发
    expect(collectEnemyStatusReadouts(mk(0, 7), [], items)[0]!.attackEquivPoison).toBeNull() // 无道具
  })
  it('collectEnemyStatusReadouts:灵葫值 collectValue(零与非零原样,供灵葫咒判定)', () => {
    // 合法 Enemy 的 collectValue=0，灵葫咒收不掉。
    expect(collectEnemyStatusReadouts(battleGs())[0]!.collectValue).toBe(0)
    // 有灵葫值的敌人 → 原样读出(灵葫咒要求 ≠0 才收得掉,见 game-mechanics 紫金葫芦炼丹)
    const gs = battleGs({ id: 144, _name: '火神龙', health: 100, collectValue: 7 })
    expect(collectEnemyStatusReadouts(gs)[0]!.collectValue).toBe(7)
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
    // 五属性隐藏经验：各池已显式初始化到等级10；经验/本场计数为0，阈值为5000。
    const hp0 = collectPartyStatusReadouts(battleGs(), roles, [], [], levelUp)[0]!.hiddenExp
    expect(hp0.map((h) => h.label)).toEqual(['武术', '灵力', '防御', '身法', '吉运'])
    expect(hp0.every((h) => h.cur === 0 && h.gained === 0 && h.next === 5000)).toBe(true)
  })
})
