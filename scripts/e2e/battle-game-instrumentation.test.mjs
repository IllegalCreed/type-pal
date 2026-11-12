import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { GAME_BATTLE_TARGETS, instrumentGameBattle } from './battle-game-instrumentation.mjs'

const source = (file) => readFile(new URL(`../..${file}`, import.meta.url), 'utf8')
const compile = (code, globals = {}) => {
  const context = vm.createContext({ exports: {}, ...globals })
  vm.runInContext(
    ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  )
  return context.exports
}

test('Q2 observation guards the actual native battle boundaries and rejects drift', async () => {
  for (const file of GAME_BATTLE_TARGETS) {
    const native = await source(file)
    const observed = instrumentGameBattle(native, file)
    assert.match(observed.code, /__battle(?:Game|Evidence)/)
    assert.throws(() => instrumentGameBattle(observed.code, file), /instrumented twice/)
    if (file.endsWith('/battle/battle-system.ts')) {
      assert.equal(observed.anchors.command, 7)
      assert.equal(observed.anchors.placeholder, 3)
      assert.equal(observed.anchors['round-start'], 1)
      assert.equal(observed.anchors['round-end'], 1)
      assert.equal(observed.anchors.actionComplete, 4)
      for (const name of ['tickPerformAction', 'tickPostAction', 'autoFillIncapacitatedActions']) {
        assert.throws(
          () =>
            instrumentGameBattle(
              native.replace(`function ${name}(`, `function moved${name}(`),
              file,
            ),
          /boundary census changed/,
        )
      }
    }
  }
})

test('observed native mulberry32 preserves each value, draw count and final state', async () => {
  const file = '/packages/game/src/core/rng.ts'
  const native = await source(file)
  const observations = []
  const original = compile(native).createSeedableRng(1729)
  const observed = compile(instrumentGameBattle(native, file).code, {
    __battleGameRandom: (seed, state, value) => observations.push({ seed, state, value }),
  }).createSeedableRng(1729)
  const calls = [
    ['next', []],
    ['rangeInclusive', [1, 3]],
    ['rangeFloat', [0.9, 1.1]],
    ['range', [0, 5]],
    ['range', [2, 2]],
    ['next', []],
  ]
  for (const [name, args] of calls) assert.equal(observed[name](...args), original[name](...args))
  assert.equal(observations.length, 5, 'degenerate range does not draw')
  assert(observations.every((entry) => entry.seed === 1729 && entry.value >= 0 && entry.value < 1))
  assert.equal(observed.getState(), original.getState())
  assert.equal(observations.at(-1).state, original.getState())
  assert.equal(observations[0].value, compile(native).createSeedableRng(1729).next())
})

test('Game SFX observes its decoded buffer and request only after a successful start', async () => {
  const file = '/packages/game/src/shell/audio.ts'
  const native = await source(file)
  assert.throws(
    () => instrumentGameBattle(native.replace('src.start()', 'src.stop()'), file),
    /boundary census changed/,
  )
  const { code } = instrumentGameBattle(native, file)
  const firstResponse = Promise.withResolvers()
  const requested = [],
    decoded = [],
    started = [],
    nativeSources = [],
    fetched = []
  const buffers = new Map([
    [28, { id: 28 }],
    [37, { id: 37 }],
  ])
  const response = (id) => ({
    ok: true,
    url: `http://127.0.0.1/extracted/sounds/${id}.wav`,
    arrayBuffer: async () => ({ id }),
  })
  const startError = new Error('native start failed')
  let failStart = false
  const nativeContext = {
    state: 'running',
    destination: {},
    async decodeAudioData(bytes) {
      return buffers.get(bytes.id)
    },
    createGain() {
      return { gain: { value: 1 }, connect() {} }
    },
    createBufferSource() {
      return {
        connect(gain) {
          return gain
        },
        start() {
          if (failStart) throw startError
          nativeSources.push(this)
        },
      }
    },
  }
  const { createAudioManager } = compile(code, {
    window: {
      AudioContext: function AudioContext() {
        return nativeContext
      },
    },
    async fetch(path) {
      fetched.push(path)
      return path.endsWith('/28.wav') ? firstResponse.promise : response(37)
    },
    __battleGameAudioRequested: (id) => requested.push(id),
    __battleGameAudioDecoded: (id, buffer, url) => decoded.push({ id, buffer, url }),
    __battleGameAudioStarted(cueId, id, buffer, context) {
      assert.equal(buffer, nativeSources.at(-1).buffer)
      assert.equal(context, nativeContext)
      started.push({ cueId, id, buffer })
    },
  })

  const audio = createAudioManager('/extracted')
  audio.playSound(28)
  audio.playSound(37)
  await new Promise(setImmediate)
  firstResponse.resolve(response(28))
  await new Promise(setImmediate)
  nativeSources.at(-1).onended()
  audio.playSound(28)
  nativeSources.at(-1).onended()
  failStart = true
  assert.throws(
    () => audio.playSound(28),
    (error) => error === startError,
  )

  assert.deepEqual(requested, [28, 37, 28, 28])
  assert.deepEqual(fetched, ['/extracted/sounds/28.wav', '/extracted/sounds/37.wav'])
  assert.deepEqual(
    decoded,
    [37, 28].map((id) => ({ id, buffer: buffers.get(id), url: response(id).url })),
  )
  assert.deepEqual(started, [
    { cueId: 2, id: 37, buffer: buffers.get(37) },
    { cueId: 1, id: 28, buffer: buffers.get(28) },
    { cueId: 3, id: 28, buffer: buffers.get(28) },
  ])
})
