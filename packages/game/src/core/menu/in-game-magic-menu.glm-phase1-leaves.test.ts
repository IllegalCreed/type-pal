/**
 * TEST-GLM-PHASE1-LEAVES-3 L02（in-game-magic-menu.ts）— 去重表：
 *  - in-game-magic-menu.test（4 相转换/死人 caster/载荷/取消/网格导航/刷新主干）→ 不重复
 *  - in-game-magic-menu.boundaries.test（单人队直进/applyToAll 分相/非顺序 party/错相零请求）→ 不重复
 *  - 新差异：DL22 施法人光标跨开启记忆（rememberMagicCasterCursor 建表回放 + 越界归 0）、
 *    partyMembers 含 roles 缺失 id 剔除、错相 confirmCaster 零请求、空 spellMenu 全导航兜底、
 *    pick-target Left/Right 及非 pick-spell 相 Page/Home/End 零触达、关菜单后 refresh 不复活、
 *    单人队死亡成员仍直进 pick-spell（uigame.c:677-681 不检 HP）。
 * 显示 vs 执行：只核状态机与请求对象；不跑 scriptOnUse/不扣 MP。
 */
import type { Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  cancelInGameMagic,
  confirmCaster,
  confirmSpell,
  createInGameMagicMenu,
  inGameMagicEnd,
  inGameMagicHome,
  inGameMagicMoveDown,
  inGameMagicMoveLeft,
  inGameMagicMoveRight,
  inGameMagicMoveUp,
  inGameMagicPageDown,
  inGameMagicPageUp,
  refreshSpellMenu,
  rememberMagicCasterCursor,
} from './in-game-magic-menu.js'

function mkRole(id: number, hp: number, mp: number, magic: number[]): PlayerRole {
  return {
    id,
    _name: `role-${id}`,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 5,
    maxHP: 200,
    maxMP: 100,
    hp,
    mp,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 0,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 3,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
    magic,
  }
}

const SPELLS: Spell[] = [
  {
    id: 300,
    magicNumber: 1,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
    _name: '单体术',
  },
  {
    id: 301,
    magicNumber: 2,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: true,
    },
    _name: '全体术',
  },
]

function mkMagic(id: number, costMP: number): Magic {
  return {
    id,
    effect: 0,
    type: 'normal',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 0,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP,
    baseDamage: 0,
    elemental: 0,
    sound: 0,
  }
}

const MAGICS: Magic[] = [mkMagic(1, 4), mkMagic(2, 9)]

function roles(): PlayerRoles {
  return {
    roles: [mkRole(0, 100, 20, [300, 301]), mkRole(1, 100, 6, [300, 301])],
  }
}

function pickSpell(state: ReturnType<typeof createInGameMagicMenu>, spellId: number) {
  confirmCaster(state, roles(), SPELLS, MAGICS)
  const menu = state.spellMenu
  if (!menu) throw new Error('spellMenu 未建')
  const idx = menu.items.findIndex((i) => i.id === spellId)
  if (idx < 0) throw new Error(`spell ${spellId} 不在列表`)
  menu.cursor = idx
  return confirmSpell(state, SPELLS, MAGICS)
}

describe('L02 DL22 施法人光标跨开启记忆（uigame.c:674/719 static w）', () => {
  it('确认即记忆；再开菜单默认停回上次施法人；队伍变小越界归 0', () => {
    // 从干净 static 起：显式归 0
    rememberMagicCasterCursor(0)
    const first = createInGameMagicMenu(roles(), [0, 1], SPELLS, MAGICS)
    expect(first.casterMenu.cursor).toBe(0)
    first.casterMenu.cursor = 1
    confirmCaster(first, roles(), SPELLS, MAGICS) // 确认 role 1 → static=1
    const second = createInGameMagicMenu(roles(), [0, 1], SPELLS, MAGICS)
    expect(second.casterMenu.cursor).toBe(1) // 回放记忆
    second.casterMenu.cursor = 0
    confirmCaster(second, roles(), SPELLS, MAGICS) // static=0 收尾，不污染后续用例
  })

  it('越界（上次光标 ≥ 队伍人数）→ 保持建表默认 0', () => {
    rememberMagicCasterCursor(5) // 模拟上次 5 人队尾部
    const s = createInGameMagicMenu(roles(), [0, 1], SPELLS, MAGICS)
    expect(s.casterMenu.cursor).toBe(0)
    rememberMagicCasterCursor(0)
  })
})

