import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import {
  authoredAutomaticLanguage,
  compareAutomaticLanguages,
  sourceAutomaticLanguage,
} from './automatic-language-contract.mjs'

const commands = original.segments[0].commands
test('mounted rower source nudge/animation atom and sixteen tick word match current author', async () => {
  const self = { scene: 's005', entity: 'e117' }
  const scene = JSON.parse(
    await readFile(new URL('../../projects/pal/content/scenes/s005.json', import.meta.url), 'utf8'),
  )
  const flow = scene.entities.find((entity) => entity.id === self.entity).behaviors.auto[
    'legacy-001'
  ].flow
  const body = flow.stages.find((stage) => stage.id === flow.initial).body
  const primary = sourceAutomaticLanguage(commands, 36147, { self: 118 })
  const prove = (value) =>
    compareAutomaticLanguages(primary, authoredAutomaticLanguage(value, self))
  assert.equal(prove(body).status, 'proved-nominal-language')
  const effects = primary.nodes.filter((node) => node.kind === 'effect').map((node) => node.value)
  assert.equal(effects.filter((effect) => effect.kind === 'nudge').length, 16)
  assert.equal(effects.filter((effect) => effect.kind === 'animate').length, 2)
  for (const change of [
    (stroke) => {
      stroke[0].dy = 2
    },
    (stroke) => {
      stroke.splice(1, 0, { kind: 'wait', ms: 100 })
    },
    (stroke) => {
      stroke.splice(1, 1)
    },
    (stroke) => {
      stroke.at(-1).ms = 200
    },
  ]) {
    const candidate = structuredClone(body)
    change(candidate[0].body[0].body)
    assert.throws(() => prove(candidate), /automatic language mismatch/)
  }
})
const cases = [
  ['s004', 'e85', 36675],
  ['s004', 'e86', 36675],
  ['s004', 'e87', 824],
  ['s004', 'e88', 840],
  ['s004', 'e89', 36235],
  ['s004', 'e90', 36248],
  ['s004', 'e91', 36252],
  ['s004', 'e92', 36275],
  ['s004', 'e93', 36311],
  ['s005', 'e116', 36140],
  ['s005', 'e121', 35725],
  ['s005', 'e122', 35799],
]

test('source language rejects retained pre-repair publication and proves repaired current author graphs', async () => {
  for (const [scene, entity, entry] of cases) {
    const baseline = JSON.parse(
      await readFile(
        new URL(
          `../../packages/migrate/baselines/pal/content/scenes/${scene}.json`,
          import.meta.url,
        ),
        'utf8',
      ),
    )
    const behavior = baseline.entities.find((e) => e.id === entity).behaviors.auto[
      entity === 'e88' ? 'legacy-001' : 'default'
    ]
    const body = behavior.flow.stages.find((stage) => stage.id === behavior.flow.initial).body
    const bindings = {
      self: Number(entity.slice(1)) + 1,
      selections: [
        { actor: 88, label: 840, behavior: 'legacy-001', target: { scene: 's004', entity: 'e88' } },
      ],
    }
    assert.throws(
      () =>
        compareAutomaticLanguages(
          sourceAutomaticLanguage(commands, entry, bindings),
          authoredAutomaticLanguage(body, { scene, entity }, bindings),
        ),
      /automatic/,
      `${entity}: original broken author program was accepted`,
    )
    const current = JSON.parse(
      await readFile(
        new URL(`../../projects/pal/content/scenes/${scene}.json`, import.meta.url),
        'utf8',
      ),
    )
    const flow = current.entities.find((e) => e.id === entity).behaviors.auto[
      entity === 'e88' ? 'legacy-001' : 'default'
    ].flow
    assert.equal(
      compareAutomaticLanguages(
        sourceAutomaticLanguage(commands, entry, bindings),
        authoredAutomaticLanguage(
          flow.stages.find((stage) => stage.id === flow.initial).body,
          { scene, entity },
          bindings,
        ),
      ).status,
      'proved-nominal-language',
      entity,
    )
  }
})

