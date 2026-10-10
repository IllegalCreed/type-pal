import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import actors from '../../projects/pal/content/actors.json' with { type: 'json' }
import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

// This is a bounded oracle for finite story runs, not a second script interpreter.
// New control flow needs an explicit path contract; it must never default to a leaf.
const leaves = new Set([
  'animEntity',
  'clearDialog',
  'dialog',
  'faceEntityToParty',
  'giveMoney',
  'moveEntity',
  'moveParty',
  'nudgeEntity',
  'nudgeParty',
  'playMusic',
  'playSound',
  'releaseEntity',
  'selectEntityBehavior',
  'selectEntityPage',
  'setActorSprite',
  'setActorAppearance',
  'setEntityPos',
  'setEntityPosRelParty',
  'selectSceneHooks',
  'giveItem',
  'loseItem',
  'setParty',
  'loadScene',
  'ditherScreen',
  'fade',
  'stopMusic',
  'runEntityTrigger',
  'mountParty',
  'ride',
  'setEntityFacing',
  'setEntityFrame',
  'setEntityState',
  'setEntityTriggerActivation',
  'setPartyFacing',
  'takeEntity',
  'stepEntity',
  'teleportParty',
  'wait',
])

function resolvedCue(cue) {
  const { identity, ...content } = cue
  assert(identity, 'execution contract: missing author dialogue identity')
  let resolved
  if (identity.kind === 'narration') resolved = {}
  else if (identity.kind === 'unbound') {
    const { kind: _kind, ...unbound } = identity
    resolved = unbound
  } else {
    assert.equal(identity.kind, 'actor', 'execution contract: unsupported dialogue identity')
    const actor = actors.find((a) => a.id === identity.actor)
    assert(actor, 'execution contract: unknown dialogue actor')
    resolved = { speaker: identity.speakerOverride ?? actor.name }
    if (identity.portrait) {
      const portrait = identity.portrait
      assert(['default', 'expression'].includes(portrait.kind), 'unsupported portrait selection')
      const asset =
        portrait.kind === 'default'
          ? actor.portraits?.default
          : actor.portraits?.expressions?.[portrait.expression]
      assert(asset, 'execution contract: missing authored portrait')
      resolved.portrait = { asset, ...(portrait.side === undefined ? {} : { side: portrait.side }) }
    }
  }
  return { ...resolved, ...content }
}

/** Audit the finite author path before recording, not only after a matching run is found. */
export function expectedScriptCommands(specification) {
  const { flow, stage: stageId = flow.initial, branches = {}, name } = specification
  const stage = flow.stages.find((s) => s.id === stageId)
  assert(stage, `${name}: execution contract lacks initial author stage`)
  return [
    ...expectedSequence(stage.entry?.prepare ?? [], [stage.id, 'entry', 'prepare'], branches),
    ...expectedSequence(stage.body, [stage.id], branches),
  ]
}

/** Independently project author data to the observed executable representation. */
export function executable(command) {
  if (command.kind === 'branch') {
    const { label: _label, ...branch } = command
    return {
      ...branch,
      then: command.then.map(executable),
      else: (command.else ?? []).map(executable),
    }
  }
  if (command.kind === 'repeat' || command.kind === 'loop') {
    const { label: _label, ...repeat } = command
    return { ...repeat, body: command.body.map(executable) }
  }
  if (['finishStep', 'returnScript', 'breakLoop', 'continueLoop'].includes(command.kind))
    return command
  assert(leaves.has(command.kind), `execution contract: unsupported command ${command.kind}`)
  return {
    kind: 'leaf',
    command: command.kind === 'dialog' ? { ...command, cue: resolvedCue(command.cue) } : command,
  }
}

function expectedSequence(body, prefix, branches) {
  return body.flatMap((command, i) => {
    const path = [...prefix, i]
    const entry = { path, command: executable(command) }
    if (command.kind === 'branch') {
      const arm = branches[JSON.stringify(path)]
      assert(
        ['then', 'else'].includes(arm),
        `execution contract: branch ${JSON.stringify(path)} requires an explicit path`,
      )
      return [entry, ...expectedSequence(command[arm] ?? [], [...path, 'branch'], branches)]
    }
    if (command.kind !== 'repeat') {
      assert(
        !['loop', 'breakLoop', 'continueLoop'].includes(command.kind),
        'execution contract: loop control requires its prefix contract',
      )
      assert(
        command.kind !== 'finishStep' || i === body.length - 1,
        'execution contract: early finish requires a path contract',
      )
      return [entry]
    }
    assert(
      Number.isSafeInteger(command.count) && command.count >= 0,
      'execution contract: invalid repeat count',
    )
    assert(
      !command.body.some((c) => c.kind === 'finishStep'),
      'execution contract: repeat with early finish requires a path contract',
    )
    return [
      entry,
      ...Array.from({ length: command.count }, () =>
        expectedSequence(command.body, [...path, 'body'], branches),
      ).flat(),
    ]
  })
}

