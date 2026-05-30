import type { Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleEnemy, BattlePlayer, BattleState } from '../../../core/battle/battle-state.js'
import type { BusEntry } from '../../../core/command-bus.js'
import { createInitialGameState, type GameState } from '../../../core/game-state.js'
import { createSeedableRng } from '../../../core/rng.js'
import { createFramebuffer } from '../../framebuffer.js'
import type { BattleBgAsset } from '../draw-battle-bg.js'
import type { SpriteAsset } from '../draw-battle-sprites.js'
import { type BattleAssets, BattlePresent } from '../present-battle.js'
import { startDialogLine } from '../../dialog-box.js'

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
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
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
    ...createInitialGameState({ x: 0, y: 0, facing: 'down' }),
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
    frames: [
      {
        width: w,
        height: h,
        indices: new Uint8Array(w * h).fill(fill),
        // M3.5 fix:opaque 全 1 = 完全 opaque
        opaque: new Uint8Array(w * h).fill(1),
      },
    ],
  }
}

/**
 * D17b:假 SPRITEUI 数字帧数组 —— drawNumber 用 base+digit 帧(yellow 19-28 / blue 29-38
 * / cyan 56-65)。每帧 6×8 全 opaque(index=1),让 drawNumber 一定写像素。
 */
function mkUiSpriteFrames(): import('../../../assets/png.js').IndexedImage[] {
  const frames: import('../../../assets/png.js').IndexedImage[] = []
  for (let i = 0; i < 66; i++) {
    frames.push({
      width: 6,
      height: 8,
      indices: new Uint8Array(6 * 8).fill(1),
      opaque: new Uint8Array(6 * 8).fill(1),
    })
  }
  return frames
}

