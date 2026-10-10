import assert from 'node:assert/strict'
import objects from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import {
  authoredAutomaticLanguage,
  compareAutomaticLanguages,
  sourceAutomaticLanguage,
} from './automatic-language-contract.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'
import { checkLoopControl } from './loop-control-contract.mjs'

// Explicit source/canonical correspondences, not exemptions from any observed field.
// Initial source entries come from the original EventObject table. e88 is installed
// by e87's source 0x24; that actual setter is separately required by gameCycles.
export const AUTOMATIC_LANGUAGE_BINDINGS = Object.freeze([
  ...[85, 86, 87, 89, 90, 91, 92, 93].map((id) => ({
    scene: 's004',
    entity: `e${id}`,
    channel: 'auto',
    behavior: 'default',
  })),
  { scene: 's004', entity: 'e88', channel: 'auto', behavior: 'legacy-001' },
  ...[116, 121, 122].map((id) => ({
    scene: 's005',
    entity: `e${id}`,
    channel: 'auto',
    behavior: 'default',
  })),
])

export function automaticLanguageGraphs(binding) {
  const commands = original.segments[0].commands,
    installed = commands.filter(
      (command) =>
        command.op === 'raw' &&
        command.opcode === 0x24 &&
        command.operands[0] === 89 &&
        command.operands[1] === 840,
    )
  assert(installed.length, 'dynamic automatic entry has no original setter')
  const selections = [
      {
        actor: 88,
        label: 840,
        behavior: 'legacy-001',
        target: { scene: 's004', entity: 'e88' },
      },
    ],
    id = Number(binding.entity.slice(1)),
    label =
      id === 88 ? 'L_840' : objects.eventObjects.find((object) => object.id === id)?.autoLabel,
    entry = commands.findIndex((command) => command.label === label),
    flow = canonicalScenes[binding.scene]?.entities.find((entity) => entity.id === binding.entity)
      ?.behaviors?.auto?.[binding.behavior]?.flow,
    stage = flow?.stages.find((stage) => stage.id === flow.initial),
    self = { scene: binding.scene, entity: binding.entity },
    inputs = { self: id + 1, selections }
  assert(entry >= 0 && stage, 'automatic language lacks primary entry/canonical initial stage')
  const source = sourceAutomaticLanguage(commands, entry, inputs),
    authored = authoredAutomaticLanguage(stage.body, self, inputs)
  return {
    source,
    authored,
    label,
    stage: stage.id,
    proof: compareAutomaticLanguages(source, authored),
  }
}

export function verifyBoundAutomaticRuns(trace, bindings, scenes = canonicalScenes) {
  const starts = trace.causes.filter(
    (event) =>
      event.phase === 'run-started' &&
      event.author?.kind === 'entity-behavior' &&
      bindings.some((binding) =>
        ['scene', 'entity', 'channel', 'behavior'].every(
          (key) => event.author[key] === binding[key],
        ),
      ),
  )
  for (const start of starts) {
    const binding = bindings.find((binding) =>
      ['scene', 'entity', 'channel', 'behavior'].every((key) => start.author[key] === binding[key]),
    )
    assert.equal(start.stage, binding.stage, 'automatic language run uses an unproved stage')
  }
  const control = checkLoopControl(trace, scenes, { requiredAuthors: bindings })
  assert.equal(control.status, 'proved', `automatic language control: ${control.witness?.rule}`)
  return { starts, control }
}

export function verifyBoundSourceCalls(
  trace,
  binding,
  graphs,
  cycles,
  commands = original.segments[0].commands,
) {
  const domain = new Set(graphs.source.nodes.map((node) => node.ip).filter(Number.isInteger)),
    result = []
  for (const call of cycles.filter(
    (call) => call.scene === binding.scene && call.actor === binding.entity,
  )) {
    const before = trace.causes.find((event) => event.order === call.from),
      after = trace.causes.find((event) => event.order === call.to)
    assert(
      before?.phase === 'auto-before' &&
        after?.phase === 'auto-step' &&
        before.autoCallId === after.autoCallId &&
        before.sceneVisit === call.sceneVisit,
      'automatic language source proof is detached from actual call',
    )
    const label = before.poses?.[binding.entity]?.state?.auto
    if (label !== graphs.label) {
      const installed = trace.causes.findLast(
        (event) =>
          event.phase === 'auto-selection-committed' &&
          event.entity === Number(binding.entity.slice(1)) &&
          event.order < before.order,
      )
      assert(
        label && installed?.label === label && installed.cursor,
        'automatic language source selection lacks actual installation',
      )
      const entry = commands.findIndex((command) => command.label === label),
        target = Number(binding.entity.slice(1))
      assert(entry >= 0, 'automatic language installation has no primary entry')
      assert.equal(
        installed.entry,
        Number(label.slice(2)),
        'automatic language installation entry differs',
      )
      assert.equal(installed.operand, target + 1, 'automatic language installation operand differs')
      assert.deepEqual(
        installed.cursor,
        { ip: entry },
        'automatic language installation cursor differs',
      )
      // A proven different installation is outside THIS source/canonical binding.
      // It keeps the enclosing source-cycle and pose duties; an escaped ip is not one.
      continue
    }
    assert(
      domain.has(call.before.ip) && call.commands.every((ip) => domain.has(ip)),
      'automatic call escapes proved source graph',
    )
    result.push({
      sceneVisit: call.sceneVisit,
      from: call.from,
      to: call.to,
      commands: call.commands,
    })
  }
  return result
}

