// @vitest-environment jsdom
import type { AuthorCommand, AuthorSceneDef, Facing, SpriteDef } from '@type-pal/content'
import { validateAuthorScenes, validateSprites } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import marketJson from '../../../projects/pal/content/scenes/s005.json' with { type: 'json' }
import islandJson from '../../../projects/pal/content/scenes/s014.json' with { type: 'json' }
import spritesJson from '../../../projects/pal/content/sprites.json' with { type: 'json' }
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands, shellProject, shellScene } from './__tests__/runtime-shell/project.js'
import { advance, installShellHost, state } from './__tests__/runtime-shell/scenarios.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import { assertCurrentSaveStructure } from './save/current-structure.js'
import { IndexedDbSaveStore } from './save/store.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

const target = { scene: 'a', entity: 'target' }
const neighbor = { scene: 'a', entity: 'neighbor' }
const sprite: SpriteDef = {
  id: 'walker',
  label: 'Walker',
  asset: 'sprite',
  layout: { kind: 'static' },
  poses: {
    gesture: {
      label: 'Gesture',
      steps: [
        { frame: 2, durationMs: 600 },
        { frame: 3, durationMs: 600 },
      ],
    },
  },
}

function automatic(id: string, body: AuthorCommand[]): AuthorSceneDef['entities'][number] {
  return {
    id,
    sprite: 'walker',
    pos: { col: id === 'neighbor' ? 6 : 4, row: 4, height: 0 },
    facing: 'down',
    pages: [{ id: 'normal', label: 'Normal', auto: 'routine' }],
    initialPage: 'normal',
    behaviors: {
      auto: {
        routine: {
          label: 'Routine',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'one',
            stages: [{ id: 'one', body, next: { kind: 'complete' } }],
          },
        },
      },
    },
  }
}

async function boot(
  first: AuthorSceneDef,
  second?: AuthorSceneDef,
  observe?: () => Promise<void>,
  presentationSprite: SpriteDef = sprite,
) {
  host = await installShellHost()
  await observe?.()
  const fixture = await shellProject()
  fixture.files['content/scenes/a.json'] = first
  if (second) fixture.files['content/scenes/b.json'] = second
  fixture.files['content/sprites.json'] = [presentationSprite]
  const input = structuredClone(fixture.files)
  const project = await loadCurrentProjectFrom(fixture.source)
  await (await import('./main.js')).bootGame(project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  await host.frame(100)
  await drain()
  return { h: host, fixture, unchanged: () => expect(fixture.files).toEqual(input) }
}

const poseCommands: AuthorCommand[] = [
  { kind: 'faceEntityToParty', target },
  { kind: 'setEntityFacing', target, facing: 'left' },
  { kind: 'setEntityFrame', target, frame: 1 },
  { kind: 'animEntity', target },
  {
    kind: 'playEntityAction',
    target,
    sprite: 'walker',
    action: 'gesture',
    loop: true,
    wait: false,
  },
  { kind: 'stopEntityAction', target, reset: true },
]

test('take preserves the remaining automatic wait while the neighbor continues, then release resumes it', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 300 },
    { kind: 'takeEntity', target },
    { kind: 'wait', ms: 2000 },
    { kind: 'releaseEntity', target },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 1300 },
      { kind: 'setEntityFrame', target, frame: 1 },
      { kind: 'giveMoney', delta: 7 },
    ]),
    automatic('neighbor', [
      { kind: 'wait', ms: 500 },
      { kind: 'giveMoney', delta: 17 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const drawnFrame = vi.spyOn(WorldScenePresentation.prototype, 'setEntityFrame')
  await advance(h, () => state().world.money === 67)
  expect(state().script.running).toBe(true)
  expect(drawnFrame.mock.calls).toEqual([])
  await advance(h, () => !state().script.running)
  expect(state().world.money).toBe(76)
  expect(drawnFrame.mock.calls).toEqual([])
  for (let turn = 0; turn < 9; turn++) {
    await h.frame(100)
    await drain()
  }
  expect(state().world.money).toBe(76)
  expect(drawnFrame.mock.calls).toEqual([])
  await h.frame(100)
  await drain()
  expect(state().world.money).toBe(83)
  expect(drawnFrame.mock.calls).toEqual([['target', 1]])
  unchanged()
})

test('a taken automatic owner evaluates its branch only after release', async () => {
  const order: string[] = []
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    { kind: 'wait', ms: 500 },
    { kind: 'giveMoney', delta: 10 },
    { kind: 'releaseEntity', target },
  ])
  first.entities = [
    automatic('target', [
      {
        kind: 'branch',
        cond: { kind: 'hasMoney', atLeast: 60 },
        then: [{ kind: 'giveMoney', delta: 7 }],
        else: [{ kind: 'giveMoney', delta: 11 }],
      },
    ]),
  ]
  const { h, unchanged } = await boot(first, undefined, async () => {
    const { BaseProjectScriptRuntimeHost } = await import('./script-project-core.js')
    const { MotionRuntimeCoordinator } = await import('./motion-runtime-coordinator.js')
    const evaluate = BaseProjectScriptRuntimeHost.prototype.evalCondition
    vi.spyOn(BaseProjectScriptRuntimeHost.prototype, 'evalCondition').mockImplementation(function (
      this: InstanceType<typeof BaseProjectScriptRuntimeHost>,
      ...args
    ) {
      order.push('branch')
      return evaluate.apply(this, args)
    })
    const take = MotionRuntimeCoordinator.prototype.setAuthority
    vi.spyOn(MotionRuntimeCoordinator.prototype, 'setAuthority').mockImplementation(function (
      this: InstanceType<typeof MotionRuntimeCoordinator>,
      ...args
    ) {
      order.push(`take:${args[0]}`)
      return take.apply(this, args)
    })
    const release = MotionRuntimeCoordinator.prototype.releaseAuthority
    vi.spyOn(MotionRuntimeCoordinator.prototype, 'releaseAuthority').mockImplementation(function (
      this: InstanceType<typeof MotionRuntimeCoordinator>,
      ...args
    ) {
      order.push(`release:${args[0]}`)
      return release.apply(this, args)
    })
  })
  await advance(h, () => !state().script.running)
  expect(order).toEqual(['take:target', 'release:target', 'branch'])
  expect(state().world.money).toBe(67)
  unchanged()
})

test('automatic map IO ready during take commits neither canonical nor live map until release', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 300 },
    { kind: 'takeEntity', target },
    { kind: 'giveMoney', delta: 1 },
    { kind: 'wait', ms: 1000 },
    { kind: 'releaseEntity', target },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 200 },
      { kind: 'setSceneMapOverride', mapId: 'map-b' },
      { kind: 'giveMoney', delta: 7 },
    ]),
  ]
  const { h, fixture, unchanged } = await boot(first)
  const { ActiveScene } = await import('./active-scene.js')
  const replacement = vi.spyOn(ActiveScene.prototype, 'replaceMap')
  let started = false
  let release!: () => void
  const blocked = new Promise<void>((resolve) => {
    release = resolve
  })
  fixture.hooks.read = async (path) => {
    if (path !== 'content/maps/b.json') return
    started = true
    await blocked
  }
  try {
    await advance(h, () => state().world.money !== 50)
    expect({
      started,
      money: state().world.money,
      overrides: state().world.script?.mapOverride,
    }).toEqual({ started: true, money: 51, overrides: undefined })
    expect(replacement).not.toHaveBeenCalled()
    release()
    await drain()
    await h.settleIO()
    for (let turn = 0; turn < 5; turn++) {
      await h.frame(100)
      await drain()
    }
    expect(state().script.running).toBe(true)
    expect(state().world.script?.mapOverride?.a).toBeUndefined()
    expect(replacement).not.toHaveBeenCalled()
    expect(state().world.money).toBe(51)
    await advance(h, () => !state().script.running && state().world.money === 58)
    expect(state().world.script?.mapOverride?.a).toBe('map-b')
    expect(replacement).toHaveBeenCalledTimes(1)
    unchanged()
  } finally {
    release()
  }
})

