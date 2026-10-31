import type { PlayerRoles } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CURSOR_ID as ARROW_CURSOR_ID,
  SENTINEL as ARROW_SENTINEL,
  newFb as arrowFramebuffer,
  makeUiFrames as arrowFrameInputs,
  pixel as arrowPixel,
  makeRoles as arrowRoles,
  BATTLE_ICON_COLOR,
  freezeNow as freezeArrowClock,
} from '../../../__tests__/glm-phase1-leaves/present-fixtures.js'
import type { BattleState } from '../../../core/battle/battle-state.js'
import type { GameState } from '../../../core/game-state.js'
import { createInitialGameState } from '../../../core/game-state.js'
import { createSeedableRng } from '../../../core/rng.js'
import {
  battleEnemy as arrowBattleEnemy,
  enemy as arrowEnemy,
  battleGs,
  battleState,
  role,
  rolesOf,
  battlePlayer as rosterPlayer,
} from '../../__tests__/battle-render-fixtures.js'
import { yellowDigit } from '../../__tests__/menu-ui-fixtures.js'
import { at, pixel, solidIndexedImage } from '../../__tests__/raster-fixtures.js'
import { battleView, snapshotRaster } from '../../__tests__/render-input-snapshots.js'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleUI } from '../draw-battle-ui.js'
import { battleEnemy, battlePlayer, spriteEnemy, spriteRole } from './battle-sprite-state.js'
import {
  filledUiFrames,
  namedRole,
  paintUi,
  pairWithHp,
  selectionFrames,
  singleEnemyUiState,
  transparentUiFrames,
  uiBattleState,
  uiGameState,
} from './battle-ui-fixtures.js'

const UI = filledUiFrames()

function arrowBattleState(patch: Partial<BattleState>): BattleState {
  return {
    players: [
      {
        roleId: 0,
        prevHp: 41,
        prevMp: 12,
        defending: false,
        status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
      },
    ],
    enemies: [],
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
    uiState: 'selectMove',
    menuState: 'main',
    selectedAction: 0,
    uiCursor: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
    selectionStartedForTurn: 1,
    selectingPlayerIdx: 0,
    ...patch,
  }
}

function arrowGameState(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.PlayerRolesRuntime.rgwHP[0] = 41
  gs.PlayerRolesRuntime.rgwMaxHP[0] = 58
  gs.PlayerRolesRuntime.rgwMP[0] = 12
  gs.PlayerRolesRuntime.rgwMaxMP[0] = 34
  return gs
}

const arrowFrames = arrowFrameInputs()

function drawRoster(count: number, hp: number[], frames: ReturnType<typeof selectionFrames>) {
  const players = hp.map((_, index) => rosterPlayer(index))
  const cast = rolesOf(hp.map((value, index) => role(index, { hp: value, maxHP: 200 })))
  const state = battleState(players, [], {
    uiState: 'selectMove',
    menuState: 'main',
    selectingPlayerIdx: count - 1,
    selectedAction: 0,
  })
  const gs = battleGs()
  const fb = createFramebuffer()
  const before = battleView(state)
  const beforeFrames = frames.map((frame) => snapshotRaster(frame))
  drawBattleUI(fb, state, cast, [], [], gs, undefined, frames)
  expect(battleView(state)).toEqual(before)
  expect(frames.map((frame) => snapshotRaster(frame))).toEqual(beforeFrames)
  return fb
}

describe('battle UI target transitions', () => {
  beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(0))

  afterEach(() => vi.restoreAllMocks())

  it('selectTargetEnemyAll —— CLASSIC过渡态不画主菜单或目标箭头', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState(
      [battlePlayer(0)],
      [battleEnemy(spriteEnemy(50)), battleEnemy(spriteEnemy(51))],
      {
        uiState: 'selectTargetEnemyAll',
        pendingActionDraft: { type: 'magic', actionId: 300, targetSide: 'enemy' },
      },
    )
    drawBattleUI(fb, state, playerRoles, [], [], uiGameState(), undefined, UI)
    for (const [x, y] of [
      [27, 140],
      [0, 155],
      [54, 155],
      [27, 170],
      [152, 13],
    ]) {
      expect(fb.indices[y! * 320 + x!]).toBe(0)
    }
  })

  it('selectTargetPlayerAll —— 即时提交过渡态,不画友方全体箭头(不抛)', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0), spriteRole(1)] }
    const state = uiBattleState(
      [battlePlayer(0), battlePlayer(1)],
      [battleEnemy(spriteEnemy(50))],
      {
        uiState: 'selectTargetPlayerAll',
        pendingActionDraft: { type: 'magic', actionId: 300, targetSide: 'player' },
      },
    )
    drawBattleUI(fb, state, playerRoles, [], [], uiGameState(), undefined, UI)
    // 两名队员锚点(200,176)/(256,152)各减(8,67)，与当前行动箭头位置分开。
    expect(fb.indices[109 * 320 + 192]).toBe(0)
    expect(fb.indices[85 * 320 + 248]).toBe(0)
    expect(fb.indices[140 * 320 + 27]).toBe(11) // 可用图标低位15减4，未选灰色
  })
})

