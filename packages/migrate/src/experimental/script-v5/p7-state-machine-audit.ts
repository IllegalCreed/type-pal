import { p7OwnerKey } from './p7-canonical.js'
import type { P4AuthorOwnerIdentity, P5CycleStructure, ScriptMigrationIRP6 } from './types.js'

export interface P7StateMachineProjectionAudit {
  cycles: number
  states: number
  owners: number
  stageCountHistogram: Record<string, number>
  machineCountHistogram: Record<string, number>
  multiStageOwners: string[]
  multiStageEntries: number
  transitions: {
    bodyEnd: number
    condition: number
    conditionAtBodyEnd: number
    conditionMidBody: number
    commandOutcome: number
    commandOutcomeWithFollowingCommands: number
  }
  statesWithMultipleTransitions: number
  synchronousContinuationSites: number
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function histogram(values: readonly number[]): Record<string, number> {
  return Object.fromEntries(
    [
      ...values.reduce((result, value) => {
        increment(result, String(value))
        return result
      }, new Map<string, number>()),
    ].sort(([left], [right]) => Number(left) - Number(right)),
  )
}

function commandIndex(pointer: string, suffix: string, path: string): number {
  const match = new RegExp(`^/(\\d+)${suffix}$`).exec(pointer)
  if (!match) throw new Error(`${path}: unsupported transition pointer ${pointer}`)
  return Number(match[1])
}

function stateMachineProjection(cycle: P5CycleStructure) {
  if (cycle.authorProjection.kind !== 'state-machine')
    throw new Error(`${cycle.identity.cycleId}: expected state-machine projection`)
  return cycle.authorProjection
}

interface OwnerAudit {
  owner: P4AuthorOwnerIdentity
  stages: number
  machines: number
}

/**
 * Recomputes the P7 state-machine schema needs from P6 evidence.
 *
 * This is intentionally an audit, not a projector: P7 must not silently add scheduling
 * boundaries or discard command outcomes while the canonical transition schema is under review.
 */
export function auditP7StateMachineProjectionNeeds(
  ir: ScriptMigrationIRP6,
): P7StateMachineProjectionAudit {
  const ownerAllocations = new Map(ir.owners.map((owner) => [p7OwnerKey(owner.identity), owner]))
  const cycles = ir.cycleStructures.filter((cycle) => cycle.kind === 'state-machine')
  const owners = new Map<string, OwnerAudit>()
  let states = 0
  let bodyEnd = 0
  let condition = 0
  let conditionAtBodyEnd = 0
  let conditionMidBody = 0
  let commandOutcome = 0
  let commandOutcomeWithFollowingCommands = 0
  let statesWithMultipleTransitions = 0

  for (const cycle of cycles) {
    const projection = stateMachineProjection(cycle)
    states += projection.states.length
    const statesByLegacyId = new Map(
      projection.states.map((state) => [state.legacyScriptId, state]),
    )
    const transitionCountByState = new Map<string, number>()

    for (const transition of cycle.transitions) {
      increment(transitionCountByState, transition.from.legacyScriptId)
      const state = statesByLegacyId.get(transition.from.legacyScriptId)
      if (!state)
        throw new Error(
          `${cycle.identity.cycleId}:${transition.transitionId}: source state missing`,
        )
      if (transition.trigger.kind === 'body-end') {
        bodyEnd++
        continue
      }
      if (transition.trigger.kind === 'condition') {
        condition++
        const index = commandIndex(
          transition.sourcePointer,
          '/then/0',
          `${cycle.identity.cycleId}:${transition.transitionId}`,
        )
        if (index === state.body.length - 1) conditionAtBodyEnd++
        else conditionMidBody++
        continue
      }
      commandOutcome++
      const index = commandIndex(
        transition.sourcePointer,
        '/onNo/0',
        `${cycle.identity.cycleId}:${transition.transitionId}`,
      )
      if (index < state.body.length - 1) commandOutcomeWithFollowingCommands++
    }

    statesWithMultipleTransitions += [...transitionCountByState.values()].filter(
      (count) => count > 1,
    ).length

    for (const ownerIdentity of cycle.owners) {
      const key = p7OwnerKey(ownerIdentity)
      const allocation = ownerAllocations.get(key)
      if (!allocation) throw new Error(`${cycle.identity.cycleId}: owner missing ${key}`)
      const audit = owners.get(key) ?? {
        owner: ownerIdentity,
        stages: allocation.stages.length,
        machines: 0,
      }
      audit.machines++
      owners.set(key, audit)
    }
  }

  const ownerValues = [...owners.values()]
  const multiStageOwnerAudits = ownerValues.filter((owner) => owner.stages > 1)
  return {
    cycles: cycles.length,
    states,
    owners: owners.size,
    stageCountHistogram: histogram(ownerValues.map((owner) => owner.stages)),
    machineCountHistogram: histogram(ownerValues.map((owner) => owner.machines)),
    multiStageOwners: multiStageOwnerAudits.map((owner) => p7OwnerKey(owner.owner)).sort(),
    multiStageEntries: multiStageOwnerAudits.reduce((total, owner) => total + owner.stages, 0),
    transitions: {
      bodyEnd,
      condition,
      conditionAtBodyEnd,
      conditionMidBody,
      commandOutcome,
      commandOutcomeWithFollowingCommands,
    },
    statesWithMultipleTransitions,
    synchronousContinuationSites: conditionMidBody + commandOutcomeWithFollowingCommands,
  }
}
