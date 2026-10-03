// Compile-time public contracts; do not count object-literal assertions as runtime tests.
import { expectTypeOf } from 'vitest'
import type { SceneEventObject, TileCell, Tilemap } from '../resources.js'
import type {
  BattleField,
  EnemyTeam,
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
