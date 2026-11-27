import type { RuntimeCommand, RuntimeScriptLibrary } from '@type-pal/content'
import { expect, test } from 'vitest'
import { expectDefined } from './defined.js'
import {
  compileRuntimeCommandRoot,
  RuntimeSharedScriptResolver,
} from './runtime-script-compiler.js'

const digest = 'a'.repeat(64)
const greeting = (): RuntimeScriptLibrary => ({
  'shared/greet': {
    name: 'Greeting',
    self: 'none',
    body: [
      { kind: 'dialog', cue: { rows: [{ text: 'Hello' }] } },
      { kind: 'giveItem', itemId: '61', count: 2 },
    ],
  },
})
const greetingBody = [
  { kind: 'leaf', command: { kind: 'dialog', cue: { rows: [{ text: 'Hello' }] } } },
  { kind: 'leaf', command: { kind: 'giveItem', itemId: '61', count: 2 } },
]

test('the runtime resolver accepts a registered constructor and rejects the inherited name', () => {
  expect(() =>
    new RuntimeSharedScriptResolver({}, digest).resolve('constructor', 'interactive'),
  ).toThrow('shared script 不存在: constructor')
  const script: RuntimeScriptLibrary[string] = {
    name: 'Exit',
    self: 'none',
    body: [{ kind: 'stopMusic' }],
  }
  const resolver = new RuntimeSharedScriptResolver(
    Object.fromEntries([['constructor', script]]),
    digest,
  )
  expect(resolver.resolve('constructor', 'interactive').body).toEqual([
    { kind: 'leaf', command: { kind: 'stopMusic' } },
  ])
})

test('shared scripts cache per timing and retain their canonical identity and explicit body', () => {
  const library = greeting()
  const before = structuredClone(library)
  const resolver = new RuntimeSharedScriptResolver(library, digest)
  const auto = resolver.resolve('shared/greet', 'auto')
  const interactive = resolver.resolve('shared/greet', 'interactive')
  const expected = {
    canonicalContentDigest: digest,
    id: 'shared/greet',
    name: 'Greeting',
    self: 'none',
  }
  expect(auto).toMatchObject({ ...expected, timing: 'auto' })
  expect(interactive).toMatchObject({ ...expected, timing: 'interactive' })
  expect(auto.body).toEqual(greetingBody)
  expect(interactive.body).toEqual(greetingBody)
  expect(auto).not.toBe(interactive)
  expect(resolver.resolve('shared/greet', 'auto')).toBe(auto)
  expect(resolver.resolve('shared/greet', 'interactive')).toBe(interactive)
  expect(library).toEqual(before)
})

test('separate projects can resolve the same ID with a different command body', () => {
  const first = new RuntimeSharedScriptResolver(greeting(), digest)
  const second = new RuntimeSharedScriptResolver(
    { 'shared/greet': { name: 'Farewell', self: 'none', body: [{ kind: 'stopMusic' }] } },
    'b'.repeat(64),
  )
  expect(first.resolve('shared/greet', 'auto').body).toEqual(greetingBody)
  expect(second.resolve('shared/greet', 'auto')).toMatchObject({
    canonicalContentDigest: 'b'.repeat(64),
    name: 'Farewell',
    body: [{ kind: 'leaf', command: { kind: 'stopMusic' } }],
  })
})

test('invalid project digests and missing shared IDs fail at their own boundary', () => {
  expect(() => new RuntimeSharedScriptResolver(greeting(), 'XYZ')).toThrow(
    'canonicalContentDigest: 期望小写 SHA-256',
  )
  const resolver = new RuntimeSharedScriptResolver(greeting(), digest)
  expect(() => resolver.resolve('shared/missing', 'auto')).toThrow(
    'shared script 不存在: shared/missing',
  )
})

test('the runtime command root keeps the provided order and never rewrites its source', () => {
  const commands: RuntimeCommand[] = [
    { kind: 'dialog', cue: { rows: [{ text: 'Hello' }] } },
    { kind: 'giveItem', itemId: '61', count: 2 },
    { kind: 'wait', ms: 100 },
  ]
  const before = structuredClone(commands)
  const compiled = compileRuntimeCommandRoot(commands, {
    canonicalContentDigest: digest,
    timing: 'interactive',
  })
  expect(compiled.rootScope).toBe('script')
  expect(compiled.flow.stages).toEqual([
    {
      id: '__script',
      body: [...greetingBody, { kind: 'leaf', command: { kind: 'wait', ms: 100 } }],
    },
  ])
  expect(commands).toEqual(before)
})

test('compiled nested conditions and effects never share state with the actual source library', () => {
  const library: RuntimeScriptLibrary = {
    'shared/check-point': {
      name: 'Check point',
      self: 'none',
      body: [
        {
          kind: 'branch',
          cond: { kind: 'currentScene', scene: 'arrival' },
          then: [{ kind: 'giveItem', itemId: '61', count: 1 }],
        },
      ],
    },
  }
  const before = structuredClone(library)
  const resolved = new RuntimeSharedScriptResolver(library, digest).resolve(
    'shared/check-point',
    'interactive',
  )
  const branch = expectDefined(resolved.body[0])
  if (branch.kind !== 'branch' || branch.cond.kind !== 'currentScene')
    throw new Error('missing compiled scene condition')
  const reward = expectDefined(branch.then[0])
  if (reward.kind !== 'leaf' || reward.command.kind !== 'giveItem')
    throw new Error('missing compiled reward')
  expect(branch.cond.scene).toBe('arrival')
  expect(reward.command).toEqual({ kind: 'giveItem', itemId: '61', count: 1 })

  branch.cond.scene = 'departed'
  reward.command.count = 9
  expect(library).toEqual(before)
})
