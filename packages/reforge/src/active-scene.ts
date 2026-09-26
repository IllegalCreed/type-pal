import type { SceneDef, SpriteActionCue, SpriteDef } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import { EntityActionPlayer } from './entity-action-player.js'
import type { CellRect, TilesetFrameRegistry } from './render.js'
import type { SceneMapAssets } from './scene-map.js'
import type { PreparedScene } from './scene-preparer.js'

export interface SceneViewBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type ActiveScenePlan<R> = Pick<
  PreparedScene<R>,
  'sceneId' | 'def' | 'assets' | 'palette' | 'renderer' | 'entityDefs' | 'pageActions'
>

/** Already-prepared scene state. No IO, world mutation, or asynchronous commit boundary. */
export class ActiveScene<R> {
  private definition: SceneDef
  private currentMap!: SceneMapAssets['map']
  private currentTiles!: TilesetFrameRegistry
  private currentPalette!: Palette
  private currentRenderer!: R
  private wave: R | null = null
  private currentRoom!: CellRect
  private sprites = new Map<string, SpriteDef>()
  readonly bounds: SceneViewBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  /** Never derive pristine flags from the mutable world-projected SceneDef. */
  readonly entityStaticBaseline = new Map<string, { hidden: boolean; collide: boolean }>()
  readonly actions: EntityActionPlayer

  constructor(scene: SceneDef, onCue: (entity: string, cue: SpriteActionCue) => void) {
    this.definition = scene
    this.actions = new EntityActionPlayer(onCue)
  }

  get scene(): SceneDef {
    return this.definition
  }
  get map(): SceneMapAssets['map'] {
    return this.currentMap
  }
  get tiles(): TilesetFrameRegistry {
    return this.currentTiles
  }
  get palette(): Palette {
    return this.currentPalette
  }
  get renderer(): R {
    return this.currentRenderer
  }
  get waveRenderer(): R | null {
    return this.wave
  }
  get room(): CellRect {
    return this.currentRoom
  }
  get entitySpriteDefs(): Map<string, SpriteDef> {
    return this.sprites
  }

  commit(plan: ActiveScenePlan<R>): void {
    this.definition = plan.def
    this.entityStaticBaseline.clear()
    for (const entity of plan.def.entities) {
      this.entityStaticBaseline.set(`${plan.sceneId}/${entity.id}`, {
        hidden: entity.hidden === true,
        collide: entity.collide === true,
      })
    }
    this.currentMap = plan.assets.map
    this.currentTiles = plan.assets.tilesets
    this.currentPalette = plan.palette
    this.currentRenderer = plan.renderer
    this.wave = null
    this.sprites = plan.entityDefs
    // Boundary cues are synchronous: retain their original position before room/bounds update.
    this.actions.replaceScene(plan.pageActions)
    this.currentRoom = { col: 0, row: 0, cols: this.currentMap.width, rows: this.currentMap.height }
    this.bounds.minX = this.currentRoom.col * 32 - 32
    this.bounds.minY = this.currentRoom.row * 16 - 40
    this.bounds.maxX = (this.currentRoom.col + this.currentRoom.cols) * 32 + 32
    this.bounds.maxY = (this.currentRoom.row + this.currentRoom.rows) * 16 + 16
  }

  /** Called only after the host's canonical commit; does not reset scene/camera/action state. */
  replaceMap(assets: SceneMapAssets, renderer: R, room: CellRect): void {
    this.currentMap = assets.map
    this.currentTiles = assets.tilesets
    this.currentRenderer = renderer
    this.wave = null
    this.currentRoom = room
  }

  rendererForWave(create: () => R): R {
    this.wave ??= create()
    return this.wave
  }
}