test('debug scene teardown captures an unfinished automatic wait before clearing timers', async () => {
  const first = shellScene('a')
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 1300 },
      { kind: 'giveMoney', delta: 7 },
    ]),
  ]
  const { h, unchanged } = await boot(first, shellScene('b'))
  await h.frame(100)
  await h.frame(100)
  await key(h, ']', 1)
  await vi.waitFor(() => expect(state().sceneId).toBe('b'))
  await key(h, '[', 1)
  await vi.waitFor(() => expect(state().sceneId).toBe('a'))
  for (let turn = 0; turn < 5; turn++) {
    await h.frame(100)
    await drain()
  }
  expect(state().world.money).toBe(50)
  await advance(h, () => state().world.money === 57)
  unchanged()
})

test.each<AuthorCommand>([
  { kind: 'moveEntity', target, to: { col: 8, row: 4, height: 0 }, speed: 'normal' },
  {
    kind: 'playEntityAction',
    target,
    sprite: 'walker',
    action: 'gesture',
    loop: false,
    wait: true,
  },
])('taking an automatic caller pauses its in-flight $kind on a different target', async (command) => {
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 400 },
    { kind: 'takeEntity', target: { scene: 'a', entity: 'caller' } },
    { kind: 'giveMoney', delta: 1 },
    { kind: 'wait', ms: 1000 },
    { kind: 'releaseEntity', target: { scene: 'a', entity: 'caller' } },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [
    { id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 }, facing: 'down' },
    automatic('caller', [command, { kind: 'giveMoney', delta: 7 }]),
    automatic('neighbor', [
      { kind: 'wait', ms: 700 },
      { kind: 'giveMoney', delta: 17 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  const { EntityActionPlayer } = await import('./entity-action-player.js')
  const actions = vi.spyOn(EntityActionPlayer.prototype, 'advance')
  await advance(h, () => state().world.money === 51)
  const player = actions.mock.contexts.find((value) => value instanceof EntityActionPlayer)
  if (!(player instanceof EntityActionPlayer)) throw new Error('actual action player missing')
  const snapshot = () => ({
    pos: structuredClone(state().entities.find((entity) => entity.id === 'target')?.pos),
    actions: player.capture(),
  })
  const held = snapshot()
  if (command.kind === 'moveEntity') expect(held.pos?.col).toBeGreaterThan(4)
  else
    expect(
      held.actions.find((track) => track.entity === 'target')?.override?.elapsedInStepMs,
    ).toBeGreaterThan(0)
  for (let turn = 0; turn < 9; turn++) {
    await h.frame(100)
    await drain()
    expect(snapshot()).toEqual(held)
  }
  expect(state().world.money).toBe(68)
  await advance(h, () => !state().script.running && state().world.money === 84)
  if (command.kind === 'moveEntity') expect(snapshot().pos).toEqual(command.to)
  unchanged()
})

test.each<{ col: number; row: number; facing: Facing }>([
  { col: 8, row: 7, facing: 'up' },
  { col: 8, row: 9, facing: 'down' },
  { col: 7, row: 8, facing: 'left' },
  { col: 9, row: 8, facing: 'right' },
  { col: 8, row: 8, facing: 'left' },
  { col: 7, row: 7, facing: 'left' },
  { col: 9, row: 9, facing: 'down' },
  { col: 9, row: 7, facing: 'up' },
  { col: 7, row: 9, facing: 'left' },
])('faceEntityToParty uses live positions and preserves pose at $col/$row', async ({
  col,
  row,
  facing,
}) => {
  const first = sceneWithCommands('a', [
    { kind: 'setEntityPos', target, pos: { col: 8, row: 8, height: 4 } },
    { kind: 'setEntityFacing', target, facing: 'left' },
    { kind: 'setEntityFrame', target, frame: 1 },
    { kind: 'teleportParty', pos: { col, row, height: 0 }, facing: 'left' },
    { kind: 'faceEntityToParty', target },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [
    { id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 }, facing: 'down' },
  ]
  const { h, unchanged } = await boot(first)
  await advance(h, () => !state().script.running && state().world.money === 59)
  expect(state().entities.find((entity) => entity.id === 'target')).toMatchObject({
    pos: { col: 8, row: 8, height: 4 },
    facing,
  })
  unchanged()
})

test.each(
  poseCommands,
)('automatic $kind waits for the actual target owner, including a different automatic caller', async (command) => {
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    { kind: 'wait', ms: 1200 },
    { kind: 'releaseEntity', target },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 300 },
      { kind: 'giveMoney', delta: 7 },
      command,
      { kind: 'giveMoney', delta: 11 },
    ]),
    automatic('caller', [{ kind: 'wait', ms: 300 }, command, { kind: 'giveMoney', delta: 13 }]),
    automatic('neighbor', [
      { kind: 'wait', ms: 300 },
      { kind: 'setEntityFacing', target: neighbor, facing: 'up' },
      { kind: 'giveMoney', delta: 17 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  await advance(h, () => state().world.money === 67)
  for (let turn = 0; turn < 3; turn++) {
    await h.frame(100)
    await drain()
  }
  expect(state().script.running).toBe(true)
  expect(state().world.money).toBe(67)
  expect(state().entities.find((entity) => entity.id === 'neighbor')?.facing).toBe('up')
  expect(state().world.script?.behaviors.entities?.a?.target?.auto?.cursor?.resume?.frames).toEqual(
    [{ index: 0 }],
  )
  expect(state().world.script?.behaviors.entities?.a?.caller?.auto?.cursor?.resume?.frames).toEqual(
    [{ index: 1 }],
  )
  await key(h, 'F5')
  expect(state().renderDebug.menuActive).toBe(false)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  expect(await store.getPayload('quick')).toBeNull()
  await advance(h, () => !state().script.running && state().world.money === 107)
  expect(state().world.script?.behaviors.entities?.a?.target?.auto?.cursor?.at).toEqual({
    kind: 'completed',
  })
  expect(state().world.script?.behaviors.entities?.a?.caller?.auto?.cursor?.at).toEqual({
    kind: 'completed',
  })
  await key(h, 'F5')
  await advance(h, () => !state().script.running, 1)
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  const saved = await store.getPayload('quick')
  expect(saved?.version).toBe(12)
  expect(saved?.world.money).toBe(107)
  await key(h, 'F9')
  for (let turn = 0; turn < 8; turn++) {
    await h.frame(100)
    await drain()
    await h.settleIO()
  }
  expect(state().world.money).toBe(107)
  unchanged()
})

test('an already playing automatic action keeps its exact phase while its target is held and resumes after release', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 400 },
    { kind: 'takeEntity', target },
    { kind: 'giveMoney', delta: 9 },
    { kind: 'wait', ms: 1000 },
    { kind: 'releaseEntity', target },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 100 },
      {
        kind: 'playEntityAction',
        target,
        sprite: 'walker',
        action: 'gesture',
        loop: false,
        wait: true,
      },
      { kind: 'giveMoney', delta: 7 },
    ]),
    automatic('neighbor', [
      { kind: 'wait', ms: 700 },
      { kind: 'giveMoney', delta: 11 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  const { EntityActionPlayer } = await import('./entity-action-player.js')
  const actionFrame = vi.spyOn(EntityActionPlayer.prototype, 'frame')
  const targetFrames = () =>
    actionFrame.mock.calls.flatMap((args, index) =>
      args[0] === 'target' ? [actionFrame.mock.results[index]?.value] : [],
    )
  await advance(h, () => state().world.money === 59)
  await h.frame(100)
  await drain()
  const frameAtTake = targetFrames().at(-1)
  expect(frameAtTake).toBe(2)
  for (let turn = 0; turn < 7; turn++) {
    await h.frame(100)
    await drain()
  }
  expect(state().script.running).toBe(true)
  expect(state().world.money).toBe(70)
  expect(targetFrames().at(-1)).toBe(frameAtTake)
  await advance(h, () => !state().script.running && state().world.money === 77)
  unchanged()
})

test('taking an automatic walk draws idle while retaining the phase for release without moving while held', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 900 },
    { kind: 'takeEntity', target },
    { kind: 'giveMoney', delta: 9 },
    { kind: 'wait', ms: 1000 },
    { kind: 'releaseEntity', target },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 300 },
      { kind: 'moveEntity', target, to: { col: 7, row: 4, height: 0 }, speed: 'slow' },
    ]),
  ]
  const { h, unchanged } = await boot(first, undefined, undefined, {
    ...sprite,
    layout: { kind: 'directional', framesPerDir: 2 },
  })
  const { WorldMotionRuntime } = await import('./world-motion-runtime.js')
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const marks = vi.spyOn(WorldMotionRuntime.prototype, 'markGait')
  const rendered = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  const currentPresentation = () => {
    const value = rendered.mock.contexts.at(-1)
    if (!(value instanceof WorldScenePresentation))
      throw new Error('actual world presentation was never used')
    return value
  }
  const targetMarks = () => marks.mock.calls.filter(([id]) => id === 'target').length
  await advance(h, () => state().world.money === 59)
  const motion = marks.mock.contexts.find((value) => value instanceof WorldMotionRuntime)
  if (!(motion instanceof WorldMotionRuntime)) throw new Error('actual gait owner was never used')
  const phaseAtTake = targetMarks(),
    posAtTake = structuredClone(state().entities.find((entity) => entity.id === 'target')?.pos)
  expect(phaseAtTake).toBeGreaterThanOrEqual(2)
  expect(motion.gaitPhase('target')).toBe(phaseAtTake)
  // User choice (2026-10-10): pause in idle, retaining the phase only for resuming the walk.
  // This legal directional resource makes idle observably different from the retained step.
  const retainedFrame = 6 + (phaseAtTake % 2)
  expect(retainedFrame).not.toBe(6)
  const expectedFrame = 6
  expect(currentPresentation().renderedEntityFrame('target')).toBe(expectedFrame)
  for (let turn = 0; turn < 6; turn++) {
    await h.frame(100)
    await drain()
    expect(state().entities.find((entity) => entity.id === 'target')?.pos).toEqual(posAtTake)
    expect(targetMarks()).toBe(phaseAtTake)
    expect(motion.gaitPhase('target')).toBe(phaseAtTake)
    expect(currentPresentation().renderedEntityFrame('target')).toBe(expectedFrame)
  }
  // Valid rejected-candidate counter: expose the retained gait in the actual paused input,
  // keeping the actor, resource, position and phase; that wrongly draws a stepping pose.
  const presentation = currentPresentation()
  const input = rendered.mock.calls.at(-1)?.[0]
  if (!presentation || !input) throw new Error('actual world presentation was never used')
  const present = WorldScenePresentation.prototype.sprites
  present.call(presentation, {
    ...input,
    entityGait: (id) => (id === 'target' ? motion.gaitPhase(id) : input.entityGait(id)),
  })
  expect(presentation.renderedEntityFrame('target')).toBe(retainedFrame)
  expect(() => expect(presentation.renderedEntityFrame('target')).toBe(expectedFrame)).toThrow()
  present.call(presentation, input)
  expect(presentation.renderedEntityFrame('target')).toBe(expectedFrame)
  await advance(h, () => targetMarks() > phaseAtTake)
  expect(motion.gaitPhase('target')).toBe(phaseAtTake + 1)
  await advance(h, () => state().entities.find((entity) => entity.id === 'target')?.pos.col === 7)
  expect(state().entities.find((entity) => entity.id === 'target')?.pos).toEqual({
    col: 7,
    row: 4,
    height: 0,
  })
  expect(motion.hasGait('target')).toBe(false)
  unchanged()
})

