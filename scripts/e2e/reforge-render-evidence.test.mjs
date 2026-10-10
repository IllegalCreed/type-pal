import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { parseSpriteChunk } from '../../packages/shared/src/rle.ts'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { openingTracePlugin } from './opening-trace-plugin.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'

const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url))
const { createServer } = await import(require.resolve('vite'))

test('real Reforge sprite assembly and draw preserve entity identity and publish only a complete pass', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'type-pal-draw-test-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    root: fileURLToPath(new URL('../../packages/reforge', import.meta.url)),
    plugins: [openingTracePlugin()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  })
  const originalDocument = globalThis.document
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
    delete globalThis.__e2eNpcDrawSources
    delete globalThis.__e2eNpcDrawPasses
    delete globalThis.__e2eNpcDrawViews
    delete globalThis.__e2eRecordSpriteFrame
    delete globalThis.__e2eBakedSpriteFrames
  })
  // Only canvas IO is substituted; selection, geometry, sort, draw callbacks and
  // the world caller execute the production modules through the real plugin.
  const draws = []
  let failAt = null
  const failure = new Error('canvas draw failure')
  const context = (canvas, main) => ({
    canvas,
    save() {},
    restore() {},
    scale() {},
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    fillRect() {},
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {},
    drawImage(...args) {
      if (!main) return
      draws.push(args)
      if (draws.length === failAt) throw failure
    },
  })
  globalThis.document = {
    createElement: () => {
      const canvas = { width: 0, height: 0 }
      canvas.getContext = () => context(canvas, false)
      return canvas
    },
  }
  const { WorldScenePresentation } = await server.ssrLoadModule('/src/world-scene-presentation.ts')
  const { Canvas2DRenderer } = await server.ssrLoadModule('/src/render.ts')
  const { buildBlankProjectMap } = await server.ssrLoadModule('/src/project-map.ts')
  const canvas = { width: 320, height: 200 },
    ctx = context(canvas, true),
    renderer = new Canvas2DRenderer(
      ctx,
      {
        colors: [
          [0, 0, 0],
          [255, 255, 255],
        ],
      },
      new Map(),
    ),
    presentation = new WorldScenePresentation({ canvas, context: ctx, worldScale: 1 })
  const sharedFrame = {
    width: 8,
    height: 8,
    pixels: new Uint8Array(64).fill(1),
    opaque: new Uint8Array(64).fill(1),
  }
  const errors = []
  const recorder = createEvidenceRecorder({
    context: () => ({}),
    errors,
    onOverflow: () => assert.fail('resource overflow'),
  })
  const definition = { id: 'shared', asset: 'sprite.shared', layout: { kind: 'static' } }
  const entities = [
    // Reverse depth order: an array-index mapping would attach the draws to the wrong NPC.
    { id: 'e57', pos: { col: 3, row: 3, height: 0 }, facing: 'up' },
    { id: 'e56', pos: { col: 2, row: 2, height: 0 }, facing: 'right' },
    { id: 'hidden', pos: { col: 4, row: 4, height: 0 }, facing: 'left', hidden: true },
  ]
  const sprites = presentation.sprites({
    entities,
    visible: (entity) => !entity.hidden,
    entitySprite: (id) => ({ ...definition, id: `definition-${id}`, asset: `resource-${id}` }),
    loadedSprite: () => ({ frames: [sharedFrame] }),
    entityGait: () => undefined,
    entityExplicitAnimation: () => undefined,
    entityActionFrame: () => undefined,
    entityLayer: () => undefined,
    party: [],
    extraFollowerSpriteIds: [],
    now: () => 0,
  })
  assert.equal(sprites.length, 2)
  assert(sprites.every((sprite) => sprite.frame === sharedFrame))
  assert.equal(globalThis.__e2eNpcDrawPasses?.get(sprites), undefined, 'selection is not drawing')
  const input = {
    scene: {
      map: buildBlankProjectMap(4, 4, 'empty'),
      room: { col: 0, row: 0, cols: 4, rows: 4 },
      renderer,
    },
    camera: { x: 0, y: 0 },
    sprites,
    vars: {},
    now: 0,
    advanceWaveFrame: false,
  }
  presentation.renderWorld(input)
  assert.equal(draws.length, 2)
  assert.equal(draws[0][0], draws[1][0], 'shared resource remains shared')
  assert.deepEqual(
    draws.map((args) => args.slice(1)),
    [
      [-4, 31],
      [-4, 47],
    ],
  )
  const pass = globalThis.__e2eNpcDrawPasses?.get(sprites)
  assert.equal(pass?.e56.frame, 0, 'successful real draw must provide entity evidence')
  assert.deepEqual(Object.keys(pass), ['e56', 'e57'])
  assert.deepEqual([pass.e56.assetId, pass.e56.resourceAssetId], ['definition-e56', 'resource-e56'])
  assert.deepEqual([pass.e57.assetId, pass.e57.resourceAssetId], ['definition-e57', 'resource-e57'])
  assert.deepEqual(pass.e56.position, [2, 2, 0])
  assert.deepEqual(pass.e57.position, [3, 3, 0])
  assert.equal(pass.e56.facing, 'right')
  assert.equal(pass.e57.facing, 'up')
  assert.equal(pass.e56.drawOrder, 0)
  assert.equal(pass.e57.drawOrder, 1)
  assert.equal(pass.e56.frameSource, 'drawn')
  assert.equal(pass.e57.drawStatus, 'drawn')
  assert.deepEqual(errors, [])
  assert.equal(pass.e56.frameResourceId, pass.e57.frameResourceId)
  assert.deepEqual(recorder.resources()[0].pixels, Array.from(sharedFrame.pixels))
  assert.equal(recorder.resources().length, 1)
  assert.deepEqual(pass.e56.geometry, { worldRect: [-4, 31, 8, 8] })
  assert.deepEqual(globalThis.__e2eNpcDrawViews.get(sprites), {
    camera: { x: 0, y: 0 },
    canvasSize: [320, 200],
    transform: [1, 0, 0, 1, 0, 0],
    pixelRounding: 'round-after-camera',
  })
  // Canvas still receives these offscreen draws. Keep that fact separate from viewport geometry.
  input.camera = { x: 500, y: 500 }
  presentation.renderWorld(input)
  assert.deepEqual(
    draws.slice(-2).map((args) => args.slice(1)),
    [
      [-504, -469],
      [-504, -453],
    ],
  )
  assert.equal(globalThis.__e2eNpcDrawPasses.get(sprites).e56.drawStatus, 'drawn')
  assert.deepEqual(globalThis.__e2eNpcDrawViews.get(sprites).camera, input.camera)
  failAt = draws.length + 2
  assert.throws(
    () => presentation.renderWorld(input),
    (error) => error === failure,
  )
  assert.equal(draws.length, 6, 'failed pass stops after its second NPC draw')
  assert.equal(globalThis.__e2eNpcDrawPasses.get(sprites), undefined, 'no stale or partial success')
  assert.equal(globalThis.__e2eNpcDrawViews.get(sprites), undefined, 'no stale viewport on failure')
  failAt = null
  const replacement = { ...sharedFrame, pixels: new Uint8Array(64), opaque: new Uint8Array(64) }
  sprites[0].frame = replacement
  presentation.renderWorld(input)
  const changed = globalThis.__e2eNpcDrawPasses.get(sprites)
  const renderedResource = recorder.resources().find((r) => r.order === changed.e57.frameResourceId)
  assert.deepEqual(
    renderedResource.pixels,
    Array.from(replacement.pixels),
    'actual baked replacement, not earlier selection',
  )
  assert.notEqual(changed.e57.frameResourceId, changed.e56.frameResourceId)
  replacement.pixels.fill(1)
  presentation.renderWorld(input)
  assert.equal(
    globalThis.__e2eNpcDrawPasses.get(sprites).e57.frameResourceId,
    changed.e57.frameResourceId,
    'cached canvas still draws original baked pixels after source-array mutation',
  )
  assert.deepEqual(renderedResource.pixels, Array(64).fill(0))
  const partyFrames = parseSpriteChunk(
    gunzipSync(readFileSync(new URL('../../data/extracted/data/sprite/2.rle', import.meta.url))),
  )
  const player = {
    pos: { col: 124, row: 48, height: 0 },
    facing: 'down',
    walking: false,
    stepFrame: 0,
    layer: 0,
  }
  const partyInput = {
    entities: [],
    party: [{ id: 'li-xiaoyao' }],
    partyVisual: () => ({
      def: {
        id: 'li-xiaoyao',
        asset: 'sprite.pal.002',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
      frames: { frames: partyFrames },
    }),
    player,
    followers: [],
    extraFollowerSpriteIds: [],
    now: () => 0,
  }
  for (const [facing, frame] of [
    ['down', 0],
    ['up', 6],
  ]) {
    player.facing = facing
    const partySprites = presentation.sprites(partyInput)
    assert.equal(globalThis.__e2eNpcDrawPasses.get(partySprites), undefined)
    presentation.renderWorld({ ...input, camera: { x: 1056, y: 1264 }, sprites: partySprites })
    const selected = globalThis.__e2eNpcDrawPasses.get(partySprites).party
    assert.equal(selected.frame, frame)
    assert.equal(selected.assetId, 'li-xiaoyao')
    const resource = recorder.resources().find((entry) => entry.order === selected.frameResourceId)
    assert.deepEqual(resource.pixels, Array.from(partyFrames[frame].pixels))
    assert.equal(selected.drawStatus, 'drawn')
    const expected = [
      1216 - Math.floor(resource.width / 2),
      1376 + 7 - resource.height,
      resource.width,
      resource.height,
    ]
    assert.deepEqual(selected.geometry.worldRect, expected, 'Reforge uses its declared +7 anchor')
    assert.deepEqual(draws.at(-1).slice(1), [expected[0] - 1056, expected[1] - 1264])
    const order = Math.max(...recorder.resources().map((entry) => entry.order)) + 1
    const trace = {
      resources: structuredClone(recorder.resources()),
      events: [
        {
          kind: 'actor',
          id: 'party',
          scene: 's004',
          sceneVisit: 1,
          order,
          state: { sprite: 'li-xiaoyao', position: [124, 48, 0] },
        },
        {
          kind: 'actor-render',
          id: 'party',
          source: 'render:world',
          scene: 's004',
          sceneVisit: 1,
          order: order + 1,
          state: selected,
        },
      ],
    }
    const root = fileURLToPath(new URL('../../', import.meta.url))
    assert.equal((await checkSpriteResources(trace, 'reforge', root)).status, 'proved')
    const shifted = structuredClone(trace)
    shifted.events[1].state.geometry.worldRect[1] += 3
    assert.equal(
      (await checkSpriteResources(shifted, 'reforge', root)).witness.rule,
      'party-draw-geometry',
    )
  }
  assert.deepEqual(errors, [])
})
