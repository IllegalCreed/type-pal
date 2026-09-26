import type { EntityDef, SpriteDef, WorldState } from '@type-pal/content'
import type { Palette, RleFrame } from '@type-pal/shared'
import { describe, expect, test, vi } from 'vitest'
import type { LoadedSprite } from './assets.js'
import { buildBlankProjectMap } from './project-map.js'
import type { Renderer } from './render.js'
import { WorldScenePresentation } from './world-scene-presentation.js'

function frame(width: number, height: number): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height).fill(1),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

function loaded(count: number, offset = 0): LoadedSprite {
  const frames = Array.from({ length: count }, (_, index) => frame(offset + index + 1, 10 + index))
  return { frames, anchorX: 0, anchorY: 0 }
}

function member(id: string): WorldState['party'][number] {
  return {
    id,
    template: id,
    level: 1,
    exp: 0,
    hp: 10,
    maxHP: 10,
    mp: 5,
    maxMP: 5,
    attack: 1,
    defense: 1,
    magicAttack: 1,
    speed: 1,
    luck: 1,
    equipment: {},
    tags: [],
  }
}

function context() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D
}

function renderer(ctx: CanvasRenderingContext2D, log: string[], label: string): Renderer {
  return {
    context: ctx,
    clear: () => log.push(`${label}:clear`),
    renderScene: (_map, _room, camera, sprites, layers) =>
      log.push(
        `${label}:render:${camera.x},${camera.y}:${sprites.length}:${layers?.skipBase ? 'skipBase' : layers?.skipCover ? 'skipCover' : 'all'}`,
      ),
    drawSprite: vi.fn(),
  }
}

function presentation() {
  const mainContext = context()
  const mainCanvas = { width: 1280, height: 800 } as HTMLCanvasElement
  const waveContext = context()
  const waveCanvas = { width: 0, height: 0 } as HTMLCanvasElement
  const log: string[] = []
  const instance = new WorldScenePresentation({
    canvas: mainCanvas,
    context: mainContext,
    worldScale: 4,
    createCanvas: () => waveCanvas,
    contextFor: () => waveContext,
    createRenderer: (ctx) => renderer(ctx, log, 'wave'),
  })
  return { instance, mainContext, mainCanvas, waveContext, waveCanvas, log }
}

describe('WorldScenePresentation sprite ownership', () => {
  test('entity frame override keeps the exact priority, per-frame anchor and layer geometry', () => {
    const { instance } = presentation()
    const definition: SpriteDef = {
      id: 'npc-sprite',
      label: 'NPC',
      asset: 'sprite.npc',
      layout: { kind: 'directional', framesPerDir: 3 },
    }
    const frames = loaded(12)
    const entity: EntityDef = {
      id: 'npc',
      actor: 'npc-actor',
      pos: { col: 3, row: 1, height: 2 },
      facing: 'left',
      zBias: 9,
    }
    instance.setEntityFrame('npc', 2)
    const sprites = instance.sprites({
      entities: [entity],
      visible: () => true,
      entitySprite: () => definition,
      loadedSprite: () => frames,
      entityGait: () => 1,
      entityExplicitAnimation: () => 2,
      entityActionFrame: () => 8,
      entityLayer: () => 2,
      party: [],
      partyVisual: () => undefined,
      player: {
        pos: { col: 0, row: 0, height: 0 },
        facing: 'down',
        walking: false,
        stepFrame: 0,
        layer: 0,
      },
      followers: [],
      extraFollowerSpriteIds: [],
      extraFollowerPosition: () => ({
        pos: { col: 0, row: 0, height: 0 },
        facing: 'down',
      }),
      spriteById: () => undefined,
      now: () => 999,
    })
    // left idle base=3, explicit offset=2 -> frame 5 (width=6,height=15).
    expect(sprites).toEqual([
      expect.objectContaining({
        frame: frames.frames[5],
        worldX: 32,
        worldY: 0,
        anchorX: 3,
        anchorY: 15,
        coverILayer: 18,
        coverSortOffset: 25,
        baseYBias: 2,
        occlusionTrigger: true,
      }),
    ])
  })

  test('party, party followers and extra followers retain source order and depth tie-breaks', () => {
    const { instance } = presentation()
    const definition: SpriteDef = {
      id: 'party-sprite',
      label: 'Party',
      asset: 'sprite.party',
      layout: { kind: 'static' },
    }
    const frames = loaded(1, 7)
    const party = [member('leader'), member('follower')]
    const sprites = instance.sprites({
      entities: [],
      visible: () => true,
      entitySprite: () => undefined,
      loadedSprite: () => frames,
      entityGait: () => undefined,
      entityExplicitAnimation: () => undefined,
      entityActionFrame: () => undefined,
      entityLayer: () => undefined,
      party,
      partyVisual: () => ({ def: definition, frames }),
      player: {
        pos: { col: 2, row: 2, height: 0 },
        facing: 'down',
        walking: false,
        stepFrame: 0,
        layer: 3,
      },
      followers: [undefined, { pos: { col: 1, row: 2, height: 0 }, facing: 'left' }],
      extraFollowerSpriteIds: ['party-sprite'],
      extraFollowerPosition: (partyIndex) => ({
        pos: { col: partyIndex, row: 4, height: 0 },
        facing: 'up',
      }),
      spriteById: () => definition,
      now: () => 0,
    })
    expect(sprites).toHaveLength(3)
    expect(sprites.map((sprite) => sprite.baseYBias)).toEqual([3, 2.99, 2.98])
    expect(sprites.map((sprite) => sprite.coverILayer)).toEqual([30, 30, 30])
    expect(sprites.map((sprite) => sprite.anchorX)).toEqual([4, 4, 4])
    expect(sprites.map((sprite) => sprite.anchorY)).toEqual([10, 10, 10])
  })

  test('gait outranks explicit animation/action while semantic action outranks loop time', () => {
    const { instance } = presentation()
    const directional: SpriteDef = {
      id: 'directional',
      label: 'Directional',
      asset: 'sprite.directional',
      layout: { kind: 'directional', framesPerDir: 3 },
    }
    const loop: SpriteDef = {
      id: 'loop',
      label: 'Loop',
      asset: 'sprite.loop',
      layout: { kind: 'loop', frameCount: 4 },
    }
    const byId = { first: directional, second: loop }
    const frames = loaded(12)
    let clockReads = 0
    const sprites = instance.sprites({
      entities: [
        { id: 'first', sprite: 'directional', pos: { col: 0, row: 0, height: 0 }, facing: 'up' },
        { id: 'second', sprite: 'loop', pos: { col: 1, row: 0, height: 0 } },
      ],
      visible: () => true,
      entitySprite: (id) => byId[id as keyof typeof byId],
      loadedSprite: () => frames,
      entityGait: (id) => (id === 'first' ? 1 : undefined),
      entityExplicitAnimation: (id) => (id === 'first' ? 2 : undefined),
      entityActionFrame: (id) => (id === 'second' ? 7 : 8),
      entityLayer: () => undefined,
      party: [],
      partyVisual: () => undefined,
      player: {
        pos: { col: 0, row: 0, height: 0 },
        facing: 'down',
        walking: false,
        stepFrame: 0,
        layer: 0,
      },
      followers: [],
      extraFollowerSpriteIds: [],
      extraFollowerPosition: () => ({
        pos: { col: 0, row: 0, height: 0 },
        facing: 'down',
      }),
      spriteById: () => undefined,
      now: () => {
        clockReads++
        return 750
      },
    })
    expect(sprites[0]?.frame).toBe(frames.frames[7]) // up base 6 + gait phase 1
    expect(sprites[1]?.frame).toBe(frames.frames[7]) // action, not loop frame 3
    expect(clockReads).toBe(0)
  })
})