test('a foreground waypoint counts its arrival step before handing the retained walk back to auto', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 900 },
    { kind: 'takeEntity', target },
    { kind: 'moveEntity', target, to: { col: 4, row: 8.125, height: 0 }, speed: 'normal' },
    { kind: 'giveMoney', delta: 9 },
    { kind: 'wait', ms: 1000 },
    { kind: 'releaseEntity', target },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 300 },
      { kind: 'moveEntity', target, to: { col: 4, row: 12, height: 0 }, speed: 'normal' },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  const { WorldMotionRuntime } = await import('./world-motion-runtime.js')
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const marks = vi.spyOn(WorldMotionRuntime.prototype, 'markGait')
  const rendered = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  await advance(h, () => state().world.money === 59)
  const motion = marks.mock.contexts.find((value) => value instanceof WorldMotionRuntime)
  if (!(motion instanceof WorldMotionRuntime)) throw new Error('actual gait owner was never used')
  // This is the execution-state contract; PAL's separate draw trace remains the frame oracle.
  // Eleven actual 3/8-cell steps include the foreground endpoint, not just the ten transit steps.
  expect(state().entities.find((entity) => entity.id === 'target')?.pos).toEqual({
    col: 4,
    row: 8.125,
    height: 0,
  })
  expect(motion.gaitPhase('target')).toBe(11)
  const resumedOwner = motion.coordinator.autoSlots.get('target')
  expect(resumedOwner?.kind).toBe('move')
  expect(motion.gaitOwner('target')).toEqual({ source: 'auto', epoch: resumedOwner?.commandEpoch })
  for (let tick = 0; tick < 5; tick++) {
    await h.frame(100)
    await drain()
    expect(motion.gaitPhase('target')).toBe(11)
    expect(state().entities.find((entity) => entity.id === 'target')?.pos.row).toBe(8.125)
    expect(rendered.mock.calls.at(-1)?.[0].entityGait('target')).toBeUndefined()
  }
  await advance(h, () => state().entities.find((entity) => entity.id === 'target')?.pos.row === 8.5)
  expect(motion.gaitPhase('target')).toBe(12)
  expect(motion.coordinator.autoSlots.get('target')).toBe(resumedOwner)
  await advance(h, () => state().entities.find((entity) => entity.id === 'target')?.pos.row === 12)
  expect(motion.hasGait('target')).toBe(false)
  unchanged()
})

test.each([
  'no-auto',
  'cancelled-auto',
  'final-destination',
  'zero-distance',
] as const)('a foreground endpoint does not retain a walk for %s', async (mode) => {
  const endpoint = { col: 4, row: mode === 'zero-distance' ? 4 : 8.125, height: 0 }
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 900 },
    { kind: 'takeEntity', target },
    ...(mode === 'cancelled-auto'
      ? [
          {
            kind: 'selectEntityBehavior' as const,
            target,
            channel: 'auto' as const,
            selection: { kind: 'disabled' as const },
          },
        ]
      : []),
    { kind: 'moveEntity', target, to: endpoint, speed: 'normal' },
    { kind: 'giveMoney', delta: 9 },
    { kind: 'wait', ms: 1000 },
    { kind: 'releaseEntity', target },
    { kind: 'giveMoney', delta: 1 },
  ])
  first.entities = [
    mode === 'no-auto' || mode === 'zero-distance'
      ? { id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 } }
      : automatic('target', [
          { kind: 'wait', ms: 300 },
          {
            kind: 'moveEntity',
            target,
            to: { col: 4, row: mode === 'final-destination' ? endpoint.row : 12, height: 0 },
            speed: 'normal',
          },
        ]),
  ]
  const { h, unchanged } = await boot(first)
  const { WorldMotionRuntime } = await import('./world-motion-runtime.js')
  const registrations = vi.spyOn(WorldMotionRuntime.prototype, 'registerMove')
  await advance(h, () => state().world.money === 59)
  const motion = registrations.mock.contexts.find((value) => value instanceof WorldMotionRuntime)
  if (!(motion instanceof WorldMotionRuntime)) throw new Error('actual move was not registered')
  expect(state().entities.find((entity) => entity.id === 'target')?.pos).toEqual(endpoint)
  expect(motion.hasGait('target')).toBe(false)
  await advance(h, () => state().world.money === 60)
  for (let tick = 0; tick < 5; tick++) {
    await h.frame(100)
    await drain()
    await h.settleIO()
  }
  expect(state().entities.find((entity) => entity.id === 'target')?.pos).toEqual(endpoint)
  expect(motion.hasGait('target')).toBe(false)
  expect(motion.coordinator.autoSlots.has('target')).toBe(false)
  unchanged()
})

