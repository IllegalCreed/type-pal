import type { Enemy } from '@type-pal/shared'
import type { BattleSettlementScreen, BattleSettlementState } from '../battle/battle-settlement.js'
import type { BattleAction } from '../battle/battle-state.js'
import type { SaveDataV1 } from './data.js'
import {
  array,
  boolean,
  type Guard,
  nullable,
  number,
  object,
  oneOf,
  optional,
  record,
  string,
  variant,
} from './v1-shape.js'
import { dialogStyle, playerRoleId, position } from './v1-world.js'

type Data = NonNullable<SaveDataV1['battleState']>
type Anim = NonNullable<Data['battleAnim']>
type Frame = Anim['frames'][number]
const arg = optional(number)
const flag = optional(boolean)
const elements = object({
  wind: number,
  thunder: number,
  water: number,
  fire: number,
  earth: number,
})
// Preserve the two actual encoded counter representations;do not hydrate/coerce either.
const storedCounter: Guard<number | boolean> = (value): value is number | boolean =>
  number(value) || boolean(value)
const status = object<Data['players'][number]['status']>({
  sleep: number,
  paralyzed: number,
  confused: number,
  haste: storedCounter,
  slow: storedCounter,
  silence: arg,
  puppet: arg,
  bravery: optional(storedCounter),
  protect: optional(storedCounter),
  dualAttack: optional(storedCounter),
})
const enemy = object<Enemy>({
  id: number,
  _name: optional(string),
  idleFrames: number,
  magicFrames: number,
  attackFrames: number,
  idleAnimSpeed: number,
  actWaitFrames: number,
  yPosOffset: number,
  attackSound: number,
  actionSound: number,
  magicSound: number,
  deathSound: number,
  callSound: number,
  health: number,
  exp: number,
  cash: number,
  level: number,
  magic: number,
  magicRate: number,
  attackEquivItem: number,
  attackEquivItemRate: number,
  stealItem: number,
  stealItemCount: number,
  attackStrength: number,
  magicStrength: number,
  defense: number,
  dexterity: number,
  fleeRate: number,
  poisonResistance: number,
  elemResistance: elements,
  physicalResistance: number,
  dualMove: number,
  collectValue: number,
})
export const actionType = oneOf(
  'attack',
  'defend',
  'magic',
  'item',
  'flee',
  'pass',
  'attack-mate',
  'throw-item',
  'coop-magic',
)
export const action = object<BattleAction>({
  type: actionType,
  actionId: arg,
  autoAttack: flag,
  target: number,
  targetSide: optional(oneOf('enemy', 'player')),
})
const selection = object<NonNullable<Data['magicSelect']>>({
  items: array(object({ id: number, label: string, disabled: flag, rightText: optional(string) })),
  cursor: number,
  pageSize: number,
  pageOffset: number,
})
const overlay = object<NonNullable<Frame['overlay']>>({
  kind: oneOf('effect', 'magic'),
  spriteChunk: number,
  frameIdx: number,
  x: number,
  y: number,
  layerOffset: arg,
})
const summon = object<NonNullable<Frame['summon']>>({
  spriteKey: string,
  frame: number,
  pos: position,
  bgColorShift: number,
  fadeStep: arg,
  fadeDir: optional(oneOf('in', 'out')),
  loop: optional(object({ count: number, frameTimeMs: number })),
})
const damage = object<NonNullable<Frame['damageNum']>>({
  target: object({ kind: oneOf('enemy', 'player'), idx: number }),
  value: number,
  color: oneOf('yellow', 'blue', 'cyan'),
})
const frame = object<Frame>({
  durationMs: number,
  fighters: optional(
    array(
      object({
        side: oneOf('player', 'enemy'),
        idx: number,
        pos: optional(position),
        currentFrame: arg,
        iColorShift: arg,
        spriteNumOverride: optional(nullable(number)),
      }),
    ),
  ),
  overlay: optional(overlay),
  overlays: optional(array(overlay)),
  damageNum: optional(damage),
  damageNums: optional(array(damage)),
  sound: arg,
  battleMessage: optional(object({ text: string, durationMs: number, pos: optional(position) })),
  shake: optional(object({ time: number, level: number })),
  screenWave: arg,
  keepEffect: flag,
  summon: optional(summon),
  updateGesture: flag,
})
const animation = object<Anim>({
  updateEnemyGesture: flag,
  frames: array(frame),
  idx: number,
  frameElapsedMs: number,
  renderIdx: arg,
  renderStartMs: arg,
  summon: optional(summon),
  summonLoopStartMs: arg,
  hasSummonFade: flag,
  overlay: optional(overlay),
  overlays: optional(array(overlay)),
  pendingDamageNums: optional(array(damage)),
  afterComplete: optional(
    object({
      kind: oneOf('perform-item'),
      actorIdx: number,
      actionId: number,
      targetIdx: (value): value is number | 'all' => number(value) || value === 'all',
      targetIsEnemy: boolean,
    }),
  ),
})
const pair = object({ old: number, cur: number })
const hpmp = object({ old: number, oldMax: number, cur: number, curMax: number })
const screen: Guard<BattleSettlementScreen> = variant<'kind', BattleSettlementScreen>('kind', {
  'exp-cash': object({
    kind: oneOf('exp-cash'),
    expGained: number,
    cashGained: number,
    isBoss: boolean,
  }),
  'level-up': object({
    kind: oneOf('level-up'),
    data: object({
      roleId: playerRoleId,
      name: string,
      level: pair,
      hp: hpmp,
      mp: hpmp,
      attack: pair,
      magic: pair,
      defense: pair,
      dexterity: pair,
      flee: pair,
    }),
  }),
  'hidden-exp-up': object({
    kind: oneOf('hidden-exp-up'),
    data: object({ roleId: playerRoleId, name: string, statLabelWord: number, delta: number }),
  }),
  'learn-magic': object({
    kind: oneOf('learn-magic'),
    data: object({
      roleId: playerRoleId,
      name: string,
      magicName: string,
      magicId: optional(number),
    }),
  }),
})
const settlement = object<BattleSettlementState>({
  screens: array(screen),
  index: number,
  shownMs: number,
  postBattleScriptsDone: flag,
})

