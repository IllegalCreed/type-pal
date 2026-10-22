import type { Command, DialogBoxStyle, Palette } from '@type-pal/shared'
import type { EventCursor, NpcState } from '../game-state.js'
import type { PaletteFadeState } from '../palette-fade.js'
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
  tuple,
  variant,
} from './v1-shape.js'

export const facing = oneOf('up', 'down', 'left', 'right')
export const position = object({ x: number, y: number })
/** Role ids index the six slots of each PlayerRolesRuntime row. */
export const playerRoleId: Guard<number> = (value): value is number =>
  number(value) && Number.isInteger(value) && value >= 0 && value < 6
export const dialogStyle: Guard<DialogBoxStyle> = oneOf(
  'top',
  'center',
  'bottom',
  'narration',
  'item-box',
)
const operands = tuple<[number, number, number]>(number, number, number)
const label = optional(string)
const argument = optional(number)
const commands: Guard<Command[]> = (value): value is Command[] => array(command)(value)

/** Typed branches keep the existing command union exhaustive, including structured commands. */
export const command: Guard<Command> = variant<'op', Command>('op', {
  raw: object({ op: oneOf('raw'), opcode: number, operands, label }),
  end: object({
    op: oneOf('end'),
    advance: optional(boolean),
    reset: optional(boolean),
    resetTo: argument,
    idleFrames: argument,
    label,
  }),
  goto: object({ op: oneOf('goto'), to: string, frameDelay: argument, label }),
  showDialog: object({
    op: oneOf('showDialog'),
    box: optional(dialogStyle),
    messageIndex: number,
    text: string,
    label,
  }),
  giveItem: object({
    op: oneOf('giveItem'),
    itemId: number,
    count: number,
    _item: optional(string),
    label,
  }),
  startBattle: object({
    op: oneOf('startBattle'),
    enemyTeamId: number,
    operands: optional(operands),
    _enemyTeam: optional(string),
    label,
  }),
  loadScene: object({ op: oneOf('loadScene'), sceneId: number, _scene: optional(string), label }),
  setPalette: object({ op: oneOf('setPalette'), paletteIndex: number, label }),
  setDialogStyleTop: object({
    op: oneOf('setDialogStyleTop'),
    arg0: argument,
    arg1: argument,
    arg2: argument,
    label,
  }),
  setDialogStyleCenter: object({
    op: oneOf('setDialogStyleCenter'),
    arg0: argument,
    arg1: argument,
    arg2: argument,
    label,
  }),
  setDialogStyleBottom: object({
    op: oneOf('setDialogStyleBottom'),
    arg0: argument,
    arg1: argument,
    arg2: argument,
    label,
  }),
  setDialogStyleNarration: object({
    op: oneOf('setDialogStyleNarration'),
    arg0: argument,
    arg1: argument,
    arg2: argument,
    label,
  }),
  sequence: object({ op: oneOf('sequence'), steps: commands, label }),
  if: object({
    op: oneOf('if'),
    cond: (value): value is Command => command(value),
    then: commands,
    else: optional(commands),
    label,
  }),
  choice: object({
    op: oneOf('choice'),
    prompt: string,
    options: array(object({ text: string, then: commands })),
    label,
  }),
})
export { commands }