test.each([
  'target',
  'owner',
] as const)('a foreground waypoint stays standing when the retained auto %s is suspended', async (suspended) => {
  const owner = suspended === 'owner' ? neighbor : target
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 900 },
    { kind: 'takeEntity', target },
    { kind: 'suspendEntity', target: owner, ticks: 1000 },
    { kind: 'moveEntity', target, to: { col: 4, row: 8.125, height: 0 }, speed: 'normal' },
    { kind: 'releaseEntity', target },
    { kind: 'giveMoney', delta: 9 },
    { kind: 'wait', ms: 1000 },
  ])
  first.entities = [
    ...(suspended === 'owner'
      ? [{ id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 } }]
      : []),
    automatic(owner.entity, [
      { kind: 'wait', ms: 300 },
      { kind: 'moveEntity', target, to: { col: 4, row: 12, height: 0 }, speed: 'normal' },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  const { WorldMotionRuntime } = await import('./world-motion-runtime.js')
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const registrations = vi.spyOn(WorldMotionRuntime.prototype, 'registerMove')
  const rendered = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  await advance(h, () => state().world.money === 59)
  const motion = registrations.mock.contexts.find((value) => value instanceof WorldMotionRuntime)
  if (!(motion instanceof WorldMotionRuntime)) throw new Error('actual move was not registered')
  expect(motion.coordinator.autoSlots.get('target')).toMatchObject({
    activationOwnerId: owner.entity,
    to: { col: 4, row: 12, height: 0 },
  })
  for (let tick = 0; tick < 5; tick++) {
    await h.frame(100)
    await drain()
    expect(state().entities.find((entity) => entity.id === 'target')?.pos.row).toBe(8.125)
    expect(rendered.mock.calls.at(-1)?.[0].entityGait('target')).toBeUndefined()
    expect(motion.hasGait('target')).toBe(false)
  }
  unchanged()
})

test('a taken target pauses only its automatic page action while another page continues', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    { kind: 'wait', ms: 1400 },
    { kind: 'releaseEntity', target },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [target, neighbor].map((address) => ({
    id: address.entity,
    sprite: 'walker',
    pos: { col: address.entity === 'target' ? 4 : 6, row: 4, height: 0 },
    pages: [
      {
        id: 'normal',
        label: 'Normal',
        animation: { sprite: 'walker', action: 'gesture', loop: true },
      },
    ],
    initialPage: 'normal',
  }))
  const { h, unchanged } = await boot(first)
  const { EntityActionPlayer } = await import('./entity-action-player.js')
  const frames = vi.spyOn(EntityActionPlayer.prototype, 'frame')
  for (let turn = 0; turn < 7; turn++) {
    await h.frame(100)
    await drain()
  }
  const lastFrame = (id: string) =>
    frames.mock.calls
      .flatMap((args, index) => (args[0] === id ? [frames.mock.results[index]?.value] : []))
      .at(-1)
  expect(state().script.running).toBe(true)
  expect(lastFrame('target')).toBe(2)
  expect(lastFrame('neighbor')).toBe(3)
  await advance(h, () => state().world.money === 59)
  for (let turn = 0; turn < 6; turn++) {
    await h.frame(100)
    await drain()
  }
  expect(lastFrame('target')).toBe(3)
  unchanged()
})

test('canonical island dialogue leaves its ambient boat animation running; an added hold freezes it', async () => {
  const island = validateAuthorScenes([islandJson])[0]
  const boat = island?.entities.find((entity) => entity.id === 'e203')
  const entry = island?.hooks?.onEnter?.variants.default?.flow
  if (!boat || !('sprite' in boat) || entry?.kind !== 'stages')
    throw new Error('canonical island entry/page missing')
  const boatSprite = validateSprites(spritesJson).find((value) => value.id === boat.sprite)
  if (!boatSprite) throw new Error('canonical island boat sprite missing')
  const stage = entry.stages.find((value) => value.id === entry.initial)
  if (!stage) throw new Error('canonical island entry stage missing')
  const lastFrames = async (addHold: boolean) => {
    // Keep the canonical page/action and entry choreography. Only unrelated map/music/portrait IO
    // and fixture addresses/text are adapted; the real bootGame/dialogue/action owners execute.
    const body = stage.body.flatMap((command): AuthorCommand[] => {
      if (command.kind === 'takeEntity' || command.kind === 'releaseEntity') {
        expect(command.target).toEqual({ scene: 's014', entity: 'e203' })
        return [{ ...command, target }]
      }
      if (command.kind === 'dialog')
        return [
          {
            ...command,
            cue: {
              ...command.cue,
              identity: { kind: 'unbound', speaker: 'name.hero' },
              rows: command.cue.rows.map(() => ({ text: 'line.one' })),
            },
          },
        ]
      return command.kind === 'clearDialog' || command.kind === 'setPartyFacing' ? [command] : []
    })
    if (addHold) {
      body.unshift({ kind: 'takeEntity', target })
      body.push({ kind: 'releaseEntity', target })
    }
    const first = sceneWithCommands('a', body)
    first.entities = [target, neighbor].map((address) => ({
      ...boat,
      id: address.entity,
      sprite: 'walker',
      pos: { col: address.entity === 'target' ? 4 : 6, row: 4, height: 0 },
      pages: boat.pages?.map((page) => ({
        ...page,
        animation: page.animation && { ...page.animation, sprite: 'walker' },
      })),
    }))
    const { h, unchanged } = await boot(first, undefined, undefined, {
      ...boatSprite,
      id: 'walker',
      asset: 'sprite',
    })
    const { WorldScenePresentation } = await import('./world-scene-presentation.js')
    const present = WorldScenePresentation.prototype.sprites
    const draws: Record<string, number | undefined>[] = []
    const rendered = vi
      .spyOn(WorldScenePresentation.prototype, 'sprites')
      .mockImplementation(function (this: InstanceType<typeof WorldScenePresentation>, input) {
        const selected = present.call(this, input)
        draws.push({
          target: this.renderedEntityFrame('target'),
          neighbor: this.renderedEntityFrame('neighbor'),
        })
        return selected
      })
    for (let turn = 0; turn < 18; turn++) {
      await h.frame(100)
      await drain()
    }
    expect(state().dialogue).toBe(true)
    const frames = (id: string) => draws.map((draw) => draw[id])
    const heldFrames = frames('target')
    expect(frames('neighbor')).toContain(1)
    for (let confirm = 0; confirm < 8; confirm++) await key(h, 'Enter')
    expect(state().script.running).toBe(false)
    draws.length = 0
    for (let turn = 0; turn < 15; turn++) {
      await h.frame(100)
      await drain()
    }
    expect(frames('target')).toContain(1)
    unchanged()
    rendered.mockRestore()
    h.close()
    host = undefined
    return heldFrames
  }
  const positive = await lastFrames(false)
  expect(positive.length).toBeGreaterThan(0)
  expect(positive).toContain(1)
  const counter = await lastFrames(true)
  expect(new Set(counter)).toEqual(new Set([0]))
  expect(() => expect(counter).toContain(1)).toThrow()
})

test('a scene without an entry starts its automatic behavior when its declared fade finishes', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 300 },
    { kind: 'loadScene', scene: 'b' },
  ])
  const second = shellScene('b')
  second.entities = [automatic('target', [{ kind: 'giveMoney', delta: 9 }])]
  let targetFadeCompleted = false
  const { h, unchanged } = await boot(first, second, async () => {
    const { SupersedingFadeDriver } = await import('./fade-driver.js')
    const begin = SupersedingFadeDriver.prototype.begin
    vi.spyOn(SupersedingFadeDriver.prototype, 'begin').mockImplementation(function (
      this: InstanceType<typeof SupersedingFadeDriver>,
      ...args
    ) {
      const result = begin.apply(this, args)
      const exposed: unknown = Reflect.get(window, '__reforge')
      if (
        args[0] === 0 &&
        exposed &&
        typeof exposed === 'object' &&
        'sceneId' in exposed &&
        exposed.sceneId === 'b'
      ) {
        expect(args[2]).toBe(260)
        void result.then(() => {
          targetFadeCompleted = true
        })
      }
      return result
    })
  })
  for (let tick = 0; tick < 30 && !targetFadeCompleted; tick++) {
    expect(state().world.money).toBe(50)
    await h.frame(100)
    await drain()
  }
  expect(targetFadeCompleted).toBe(true)
  expect(state().sceneId).toBe('b')
  expect(state().world.money).toBe(59)
  unchanged()
})

