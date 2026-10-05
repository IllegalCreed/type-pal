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
  const held = () => [...motion.authority.keys()].sort()
  const unexpected = (): never => {
    throw new Error('unexpected control command in PAL inn choreography')
  }
  const host: ScriptRuntimeHost = {
    execute(command) {
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
  return { snapshots, rows, rewards, departures, cursors, authorityCommands, held: held() }
}

function assertParticipantWindows(snapshots: { at: string; held: string[] }[]): void {
  for (const snapshot of snapshots) {
    const participating =
      snapshot.at === 'money' ||
      /^dlg\.(32|33|34|36|37|38|40|41|43|45|46|47|49|50|51|53)$/.test(snapshot.at)
    expect(snapshot.held, snapshot.at).toEqual(participating ? participants : [])
  }
}

describe('canonical PAL inn participant choreography', () => {
  test('e59 takes its authority before switching auto and releases after the final dialogue', () => {
    const scene = validateAuthorScenes([structuredClone(authorInn)])[0]
    const auto = scene?.entities
      .find((entity) => entity.id === 'e59')
      ?.behaviors?.auto?.['legacy-001']?.flow
    if (!auto || auto.kind !== 'stages') throw new Error('PAL e59 automatic flow is missing')
    expect(auto.stages[0]?.body[0]).toMatchObject({
      kind: 'moveEntity',
      target: { scene: 's003', entity: 'e59' },
      to: { col: 137, row: 73, height: 0 },
    })
    const flow = scene?.entities
      .find((entity) => entity.id === 'e59')
      ?.behaviors?.trigger?.['legacy-001']?.flow
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
    ).toEqual(['wait:320', 'wait:320', 'wait:400', 'wait:600', 'wait:320', 'wait:40'])
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
