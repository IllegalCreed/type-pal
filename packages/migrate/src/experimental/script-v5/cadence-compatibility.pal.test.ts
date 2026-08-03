import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import type {
  AuthorCommandV5,
  AuthorSceneEntryPresentationV5,
  SceneDefV5,
  ScriptFlowV5,
  StateTransitionV5,
} from '@type-pal/content'
import { compileScriptFlowV5, type ExecutableCommandV5 } from '@type-pal/reforge/script-compiler-v5'
import { describe, expect, test } from 'vitest'
import { stableJson, stableJsonSha256 } from './stable-json.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const sceneRoot = resolve(repo, 'packages/migrate/baselines/pal/content/scenes')
const r13OneSealPath = resolve(
  repo,
  'packages/migrate/baselines/pal/_transitions/r13-cadence-v1.json',
)
const canonicalContentDigest = 'a'.repeat(64)

type LegacyTimingV1 = 'auto' | 'interactive'

interface R13OneCadenceSeal {
  evidence: {
    owners: Array<{ ownerKey: string; machineId: string }>
  }
}

const r13OneMachineIds = new Map(
  (JSON.parse(readFileSync(r13OneSealPath, 'utf8')) as R13OneCadenceSeal).evidence.owners.map(
    ({ ownerKey, machineId }) => [ownerKey, machineId] as const,
  ),
)

function sealedOwnerKey(key: string): string {
  const [sceneId, owner, channelOrSlot, behaviorOrHook] = key.split('/')
  if (!sceneId || !owner || !channelOrSlot)
    throw new Error(`cadence compatibility: owner key 无效 ${key}`)
  return behaviorOrHook
    ? `entity:${sceneId}:${owner}:${channelOrSlot}:${behaviorOrHook}`
    : `hook:${sceneId}:${owner}:${channelOrSlot}`
}

/**
 * Frozen test-only copy of compiler v1 lowering. It intentionally depends only on canonical
 * author types, not compiler v2 helpers or executable types, so K6 can detect a coordinated
 * implementation/golden drift rather than comparing compiler v2 with itself.
 */
function lowerCommandsV1(
  commands: readonly AuthorCommandV5[],
  timing: LegacyTimingV1,
): readonly unknown[] {
  const lower = (command: AuthorCommandV5): unknown => {
    const after = timing === 'auto' ? [{ kind: 'wait', ms: 100 }] : []
    switch (command.kind) {
      case 'stopScript':
        return { kind: 'stop', after }
      case 'branch':
        return {
          kind: 'branch',
          cond: structuredClone(command.cond),
          then: lowerCommandsV1(command.then, timing),
          else: lowerCommandsV1(command.else ?? [], timing),
          after,
        }
      case 'loop':
        return {
          kind: 'loop',
          mode: command.mode,
          cond: structuredClone(command.cond),
          body: lowerCommandsV1(command.body, timing),
          maxIterations: command.maxIterations,
          after,
        }
      case 'confirm':
        return {
          kind: 'confirm',
          ...(command.id === undefined ? {} : { id: command.id }),
          onNo: lowerCommandsV1(command.onNo, timing),
          after,
        }
      case 'startBattle': {
        const { kind: _kind, onLose, onFlee, ...request } = command
        return {
          kind: 'startBattle',
          request: structuredClone(request),
          ...(onLose === undefined ? {} : { onLose: lowerCommandsV1(onLose, timing) }),
          ...(onFlee === undefined ? {} : { onFlee: lowerCommandsV1(onFlee, timing) }),
          after,
        }
      }
      case 'teleportOut':
        return {
          kind: 'teleportOut',
          ...(command.onFail === undefined
            ? {}
            : { onFail: lowerCommandsV1(command.onFail, timing) }),
          after,
        }
      case 'callScript':
        return {
          kind: 'callScript',
          script: command.script,
          ...(command.self === undefined ? {} : { self: structuredClone(command.self) }),
          after,
        }
      default:
        return { kind: 'leaf', command: structuredClone(command), after }
    }
  }
  return commands.map(lower)
}

function lowerEntryV1(entry: AuthorSceneEntryPresentationV5, timing: LegacyTimingV1): unknown {
  return {
    prepare: lowerCommandsV1(entry.prepare, timing),
    reveal: structuredClone(entry.reveal),
  }
}

function lowerFlowV1(flow: ScriptFlowV5, timing: LegacyTimingV1): unknown {
  if (flow.kind === 'stages')
    return {
      kind: 'stages',
      initial: flow.initial,
      stages: flow.stages.map((stage) => ({
        id: stage.id,
        ...(stage.entry === undefined ? {} : { entry: lowerEntryV1(stage.entry, timing) }),
        body: lowerCommandsV1(stage.body, timing),
        ...(stage.next === undefined ? {} : { next: stage.next }),
      })),
    }
  return {
    kind: 'stateMachine',
    machine: {
      id: flow.machine.id,
      label: flow.machine.label,
      initial: flow.machine.initial,
      states: Object.fromEntries(
        Object.entries(flow.machine.states).map(([id, state]) => [
          id,
          {
            label: state.label,
            ...(state.entry === undefined ? {} : { entry: lowerEntryV1(state.entry, timing) }),
            body: lowerCommandsV1(state.body, timing),
            next: structuredClone(state.next),
          },
        ]),
      ),
    },
  }
}