test('a mounted ride preserves the carrier facing through every move; a normal move still turns it', async () => {
  for (const kind of ['ride', 'moveEntity'] as const) {
    const first = sceneWithCommands('a', [
      { kind: 'setPartyFacing', facing: 'up' },
      { kind: 'mountParty', target, dx: 1, dy: 2 },
      { kind, target, to: { col: 4, row: 1, height: 0 }, speed: 'normal' },
      { kind: 'giveMoney', delta: 9 },
    ])
    first.entities = [
      { id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 }, facing: 'left' },
    ]
    const { h, unchanged } = await boot(first)
    const observed: string[] = []
    await advance(h, () => {
      const carrier = state().entities.find((entity) => entity.id === 'target')
      if (carrier?.pos.row !== 4 && carrier?.facing) observed.push(carrier.facing)
      return state().world.money === 59
    })
    expect(state().entities.find((entity) => entity.id === 'target')?.pos).toEqual({
      col: 4,
      row: 1,
      height: 0,
    })
    expect(observed.length).toBeGreaterThan(1)
    expect(new Set(observed)).toEqual(new Set([kind === 'ride' ? 'left' : 'up']))
    unchanged()
    h.close()
    host = undefined
  }
})

test('canonical boarding steps advance one continuous phase through their authored waits and settle when released', async () => {
  const market = validateAuthorScenes([marketJson])[0]
  const entry = market?.entities.find((entity) => entity.id === 'e123')?.behaviors?.trigger?.[
    'legacy-002'
  ]?.flow
  if (entry?.kind !== 'stages') throw new Error('canonical boarding counsel missing')
  const stage = entry.stages.find((value) => value.id === entry.initial)
  if (!stage) throw new Error('canonical boarding counsel stage missing')
  const walks = stage.body.filter((command) => command.kind === 'repeat')
  expect(walks.map((walk) => walk.count)).toEqual([4, 4])
  const body: AuthorCommand[] = [
    { kind: 'wait', ms: 200 },
    { kind: 'setEntityFrame', target, frame: 0 },
    ...walks.map((walk) => ({
      ...walk,
      body: walk.body.map((command) => {
        if (command.kind === 'stepEntity') return { ...command, target }
        if (command.kind === 'wait' || command.kind === 'clearDialog') return command
        throw new Error('unclassified canonical boarding step effect')
      }),
    })),
    { kind: 'wait', ms: 300 },
    { kind: 'giveMoney', delta: 9 },
  ]
  const first = sceneWithCommands('a', body)
  first.entities = [{ id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 } }]
  const draws: {
    col: number
    row: number
    frame: number | undefined
    phase: number | undefined
  }[] = []
  const { h, unchanged } = await boot(
    first,
    undefined,
    async () => {
      const { WorldScenePresentation } = await import('./world-scene-presentation.js')
      const present = WorldScenePresentation.prototype.sprites
      vi.spyOn(WorldScenePresentation.prototype, 'sprites').mockImplementation(function (
        this: InstanceType<typeof WorldScenePresentation>,
        input,
      ) {
        const rendered = present.call(this, input)
        const entity = input.entities.find((value) => value.id === 'target')
        if (entity)
          draws.push({
            col: entity.pos.col,
            row: entity.pos.row,
            frame: this.renderedEntityFrame('target'),
            phase: input.entityGait('target'),
          })
        return rendered
      })
    },
    // Eight legal frames in the shell asset; phase, independent of layout, must reach 1..8.
    { ...sprite, layout: { kind: 'directional', framesPerDir: 2 } },
  )
  await advance(h, () => state().world.money === 59)
  for (let step = 1; step <= 8; step++) {
    const at = draws.filter(
      (draw) =>
        draw.col === 4 + Math.min(step, 4) * 0.25 &&
        draw.row === 4 + Math.max(step - 4, 0) * 0.25 &&
        draw.phase !== undefined,
    )
    expect(at.length, JSON.stringify({ step, draws })).toBeGreaterThan(0)
    expect(new Set(at.map((draw) => draw.phase))).toEqual(new Set([step]))
    expect(new Set(at.map((draw) => draw.frame))).toEqual(
      new Set([(step <= 4 ? 6 : 0) + (step % 2)]),
    )
  }
  await h.frame(100)
  await drain()
  expect(draws.at(-1)?.phase).toBeUndefined()
  unchanged()
})

test('canonical boat boarding never moves the rower away from its source position before the carrier starts', async () => {
  const market = validateAuthorScenes([marketJson])[0]
  const entry = market?.entities.find((entity) => entity.id === 'e116')?.behaviors?.trigger?.[
    'legacy-001'
  ]?.flow
  if (entry?.kind !== 'stages') throw new Error('canonical boat boarding missing')
  const stage = entry.stages.find((value) => value.id === entry.initial)
  if (!stage) throw new Error('canonical boat boarding stage missing')
  const rowerAuto = market?.entities.find((entity) => entity.id === 'e117')?.behaviors?.auto?.[
    'legacy-001'
  ]?.flow
  if (rowerAuto?.kind !== 'stages') throw new Error('canonical rower automatic flow missing')
  const remapRower = (command: AuthorCommand): AuthorCommand => {
    if (command.kind === 'loop' || command.kind === 'repeat')
      return { ...command, body: command.body.map(remapRower) }
    if ('target' in command) return { ...command, target: neighbor }
    return command
  }
  const body: AuthorCommand[] = [
    { kind: 'wait', ms: 200 },
    ...stage.body.flatMap((command): AuthorCommand[] => {
      if (command.kind === 'takeEntity') return [remapRower(command)]
      if (command.kind === 'selectEntityBehavior') return [remapRower(command)]
      if (command.kind === 'mountParty')
        return [
          {
            ...command,
            target,
            riders: command.riders?.map((rider) => ({ ...rider, target: neighbor })),
          },
        ]
      if (command.kind === 'ride')
        return [
          {
            ...command,
            target,
            to: { col: command.to.col - 122, row: command.to.row - 48, height: 0 },
          },
        ]
      return []
    }),
    { kind: 'giveMoney', delta: 9 },
  ]
  const first = sceneWithCommands('a', body)
  first.entities = [
    { id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 }, facing: 'down' },
    {
      id: 'neighbor',
      sprite: 'walker',
      pos: { col: 2, row: 6, height: 0 },
      facing: 'up',
      behaviors: {
        auto: {
          'legacy-001': {
            label: 'Canonical rower',
            order: 0,
            flow: {
              ...rowerAuto,
              stages: rowerAuto.stages.map((stage) => ({
                ...stage,
                body: stage.body.map(remapRower),
              })),
            },
          },
        },
      },
    },
  ]
  const draws: { boat: number; rower: number }[] = []
  const { h, unchanged } = await boot(first, undefined, async () => {
    const { WorldScenePresentation } = await import('./world-scene-presentation.js')
    const present = WorldScenePresentation.prototype.sprites
    vi.spyOn(WorldScenePresentation.prototype, 'sprites').mockImplementation(function (
      this: InstanceType<typeof WorldScenePresentation>,
      input,
    ) {
      const rendered = present.call(this, input)
      const boat = input.entities.find((value) => value.id === 'target')
      const rower = input.entities.find((value) => value.id === 'neighbor')
      if (boat && rower) draws.push({ boat: boat.pos.row, rower: rower.pos.row })
      return rendered
    })
  })
  await advance(h, () => state().world.money === 59, 110)
  expect(draws.length).toBeGreaterThan(1)
  expect(draws.filter((draw) => draw.boat === 4).map((draw) => draw.rower)).toEqual(
    draws.filter((draw) => draw.boat === 4).map(() => 6),
  )
  for (let index = 1; index < draws.length; index++)
    expect(draws[index]?.rower).toBeLessThanOrEqual(draws[index - 1]?.rower ?? 6)
  expect(state().entities.find((entity) => entity.id === 'neighbor')?.pos).toEqual({
    col: 2,
    row: -11.75,
    height: 0,
  })
  unchanged()
})

