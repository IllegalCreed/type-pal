import type {
  BehaviorCursor,
  RuntimeCommand,
  SpriteActionBinding,
  WorldState,
} from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { deferred, fixture, stage } from './__tests__/save-lineage-fixture.js'
import { EntityActionPlayer } from './entity-action-player.js'
import type { RuntimeLeafCommand } from './runtime-script-compiler.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import type { AutomaticWaitSnapshot, SceneRuntimeState } from './scene-runtime-state.js'
import type { ScriptRuntimeContext } from './script-runner-core.js'

const owner = { scene: 's', entity: 'e' }
const target = { scene: 's', entity: 'target' }
const destination = { col: 10, row: 8, height: 0 }
const move = {
  kind: 'moveEntity',
  target,
  to: destination,
  speed: 'slow',
} satisfies RuntimeCommand

/** Real compiler/runner/save barrier; only external effect completion is held at its IO boundary. */
async function captured(
  command: RuntimeCommand,
  options: {
    phase?: 'continuation' | 'done'
    sharedSelf?: boolean
    effect?(leaf: RuntimeLeafCommand, signal: AbortSignal): void
    actions?: EntityActionPlayer
  } = {},
) {
  const entered = deferred(),
    release = deferred()
  const effect = vi.fn(
    async (
      leaf: RuntimeLeafCommand,
      context: Readonly<ScriptRuntimeContext>,
      signal: AbortSignal,
    ) => {
      if (leaf.kind !== command.kind) return
      if (options.phase) context.autoMotionCheckpoint?.settle(options.phase)
      options.effect?.(leaf, signal)
      context.autoCommandCheckpoint?.ready()
      entered.resolve()
      await release.promise
    },
  )
  const f = fixture({ executeEffect: effect })
  const entity = f.scene.entities[0]!
  f.scene.entities.push({ id: target.entity, zone: true, pos: { col: 0, row: 0, height: 0 } })
  entity.pages![0]!.auto = 'a'
  entity.behaviors!.auto = {
    a: {
      label: 'A',
      order: 0,
      flow: stage([
        options.sharedSelf ? { kind: 'callScript', script: 'child', self: target } : command,
        { kind: 'wait', ms: 900 },
        { kind: 'finishStep', next: { kind: 'complete' } },
      ]),
    },
  }
  const runtime = options.sharedSelf
    ? new ScriptProjectRuntime(
        {
          sharedScripts: {
            child: { name: 'Child', self: 'required', body: [command] },
          },
        },
        f.world,
        'c'.repeat(64),
        f.options,
      )
    : f.runtime
  const running = runtime.runEntityBehavior(f.scene, owner.entity, 'auto', { signal: f.signal })
  await entered.promise
  const world = await runtime.withSaveBarrier(() => structuredClone(f.world))
  const cursor = world.script?.behaviors.entities?.s?.e?.auto?.cursor
  if (!cursor) throw new Error('fixture did not capture a real automatic cursor')
  const saved: SceneRuntimeState = {
    entities: { e: { motion: {} }, target: { motion: {} } },
    automatic: { e: { cursor: structuredClone(cursor) } },
    actions: options.actions?.capture({ includeCompleted: () => true }) ?? [],
    chaseClaims: [],
  }
  release.resolve()
  await running
  effect.mockClear()
  const validate = () => runtime.validateSceneRuntimeContinuations(world, f.signal, 's', saved)
  return { ...f, runtime, world, saved, validate, effect, completedWorld: structuredClone(f.world) }
}

function replaceCursor(world: WorldState, saved: SceneRuntimeState, cursor: BehaviorCursor): void {
  world.script!.behaviors.entities!.s!.e!.auto!.cursor = structuredClone(cursor)
  saved.automatic.e!.cursor = structuredClone(cursor)
}

test('real cross-entity move checkpoint is accepted without effects or world mutation', async () => {
  const f = await captured(move)
  f.saved.entities.target!.motion.move = {
    owner: 'e',
    to: destination,
    speed: 'slow',
    slowRestPending: true,
    slowCadence: true,
  }
  const before = structuredClone({ world: f.world, saved: f.saved })
  await f.validate()
  expect({ world: f.world, saved: f.saved }).toEqual(before)
  expect(f.effect).not.toHaveBeenCalled()
})

