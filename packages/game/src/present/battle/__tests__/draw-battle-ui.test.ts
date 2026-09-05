import type { Command, Enemy, Item, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BattleEnemy, BattlePlayer, BattleState } from '../../../core/battle/battle-state.js'
import { setGlobalEvents } from '../../../core/event-system.js'
import { createInitialGameState, type GameState } from '../../../core/game-state.js'
import { createSeedableRng } from '../../../core/rng.js'
import { createFramebuffer } from '../../framebuffer.js'
import { computePlayerFaceColor, drawBattleUI } from '../draw-battle-ui.js'

describe('computePlayerFaceColor(头像染色 uibattle.c:114-162)', () => {
  const poisons = new Map([
    [551, { level: 0, color: 16 }],
    [552, { level: 1, color: 64 }],
    [555, { level: 3, color: 128 }],
    [561, { level: 4, color: 200 }], // level>3 不影响头像色
  ])
  function gsWith(poisonSlots: Record<string, number>): GameState {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.rgPoisonStatus = {}
    for (const [key, pid] of Object.entries(poisonSlots)) {
      gs.rgPoisonStatus[key] = { wPoisonID: pid, wPoisonScript: 0 }
    }
    return gs
  }

  it('无毒 + 活着 → 0xFF(满色,正常 blit)', () => {
    expect(computePlayerFaceColor(gsWith({}), 0, 100, poisons)).toBe(0xff)
  })

  it('单毒 level1 → 该毒 wColor(64)', () => {
    expect(computePlayerFaceColor(gsWith({ '0_0': 552 }), 0, 100, poisons)).toBe(64)
  })

  it('多毒取最高 level 的色(level1=64 + level3=128 → 128)', () => {
    expect(computePlayerFaceColor(gsWith({ '0_0': 552, '1_0': 555 }), 0, 100, poisons)).toBe(128)
  })

  it('level>3 毒(561 L4)不影响头像色 → 仍 0xFF', () => {
    expect(computePlayerFaceColor(gsWith({ '0_0': 561 }), 0, 100, poisons)).toBe(0xff)
  })

  it('死亡 hp==0 → 0(黑白 mono),覆盖中毒色', () => {
    expect(computePlayerFaceColor(gsWith({ '0_0': 555 }), 0, 0, poisons)).toBe(0)
  })

  it('另一队员(role 1)的毒不影响 role 0', () => {
    expect(computePlayerFaceColor(gsWith({ '0_1': 552 }), 0, 100, poisons)).toBe(0xff)
  })
})

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
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
  }
}

function mkBattleEnemy(e: Enemy): BattleEnemy {
  return {
    e: { ...e },
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
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
    selectionStartedForTurn: 1, // 默认玩家回合已真正开始(uiState=selectMove)→ PlayerInfoBox 应画
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'selectMove',
    menuState: 'main',
    selectedAction: 0,
    uiCursor: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    selectingPlayerIdx: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
    ...overrides,
  }
}

function mkSpell(id: number, name?: string): Spell {
  return {
    id,
    _name: name,
    magicNumber: 0,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
  }
}

function mkItem(id: number, name?: string): Item {
  return {
    id,
    _name: name,
    bitmap: 0,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: true,
      equipable: false,
      throwable: false,
      consuming: true,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  }
}

function mkGs(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState({ x: 0, y: 0, facing: 'down' }),
    ...overrides,
  }
}

function fbHasWrites(fb: ReturnType<typeof createFramebuffer>): boolean {
  for (let i = 0; i < fb.indices.length; i++) {
    if (fb.indices[i] !== 0) return true
  }
  return false
}

/** 假 SPRITEUI 帧集(80 帧,每帧 4×4 全不透明)—— 让 drawBox / 图标 / cursor / 箭头 sprite 路径可跑。 */
function fakeUiFrames(): Array<{
  width: number
  height: number
  indices: Uint8Array
  opaque: Uint8Array
}> {
  return Array.from({ length: 80 }, () => ({
    width: 4,
    height: 4,
    indices: new Uint8Array(16).fill(15),
    opaque: new Uint8Array(16).fill(1),
  }))
}

/** 顶部菜单区(y<50)是否有写入 —— 判断动作菜单是否被画。 */
function topRegionWrites(fb: ReturnType<typeof createFramebuffer>): number {
  let n = 0
  for (let y = 0; y < 50; y++) {
    for (let x = 0; x < 320; x++) {
      if (fb.indices[y * 320 + x] !== 0) n++
    }
  }
  return n
}

const UI = fakeUiFrames() as unknown as Parameters<typeof drawBattleUI>[7]

