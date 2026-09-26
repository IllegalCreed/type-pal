import {
  type EntityDef,
  type Facing,
  type GridPos,
  gridToPixel,
  type SpriteDef,
  spriteScreenY,
  type WorldState,
} from '@type-pal/content'
import type { ActiveScene } from './active-scene.js'
import type { LoadedSprite } from './assets.js'
import { expectDefined } from './defined.js'
import type { Camera, Renderer, SpriteDraw } from './render.js'
import { renderSceneFrame } from './render-scene.js'
import { advanceWave, WorldWaveRenderer } from './screen-wave.js'
import {
  actualFrameIndex,
  animFrameIndex,
  idleFrameIndex,
  loopFrameIndex,
  walkFrameIndex,
} from './sprite-anim.js'

type PartyMember = WorldState['party'][number]

export interface DerivedFollower {
  pos: GridPos
  facing: Facing
}

export interface WorldSpriteInput {
  entities: readonly EntityDef[]
  visible(entity: EntityDef): boolean
  entitySprite(id: string): SpriteDef | undefined
  loadedSprite(definition: SpriteDef): LoadedSprite | undefined
  entityGait(id: string): number | undefined
  entityExplicitAnimation(id: string): number | undefined
  entityActionFrame(id: string): number | undefined
  entityLayer(id: string): number | undefined
  party: readonly PartyMember[]
  partyVisual(member: PartyMember): { def: SpriteDef; frames: LoadedSprite } | undefined
  player: Readonly<{
    pos: GridPos
    facing: Facing
    walking: boolean
    stepFrame: number
    layer: number
  }>
  followers: readonly (DerivedFollower | undefined)[]
  extraFollowerSpriteIds: readonly string[]
  extraFollowerPosition(partyIndex: number): DerivedFollower
  spriteById(id: string): SpriteDef | undefined
  now(): number
}

interface WorldPainterHost {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  worldScale: number
  createCanvas(): HTMLCanvasElement
  contextFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D
  createRenderer(context: CanvasRenderingContext2D, scene: WorldPresentationScene): Renderer
}

type WorldPresentationScene = Pick<
  ActiveScene<Renderer>,
  'map' | 'room' | 'palette' | 'tiles' | 'renderer' | 'rendererForWave'
>

/** World-only drawing owner: visual overrides, shake, wave phase/canvas and sprite assembly. */
export class WorldScenePresentation {
  private readonly entityFrames = new Map<string, number>()
  private gesture: number | null = null
  private shakeFx: { untilMs: number; level: number } | null = null
  private readonly wave = new WorldWaveRenderer()
  private waveCanvas: HTMLCanvasElement | null = null

  constructor(private readonly host: WorldPainterHost) {}

  get partyGesture(): number | null {
    return this.gesture
  }

  setPartyGesture(gesture: number | null): void {
    this.gesture = gesture
  }

  setEntityFrame(id: string, frame: number): void {
    this.entityFrames.set(id, frame)
  }

  entityFrame(id: string): number | undefined {
    return this.entityFrames.get(id)
  }

  hasEntityFrame(id: string): boolean {
    return this.entityFrames.has(id)
  }

  clearEntityFrame(id: string): void {
    this.entityFrames.delete(id)
  }

  clearEntityFrames(): void {
    this.entityFrames.clear()
  }

  shake(now: number, timeFrames: number, level: number): void {
    this.shakeFx = timeFrames > 0 ? { untilMs: now + timeFrames * 40, level } : null
  }