function mkAssets(overrides: Partial<BattleAssets> = {}): BattleAssets {
  return {
    battleSprites: new Map(),
    battleBgs: new Map(),
    playerRoles: { roles: [] },
    spells: [],
    items: [],
    uiSpriteFrames: mkUiSpriteFrames(),
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
    expect(() => present.draw(fb, mkGs(), state, [], mkAssets(), 0)).not.toThrow()
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
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))])
    present.draw(fb, mkGs(), state, [], assets, 0)
    // bg(填 4)在大多数像素;sprite 在锚点;UI 在底部 / 顶部
    expect(fbHasWrites(fb)).toBe(true)
    // 角落位置应被 bg 覆盖(无 sprite / UI)
    expect(fb.indices[0]).toBe(4)
  })

  it('showDamageNum 命令(enemy target)→ floating nums 写入 framebuffer', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [mkBattleEnemy(minimalEnemy(50))])
    const commands: BusEntry[] = [
      {
        cmdId: 1,
        cmd: { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 25, color: 'blue' },
      },
    ]
    present.draw(fb, mkGs(), state, commands, mkAssets(), 0)
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('showDamageNum 坐标解析(enemy):x=anchor.x-24, y=clamp(anchor.y-115, 10)', () => {
    // 1 enemy fallback layout = (160,80),yPosOffset=0 → anchor=(160,80)。
    //   sdlpal fight.c:640-641 enemy x=-9,y=-115;再 PAL_BattleUIShowNum x-=15 → x=160-24=136,y=clamp(80-115,10)=10。
    const present = new BattlePresent()
    const fb = createFramebuffer()
    const state = mkState([], [mkBattleEnemy(minimalEnemy(50))])
    // 捕获 floating layer emit 的坐标:用 spy 包 framebuffer.writePixel 收集写点(全 opaque digit)。
    const writes: Array<{ x: number; y: number }> = []
    const origWrite = fb.writePixel.bind(fb)
    fb.writePixel = (x: number, y: number, idx: number) => {
      writes.push({ x, y })
      origWrite(x, y, idx)
    }
    present.draw(
      fb,
      mkGs(),
      state,
      [
        {
          cmdId: 1,
          cmd: { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 25, color: 'blue' },
        },
      ],
      mkAssets(),
      0,
    )
    // 数字 "25" 右对齐 nLength=5 起点 x = (136) - 6 + 6*5 = 160;最右 digit blit 起 x=154。
    // 关键断言:所有写点 y 都在 anchor.y-115 clamp 到 10 那一行附近(age=0 → y=10),x 在 136 右侧区域。
    expect(writes.length).toBeGreaterThan(0)
    const minY = Math.min(...writes.map((w) => w.y))
    expect(minY).toBe(10) // clamp(80-115, 10) = 10,age=0 时 y 起点 = 10
    const minX = Math.min(...writes.map((w) => w.x))
    // 5 位右对齐起点 = (anchor.x-24) - 6 + 6*5 = 136-6+30 = 160;两位数 "25" blit 在 [148..159]
    expect(minX).toBeGreaterThanOrEqual(136)
  })

  it('多 showDamageNum + 跨帧 —— 数字飘上去,旧数字过期', () => {
    const fb1 = createFramebuffer()
    const fb2 = createFramebuffer()
    const present = new BattlePresent()
    // uiState=hidden + 空 players → 唯一写入来源 = floating nums(隔离测过期)
    const state = mkState([], [mkBattleEnemy(minimalEnemy(50)), mkBattleEnemy(minimalEnemy(51))], {
      uiState: 'hidden',
      selectingPlayerIdx: undefined,
    })
    const assets = mkAssets()
    const commands: BusEntry[] = [
      {
        cmdId: 1,
        cmd: { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 25, color: 'blue' },
      },
      {
        cmdId: 2,
        cmd: { op: 'showDamageNum', target: { kind: 'enemy', idx: 1 }, value: 50, color: 'yellow' },
      },
    ]
    present.draw(fb1, mkGs(), state, commands, assets, 0)
    // 11+ 帧后(超 LIFETIME_FRAMES=11)同 layer 再 draw,数字应过期(画面只剩 0)
    present.draw(fb2, mkGs(), state, [], assets, 100)
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
    expect(() => present.draw(fb, mkGs(), state, commands, mkAssets(), 0)).not.toThrow()
  })

  it('clearFloatingNums —— 清空残留数字', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [mkBattleEnemy(minimalEnemy(50))])
    const cmds: BusEntry[] = [
      {
        cmdId: 1,
        cmd: { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 25, color: 'blue' },
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
    const state = mkState([], [], {
      field: {
        id: 99,
        screenWave: 0,
        magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    })
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
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50)), mkBattleEnemy(minimalEnemy(51))],
    )
    const assets = mkAssets({ playerRoles: { roles: [minimalRole(0)] } })
    // 帧 0:emit 2 个(2 敌)
    present.draw(
      fb,
      mkGs(),
      state,
      [
        {
          cmdId: 1,
          cmd: { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 1, color: 'blue' },
        },
        {
          cmdId: 2,
          cmd: { op: 'showDamageNum', target: { kind: 'enemy', idx: 1 }, value: 2, color: 'blue' },
        },
      ],
      assets,
      0,
    )
    // 帧 5:emit 1 个(player 回血)—— 总共 3 个数字飘(都还没过期,< 11 帧)
    const fb2 = createFramebuffer()
    present.draw(
      fb2,
      mkGs(),
      state,
      [
        {
          cmdId: 3,
          cmd: {
            op: 'showDamageNum',
            target: { kind: 'player', idx: 0 },
            value: 3,
            color: 'yellow',
          },
        },
      ],
      assets,
      5,
    )
    expect(fbHasWrites(fb2)).toBe(true)
  })
})