test.each([
  'completed',
  'target',
  'destination',
  'speed',
  'leaf',
] as const)('persisted IO: rejects a move whose %s no longer binds to the saved command', async (field) => {
  const f = await captured(move)
  f.saved.entities.target!.motion.move = {
    owner: 'e',
    to: { ...destination },
    speed: 'slow',
    slowRestPending: false,
    slowCadence: true,
  }
  if (field === 'completed')
    replaceCursor(f.world, f.saved, { behavior: 'a', at: { kind: 'completed' } })
  else if (field === 'target') {
    f.saved.entities.e!.motion = f.saved.entities.target!.motion
    f.saved.entities.target!.motion = {}
  } else if (field === 'destination') f.saved.entities.target!.motion.move.to.col++
  else if (field === 'speed') f.saved.entities.target!.motion.move.speed = 'normal'
  else {
    const cursor = structuredClone(f.saved.automatic.e!.cursor)
    cursor.resume!.frames[0]!.index = 1
    replaceCursor(f.world, f.saved, cursor)
  }
  await expect(f.validate()).rejects.toThrow('scene runtime')
  expect(f.effect).not.toHaveBeenCalled()
})

test.each([
  'completed',
  'duration',
  'leaf',
] as const)('persisted IO: rejects a command wait with mismatched %s', async (field) => {
  const f = await captured({ kind: 'wait', ms: 400 })
  f.saved.automatic.e!.wait = { kind: 'command', durationMs: 400, remainingMs: 150 }
  if (field === 'completed')
    replaceCursor(f.world, f.saved, { behavior: 'a', at: { kind: 'completed' } })
  else if (field === 'duration') f.saved.automatic.e!.wait.durationMs = 900
  else {
    const cursor = structuredClone(f.saved.automatic.e!.cursor)
    cursor.resume!.frames[0]!.index = 1
    replaceCursor(f.world, f.saved, cursor)
  }
  await expect(f.validate()).rejects.toThrow('scene runtime')
})

test('persisted IO: automatic gait without a stable owner rejects', async () => {
  const f = await captured({ kind: 'wait', ms: 400 })
  f.saved.entities.target!.motion.gait = { source: 'auto', phase: 3 }
  await expect(f.validate()).rejects.toThrow('scene runtime')
})

test('zero-remaining wait and cross-entity gait between movements remain legal while suspended', async () => {
  const f = await captured({ kind: 'wait', ms: 400 })
  f.saved.automatic.e!.wait = { kind: 'command', durationMs: 400, remainingMs: 0 }
  f.saved.entities.target!.motion.gait = { source: 'auto', owner: 'e', phase: 3 }
  f.world.entityLifecycles = { s: { e: { phase: 'suspended', remainingTicks: 1000 } } }
  await f.validate()
  expect(f.effect).not.toHaveBeenCalled()
})

test.each([
  'missing',
  'disabled',
  'offstage',
  'completed',
  'diverged-cursor',
] as const)('persisted IO: rejects gait with %s owner context', async (field) => {
  const f = await captured({ kind: 'wait', ms: 400 })
  f.saved.entities.target!.motion.gait = { source: 'auto', owner: 'e', phase: 3 }
  if (field === 'missing') delete f.saved.automatic.e
  else if (field === 'disabled')
    f.world.script!.behaviors.entities!.s!.e!.auto!.selection = { kind: 'disabled' }
  else if (field === 'offstage') f.world.entityLifecycles = { s: { e: { phase: 'removed' } } }
  else if (field === 'completed')
    replaceCursor(f.world, f.saved, { behavior: 'a', at: { kind: 'completed' } })
  else f.saved.automatic.e!.cursor.resume!.frames[0]!.index = 1
  await expect(f.validate()).rejects.toThrow('scene runtime')
})

const chaseWaits = [
  { kind: 'chase-pacing', durationMs: 160, remainingMs: 80, phase: 'continuation' },
  { kind: 'chase-pacing', durationMs: 160, remainingMs: 80, phase: 'done' },
  { kind: 'chase-terminal', durationMs: 320, remainingMs: 0, phase: 'done' },
  { kind: 'chase-range', durationMs: 240, remainingMs: 110, phase: 'done' },
  { kind: 'chase-hidden', durationMs: 200, remainingMs: 110, phase: 'done' },
] satisfies (AutomaticWaitSnapshot & { phase: 'continuation' | 'done' })[]

test.each(
  chaseWaits,
)('shared-self chase wait $kind/$phase binds to real compiled leaf and rejects corrupt duration', async ({
  phase,
  ...wait
}) => {
  const f = await captured({ kind: 'chasePlayer', speed: 3 }, { phase, sharedSelf: true })
  f.saved.automatic.e!.wait = wait
  const before = structuredClone({ world: f.world, saved: f.saved })
  await f.validate()
  expect({ world: f.world, saved: f.saved }).toEqual(before)
  f.saved.automatic.e!.wait.durationMs++
  await expect(f.validate()).rejects.toThrow('scene runtime: chase等待类型/时长')
  expect(f.effect).not.toHaveBeenCalled()
})

test('persisted IO: terminal chase waits cannot attach to a continuation phase', async () => {
  const f = await captured({ kind: 'chasePlayer' }, { phase: 'continuation' })
  f.saved.automatic.e!.wait = { kind: 'chase-terminal', durationMs: 320, remainingMs: 80 }
  await expect(f.validate()).rejects.toThrow('scene runtime: chase等待类型/时长')
})

