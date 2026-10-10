import type { RuntimeScriptFlow } from '@type-pal/content'
import { resolveAuthorDialogueTree, validateActors, validateAuthorScenes } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import authorActors from '../../../projects/pal/content/actors.json' with { type: 'json' }
import authorInn from '../../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import { MotionRuntimeCoordinator } from './motion-runtime-coordinator.js'
import { compileRuntimeScriptFlow } from './runtime-script-compiler.js'
import type { ScriptRuntimeHost } from './runtime-script-runner.js'
import { RuntimeScriptRunner } from './runtime-script-runner.js'

const participants = ['e59', 'e60', 'e61']
const dialogueRows = [
  25, 27, 29, 30, 32, 33, 34, 36, 37, 38, 40, 41, 43, 45, 46, 47, 49, 50, 51, 53,
]

function innFlow(): RuntimeScriptFlow {
  const scene = validateAuthorScenes([structuredClone(authorInn)])[0]
  const flow = scene?.entities.find((entity) => entity.id === 'e56')?.behaviors?.trigger?.default
    ?.flow
  if (!flow || flow.kind !== 'stages') throw new Error('PAL e56 initial stage is missing')
  const actors = Object.fromEntries(validateActors(authorActors).map((actor) => [actor.id, actor]))
  return resolveAuthorDialogueTree(flow, actors)
}

async function runChoreography(flow: RuntimeScriptFlow) {
  const motion = new MotionRuntimeCoordinator<'script'>()
  const rows: string[] = []
  const snapshots: { at: string; held: string[] }[] = []
  const departures: string[] = []
  const rewards: number[] = []
  const cursors: unknown[] = []
  const authorityCommands: string[] = []
  const commands: Parameters<ScriptRuntimeHost['execute']>[0][] = []
  const held = () => [...motion.authority.keys()].sort()
  const unexpected = (): never => {
    throw new Error('unexpected control command in PAL inn choreography')
  }
  const host: ScriptRuntimeHost = {
    execute(command) {
      commands.push(structuredClone(command))
      switch (command.kind) {
        case 'takeEntity':
          if (command.target.scene !== 's003') throw new Error('expected an inn participant')
          authorityCommands.push(`take:${command.target.entity}`)
          motion.setAuthority(command.target.entity, 'script')
          break
        case 'releaseEntity':
          if (!command.target || command.target.scene !== 's003')
            throw new Error('expected a targeted release')
          authorityCommands.push(`release:${command.target.entity}`)
          motion.releaseAuthority(command.target.entity)
          break
        case 'dialog':
          for (const row of command.cue.rows) {
            rows.push(row.text)
            snapshots.push({ at: row.text, held: held() })
          }
          break
        case 'giveMoney':
          rewards.push(command.delta)
          snapshots.push({ at: 'money', held: held() })
          break
        case 'wait':
          snapshots.push({ at: `wait:${command.ms}`, held: held() })
          break
        case 'selectEntityBehavior':
          if (command.channel === 'auto') {
            if (command.target.scene !== 's003') throw new Error('expected an inn auto entity')
            departures.push(command.target.entity)
          }
          break
      }
    },
    wait: async (ms) => {
      snapshots.push({ at: `wait:${ms}`, held: held() })
    },
    waitWorldTick: async () => unexpected(),
    yieldMacroTask: async () => unexpected(),
    evalCondition: unexpected,
    confirm: async () => unexpected(),
    startBattle: async () => unexpected(),
    teleportOut: async () => unexpected(),
  }
  const runner = new RuntimeScriptRunner(host, new AbortController().signal)
  await runner.runFlow(
    compileRuntimeScriptFlow(flow, {
      canonicalContentDigest: 'a'.repeat(64),
      timing: 'interactive',
    }),
    {
      self: { scene: 's003', entity: 'e56' },
      cursorController: {
        reachSafePoint(cursor) {
          cursors.push(structuredClone(cursor))
          return 'continue'
        },
      },
    },
  )
  return {
    snapshots,
    rows,
    rewards,
    departures,
    cursors,
    authorityCommands,
    commands,
    held: held(),
  }
}

