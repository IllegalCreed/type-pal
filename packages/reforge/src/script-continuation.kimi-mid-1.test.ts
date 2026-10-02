import type {
  AutoScriptContinuation,
  EntityAddress,
  FlowCursor,
  RuntimeCommand,
  RuntimeScriptFlow,
  RuntimeScriptLibrary,
} from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import {
  compileRuntimeScriptFlow,
  type ExecutableRuntimeScriptFlow,
  type RuntimeLeafCommand,
  RuntimeSharedScriptResolver,
} from './runtime-script-compiler.js'
import { validateScriptContinuation } from './script-continuation.js'
import type { SharedScriptResolverLike } from './script-runner-core.js'

const DIGEST = 'c'.repeat(64)
const OTHER_DIGEST = 'a'.repeat(64)
const SELF_A: EntityAddress = { scene: 's', entity: 'a' }
const SELF_B: EntityAddress = { scene: 's', entity: 'b' }

const stage = (body: RuntimeCommand[]): RuntimeScriptFlow => ({
  kind: 'stages',
  initial: 'first',
  stages: [{ id: 'first', body }],
})

const machineFlow = (id: string, state: string, body: RuntimeCommand[]): RuntimeScriptFlow => ({
  kind: 'stateMachine',
  machine: {
    id,
    label: id,
    initial: state,
    states: { [state]: { label: state, body, next: { kind: 'stay' } } },
  },
})

const compile = (flow: RuntimeScriptFlow): ExecutableRuntimeScriptFlow =>
  compileRuntimeScriptFlow(flow, { canonicalContentDigest: DIGEST, timing: 'auto' })

const resume = (
  frames: AutoScriptContinuation['frames'],
  outcomes: AutoScriptContinuation['outcomes'] = {},
): AutoScriptContinuation => ({ digest: DIGEST, frames, outcomes })

const stageCursor: FlowCursor = { kind: 'stage', stage: 'first' }

const giveMoney = (delta: number): RuntimeCommand => ({ kind: 'giveMoney', delta })
const chanceBranch = (then: RuntimeCommand[], otherwise: RuntimeCommand[]): RuntimeCommand => ({
  kind: 'branch',
  cond: { kind: 'chance', percent: 50 },
  then,
  else: otherwise,
})
const whileLoop = (maxIterations: number, body: RuntimeCommand[]): RuntimeCommand => ({
  kind: 'loop',
  mode: 'while',
  cond: { kind: 'chance', percent: 50 },
  yield: 'worldTick',
  maxIterations,
  body,
})

type Executable = ExecutableRuntimeScriptFlow
type Resolver = SharedScriptResolverLike<RuntimeLeafCommand>

function stageBody(executable: Executable, index: number) {
  if (executable.flow.kind !== 'stages') throw new Error('expected compiled stages')
  const command = executable.flow.stages[0]?.body[index]
  if (!command) throw new Error('compiled command missing')
  return command
}
function leafOf(command: ReturnType<typeof stageBody>) {
  if (command.kind !== 'leaf') throw new Error(`expected compiled leaf, got ${command.kind}`)
  return command.command
}

const validate = (
  executable: Executable,
  cursor: FlowCursor,
  value: AutoScriptContinuation,
  resolver: Resolver | undefined,
  signal: AbortSignal,
  self?: EntityAddress,
) => validateScriptContinuation(executable, cursor, value, resolver, signal, self)

/** Rejection oracles assert a real Error whose message pins the exact guard, so a guard that
 *  silently stops rejecting surfaces as an AssertionError (a resolved walk), never a runtime one. */
async function expectReject(promise: Promise<unknown>, part: string) {
  const caught = await promise.then(
    () => null,
    (error: unknown) => error,
  )
  expect(caught, 'expected the continuation walk to reject').not.toBeNull()
  if (!(caught instanceof Error)) throw new TypeError('captured a non-Error rejection')
  expect(caught.message).toContain(part)
}

async function expectAbort(promise: Promise<unknown>) {
  const caught = await promise.then(
    () => null,
    (error: unknown) => error,
  )
  expect(caught, 'expected the continuation walk to abort').not.toBeNull()
  expect(caught).toMatchObject({ name: 'AbortError' })
}

// K1 恢复地址域:stage/state/machine 三类游标与冻结可执行代码的分域。
test('K1 stages executable refuses a state-machine cursor before walking frames', async () => {
  const executable = compile(stage([giveMoney(1)]))
  const cursor: FlowCursor = { kind: 'state', machine: 'm', state: 's' }
  await expectReject(
    validate(executable, cursor, resume([{ index: 0 }]), undefined, new AbortController().signal),
    'auto resume: stages需要stage游标',
  )
})

