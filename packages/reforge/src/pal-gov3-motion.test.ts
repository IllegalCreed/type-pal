import type { FlowCursor, RuntimeCommand, RuntimeScriptFlow } from '@type-pal/content'
import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
  validateCurrentManifestStartup,
  validateSprites,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import scene16Json from '../../../projects/pal/content/scenes/s016.json' with { type: 'json' }
import scene20Json from '../../../projects/pal/content/scenes/s020.json' with { type: 'json' }
import scene32Json from '../../../projects/pal/content/scenes/s032.json' with { type: 'json' }
import scene126Json from '../../../projects/pal/content/scenes/s126.json' with { type: 'json' }
import scene130Json from '../../../projects/pal/content/scenes/s130.json' with { type: 'json' }
import scene193Json from '../../../projects/pal/content/scenes/s193.json' with { type: 'json' }
import scene213Json from '../../../projects/pal/content/scenes/s213.json' with { type: 'json' }
import spritesJson from '../../../projects/pal/content/sprites.json' with { type: 'json' }
import manifestJson from '../../../projects/pal/manifest.json' with { type: 'json' }
import { compileRuntimeScriptFlow } from './runtime-script-compiler.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'
import { normalizeCurrentSave, preflightCurrentSave } from './save/current-codec.js'
import { buildCurrentSavePayload, buildMeta } from './save/ops.js'
import { MemorySaveStore } from './save/store.js'
import { makeTestWorld } from './test-fixtures.js'

const authors = validateAuthorScenes([
  scene16Json,
  scene20Json,
  scene32Json,
  scene126Json,
  scene130Json,
  scene193Json,
  scene213Json,
])
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
const sprites = new Map(validateSprites(spritesJson).map((sprite) => [sprite.id, sprite]))
const scenes = resolveAuthorDialogueTree(authors, actors)

function scene(id: string) {
  const value = scenes.find((candidate) => candidate.id === id)
  if (!value) throw new Error(`missing scene ${id}`)
  return value
}

function automatic(sceneId: string, entityId: string, id = 'default'): RuntimeScriptFlow {
  const entity = scene(sceneId).entities.find((entity) => entity.id === entityId)
  const behavior = entity?.behaviors?.auto?.[id]
  if (!behavior) throw new Error(`missing auto ${sceneId}/${entityId}/${id}`)
  return behavior.flow
}

function arenaPath(id: string): RuntimeScriptFlow {
  const loop = automatic('s032', 'e547').stages[0]?.body[0]
  if (!loop || loop.kind !== 'loop') throw new Error('missing paired arena routine')
  const phase = loop.body.find(
    (command) =>
      command.kind === 'branch' && command.cond.kind === 'chance' && command.cond.percent === 49,
  )
  if (!phase || phase.kind !== 'branch') throw new Error('missing arena continuation chance')
  const variation = phase.then.find(
    (command) =>
      command.kind === 'branch' && command.cond.kind === 'chance' && command.cond.percent === 39,
  )
  if (!variation || variation.kind !== 'branch') throw new Error('missing arena variation')
  let body: RuntimeCommand[]
  if (id === 'legacy-001') body = variation.else ?? []
  else if (id === 'legacy-003') body = variation.then
  else {
    const first = loop.body.findIndex(
      (command) => command.kind === 'setEntityFrame' && command.target.entity === 'e549',
    )
    body = loop.body.slice(first - 1, loop.body.indexOf(phase))
  }
  return {
    kind: 'stages',
    initial: 'whole',
    stages: [{ id: 'whole', body, next: { kind: 'complete' } }],
  }
}

async function observe(flow: RuntimeScriptFlow, limit = 30000) {
  let time = 0
  let cursor: FlowCursor | undefined
  const controller = new AbortController()
  const effects: { at: number; command: RuntimeCommand }[] = []
  const advance = (ms: number) => {
    time += ms
    if (time >= limit) controller.abort()
  }
  const host: ScriptRuntimeHost = {
    execute(command) {
      if (command.kind === 'wait') return advance(command.ms)
      effects.push({ at: time, command: structuredClone(command) })
    },
    gameplayNow: () => time,
    evalCondition: () => true,
    wait: async (ms) => advance(ms),
    waitWorldTick: async () => advance(100),
    yieldMacroTask: async () => {},
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
  }
  const executable = compileRuntimeScriptFlow(flow, {
    timing: 'auto',
    canonicalContentDigest: 'a'.repeat(64),
  })
  try {
    await new RuntimeScriptRunner(host, controller.signal).runFlow(executable, {
      cursorController: {
        checkpointEnabled: true,
        reachSafePoint(value) {
          cursor = value
          return 'continue'
        },
      },
    })
  } catch (error) {
    if (!controller.signal.aborted) throw error
  }
  return { effects, time, cursor }
}