/** Compose proofs made from this same raw prefix in the formal presentation caller.
 * Static language equality cannot substitute for actual run words, first eligible
 * motion slots, waits, source commits or each world draw. Persistent/ownership effects
 * remain mandatory in the enclosing acceptance, including disabled->use restart.
 */
export function verifyAutomaticWaitReceipt(event, trace, receipts) {
  const wait = receipts.waits.find(
    (receipt) => receipt.runId === event.runId && receipt.occurrence === event.occurrence.id,
  )
  if (!wait) {
    const matches = (receipts.handoffs?.consumed ?? []).filter(
      (receipt) =>
        receipt.runId === event.runId &&
        receipt.occurrence?.id === event.occurrence.id &&
        receipt.scene === event.scene &&
        receipt.sceneVisit === event.sceneVisit &&
        receipt.entity === event.occurrence.self.entity &&
        receipt.kind === 'command' &&
        receipt.durationMs === event.occurrence.command.command.ms &&
        receipt.remainingMs === 0 &&
        receipt.waitId === null &&
        Number.isSafeInteger(receipt.immediateId) &&
        receipt.order > event.order &&
        trace.causes.some(
          (actual) =>
            actual.phase === 'runtime-wait-consumed' &&
            actual.order === receipt.order &&
            actual.immediateId === receipt.immediateId &&
            actual.runId === event.runId &&
            actual.occurrence?.id === event.occurrence.id &&
            actual.sceneVisit === event.sceneVisit &&
            actual.remainingMs === 0,
        ),
    )
    assert.equal(matches.length, 1, 'automatic language wait lacks own verified zero remainder')
    const consumed = matches[0],
      completions = trace.causes.filter(
        (receipt) =>
          receipt.phase === 'leaf-completed' &&
          receipt.runId === event.runId &&
          receipt.occurrence?.id === event.occurrence.id &&
          receipt.sceneVisit === event.sceneVisit &&
          receipt.order > consumed.order,
      )
    assert.equal(completions.length, 1, 'zero remainder lacks actual completion')
    assert(
      !(trace.worldRenders ?? []).some(
        (draw) => draw.order > consumed.order && draw.order < completions[0].order,
      ),
      'zero remainder bought an unexplained draw',
    )
    return consumed.order
  }
  assert(
    wait &&
      trace.causes.some(
        (receipt) => receipt.order === wait.start && receipt.sceneVisit === event.sceneVisit,
      ),
    'automatic language wait lacks own receipt',
  )
  return wait.start
}

export function verifyAutomaticSourceDraws(game, binding, proofs) {
  const draws = game.worldRenders.filter(
    (draw) =>
      draw.scene === binding.scene &&
      draw.order > game.renderScope.afterOrder &&
      draw.order <= game.renderScope.throughOrder,
  )
  const matches = proofs.filter(
    (proof) =>
      proof.id === binding.entity &&
      proof.scene === binding.scene &&
      proof.draws === draws.length &&
      proof.drawBindings?.length === draws.length &&
      proof.first === (proof.drawBindings[0]?.actorOrder ?? null) &&
      proof.last === (proof.drawBindings.at(-1)?.actorOrder ?? null) &&
      draws.every((draw, index) =>
        ['order', 'renderId', 'sceneVisit'].every(
          (key) => draw[key] === proof.drawBindings[index][key],
        ),
      ),
  )
  assert.equal(matches.length, 1, 'automatic language lacks source actual draw proof')
  return draws.map(({ order, renderId, sceneVisit }) => ({ order, renderId, sceneVisit }))
}

export function verifyAutomaticLanguageReceipts(game, reforge, participants, receipts) {
  const bindings = AUTOMATIC_LANGUAGE_BINDINGS.filter((binding) =>
    participants.some((actor) => actor.scene === binding.scene && actor.entity === binding.entity),
  )
  return verifyAutomaticBindings(game, reforge, bindings, receipts, automaticLanguageGraphs)
}

