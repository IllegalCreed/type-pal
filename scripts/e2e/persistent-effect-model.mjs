import { isDeepStrictEqual as same } from 'node:util'
import actors from '../../projects/pal/content/actors.json' with { type: 'json' }
import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

const key = (scene, entity) => `${scene}/${entity}`
const selected = (value) => (value?.kind === 'inherit' ? null : value)

/** Static overrides, not internal cursor identity. Inherit removes the override;
 * resolving an inherited effective behavior remains the canonical world's responsibility.
 * A page change clears all channel/activation overrides, including dormant ones.
 */
export function persistentEffect(command) {
  switch (command?.kind) {
    case 'giveMoney':
      return { money: { delta: command.delta } }
    case 'giveItem':
    case 'loseItem':
      return {
        [`item:${command.itemId}`]: {
          delta: (command.count ?? 1) * (command.kind === 'loseItem' ? -1 : 1),
        },
      }
    case 'playMusic':
      return { music: command.asset }
    case 'stopMusic':
      return { music: null }
    case 'setActorAppearance':
      return Object.fromEntries(
        ['spriteId', 'portrait', 'battleSprite']
          .filter((field) => command[field] !== undefined)
          .map((field) => [`appearance:${JSON.stringify([command.actor, field])}`, command[field]]),
      )
    case 'setParty':
      return { party: command.members, reserve: command.members, learnedSkills: command.members }
    case 'setEntityState':
      return { state: command.state }
    case 'setEntityPos':
      return { position: command.pos }
    case 'moveEntity':
      return { position: command.to }
    case 'setEntityPosRelParty':
      return { position: { relative: true, dcol: command.dcol, drow: command.drow } }
    case 'selectSceneHooks':
      return Object.fromEntries(
        Object.entries(command.selection).map(([slot, value]) => [`hook:${slot}`, selected(value)]),
      )
    case 'selectEntityBehavior':
      return { [command.channel]: selected(command.selection) }
    case 'setEntityTriggerActivation':
      return { activation: selected(command.selection) }
    case 'selectEntityPage':
      return {
        page: command.selection.kind === 'inherit' ? null : command.selection.value,
        trigger: null,
        auto: null,
        activation: null,
      }
    default:
      return null
  }
}

function observedField(world, target, field) {
  if (['party', 'reserve', 'learnedSkills'].includes(field)) return world[field]
  if (field === 'money') return world.money
  if (field === 'music') return world.audio?.currentMusic ?? null
  if (field.startsWith('item:'))
    return Array.isArray(world.inventory)
      ? (world.inventory.find((item) => item.itemId === field.slice(5))?.count ?? 0)
      : undefined
  if (field.startsWith('appearance:')) {
    const [actor, property] = JSON.parse(field.slice(11))
    return world.party?.find((member) => member.template === actor)?.appearance?.[property]
  }
  const script = world.script
  if (field === 'state') return script.entityState?.[target.scene]?.[target.entity]
  if (field === 'position') return script.entityPos?.[target.scene]?.[target.entity]
  if (field.startsWith('hook:'))
    return script.behaviors?.scenes?.[target.scene]?.[field.slice(5)]?.selection ?? null
  const behavior = script.behaviors?.entities?.[target.scene]?.[target.entity]
  return field === 'page'
    ? (behavior?.page ?? null)
    : field === 'activation'
      ? (behavior?.triggerActivation ?? null)
      : (behavior?.[field]?.selection ?? null)
}

/** Preserve every existing instance; only genuinely new templates get authored factory state. */
function partyFields(before, members) {
  requireTrace(
    Array.isArray(before?.party) && before.learnedSkills,
    'party-effect-input',
    'actual party/reserve/learned skills',
    before,
    'unknown',
  )
  const pool = new Map(
    [...(before.reserve ?? []), ...before.party].map((actor) => [actor.template, actor]),
  )
  const learnedSkills = structuredClone(before.learnedSkills)
  const party = members.map((id) => {
    const kept = pool.get(id)
    if (kept) return kept
    const definition = actors.find((a) => a.id === id)?.battler
    requireTrace(definition, 'party-template', 'canonical battler template', id, 'unknown')
    if (!Object.hasOwn(learnedSkills, id)) learnedSkills[id] = [...definition.initialMagic]
    return {
      id,
      template: id,
      ...definition.baseStats,
      exp: 0,
      equipment: { ...definition.initialEquipment },
      tags: [],
    }
  })
  const reserve = [...before.party, ...(before.reserve ?? [])].filter(
    (actor) => !members.includes(actor.template),
  )
  return { party, reserve, learnedSkills }
}

const targetOf = (command) =>
  command.target ?? (command.scene ? { scene: command.scene } : { world: true })