test.each([
  ['legacy-001', [0, 1], ['sound.pal.017']],
  ['legacy-002', [0, 2, 1], ['sound.pal.017', 'sound.pal.015']],
  ['legacy-003', [3, 0], ['sound.pal.007', 'sound.pal.091']],
] as const)('arena %s completes its whole action and returns to the starting position', async (id, frames, sounds) => {
  const run = await observe(arenaPath(id))
  const nudges = run.effects.flatMap(({ command }) =>
    command.kind === 'nudgeEntity' && command.target.entity === 'e549' ? [command] : [],
  )
  expect(nudges.reduce((sum, command) => sum + command.dx, 0)).toBe(0)
  expect(nudges.reduce((sum, command) => sum + command.dy, 0)).toBe(0)
  expect(
    run.effects.flatMap(({ command }) =>
      command.kind === 'setEntityFrame' && command.target.entity === 'e549' ? [command.frame] : [],
    ),
  ).toEqual(frames)
  expect(
    run.effects.flatMap(({ command }) => (command.kind === 'playSound' ? [command.asset] : [])),
  ).toEqual(sounds)
  expect(run.cursor).toEqual({ kind: 'completed' })
})

test.each([
  'e2276',
  'e2278',
  'e2280',
])('%s keeps alternating the two groups after the first full cycle', async (entity) => {
  const run = await observe(automatic('s130', entity), 30000)
  const frames = run.effects.flatMap(({ at, command }) =>
    command.kind === 'setEntityFrame' ? [{ at, frame: command.frame }] : [],
  )
  expect(frames.slice(0, 18).map((row) => row.frame)).toEqual(
    Array.from({ length: 3 }, () => [6, 7, 8, 9, 10, 11]).flat(),
  )
  expect(new Set(frames.filter((row) => row.at >= 15000).map((row) => row.frame))).toEqual(
    new Set(Array.from({ length: 12 }, (_, frame) => frame)),
  )
  expect(frames[1]!.at - frames[0]!.at).toBe(200)
  expect(frames[18]!.at - frames[17]!.at).toBe(300)
})

test('the later one-shot motion is not configured as an endless page animation', () => {
  const entity = scene('s193').entities.find((entity) => entity.id === 'e3331')
  expect(entity?.pages?.[0]?.animation?.loop).toBe(false)
})

test('reusable environment actions have the verified cycle durations rather than per-leaf pacing', () => {
  const expected: Record<string, number> = {
    'sprite-36': 800,
    'sprite-37': 1600,
    'sprite-196': 2400,
    'sprite-233': 1200,
    'sprite-8': 300,
    'sprite-76': 800,
    'sprite-602': 4000,
    'sprite-402': 400,
    'sprite-9': 300,
    'sprite-300': 1000,
    'sprite-368': 600,
    'sprite-439': 7300,
    'sprite-78': 800,
    'sprite-77': 800,
    'sprite-606': 2400,
    'sprite-605': 2400,
    'sprite-35': 1300,
    'sprite-96': 1700,
  }
  for (const [id, milliseconds] of Object.entries(expected)) {
    const action = Object.values(sprites.get(id)?.poses ?? {}).find(
      (action) => action.loopFrom !== undefined,
    )
    if (!action) throw new Error(`missing looping action ${id}`)
    expect(
      action.steps.slice(action.loopFrom ?? 0).reduce((sum, step) => sum + step.durationMs, 0),
      id,
    ).toBe(milliseconds)
  }
})

test('the placed reed raft has a return crossing and comes back to its first step', () => {
  const entity = scene('s213').entities.find((entity) => entity.id === 'e3606')
  const flow = entity?.behaviors?.trigger?.['legacy-001']?.flow
  if (!flow) throw new Error('missing reed raft flow')
  expect(flow.stages).toHaveLength(2)
  expect(flow.stages[0]?.next).toBe(flow.stages[1]?.id)
  expect(flow.stages[1]?.next).toBe(flow.initial)
})

