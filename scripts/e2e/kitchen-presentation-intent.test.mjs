import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import hall from '../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import sprites from '../../projects/pal/content/sprites.json' with { type: 'json' }
import { verifyInnPresentation } from './inn-presentation-intent.mjs'
import { verifyKitchenPresentation } from './kitchen-presentation-intent.mjs'

test('actual fixed pose survives authority take and release; resetting its draw is rejected', async (t) => {
  const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url))
  const { createServer } = await import(require.resolve('vite'))
  const cacheDir = await mkdtemp(join(tmpdir(), 'pal-kitchen-pose-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    root: fileURLToPath(new URL('../../', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  })
  const { WorldScenePresentation } = await server.ssrLoadModule(
    '/packages/reforge/src/world-scene-presentation.ts',
  )
  const { WorldMotionRuntime } = await server.ssrLoadModule(
    '/packages/reforge/src/world-motion-runtime.ts',
  )
  const motion = new WorldMotionRuntime(100)
  const presentation = new WorldScenePresentation({
    canvas: { width: 1280, height: 800 },
    context: {},
    worldScale: 4,
    createCanvas: () => ({}),
    contextFor: () => ({}),
    createRenderer: () => ({}),
  })
  const entity = hall.entities.find((value) => value.id === 'e62')
  const definition = sprites.find((value) => value.id === entity.sprite)
  const frames = Array.from({ length: 12 }, () => ({
    width: 20,
    height: 40,
    pixels: new Uint8Array(800),
    opaque: new Uint8Array(800),
  }))
  const input = {
    entities: [{ ...entity, facing: 'down' }],
    visible: () => true,
    entitySprite: () => definition,
    loadedSprite: () => ({ frames, anchorX: 0, anchorY: 0 }),
    entityGait: (id) =>
      motion.gaitOwner(id)?.source === 'auto' && motion.coordinator.authority.has(id)
        ? undefined
        : motion.gaitPhase(id),
    entityExplicitAnimation: (id) => motion.explicitAnimation(id),
    entityActionFrame: () => undefined,
    entityLayer: () => 0,
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
    extraFollowerPosition: () => ({ pos: { col: 0, row: 0, height: 0 }, facing: 'down' }),
    spriteById: () => undefined,
    now: () => 0,
  }
  const command = (order, kind, extra = {}) => ({
    order,
    phase: 'command',
    occurrence: {
      command: { command: { kind, target: { scene: 's003', entity: 'e62' }, ...extra } },
    },
  })
  const trace = {
    events: ['e19', 'e56', 'e62'].map((id) => ({
      kind: 'actor',
      id,
      scene: id === 'e19' ? 's001' : 's003',
      sceneVisit: 1,
      order: 2,
      state: {
        frameDebug: {
          override: id === 'e62' ? 1 : null,
          gait: null,
          explicit: null,
          action: null,
          authority: 'world',
        },
      },
    })),
    initialCauses: [command(1, 'setEntityFrame', { frame: 1 })],
    causes: [command(15, 'takeEntity'), command(25, 'releaseEntity')],
    renderScope: { afterOrder: 0, throughOrder: 40 },
    worldRenders: [],
  }
  const poses = { e19: [], e56: [], e62: [] }
  presentation.setEntityFrame('e62', 1)
  for (let index = 1; index <= 3; index++) {
    if (index === 2) motion.coordinator.setAuthority('e62', { kind: 'script' })
    if (index === 3) motion.coordinator.releaseAuthority('e62')
    const drawn = presentation.sprites(input)[0].frame
    assert.equal(drawn, frames[1], 'fixed frame remains the actual renderer selection')
    for (const [id, scene, position, facing, frame] of [
      ['e19', 's001', [89, 45], 'up', 6],
      ['e56', 's003', [137, 66], 'down', 0],
      ['e62', 's003', [137, 73], 'down', frames.indexOf(drawn)],
    ]) {
      const draw = { order: index * 10, renderId: index, sceneVisit: 1, scene }
      if (id !== 'e62') trace.worldRenders.push(draw)
      poses[id].push({
        ...draw,
        position,
        facing,
        frame,
        visible: true,
        frameSource: 'drawn',
        drawStatus: 'drawn',
        geometry: {
          worldRect: [
            16 * (position[0] - position[1]) - 10,
            8 * (position[0] + position[1]) + 7 - 40,
            20,
            40,
          ],
        },
      })
    }
  }
  const verify = () =>
    verifyKitchenPresentation(
      trace,
      (_trace, id) => poses[id],
      () => [],
      (_trace, id) => [{ state: { position: poses[id][0].position } }],
      [],
    )
  assert.equal(verify().length, 3)
  poses.e62[1].frame = 0
  assert.throws(verify, /unexplained actual animation frame/)

  // Exercise the same public authority/pose contract on an inn participant, with its own draws.
  const innEntity = hall.entities.find((value) => value.id === 'e59')
  const innDefinition = sprites.find((value) => value.id === innEntity.sprite)
  input.entities = [{ ...innEntity, facing: 'down' }]
  input.entitySprite = () => innDefinition
  const innTrace = {
    events: ['e54', 'e55', 'e56', 'e59', 'e60', 'e61', 'e73', 'e74'].map((id) => ({
      kind: 'actor',
      id,
      scene: 's003',
      sceneVisit: 1,
      order: 2,
      state: {
        frameDebug: {
          override: id === 'e59' ? 0 : null,
          gait: null,
          explicit: null,
          action: null,
          authority: 'world',
        },
      },
    })),
    causes: [
      command(12, 'setEntityFrame', { frame: 1 }),
      command(15, 'takeEntity'),
      command(25, 'setEntityFrame', { frame: 2 }),
      command(26, 'releaseEntity'),
    ].map((event) => ({
      ...event,
      scene: 's003',
      occurrence: {
        command: {
          command: {
            ...event.occurrence.command.command,
            target: { scene: 's003', entity: 'e59' },
          },
        },
      },
    })),
    renderScope: { afterOrder: 0, throughOrder: 40 },
    worldRenders: trace.worldRenders.filter((draw) => draw.scene === 's003'),
  }
  const innPoses = {}
  for (const id of ['e54', 'e55', 'e56', 'e59', 'e60', 'e61', 'e73', 'e74'])
    innPoses[id] = innTrace.worldRenders.map((draw) => ({
      ...draw,
      position: [0, 0],
      facing: 'down',
      frame: 0,
      visible: true,
      frameSource: 'drawn',
      drawStatus: 'drawn',
      geometry: { worldRect: [-10, -33, 20, 40] },
    }))
  for (let index = 0; index < 3; index++) {
    presentation.setEntityFrame('e59', index)
    if (index === 1) motion.coordinator.setAuthority('e59', { kind: 'script' })
    if (index === 2) motion.coordinator.releaseAuthority('e59')
    innPoses.e59[index].frame = frames.indexOf(presentation.sprites(input)[0].frame)
  }
  const verifyInn = () =>
    verifyInnPresentation(
      innTrace,
      (_trace, id) => innPoses[id],
      () => [],
      [],
    )
  assert.equal(verifyInn().actors.length, 8)
  for (const [index, stale] of [
    [1, 0],
    [2, 1],
  ]) {
    innPoses.e59[index].frame = stale
    assert.throws(verifyInn, /unexplained actual pose/)
    innPoses.e59[index].frame = index
  }

  presentation.clearEntityFrame('e59')
  motion.markGait('e59', 'auto', 1)
  innTrace.causes = [15, 25].map((order, index) => ({
    ...command(order, index === 0 ? 'takeEntity' : 'releaseEntity'),
    scene: 's003',
    occurrence: {
      command: {
        command: {
          kind: index === 0 ? 'takeEntity' : 'releaseEntity',
          target: { scene: 's003', entity: 'e59' },
        },
      },
    },
  }))
  const seed = innTrace.events.find((event) => event.id === 'e59')
  seed.state.frameDebug = {
    override: presentation.entityFrame('e59') ?? null,
    gait: motion.gaitPhase('e59') ?? null,
    gaitOwner: motion.gaitOwner('e59') ?? null,
    explicit: motion.explicitAnimation('e59') ?? null,
    action: null,
    authority: motion.coordinator.authority.get('e59')?.kind ?? 'world',
  }
  for (let index = 0; index < 3; index++) {
    if (index === 1) motion.coordinator.setAuthority('e59', { kind: 'script' })
    if (index === 2) motion.coordinator.releaseAuthority('e59')
    innPoses.e59[index].frame = frames.indexOf(presentation.sprites(input)[0].frame)
  }
  assert.deepEqual(
    innPoses.e59.map((pose) => pose.frame),
    [1, 0, 1],
  )
  assert.equal(verifyInn().actors.length, 8)
  innPoses.e59[1].frame = 1
  assert.throws(verifyInn, /unexplained actual pose/)
  innPoses.e59[1].frame = 0
  for (const corrupt of [
    (event) => {
      delete event.state.frameDebug
    },
    (event) => {
      event.sceneVisit++
    },
    (event) => {
      event.id = 'e60'
    },
    (event) => {
      event.order = 11
    },
  ]) {
    const original = structuredClone(seed)
    corrupt(seed)
    assert.throws(verifyInn, /initial frame-selection inputs missing/)
    Object.assign(seed, original)
  }
})