describe('battle action availability and target colours', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('体力正好等于 min(100, maxHP/5) 时合击图标仍是可用灰', () => {
    const { players, roles } = pairWithHp(40, 200)
    const fb = paintUi({ state: singleEnemyUiState(players), roles, frames: transparentUiFrames() })
    expect(pixel(fb, 54, 155)).toBe(0x02)
    expect(pixel(fb, 27, 140)).toBe(0x06)
  })

  it('体力比该门槛少 1 时合击图标更暗', () => {
    const { players, roles } = pairWithHp(39, 200)
    const fb = paintUi({ state: singleEnemyUiState(players), roles, frames: transparentUiFrames() })
    expect(pixel(fb, 54, 155)).toBe(0x12)
  })

  it('maxHP/5 超过 100 时门槛停在 100，体力 150 的合击仍可用', () => {
    const { players, roles } = pairWithHp(150, 1000)
    const fb = paintUi({ state: singleEnemyUiState(players), roles, frames: transparentUiFrames() })
    expect(pixel(fb, 54, 155)).toBe(0x02)
  })

  it('沉默使法术和合击更暗，杂项保持可用灰，选中的攻击仍是原色', () => {
    const { players, roles } = pairWithHp(200, 200)
    const self = players[0]
    if (!self) throw new Error('missing player')
    self.status = { ...self.status, silence: 2 }
    const fb = paintUi({ state: singleEnemyUiState(players), roles, frames: transparentUiFrames() })
    expect(pixel(fb, 0, 155)).toBe(0x12)
    expect(pixel(fb, 54, 155)).toBe(0x12)
    expect(pixel(fb, 27, 170)).toBe(0x02)
    expect(pixel(fb, 27, 140)).toBe(0x06)
  })

  it('傀儡不封锁法术，但合击因不健康而更暗', () => {
    const { players, roles } = pairWithHp(200, 200)
    const self = players[0]
    if (!self) throw new Error('missing player')
    self.status = { ...self.status, puppet: 1 }
    const fb = paintUi({ state: singleEnemyUiState(players), roles, frames: transparentUiFrames() })
    expect(pixel(fb, 0, 155)).toBe(0x02)
    expect(pixel(fb, 54, 155)).toBe(0x12)
  })

  it('同伴睡眠使健康人数不够，合击更暗而法术仍可用', () => {
    const { players, roles } = pairWithHp(200, 200)
    const ally = players[1]
    if (!ally) throw new Error('missing ally')
    ally.status = { ...ally.status, sleep: 3 }
    const fb = paintUi({ state: singleEnemyUiState(players), roles, frames: transparentUiFrames() })
    expect(pixel(fb, 54, 155)).toBe(0x12)
    expect(pixel(fb, 0, 155)).toBe(0x02)
  })

  it('没有行动队员时未选图标更暗，选中的攻击仍保持原色', () => {
    const roles: PlayerRoles = { roles: [namedRole(0)] }
    const fb = paintUi({
      state: singleEnemyUiState([battlePlayer(0)], { selectingPlayerIdx: undefined }),
      roles,
      frames: transparentUiFrames(),
    })
    expect(pixel(fb, 0, 155)).toBe(0x12)
    expect(pixel(fb, 27, 140)).toBe(0x06)
  })

  it('选友方目标时攻击图标改灰，目标箭头在锚点上移 67', () => {
    const frames = transparentUiFrames()
    frames[67] = solidIndexedImage(1, 1, 0x67)
    frames[68] = solidIndexedImage(1, 1, 0x68)
    const fb = paintUi({
      state: singleEnemyUiState([battlePlayer(0)], { uiState: 'selectTargetPlayer', uiCursor: 0 }),
      roles: { roles: [namedRole(0)] },
      frames,
    })
    expect(pixel(fb, 27, 140)).toBe(0x02)
    expect(pixel(fb, 232, 103)).toBe(0x67)
    expect(pixel(fb, 232, 96)).toBe(0x68)
  })
})