test('K1 stages executable refuses a cursor naming an absent stage', async () => {
  const executable = compile(stage([giveMoney(1)]))
  await expectReject(
    validate(
      executable,
      { kind: 'stage', stage: 'ghost' },
      resume([{ index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
    'auto resume: stage不存在',
  )
})

test('K1 machine executable refuses a cursor from a foreign machine id', async () => {
  const executable = compile(machineFlow('patrol', 'walk', [giveMoney(1)]))
  const cursor: FlowCursor = { kind: 'state', machine: 'other', state: 'walk' }
  await expectReject(
    validate(executable, cursor, resume([{ index: 0 }]), undefined, new AbortController().signal),
    'auto resume: machine游标不匹配',
  )
})

test('K1 a legally ended resume at the exact body end yields an empty location and no shared read', async () => {
  const executable = compile(stage([giveMoney(7)]))
  const resolver = vi.fn<Resolver['resolve']>()
  const location = await validate(
    executable,
    stageCursor,
    resume([{ index: 1 }]),
    { resolve: resolver },
    new AbortController().signal,
  )
  expect(location).toEqual({})
  expect(Object.keys(location)).toEqual([])
  expect(resolver).not.toHaveBeenCalled()
})

// K2 父子控制帧:合法嵌套下钻读真实返回 leaf/control;缺选择/错相位精确拒收。
test('K2 branch else descent returns the real compiled leaf inside the else arm', async () => {
  const executable = compile(stage([chanceBranch([giveMoney(1)], [giveMoney(2)])]))
  const location = await validate(
    executable,
    stageCursor,
    resume([{ index: 0, control: { kind: 'branch', arm: 'else' } }, { index: 0 }]),
    undefined,
    new AbortController().signal,
  )
  const branch = stageBody(executable, 0)
  if (branch.kind !== 'branch') throw new Error('expected compiled branch')
  expect(location).toEqual({ leaf: { kind: 'giveMoney', delta: 2 } })
  expect(location.leaf).toBe(leafOf(branch.else![0]!))
})

test('K2 confirm onNo descent returns the real compiled leaf inside onNo', async () => {
  const executable = compile(stage([{ kind: 'confirm', onNo: [giveMoney(3)] }]))
  const location = await validate(
    executable,
    stageCursor,
    resume([{ index: 0, control: { kind: 'confirm', no: true } }, { index: 0 }]),
    undefined,
    new AbortController().signal,
  )
  const confirm = stageBody(executable, 0)
  if (confirm.kind !== 'confirm') throw new Error('expected compiled confirm')
  expect(location).toEqual({ leaf: { kind: 'giveMoney', delta: 3 } })
  expect(location.leaf).toBe(leafOf(confirm.onNo[0]!))
})

test('K2 a loop settled at test phase reports its control frame as a detached clone', async () => {
  const executable = compile(stage([whileLoop(5, [giveMoney(1)])]))
  const value = resume([{ index: 0, control: { kind: 'loop', iteration: 2, phase: 'test' } }])
  const location = await validate(
    executable,
    stageCursor,
    value,
    undefined,
    new AbortController().signal,
  )
  expect(location).toEqual({ control: { kind: 'loop', iteration: 2, phase: 'test' } })
  expect(location.control).not.toBe(value.frames[0]!.control)
})

test.each([
  'onLose',
  'onFlee',
] as const)('K2 startBattle %s descent returns the real compiled leaf of that outcome arm', async (arm) => {
  const executable = compile(
    stage([
      {
        kind: 'startBattle',
        enemyTeamId: 'team',
        onLose: [giveMoney(4)],
        onFlee: [giveMoney(5)],
      },
    ]),
  )
  const location = await validate(
    executable,
    stageCursor,
    resume([{ index: 0, control: { kind: 'startBattle', arm } }, { index: 0 }]),
    undefined,
    new AbortController().signal,
  )
  const battle = stageBody(executable, 0)
  if (battle.kind !== 'startBattle') throw new Error('expected compiled startBattle')
  expect(location).toEqual({ leaf: { kind: 'giveMoney', delta: arm === 'onLose' ? 4 : 5 } })
  expect(location.leaf).toBe(leafOf(battle[arm]![0]!))
})

test('K2 teleportOut failure descent returns the real compiled leaf inside onFail', async () => {
  const executable = compile(stage([{ kind: 'teleportOut', onFail: [giveMoney(6)] }]))
  const location = await validate(
    executable,
    stageCursor,
    resume([{ index: 0, control: { kind: 'teleportOut', failed: true } }, { index: 0 }]),
    undefined,
    new AbortController().signal,
  )
  const teleport = stageBody(executable, 0)
  if (teleport.kind !== 'teleportOut') throw new Error('expected compiled teleportOut')
  expect(location).toEqual({ leaf: { kind: 'giveMoney', delta: 6 } })
  expect(location.leaf).toBe(leafOf(teleport.onFail![0]!))
})

test('K2 a loop frame past maxIterations rejects before descending', async () => {
  const executable = compile(stage([whileLoop(5, [giveMoney(1)])]))
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0, control: { kind: 'loop', iteration: 6, phase: 'body' } }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
    'auto resume: loop迭代越界',
  )
})

test('K2 a loop child under a non-body phase rejects', async () => {
  const executable = compile(stage([whileLoop(5, [giveMoney(1)])]))
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0, control: { kind: 'loop', iteration: 1, phase: 'test' } }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
    'auto resume: loop非body不能有子帧',
  )
})