describe('L02 建表与错相合同', () => {
  it('partyMembers 含 roles 缺失的 id → 建表剔除（!role 过滤分支）', () => {
    const s = createInGameMagicMenu(roles(), [0, 1, 99], SPELLS, MAGICS)
    expect(s.casterMenu.items.map((i) => i.id)).toEqual([0, 1])
    expect(s.partyMembers).toEqual([0, 1, 99]) // party 快照保留原值（close 判断用）
  })

  it('错相 confirmCaster 零请求：pick-spell 相调用不重建 spellMenu', () => {
    const s = createInGameMagicMenu(roles(), [0, 1], SPELLS, MAGICS)
    s.casterMenu.cursor = 0
    confirmCaster(s, roles(), SPELLS, MAGICS)
    expect(s.phase).toBe('pick-spell')
    const menuBefore = s.spellMenu
    confirmCaster(s, roles(), SPELLS, MAGICS) // 错相 no-op
    expect(s.phase).toBe('pick-spell')
    expect(s.spellMenu).toBe(menuBefore)
  })

  it('单人队死亡成员仍直进 pick-spell（uigame.c:677-681 快速道不检 HP）', () => {
    const dead = { roles: [mkRole(0, 0, 20, [300])] }
    const s = createInGameMagicMenu(dead, [0], SPELLS, MAGICS)
    expect(s.phase).toBe('pick-spell')
    expect(s.selectedCasterId).toBe(0)
    expect(s.spellMenu).toBeDefined()
  })
})

describe('L02 空 spellMenu 导航兜底（moveSpellGrid n===0 分支）', () => {
  it('无法术 caster 进 pick-spell 后八向/翻页/Home/End 全不抛错、cursor 恒 0', () => {
    const empty: PlayerRoles = { roles: [mkRole(0, 100, 20, []), mkRole(1, 100, 6, [300])] }
    const s = createInGameMagicMenu(empty, [0], SPELLS, MAGICS)
    expect(s.phase).toBe('pick-spell')
    expect(s.spellMenu!.items).toHaveLength(0)
    inGameMagicMoveUp(s)
    inGameMagicMoveDown(s)
    inGameMagicMoveLeft(s)
    inGameMagicMoveRight(s)
    inGameMagicPageUp(s)
    inGameMagicPageDown(s)
    inGameMagicHome(s)
    inGameMagicEnd(s)
    expect(s.spellMenu!.cursor).toBe(0)
    expect(s.phase).toBe('pick-spell')
  })
})

describe('L02 pick-target Left/Right 与非 pick-spell 相翻页零触达', () => {
  it('pick-target：Left/Right 移动且边界 noop（与 Up/Down 同合同）', () => {
    const s = createInGameMagicMenu(roles(), [0, 1], SPELLS, MAGICS)
    expect(pickSpell(s, 300)).not.toBeNull() // 单体 → pick-target
    expect(s.phase).toBe('pick-target')
    inGameMagicMoveRight(s)
    expect(s.targetCursor).toBe(1)
    inGameMagicMoveRight(s)
    expect(s.targetCursor).toBe(1) // 末位 noop
    inGameMagicMoveLeft(s)
    expect(s.targetCursor).toBe(0)
    inGameMagicMoveLeft(s)
    expect(s.targetCursor).toBe(0) // 首位 noop
  })

  it('pick-caster 相 PageUp/PageDown/Home/End 不动 casterMenu', () => {
    const s = createInGameMagicMenu(roles(), [0, 1], SPELLS, MAGICS)
    s.casterMenu.cursor = 1
    inGameMagicPageUp(s)
    inGameMagicPageDown(s)
    inGameMagicHome(s)
    inGameMagicEnd(s)
    expect(s.casterMenu.cursor).toBe(1)
  })

  it('pick-target 相 Home/End 不动 targetCursor', () => {
    const s = createInGameMagicMenu(roles(), [0, 1], SPELLS, MAGICS)
    pickSpell(s, 300)
    s.targetCursor = 1
    inGameMagicHome(s)
    inGameMagicEnd(s)
    expect(s.targetCursor).toBe(1)
  })
})

describe('L02 关闭后 refresh / cancel 幂等', () => {
  it('pick-spell Cancel 关菜单后 refreshSpellMenu 不复活 spellMenu（防御分支）', () => {
    const s = createInGameMagicMenu(roles(), [0, 1], SPELLS, MAGICS)
    s.casterMenu.cursor = 0
    confirmCaster(s, roles(), SPELLS, MAGICS)
    cancelInGameMagic(s) // pick-spell → done
    expect(s.phase).toBe('done')
    expect(s.spellMenu).toBeUndefined()
    refreshSpellMenu(s, roles(), SPELLS, MAGICS, 99)
    expect(s.spellMenu).toBeUndefined() // selectedCasterId 已清 → 早退
    cancelInGameMagic(s) // done 相再 cancel → 仍 done
    expect(s.phase).toBe('done')
  })
})
