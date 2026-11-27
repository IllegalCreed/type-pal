import type {
  AutoScriptContinuation,
  EntityAddress,
  FlowCursor,
  RuntimeCommand,
  RuntimeScriptFlow,
  RuntimeScriptLibrary,
} from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { deferred } from './__tests__/deferred.js'
import { expectDefined } from './defined.js'
import {
  compileRuntimeScriptFlow,
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

const compile = (flow: RuntimeScriptFlow) =>
  compileRuntimeScriptFlow(flow, { canonicalContentDigest: DIGEST, timing: 'auto' })

const resume = (frames: AutoScriptContinuation['frames']): AutoScriptContinuation => ({
  digest: DIGEST,
  frames,
})

const stageCursor: FlowCursor = { kind: 'stage', stage: 'first' }

const giveMoney = (delta: number): RuntimeCommand => ({ kind: 'giveMoney', delta })
const chanceBranch = (then: RuntimeCommand[], otherwise: RuntimeCommand[]): RuntimeCommand => ({
  kind: 'branch',
  cond: { kind: 'chance', percent: 50 },
  then,
  else: otherwise,
})
const whileLoop = (body: RuntimeCommand[]): RuntimeCommand => ({
  kind: 'loop',
  mode: 'while',
  cond: { kind: 'chance', percent: 50 },
  body,
})

type Resolver = SharedScriptResolverLike<RuntimeLeafCommand>

test('a cursor must name an authored stage', async () => {
  const executable = compile(stage([giveMoney(1)]))
  await expect(
    validateScriptContinuation(
      executable,
      { kind: 'stage', stage: 'ghost' },
      resume([{ index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
  ).rejects.toThrow('auto resume: stage不存在')
})

test('a legally ended resume at the exact body end yields an empty location and no shared read', async () => {
  const executable = compile(stage([giveMoney(7)]))
  const resolver = vi.fn<Resolver['resolve']>()
  const location = await validateScriptContinuation(
    executable,
    stageCursor,
    resume([{ index: 1 }]),
    { resolve: resolver },
    new AbortController().signal,
  )
  expect(location).toStrictEqual({})
  expect(resolver).not.toHaveBeenCalled()
})

test('branch else descent returns the real compiled leaf inside the else arm', async () => {
  const executable = compile(stage([chanceBranch([giveMoney(1)], [giveMoney(2)])]))
  const location = await validateScriptContinuation(
    executable,
    stageCursor,
    resume([{ index: 0, control: { kind: 'branch', arm: 'else' } }, { index: 0 }]),
    undefined,
    new AbortController().signal,
  )
  const branch = executable.flow.stages[0]?.body[0]
  const selected = branch?.kind === 'branch' ? branch.else?.[0] : undefined
  if (selected?.kind !== 'leaf') throw new Error('expected compiled else leaf')
  expect(location).toEqual({ leaf: { kind: 'giveMoney', delta: 2 } })
  expect(location.leaf).toBe(selected.command)
})

test('confirmation can resume the selected no branch', async () => {
  const executable = compile(stage([{ kind: 'confirm', onYes: [], onNo: [giveMoney(3)] }]))
  const location = await validateScriptContinuation(
    executable,
    stageCursor,
    resume([{ index: 0, control: { kind: 'confirm', arm: 'onNo' } }, { index: 0 }]),
    undefined,
    new AbortController().signal,
  )
  expect(location).toEqual({ leaf: { kind: 'giveMoney', delta: 3 } })
})

test('a loop settled at test phase reports its control frame as a detached clone', async () => {
  const executable = compile(stage([whileLoop([giveMoney(1)])]))
  const value = resume([{ index: 0, control: { kind: 'loop', phase: 'test' } }])
  const location = await validateScriptContinuation(
    executable,
    stageCursor,
    value,
    undefined,
    new AbortController().signal,
  )
  expect(location).toEqual({ control: { kind: 'loop', phase: 'test' } })
  expect(location.control).not.toBe(value.frames[0]?.control)
})

test.each([
  'onLose',
  'onFlee',
] as const)('battle can resume the selected %s branch', async (arm) => {
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
  const location = await validateScriptContinuation(
    executable,
    stageCursor,
    resume([{ index: 0, control: { kind: 'startBattle', arm } }, { index: 0 }]),
    undefined,
    new AbortController().signal,
  )
  expect(location).toEqual({ leaf: { kind: 'giveMoney', delta: arm === 'onLose' ? 4 : 5 } })
})

test('failed teleport can resume its recovery branch', async () => {
  const executable = compile(stage([{ kind: 'teleportOut', onFail: [giveMoney(6)] }]))
  const location = await validateScriptContinuation(
    executable,
    stageCursor,
    resume([{ index: 0, control: { kind: 'teleportOut', failed: true } }, { index: 0 }]),
    undefined,
    new AbortController().signal,
  )
  expect(location).toEqual({ leaf: { kind: 'giveMoney', delta: 6 } })
})

test('a loop child under a non-body phase rejects', async () => {
  const executable = compile(stage([whileLoop([giveMoney(1)])]))
  await expect(
    validateScriptContinuation(
      executable,
      stageCursor,
      resume([{ index: 0, control: { kind: 'loop', phase: 'test' } }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
  ).rejects.toThrow('auto resume: loop非body不能有子帧')
})

test('a loop child without its control frame rejects', async () => {
  const executable = compile(stage([whileLoop([giveMoney(1)])]))
  await expect(
    validateScriptContinuation(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
  ).rejects.toThrow('auto resume: 缺少loop body相位')
})

test('a branch child without its selection rejects', async () => {
  const executable = compile(stage([chanceBranch([giveMoney(1)], [giveMoney(2)])]))
  await expect(
    validateScriptContinuation(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
  ).rejects.toThrow('auto resume: 缺少branch选择')
})

test('a startBattle child without an outcome arm rejects', async () => {
  const executable = compile(
    stage([{ kind: 'startBattle', enemyTeamId: 'team', onLose: [giveMoney(4)] }]),
  )
  await expect(
    validateScriptContinuation(
      executable,
      stageCursor,
      resume([{ index: 0, control: { kind: 'startBattle', arm: 'none' } }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
  ).rejects.toThrow('auto resume: 缺少战斗结果')
})

test('a teleportOut child settled as succeeded rejects', async () => {
  const executable = compile(stage([{ kind: 'teleportOut', onFail: [giveMoney(6)] }]))
  await expect(
    validateScriptContinuation(
      executable,
      stageCursor,
      resume([{ index: 0, control: { kind: 'teleportOut', failed: false } }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
  ).rejects.toThrow('auto resume: 缺少teleport失败结果')
})

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

test('a shared child without any resolver rejects', async () => {
  const executable = compile(stage([callShared()]))
  await expect(
    validateScriptContinuation(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      undefined,
      new AbortController().signal,
    ),
  ).rejects.toThrow('auto resume: 缺少shared resolver')
})

test('a resolver pinned to another content digest rejects', async () => {
  const executable = compile(stage([callShared()]))
  const foreign = new RuntimeSharedScriptResolver(library('optional', [giveMoney(1)]), OTHER_DIGEST)
  await expect(
    validateScriptContinuation(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      foreign,
      new AbortController().signal,
    ),
  ).rejects.toThrow('auto resume: shared内容不匹配')
})

test('a none-self shared script refuses an explicit command self', async () => {
  const executable = compile(stage([callShared(SELF_A)]))
  const resolver = new RuntimeSharedScriptResolver(library('none', [giveMoney(1)]), DIGEST)
  await expect(
    validateScriptContinuation(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      resolver,
      new AbortController().signal,
      SELF_B,
    ),
  ).rejects.toThrow('auto resume: shared self=none禁止显式self')
})

test('a required-self shared script without any inherited self rejects', async () => {
  const executable = compile(stage([callShared()]))
  const resolver = new RuntimeSharedScriptResolver(library('required', [giveMoney(1)]), DIGEST)
  const failure: unknown = await validateScriptContinuation(
    executable,
    stageCursor,
    resume([{ index: 0 }, { index: 0 }]),
    resolver,
    new AbortController().signal,
  ).then(
    () => undefined,
    (error: unknown) => error,
  )
  expect(failure).toBeInstanceOf(Error)
  expect(failure).toHaveProperty('message', 'auto resume: shared需要self')
})

test('a required-self shared script inherits the caller self as a detached clone with caller timing', async () => {
  const executable = compile(stage([callShared()]))
  const real = new RuntimeSharedScriptResolver(library('required', [giveMoney(8)]), DIGEST)
  const seen: unknown[][] = []
  const signal = new AbortController().signal
  const resolver: Resolver = {
    resolve: (id, timing, passed) => {
      seen.push([id, timing, passed])
      return real.resolve(id, timing)
    },
  }
  const location = await validateScriptContinuation(
    executable,
    stageCursor,
    resume([{ index: 0 }, { index: 0 }]),
    resolver,
    signal,
    SELF_A,
  )
  expect(location.self).toEqual(SELF_A)
  expect(location.self).not.toBe(SELF_A)
  expect(seen).toEqual([['shared', 'auto', signal]])
  expect(location.leaf).toEqual({ kind: 'giveMoney', delta: 8 })
})

test('an optional-self shared script prefers the explicit command self over the inherited one', async () => {
  const executable = compile(stage([callShared(SELF_B)]))
  const resolver = new RuntimeSharedScriptResolver(library('optional', [giveMoney(1)]), DIGEST)
  const location = await validateScriptContinuation(
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

test('a none-self shared script drops the inherited self from its resolved location', async () => {
  const executable = compile(stage([callShared()]))
  const resolver = new RuntimeSharedScriptResolver(library('none', [giveMoney(9)]), DIGEST)
  const location = await validateScriptContinuation(
    executable,
    stageCursor,
    resume([{ index: 0 }, { index: 0 }]),
    resolver,
    new AbortController().signal,
    SELF_A,
  )
  expect(location).toStrictEqual({ leaf: { kind: 'giveMoney', delta: 9 } })
})

test('a pre-aborted signal rejects before any shared resolution', async () => {
  const executable = compile(stage([callShared()]))
  const controller = new AbortController()
  controller.abort()
  const resolver = vi.fn<Resolver['resolve']>()
  await expect(
    validateScriptContinuation(
      executable,
      stageCursor,
      resume([{ index: 0 }, { index: 0 }]),
      { resolve: resolver },
      controller.signal,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(resolver).not.toHaveBeenCalled()
})

test('aborting while the resolver is pending rejects the walk without a resolved location', async () => {
  const executable = compile(stage([callShared()]))
  const real = new RuntimeSharedScriptResolver(library('optional', [giveMoney(1)]), DIGEST)
  const controller = new AbortController()
  const entered = deferred<void>()
  const gate = deferred<void>()
  const resolver: Resolver = {
    resolve: async (id, timing) => {
      entered.resolve()
      await gate.promise
      return real.resolve(id, timing)
    },
  }
  const pending = validateScriptContinuation(
    executable,
    stageCursor,
    resume([{ index: 0 }, { index: 0 }]),
    resolver,
    controller.signal,
  )
  await entered.promise
  controller.abort()
  gate.resolve()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
})

test('a successful nested validation leaves executable, cursor and resume byte-identical', async () => {
  const executable = compile(stage([chanceBranch([giveMoney(1)], [giveMoney(2)])]))
  const cursor: FlowCursor = { ...stageCursor }
  const value = resume([{ index: 0, control: { kind: 'branch', arm: 'else' } }, { index: 0 }])
  const before = JSON.stringify({ executable, cursor, value })
  const location = await validateScriptContinuation(
    executable,
    cursor,
    value,
    undefined,
    new AbortController().signal,
  )
  expect(location.leaf).toEqual({ kind: 'giveMoney', delta: 2 })
  expect(JSON.stringify({ executable, cursor, value })).toBe(before)
})

test('mutating the returned location never reaches back into the resume or the inherited self', async () => {
  const loopSetup = compile(stage([whileLoop([giveMoney(1)])]))
  const value = resume([{ index: 0, control: { kind: 'loop', phase: 'test' } }])
  const located = await validateScriptContinuation(
    loopSetup,
    stageCursor,
    value,
    undefined,
    new AbortController().signal,
  )
  const control = located.control
  if (control?.kind !== 'loop') throw new Error('expected loop control location')
  control.phase = 'body'
  expect(value.frames[0]?.control).toEqual({ kind: 'loop', phase: 'test' })

  const sharedSetup = compile(stage([callShared()]))
  const resolver = new RuntimeSharedScriptResolver(library('required', [giveMoney(8)]), DIGEST)
  const inherited = structuredClone(SELF_A)
  const locatedSelf = await validateScriptContinuation(
    sharedSetup,
    stageCursor,
    resume([{ index: 0 }, { index: 0 }]),
    resolver,
    new AbortController().signal,
    inherited,
  )
  const self = expectDefined(locatedSelf.self)
  self.scene = 'mutated'
  self.entity = 'mutated'
  expect(inherited).toEqual(SELF_A)
})