test('a foreground awaited action still finishes on a target it has explicitly taken', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    {
      kind: 'playEntityAction',
      target,
      sprite: 'walker',
      action: 'gesture',
      loop: false,
      wait: true,
    },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [{ id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 } }]
  const { h, unchanged } = await boot(first)
  await advance(h, () => !state().script.running && state().world.money === 59)
  unchanged()
})

test('switching the automatic binding while a pose waits invalidates the old owner and never writes its old frame or reward', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    { kind: 'wait', ms: 500 },
    {
      kind: 'selectEntityBehavior',
      target,
      channel: 'auto',
      selection: { kind: 'use', value: 'new' },
    },
    { kind: 'wait', ms: 500 },
    { kind: 'releaseEntity', target },
    { kind: 'giveMoney', delta: 9 },
  ])
  const entity = automatic('target', [
    { kind: 'giveMoney', delta: 7 },
    { kind: 'setEntityFrame', target, frame: 1 },
    { kind: 'giveMoney', delta: 11 },
  ])
  if (!entity.behaviors?.auto) throw new Error('fixture automatic behavior missing')
  entity.behaviors.auto.new = {
    label: 'New pose',
    order: 1,
    flow: {
      kind: 'stages',
      initial: 'new',
      stages: [
        {
          id: 'new',
          body: [
            { kind: 'setEntityFrame', target, frame: 4 },
            { kind: 'giveMoney', delta: 19 },
          ],
          next: { kind: 'complete' },
        },
      ],
    },
  }
  first.entities = [entity]
  const { h, unchanged } = await boot(first)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const frames = vi.spyOn(WorldScenePresentation.prototype, 'setEntityFrame')
  await advance(h, () => !state().script.running && state().world.money === 78)
  expect(frames.mock.calls).toEqual([['target', 4]])
  expect(state().world.script?.behaviors.entities?.a?.target?.auto?.cursor).toEqual({
    behavior: 'new',
    at: { kind: 'completed' },
  })
  unchanged()
})

test('a new scene with the same entity id cannot receive the previous scene automatic pose or tail', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'takeEntity', target },
    { kind: 'wait', ms: 500 },
    { kind: 'loadScene', scene: 'b' },
    { kind: 'giveMoney', delta: 9 },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'giveMoney', delta: 7 },
      { kind: 'setEntityFrame', target, frame: 1 },
      { kind: 'giveMoney', delta: 11 },
    ]),
  ]
  const second = shellScene('b')
  second.entities = [
    automatic('target', [
      { kind: 'setEntityFrame', target: { scene: 'b', entity: 'target' }, frame: 4 },
      { kind: 'giveMoney', delta: 5 },
    ]),
  ]
  const { h, unchanged } = await boot(first, second)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const frames = vi.spyOn(WorldScenePresentation.prototype, 'setEntityFrame')
  await advance(h, () => state().sceneId === 'b' && !state().script.running)
  expect(state().world.money).toBe(64)
  expect(frames.mock.calls).toEqual([['target', 4]])
  unchanged()
})

test('a foreground action with the same binding replaces a paused automatic waiter and still completes', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'wait', ms: 400 },
    { kind: 'takeEntity', target },
    {
      kind: 'playEntityAction',
      target,
      sprite: 'walker',
      action: 'gesture',
      loop: false,
      wait: true,
    },
    { kind: 'giveMoney', delta: 9 },
    { kind: 'releaseEntity', target },
  ])
  first.entities = [
    automatic('target', [
      {
        kind: 'playEntityAction',
        target,
        sprite: 'walker',
        action: 'gesture',
        loop: false,
        wait: true,
      },
      { kind: 'giveMoney', delta: 7 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  for (let turn = 0; turn < 8; turn++) {
    await h.frame(100)
    await drain()
  }
  expect(state().script.running).toBe(true)
  expect(state().world.money).toBe(50)
  await advance(h, () => !state().script.running && state().world.money === 66)
  unchanged()
})

test('restoring the same scene invalidates the old held automatic activation before its pose can write', async () => {
  const first = sceneWithCommands('a', [])
  delete first.hooks
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 500 },
      { kind: 'giveMoney', delta: 7 },
      { kind: 'setEntityFrame', target, frame: 1 },
      { kind: 'giveMoney', delta: 9 },
    ]),
    {
      id: 'switch',
      sprite: 'walker',
      pos: { col: 2, row: 3, height: 0 },
      initialPage: 'normal',
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          trigger: 'restore',
          triggerActivation: { on: 'interact', range: 2 },
        },
      ],
      behaviors: {
        trigger: {
          restore: {
            label: 'Restore',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'one',
              stages: [
                {
                  id: 'one',
                  body: [
                    { kind: 'takeEntity', target },
                    { kind: 'wait', ms: 1000 },
                    { kind: 'loadLastSave' },
                  ],
                },
              ],
            },
          },
        },
      },
    },
  ]
  const { h, unchanged } = await boot(first)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(h, 'F5', 1)
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  const saved = await store.getPayload('quick')
  expect(saved?.world.money).toBe(50)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const frames = vi.spyOn(WorldScenePresentation.prototype, 'setEntityFrame')
  await key(h, 'Enter', 1)
  for (let turn = 0; turn < 6; turn++) {
    await h.frame(100)
    await drain()
  }
  expect(state().world.money).toBe(50)
  expect(state().script.running).toBe(true)
  expect(frames).not.toHaveBeenCalled()
  await advance(h, () => !state().script.running && state().world.money === 66)
  expect(state().sceneId).toBe('a')
  expect(frames.mock.calls).toEqual([['target', 1]])
  expect(saved?.world.money).toBe(50)
  unchanged()
})

test('F5/F9 preserves a completed NPC facing and fixed pose, including an NPC without automatic behavior', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'setEntityFacing', target, facing: 'left' },
    { kind: 'setEntityFrame', target, frame: 2 },
  ])
  first.entities = [
    { id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 }, facing: 'down' },
  ]
  const { h, unchanged } = await boot(first)
  await advance(h, () => !state().script.running)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const frames = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  await h.frame(1)
  await drain()
  const presentation = frames.mock.contexts.find((value) => value instanceof WorldScenePresentation)
  if (!(presentation instanceof WorldScenePresentation))
    throw new Error('actual presentation missing')
  expect(state().entities.find((entity) => entity.id === 'target')?.facing).toBe('left')
  expect(presentation.entityFrame('target')).toBe(2)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(h, 'F5', 1)
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  await key(h, 'F9', 1)
  for (let turn = 0; turn < 8; turn++) {
    await h.frame(100)
    await drain()
    await h.settleIO()
  }
  expect(state().entities.find((entity) => entity.id === 'target')?.facing).toBe('left')
  expect(presentation.entityFrame('target')).toBe(2)
  unchanged()
})

test('scene return resumes an automatic walk from the exact departure pose instead of its previous endpoint', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'selectSceneHooks', scene: 'a', selection: { onEnter: { kind: 'disabled' } } },
    { kind: 'wait', ms: 700 },
    { kind: 'loadScene', scene: 'b' },
  ])
  first.entities = [
    automatic('target', [
      { kind: 'moveEntity', target, to: { col: 7, row: 4, height: 0 }, speed: 'slow' },
      { kind: 'giveMoney', delta: 9 },
    ]),
  ]
  const second = sceneWithCommands('b', [
    { kind: 'wait', ms: 2000 },
    { kind: 'loadScene', scene: 'a' },
  ])
  const { h, unchanged } = await boot(first, second)
  const { WorldMotionRuntime } = await import('./world-motion-runtime.js')
  const marks = vi.spyOn(WorldMotionRuntime.prototype, 'markGait')
  let departure: { pos: { col: number; row: number; height: number }; facing: string } | undefined
  let departurePhase: number | undefined
  const originalTeardown = WorldMotionRuntime.prototype.teardownScene
  // Observe the old scene immediately before its real teardown, without replacing any behavior.
  const teardown = vi
    .spyOn(WorldMotionRuntime.prototype, 'teardownScene')
    .mockImplementation(function (this: InstanceType<typeof WorldMotionRuntime>, options) {
      if (state().sceneId === 'a') {
        const npc = state().entities.find((entity) => entity.id === 'target')
        if (npc) departure = structuredClone(npc)
        departurePhase = this.gaitPhase('target')
      }
      return originalTeardown.call(this, options)
    })
  await advance(h, () => state().sceneId === 'b')
  expect(departure?.pos.col).toBeGreaterThan(4)
  expect(departure?.pos.col).toBeLessThan(7)
  expect(teardown).toHaveBeenCalled()
  await advance(h, () => state().sceneId === 'a')
  expect(state().entities.find((entity) => entity.id === 'target')).toMatchObject(departure ?? {})
  const motion = marks.mock.contexts.find((value) => value instanceof WorldMotionRuntime)
  if (!(motion instanceof WorldMotionRuntime)) throw new Error('actual motion owner missing')
  expect(motion.gaitPhase('target')).toBe(departurePhase)
  await advance(h, () => state().world.money === 59)
  expect(state().entities.find((entity) => entity.id === 'target')?.pos).toEqual({
    col: 7,
    row: 4,
    height: 0,
  })
  unchanged()
})

