import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { installOpeningTrace } from './opening-trace.mjs'
import { instrumentOpeningTrace, TRACE_TARGETS } from './opening-trace-plugin.mjs'

const source = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
const gameFile = TRACE_TARGETS[0]
function actualFunction(code, name) {
  const ast = ts.createSourceFile('real.ts', code, ts.ScriptTarget.Latest, true)
  const matches = ast.statements.filter((n) => ts.isFunctionDeclaration(n) && n.name?.text === name)
  assert.equal(matches.length, 1, `real function ${name}`)
  return ts.transpile(matches[0].getText(ast).replace(/^export /, ''), {
    target: ts.ScriptTarget.ES2022,
  })
}
function withTrace(run) {
  // Execute the same serializable initializer as Playwright, on a fresh object per test.
  const host = {}
  new Function('globalThis', `(${installOpeningTrace.toString()})()`)(host)
  return run(host)
}
const snapshot = (position = [0, 0]) => ({
  engine: 'game',
  instance: 'room',
  npc: 10,
  position,
  facing: 'up',
  visible: true,
  dialogue: null,
  control: false,
})

test('all four real source modules match exact trace anchors, source drift fails closed', () => {
  for (const file of TRACE_TARGETS) {
    const code = source(file)
    const result = instrumentOpeningTrace(code, file)
    assert(result.code.length > code.length)
  }
  assert.throws(
    () =>
      instrumentOpeningTrace(
        source(gameFile).replace('function npcWalkTo(', 'function renamedWalk('),
        gameFile,
      ),
    /NPC write census changed/,
  )
  assert.throws(() => instrumentOpeningTrace('', 'unknown.ts'), /unexpected trace source/)
})

test('real npcWalkTo outward/return commits in one sample window cannot disappear; return and state equal uninstrumented implementation', () =>
  withTrace((host) => {
    const raw = source(gameFile)
    const transformed = instrumentOpeningTrace(raw, gameFile).code
    const compile = (code, targetHost) =>
      new Function(
        'globalThis',
        `${actualFunction(code, 'walkFrameMod')}\n${actualFunction(code, 'npcWalkTo')}\nreturn npcWalkTo;`,
      )(targetHost)
    const watched = { id: 10, x: 0, y: 0, facing: 'up', nSpriteFrames: 4, sState: 2 }
    const plain = structuredClone(watched)
    const gs = {
      wNumScene: 2,
      allEventObjects: [watched],
      frameNum: 1,
      mode: 'script',
      dialogBox: null,
    }
    host.__tpgs = gs
    const real = compile(raw, {}),
      observed = compile(transformed, host)
    for (const args of [
      [1, 1, 0, 32],
      [0, 0, 0, 32],
      [10, 10, 0, 2],
    ]) {
      assert.equal(observed(watched, ...args), real(plain, ...args))
      assert.deepEqual(watched, plain)
    }
    const trace = host.__readOpeningTrace()
    assert.deepEqual(trace.errors, [])
    assert.deepEqual(
      trace.events.filter((e) => e.kind === 'move').map((e) => [e.from, e.position]),
      [
        [
          [0, 0],
          [32, 16],
        ],
        [
          [32, 16],
          [0, 0],
        ],
        [
          [0, 0],
          [4, 2],
        ],
      ],
    )
    watched.x = 999
    assert.equal(trace.events.at(-1).position[0], 4, 'events must not retain engine aliases')
  }))

test('noncommitted plans produce no move; changed position first seen at render is evidence loss', () =>
  withTrace((host) => {
    const s = snapshot()
    host.__openingTracePoint('before:plan', s)
    host.__openingTracePoint('render:world', s)
    assert.equal(host.__readOpeningTrace().events.length, 1)
    host.__openingTracePoint('render:world', snapshot([1, 0]))
    assert.match(host.__readOpeningTrace().errors[0], /unobserved movement/)
  }))

test('dialogue context is captured at commit and own DTOs survive caller mutation', () =>
  withTrace((host) => {
    const s = snapshot()
    host.__openingTracePoint('before:move', s)
    s.dialogue = { phase: 'waiting-input', text: '还不快过来帮忙' }
    host.__openingTracePoint('render:dialogue', s)
    s.position = [1, 1]
    host.__openingTracePoint('commit:move', s)
    s.dialogue.text = 'changed'
    const trace = host.__readOpeningTrace()
    assert.equal(trace.events.at(-1).dialogue.text, '还不快过来帮忙')
    trace.events.length = 0
    assert.equal(host.__readOpeningTrace().events.length, 3)
  }))

test('bounded collector flags overflow and malformed points without throwing into gameplay', () =>
  withTrace((host) => {
    assert.doesNotThrow(() => host.__openingTracePoint('commit:bad', snapshot([NaN, 1])))
    assert.equal(host.__readOpeningTrace().errors.length, 1)
    for (let i = 0; i < 1602; i++) host.__openingTracePoint('commit:move', snapshot([i, 0]))
    assert.equal(host.__readOpeningTrace().events.length, 1600)
    assert.equal(host.__readOpeningTrace().overflow, true)
  }))

test('instrumented real function preserves original thrown error identity', () => {
  const code = instrumentOpeningTrace(source(gameFile), gameFile).code
  const error = new Error('original operand read')
  const npc = {
    get x() {
      throw error
    },
  }
  const host = { __openingTraceGame() {} }
  const call = new Function(
    'globalThis',
    `${actualFunction(code, 'npcWalkTo')}\nreturn npcWalkTo;`,
  )(host)
  assert.throws(
    () => call(npc, 1, 1, 0, 2),
    (e) => e === error,
  )
})

test('removing real npcWalkTo commit hook is detected by next boundary, not accepted as stationary', () =>
  withTrace((host) => {
    const code = instrumentOpeningTrace(source(gameFile), gameFile).code
    const needle = 'globalThis.__openingTraceGame?.(globalThis.__tpgs, "commit:npcWalkTo");'
    assert.equal(code.split(needle).length, 2)
    const missed = code.replace(needle, '')
    const fn = new Function(
      'globalThis',
      `${actualFunction(missed, 'npcWalkTo')}\nreturn npcWalkTo;`,
    )(host)
    const npc = { id: 10, x: 0, y: 0, facing: 'up', sState: 2 }
    host.__tpgs = { wNumScene: 2, allEventObjects: [npc], dialogBox: null }
    fn(npc, 1, 1, 0, 32)
    fn(npc, 0, 0, 0, 32)
    assert.match(host.__readOpeningTrace().errors[0], /unobserved movement at before:npcWalkTo/)
  }))