function continueTargets(transition: StateTransitionV5): string[] {
  if (transition.kind === 'continue') return [transition.state]
  if (transition.kind === 'branch' || transition.kind === 'commandOutcome')
    return [...continueTargets(transition.then), ...continueTargets(transition.else)]
  return []
}

function machineContinueStats(
  flow: Extract<ScriptFlowV5, { kind: 'stateMachine' }>,
  key: string,
): { states: number; edges: number; longest: number } {
  const { states } = flow.machine
  const entries = Object.entries(states)
  const edges = entries.reduce((total, [, state]) => total + continueTargets(state.next).length, 0)
  const memo = new Map<string, number>()
  const active = new Set<string>()
  const visit = (stateId: string): number => {
    const cached = memo.get(stateId)
    if (cached !== undefined) return cached
    if (active.has(stateId)) throw new Error(`${key}: continue 图存在同步环，经过 state ${stateId}`)
    const state = states[stateId]
    if (!state) throw new Error(`${key}: continue 目标 state 不存在 ${stateId}`)
    active.add(stateId)
    let longest = 0
    for (const target of continueTargets(state.next)) longest = Math.max(longest, 1 + visit(target))
    active.delete(stateId)
    memo.set(stateId, longest)
    return longest
  }
  return {
    states: entries.length,
    edges,
    longest: entries.reduce((longest, [stateId]) => Math.max(longest, visit(stateId)), 0),
  }
}

function assertTransitionBoundaries(commands: readonly ExecutableCommandV5[], path: string): void {
  for (const [index, command] of commands.entries()) {
    const commandPath = `${path}/${index}/${command.kind}`
    expect(command.after, commandPath).toEqual([])
    if (command.kind === 'branch') {
      assertTransitionBoundaries(command.then, `${commandPath}/then`)
      assertTransitionBoundaries(command.else, `${commandPath}/else`)
    } else if (command.kind === 'loop') {
      assertTransitionBoundaries(command.body, `${commandPath}/body`)
    } else if (command.kind === 'confirm') {
      assertTransitionBoundaries(command.onNo, `${commandPath}/onNo`)
    } else if (command.kind === 'startBattle') {
      assertTransitionBoundaries(command.onLose ?? [], `${commandPath}/onLose`)
      assertTransitionBoundaries(command.onFlee ?? [], `${commandPath}/onFlee`)
    } else if (command.kind === 'teleportOut') {
      assertTransitionBoundaries(command.onFail ?? [], `${commandPath}/onFail`)
    }
  }
}

function assertTransitionYields(transition: StateTransitionV5, path: string): void {
  if (transition.kind === 'to') {
    expect(transition.yield, path).toBe('worldTick')
    return
  }
  if (transition.kind === 'branch' || transition.kind === 'commandOutcome') {
    assertTransitionYields(transition.then, `${path}/then`)
    assertTransitionYields(transition.else, `${path}/else`)
  }
}