const callStack = array(
  object<NonNullable<EventCursor['callStack']>[number]>({
    returnIp: number,
    returnCommands: optional(commands),
    returnLabelMap: optional(record(number)),
    savedEventObjectId: argument,
  }),
)
export const eventCursor = object<EventCursor>({
  commands: optional(commands),
  labelMap: optional(record(number)),
  ip: number,
  waiting: optional(
    oneOf(
      'dialog',
      'frame-wait',
      'fade-screen',
      'scene-load',
      'delay',
      'shop',
      'palette-fade',
      'scene-fade',
      'rng-play',
      'show-fbp',
      'scroll-fbp',
      'ending-anim',
      'wait-key',
      'quit',
      'confirm',
      'camera-pan',
    ),
  ),
  confirmYes: optional(boolean),
  waitFramesRemaining: argument,
  scriptIdleFrame: argument,
  cameraPanFramesRemaining: argument,
  cameraPanDx: argument,
  cameraPanDy: argument,
  delayUntilMs: argument,
  reloadSlotAfterFade: argument,
  currentEventObjectId: argument,
  triggerOwnerId: argument,
  itemScript: optional(object({ objectId: number, entry: number })),
  startedExecution: optional(boolean),
  waitGestureReset: optional(boolean),
  callStack: optional(callStack),
  onEnterSceneId: argument,
  onEnterStartIp: argument,
  onEnterResumeIp: argument,
})
export { callStack }

export const npc = object<NpcState>({
  id: number,
  x: number,
  y: number,
  spriteNum: number,
  triggerLabel: optional(string),
  triggerResume: optional(
    object({ commands: optional(commands), labelMap: optional(record(number)), ip: number }),
  ),
  triggerEndIdleCount: argument,
  triggerMode: argument,
  autoTriggerOnce: optional(boolean),
  autoTriggerAnchorX: argument,
  autoTriggerAnchorY: argument,
  sState: argument,
  sVanishTime: argument,
  sLayer: argument,
  nSpriteFrames: argument,
  nSpriteFramesAuto: argument,
  facing: optional(facing),
  scriptedFrame: argument,
  autoCursor: optional(
    object({
      ip: number,
      idleFrameCount: argument,
      commands: optional(commands),
      labelMap: optional(record(number)),
      callStack: optional(callStack),
      currentEventObjectId: argument,
    }),
  ),
  autoLabel: optional(string),
})

export const dialogBox = object<NonNullable<SaveDataV1['dialogBox']>>({
  titleText: optional(string),
  shownLines: array(string),
  shownLineColors: optional(array(array(number))),
  currentLineText: nullable(string),
  currentLineColors: optional(array(number)),
  currentLineRevealAt: optional(array(number)),
  lineStartMs: argument,
  currentLineDoneAt: argument,
  currentLineEndedWithTilde: optional(boolean),
  lineDoneRenderPending: optional(boolean),
  iDelayState: argument,
  fontColorState: argument,
  iconKind: argument,
  typingFrames: number,
  charsRevealed: number,
  dialogLineCount: argument,
  userSkip: optional(boolean),
  phase: oneOf('typing', 'line-done', 'waiting-page-key', 'waiting-end-key'),
  style: dialogStyle,
  portraitIcon: argument,
  portraitLayout: optional(boolean),
  fontColor: number,
  shadow: boolean,
  keyIconBlink: boolean,
  itemBox: optional(object({ itemId: number, line1: string, line2: string })),
  pendingStyle: optional(
    object({
      style: dialogStyle,
      portraitIcon: argument,
      portraitLayout: optional(boolean),
      fontColor: number,
    }),
  ),
  pendingFullClear: optional(boolean),
  pendingPreOpClear: optional(boolean),
  pendingPartialClear: optional(boolean),
})

const rgb = tuple<[number, number, number]>(number, number, number)
export const palette = object<Palette>({
  colors: array(rgb, 256),
  cycles: array(object({ start: number, length: number, step: number, frameInterval: number })),
  nightColors: optional(array(rgb, 256)),
})
export const paletteFade = object<PaletteFadeState>({
  startColors: array(rgb, 256),
  targetColors: array(rgb, 256),
  startTimeMs: number,
  totalMs: number,
  mode: oneOf('lerp', 'approach'),
  steps: number,
  increment: number,
  skipIndex: argument,
  remap: optional(object({ from: number, to: number })),
  freeze: optional(boolean),
  fade60: optional(oneOf('in', 'out')),
  fade63: optional(oneOf('in', 'out')),
})