test('bisimulation retains probability, both backedges, repeated poses and atomic pose timing', () => {
  const self = { scene: 's004', entity: 'e90' }
  const body = [
    {
      kind: 'loop',
      mode: 'forever',
      body: [
        { kind: 'animEntity', target: self },
        { kind: 'wait', ms: 100 },
        {
          kind: 'branch',
          cond: { kind: 'chance', percent: 51 },
          then: [],
          else: [{ kind: 'wait', ms: 200 }],
        },
      ],
    },
  ]
  const source = sourceAutomaticLanguage(commands, 36248)
  const prove = (candidate) =>
    compareAutomaticLanguages(source, authoredAutomaticLanguage(candidate, self))
  assert.equal(prove(body).status, 'proved-nominal-language')
  for (const mutate of [
    (b) => {
      b[0].body[2].cond.percent = 50
    },
    (b) => {
      b[0].body[2].then = [{ kind: 'wait', ms: 100 }]
    },
    (b) => {
      b[0].body[2].else = []
    },
    (b) => {
      b[0].body.unshift({ kind: 'animEntity', target: self })
    },
    (b) => {
      b[0].body[2].else.push({ kind: 'breakLoop' })
    },
  ]) {
    const bad = structuredClone(body)
    mutate(bad)
    assert.throws(() => prove(bad), /automatic language mismatch/)
  }
  const pose = [
    { kind: 'setEntityFacing', target: self, facing: 'down' },
    { kind: 'setEntityFrame', target: self, frame: 3 },
    { kind: 'wait', ms: 100 },
  ]
  const sourcePose = sourceAutomaticLanguage(
    [{ op: 'raw', opcode: 20, operands: [3, 0, 0] }, { op: 'end' }],
    0,
  )
  assert.equal(
    compareAutomaticLanguages(sourcePose, authoredAutomaticLanguage(pose, self)).status,
    'proved-nominal-language',
  )
  pose.splice(1, 0, { kind: 'wait', ms: 100 })
  assert.throws(
    () => compareAutomaticLanguages(sourcePose, authoredAutomaticLanguage(pose, self)),
    /automatic language mismatch/,
  )
  const selection = {
    kind: 'selectEntityBehavior',
    target: { scene: 's004', entity: 'e88' },
    channel: 'auto',
    selection: { kind: 'use', value: 'legacy-001' },
  }
  const bindings = {
    selections: [{ actor: 88, label: 840, behavior: 'legacy-001', target: selection.target }],
  }
  const selecting = sourceAutomaticLanguage(
    [{ op: 'raw', opcode: 36, operands: [89, 840, 0] }, { op: 'end' }],
    0,
    bindings,
  )
  const single = [selection, { kind: 'wait', ms: 100 }]
  assert.throws(
    () => compareAutomaticLanguages(selecting, authoredAutomaticLanguage(single, self, bindings)),
    /automatic language mismatch/,
  )
  const selected = [{ ...selection, selection: { kind: 'disabled' } }, ...single]
  assert.equal(
    compareAutomaticLanguages(selecting, authoredAutomaticLanguage(selected, self, bindings))
      .status,
    'proved-nominal-language',
  )
  const wrongScene = structuredClone(selected)
  wrongScene[1].target.scene = 's999'
  assert.throws(
    () => authoredAutomaticLanguage(wrongScene, self, bindings),
    /selection target differs/,
  )
  const finite = sourceAutomaticLanguage(
    [{ op: 'raw', opcode: 135, operands: [0, 0, 0] }, { op: 'end' }],
    0,
  )
  const repeatBreak = [
    {
      kind: 'loop',
      mode: 'forever',
      body: [
        {
          kind: 'repeat',
          count: 2,
          body: [
            { kind: 'animEntity', target: self },
            { kind: 'wait', ms: 100 },
            { kind: 'breakLoop' },
          ],
        },
      ],
    },
  ]
  assert.throws(
    () => compareAutomaticLanguages(finite, authoredAutomaticLanguage(repeatBreak, self)),
    /automatic language mismatch/,
    'repeat break must not escape its outer forever loop',
  )
  const finiteRepeat = [
    {
      kind: 'repeat',
      id: 'pair',
      count: 2,
      body: [
        { kind: 'animEntity', target: self },
        { kind: 'wait', ms: 100 },
        { kind: 'continueLoop', loop: 'pair' },
        { kind: 'setEntityFrame', target: self, frame: 7 },
      ],
    },
  ]
  assert.equal(
    compareAutomaticLanguages(
      sourceAutomaticLanguage(
        [
          { op: 'raw', opcode: 135, operands: [0, 0, 0] },
          { op: 'raw', opcode: 135, operands: [0, 0, 0] },
          { op: 'end' },
        ],
        0,
      ),
      authoredAutomaticLanguage(finiteRepeat, self),
    ).status,
    'proved-nominal-language',
  )
})

