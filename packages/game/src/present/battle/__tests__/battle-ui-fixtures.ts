/** UI render inputs retain selection-started defaults; sprite-only and hydrated menu fixtures have different contracts. */
import type { Item, PlayerRole, PlayerRoles } from '@type-pal/shared'
import type { IndexedImage } from '../../../assets/png.js'
import type { BattleEnemy, BattlePlayer, BattleState } from '../../../core/battle/battle-state.js'
import { createInitialGameState, type GameState } from '../../../core/game-state.js'
import { createSeedableRng } from '../../../core/rng.js'
import { digitFrames } from '../../__tests__/menu-ui-fixtures.js'
import {
  fillSentinel,
  solidIndexedImage as image,
  SENTINEL,
  solidIndexedImage,
} from '../../__tests__/raster-fixtures.js'
import type { GlyphTable } from '../../font.js'
import { createFramebuffer, type Framebuffer } from '../../framebuffer.js'
import { drawBattleUI } from '../draw-battle-ui.js'
import { battleEnemy, battlePlayer, spriteEnemy, spriteRole } from './battle-sprite-state.js'
export function uiBattleState(
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

export function uiGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState({ x: 0, y: 0, facing: 'down' }),
    ...overrides,
  }
}

export function filledUiFrames(): Array<{
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

export function initialUiGameState(): GameState {
  return createInitialGameState({ x: 0, y: 0, facing: 'down' })
}

export function paintUi(opts: {
  state: BattleState
  roles: PlayerRoles
  frames: IndexedImage[]
  glyphs?: GlyphTable
  gs?: GameState
  fill?: number
  items?: Item[]
  poisons?: Map<number, { level: number; color: number }>
  icons?: Map<number, IndexedImage>
}): Framebuffer {
  const fb = createFramebuffer()
  fillSentinel(fb, opts.fill ?? SENTINEL)
  drawBattleUI(
    fb,
    opts.state,
    opts.roles,
    [],
    opts.items ?? [],
    opts.gs ?? initialUiGameState(),
    opts.glyphs,
    opts.frames,
    opts.poisons,
    opts.icons,
  )
  return fb
}

export function pairWithHp(
  hp: number,
  maxHP = 200,
): { players: BattlePlayer[]; roles: PlayerRoles } {
  return {
    players: [battlePlayer(0), battlePlayer(1)],
    roles: {
      roles: [namedRole(0, { hp, maxHP }), namedRole(1, { hp, maxHP })],
    },
  }
}

export function transparentUiFrames(length = 80): IndexedImage[] {
  const frames = Array.from({ length }, () => solidIndexedImage(1, 1, 0, 0))
  if (length > 43) {
    frames[40] = solidIndexedImage(1, 1, 0x06)
    frames[41] = solidIndexedImage(1, 1, 0x06)
    frames[42] = solidIndexedImage(1, 1, 0x06)
    frames[43] = solidIndexedImage(1, 1, 0x06)
  }
  return frames
}

export function namedRole(id: number, opts: Partial<PlayerRole> = {}): PlayerRole {
  return spriteRole(id, { _name: '甲', ...opts })
}

export function singleEnemyUiState(
  players: BattlePlayer[],
  overrides: Partial<BattleState> = {},
): BattleState {
  return uiBattleState(players, [battleEnemy(spriteEnemy(50))], overrides)
}

export function selectionFrames() {
  const frames = digitFrames()
  frames[40] = image(1, 1, 0x06)
  frames[42] = image(1, 1, 0x06)
  frames[68] = image(1, 1, 0x68)
  return frames
}