export function verifyAutomaticBindings(game, reforge, bindings, receipts, graphsForBinding) {
  if (!bindings.length) return { status: 'proved', bindings: [] }
  const graphsByBinding = bindings.map((binding) => ({
      binding,
      graphs: graphsForBinding(binding),
    })),
    { starts: allStarts, control } = verifyBoundAutomaticRuns(
      reforge,
      graphsByBinding.map(({ binding, graphs }) => ({ ...binding, stage: graphs.stage })),
    )
  for (const field of ['motion', 'waits', 'gameCycles', 'gamePresentation'])
    assert(Array.isArray(receipts[field]), `automatic language lacks actual ${field} proof`)
  assert(
    receipts.slots?.slots instanceof Map && receipts.presentation?.draws,
    'automatic language lacks actual slot/draw proof',
  )
  const causes = reforge.causes,
    result = []
  for (const binding of bindings) {
    const graphs = graphsByBinding.find((entry) => entry.binding === binding).graphs,
      sourceCalls = verifyBoundSourceCalls(game, binding, graphs, receipts.gameCycles),
      starts = allStarts.filter((event) =>
        ['scene', 'entity', 'channel', 'behavior'].every(
          (key) => event.author[key] === binding[key],
        ),
      )
    // A different selected behavior is outside this correspondence; its normal
    // caller/pose/execution contracts still apply. No unobserved run gets credit.
    if (!sourceCalls.length && !starts.length) continue
    assert(sourceCalls.length && starts.length, 'automatic language lacks one engine execution')
    const runs = starts.map((start) => {
      const word = control.final.runs.find((run) => run.runId === start.runId)
      assert(word, 'automatic language run lacks canonical control word')
      const leaves = causes.filter(
          (event) =>
            event.phase === 'command' &&
            event.runId === start.runId &&
            event.occurrence?.command?.kind === 'leaf',
        ),
        linked = leaves.map((event) => {
          const command = event.occurrence.command.command,
            completed = causes.find(
              (end) =>
                end.phase === 'leaf-completed' &&
                end.runId === event.runId &&
                end.occurrence?.id === event.occurrence.id,
            )
          assert(
            event.sceneVisit === start.sceneVisit && event.scene === binding.scene,
            'automatic language command borrowed another scene visit',
          )
          if (completed)
            assert(
              completed.sceneVisit === event.sceneVisit,
              'automatic language completion borrowed another scene visit',
            )
          let slot = null,
            wait = null
          if (command.kind === 'stepEntity') {
            const motion = receipts.motion.find(
              (route) =>
                route.registration.runId === event.runId &&
                route.registration.occurrence.id === event.occurrence.id &&
                route.sceneVisit === event.sceneVisit,
            )
            const drop = receipts.slots.dropped.find(
              (receipt) =>
                receipt.runId === event.runId &&
                receipt.occurrence.id === event.occurrence.id &&
                receipt.sceneVisit === event.sceneVisit,
            )
            const resumed = receipts.motion.resumedOneShots?.find(
              (receipt) =>
                receipt.runId === event.runId &&
                receipt.occurrence === event.occurrence.id &&
                receipt.sceneVisit === event.sceneVisit,
            )
            assert(motion || drop || resumed, 'automatic language step lacks actual motion receipt')
            slot = motion?.slotId ?? (resumed ? { resumedOneShot: resumed } : 'droppedByAuthority')
          } else if (command.kind === 'wait') {
            wait = verifyAutomaticWaitReceipt(event, reforge, receipts)
          }
          return {
            command: event.order,
            occurrence: event.occurrence.id,
            completed: completed?.order ?? null,
            slot,
            wait,
          }
        })
      return {
        runId: start.runId,
        sceneVisit: start.sceneVisit,
        outcome: word.outcome,
        leaves: linked,
      }
    })
    const draws = reforge.worldRenders.filter(
      (draw) =>
        draw.scene === binding.scene &&
        draw.order > reforge.renderScope.afterOrder &&
        draw.order <= reforge.renderScope.throughOrder,
    )
    for (const draw of draws)
      assert(
        receipts.presentation.draws.some(
          (proof) =>
            proof.order === draw.order &&
            proof.renderId === draw.renderId &&
            proof.actors.includes(binding.entity),
        ),
        'automatic language lacks same-window actual draw proof',
      )
    const gameDraws = verifyAutomaticSourceDraws(game, binding, receipts.gamePresentation)
    result.push({
      ...binding,
      source: graphs.label,
      stage: graphs.stage,
      pairs: graphs.proof.pairs,
      sourceCalls,
      gameDraws,
      runs,
      draws: draws.map(({ order, renderId, sceneVisit }) => ({ order, renderId, sceneVisit })),
    })
  }
  return { status: 'proved', bindings: result }
}