test('K2 a loop child without its control frame rejects', async () => {
  const executable = compile(stage([whileLoop(5, [giveMoney(1)])]))
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
    'auto resume: 缺少loop body相位',
  )
})

test('K2 a branch child without its selection rejects', async () => {
  const executable = compile(stage([chanceBranch([giveMoney(1)], [giveMoney(2)])]))
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
    'auto resume: 缺少branch选择',
  )
})

test('K2 a confirm child settled as yes rejects', async () => {
  const executable = compile(stage([{ kind: 'confirm', onNo: [giveMoney(3)] }]))
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0, control: { kind: 'confirm', no: false } }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
    'auto resume: confirm子帧不是onNo',
  )
})

test('K2 a startBattle child without an outcome arm rejects', async () => {
  const executable = compile(
    stage([{ kind: 'startBattle', enemyTeamId: 'team', onLose: [giveMoney(4)] }]),
  )
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0, control: { kind: 'startBattle', arm: 'none' } }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
    'auto resume: 缺少战斗结果',
  )
})

test('K2 a teleportOut child settled as succeeded rejects', async () => {
  const executable = compile(stage([{ kind: 'teleportOut', onFail: [giveMoney(6)] }]))
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0, control: { kind: 'teleportOut', failed: false } }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
    'auto resume: 缺少teleport失败结果',
  )
})

// K3 shared self 解析:真实 compiler/解析器返回当前 digest;none/optional/required 与显式 self。
const library = (
  self: 'none' | 'optional' | 'required',
  body: RuntimeCommand[],
): RuntimeScriptLibrary => ({
  shared: { name: 'Shared', self, body },
})
const callShared = (self?: EntityAddress): RuntimeCommand => ({
  kind: 'callScript',
  script: 'shared',
  ...(self ? { self } : {}),
})

test('K3 a shared child without any resolver rejects', async () => {
  const executable = compile(stage([callShared()]))
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
    'auto resume: 缺少shared resolver',
  )
})

test('K3 a resolver pinned to another content digest rejects', async () => {
  const executable = compile(stage([callShared()]))
  const foreign = new RuntimeSharedScriptResolver(library('optional', [giveMoney(1)]), OTHER_DIGEST)
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      foreign,
      new AbortController().signal,
    ),
    'auto resume: shared内容不匹配',
  )
})

test('K3 a none-self shared script refuses an explicit command self', async () => {
  const executable = compile(stage([callShared(SELF_A)]))
  const resolver = new RuntimeSharedScriptResolver(library('none', [giveMoney(1)]), DIGEST)
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      resolver,
      new AbortController().signal,
      SELF_B,
    ),
    'auto resume: shared self=none禁止显式self',
  )
})

test('K3 a required-self shared script without any inherited self rejects', async () => {
  const executable = compile(stage([callShared()]))
  const resolver = new RuntimeSharedScriptResolver(library('required', [giveMoney(1)]), DIGEST)
  await expectReject(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      resolver,
      new AbortController().signal,
    ),
    'auto resume: shared需要self',
  )
})

test('K3 a required-self shared script inherits the caller self as a detached clone with caller timing', async () => {
  const executable = compile(stage([callShared()]))
  const real = new RuntimeSharedScriptResolver(library('required', [giveMoney(8)]), DIGEST)
  const seen: unknown[][] = []
  const signal = new AbortController().signal
  const resolver: Resolver = {
    resolve: (id, timing, boundaryPolicy, passed) => {
      seen.push([id, timing, boundaryPolicy, passed])
      return real.resolve(id, timing, boundaryPolicy)
    },
  }
  const location = await validate(
    executable,
    stageCursor,
    resume([{ index: 0 }, { index: 0 }]),
    resolver,
    signal,
    SELF_A,
  )
  expect(location.self).toEqual(SELF_A)
  expect(location.self).not.toBe(SELF_A)
  expect(seen).toEqual([['shared', 'auto', 'perCommand', signal]])
  const resolved = real.resolve('shared', 'auto', 'perCommand')
  expect(location.leaf).toBe(leafOf(resolved.body[0]!))
})

