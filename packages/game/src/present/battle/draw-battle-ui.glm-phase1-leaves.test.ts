/**
 * TEST-GLM-PHASE1-LEAVES-3 L13（draw-battle-ui.ts）— 去重表：
 *  - __tests__/draw-battle-ui.test（门控/dialog/escape/autoBattle/magicSelect/misc/target 各相
 *    + computePlayerFaceColor 毒/死）→ 不重复
 *  - grok-composition P15（行动箭头锚点/禁用着色/MP 数字/合击图标）→ 不重复
 *  - 新差异：当前行动队员头顶箭头 frame69（selectMove 非 wait 且 selectingPlayerIdx 有值）、
 *    uiState='wait' 无箭头、selectingPlayerIdx 缺省无箭头、DL30 selectTargetEnemy 不画主菜单
 *    图标（对照 selectMove 选中图标全彩）。
 * 合法小 battle 输入（完整 BattleState 字面量），不启动 battle-system。
 */
import { describe, expect, it } from 'vitest'
import {
  BATTLE_ICON_COLOR,
  CURSOR_ID,
  freezeNow,
  makeRoles,
  makeUiFrames,
  newFb,
  pixel,
  SENTINEL,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import type { BattleState } from '../../core/battle/battle-state.js'
import type { GameState } from '../../core/game-state.js'
import { createInitialGameState } from '../../core/game-state.js'
import { createSeedableRng } from '../../core/rng.js'
import { battleEnemy, enemy } from '../__tests__/grok-composition/fixtures/battle.js'
import { drawBattleUI } from './draw-battle-ui.js'

function battleState(patch: Partial<BattleState>): BattleState {
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

function gsForUi(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.PlayerRolesRuntime.rgwHP[0] = 41
  gs.PlayerRolesRuntime.rgwMaxHP[0] = 58
  gs.PlayerRolesRuntime.rgwMP[0] = 12
  gs.PlayerRolesRuntime.rgwMaxMP[0] = 34
  return gs
}

const frames = makeUiFrames()

describe('L13 drawBattleUI 剩余分支', () => {
  it('selectMove：当前行动队员头顶箭头 frame69 at anchor+(-8,-74)', () => {
    const fb = newFb()
    const restore = freezeNow(40) // floor(40/40)&1=1 → arrowBlinkRed()=true → frame 69
    try {
      drawBattleUI(fb, battleState({}), makeRoles(), [], [], gsForUi(), undefined, frames)
    } finally {
      restore()
    }
    expect(pixel(fb, 234, 96)).toBe(CURSOR_ID)
    expect(pixel(fb, 232, 96)).toBe(0)
    expect(pixel(fb, 233, 96)).toBe(SENTINEL) // 箭头精灵 (0,0)/(2,0) 双点
  })

  it("uiState='wait' 或 selectingPlayerIdx 缺省 → 无当前行动箭头", () => {
    for (const patch of [{ uiState: 'wait' as const }, { selectingPlayerIdx: undefined }]) {
      const fb = newFb()
      const restore = freezeNow(40)
      try {
        drawBattleUI(fb, battleState(patch), makeRoles(), [], [], gsForUi(), undefined, frames)
      } finally {
        restore()
      }
      expect(Array.from(fb.indices.slice(96 * 320 + 232, 96 * 320 + 235))).toEqual([
        SENTINEL,
        SENTINEL,
        SENTINEL,
      ])
    }
  })

  it('DL30：selectTargetEnemy 不画主菜单图标；selectMove 选中图标全彩', () => {
    const anchor = { x: 27, y: 140 } // MAIN_ICONS[0] 攻击
    const fbTarget = newFb()
    const restore = freezeNow(40)
    try {
      drawBattleUI(
        fbTarget,
        battleState({
          uiState: 'selectTargetEnemy',
          uiCursor: 0,
          enemies: [battleEnemy(enemy(50))],
        }),
        makeRoles(),
        [],
        [],
        gsForUi(),
        undefined,
        frames,
      )
    } finally {
      restore()
    }
    expect(pixel(fbTarget, anchor.x + 3, anchor.y + 3)).toBe(SENTINEL)

    const fbMove = newFb()
    const restoreMove = freezeNow(40)
    try {
      drawBattleUI(fbMove, battleState({}), makeRoles(), [], [], gsForUi(), undefined, frames)
    } finally {
      restoreMove()
    }
    // selectedAction=0 → 攻击图标全彩 0x33
    expect(pixel(fbMove, anchor.x + 3, anchor.y + 3)).toBe(BATTLE_ICON_COLOR)
  })
})
