import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import { canonicalScenes } from './entity-action-contract.mjs'
import { executable } from './script-execution-contract.mjs'
import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

// A language-membership proof, independent of the runner. Chance has a set of legal
// outcomes; no RNG sample/distribution claim. Unknown syntax is never a silent leaf.
function conditions(condition, world) {
  if (condition.kind === 'chance')
    return [false, true].filter((value) =>
      value ? condition.percent > 0 : condition.percent < 100,
    )
  if (condition.kind === 'not') return conditions(condition.cond, world).map((v) => !v)
  if (condition.kind === 'entityState') {
    assert(world?.script?.entityState, 'loop condition lacks actual world state')
    return [
      (world.script.entityState[condition.target.scene]?.[condition.target.entity] ??
        Number.NaN) === condition.is,
    ]
  }
  throw new Error(`unsupported loop condition ${condition.kind}`)
}

const containsLoop = (body) =>
  body.some(
    (c) =>
      ['loop', 'breakLoop', 'continueLoop'].includes(c.kind) ||
      (c.body && containsLoop(c.body)) ||
      (c.then && containsLoop(c.then)) ||
      (c.else && containsLoop(c.else)),
  )
const copy = (state) => ({
  ...state,
  stack: state.stack.map((frame) => ({ ...frame })),
  resume: [...state.resume],
})
function sequence(state, body, path, arm = null) {
  const frame = state.resume.shift() ?? { index: 0 }
  assert(
    Number.isSafeInteger(frame.index) && frame.index >= 0 && frame.index <= body.length,
    'loop resume index outside canonical body',
  )
  state.stack.push({
    type: 'sequence',
    body,
    path,
    arm,
    index: frame.index,
    control: frame.control,
  })
}
function cursor(exit, stage) {
  return exit?.kind === 'complete'
    ? { kind: 'completed' }
    : { kind: 'stage', stage: typeof exit === 'string' ? exit : (exit?.stage ?? stage) }
}

// Epsilon transitions only unwind bodies / start the next iteration. Structural
// loop commands are dispatched once on entry, not again at each iteration.
function frontier(states) {
  const result = []
  for (const input of states) {
    const state = copy(input)
    let settled = false
    for (let budget = 0; budget < 1024; budget++) {
      const top = state.stack.at(-1)
      if (!top || (top.type === 'sequence' && top.index < top.body.length)) {
        result.push(state)
        settled = true
        break
      }
      if (top.type === 'sequence') {
        assert(!top.control, 'ended resume frame has control')
        state.stack.pop()
      } else {
        if (top.phase === 'after') {
          if (top.command.kind === 'repeat' && top.iteration >= top.command.count) {
            state.stack.pop()
            continue
          }
          top.iteration++
        }
        top.phase = 'after'
        sequence(state, top.command.body, [...top.path, 'body'])
      }
    }
    assert(settled, 'loop epsilon budget exceeded')
  }
  const key = (state) =>
    JSON.stringify({
      stack: state.stack.map(({ type, path, arm, index, control, iteration, phase }) => ({
        type,
        path,
        arm,
        index,
        control,
        iteration,
        phase,
      })),
      resume: state.resume,
      exit: state.exit,
    })
  return [...new Map(result.map((state) => [key(state), state])).values()]
}

function dispatch(state, event, project) {
  const top = state.stack.at(-1)
  if (!top || top.type !== 'sequence') return []
  const command = top.body[top.index],
    path = [...top.path, top.index]
  if (
    !same(
      { path, command: project(command) },
      { path: event.occurrence.path, command: event.occurrence.command },
    )
  )
    return []
  const control = top.control
  if (control) {
    const kind = project(command).kind
    assert(control.kind === kind, 'loop resume control kind differs from canonical')
  }
  top.index++
  delete top.control
  if (command.kind === 'branch') {
    const arms = control
      ? [control.arm]
      : conditions(command.cond, event.world).map((v) => (v ? 'then' : 'else'))
    return arms.map((arm) => {
      assert(['then', 'else'].includes(arm), 'loop resume branch arm invalid')
      const branch = copy(state)
      sequence(branch, command[arm] ?? [], [...path, 'branch'], arm)
      return branch
    })
  }
  if (command.kind === 'repeat' || command.kind === 'loop') {
    assert(command.kind !== 'loop' || command.mode === 'forever', 'unsupported conditional loop')
    assert(
      !control || command.kind !== 'loop' || control.phase === 'body',
      'forever loop cannot resume at test',
    )
    const iteration = control?.iteration ?? 1
    if (command.kind === 'repeat')
      assert(
        Number.isSafeInteger(command.count) &&
          command.count >= 1 &&
          iteration >= 1 &&
          iteration <= command.count,
        'invalid repeat iteration',
      )
    state.stack.push({ type: 'loop', command, path, iteration, phase: 'body' })
  } else if (command.kind === 'breakLoop' || command.kind === 'continueLoop') {
    let target = state.stack.length - 1
    while (
      target >= 0 &&
      (state.stack[target].type !== 'loop' ||
        (command.kind === 'continueLoop' &&
          command.loop &&
          state.stack[target].command.id !== command.loop))
    )
      target--
    assert(target >= 0, 'loop transfer lacks lexical target')
    state.stack.length = target + (command.kind === 'continueLoop' ? 1 : 0)
  } else if (command.kind === 'finishStep') {
    state.stack = []
    state.exit = command.next
  } else {
    assert(project(command).kind === 'leaf', `unsupported loop command ${command.kind}`)
  }
  return [state]
}