  sprites(input: WorldSpriteInput): SpriteDraw[] {
    const sprites: SpriteDraw[] = []
    for (const entity of input.entities) {
      if (!input.visible(entity)) continue
      const definition = input.entitySprite(entity.id)
      const loaded = definition ? input.loadedSprite(definition) : undefined
      const gait = input.entityGait(entity.id)
      const explicitAnimation = input.entityExplicitAnimation(entity.id)
      const hasOverride = this.entityFrames.has(entity.id)
      const actionFrame = input.entityActionFrame(entity.id)
      const frameIndex = definition
        ? hasOverride
          ? actualFrameIndex(
              idleFrameIndex(definition.layout, entity.facing ?? 'down', loaded?.frames.length) +
                (this.entityFrames.get(entity.id) ?? 0),
              loaded?.frames.length ?? 0,
            )
          : gait !== undefined
            ? walkFrameIndex(
                definition.layout,
                entity.facing ?? 'down',
                gait,
                loaded?.frames.length,
              )
            : explicitAnimation !== undefined
              ? animFrameIndex(
                  definition.layout,
                  entity.facing ?? 'down',
                  explicitAnimation,
                  loaded?.frames.length ?? 1,
                )
              : actionFrame !== undefined
                ? actualFrameIndex(actionFrame, loaded?.frames.length ?? 0)
                : definition.layout.kind === 'loop'
                  ? loopFrameIndex(definition.layout, input.now(), loaded?.frames.length ?? 0)
                  : idleFrameIndex(
                      definition.layout,
                      entity.facing ?? 'down',
                      loaded?.frames.length,
                    )
        : 0
      const frame = definition ? loaded?.frames[frameIndex] : undefined
      if (!loaded || !frame) continue
      const pixel = gridToPixel(entity.pos)
      // Asset contract: anchor the current frame at its foot centre. Layer affects sort/cover only;
      // renderScene owns the shared +7 landing offset and must not receive it twice.
      const effectiveLayer = input.entityLayer(entity.id) ?? entity.zBias ?? 0
      sprites.push({
        frame,
        worldX: pixel.x,
        worldY: spriteScreenY(entity.pos),
        anchorX: Math.floor(frame.width / 2),
        anchorY: frame.height,
        coverILayer: effectiveLayer * 8 + 2,
        coverSortOffset: effectiveLayer * 8 + 9,
        baseYBias: effectiveLayer,
        occlusionTrigger: 'actor' in entity,
      })
    }

    const leader = input.party[0]
    const leaderVisual = leader ? input.partyVisual(leader) : undefined
    const leaderDefinition = leaderVisual?.def
    const leaderFrames = leaderVisual?.frames
    const leaderFrameIndex = leaderDefinition
      ? this.gesture != null
        ? actualFrameIndex(
            idleFrameIndex(
              leaderDefinition.layout,
              input.player.facing,
              leaderFrames?.frames.length,
            ) + this.gesture,
            leaderFrames?.frames.length ?? 0,
          )
        : input.player.walking
          ? walkFrameIndex(
              leaderDefinition.layout,
              input.player.facing,
              input.player.stepFrame,
              leaderFrames?.frames.length,
            )
          : idleFrameIndex(
              leaderDefinition.layout,
              input.player.facing,
              leaderFrames?.frames.length,
            )
      : 0
    const leaderFrame = leaderFrames?.frames[leaderFrameIndex]
    if (leaderDefinition && leaderFrame) {
      const pixel = gridToPixel(input.player.pos)
      sprites.push(partySprite(leaderFrame, input.player.pos, pixel, input.player.layer, 0))
    }

    for (let partyIndex = 1; partyIndex < input.party.length; partyIndex++) {
      const follower = input.followers[partyIndex]
      const member = input.party[partyIndex]
      const visual = member ? input.partyVisual(member) : undefined
      if (!follower || !visual) continue
      const frameIndex = input.player.walking
        ? walkFrameIndex(
            visual.def.layout,
            follower.facing,
            input.player.stepFrame,
            visual.frames.frames.length,
          )
        : idleFrameIndex(visual.def.layout, follower.facing, visual.frames.frames.length)
      const frame = visual.frames.frames[frameIndex]
      if (!frame) continue
      sprites.push(
        partySprite(frame, follower.pos, gridToPixel(follower.pos), input.player.layer, partyIndex),
      )
    }

    for (let runtimeSlot = 0; runtimeSlot < input.extraFollowerSpriteIds.length; runtimeSlot++) {
      const spriteId = expectDefined(input.extraFollowerSpriteIds[runtimeSlot])
      const definition = input.spriteById(spriteId)
      const loaded = definition ? input.loadedSprite(definition) : undefined
      const partyIndex = input.party.length + runtimeSlot
      const follower = input.extraFollowerPosition(partyIndex)
      if (!definition || !loaded) continue
      const frameIndex = input.player.walking
        ? walkFrameIndex(
            definition.layout,
            follower.facing,
            input.player.stepFrame,
            loaded.frames.length,
          )
        : idleFrameIndex(definition.layout, follower.facing, loaded.frames.length)
      const frame = loaded.frames[frameIndex]
      if (!frame) continue
      sprites.push(
        partySprite(frame, follower.pos, gridToPixel(follower.pos), input.player.layer, partyIndex),
      )
    }
    return sprites
  }