/** JSON data only: the original RNG methods cannot survive native JSON encoding. */
export const battle = object<Data>({
  players: array(
    object({
      roleId: playerRoleId,
      prevHp: number,
      prevMp: number,
      scriptPrevHp: arg,
      defending: boolean,
      pos: optional(position),
      posOriginal: optional(position),
      currentFrame: arg,
      iColorShift: arg,
      spriteNumOverride: arg,
      status,
    }),
  ),
  enemies: array(
    object({
      e: enemy,
      status,
      prevHp: number,
      maxHealth: arg,
      objectId: arg,
      scriptOnTurnStart: number,
      scriptOnBattleEnd: number,
      scriptOnReady: number,
      resistanceToSorcery: arg,
      poisons: optional(array(object({ poisonId: number, scriptEntry: number }))),
      defeated: flag,
      pos: optional(position),
      posOriginal: optional(position),
      currentFrame: arg,
      iColorShift: arg,
      spriteFrameHeight: arg,
      idleFrame: arg,
      idleTick: arg,
      deathFadeStep: arg,
    }),
  ),
  field: object({ id: number, screenWave: number, magicEffect: elements }),
  isBoss: boolean,
  phase: oneOf('preBattle', 'selectAction', 'performAction', 'postAction', 'won', 'lost', 'fleed'),
  turn: number,
  actionQueue: array(
    object({
      isEnemy: boolean,
      idx: number,
      dex: number,
      fIsSecond: boolean,
      scriptReadyRan: flag,
      checkPlayerCasualties: flag,
    }),
  ),
  currentActionIndex: number,
  selectingPlayerIdx: arg,
  pendingActions: record(action),
  pendingActionDraft: optional(
    object({
      type: actionType,
      actionId: arg,
      target: arg,
      targetSide: optional(oneOf('enemy', 'player')),
    }),
  ),
  uiState: oneOf(
    'wait',
    'selectMove',
    'selectTargetEnemy',
    'selectTargetPlayer',
    'selectTargetEnemyAll',
    'selectTargetPlayerAll',
    'hidden',
  ),
  menuState: optional(
    oneOf('main', 'magicSelect', 'useItemSelect', 'throwItemSelect', 'misc', 'miscItemSubMenu'),
  ),
  selectedAction: arg,
  uiCursor: number,
  miscMenuCursor: arg,
  miscSubMenuCursor: arg,
  magicSelect: optional(selection),
  itemSelect: optional(selection),
  fAutoAttack: flag,
  fForce: flag,
  fRepeat: flag,
  fAutoBattle: flag,
  prevActions: optional(record(action)),
  repeatSelectionActive: flag,
  iPrevEnemyTarget: arg,
  expGained: number,
  cashGained: number,
  rng: object<Data['rng']>({}),
  phaseStallTicks: number,
  prevWaveLevel: arg,
  prevWaveProgression: arg,
  roundEndDelayTicks: arg,
  fThisTurnCoop: flag,
  prevPlayerAutoAtk: flag,
  iHidingTime: arg,
  iBlow: arg,
  battleAnim: optional(animation),
  persistentBgBlits: optional(
    array(object({ spriteChunk: number, frameIdx: number, x: number, y: number })),
  ),
  introFade: optional(object({ step: number, total: number })),
  fleeAnim: optional(object({ step: number })),
  enemyEscapeAnim: optional(object({ step: number, holdTicks: arg })),
  terminatedByEnemyEscape: flag,
  battleFade: optional(object({ elapsedMs: number, startMs: arg })),
  battleDialogQueue: optional(
    array(
      object({
        text: optional(string),
        style: optional(dialogStyle),
        portrait: arg,
        fontColor: arg,
        clearBefore: flag,
        clearPage: flag,
        effect: optional(object({ opcode: number, operands: array(number) })),
      }),
    ),
  ),
  battleDialogTypingAccMs: arg,
  battleDialogNarrationFrames: arg,
  battleDialogStyle: optional(object({ style: dialogStyle, portrait: arg, fontColor: arg })),
  battleDialogPendingClear: flag,
  turnStartDoneForTurn: arg,
  selectionStartedForTurn: arg,
  settlement: optional(settlement),
})