function validateResume(stage, resume, digest) {
  const keys = (value, allowed) =>
    assert(
      value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).every((key) => allowed.includes(key)),
      'loop resume has noncanonical fields',
    )
  keys(resume, ['digest', 'frames'])
  assert(
    /^[a-f0-9]{64}$/.test(resume.digest) && resume.digest === digest,
    'loop resume content digest differs',
  )
  assert(
    Array.isArray(resume.frames) && resume.frames.length > 0 && resume.frames.length <= 256,
    'loop resume lacks address frames',
  )
  let body = stage.body
  for (const [depth, frame] of resume.frames.entries()) {
    keys(frame, ['index', 'control'])
    const child = depth + 1 < resume.frames.length
    assert(
      Number.isSafeInteger(frame.index) && frame.index >= 0 && frame.index <= body.length,
      'loop resume index outside canonical body',
    )
    const command = body[frame.index],
      control = frame.control
    if (control !== undefined) {
      const fields = {
        branch: ['arm'],
        repeat: ['iteration'],
        loop: ['phase'],
        leaf: ['command', 'phase'],
      }
      assert(control && Object.hasOwn(fields, control.kind), 'unsupported loop resume control')
      keys(control, ['kind', ...fields[control.kind]])
      assert(
        command && executable(command).kind === control.kind,
        'loop resume control type differs',
      )
      if (control.kind === 'branch')
        assert(['then', 'else'].includes(control.arm), 'loop resume branch arm invalid')
      else if (control.kind === 'repeat')
        assert(
          Number.isSafeInteger(control.iteration) &&
            control.iteration >= 1 &&
            control.iteration <= command.count,
          'loop resume iteration invalid',
        )
      else if (control.kind === 'loop')
        assert(
          command.mode === 'forever' && control.phase === 'body',
          'unsupported loop resume phase',
        )
      else
        assert(
          control.kind === 'leaf' &&
            ['stepEntity', 'chasePlayer'].includes(control.command) &&
            ['continuation', 'done'].includes(control.phase) &&
            control.command === command.kind &&
            !child,
          'invalid loop resume leaf control',
        )
    }
    if (child) {
      assert(control && command, 'loop resume child lacks structural parent')
      if (control.kind === 'branch') body = command[control.arm] ?? []
      else {
        assert(['loop', 'repeat'].includes(control.kind), 'loop resume has nonstructural child')
        body = command.body
      }
    }
  }
}