function assertParticipantWindows(snapshots: { at: string; held: string[] }[]): void {
  const start = snapshots.findIndex((snapshot) => snapshot.at === 'dlg.32')
  const end = snapshots.findIndex((snapshot) => snapshot.at === 'dlg.51')
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  for (const [index, snapshot] of snapshots.entries()) {
    const participating = (index >= start && index <= end) || snapshot.at === 'dlg.53'
    expect(snapshot.held, snapshot.at).toEqual(participating ? participants : [])
  }
}

describe('canonical PAL inn participant choreography', () => {
  test('aunt faces the arriving party before scolding, then opens the two doors in separate beats', async () => {
    const { commands } = await runChoreography(innFlow())
    const firstDialogue = commands.findIndex((command) => command.kind === 'dialog')
    expect(commands.slice(0, firstDialogue)).toContainEqual({
      kind: 'faceEntityToParty',
      target: { scene: 's003', entity: 'e56' },
    })
    expect(commands[firstDialogue - 1]).toEqual({
      kind: 'setEntityFrame',
      frame: 0,
      target: { scene: 's003', entity: 'e56' },
    })
    for (const entity of ['e55', 'e54']) {
      const at = commands.findIndex(
        (command) => command.kind === 'setEntityState' && command.target.entity === entity,
      )
      expect(commands.slice(at + 1, at + 3)).toEqual([
        { kind: 'clearDialog' },
        { kind: 'wait', ms: 100 },
      ])
    }
  })

  test('opening attendant explicitly turns toward the corridor before his first step', () => {
    const scene = validateAuthorScenes([structuredClone(authorInn)])[0]
    const flow = scene?.entities.find((entity) => entity.id === 'e60')?.behaviors?.auto?.[
      'legacy-003'
    ]?.flow
    if (!flow || flow.kind !== 'stages') throw new Error('missing attendant route')
    const body = flow.stages[0]?.body ?? []
    const at = body.findIndex((command) => command.kind === 'moveEntity')
    expect(body.slice(at + 1, at + 4)).toEqual([
      { kind: 'setEntityFacing', facing: 'right', target: { scene: 's003', entity: 'e60' } },
      { kind: 'setEntityFrame', frame: 0, target: { scene: 's003', entity: 'e60' } },
      { kind: 'wait', ms: 100 },
    ])
  })

  test('attendant waits use exploration beats and compound door/pose actions stay together', () => {
    const scene = validateAuthorScenes([structuredClone(authorInn)])[0]
    const body = (id: string) => {
      const flow = scene?.entities.find((entity) => entity.id === id)?.behaviors?.auto?.[
        'legacy-003'
      ]?.flow
      if (!flow || flow.kind !== 'stages') throw new Error('missing attendant route')
      return flow.stages[0]?.body ?? []
    }
    const opener = body('e60')
    const follower = body('e61')
    expect(opener[0]).toEqual({ kind: 'wait', ms: 200 })
    expect(follower[0]).toEqual({ kind: 'wait', ms: 400 })
    for (const [commands, entity] of [
      [opener, 'e60'],
      [follower, 'e61'],
    ] as const) {
      const turn = commands.findIndex(
        (command) => command.kind === 'setEntityFacing' && command.facing === 'up',
      )
      expect(commands[turn + 1]).toEqual({
        kind: 'setEntityFrame',
        frame: 0,
        target: { scene: 's003', entity },
      })
    }
    const door = opener.findIndex(
      (command) => command.kind === 'setEntityState' && command.target.entity === 'e73',
    )
    expect(opener.slice(door, door + 6).map((command) => command.kind)).toEqual([
      'setEntityState',
      'setEntityFacing',
      'selectEntityPage',
      'setEntityState',
      'setEntityFacing',
      'selectEntityPage',
    ])
    const turn = follower.findIndex(
      (command) => command.kind === 'setEntityFacing' && command.facing === 'up',
    )
    expect(follower[turn - 1]).toEqual({ kind: 'wait', ms: 300 })
    expect(follower[turn + 2]).toEqual({ kind: 'wait', ms: 400 })
  })
  test('e62 dialogue stages hold the pose loop across the complete interaction', () => {
    const scene = validateAuthorScenes([structuredClone(authorInn)])[0]
    const e62 = scene?.entities.find((entity) => entity.id === 'e62')
    if (!e62) throw new Error('PAL e62 entity is missing')
    for (const [behaviorId, behavior] of Object.entries(e62.behaviors?.trigger ?? {})) {
      if (behavior.flow.kind !== 'stages') continue
      for (const stage of behavior.flow.stages) {
        if (!stage.body.some((command) => command.kind === 'dialog')) continue
        expect(stage.body[0], `${behaviorId}/${stage.id}`).toMatchObject({
          kind: 'takeEntity',
          target: { scene: 's003', entity: 'e62' },
        })
        expect(stage.body.at(-1), `${behaviorId}/${stage.id}`).toMatchObject({
          kind: 'releaseEntity',
          target: { scene: 's003', entity: 'e62' },
        })
        expect(
          stage.body.filter(
            (command) =>
              (command.kind === 'takeEntity' || command.kind === 'releaseEntity') &&
              command.target?.entity === 'e62',
          ),
          `${behaviorId}/${stage.id}`,
        ).toHaveLength(2)
      }
    }
  })

  test('the drunken Taoist repeats a 1500ms pose cycle after its initial 200ms delay', async () => {
    const scene = validateAuthorScenes([structuredClone(authorInn)])[0]
    const flow = scene?.entities.find((entity) => entity.id === 'e62')?.behaviors?.auto?.default
      ?.flow
    if (!flow || flow.kind !== 'stages') throw new Error('PAL e62 automatic flow is missing')
    const controller = new AbortController()
    let elapsed = 0
    const poses: { at: number; frame: number }[] = []
    const unexpected = (): never => {
      throw new Error('unexpected Taoist loop control')
    }
    // Observe the actual compiled infinite loop across multiple iterations. This is an
    // authored-duration oracle, not a wall-clock or pixel measurement.
    const host: ScriptRuntimeHost = {
      execute(command) {
        if (command.kind === 'wait') elapsed += command.ms
        if (command.kind === 'setEntityFrame') {
          poses.push({ at: elapsed, frame: command.frame })
          if (poses.length === 5) controller.abort()
        }
      },
      wait: async () => unexpected(),
      waitWorldTick: async () => unexpected(),
      yieldMacroTask: async () => {},
      evalCondition: unexpected,
      confirm: async () => unexpected(),
      startBattle: async () => unexpected(),
      teleportOut: async () => unexpected(),
    }
    const actors = Object.fromEntries(
      validateActors(authorActors).map((actor) => [actor.id, actor]),
    )
    await expect(
      new RuntimeScriptRunner(host, controller.signal).runFlow(
        compileRuntimeScriptFlow(resolveAuthorDialogueTree(flow, actors), {
          canonicalContentDigest: 'a'.repeat(64),
          timing: 'auto',
        }),
        {
          self: { scene: 's003', entity: 'e62' },
          cursorController: { reachSafePoint: () => 'continue' },
        },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })
    // Original L_734–739, executed by runOneAutoOp: f1 at ticks2/17/32, f0 at4/19.
    expect(poses).toEqual([
      { at: 200, frame: 1 },
      { at: 400, frame: 0 },
      { at: 1700, frame: 1 },
      { at: 1900, frame: 0 },
      { at: 3200, frame: 1 },
    ])
  })

  test('e59 takes its authority before switching auto and releases after the final dialogue', () => {
    const scene = validateAuthorScenes([structuredClone(authorInn)])[0]
    const auto = scene?.entities.find((entity) => entity.id === 'e59')?.behaviors?.auto?.[
      'legacy-001'
    ]?.flow
    if (!auto || auto.kind !== 'stages') throw new Error('PAL e59 automatic flow is missing')
    expect(auto.stages[0]?.body[0]).toMatchObject({
      kind: 'moveEntity',
      target: { scene: 's003', entity: 'e59' },
      // L_1166 targets pixel [1040,1672]. A dialogue-interrupted stop is not this endpoint.
      to: { col: 137, row: 72, height: 0 },
    })
    const flow = scene?.entities.find((entity) => entity.id === 'e59')?.behaviors?.trigger?.[
      'legacy-001'
    ]?.flow
    if (!flow || flow.kind !== 'stages') throw new Error('PAL e59 interaction flow is missing')
    const stage = flow.stages.find((candidate) => candidate.id === flow.initial)
    if (!stage) throw new Error('PAL e59 initial stage is missing')
    const body = stage.body
    const takeIndex = body.findIndex(
      (command) => command.kind === 'takeEntity' && command.target.entity === 'e59',
    )
    const autoSelectionIndex = body.findIndex(
      (command) =>
        command.kind === 'selectEntityBehavior' &&
        command.target.entity === 'e59' &&
        command.channel === 'auto',
    )
    const facingIndex = body.findIndex(
      (command) =>
        command.kind === 'setEntityFacing' &&
        command.target.entity === 'e59' &&
        command.facing === 'left',
    )
    const dialogIndexes = body.flatMap((command, index) =>
      command.kind === 'dialog' ? [index] : [],
    )
    const releaseIndex = body.findIndex(
      (command) => command.kind === 'releaseEntity' && command.target?.entity === 'e59',
    )
    expect(takeIndex).toBe(0)
    expect(autoSelectionIndex).toBeGreaterThan(takeIndex)
    expect(facingIndex).toBeGreaterThan(autoSelectionIndex)
    expect(dialogIndexes.length).toBeGreaterThan(0)
    expect(facingIndex).toBeLessThan(dialogIndexes[0] ?? Number.POSITIVE_INFINITY)
    expect(releaseIndex).toBe(body.length - 1)
    expect(releaseIndex).toBeGreaterThan(dialogIndexes.at(-1) ?? -1)
  })

  test('takes only the three participants for dialogue and releases during the authored movement beats', async () => {
    const result = await runChoreography(innFlow())
    assertParticipantWindows(result.snapshots)
    expect(result.authorityCommands).toEqual([
      ...participants.map((id) => `take:${id}`),
      ...participants.map((id) => `release:${id}`),
      ...participants.map((id) => `take:${id}`),
      ...participants.map((id) => `release:${id}`),
    ])
    expect(
      result.snapshots.filter((entry) => entry.at.startsWith('wait:')).map((entry) => entry.at),
    ).toEqual([
      'wait:100',
      'wait:320',
      'wait:100',
      'wait:100',
      'wait:320',
      'wait:100',
      'wait:100',
      'wait:1000',
      'wait:1500',
      'wait:100',
      'wait:800',
      'wait:100',
    ])
    expect(result.held).toEqual([])
  })

  test('keeps the actual dialogue, reward, initial auto dispatch and next activation', async () => {
    const result = await runChoreography(innFlow())
    expect(result.rows).toEqual(dialogueRows.map((id) => `dlg.${id}`))
    expect(result.rewards).toEqual([500])
    expect(result.departures).toEqual(['e56', ...participants])
    expect(result.cursors.at(-1)).toEqual({ kind: 'stage', stage: 'legacy-002' })
    const order = result.snapshots.map((entry) => entry.at)
    expect(order.indexOf('money')).toBeGreaterThan(order.indexOf('dlg.50'))
    expect(order.indexOf('money')).toBeLessThan(order.indexOf('dlg.51'))
  })

  test.each([
    'e59',
    'e60',
    'e61',
  ])('detects a missing take for participant %s in the real author chain', async (entityId) => {
    const flow = innFlow()
    if (flow.kind !== 'stages') throw new Error('expected stages')
    const stage = flow.stages.find((candidate) => candidate.id === flow.initial)
    if (!stage) throw new Error('expected initial stage')
    stage.body = stage.body.filter(
      (command) => command.kind !== 'takeEntity' || command.target.entity !== entityId,
    )
    const result = await runChoreography(flow)
    expect(() => assertParticipantWindows(result.snapshots)).toThrow()
  })
  test.each([
    'e59',
    'e60',
    'e61',
  ])('detects a missing release for participant %s in the real author chain', async (entityId) => {
    const flow = innFlow()
    if (flow.kind !== 'stages') throw new Error('expected stages')
    const stage = flow.stages.find((candidate) => candidate.id === flow.initial)
    if (!stage) throw new Error('expected initial stage')
    stage.body = stage.body.filter(
      (command) => command.kind !== 'releaseEntity' || command.target?.entity !== entityId,
    )
    const result = await runChoreography(flow)
    expect(() => assertParticipantWindows(result.snapshots)).toThrow()
  })
})