// Include every writer of these canonical fields, not just commands whose values
// this bounded model can calculate. A long move may start before our obligation.
function writeFootprints(command) {
  if (command?.kind === 'setMultiEntityState')
    return command.targets.map((target) => ({ target, fields: ['state'] }))
  if (['moveEntity', 'setEntityPosRelParty'].includes(command?.kind))
    return [{ target: command.target, fields: ['position'] }]
  const effect = persistentEffect(command)
  return effect ? [{ target: targetOf(command), fields: Object.keys(effect) }] : []
}

/** Every write must take effect by its own invocation's next command/settlement.
 * Off-scene targets are read from the actual complete world, not guessed on scene return.
 * Independent invocations may interleave; a competing unobserved write stays unknown.
 */
export function checkPersistentEffects(trace, participants) {
  const causes = [...(trace.initialCauses ?? []), ...(trace.causes ?? [])].sort(
    (a, b) => a.order - b.order,
  )
  const writes = (trace.causes ?? []).filter(
    (e) => e.phase === 'command' && persistentEffect(e.occurrence?.command?.command),
  )
  const nextBoundary = (start) =>
    causes.find(
      (e) =>
        e.order > start.order &&
        e.runId === start.runId &&
        (['command', 'stage-settled', 'run-ended'].includes(e.phase) ||
          (e.phase === 'leaf-completed' &&
            e.source === 'script-runner-core' &&
            e.occurrence?.id === start.occurrence.id)),
    )
  const writers = causes
    .filter((e) => e.phase === 'command')
    .flatMap((e) =>
      writeFootprints(e.occurrence?.command?.command).map((footprint) => ({
        ...footprint,
        start: e,
        end: nextBoundary(e)?.order ?? Infinity,
      })),
    )
  const proof = checkTransitionTrace(
    {
      id: 'persistent-effects-own-deadline/v2',
      initial: { commands: 0, checked: 0, witnesses: [], motionPrefixes: [] },
      transitions: {
        obligation: (state, { command: start }) => {
          const command = start.occurrence.command.command,
            effect = persistentEffect(command),
            target = targetOf(command)
          requireTrace(
            Number.isSafeInteger(start.runId) && Number.isSafeInteger(start.occurrence.id),
            'effect-command-identity',
            'run and occurrence IDs',
            start,
            'unknown',
          )
          const deadline = nextBoundary(start)
          if (command.kind === 'moveEntity') {
            const receipts = causes.filter(
              (e) =>
                e.runId === start.runId &&
                e.occurrence?.id === start.occurrence.id &&
                e.phase.startsWith('move-') &&
                e.order > start.order &&
                e.order <= (deadline?.order ?? Infinity),
            )
            requireTrace(
              receipts.every(
                (e) => e.source === 'script-project-core' && same(e.moveCommand, command),
              ),
              'move-receipt-binding',
              command,
              receipts,
            )
            const commit = receipts.find((e) => e.phase === 'move-commit')
            const ended = receipts.find((e) => e.phase === 'move-end')
            const expectedPhases = [
              'move-start',
              ...(commit ? ['move-commit'] : []),
              ...(ended || deadline ? ['move-end'] : []),
            ]
            requireTrace(
              same(
                receipts.map((e) => e.phase),
                expectedPhases,
              ),
              'move-transaction-evidence',
              expectedPhases,
              receipts.map((e) => e.phase),
              'unknown',
            )
            if (ended)
              requireTrace(
                ended.committed === !!commit,
                'move-commit-receipt',
                !!commit,
                ended.committed,
              )
            if (commit) {
              requireTrace(
                commit.worldSource === 'observe:causal' && commit.world?.script,
                'move-commit-world',
                'actual post-commit world',
                commit.world,
                'unknown',
              )
              requireTrace(
                same(observedField(commit.world, target, 'position'), command.to),
                'move-committed-endpoint',
                command.to,
                observedField(commit.world, target, 'position'),
              )
              for (const checkpoint of [ended, deadline].filter(Boolean)) {
                const competition = writers.find(
                  (writer) =>
                    writer.start.runId !== start.runId &&
                    writer.start.order < checkpoint.order &&
                    writer.end > commit.order &&
                    same(writer.target, target) &&
                    writer.fields.includes('position'),
                )
                requireTrace(
                  !competition,
                  'effect-competing-write',
                  'unambiguous committed endpoint retention',
                  competition?.start.order,
                  'unknown',
                )
                requireTrace(
                  checkpoint.worldSource === 'observe:causal' && checkpoint.world?.script,
                  'move-retention-world',
                  'actual post-commit checkpoint',
                  checkpoint.order,
                  'unknown',
                )
                requireTrace(
                  same(observedField(checkpoint.world, target, 'position'), command.to),
                  'move-endpoint-retained',
                  command.to,
                  observedField(checkpoint.world, target, 'position'),
                )
              }
              state.checked++
              state.witnesses.push({
                runId: start.runId,
                occurrence: start.occurrence.id,
                command: start.order,
                target,
                field: 'position',
                deadline: commit.order,
                observed: commit.order,
              })
              state.commands++
              return state
            } else {
              const last = causes.at(-1)
              const active = last?.lifecycle?.activations?.find(
                (a) => a.activityId === start.activityId && !a.aborted,
              )
              requireTrace(
                (ended?.aborted && deadline?.aborted) || (!ended && !deadline && active),
                'moving-prefix-lifetime',
                'observed cancellation or still-live automatic activation',
                { deadline: deadline?.order, active },
                'unknown',
              )
              state.motionPrefixes.push({
                command: start.order,
                runId: start.runId,
                status: deadline ? 'cancelled' : 'ongoing',
              })
              state.commands++
              return state
            }
          }
          requireTrace(
            deadline,
            'effect-deadline-present',
            'next own command or terminal',
            start.order,
            'unknown',
          )
          requireTrace(
            deadline.world?.script && deadline.worldSource === 'observe:causal',
            'effect-deadline-observation',
            'fresh actual whole-world snapshot',
            deadline.order,
            'unknown',
          )
          const observations = causes.filter(
            (e) =>
              e.order > start.order &&
              e.order <= deadline.order &&
              e.world?.script &&
              e.worldSource === 'observe:causal',
          )
          for (const [field, value] of Object.entries(effect)) {
            let expected = value
            if (command.kind === 'setParty')
              expected = partyFields(start.world, command.members)[field]
            if (field === 'position' && value.relative) {
              const party = start.poses?.party?.state?.position,
                entity = start.poses?.[command.target.entity]?.state?.position
              requireTrace(
                command.target.scene === start.scene &&
                  Array.isArray(party) &&
                  party.length === 3 &&
                  party.every(Number.isFinite) &&
                  Array.isArray(entity) &&
                  entity.length === 3,
                'relative-position-input',
                'actual same-scene party and entity coordinates',
                { party, entity },
                'unknown',
              )
              expected = {
                col: party[0] + value.dcol,
                row: party[1] + value.drow,
                height: entity[2],
              }
            }
            if (field === 'money' || field.startsWith('item:')) {
              const before =
                start.worldSource === 'observe:causal' && start.world
                  ? observedField(start.world, target, field)
                  : undefined
              requireTrace(
                Number.isSafeInteger(before) && before >= 0,
                'relative-effect-input',
                'actual pre-command amount',
                { field, before },
                'unknown',
              )
              if (field.startsWith('item:') && value.delta < 0)
                requireTrace(
                  before + value.delta >= 0,
                  'inventory-only-removal',
                  'backpack has the full amount; equipped-item removal needs its own model',
                  before,
                  'unknown',
                )
              expected = Math.max(0, before + value.delta)
            }
            const witness = observations.find((e) =>
              same(observedField(e.world, target, field), expected),
            )
            // A different invocation cannot supply this command's evidence. Check
            // this even when its write happens to produce exactly our expected value.
            const competition = writers.find(
              (writer) =>
                writer.start.runId !== start.runId &&
                writer.start.order < (witness ?? deadline).order &&
                writer.end > start.order &&
                same(writer.target, target) &&
                writer.fields.includes(field),
            )
            requireTrace(
              !competition,
              'effect-competing-write',
              'unambiguous own-command observation before competing overwrite',
              { command: start.order, competitor: competition?.start.order, target, field },
              'unknown',
            )
            if (!witness) {
              requireTrace(
                ['command', 'leaf-completed'].includes(deadline.phase) ||
                  (deadline.phase === 'stage-settled' && deadline.decision === 'continue'),
                'effect-uncompleted-prefix',
                'next command or normally settled stage',
                { command: start.order, deadline: deadline.order, phase: deadline.phase },
                'unknown',
              )
              requireTrace(
                false,
                'persistent-effect-deadline',
                { target, field, value: expected, deadline: deadline.order },
                {
                  command: start.order,
                  value: observedField(deadline.world, target, field),
                },
              )
            }
            state.checked++
            state.witnesses.push({
              runId: start.runId,
              occurrence: start.occurrence.id,
              command: start.order,
              target,
              field,
              deadline: deadline.order,
              observed: witness.order,
            })
          }
          state.commands++
          return state
        },
      },
      accept: () => {},
    },
    writes.map((command) => ({ type: 'obligation', command })),
  )
  if (proof.status !== 'proved') return proof
  const missing = participants
    .filter(
      (p) =>
        !(trace.events ?? trace.actors ?? []).some(
          (e) =>
            e.kind === 'actor' &&
            e.scene === p.scene &&
            e.id === p.entity &&
            Number.isInteger(e.state.state),
        ),
    )
    .map((p) => ({
      target: key(p.scene, p.entity),
      field: 'state',
      reason: 'numeric state absent; visibility cannot prove collision state',
    }))
  return {
    model: proof.model,
    status: missing.length ? 'unknown' : 'proved',
    commands: proof.final.commands,
    checked: proof.final.checked,
    witnesses: proof.final.witnesses,
    motionPrefixes: proof.final.motionPrefixes,
    missing,
  }
}