describe('drawBattleUI(新模型 1:1)', () => {
  let now = 0
  beforeEach(() => {
    now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => {
      const current = now
      now += 40
      return current
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('selectMove + main —— 画状态栏 + 4 图标(framebuffer 有写入,不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
      selectedAction: 0,
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('无 uiSpriteFrames —— 优雅跳过 sprite(只画底部状态栏,不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs())).not.toThrow()
    // 4 图标在底部(y 140-180),顶部 y<50 无写入
    expect(topRegionWrites(fb)).toBe(0)
    expect(fbHasWrites(fb)).toBe(true) // 底部状态栏
  })

  // 回归(user 2026-06-14:赵灵儿在队遇草妖,底部我方血量/头像/状态面板仍画着)。
  //   sdlpal(battle.c:736-797):草妖类敌的 pre-battle/turnStart 脚本逃跑 → 主循环从不启动 →
  //   PAL_BattleUIUpdate 从不调用 → PlayerInfoBox 全程不画。tickPreBattle 一进 selectAction 即置
  //   uiState='wait',但 selectionStartedForTurn=turn 要等 turnStart 脚本跑完(startFirstReadyPlayerSelection)
  //   才置;草妖逃跑永不到那步 → 此过渡帧/逃跑期 selectionStartedForTurn ≠ turn → InfoBox 不画。
  it('玩家回合未真正开始(selectionStartedForTurn≠turn)不画底部 InfoBox(草妖回归)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'wait',
      turn: 1,
      selectionStartedForTurn: undefined,
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false)
  })

  it('敌人逃跑动画期(enemyEscapeAnim)整个战斗 UI 不画', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    // selectionStartedForTurn===turn(默认),但 enemyEscapeAnim 早退在前 → 仍整体不画
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'wait',
      enemyEscapeAnim: { step: 0 },
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false)
  })

  // 回归(user 2026-06-14:石长老vs盖罗娇剧情自动战开场闪战斗 UI)。
  //   sdlpal uibattle.c:839 PAL_BattleUIUpdate 的 fAutoBattle 分支处理完自动 commit 后 `goto end`,
  //   跳过 PlayerInfoBox(888) + 行动菜单 + 箭头 —— fAutoBattle(0x8A 整场自动)玩家全程不交互、无任何 UI。
  it('fAutoBattle(整场自动)期间整个战斗 UI 不画(对齐 sdlpal goto end)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      fAutoBattle: true, // 即便 selectMove(默认 selectionStartedForTurn===turn)也不画
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false)
  })

  it('selectMove + magicSelect —— 画法术网格(不抛,顶部有写入)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'magicSelect',
      magicSelect: {
        items: [
          { id: 296, label: '雷震子', rightText: 'MP 5', disabled: false },
          { id: 297, label: '玄冰指', rightText: 'MP 8', disabled: true },
        ],
        cursor: 0,
        pageSize: 15,
        pageOffset: 0,
      },
    })
    expect(() =>
      drawBattleUI(fb, state, playerRoles, [mkSpell(296), mkSpell(297)], [], mkGs(), undefined, UI),
    ).not.toThrow()
    expect(topRegionWrites(fb)).toBeGreaterThan(0)
  })

  it('selectMove + magicSelect —— 画选中仙术 scriptDesc 说明', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'magicSelect',
      magicSelect: {
        items: [{ id: 296, label: '气疗术', rightText: 'MP 6', disabled: false }],
        cursor: 0,
        pageSize: 15,
        pageOffset: 0,
      },
    })
    const spell = { ...mkSpell(296), scriptDesc: 43016 }
    const commands: Command[] = [
      { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_43016' },
      { op: 'showDialog', messageIndex: 1, text: '回复少量体力。' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    try {
      drawBattleUI(fb, state, playerRoles, [spell], [], mkGs(), undefined, UI)
    } finally {
      setGlobalEvents([])
    }

    let descriptionPixels = 0
    for (let y = 3; y < 19; y++) {
      for (let x = 102; x < 260; x++) {
        if (fb.indices[y * 320 + x] === 0x3c) descriptionPixels++
      }
    }
    expect(descriptionPixels).toBeGreaterThan(0)
  })

  // L8(magicmenu.c:189-216 WIN95 path):法术菜单显示 scriptDesc 说明时,MP 框/数字应在左侧
  //   (slash 45,14 / needed 15,14 / current 50,14),且无金钱框、无右侧 MP(215~265)。
  //   修前 TS 叠了 DOS-noDesc 的金钱框+右侧 MP(magicmenu.c:128-142),是任何单一 sdlpal 路径都没有的组合。
  it('L8:法术菜单用 WIN95 布局 —— MP 在左侧,右侧 MP 区(215~265)无 slash/MP sprite', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'magicSelect',
      magicSelect: {
        items: [{ id: 296, label: '雷震子', rightText: 'MP 5', disabled: false }],
        cursor: 0,
        pageSize: 15,
        pageOffset: 0,
      },
    })
    drawBattleUI(fb, state, playerRoles, [mkSpell(296)], [], mkGs(), undefined, UI)
    // SPRITENUM_SLASH(39)=4×4 index-15 块;UI 数字 sprite 同为 index-15。
    const count15 = (x0: number, x1: number, y0: number, y1: number): number => {
      let n = 0
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) if (fb.indices[y * 320 + x] === 15) n++
      return n
    }
    // 右侧 MP 区(buggy DOS-noDesc:slash@260 + 当前MP@265 + 需求MP@230)WIN95 下应清空
    expect(count15(216, 272, 12, 19)).toBe(0)
    // 左侧 MP 区(WIN95:needed@15 + slash@45 + current@50)应有写入
    expect(count15(14, 55, 12, 19)).toBeGreaterThan(0)
  })

  it('selectMove + magicSelect(长列表 cursor=50)—— 分页不越界不抛', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: 296 + i,
      label: `法术${i}`,
      rightText: 'MP 5',
      disabled: false,
    }))
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'magicSelect',
      magicSelect: { items, cursor: 50, pageSize: 15, pageOffset: 0 },
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })

  it('selectMove + useItemSelect —— 画物品网格(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'useItemSelect',
      itemSelect: {
        items: [{ id: 1, label: '金创药', rightText: '×3', disabled: false }],
        cursor: 0,
        pageSize: 21,
        pageOffset: 0,
      },
    })
    expect(() =>
      drawBattleUI(fb, state, playerRoles, [], [mkItem(1)], mkGs(), undefined, UI),
    ).not.toThrow()
    expect(topRegionWrites(fb)).toBeGreaterThan(0)
  })

  it('selectMove + useItemSelect —— 画 ITEMBOX、BALL 图标和 scriptDesc 说明', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'useItemSelect',
      itemSelect: {
        items: [{ id: 1, label: '金创药', rightText: '×3', disabled: false }],
        cursor: 0,
        pageSize: 21,
        pageOffset: 0,
      },
    })
    const item = { ...mkItem(1), bitmap: 7, scriptDesc: 40133 }
    const icon = {
      width: 2,
      height: 2,
      indices: new Uint8Array(4).fill(123),
      opaque: new Uint8Array(4).fill(1),
    }
    const commands: Command[] = [
      { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_40133' },
      { op: 'showDialog', messageIndex: 1, text: '恢复体力。' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    try {
      drawBattleUI(
        fb,
        state,
        playerRoles,
        [],
        [item],
        mkGs(),
        undefined,
        UI,
        undefined,
        undefined,
        new Map([[7, icon]]),
      )
    } finally {
      setGlobalEvents([])
    }

    expect(fb.indices[147 * 320 + 8]).toBe(123) // BALL 图标:itemmenu.c (xBase+8,yBase+7)
    let descriptionPixels = 0
    for (let y = 151; y < 167; y++) {
      for (let x = 71; x < 220; x++) {
        if (fb.indices[y * 320 + x] === 0x3c) descriptionPixels++
      }
    }
    expect(descriptionPixels).toBeGreaterThan(0)
  })

  it('selectMove + misc —— 画杂项盒(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'misc',
      miscMenuCursor: 2,
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
    expect(topRegionWrites(fb)).toBeGreaterThan(0)
  })

  it('selectMove + miscItemSubMenu —— 画杂项盒 + 物品二级(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'miscItemSubMenu',
      miscSubMenuCursor: 1,
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })

  it('selectTargetEnemy —— 无箭头(选中敌人由 sprite 层 ColorShift 高亮),只画主菜单图标(不抛,有写入)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50)), mkBattleEnemy(minimalEnemy(51))],
      {
        uiState: 'selectTargetEnemy',
        uiCursor: 1,
        pendingActionDraft: { type: 'attack', targetSide: 'enemy' },
      },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('selectTargetPlayer —— 队员上方画箭头(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0), minimalRole(1)] }
    const state = mkState(
      [mkBattlePlayer(0), mkBattlePlayer(1)],
      [mkBattleEnemy(minimalEnemy(50))],
      {
        uiState: 'selectTargetPlayer',
        uiCursor: 1,
        pendingActionDraft: { type: 'magic', actionId: 300, targetSide: 'player' },
      },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
    expect(fbHasWrites(fb)).toBe(true)
  })

  it('selectTargetEnemyAll —— 无箭头(全体敌人 sprite 层 ColorShift 高亮),只画主菜单图标(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState(
      [mkBattlePlayer(0)],
      [mkBattleEnemy(minimalEnemy(50)), mkBattleEnemy(minimalEnemy(51))],
      {
        uiState: 'selectTargetEnemyAll',
        pendingActionDraft: { type: 'magic', actionId: 300, targetSide: 'enemy' },
      },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })

  it('selectTargetPlayerAll —— 即时提交过渡态,不画友方全体箭头(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0), minimalRole(1)] }
    const state = mkState(
      [mkBattlePlayer(0), mkBattlePlayer(1)],
      [mkBattleEnemy(minimalEnemy(50))],
      {
        uiState: 'selectTargetPlayerAll',
        pendingActionDraft: { type: 'magic', actionId: 300, targetSide: 'player' },
      },
    )
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })

  it('selectTargetEnemy —— 无敌人时 no-op 不抛', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [], {
      uiState: 'selectTargetEnemy',
      uiCursor: 0,
      pendingActionDraft: { type: 'attack', targetSide: 'enemy' },
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })

  // ---------- 对话显示时**整个战斗 UI 都不画**(菜单 + 血量信息框都隐藏,user 2026-05-31)----------

  it('对话队列非空 —— 战斗 UI 全不画(菜单 + 信息框)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
      battleDialogQueue: [{ text: '林月如', style: 'bottom' }],
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false) // 对话期连血量面板都不画
  })

  it('gs.dialogBox 非空 —— 战斗 UI 全不画', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
    })
    const gs = mkGs({ dialogBox: { phase: 'typing' } as unknown as GameState['dialogBox'] })
    drawBattleUI(fb, state, playerRoles, [], [], gs, undefined, UI)
    expect(fbHasWrites(fb)).toBe(false)
  })

  it('hidden(perform 阶段)—— 啥都不画(信息框仅选择阶段;sdlpal Phase!=PerformAction)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'hidden',
      selectingPlayerIdx: undefined,
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    expect(fbHasWrites(fb)).toBe(false) // perform 期信息框隐藏,飘字由其它 draw 层负责
  })

  it('selectMove —— 画底部队员信息框(PAL_PlayerInfoBox:框+头像+HP/MP,y≈165)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = {
      roles: [minimalRole(0, { hp: 123, maxHP: 200, mp: 45, maxMP: 60 })],
    }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    // 信息框在底部(y≈165)有写入
    let bottomWrites = 0
    for (let y = 160; y < 200; y++) {
      for (let x = 80; x < 200; x++) if (fb.indices[y * 320 + x] !== 0) bottomWrites++
    }
    expect(bottomWrites).toBeGreaterThan(0)
  })

  it('PAL_PlayerInfoBox —— 活人画乱/定/眠/封状态字,死亡时不画', () => {
    const aliveFb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0, { hp: 123 })] }
    const player = mkBattlePlayer(0)
    player.status = { ...player.status, confused: 2, paralyzed: 2, sleep: 2, silence: 2 }
    const aliveState = mkState([player], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
    })

    drawBattleUI(aliveFb, aliveState, playerRoles, [], [], mkGs(), undefined, UI)
    for (const color of [0x5f, 0xbf, 0x0e, 0x3c]) {
      let writes = 0
      for (let y = 160; y < 200; y++) {
        for (let x = 80; x < 170; x++) if (aliveFb.indices[y * 320 + x] === color) writes++
      }
      expect(writes).toBeGreaterThan(0)
    }

    const deadFb = createFramebuffer()
    const deadRoles: PlayerRoles = { roles: [minimalRole(0, { hp: 0 })] }
    const deadState = mkState([player], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
    })
    drawBattleUI(deadFb, deadState, deadRoles, [], [], mkGs(), undefined, UI)
    for (const color of [0x5f, 0xbf, 0x0e, 0x3c]) {
      expect(deadFb.indices.includes(color)).toBe(false)
    }
  })

  it('fAutoAttack —— 信息框隐藏(sdlpal !fAutoAttack)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [minimalRole(0)] }
    const state = mkState([mkBattlePlayer(0)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'main',
      fAutoAttack: true,
    })
    drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)
    let bottomWrites = 0
    for (let y = 160; y < 200; y++) {
      for (let x = 80; x < 200; x++) if (fb.indices[y * 320 + x] !== 0) bottomWrites++
    }
    expect(bottomWrites).toBe(0) // auto 模式不画信息框
  })

  it('状态栏 —— role 找不到时跳过该位,不抛', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [] }
    const state = mkState([mkBattlePlayer(99)], [mkBattleEnemy(minimalEnemy(50))], {
      uiState: 'hidden',
    })
    expect(() => drawBattleUI(fb, state, playerRoles, [], [], mkGs(), undefined, UI)).not.toThrow()
  })
})