describe('R13-1 PAL cadence compatibility', () => {
  test('all cadence-omitted flows retain their complete lowered payload', () => {
    const sceneIds = JSON.parse(readFileSync(resolve(sceneRoot, 'index.json'), 'utf8')) as string[]
    const rows: Array<{
      key: string
      timing: 'auto' | 'interactive'
      flow: unknown
    }> = []
    const legacyRows: typeof rows = []
    const loweringMismatches: string[] = []
    const envelopeMismatches: string[] = []
    let stages = 0
    let historicalMachines = 0
    let transitionMachines = 0
    let r13OneTransitionMachines = 0
    let r13TwoTransitionMachines = 0
    const continueStats = {
      historical: { machines: 0, states: 0, edges: 0, machinesWithContinue: 0, longest: 0 },
      transition: { machines: 0, states: 0, edges: 0, machinesWithContinue: 0, longest: 0 },
    }

    const add = (
      key: string,
      timing: 'auto' | 'interactive',
      flow: ScriptFlowV5,
      allowSceneEntry = false,
    ): void => {
      if (flow.kind === 'stateMachine') {
        const group =
          flow.machine.cadence === 'transition'
            ? continueStats.transition
            : continueStats.historical
        const stats = machineContinueStats(flow, key)
        group.machines++
        group.states += stats.states
        group.edges += stats.edges
        if (stats.edges > 0) group.machinesWithContinue++
        group.longest = Math.max(group.longest, stats.longest)
      }
      if (flow.kind === 'stateMachine' && flow.machine.cadence === 'transition') {
        transitionMachines++
        const r13OneMachineId = r13OneMachineIds.get(sealedOwnerKey(key))
        if (r13OneMachineId) {
          r13OneTransitionMachines++
          expect(flow.machine.id, key).toBe(r13OneMachineId)
        } else {
          r13TwoTransitionMachines++
          expect(flow.machine.id, key).toBe('machine')
        }
        const compiled = compileScriptFlowV5(flow, {
          canonicalContentDigest,
          timing,
          ...(allowSceneEntry ? { allowSceneEntry: true } : {}),
        })
        expect(compiled.boundaryPolicy, key).toBe('transition')
        if (compiled.flow.kind !== 'stateMachine')
          throw new Error(`${key}: transition cadence 未编译为状态机`)
        for (const [stateId, state] of Object.entries(compiled.flow.machine.states)) {
          assertTransitionBoundaries(state.entry?.prepare ?? [], `${key}/${stateId}/entry`)
          assertTransitionBoundaries(state.body, `${key}/${stateId}/body`)
          assertTransitionYields(state.next, `${key}/${stateId}/next`)
        }
        return
      }
      if (flow.kind === 'stages') stages++
      else {
        historicalMachines++
        expect(flow.machine.cadence).toBeUndefined()
      }
      const compiled = compileScriptFlowV5(flow, {
        canonicalContentDigest,
        timing,
        ...(allowSceneEntry ? { allowSceneEntry: true } : {}),
      })
      const legacy = lowerFlowV1(flow, timing)
      if (compiled.compilerVersion !== 2 || compiled.boundaryPolicy !== 'perCommand')
        envelopeMismatches.push(key)
      if (!isDeepStrictEqual(compiled.flow, legacy)) loweringMismatches.push(key)
      rows.push({
        key,
        timing,
        flow: compiled.flow,
      })
      legacyRows.push({ key, timing, flow: legacy })
    }

    for (const sceneId of sceneIds) {
      const scene = JSON.parse(
        readFileSync(resolve(sceneRoot, `${sceneId}.json`), 'utf8'),
      ) as SceneDefV5
      for (const entity of scene.entities) {
        for (const channel of ['trigger', 'auto'] as const) {
          for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.[channel] ?? {}))
            add(
              `${sceneId}/${entity.id}/${channel}/${behaviorId}`,
              channel === 'auto' ? 'auto' : 'interactive',
              behavior.flow,
            )
        }
      }
      for (const slot of ['onEnter', 'onTeleport'] as const) {
        for (const [hookId, hook] of Object.entries(scene.hooks?.[slot]?.variants ?? {}))
          add(`${sceneId}/${slot}/${hookId}`, 'interactive', hook.flow, slot === 'onEnter')
      }
    }

    rows.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
    legacyRows.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
    const bytes = stableJson(rows)
    const legacyBytes = stableJson(legacyRows)
    expect(envelopeMismatches).toEqual([])
    expect(loweringMismatches).toEqual([])
    expect(legacyBytes).toBe(bytes)
    expect({
      rows: rows.length,
      uniqueKeys: new Set(rows.map((row) => row.key)).size,
      stages,
      historicalMachines,
      transitionMachines,
      transitionFamilies: {
        r13One: r13OneTransitionMachines,
        r13Two: r13TwoTransitionMachines,
      },
      bytes: Buffer.byteLength(bytes),
      sha256: stableJsonSha256(rows),
    }).toEqual({
      rows: 4_576,
      uniqueKeys: 4_576,
      stages: 4_459,
      historicalMachines: 117,
      transitionMachines: 78,
      transitionFamilies: {
        r13One: 22,
        r13Two: 56,
      },
      // R13-6A 正式补入 22 个既有 schema source sites 后，flow 数量/边界不变。
      bytes: 7_950_872,
      sha256: '467e52b28a826e5b38e434e5d38db4988a75deb6c16dc5769eeb9d2d0ec61401',
    })
    expect({
      historical: continueStats.historical,
      transition: continueStats.transition,
      combined: {
        machines: continueStats.historical.machines + continueStats.transition.machines,
        states: continueStats.historical.states + continueStats.transition.states,
        edges: continueStats.historical.edges + continueStats.transition.edges,
        machinesWithContinue:
          continueStats.historical.machinesWithContinue +
          continueStats.transition.machinesWithContinue,
        longest: Math.max(continueStats.historical.longest, continueStats.transition.longest),
      },
    }).toEqual({
      historical: {
        machines: 117,
        states: 994,
        edges: 588,
        machinesWithContinue: 88,
        longest: 16,
      },
      transition: {
        machines: 78,
        states: 4_688,
        edges: 1_705,
        machinesWithContinue: 47,
        longest: 1,
      },
      combined: {
        machines: 195,
        states: 5_682,
        edges: 2_293,
        machinesWithContinue: 135,
        longest: 16,
      },
    })
  }, 120_000)
})