  renderWorld(input: {
    scene: WorldPresentationScene
    camera: Camera
    sprites: readonly SpriteDraw[]
    vars: Record<string, number>
    now: number
    advanceWaveFrame: boolean
  }): Camera {
    if (this.shakeFx && input.now >= this.shakeFx.untilMs) this.shakeFx = null
    const camera = this.shakeFx
      ? {
          x: input.camera.x,
          y:
            input.camera.y +
            (Math.floor(input.now / 40) % 2 === 0 ? this.shakeFx.level : -this.shakeFx.level),
        }
      : input.camera
    const waveAmplitude = advanceWave(input.vars, input.advanceWaveFrame)
    if (waveAmplitude > 0) {
      const waveCanvas = this.ensureWaveCanvas()
      const waveContext = this.host.contextFor(waveCanvas)
      const waveRenderer = input.scene.rendererForWave(() =>
        this.host.createRenderer(waveContext, input.scene),
      )
      renderSceneFrame(waveContext, waveRenderer, {
        map: input.scene.map,
        room: input.scene.room,
        camera,
        sprites: [],
        worldScale: this.host.worldScale,
        layers: { skipCover: true },
      })
      this.wave.apply(
        this.host.context,
        waveCanvas,
        waveAmplitude,
        this.host.worldScale,
        input.advanceWaveFrame,
      )
      this.host.context.save()
      this.host.context.scale(this.host.worldScale, this.host.worldScale)
      this.host.context.imageSmoothingEnabled = false
      input.scene.renderer.renderScene(input.scene.map, input.scene.room, camera, input.sprites, {
        skipBase: true,
      })
      this.host.context.restore()
    } else {
      renderSceneFrame(this.host.context, input.scene.renderer, {
        map: input.scene.map,
        room: input.scene.room,
        camera,
        sprites: input.sprites,
        worldScale: this.host.worldScale,
      })
    }
    return camera
  }

  private ensureWaveCanvas(): HTMLCanvasElement {
    this.waveCanvas ??= this.host.createCanvas()
    if (
      this.waveCanvas.width !== this.host.canvas.width ||
      this.waveCanvas.height !== this.host.canvas.height
    ) {
      this.waveCanvas.width = this.host.canvas.width
      this.waveCanvas.height = this.host.canvas.height
    }
    return this.waveCanvas
  }
}

function partySprite(
  frame: LoadedSprite['frames'][number],
  position: GridPos,
  pixel: Readonly<{ x: number; y: number }>,
  layer: number,
  partyIndex: number,
): SpriteDraw {
  return {
    frame,
    worldX: pixel.x,
    worldY: spriteScreenY(position),
    anchorX: Math.floor(frame.width / 2),
    anchorY: frame.height,
    sortOffset: 10,
    coverILayer: layer * 8 + 6,
    coverSortOffset: layer * 8 + 10,
    // Leader wins equal-Y ties over every follower; this tiny bias never changes ordinary depth.
    baseYBias: layer - 0.01 * partyIndex,
    occlusionTrigger: true,
  }
}
