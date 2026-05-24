import type { Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type {
  BattleEnemy,
  BattlePlayer,
  BattleState,
} from '../../../core/battle/battle-state.js'
import type { BusEntry } from '../../../core/command-bus.js'
import { createInitialGameState, type GameState } from '../../../core/game-state.js'
import { createSeedableRng } from '../../../core/rng.js'
import { createFramebuffer } from '../../framebuffer.js'
import type { BattleBgAsset } from '../draw-battle-bg.js'
import type { SpriteAsset } from '../draw-battle-sprites.js'
import { type BattleAssets, BattlePresent } from '../present-battle.js'

function minimalRole(id: number, opts: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id,
    _name: `Role${id}`,
    avatar: 0,
    spriteNumInBattle: id,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 10,
    maxHP: 200,
    maxMP: 30,
    hp: 200,
    mp: 30,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 30,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
    ...opts,
  }
}

function minimalEnemy(id: number, health = 50): Enemy {
  return {
    id,
    _name: 'TestEnemy',
    idleFrames: 0,
    magicFrames: 0,
    attackFrames: 0,
    idleAnimSpeed: 0,
    actWaitFrames: 0,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health,
    exp: 10,
    cash: 30,
    level: 5,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 20,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
  }
}

function mkBattlePlayer(roleId: number): BattlePlayer {
  return {
    roleId,
    prevHp: 200,
    prevMp: 30,
    defending: false,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
  }
}

function mkBattleEnemy(e: Enemy): BattleEnemy {
  return {
    e: { ...e },
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    prevHp: e.health,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }
}

function mkState(
  players: BattlePlayer[],
  enemies: BattleEnemy[],
  overrides: Partial<BattleState> = {},
): BattleState {
  return {
    players,
    enemies,
    field: { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
    isBoss: false,
    phase: 'selectAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'mainMenu',
    uiCursor: 0,
    selectingPlayerIdx: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
    ...overrides,
  }
}

function mkGs(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState({ col: 0, row: 0, facing: 'down' }),
    mode: 'battle',
    ...overrides,
  }
}

function mkBgAsset(fill = 4): BattleBgAsset {
  return {
    width: 320,
    height: 200,
    indices: new Uint8Array(320 * 200).fill(fill),
  }
}

function mkSpriteAsset(w: number, h: number, fill: number): SpriteAsset {
  return {
    frames: [{
      width: w,
      height: h,
      indices: new Uint8Array(w * h).fill(fill),
      // M3.5 fix:opaque 全 1 = 完全 opaque
      opaque: new Uint8Array(w * h).fill(1),
    }],
  }
}

function mkAssets(overrides: Partial<BattleAssets> = {}): BattleAssets {
  return {
    battleSprites: new Map(),
    battleBgs: new Map(),
    playerRoles: { roles: [] },
    spells: [],
    items: [],
    ...overrides,
  }
}

function fbHasWrites(fb: ReturnType<typeof createFramebuffer>): boolean {
  for (let i = 0; i < fb.indices.length; i++) {
    if (fb.indices[i] !== 0) return true
  }
  return false
}