test('the actual installed reed crossing survives SAVE12 and alternates destinations three times', async () => {
  const definition = scene('s213')
  const references = buildEntityLifecycleReferenceIndex([definition])
  const manifest = validateCurrentManifestStartup(manifestJson).manifest
  const world = { ...makeTestWorld(), script: emptyWorldScriptState() }
  const effects: RuntimeCommand[] = []
  const signal = new AbortController().signal
  const runtimeFor = (value: typeof world) =>
    new ScriptProjectRuntime({ sharedScripts: {} }, value, 'a'.repeat(64), {
      lifecycleReferences: references,
      currentSceneId: () => definition.id,
      currentSceneSessionId: () => 'reed-crossing',
      scene: () => definition,
      executeEffect(command) {
        effects.push(command)
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
        facingEntity: () => true,
      },
      wait: async () => {},
      waitWorldTick: async () => {},
      yieldMacroTask: async () => {},
      confirm: async () => true,
      startBattle: async () => 'victory',
      teleportOut: async () => false,
    })
  let runtime = runtimeFor(world)
  const automatic = definition.entities.find((entity) => entity.id === 'e3606')?.behaviors?.auto
    ?.default?.flow.stages[0]?.body
  const selection = automatic?.find((command) => command.kind === 'selectEntityBehavior')
  if (!selection) throw new Error('missing actual reed activation binding')
  await runtime.runCommands([selection], { signal })
  expect(await runtime.runEntityBehavior(definition, 'e3606', 'trigger', { signal })).toBe(true)
  const moves = () =>
    effects.flatMap((command) =>
      command.kind === 'ride' || command.kind === 'moveParty' ? [command.to] : [],
    )
  expect(moves()).toEqual([
    { col: 113, row: 82, height: 0 },
    { col: 114, row: 82, height: 0 },
  ])

  const store = new MemorySaveStore({ kind: 'project', projectId: manifest.id })
  const payload = buildCurrentSavePayload(
    world,
    { sceneId: definition.id, pos: definition.entry.pos, facing: 'down' },
    manifest.id,
  )
  await store.putSlot(
    buildMeta('m01', world, definition.id, (member) => member.id, 1),
    payload,
    new Blob(),
  )
  const saved = await store.getPayload('m01')
  if (!saved) throw new Error('missing saved reed crossing')
  const restored = normalizeCurrentSave(
    saved,
    await preflightCurrentSave({ manifest, payload: saved }),
    references,
  )
  runtime = runtimeFor({
    ...restored.world,
    script: restored.world.script ?? emptyWorldScriptState(),
  })
  effects.length = 0
  expect(await runtime.runEntityBehavior(definition, 'e3606', 'trigger', { signal })).toBe(true)
  expect(moves()).toEqual([
    { col: 99, row: 82, height: 0 },
    { col: 99, row: 81, height: 0 },
  ])
  effects.length = 0
  expect(await runtime.runEntityBehavior(definition, 'e3606', 'trigger', { signal })).toBe(true)
  expect(moves()).toEqual([
    { col: 113, row: 82, height: 0 },
    { col: 114, row: 82, height: 0 },
  ])
})

test.each([
  false,
  true,
])('the reed setup initialNear=%s checks distance before waiting and prepares only at its marker', async (initialNear) => {
  const definition = scene('s213')
  const raft = definition.entities.find((entity) => entity.id === 'e3606')
  const marker = definition.entities.find((entity) => entity.id === 'e3607')
  if (!raft || !marker) throw new Error('missing live raft and placement marker')
  let raftPosition = { ...raft.pos }
  const markerPosition = { ...marker.pos }
  expect(
    Math.max(
      Math.abs(raftPosition.col - markerPosition.col),
      Math.abs(raftPosition.row - markerPosition.row),
    ),
  ).toBeGreaterThan(0.5)
  if (initialNear) raftPosition = { ...markerPosition }
  const world = { ...makeTestWorld(), script: emptyWorldScriptState() }
  let time = 0
  const checks: { at: number; near: boolean }[] = []
  const mutations: { at: number; command: RuntimeCommand }[] = []
  const signal = new AbortController().signal
  const advance = (milliseconds: number) => {
    time += milliseconds
    if (!initialNear && time === 300) raftPosition = { ...markerPosition }
  }
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'a'.repeat(64), {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([definition]),
    currentSceneId: () => definition.id,
    currentSceneSessionId: () => 'placed-reed',
    scene: () => definition,
    executeEffect(command) {
      if (command.kind === 'wait') advance(command.ms)
    },
    worldChanged(command) {
      mutations.push({ at: time, command })
    },
    gameplayNow: () => time,
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 0,
      inParty: () => false,
      entityInScene: () => true,
      facingEntity: () => true,
      entitiesNear(from, to, range) {
        const valid =
          from.scene === definition.id &&
          to.scene === definition.id &&
          from.entity === raft.id &&
          to.entity === marker.id
        const near =
          valid &&
          Math.max(
            Math.abs(raftPosition.col - markerPosition.col),
            Math.abs(raftPosition.row - markerPosition.row),
          ) < range
        checks.push({ at: time, near })
        return near
      },
    },
    wait: async (milliseconds) => advance(milliseconds),
    waitWorldTick: async () => {
      time += 100
    },
    yieldMacroTask: async () => {},
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
  })
  expect(await runtime.runEntityBehavior(definition, raft.id, 'auto', { signal })).toBe(true)
  const ready = initialNear ? 0 : 300
  expect(checks[0]?.at).toBe(0)
  if (!initialNear) expect(checks.some((row) => row.at < 300 && !row.near)).toBe(true)
  expect(checks.find((row) => row.near)?.at).toBe(ready)
  const setup = mutations.filter((row) =>
    ['setEntityState', 'setEntityTriggerActivation', 'selectEntityBehavior'].includes(
      row.command.kind,
    ),
  )
  expect(setup.map((row) => row.at)).toEqual([ready + 100, ready + 200, ready + 300, ready + 400])
  expect(world.script.entityState.s213?.e3607).toBe(0)
  expect(world.script.behaviors.entities?.s213?.e3606?.trigger?.selection).toEqual({
    kind: 'use',
    value: 'legacy-001',
  })
  expect(await runtime.runEntityBehavior(definition, raft.id, 'auto', { signal })).toBe(false)
})