test('persisted IO: chase pacing cannot attach to an uncommitted chase leaf', async () => {
  const f = await captured({ kind: 'chasePlayer' })
  f.saved.automatic.e!.wait = { kind: 'chase-pacing', durationMs: 120, remainingMs: 80 }
  await expect(f.validate()).rejects.toThrow('scene runtime: chase等待没有')
})

const actionBinding = {
  sprite: 'sprite-a',
  action: 'wave',
  loop: false,
  startAtMs: 10,
} satisfies SpriteActionBinding

async function capturedAction(
  options: { completed?: boolean; background?: boolean; loop?: boolean } = {},
) {
  const actions = new EntityActionPlayer()
  const binding = { ...actionBinding, loop: options.loop ?? false }
  const wait = !options.background && !binding.loop
  const result = await captured(
    { kind: 'playEntityAction', target, ...binding, ...(wait ? {} : { wait }) },
    {
      actions,
      effect: (_leaf, signal) => {
        void actions.play(
          target.entity,
          {
            binding,
            action: {
              label: 'Wave',
              steps: [
                { frame: 1, durationMs: 100 },
                { frame: 2, durationMs: 100 },
              ],
            },
          },
          signal,
          'automatic',
          owner.entity,
          wait,
        )
        actions.advance(25)
        if (options.completed) actions.stop(target.entity, false)
      },
    },
  )
  if (!binding.loop) actions.advance(1000)
  else actions.stop(target.entity, false)
  return result
}

test.each([
  false,
  true,
])('real awaited action checkpoint/stop receipt (completed=%s) binds cross-entity without restarting', async (completed) => {
  const f = await capturedAction({ completed })
  const track = completed ? f.saved.actions[0]?.completed?.[0] : f.saved.actions[0]?.override
  expect(track).toMatchObject({
    source: 'automatic',
    owner: 'e',
    awaited: true,
    finished: false,
    elapsedInStepMs: 35,
  })
  await f.validate()
  expect(f.effect).not.toHaveBeenCalled()
})

test.each([
  'target',
  'sprite',
  'action',
  'loop',
  'startAtMs',
  'leaf',
  'wait',
  'owner',
] as const)('persisted IO: awaited action rejects mismatched %s', async (field) => {
  const f = await capturedAction({ background: field === 'wait' })
  const action = f.saved.actions[0]!,
    track = action.override!
  if (field === 'target') action.entity = owner.entity
  else if (field === 'sprite') track.binding.sprite = 'sprite-b'
  else if (field === 'action') track.binding.action = 'other'
  else if (field === 'loop') track.binding.loop = true
  else if (field === 'startAtMs') track.binding.startAtMs = 0
  else if (field === 'owner') delete track.owner
  else if (field === 'wait') track.awaited = true
  else {
    const cursor = structuredClone(f.saved.automatic.e!.cursor)
    cursor.resume!.frames[0]!.index = 1
    replaceCursor(f.world, f.saved, cursor)
  }
  await expect(f.validate()).rejects.toThrow('scene runtime')
})

test('persisted IO: a completed action receipt is invalid after its awaited leaf has advanced', async () => {
  const f = await capturedAction({ completed: true })
  const completed = f.completedWorld.script!.behaviors.entities!.s!.e!.auto!.cursor!
  replaceCursor(f.world, f.saved, completed)
  await expect(f.validate()).rejects.toThrow('scene runtime: completed owner')
})

test.each([
  false,
  true,
])('background action (loop=%s) can outlive its completed owner behavior, but not its selection', async (loop) => {
  const f = await capturedAction({ background: true, loop })
  const completed = f.completedWorld.script!.behaviors.entities!.s!.e!.auto!.cursor!
  expect(completed.at.kind).toBe('completed')
  replaceCursor(f.world, f.saved, completed)
  await f.validate()
  f.world.script!.behaviors.entities!.s!.e!.auto!.selection = { kind: 'disabled' }
  await expect(f.validate()).rejects.toThrow('scene runtime: owner方案未选中')
})

test('page base action requires no behavior owner or automatic cursor', async () => {
  const f = fixture()
  const actions = new EntityActionPlayer()
  actions.replaceScene([
    {
      entity: 'e',
      binding: { ...actionBinding, loop: true },
      action: {
        label: 'Base',
        steps: [{ frame: 2, durationMs: 100 }],
      },
    },
  ])
  const saved: SceneRuntimeState = {
    entities: {},
    automatic: {},
    chaseClaims: [],
    actions: actions.capture(),
  }
  await f.runtime.validateSceneRuntimeContinuations(f.world, f.signal, 's', saved)
})