test('F9 resumes a slow automatic walk at its saved gait and consumes the saved rest before its next step', async () => {
  const first = shellScene('a')
  first.entities = [
    automatic('target', [
      { kind: 'moveEntity', target, to: { col: 7, row: 4, height: 0 }, speed: 'slow' },
      { kind: 'giveMoney', delta: 9 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  const { WorldMotionRuntime } = await import('./world-motion-runtime.js')
  const marks = vi.spyOn(WorldMotionRuntime.prototype, 'markGait')
  await advance(h, () => state().entities.find((entity) => entity.id === 'target')?.pos.col === 4.5)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(h, 'F5', 1)
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  const saved = await store.getPayload('quick')
  expect(saved?.world.script?.entityPos?.a?.target).toEqual({ col: 4.5, row: 4, height: 0 })
  const motion = marks.mock.contexts.find((value) => value instanceof WorldMotionRuntime)
  if (!(motion instanceof WorldMotionRuntime)) throw new Error('actual motion owner missing')
  const phase = motion.gaitPhase('target')
  expect(phase).toBe(2)
  await advance(h, () => state().world.money === 59)
  await key(h, 'F9', 1)
  await advance(h, () => state().world.money === 50)
  expect(state().entities.find((entity) => entity.id === 'target')?.pos.col).toBe(4.5)
  expect(motion.gaitPhase('target')).toBe(phase)
  await drain()
  await h.frame(100)
  await drain()
  expect(state().entities.find((entity) => entity.id === 'target')?.pos.col).toBe(4.5)
  expect(motion.gaitPhase('target')).toBe(phase)
  await h.frame(100)
  await drain()
  expect(state().entities.find((entity) => entity.id === 'target')?.pos.col).toBe(4.75)
  expect(motion.gaitPhase('target')).toBe(3)
  await advance(h, () => state().world.money === 59)
  unchanged()
})

test('F5/F9 resumes an awaited action at its exact timeline position, not its first frame', async () => {
  const first = shellScene('a')
  first.entities = [
    automatic('target', [
      {
        kind: 'playEntityAction',
        target,
        sprite: 'walker',
        action: 'gesture',
        loop: false,
        wait: true,
      },
      { kind: 'giveMoney', delta: 9 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  const { EntityActionPlayer } = await import('./entity-action-player.js')
  const observations = vi.spyOn(EntityActionPlayer.prototype, 'frame')
  await h.frame(100)
  await drain()
  const actions = observations.mock.contexts.find((value) => value instanceof EntityActionPlayer)
  if (!(actions instanceof EntityActionPlayer)) throw new Error('actual action player missing')
  await advance(h, () => actions.frame('target') === 3)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(h, 'F5', 1)
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  const atSave = actions.capture()
  expect(atSave[0]?.override?.stepIndex).toBe(1)
  await advance(h, () => state().world.money === 59)
  await key(h, 'F9', 1)
  await advance(h, () => state().world.money === 50)
  expect(actions.capture()).toEqual(atSave)
  await advance(h, () => state().world.money === 59)
  expect(actions.hasOverride('target')).toBe(false)
  unchanged()
})

test('an action timeline pauses outside its scene and resumes without replaying its prefix', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'selectSceneHooks', scene: 'a', selection: { onEnter: { kind: 'disabled' } } },
    { kind: 'wait', ms: 700 },
    { kind: 'loadScene', scene: 'b' },
  ])
  first.entities = [
    automatic('target', [
      {
        kind: 'playEntityAction',
        target,
        sprite: 'walker',
        action: 'gesture',
        loop: true,
        wait: false,
      },
      { kind: 'giveMoney', delta: 9 },
    ]),
  ]
  const second = sceneWithCommands('b', [
    { kind: 'wait', ms: 2000 },
    { kind: 'loadScene', scene: 'a' },
  ])
  const { h, unchanged } = await boot(first, second)
  const { EntityActionPlayer } = await import('./entity-action-player.js')
  const { WorldMotionRuntime } = await import('./world-motion-runtime.js')
  const observations = vi.spyOn(EntityActionPlayer.prototype, 'frame')
  await h.frame(1)
  await drain()
  const actions = observations.mock.contexts.find((value) => value instanceof EntityActionPlayer)
  if (!(actions instanceof EntityActionPlayer)) throw new Error('actual action player missing')
  let departure = actions.capture()
  const teardown = WorldMotionRuntime.prototype.teardownScene
  vi.spyOn(WorldMotionRuntime.prototype, 'teardownScene').mockImplementation(function (
    this: InstanceType<typeof WorldMotionRuntime>,
    options,
  ) {
    if (state().sceneId === 'a') {
      departure = actions.capture()
    }
    return teardown.call(this, options)
  })
  await advance(h, () => state().sceneId === 'b')
  expect(departure[0]?.override?.binding).toEqual({
    sprite: 'walker',
    action: 'gesture',
    loop: true,
  })
  await advance(h, () => state().sceneId === 'a')
  expect(actions.capture()).toEqual(departure)
  expect(state().world.money).toBe(59)
  await h.frame(100)
  await drain()
  expect(actions.capture()).not.toEqual(departure)
  expect(state().world.money).toBe(59)
  unchanged()
})

test('F9 consumes only the saved remainder of an automatic wait', async () => {
  const first = shellScene('a')
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 1000 },
      { kind: 'giveMoney', delta: 9 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  for (let i = 0; i < 4; i++) {
    await h.frame(100)
    await drain()
  }
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(h, 'F5', 1)
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  const saved = await store.getPayload('quick')
  const wait = saved?.sceneRuntime.a?.automatic.target?.wait
  expect(wait?.kind).toBe('command')
  expect(wait?.durationMs).toBe(1000)
  if (!wait) throw new Error('wait was not captured')
  expect(wait.remainingMs).toBeLessThan(1000)
  await advance(h, () => state().world.money === 59)
  await key(h, 'F9', 1)
  await advance(h, () => state().world.money === 50)
  await drain()
  await h.settleIO()
  let remaining = wait.remainingMs
  while (remaining > 1) {
    const dt = Math.min(100, remaining - 1)
    await h.frame(dt)
    await drain()
    remaining -= dt
    expect(state().world.money).toBe(50)
  }
  await h.frame(1)
  await drain()
  await h.settleIO()
  await drain()
  expect(state().world.money).toBe(59)
  unchanged()
})

test.each([
  'live',
  'restore-completed',
  'restore-waiting',
] as const)('disabling a completed automatic owner cancels its cross-entity background action (%s)', async (boundary) => {
  const first = shellScene('a')
  first.entities = [
    { id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 } },
    automatic('caller', [
      {
        kind: 'playEntityAction',
        target,
        sprite: 'walker',
        action: 'gesture',
        loop: true,
        wait: false,
      },
      { kind: 'giveMoney', delta: 9 },
      { kind: 'wait', ms: 1000 },
      { kind: 'giveMoney', delta: 7 },
    ]),
    {
      id: 'switch',
      sprite: 'walker',
      pos: { col: 2, row: 3, height: 0 },
      initialPage: 'normal',
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          trigger: 'disable',
          triggerActivation: { on: 'interact', range: 2 },
        },
      ],
      behaviors: {
        trigger: {
          disable: {
            label: 'Disable',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'one',
              stages: [
                {
                  id: 'one',
                  body: [
                    {
                      kind: 'selectEntityBehavior',
                      target: { scene: 'a', entity: 'caller' },
                      channel: 'auto',
                      selection: { kind: 'disabled' },
                    },
                    { kind: 'giveMoney', delta: 3 },
                  ],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
      },
    },
  ]
  const { h, unchanged } = await boot(first)
  const { EntityActionPlayer } = await import('./entity-action-player.js')
  const observations = vi.spyOn(EntityActionPlayer.prototype, 'frame')
  await advance(h, () => state().world.money === 59)
  await h.frame(1)
  await drain()
  const actions = observations.mock.contexts.find((value) => value instanceof EntityActionPlayer)
  if (!(actions instanceof EntityActionPlayer)) throw new Error('actual action player missing')
  expect(actions.hasOverride('target')).toBe(true)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  if (boundary === 'restore-waiting') {
    await key(h, 'F5', 1)
    await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
    const saved = await store.getPayload('quick')
    expect(saved?.sceneRuntime.a?.automatic.caller?.wait?.kind).toBe('command')
    await advance(h, () => state().world.money === 66)
    await key(h, 'F9', 1)
    await advance(h, () => state().world.money === 59)
    expect(actions.hasOverride('target')).toBe(true)
  }
  await advance(h, () => state().world.money === 66)
  expect(state().world.script?.behaviors.entities?.a?.caller?.auto?.cursor?.at.kind).toBe(
    'completed',
  )
  if (boundary === 'restore-completed') {
    await key(h, 'F5', 1)
    await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
    await key(h, 'Enter', 1)
    await advance(h, () => state().world.money === 69)
    expect(actions.hasOverride('target')).toBe(false)
    await key(h, 'F9', 1)
    await advance(h, () => state().world.money === 66)
    expect(actions.hasOverride('target')).toBe(true)
    expect(state().world.script?.behaviors.entities?.a?.caller?.auto?.cursor?.at.kind).toBe(
      'completed',
    )
  }
  await key(h, 'Enter', 1)
  await advance(h, () => state().world.money === 69)
  expect(actions.hasOverride('target')).toBe(false)
  unchanged()
})

test('restoring a fulfilled automatic action does not clear a newer foreground fixed frame', async () => {
  const first = sceneWithCommands('a', [
    { kind: 'selectSceneHooks', scene: 'a', selection: { onEnter: { kind: 'disabled' } } },
    { kind: 'wait', ms: 300 },
    { kind: 'takeEntity', target },
    { kind: 'stopEntityAction', target, reset: false },
    { kind: 'setEntityFrame', target, frame: 4 },
    { kind: 'loadScene', scene: 'b' },
  ])
  first.entities = [
    automatic('target', [
      {
        kind: 'playEntityAction',
        target,
        sprite: 'walker',
        action: 'gesture',
        loop: false,
        wait: true,
      },
      { kind: 'giveMoney', delta: 9 },
    ]),
  ]
  const second = sceneWithCommands('b', [
    { kind: 'wait', ms: 1000 },
    { kind: 'loadScene', scene: 'a' },
  ])
  const { h, unchanged } = await boot(first, second)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const renders = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  await h.frame(1)
  await drain()
  const presentation = renders.mock.contexts.find(
    (value) => value instanceof WorldScenePresentation,
  )
  if (!(presentation instanceof WorldScenePresentation))
    throw new Error('actual presentation missing')
  await advance(h, () => state().sceneId === 'b')
  expect(state().world.money).toBe(50)
  await advance(h, () => state().sceneId === 'a')
  expect(presentation.entityFrame('target')).toBe(4)
  await advance(h, () => state().world.money === 59)
  expect(presentation.entityFrame('target')).toBe(4)
  unchanged()
})

test('saving as a background action is installed records the next leaf, so restore never installs it twice', async () => {
  const first = shellScene('a')
  first.entities = [
    automatic('target', [
      { kind: 'wait', ms: 300 },
      {
        kind: 'playEntityAction',
        target,
        sprite: 'walker',
        action: 'gesture',
        loop: false,
        wait: false,
      },
      { kind: 'giveMoney', delta: 9 },
    ]),
  ]
  const { h, unchanged } = await boot(first)
  const { EntityActionPlayer } = await import('./entity-action-player.js')
  const original = EntityActionPlayer.prototype.play
  let snapshot: Promise<unknown> | undefined
  // Observe installation by the real host and request the public save barrier at that exact
  // boundary. The original player/runner remain in control; no continuation is fabricated.
  const play = vi.spyOn(EntityActionPlayer.prototype, 'play').mockImplementation(function (
    this: InstanceType<typeof EntityActionPlayer>,
    ...args
  ) {
    const pending = original.apply(this, args)
    if (!snapshot) {
      const hooks: unknown = Reflect.get(window, '__tpE2e')
      if (
        !hooks ||
        typeof hooks !== 'object' ||
        !('dumpSave' in hooks) ||
        typeof hooks.dumpSave !== 'function'
      )
        throw new Error('public checkpoint export missing')
      snapshot = Promise.resolve(hooks.dumpSave())
    }
    return pending
  })
  await advance(h, () => snapshot !== undefined)
  const saved = await snapshot
  assertCurrentSaveStructure(saved)
  expect(saved.sceneRuntime.a?.actions[0]?.override?.awaited).toBe(false)
  expect(saved.world.script?.behaviors.entities?.a?.target?.auto?.cursor?.resume?.frames).toEqual([
    { index: 2 },
  ])
  expect(saved.world.money).toBe(50)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await store.putSlot(
    { slotId: 'quick', kind: 'quick', party: [], mapName: 'a', savedAt: 0 },
    saved,
    new Blob(['thumb']),
  )
  await advance(h, () => state().world.money === 59)
  const { ActiveScene } = await import('./active-scene.js')
  const commits = vi.spyOn(ActiveScene.prototype, 'commit')
  await key(h, 'F9', 1)
  await advance(h, () => commits.mock.calls.length === 1)
  await advance(h, () => state().world.money === 59)
  expect(play).toHaveBeenCalledTimes(1)
  unchanged()
})

test.each([
  'hideEntity',
  'removeEntity',
] as const)('inactive %s preserves or removes a different owner’s background animation on the target', async (kind) => {
  const first = sceneWithCommands('a', [
    { kind: 'selectSceneHooks', scene: 'a', selection: { onEnter: { kind: 'disabled' } } },
    { kind: 'wait', ms: 700 },
    { kind: 'loadScene', scene: 'b' },
  ])
  first.entities = [
    { id: 'target', sprite: 'walker', pos: { col: 4, row: 4, height: 0 } },
    automatic('caller', [
      {
        kind: 'playEntityAction',
        target,
        sprite: 'walker',
        action: 'gesture',
        loop: true,
        wait: false,
      },
    ]),
  ]
  const second = sceneWithCommands('b', [
    kind === 'hideEntity' ? { kind, target, ticks: 1000 } : { kind, target },
    { kind: 'wait', ms: 1000 },
    { kind: 'loadScene', scene: 'a' },
  ])
  const { h, unchanged } = await boot(first, second)
  const { EntityActionPlayer } = await import('./entity-action-player.js')
  const observations = vi.spyOn(EntityActionPlayer.prototype, 'frame')
  await h.frame(1)
  await drain()
  const actions = observations.mock.contexts.find((value) => value instanceof EntityActionPlayer)
  if (!(actions instanceof EntityActionPlayer)) throw new Error('actual action player missing')
  await advance(h, () => state().sceneId === 'b')
  await advance(h, () => state().sceneId === 'a')
  const atReturn = actions.capture()
  expect(actions.hasOverride('target')).toBe(kind === 'hideEntity')
  expect(state().entities.find((entity) => entity.id === 'target')?.hidden).toBe(true)
  for (let i = 0; i < 3; i++) {
    await h.frame(100)
    await drain()
  }
  expect(actions.capture()).toEqual(atReturn)
  unchanged()
})
