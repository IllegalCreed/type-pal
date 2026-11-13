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
    if (file.endsWith('/battle/magic-damage.ts')) {
      assert.match(
        observed.code,
        /markRandom\('spell-damage-variance', undefined, \{ turn: state.turn \+ 1, side: 'enemy', slot: idx \}\), state.rng.next\(\)/,
      )
      assert.throws(
        () =>
          instrumentGameBattle(
            native.replace('function applyMagicDamage(', 'function movedMagicDamage('),
            file,
          ),
        /battle RNG boundaries changed/,
      )
    }
    if (file.endsWith('/draw-battle-sprites.ts')) {
      assert.throws(
        () =>
          instrumentGameBattle(
            native.replace('?? sprite.frames[0]!', '?? sprite.frames[1]!'),
            file,
          ),
        /fighter frame selection changed/,
      )
    }
    if (file.endsWith('/battle/battle-system.ts')) {
      assert.equal(observed.anchors.command, 7)
      assert.equal(observed.anchors.placeholder, 3)
      assert.equal(observed.anchors['round-start'], 1)
      assert.equal(observed.anchors['round-end'], 1)
      assert.equal(
        observed.anchors.actionComplete,
        native.includes('function tickActionFollowup(') ? 2 : 4,
      )
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

test('Game reports the sprite frame that blits, including the frame zero fallback', async () => {
  const file = '/packages/game/src/present/battle/draw-battle-sprites.ts'
  const [native, positions] = await Promise.all([
    source(file),
    source('/packages/game/src/core/battle/battle-positions.ts').then((code) => compile(code)),
  ])
  const labels = new WeakMap()
  const facts = []
  const pixels = []
  const { drawBattleSprites } = compile(instrumentGameBattle(native, file).code, {
    require(specifier) {
      assert.equal(specifier, '../../core/battle/battle-positions.js')
      return positions
    },
    __battleEvidence: {
      labelFighter(draw, side, slot, fading = false, frameIndex) {
        labels.set(draw, { side, slot, fading, frameIndex })
      },
      fighterDrawn(draw) {
        const { side, slot, fading, frameIndex } = labels.get(draw)
        facts.push([
          side,
          slot,
          fading,
          frameIndex,
          draw.x,
          draw.y,
          draw.iColorShift,
          pixels.at(-1),
        ])
      },
    },
  })
  const fb = { writePixel: (x, y, color) => pixels.push([x, y, color]) }
  const status = { sleep: 0, confused: 0, paralyzed: 0 }
  const state = {
    uiState: 'wait',
    battleAnim: { frames: [{ durationMs: 40 }], idx: 0, frameElapsedMs: 0 },
    enemies: [{ e: { id: 2, health: 30 }, currentFrame: 2, pos: { x: 50, y: 90 }, status }],
    players: [
      {
        roleId: 0,
        currentFrame: 4,
        pos: { x: 240, y: 170 },
        status,
        defending: true,
        iColorShift: 6,
      },
    ],
  }
  const roles = { roles: [{ hp: 150, maxHP: 150, spriteNumInBattle: 0 }] }
  const sprite = (colors) => ({
    frames: colors.map((color) => ({
      width: 1,
      height: 1,
      opaque: Uint8Array.of(1),
      indices: Uint8Array.of(color),
    })),
  })
  const draw = (enemyColors, playerColors) => {
    drawBattleSprites(
      fb,
      state,
      new Map([
        ['enemy-2', sprite(enemyColors)],
        ['player-0', sprite(playerColors)],
      ]),
      roles,
      undefined,
    )
    return facts.splice(0)
  }

  assert.deepEqual(draw([0x30, 0x31, 0x32], [0x10, 0x11, 0x12, 0x13, 0x24]), [
    ['enemy', 0, false, 2, 50, 90, 0, [50, 89, 0x32]],
    ['player', 0, false, 4, 240, 170, 6, [240, 169, 0x2a]],
  ])
  assert.deepEqual(draw([0x30], [0x10]), [
    ['enemy', 0, false, 0, 50, 90, 0, [50, 89, 0x30]],
    ['player', 0, false, 0, 240, 170, 6, [240, 169, 0x16]],
  ])
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
