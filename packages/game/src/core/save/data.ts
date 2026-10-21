import type { BattleState, BattleStatus } from '../battle/battle-state.js'
import type {
  DialogBoxState,
  EquipmentEffectRoles,
  GameState,
  PlayerRolesRuntime,
} from '../game-state.js'

/** V1 uses native JSON.stringify: methods disappear, Maps become objects and byte arrays
 * become numeric-keyed objects. This describes stored data, not hydrated engine state.
 */
type JsonData<T> = T extends (...args: never[]) => unknown
  ? never
  : T extends Map<number, infer V>
    ? Record<string, JsonData<V>>
    : T extends Uint8Array
      ? Record<string, number>
      : T extends readonly unknown[]
        ? { [K in keyof T]: JsonData<T[K]> }
        : T extends object
          ? {
              [K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: JsonData<
                T[K]
              >
            }
          : T

type HistoricalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** V1 exports existing slots, including store-v2 snapshots from 6b58f9e84. These
 * fields/rows were added later. Preserve absence; existing loader restoration owns it.
 * This is a data declaration, not a validator or a new compatibility/default path.
 */
type HistoricalRoot = HistoricalFields<
  JsonData<GameState>,
  | 'nowMs'
  | 'followerFrozenOffset'
  | 'numPalette'
  | 'nightPalette'
  | 'iCurPlayingRNG'
  | 'sWaveProgression'
  | 'shakeTime'
  | 'shakeLevel'
  | 'blackScreenHold'
  | 'currentSaveSlot'
  | 'fAutoBattle'
  | 'rgPlayerStatus'
>

type SavedDialog = HistoricalFields<JsonData<DialogBoxState>, 'dialogLineCount'>

// Early store-v2 battle snapshots used booleans for these counters. They remain
// data values here; this neither converts them nor restores an old battle engine.
type SavedStatus = Omit<BattleStatus, 'haste' | 'slow' | 'bravery' | 'protect' | 'dualAttack'> & {
  haste: number | boolean
  slow: number | boolean
  bravery?: number | boolean
  protect?: number | boolean
  dualAttack?: number | boolean
}
type SavedFighter<T extends { status: BattleStatus }> = Omit<JsonData<T>, 'status'> & {
  status: SavedStatus
}
type SavedBattle = Omit<
  HistoricalFields<
    JsonData<BattleState>,
    'menuState' | 'selectedAction' | 'miscMenuCursor' | 'miscSubMenuCursor'
  >,
  'players' | 'enemies'
> & {
  players: SavedFighter<BattleState['players'][number]>[]
  enemies: SavedFighter<BattleState['enemies'][number]>[]
}

export type SaveDataV1 = Omit<
  HistoricalRoot,
  'PlayerRolesRuntime' | 'rgEquipmentEffect' | 'dialogBox' | 'dialogBoxKept' | 'battleState'
> & {
  dialogBox?: SavedDialog
  dialogBoxKept?: SavedDialog
  battleState?: SavedBattle
  PlayerRolesRuntime: HistoricalFields<
    PlayerRolesRuntime,
    'rgwSpriteNum' | 'rgwAvatar' | 'rgwSpriteNumInBattle' | 'rgwAttackAll' | 'rgwWalkFrames'
  >
  rgEquipmentEffect: HistoricalFields<
    EquipmentEffectRoles,
    'rgwSpriteNumInBattle' | 'rgwAttackAll' | 'rgwCooperativeMagic'
  >[]
}

/** Slots receive both live snapshots and imported V1 data. Consumers must not assume
 * a loaded snapshot has runtime methods or a current frame timestamp.
 */
export type SaveSnapshot = GameState | SaveDataV1