test('K3 an optional-self shared script prefers the explicit command self over the inherited one', async () => {
  const executable = compile(stage([callShared(SELF_B)]))
  const resolver = new RuntimeSharedScriptResolver(library('optional', [giveMoney(1)]), DIGEST)
  const location = await validate(
    executable,
    stageCursor,
    resume([{ index: 0 }, { index: 0 }]),
    resolver,
    new AbortController().signal,
    SELF_A,
  )
  expect(location.self).toEqual(SELF_B)
  expect(location.self).not.toBe(SELF_B)
})

test('K3 a none-self shared script drops the inherited self from its resolved location', async () => {
  const executable = compile(stage([callShared()]))
  const resolver = new RuntimeSharedScriptResolver(library('none', [giveMoney(9)]), DIGEST)
  const location = await validate(
    executable,
    stageCursor,
    resume([{ index: 0 }, { index: 0 }]),
    resolver,
    new AbortController().signal,
    SELF_A,
  )
  expect(location).toEqual({ leaf: { kind: 'giveMoney', delta: 9 } })
  expect(Object.hasOwn(location, 'self')).toBe(false)
})

// K4 中途取消与只读:公开 resolver await 阶段取消;输入逐字节不变;location 对外隔离。
test('K4 a pre-aborted signal rejects before any shared resolution', async () => {
  const executable = compile(stage([callShared()]))
  const controller = new AbortController()
  controller.abort()
  const resolver = vi.fn<Resolver['resolve']>()
  await expectAbort(
    validate(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      { resolve: resolver },
      controller.signal,
    ),
  )
  expect(resolver).not.toHaveBeenCalled()
})

test('K4 aborting while the resolver is pending rejects the walk without a resolved location', async () => {
  const executable = compile(stage([callShared()]))
  const real = new RuntimeSharedScriptResolver(library('optional', [giveMoney(1)]), DIGEST)
  const controller = new AbortController()
  let signalEntered!: () => void
  let release!: () => void
  const entered = new Promise<void>((resolve) => {
    signalEntered = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const resolver: Resolver = {
    resolve: async (id, timing, boundaryPolicy) => {
      signalEntered()
      await gate
      return real.resolve(id, timing, boundaryPolicy)
    },
  }
  const pending = validate(
    executable,
    stageCursor,
    resume([{ index: 0 }, { index: 0 }]),
    resolver,
    controller.signal,
  )
  await entered
  controller.abort()
  release()
  await expectAbort(pending)
})

test('K4 a successful nested validation leaves executable, cursor and resume byte-identical', async () => {
  const executable = compile(stage([chanceBranch([giveMoney(1)], [giveMoney(2)])]))
  const cursor: FlowCursor = { ...stageCursor }
  const value = resume([{ index: 0, control: { kind: 'branch', arm: 'else' } }, { index: 0 }])
  const before = JSON.stringify({ executable, cursor, value })
  const location = await validate(
    executable,
    cursor,
    value,
    undefined,
    new AbortController().signal,
  )
  expect(location.leaf).toEqual({ kind: 'giveMoney', delta: 2 })
  expect(JSON.stringify({ executable, cursor, value })).toBe(before)
})

test('K4 mutating the returned location never reaches back into the resume or the inherited self', async () => {
  const loopSetup = compile(stage([whileLoop(5, [giveMoney(1)])]))
  const value = resume([{ index: 0, control: { kind: 'loop', iteration: 2, phase: 'test' } }])
  const located = await validate(
    loopSetup,
    stageCursor,
    value,
    undefined,
    new AbortController().signal,
  )
  const control = located.control
  if (control?.kind !== 'loop') throw new Error('expected loop control location')
  control.iteration = 99
  control.phase = 'next'
  expect(value.frames[0]!.control).toEqual({ kind: 'loop', iteration: 2, phase: 'test' })

  const sharedSetup = compile(stage([callShared()]))
  const resolver = new RuntimeSharedScriptResolver(library('required', [giveMoney(8)]), DIGEST)
  const inherited = structuredClone(SELF_A)
  const locatedSelf = await validate(
    sharedSetup,
    stageCursor,
    resume([{ index: 0 }, { index: 0 }]),
    resolver,
    new AbortController().signal,
    inherited,
  )
  locatedSelf.self!.scene = 'mutated'
  locatedSelf.self!.entity = 'mutated'
  expect(inherited).toEqual(SELF_A)
})
