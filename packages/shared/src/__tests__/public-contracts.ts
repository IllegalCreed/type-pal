// Compile-time public contracts; do not count object-literal assertions as runtime tests.
import { expectTypeOf } from 'vitest'
import type {
  Command,
  DialogBoxStyle,
  GotoCommand,
  LoadSceneCommand,
  RawCommand,
  SetDialogStyleBottomCommand,
  SetDialogStyleCenterCommand,
  SetDialogStyleNarrationCommand,
  SetDialogStyleTopCommand,
  ShowDialogCommand,
} from '../events.js'
import type { AbstractKey, InputSnapshot, InputSource } from '../input.js'
import type { SceneEventObject, TileCell, Tilemap } from '../resources.js'
import type {
  BattleField,
  EnemyTeam,
  Item,
  ItemFlags,
  PlayerRole,
  PlayerRoles,
  SpellFlags,
} from '../tables.js'

expectTypeOf<Tilemap>().toMatchTypeOf<{
  width: number
  height: number
  cells: TileCell[][]
  tileset: string
}>()
expectTypeOf<SceneEventObject>().toMatchTypeOf<{
  id: number
  x: number
  y: number
  spriteNum: number
  triggerMode: number
  triggerLabel?: string
  autoLabel?: string
}>()
expectTypeOf<ItemFlags>().toMatchTypeOf<{
  usable: boolean
  equipable: boolean
  throwable: boolean
  consuming: boolean
  applyToAll: boolean
  sellable: boolean
  equipableBy: readonly boolean[]
}>()
expectTypeOf<ItemFlags['equipableBy']>().toEqualTypeOf<
  [boolean, boolean, boolean, boolean, boolean, boolean]
>()
expectTypeOf<SpellFlags>().toMatchTypeOf<{
  usableOutsideBattle: boolean
  usableInBattle: boolean
  usableToEnemy: boolean
  applyToAll: boolean
}>()
expectTypeOf<EnemyTeam>().toMatchTypeOf<{
  id: number
  enemies: readonly [number, number, number, number, number]
  enemyObjectIndexes?: readonly [number, number, number, number, number]
  _names?: string[]
}>()
expectTypeOf<BattleField>().toMatchTypeOf<{
  id: number
  screenWave: number
  magicEffect: { wind: number; thunder: number; water: number; fire: number; earth: number }
}>()
expectTypeOf<PlayerRoles>().toMatchTypeOf<{ roles: PlayerRole[] }>()

expectTypeOf<Item>().toMatchTypeOf<{
  id: number
  bitmap: number
  price: number
  scriptOnUse: number
  flags: ItemFlags
}>()

expectTypeOf<AbstractKey>().toEqualTypeOf<
  | 'Up'
  | 'Down'
  | 'Left'
  | 'Right'
  | 'Confirm'
  | 'Cancel'
  | 'Menu'
  | 'PgUp'
  | 'PgDn'
  | 'Home'
  | 'End'
  | 'Repeat'
  | 'Auto'
  | 'Defend'
  | 'UseItem'
  | 'ThrowItem'
  | 'Flee'
  | 'Force'
  | 'Status'
>()
expectTypeOf<InputSnapshot>().toEqualTypeOf<{
  held: ReadonlySet<AbstractKey>
  pressed: ReadonlySet<AbstractKey>
  frameNum: number
}>()
expectTypeOf<InputSource['nextSnapshot']>().toEqualTypeOf<(frameNum: number) => InputSnapshot>()

expectTypeOf<RawCommand>().toMatchTypeOf<{
  op: 'raw'
  opcode: number
  operands: [number, number, number]
}>()
expectTypeOf<GotoCommand>().toMatchTypeOf<{ op: 'goto'; to: string }>()
expectTypeOf<ShowDialogCommand>().toMatchTypeOf<{ op: 'showDialog'; text: string }>()
expectTypeOf<Extract<Command, { op: 'raw' }>>().toEqualTypeOf<RawCommand>()
expectTypeOf<DialogBoxStyle>().toEqualTypeOf<
  'top' | 'center' | 'bottom' | 'narration' | 'item-box'
>()
expectTypeOf<SetDialogStyleTopCommand['op']>().toEqualTypeOf<'setDialogStyleTop'>()
expectTypeOf<
  Extract<
    Command,
    {
      op:
        | 'setDialogStyleTop'
        | 'setDialogStyleCenter'
        | 'setDialogStyleBottom'
        | 'setDialogStyleNarration'
    }
  >
>().toEqualTypeOf<
  | SetDialogStyleTopCommand
  | SetDialogStyleCenterCommand
  | SetDialogStyleBottomCommand
  | SetDialogStyleNarrationCommand
>()
expectTypeOf<LoadSceneCommand>().toMatchTypeOf<{ op: 'loadScene'; sceneId: number }>()
expectTypeOf<Extract<Command, { op: 'loadScene' }>>().toEqualTypeOf<LoadSceneCommand>()
