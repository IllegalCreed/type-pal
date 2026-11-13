import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { instrumentBattleRandomDraws } from './battle-random-instrumentation.mjs'
import {
  instrumentReforgeBattle,
  REFORGE_BATTLE_TARGETS,
} from './battle-reforge-instrumentation.mjs'
import { battleObserverScript } from './battle-trace-observer.mjs'

test('current real battle producers instrument once; drift fails closed and normal source is preserved', async () => {
  for (const file of REFORGE_BATTLE_TARGETS) {
    const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
    const instrumented = instrumentReforgeBattle(source, file)
    assert(Object.keys(instrumented.anchors).length >= 1)
    // Removing every inserted character must recover the original source as a subsequence.
    let cursor = 0
    for (const character of instrumented.code) if (character === source[cursor]) cursor++
    assert.equal(cursor, source.length)
    assert(!instrumented.code.includes('extra.count--'))
    if (file.endsWith('/battle/battle-session.ts'))
      assert.throws(
        () =>
          instrumentReforgeBattle(
            source.replace(
              'renderBattleScene(ctx, scene, worldScale)',
              'renderBattleScene(ctx, otherScene, worldScale)',
            ),
            file,
          ),
        /producer drift/,
      )
    if (file.endsWith('/battle/battle-core.ts')) {
      assert.match(
        instrumented.code,
        /markRandom\('spell-damage-variance', undefined, \{ turn: s.turn, side: 'enemy', slot: ti \}\), rng\(\)/,
      )
      assert.throws(
        () =>
          instrumentBattleRandomDraws(
            source.replace('function dealSkillDamage(', 'function movedSkillDamage('),
            file,
          ),
        /battle RNG boundaries changed/,
      )
    }
  }
  const file = REFORGE_BATTLE_TARGETS[1]
  const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  assert.throws(
    () =>
      instrumentReforgeBattle(
        source.replace('finishBattleWorldState(actual,', 'missingCommit(actual,'),
        file,
      ),
    /producer drift/,
  )
  assert.deepEqual(instrumentReforgeBattle('unchanged', 'outside.ts'), {
    code: 'unchanged',
    anchors: {},
  })
})

test('explicit counter changes real item state before the same factual completion hook', async () => {
  const file = REFORGE_BATTLE_TARGETS[2]
  const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const counter = instrumentReforgeBattle(source, file, 'double-herb').code
  assert(counter.includes("s.lastAction.itemId === '99'"))
  assert(counter.indexOf('extra.count--') < counter.indexOf('__battleHarness.afterStep(s)'))
  assert.throws(() => instrumentReforgeBattle(source, file, 'unknown'), /unknown battle counter/)
})