describe('BattlePresent —— D17a 动画 overlay', () => {
  it('state.battleAnim.overlay 存在 + effectSprite 注入 → 画 effect 帧到落点', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [], {
      battleAnim: {
        frames: [],
        idx: 0,
        frameElapsedMs: 0,
        overlay: { kind: 'effect', spriteChunk: 10, frameIdx: 1, x: 160, y: 90 },
      },
    })
    // effectSprite:frame1 值 22(2×2);落点 (160,90) → baseX=159,baseY=88
    const effectSprite: SpriteAsset = {
      frames: [mkSpriteAsset(2, 2, 11).frames[0]!, mkSpriteAsset(2, 2, 22).frames[0]!],
    }
    const assets = mkAssets({ effectSprite })
    present.draw(fb, mkGs(), state, [], assets, 0)
    expect(fb.indices[88 * 320 + 159]).toBe(22)
  })

  it('无 battleAnim → 不画 overlay(不抛)', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [])
    const assets = mkAssets({ effectSprite: { frames: [mkSpriteAsset(2, 2, 22).frames[0]!] } })
    expect(() => present.draw(fb, mkGs(), state, [], assets, 0)).not.toThrow()
  })

  it('battleAnim 有 overlay 但 effectSprite 缺 → no-op(loader 未注入,overlay 不画)', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [], {
      battleAnim: {
        frames: [],
        idx: 0,
        frameElapsedMs: 0,
        overlay: { kind: 'effect', spriteChunk: 10, frameIdx: 0, x: 160, y: 90 },
      },
    })
    const assets = mkAssets() // 无 effectSprite
    expect(() => present.draw(fb, mkGs(), state, [], assets, 0)).not.toThrow()
  })
})

describe('BattlePresent —— D17 法术 magic overlays', () => {
  it('state.battleAnim.overlays(kind=magic)+ magicSprites 注入 → 逐个 blit', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [], {
      battleAnim: {
        frames: [],
        idx: 0,
        frameElapsedMs: 0,
        overlays: [
          { kind: 'magic', spriteChunk: 12, frameIdx: 1, x: 160, y: 90 },
          { kind: 'magic', spriteChunk: 12, frameIdx: 1, x: 100, y: 60 },
        ],
      },
    })
    // chunk 12 → 2 帧;frameIdx=1 值 44(2×2)。
    const magicSprites = new Map<number, SpriteAsset>([
      [12, { frames: [mkSpriteAsset(2, 2, 33).frames[0]!, mkSpriteAsset(2, 2, 44).frames[0]!] }],
    ])
    const assets = mkAssets({ magicSprites })
    present.draw(fb, mkGs(), state, [], assets, 0)
    // 落点1 (160,90) → baseX=159,baseY=88
    expect(fb.indices[88 * 320 + 159]).toBe(44)
    // 落点2 (100,60) → baseX=99,baseY=58
    expect(fb.indices[58 * 320 + 99]).toBe(44)
  })

  it('magicSprites 缺 → magic overlays no-op,不抛', () => {
    const fb = createFramebuffer()
    const present = new BattlePresent()
    const state = mkState([], [], {
      battleAnim: {
        frames: [],
        idx: 0,
        frameElapsedMs: 0,
        overlays: [{ kind: 'magic', spriteChunk: 12, frameIdx: 0, x: 160, y: 90 }],
      },
    })
    const assets = mkAssets() // 无 magicSprites
    expect(() => present.draw(fb, mkGs(), state, [], assets, 0)).not.toThrow()
  })

  it('战斗内对话:gs.dialogBox 存在 → 对话覆于战斗场景渲染(framebuffer 差异)', () => {
    const present = new BattlePresent()
    const assets = mkAssets({ battleBgs: new Map([[0, mkBgAsset(4)]]) }) // bg 填 4 铺满
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))])

    // (a) 无对话 → 基线 framebuffer(bg + sprite + UI)
    const fbBase = createFramebuffer()
    present.draw(fbBase, mkGs(), state, [], assets, 0)

    // (b) 有对话(bottom 风格 + 已显字)→ 对话覆于战斗场景之上
    const gsDialog = mkGs()
    gsDialog.dialogBox = startDialogLine('哼哼', { style: 'bottom' })
    gsDialog.dialogBox.charsRevealed = gsDialog.dialogBox.currentLineText?.length ?? 0 // 显满(typing 0 字不画)
    const fbDialog = createFramebuffer()
    present.draw(fbDialog, gsDialog, state, [], assets, 0)

    // 两帧应有差异 = 对话渲染了像素(renderText tofu 占位也写像素;证明 present-battle 调了 drawDialogBox)
    let diff = 0
    for (let i = 0; i < fbDialog.indices.length; i++) {
      if (fbDialog.indices[i] !== fbBase.indices[i]) diff++
    }
    expect(diff).toBeGreaterThan(0)
  })
})