function proveRun(start, events, all, flow, stage, finalLifecycle) {
  assert(
    start.scope === 'flow' && start.timing === 'auto',
    'loop contract requires automatic owner flow',
  )
  assert(
    same(start.self, { scene: start.author.scene, entity: start.author.entity }),
    'loop author/self mismatch',
  )
  const installed =
    start.world?.script?.behaviors?.entities?.[start.self.scene]?.[start.self.entity]?.auto?.cursor
  const matching = installed?.behavior === start.author.behavior
  assert(start.world?.script?.behaviors, 'loop start lacks actual installed behavior state')
  assert(
    start.stage === (matching ? installed.at?.stage : flow.initial) &&
      same(start.resume, matching ? (installed.resume ?? null) : null),
    'loop resume lacks matching installed cursor',
  )
  if (start.resume) validateResume(stage, start.resume, start.digest)
  const initial = { stack: [], resume: [...(start.resume?.frames ?? [])], exit: stage.next }
  sequence(initial, stage.body, [stage.id])
  let states = [initial],
    pending = null,
    terminal = null,
    end = null,
    commands = 0
  const cache = new WeakMap()
  const project = (command) => {
    if (!cache.has(command)) cache.set(command, executable(command))
    return cache.get(command)
  }
  for (const event of events) {
    if (
      ['run-started', 'command', 'leaf-completed', 'stage-settled', 'run-ended'].includes(
        event.phase,
      )
    )
      assert(
        event.engine === 'reforge' &&
          ['runId', 'activityId', 'runnerId', 'parentRunId', 'parentOccurrence', 'callId'].every(
            (key) => same(event[key], start[key]),
          ),
        'loop control receipt changed invocation identity',
      )
    if (event.phase === 'command') {
      assert(
        !terminal && !end && !pending,
        'loop dispatched before previous leaf completion or after end',
      )
      states = frontier(states).flatMap((state) => dispatch(state, event, project))
      assert(states.length, `illegal canonical loop successor at ${event.order}`)
      assert(states.length <= 256, 'loop candidate budget exceeded')
      if (event.occurrence.command.kind === 'leaf') pending = event.occurrence.id
      commands++
    } else if (event.phase === 'leaf-completed') {
      assert(pending === event.occurrence?.id, 'loop leaf completion lacks pending occurrence')
      pending = null
    } else if (event.phase === 'stage-settled') {
      assert(!pending && !terminal && !end, 'loop terminal preceded leaf completion or repeated')
      states = frontier(states).filter(
        (state) =>
          state.stack.length === 0 &&
          state.resume.length === 0 &&
          same(cursor(state.exit, stage.id), event.cursor),
      )
      assert(
        states.length &&
          event.stage === stage.id &&
          event.timing === 'auto' &&
          same(event.self, start.self),
        'loop terminal not reachable from canonical control word',
      )
      terminal = event
    } else if (event.phase === 'run-ended') {
      assert(!end, 'loop ended more than once')
      if (event.aborted) {
        assert(
          !terminal &&
            all.some(
              (receipt) =>
                receipt.phase === 'auto-aborted' &&
                receipt.activationId === start.activityId &&
                receipt.sceneSession === start.author.sceneSession &&
                receipt.entity === start.self.entity &&
                receipt.order > start.order &&
                receipt.order < event.order,
            ),
          'loop cancellation lacks actual owner abort',
        )
      } else
        assert(event.resolved === true && terminal, 'loop success lacks reachable stage settlement')
      end = event
    }
  }
  if (!end) {
    assert(
      !terminal &&
        finalLifecycle?.activations?.some(
          (activation) =>
            activation.activityId === start.activityId &&
            !activation.aborted &&
            activation.entity === start.self.entity &&
            activation.sceneSession === start.author.sceneSession,
        ),
      'loop prefix lacks live automatic owner at window boundary',
    )
  }
  return {
    runId: start.runId,
    commands,
    outcome: !end ? 'proved-prefix' : end.aborted ? 'proved-aborted-prefix' : 'proved-complete',
  }
}

/** Covers canonical loop-bearing automatic runs, including loops missing from the
 * observed commands. Other scenario runs retain the required finite execution proof.
 * Lifecycle/handoff and hold contracts separately prove activation origin and dwell.
 */
export function checkLoopControl(trace, scenes = canonicalScenes, { requiredAuthors = [] } = {}) {
  const all = [...(trace.initialCauses ?? []), ...(trace.causes ?? [])].sort(
    (a, b) => a.order - b.order,
  )
  const starts = all.filter((e) => e.phase === 'run-started' && e.engine === 'reforge')
  const runs = new Map()
  for (const event of all)
    if (event.runId) {
      if (!runs.has(event.runId)) runs.set(event.runId, [])
      runs.get(event.runId).push(event)
    }
  const selected = []
  for (const start of starts) {
    const author = start.author
    const flow =
      author?.kind === 'entity-behavior'
        ? scenes[author.scene]?.entities?.find((entity) => entity.id === author.entity)
            ?.behaviors?.[author.channel]?.[author.behavior]?.flow
        : null
    const stage = flow?.stages.find((stage) => stage.id === start.stage)
    const actual = runs.get(start.runId)
    if (
      requiredAuthors.some(
        (binding) =>
          author?.kind === 'entity-behavior' &&
          ['scene', 'entity', 'channel', 'behavior'].every((key) => author[key] === binding[key]),
      ) ||
      (stage && containsLoop(stage.body)) ||
      actual.some(
        (event) =>
          event.phase === 'command' &&
          ['loop', 'breakLoop', 'continueLoop'].includes(event.occurrence?.command?.kind),
      )
    )
      selected.push({ start, flow, stage, events: actual })
  }
  const finalLifecycle = all.findLast((event) => event.lifecycle)?.lifecycle
  return checkTransitionTrace(
    {
      id: 'canonical-loop-control-language/v1',
      initial: { runs: [] },
      transitions: {
        run: (state, { runId }) => {
          const input = selected.find((input) => input.start.runId === runId)
          requireTrace(
            input.stage,
            'loop-canonical-owner',
            'canonical entity behavior/stage',
            input.start.author,
            'unknown',
          )
          try {
            state.runs.push(
              proveRun(input.start, input.events, all, input.flow, input.stage, finalLifecycle),
            )
          } catch (error) {
            requireTrace(
              false,
              'loop-control-word',
              input.start.runId,
              error.message,
              error.message.startsWith('unsupported') || error.message.includes('budget exceeded')
                ? 'unknown'
                : 'rejected',
            )
          }
          return state
        },
      },
      accept: () => {},
    },
    selected.map((input) => ({ type: 'run', runId: input.start.runId })),
  )
}