/** Every specification is required exactly once, even if its whole run is absent from the trace. */
export function verifyFiniteScriptRuns(events, specifications) {
  const commands = events.filter((e) => e.phase === 'command')
  const claimed = new Set()
  return specifications.map(
    ({
      name,
      scene,
      self,
      timing,
      flow,
      stage: stageId = flow.initial,
      scope = 'flow',
      sceneVisit,
      author,
      branches = {},
    }) => {
      const stage = flow.stages.find((s) => s.id === stageId)
      assert(stage, `${name}: execution contract lacks initial author stage`)
      const owned = commands.filter(
        (e) =>
          e.scene === scene &&
          isDeepStrictEqual(e.occurrence?.self, self) &&
          e.occurrence?.timing === timing &&
          e.occurrence.scope === scope &&
          e.occurrence.path[0] === stageId &&
          (sceneVisit === undefined || e.sceneVisit === sceneVisit) &&
          (!author ||
            events.some(
              (start) =>
                start.phase === 'run-started' &&
                start.runId === e.runId &&
                Object.entries(author).every(([key, value]) =>
                  isDeepStrictEqual(start.author?.[key], value),
                ),
            )),
      )
      const ids = [...new Set(owned.map((e) => e.runId))]
      assert.equal(ids.length, 1, `${name}: required finite run missing/repeated`)
      const runId = ids[0]
      assert(Number.isSafeInteger(runId) && runId > 0, `${name}: missing run identity`)
      assert(!claimed.has(runId), `${name}: same run claimed by multiple contracts`)
      claimed.add(runId)
      // Read ALL commands with this runId, so a changed owner cannot hide an interior command.
      const run = commands.filter((e) => e.runId === runId)
      const expected = expectedScriptCommands({ flow, stage: stageId, branches, name })
      const proof = checkTransitionTrace(
        {
          id: 'finite-author-execution/v1',
          initial: { pc: 0, order: -1, occurrences: [] },
          transitions: {
            execute: (s, { receipt: e }) => {
              const o = e.occurrence
              const context = {
                engine: e.engine,
                scene: e.scene,
                visit: e.sceneVisit,
                self: o.self,
                timing: o.timing,
                scope: o.scope,
              }
              const expectedContext = {
                engine: 'reforge',
                scene,
                visit: run[0].sceneVisit,
                self,
                timing,
                scope,
              }
              requireTrace(
                Number.isSafeInteger(e.sceneVisit) &&
                  e.sceneVisit > 0 &&
                  isDeepStrictEqual(context, expectedContext),
                'execution-context',
                expectedContext,
                context,
              )
              requireTrace(
                Number.isSafeInteger(e.order) && e.order > s.order,
                'execution-order',
                `> ${s.order}`,
                e.order,
              )
              requireTrace(
                Number.isSafeInteger(o.id) && o.id > 0 && !s.occurrences.includes(o.id),
                'execution-identity',
                'fresh positive occurrence',
                o.id,
              )
              const actual = { path: o.path, command: o.command }
              requireTrace(
                isDeepStrictEqual(actual, expected[s.pc]),
                'execution-transition',
                expected[s.pc],
                actual,
              )
              return { pc: s.pc + 1, order: e.order, occurrences: [...s.occurrences, o.id] }
            },
          },
          accept: (s) =>
            requireTrace(s.pc === expected.length, 'execution-complete', expected.length, s.pc),
        },
        run.map((receipt) => ({ type: 'execute', receipt })),
      )
      assert.equal(proof.status, 'proved', `${name}: ${JSON.stringify(proof.witness)}`)
      return {
        name,
        runId,
        scene,
        self,
        timing,
        commands: run.length,
        stage,
        occurrences: run,
        command: run.at(-1),
        proof: { model: proof.model, checked: proof.checked },
      }
    },
  )
}
