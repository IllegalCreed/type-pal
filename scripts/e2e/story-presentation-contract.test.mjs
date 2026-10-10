import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import sprites from '../../projects/pal/content/sprites.json' with { type: 'json' }
import { canonicalScenes } from './entity-action-contract.mjs'
import { authoredMotionStep } from './story-motion-contract.mjs'
import { projectAuthoredFrame, verifyStoryPoses } from './story-pose-contract.mjs'

const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url))
const { createServer } = await import(require.resolve('vite'))

test('common pose algebra checks real host setters, rendered frame priority, geometry and captured animation', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'type-pal-story-pose-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    root: fileURLToPath(new URL('../../packages/reforge', import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  })
  const { WorldScenePresentation } = await server.ssrLoadModule('/src/world-scene-presentation.ts')
  const { WorldMotionRuntime } = await server.ssrLoadModule('/src/world-motion-runtime.ts')
  const { spriteBlitRect } = await server.ssrLoadModule('/src/render.ts')
  const { walkTick, stepEntityPos } = await server.ssrLoadModule('/src/entity-walk.ts')
  const { pixelDeltaToGridDelta } = await server.ssrLoadModule(
    fileURLToPath(new URL('../../packages/content/src/grid.ts', import.meta.url)),
  )
  const entity = structuredClone(canonicalScenes.s003.entities.find((e) => e.id === 'e62'))
  const definition = sprites.find((s) => s.id === entity.sprite)
  assert(definition)
  const frames = {
    frames: Array.from({ length: 12 }, (_, i) => ({
      width: 17 + i,
      height: 24 + i,
      pixels: new Uint8Array((17 + i) * (24 + i)),
      opaque: new Uint8Array((17 + i) * (24 + i)),
    })),
  }
  const motion = new WorldMotionRuntime(100),
    presentation = new WorldScenePresentation({
      canvas: { width: 320, height: 200 },
      context: {},
      worldScale: 1,
      createCanvas() {},
      contextFor() {},
      createRenderer() {},
    })
  const file = 'packages/reforge/src/main.ts',
    code = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8'),
    ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const deps = {
    activeScene: { scene: { entities: [entity] } },
    worldPresentation: presentation,
    motion,
    entityMotionPermanentlyRemoved: () => false,
    stepEntityPos,
    pixelDeltaToGridDelta,
    markEntityGait: (id, source, epoch) => {
      presentation.clearEntityFrame(id)
      motion.markGait(id, source, epoch)
    },
  }
  const native = {}
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      ['setEntityFacing', 'setEntityFrame', 'nudgeEntity', 'animEntity', 'stepEntity'].includes(
        node.name.getText(ast),
      ) &&
      !native[node.name.getText(ast)]
    )
      native[node.name.getText(ast)] = new Function(
        'deps',
        ts.transpile(`const {${Object.keys(deps)}}=deps;return ${node.initializer.getText(ast)}`, {
          target: ts.ScriptTarget.ES2022,
        }),
      )(deps)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const causes = [],
    worldRenders = [],
    states = [],
    poses = []
  let order = 0
  const event = (phase, extra = {}) => ({
    phase,
    order: ++order,
    scene: 's003',
    sceneVisit: 1,
    tick: motion.worldTick,
    ...extra,
  })
  const vector = (p) => [p.col, p.row, p.height]
  causes.push(
    event('runtime-projection-start', { worldSource: 'observe:causal', world: { script: {} } }),
  )
  const debug = () => ({
    override: presentation.entityFrame('e62') ?? null,
    gait: motion.gaitPhase('e62') ?? null,
    explicit: motion.explicitAnimation('e62') ?? null,
    gaitOwner: motion.gaitOwner('e62') ?? null,
    action: null,
  })
  const draw = () => {
    const selected = presentation.sprites({
      entities: [entity],
      visible: () => true,
      entitySprite: () => definition,
      loadedSprite: () => frames,
      entityGait: () => motion.gaitPhase('e62'),
      entityExplicitAnimation: () => motion.explicitAnimation('e62'),
      entityActionFrame: () => undefined,
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
      extraFollowerPosition() {},
      spriteById() {},
      now: () => 0,
    })[0]
    states.push({ ...event('state'), state: { frameDebug: debug() } })
    const receipt = event('draw', { renderId: worldRenders.length + 1 })
    worldRenders.push(receipt)
    const rect = spriteBlitRect(selected)
    poses.push({
      ...receipt,
      position: vector(entity.pos).slice(0, 2),
      facing: entity.facing ?? 'down',
      visible: true,
      frame: presentation.renderedEntityFrame('e62'),
      frameSource: 'drawn',
      drawStatus: 'drawn',
      geometry: { worldRect: [rect.x, rect.y, rect.w, rect.h] },
    })
  }
  const command = (command, args) => {
    const start = event('command', {
      occurrence: {
        id: order,
        timing: 'interactive',
        command: {
          kind: 'leaf',
          command: { ...command, target: { scene: 's003', entity: 'e62' } },
        },
      },
    })
    causes.push(start)
    native[command.kind]('e62', ...args)
    causes.push(event('leaf-completed', { occurrence: start.occurrence }))
    draw()
  }
  draw()
  command({ kind: 'setEntityFacing', facing: 'left' }, ['left'])
  command({ kind: 'setEntityFrame', frame: 2 }, [2])
  command({ kind: 'nudgeEntity', dx: -4, dy: 2 }, [-4, 2])
  command({ kind: 'animEntity' }, [])
  command({ kind: 'animEntity' }, [])
  command({ kind: 'stepEntity', dir: 'up' }, ['up'])
  const capture = event('runtime-captured', {
    positions: { e62: { ...entity.pos } },
    saved: { entities: { e62: { facing: entity.facing, motion: motion.captureEntity('e62') } } },
  })
  causes.push(capture)
  const trace = { causes, worldRenders, renderScope: { afterOrder: -1, throughOrder: order } }
  const verify = (trace, draws = poses) =>
    verifyStoryPoses(
      trace,
      [{ scene: 's003', entity: 'e62' }],
      [],
      { projections: [] },
      { frames: [] },
      { [definition.asset]: 12 },
      () => draws,
      () => states,
    )
  assert.equal(verify(trace).actors[0].draws, 7)
  const badPose = structuredClone(poses)
  badPose[4].frame++
  assert.throws(() => verify(trace, badPose), /incorrect actual rendered frame/)
  const badCapture = structuredClone(trace)
  badCapture.causes.at(-1).saved.entities.e62.motion.gait.phase++
  assert.throws(() => verify(badCapture), /capture animation differs/)
  const missing = structuredClone(trace)
  missing.causes = missing.causes.filter(
    (e) => e.occurrence?.command?.command?.kind !== 'animEntity',
  )
  assert.throws(() => verify(missing), /unauthored animation state/)
  const badHeight = structuredClone(poses)
  badHeight[0].geometry.worldRect[1] -= 8
  assert.throws(() => verify(trace, badHeight), /sprite y detached/)
  // Actual renderer/stride callers, not copies of the proposed model, supply the expected side.
  for (const layout of [{ kind: 'directional', framesPerDir: 3 }, { kind: 'static' }]) {
    const def = { ...definition, layout },
      loaded = { frames: frames.frames }
    for (const input of [
      { fixed: 2, gait: 3, gaitSource: 'auto', explicit: 1, action: 8, held: false },
      { fixed: null, gait: 3, gaitSource: 'auto', explicit: 1, action: 8, held: false },
      { fixed: null, gait: 3, gaitSource: 'auto', explicit: 1, action: 8, held: true },
      { fixed: null, gait: null, gaitSource: null, explicit: null, action: 8, held: false },
      { fixed: null, gait: null, gaitSource: null, explicit: null, action: null, held: false },
    ]) {
      presentation.clearEntityFrame('e62')
      if (input.fixed !== null) presentation.setEntityFrame('e62', input.fixed)
      presentation.sprites({
        entities: [entity],
        visible: () => true,
        entitySprite: () => def,
        loadedSprite: () => loaded,
        entityGait: () => (input.held ? undefined : (input.gait ?? undefined)),
        entityExplicitAnimation: () => input.explicit ?? undefined,
        entityActionFrame: () => input.action ?? undefined,
        entityLayer: () => undefined,
        party: [],
        followers: [],
        extraFollowerSpriteIds: [],
        now: () => 0,
      })
      assert.equal(
        projectAuthoredFrame(layout, entity.facing, input, 12),
        presentation.renderedEntityFrame('e62'),
      )
    }
  }
  for (const speed of ['slow', 'normal', 'fast', 'run']) {
    let from = { col: 10, row: 12, height: 2 },
      to = { col: 11.25, row: 11.75, height: 1 }
    for (let i = 0; i < 20; i++) {
      const actual = walkTick(from, to, speed),
        proof = authoredMotionStep(vector(from), { kind: 'moveEntity', to, speed })
      assert.deepEqual(proof, {
        to: vector(actual.pos),
        facing: actual.facing,
        arrived: actual.done,
      })
      from = actual.pos
      if (actual.done) break
    }
    assert.deepEqual(from, to)
  }
})