describe('WorldScenePresentation world painter', () => {
  const palette: Palette = { colors: Array.from({ length: 256 }, () => [0, 0, 0]), cycles: [] }

  function sceneFixture(mainRenderer: Renderer, log: string[]) {
    let waveRenderer: Renderer | null = null
    return {
      map: buildBlankProjectMap(2, 2, 'tiles'),
      room: { col: 0, row: 0, cols: 2, rows: 2 },
      palette,
      tiles: new Map(),
      renderer: mainRenderer,
      rendererForWave(create: () => Renderer) {
        if (!waveRenderer) {
          log.push('wave:create')
          waveRenderer = create()
        }
        return waveRenderer
      },
    }
  }

  test('shake samples frame time before the unchanged ordinary scene pass and expires at boundary', () => {
    const f = presentation()
    const mainRenderer = renderer(f.mainContext, f.log, 'main')
    const scene = sceneFixture(mainRenderer, f.log)
    f.instance.shake(100, 2, 3)
    expect(
      f.instance.renderWorld({
        scene,
        camera: { x: 5, y: 9 },
        sprites: [],
        vars: {},
        now: 120,
        advanceWaveFrame: false,
      }),
    ).toEqual({ x: 5, y: 6 })
    expect(
      f.instance.renderWorld({
        scene,
        camera: { x: 5, y: 9 },
        sprites: [],
        vars: {},
        now: 180,
        advanceWaveFrame: false,
      }),
    ).toEqual({ x: 5, y: 9 })
    expect(f.log).toEqual([
      'main:clear',
      'main:render:5,6:0:all',
      'main:clear',
      'main:render:5,9:0:all',
    ])
  })

  test('wave draws background offscreen, applies rows, then overlays static sprites without clearing', () => {
    const f = presentation()
    const mainRenderer = renderer(f.mainContext, f.log, 'main')
    const scene = sceneFixture(mainRenderer, f.log)
    const sprites = [{ frame: frame(1, 1) }] as never[]
    const vars = { 'sys:screenWave': 4, 'sys:waveProgression': 0 }
    f.instance.renderWorld({
      scene,
      camera: { x: 1, y: 2 },
      sprites,
      vars,
      now: 0,
      advanceWaveFrame: true,
    })
    expect(f.waveCanvas).toMatchObject({ width: 1280, height: 800 })
    expect(f.log).toEqual([
      'wave:create',
      'wave:clear',
      'wave:render:1,2:0:skipCover',
      'main:render:1,2:1:skipBase',
    ])
    expect(f.mainContext.drawImage).toHaveBeenCalled()
    expect(vars['sys:screenWave']).toBe(4)
  })
})