test('Reforge records sorted magic overlay resources, actual frames and fighter paint order', async () => {
  const file = 'packages/reforge/src/battle/present-battle.ts'
  const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const browser = vm.createContext({
    exports: {},
    performance,
    structuredClone,
    TextEncoder,
    require(specifier) {
      if (specifier === '../defined.js') return { expectDefined: (value) => value }
      assert.equal(specifier, '../render.js')
      return { bakeFrame: (frame) => frame }
    },
  })
  const code = instrumentReforgeBattle(source, file).code
  vm.runInContext(
    ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    browser,
  )
  const context = {
    engine: 'reforge',
    scenarioId: 'friendly-spell',
    runId: 'native-draw',
    random: { algorithm: 'mulberry32', seed: 3 },
  }
  const indexedFrame = (width, height, color) => ({
    width,
    height,
    pixels: new Uint8Array(width * height).fill(color),
    opaque: new Uint8Array(width * height).fill(1),
  })
  const sprite = { frames: [indexedFrame(3, 2, 7), indexedFrame(4, 5, 28)], anchorX: 1, anchorY: 2 }
  const alternateSprite = { ...sprite, frames: [indexedFrame(3, 2, 15), indexedFrame(4, 5, 37)] }
  const capture = (observeMagicOverlays) => {
    vm.runInContext(battleObserverScript({ ...context, observeMagicOverlays }), browser)
    const observer = browser.__battleEvidence
    observer.start({}, 'start')
    const drawCalls = []
    const canvas = {
      save() {},
      restore() {},
      scale() {},
      fillRect() {},
      drawImage: (...args) => drawCalls.push(args),
    }
    const player = { sprite, x: 256, y: 152, frame: 1 }
    const enemy = { sprite, x: 100, y: 145, frame: 0 }
    const scene = {
      palette: { colors: Array.from({ length: 256 }, () => [0, 0, 0]), cycles: [] },
      enemies: [enemy],
      players: [player],
      depthOverlays: [
        { sprite: alternateSprite, x: 250, y: 134, frame: 1, layerOffset: 99 },
        { sprite, x: 248, y: 134, frame: 20, layerOffset: 0 },
        { sprite: { ...sprite, frames: [] }, x: 250, y: 134, frame: 0, layerOffset: 0 },
      ],
    }
    for (const clockMs of [0, 40]) {
      observer.beginFrame('reforge:BattleSession.render', { clockMs })
      observer.labelFighter(enemy, 'enemy', 0)
      observer.labelFighter(player, 'player', 1)
      observer.labelMagicOverlays(scene.depthOverlays, { 0: sprite, 28: alternateSprite })
      browser.exports.renderBattleScene(canvas, scene, 1)
      observer.endFrame()
    }
    observer.beginFrame('reforge:BattleSession.render', { clockMs: 80 })
    observer.labelFighter(enemy, 'enemy', 0)
    observer.labelFighter(player, 'player', 1)
    browser.exports.renderBattleScene(canvas, { ...scene, depthOverlays: [] }, 1)
    observer.endFrame()

    const { presentations, errors } = observer.read()
    assert.deepEqual(errors, [])
    assert.deepEqual(drawCalls, [
      [sprite.frames[0], 247, 132],
      [sprite.frames[0], 99, 143],
      [sprite.frames[1], 254, 147],
      [alternateSprite.frames[1], 248, 129],
      [sprite.frames[0], 247, 132],
      [sprite.frames[0], 99, 143],
      [sprite.frames[1], 254, 147],
      [alternateSprite.frames[1], 248, 129],
      [sprite.frames[0], 99, 143],
      [sprite.frames[1], 254, 147],
    ])
    return presentations.map(({ payload }) => ({
      overlays: payload.magicOverlays,
      enemy: payload.enemies[0],
      playerOrder: payload.players[0].paintOrder,
    }))
  }
  const enemy = { slot: 0, x: 100, y: 145, frameIndex: 0, fading: false }
  assert.deepEqual(capture(undefined), [{ overlays: undefined, enemy, playerOrder: undefined }])
  assert.deepEqual(capture(true), [
    {
      overlays: [
        { x: 248, y: 134, frameIndex: 0, spriteChunk: 0, paintOrder: 0 },
        { x: 250, y: 134, frameIndex: 1, spriteChunk: 28, paintOrder: 3 },
      ],
      enemy: { ...enemy, paintOrder: 1 },
      playerOrder: 2,
    },
    { overlays: undefined, enemy: { ...enemy, paintOrder: 0 }, playerOrder: 1 },
  ])
})

test('enemy spell cancellation observes the actual target before the replacement commit', async () => {
  const file = 'packages/reforge/src/battle/battle-command-selection.ts'
  const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const cancelled = []
  const committed = []
  const browser = vm.createContext({
    exports: {},
    __battleHarness: { targetCancel: (...args) => cancelled.push(args) },
  })
  const code = instrumentReforgeBattle(source, file).code
  vm.runInContext(
    ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    browser,
  )
  const selection = new browser.exports.BattleCommandSelection()
  const context = {
    playerIndex: 0,
    player: { skills: ['303'], mp: 100, silenced: false, healthy: true },
    playerCount: 1,
    healthyPlayerCount: 1,
    aliveEnemyIndices: [0, 2],
    usableItems: [],
    throwableItems: [],
    skills: { 303: { target: 'oneEnemy', cost: { mp: 6 } } },
    money: 0,
  }
  const press = (key) =>
    selection.advance(context, new Set([key]), {
      submit: (slot, action) => committed.push([slot, structuredClone(action)]),
    })
  for (const key of ['ArrowLeft', 'Enter', 'Enter', 'ArrowRight', 'Escape']) press(key)
  assert.deepEqual(cancelled, [[0, 'enemy', 2, '303']])
  assert.deepEqual(committed, [])
  assert.equal(selection.phase, 'menu')
  for (const key of ['Enter', 'Enter', 'Enter']) press(key)
  assert.deepEqual(committed, [[0, { kind: 'cast', skillId: '303', targetEnemyIdx: 0 }]])
  assert.equal(cancelled.length, 1)
})