test('native compiler, slot acknowledgements and frame timer distinguish consecutive steps from doubled waits and same-tick pose overwrites', async (t) => {
  const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url))
  const { createServer } = await import(require.resolve('vite'))
  const cacheDir = await mkdtemp(join(tmpdir(), 'type-pal-auto-language-'))
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
  const { ScriptRunnerCore } = await server.ssrLoadModule('/src/script-runner-core.ts')
  const { compileBaseScriptFlow } = await server.ssrLoadModule('/src/script-compiler-core.ts')
  const { RuntimeFrameSession } = await server.ssrLoadModule('/src/runtime-frame-session.ts')
  const { ScriptWorkQueue } = await server.ssrLoadModule('/src/script-work-queue.ts')
  const { WorldMotionRuntime } = await server.ssrLoadModule('/src/world-motion-runtime.ts')
  const { stepEntityPos } = await server.ssrLoadModule('/src/entity-walk.ts')
  const target = { scene: 'room', entity: 'bird' }
  const step = { kind: 'stepEntity', target, dir: 'down' }
  const wait = { kind: 'wait', ms: 100 }
  const frame = { kind: 'setEntityFrame', target, frame: 0 }
  async function run(body, { frameMs = 100, offset = 0 } = {}) {
    const frames = new RuntimeFrameSession(100),
      queue = new ScriptWorkQueue(),
      motion = new WorldMotionRuntime(100)
    let position = { col: 0, row: 0, height: 0 },
      finished = false
    const commits = [],
      draws = []
    const ports = {
      afterScriptWork: (action) => queue.whenIdle(action),
      activateConfirm() {},
      resumeScriptGates() {},
      gameplayFrozen: () => false,
      advanceFade() {},
      settleClosedDialogue() {},
      consumePressed: () => new Set(),
      tickHostiles() {},
      advanceMoves(dt) {
        if (!motion.advanceCadence(dt, false)) return
        for (const slot of [...motion.coordinator.autoSlots.values()]) {
          assert.equal(slot.kind, 'step')
          position = stepEntityPos(position, slot.dir)
          commits.push({
            kind: 'step',
            at: frames.now - 1,
            tick: motion.worldTick,
            position: { ...position },
          })
          slot.commitAttempt()
          slot.resolve()
        }
      },
      deriveMounts() {},
      advanceLifecycle() {},
      advanceEntityActions() {},
      clearWorldTicks() {},
      presentBattle: () => false,
      routeInput() {},
      presentWorld() {
        draws.push({ at: frames.now - 1, last: commits.at(-1)?.kind })
      },
    }
    await frames.tick(1, ports)
    if (offset) await frames.tick(1 + offset, ports)
    const signal = new AbortController().signal,
      finish = queue.begin(signal)
    const runner = new ScriptRunnerCore(
      {
        gameplayNow: () => frames.now,
        execute(command, context, owner) {
          assert.equal(context.timing, 'auto')
          if (command.kind === 'wait') return frames.wait(command.ms, owner)
          if (command.kind === 'stepEntity')
            return motion.registerAutoStep({
              id: 'bird',
              sceneId: 'room',
              dir: command.dir,
              signal: owner,
              activation: { ownerId: 'bird', epoch: 1 },
            })
          assert.equal(command.kind, 'setEntityFrame')
          commits.push({ kind: 'frame', at: frames.now - 1 })
        },
      },
      signal,
    )
    const done = runner
      .runFlow(
        compileBaseScriptFlow(
          { kind: 'stages', initial: 'a', stages: [{ id: 'a', body, next: { kind: 'complete' } }] },
          { timing: 'auto', canonicalContentDigest: 'a'.repeat(64) },
        ),
        { self: target, cursorController: { reachSafePoint: () => 'continue' } },
      )
      .finally(() => {
        finished = true
        finish()
      })
    for (let time = 1 + offset + frameMs; time <= 1001 && !finished; time += frameMs)
      await frames.tick(time, ports)
    assert(finished, 'native automatic sample did not complete')
    await done
    return { commits, draws }
  }
  const continuous = await run([step, step, wait, frame])
  assert.deepEqual(
    continuous.commits.map(({ kind, at }) => [kind, at]),
    [
      ['step', 100],
      ['step', 200],
      ['frame', 300],
    ],
  )
  assert(continuous.draws.some((draw) => draw.at === 200 && draw.last === 'step'))
  const doubled = await run([step, wait, step, wait, frame])
  assert.deepEqual(
    doubled.commits.map(({ kind, at }) => [kind, at]),
    [
      ['step', 100],
      ['step', 300],
      ['frame', 400],
    ],
  )
  const overwritten = await run([step, step, frame])
  assert.deepEqual(
    overwritten.commits.map(({ kind, at }) => [kind, at]),
    [
      ['step', 100],
      ['step', 200],
      ['frame', 200],
    ],
  )
  assert(!overwritten.draws.some((draw) => draw.at === 200 && draw.last === 'step'))
  const phased = await run([step, step, wait, frame], { frameMs: 16, offset: 38 })
  assert.deepEqual(
    phased.commits.filter((c) => c.kind === 'step').map((c) => c.tick),
    [1, 2],
  )
  assert.equal(phased.commits[0].at, 102)
  assert.notEqual(
    phased.commits[0].at - 38,
    100,
    'a next-slot wait is not a fixed wall-clock 100ms promise',
  )
  const phasedDouble = await run([step, wait, step, wait, frame], { frameMs: 16, offset: 38 })
  assert.deepEqual(
    phasedDouble.commits.filter((c) => c.kind === 'step').map((c) => c.tick),
    [1, 3],
  )

  // Exercise the actual project activation/completion gate, not just a fabricated cursor.
  const { ScriptProjectRuntime } = await server.ssrLoadModule('/src/runtime-script-project.ts')
  const { selectEntityBehavior } = await server.ssrLoadModule('/src/script-world.ts')
  const { emptyWorldScriptState, buildEntityLifecycleReferenceIndex } = await server.ssrLoadModule(
    '/../content/src/index.ts',
  )
  const definition = JSON.parse(
    await readFile(new URL('../../projects/pal/content/scenes/s004.json', import.meta.url), 'utf8'),
  )
  const entity = definition.entities.find((e) => e.id === 'e88')
  const scene = { ...definition, entities: [entity], hooks: undefined }
  const world = {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    script: emptyWorldScriptState(),
  }
  const effects = []
  const projectRuntime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'a'.repeat(64), {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
    scene: () => scene,
    currentSceneId: () => scene.id,
    executeEffect: (command) => {
      effects.push(structuredClone(command))
    },
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 0,
      inParty: () => false,
      entityInScene: () => true,
      entitiesNear: () => false,
      facingEntity: () => false,
    },
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
  })
  const address = { scene: 's004', entity: 'e88' }
  const select = (selection) =>
    selectEntityBehavior(
      world.script,
      entity,
      address,
      'auto',
      selection,
      projectRuntime.coordinator,
    )
  const play = () =>
    projectRuntime.runEntityBehavior(scene, 'e88', 'auto', { signal: new AbortController().signal })
  select({ kind: 'use', value: 'legacy-001' })
  assert.equal(await play(), true)
  const first = structuredClone(effects)
  assert.deepEqual(
    first.map((command) => command.kind),
    ['setEntityFacing', 'setEntityFrame', 'wait', ...Array(7).fill(['animEntity', 'wait']).flat()],
  )
  assert.deepEqual(
    first.filter((command) => command.kind === 'wait').map((command) => command.ms),
    [100, ...Array(7).fill(200)],
  )
  select({ kind: 'use', value: 'legacy-001' })
  assert.equal(await play(), false, 'same completed selection does not restart')
  assert.deepEqual(effects, first)
  select({ kind: 'disabled' })
  select({ kind: 'use', value: 'legacy-001' })
  assert.equal(await play(), true)
  assert.deepEqual(
    effects,
    [...first, ...first],
    'reset must execute a second complete authored action, not just clear a cursor',
  )
})