describe('current actor arrow and target mode', () => {
  it('selectMove：当前行动队员头顶箭头 frame69 at anchor+(-8,-74)', () => {
    const fb = arrowFramebuffer()
    const restore = freezeArrowClock(40) // floor(40/40)&1=1 → arrowBlinkRed()=true → frame 69
    try {
      drawBattleUI(
        fb,
        arrowBattleState({}),
        arrowRoles(),
        [],
        [],
        arrowGameState(),
        undefined,
        arrowFrames,
      )
    } finally {
      restore()
    }
    expect(arrowPixel(fb, 234, 96)).toBe(ARROW_CURSOR_ID)
    expect(arrowPixel(fb, 232, 96)).toBe(0)
    expect(arrowPixel(fb, 233, 96)).toBe(ARROW_SENTINEL) // 箭头精灵 (0,0)/(2,0) 双点
  })

  it("uiState='wait' 或 selectingPlayerIdx 缺省 → 无当前行动箭头", () => {
    for (const patch of [{ uiState: 'wait' as const }, { selectingPlayerIdx: undefined }]) {
      const fb = arrowFramebuffer()
      const restore = freezeArrowClock(40)
      try {
        drawBattleUI(
          fb,
          arrowBattleState(patch),
          arrowRoles(),
          [],
          [],
          arrowGameState(),
          undefined,
          arrowFrames,
        )
      } finally {
        restore()
      }
      expect(Array.from(fb.indices.slice(96 * 320 + 232, 96 * 320 + 235))).toEqual([
        ARROW_SENTINEL,
        ARROW_SENTINEL,
        ARROW_SENTINEL,
      ])
    }
  })

  it('selectTargetEnemy 不画主菜单图标；selectMove 选中图标全彩', () => {
    const anchor = { x: 27, y: 140 } // MAIN_ICONS[0] 攻击
    const fbTarget = arrowFramebuffer()
    const restore = freezeArrowClock(40)
    try {
      drawBattleUI(
        fbTarget,
        arrowBattleState({
          uiState: 'selectTargetEnemy',
          uiCursor: 0,
          enemies: [arrowBattleEnemy(arrowEnemy(50))],
        }),
        arrowRoles(),
        [],
        [],
        arrowGameState(),
        undefined,
        arrowFrames,
      )
    } finally {
      restore()
    }
    expect(arrowPixel(fbTarget, anchor.x + 3, anchor.y + 3)).toBe(ARROW_SENTINEL)

    const fbMove = arrowFramebuffer()
    const restoreMove = freezeArrowClock(40)
    try {
      drawBattleUI(
        fbMove,
        arrowBattleState({}),
        arrowRoles(),
        [],
        [],
        arrowGameState(),
        undefined,
        arrowFrames,
      )
    } finally {
      restoreMove()
    }
    // selectedAction=0 → 攻击图标全彩 0x33
    expect(arrowPixel(fbMove, anchor.x + 3, anchor.y + 3)).toBe(BATTLE_ICON_COLOR)
  })
})

describe('battle roster selection geometry', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('一人二人三人的当前行动箭头和HP个位落在各自锚点', () => {
    const frames = selectionFrames()
    // HP 个位：框 x=91+77*i，右对齐 4 位，pos.x+26 的个位再 +18，y=170。
    const hpAt = [
      [135, 11],
      [212, 22],
      [289, 33],
    ] as const
    // 箭头 = 锚点 + (-8,-74)。一人 (240,170)、二人第二人 (256,152)、三人第三人 (270,146)。
    const arrows = [
      [232, 96],
      [248, 78],
      [262, 72],
    ] as const

    for (let count = 1; count <= 3; count++) {
      const fb = drawRoster(count, [11, 22, 33].slice(0, count), frames)
      for (let slot = 0; slot < 3; slot++) {
        const [x, hp] = hpAt[slot]!
        const expected = slot < count ? yellowDigit(hp % 10) : 0
        expect(at(fb, x, 170)).toBe(expected)
      }
      const [ax, ay] = arrows[count - 1]!
      expect(at(fb, ax, ay)).toBe(0x68)
      for (const [otherX, otherY] of arrows) {
        if (otherX !== ax || otherY !== ay) expect(at(fb, otherX, otherY)).not.toBe(0x68)
      }
    }
  })

  it('单人合击图标更暗，两人健康时合击图标较亮', () => {
    const frames = selectionFrames()
    const gs = battleGs()
    const one = battleState([rosterPlayer(0)], [], {
      uiState: 'selectMove',
      menuState: 'main',
      selectedAction: 0,
      selectingPlayerIdx: 0,
    })
    const fbOne = createFramebuffer()
    drawBattleUI(fbOne, one, rolesOf([role(0)]), [], [], gs, undefined, frames)
    // 图标低位 6 再减 4。不可用色带 0x10 → 0x12；可用色带 0 → 0x02。攻击选中仍是原色 0x06。
    expect(at(fbOne, 54, 155)).toBe(0x12)
    expect(at(fbOne, 27, 140)).toBe(0x06)

    const two = battleState([rosterPlayer(0), rosterPlayer(1)], [], {
      uiState: 'selectMove',
      menuState: 'main',
      selectedAction: 0,
      selectingPlayerIdx: 0,
    })
    const fbTwo = createFramebuffer()
    const before = battleView(two)
    drawBattleUI(fbTwo, two, rolesOf([role(0), role(1)]), [], [], gs, undefined, frames)
    expect(battleView(two)).toEqual(before)
    expect(at(fbTwo, 54, 155)).toBe(0x02)
    expect(at(fbTwo, 27, 140)).toBe(0x06)
  })
})