describe('BattlePresent', () => {
  it('draw —— 空 assets + 空 commands 不抛错', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [])
    expect(() =>
      present.draw(fb, mkGs(), state, [], mkAssets(), 0),
    ).not.toThrow()
  })

  it('draw —— bg + sprite + UI 联合落在 framebuffer', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const role = minimalRole(0, { spriteNumInBattle: 1 })
    const assets = mkAssets({
      battleBgs: new Map([[0, mkBgAsset(4)]]),
      battleSprites: new Map([
        ['player-1', mkSpriteAsset(2, 2, 8)],
        ['enemy-50', mkSpriteAsset(2, 2, 9)],
      ]),
      playerRoles: { roles: [role] },
    })
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50))],
    )
    present.draw(fb, mkGs(), state, [], assets, 0)
    // bg(填 4)在大多数像素;sprite 在锚点;UI 在底部 / 顶部
    expect(fbHasWrites(fb)).toBe(true)
    // 角落位置应被 bg 覆盖(无 sprite / UI)
    expect(fb.indices[0]).toBe(4)
  })

  it('showDamageNum 命令 → floating nums 写入 framebuffer', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [])
    const commands: BusEntry[] = [
      {
        cmdId: 1,
        cmd: { op: 'showDamageNum', x: 100, y: 80, value: 25, color: 'yellow' },
      },
    ]
    present.draw(fb, mkGs(), state, commands, mkAssets(), 0)
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('多 showDamageNum + 跨帧 —— 数字飘上去,旧数字过期', () => {
    const fb1 = createFramebuffer()
    const fb2 = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [])
    const commands: BusEntry[] = [
      {
        cmdId: 1,
        cmd: { op: 'showDamageNum', x: 100, y: 80, value: 25, color: 'yellow' },
      },
      {
        cmdId: 2,
        cmd: { op: 'showDamageNum', x: 200, y: 100, value: 50, color: 'blue' },
      },
    ]
    present.draw(fb1, mkGs(), state, commands, mkAssets(), 0)
    // 100 帧后(超 duration=15)同 layer 再 draw,数字应过期(画面只剩 0)
    present.draw(fb2, mkGs(), state, [], mkAssets(), 100)
    expect(fbHasWrites(fb1)).toBe(true)
    expect(fbHasWrites(fb2)).toBe(false)
  })

  it('非 showDamageNum 命令(如 playEnemyAttack)被静默跳过', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [])
    const commands: BusEntry[] = [
      { cmdId: 1, cmd: { op: 'playEnemyAttack', enemyIdx: 0, targetPlayerIdx: 0 } },
      { cmdId: 2, cmd: { op: 'flashEnemy', enemyIdx: 0, durationMs: 100 } },
      { cmdId: 3, cmd: { op: 'showBattleMessage', text: 'hello' } },
      { cmdId: 4, cmd: { op: 'showBattleUI', state: 'mainMenu' } },
      {
        cmdId: 5,
        cmd: {
          op: 'playMagicAnim',
          magicId: 1,
          casterType: 'player',
          casterIdx: 0,
          targetType: 'enemy',
          targetIdx: 0,
        },
      },
    ]
    expect(() =>
      present.draw(fb, mkGs(), state, commands, mkAssets(), 0),
    ).not.toThrow()
  })

  it('clearFloatingNums —— 清空残留数字', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [])
    const cmds: BusEntry[] = [
      {
        cmdId: 1,
        cmd: { op: 'showDamageNum', x: 100, y: 80, value: 25, color: 'yellow' },
      },
    ]
    present.draw(fb, mkGs(), state, cmds, mkAssets(), 0)
    present.clearFloatingNums()
    // 再画一帧 —— 弹幕已清,无遗留写入
    const fb2 = createFramebuffer()
    present.draw(fb2, mkGs(), state, [], mkAssets(), 1)
    expect(fbHasWrites(fb2)).toBe(false)
  })

  it('无对应 BattleField bg —— 跳过 bg 绘制,不抛', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [], { field: { id: 99, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } } })
    expect(() =>
      present.draw(fb, mkGs(), state, [], mkAssets({ battleBgs: new Map() }), 0),
    ).not.toThrow()
  })

  it('uiState=hidden + 空 players/enemies —— 几乎无写入(只有可能的 bg)', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [], { uiState: 'hidden', selectingPlayerIdx: undefined })
    present.draw(fb, mkGs(), state, [], mkAssets(), 0)
    // 无 bg、无 sprite、无 UI 写入 —— framebuffer 应全 0
    expect(fbHasWrites(fb)).toBe(false)
  })
})

describe('BattlePresent —— PresentCommand 不影响 state', () => {
  it('showDamageNum 多帧累积,合并到一个 floating layer', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [])
    // 帧 0:emit 2 个
    present.draw(fb, mkGs(), state, [
      { cmdId: 1, cmd: { op: 'showDamageNum', x: 50, y: 50, value: 1, color: 'yellow' } },
      { cmdId: 2, cmd: { op: 'showDamageNum', x: 60, y: 60, value: 2, color: 'blue' } },
    ], mkAssets(), 0)
    // 帧 5:emit 1 个 —— 总共 3 个数字飘
    const fb2 = createFramebuffer()
    present.draw(fb2, mkGs(), state, [
      { cmdId: 3, cmd: { op: 'showDamageNum', x: 70, y: 70, value: 3, color: 'yellow' } },
    ], mkAssets(), 5)
    expect(fbHasWrites(fb2)).toBe(true)
  })
})
