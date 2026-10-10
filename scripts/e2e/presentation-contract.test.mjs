import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { checkPresentationEffects } from './presentation-contract.mjs'
import { instrumentPresentationEvidence } from './presentation-evidence.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'

const source = (name) =>
  readFileSync(new URL(`../../packages/reforge/src/${name}.ts`, import.meta.url), 'utf8')
const transpile = (text) =>
  ts.transpile(text, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None })
const declarations = (code, names) => {
  const ast = ts.createSourceFile('fixture.ts', code, ts.ScriptTarget.Latest, true),
    found = []
  const visit = (node) => {
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      names.includes(node.name?.text)
    )
      found.push(node.getText(ast).replace(/^export /u, ''))
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(found.length, names.length)
  return transpile(found.join('\n'))
}

test('actual fade/dither drivers and successful output callers prove explicit effects; missing, truncated and wrong-owner output fail', async () => {
  const hooks = {},
    causes = []
  const observer = new Function(
    'globalThis',
    'options',
    `return (${createScriptCausalObserver})(options)`,
  )(hooks, {
    append: (list, e) => {
      const record = structuredClone({ ...e, order: causes.length + 1 })
      list.push(record)
      causes.push(record)
    },
    context: () => ({ scene: 's003', sceneVisit: 1, tick: 1, poses: {} }),
    snapshotGame: () => {},
    fail: (e) => {
      throw e
    },
    scenes: ['s003'],
  })
  const waitCode = source('script-work-queue').replaceAll('export ', '')
  const wait = new Function(`${transpile(waitCode)};return scriptWorkWait`)()
  const load = (name, names) =>
    new Function(
      'globalThis',
      'scriptWorkWait',
      `${declarations(instrumentPresentationEvidence(source(name), `packages/reforge/src/${name}.ts`).code, names)};return ${names.at(-1)}`,
    )(hooks, wait)
  const Fade = load('fade-driver', ['fadeAbortError', 'SupersedingFadeDriver'])
  const Dither = load('dither-transition', ['ditherAbortError', 'DitherTransitionController'])
  const main = instrumentPresentationEvidence(source('main'), 'packages/reforge/src/main.ts').code
  const runner = {},
    controller = new AbortController(),
    frames = { now: 0 },
    fade = new Fade(0)
  const ctx = {
    paint: '',
    set fillStyle(value) {
      this.paint = value === 'rgba(0,0,0,1.000)' ? '#000000' : value
    },
    get fillStyle() {
      return this.paint
    },
    save() {},
    restore() {},
    fillRect() {},
  }
  const renderFade = new Function(
    'globalThis',
    'fadeDriver',
    'frames',
    'ctx',
    'canvas',
    'fadeCurtain',
    `${declarations(main, ['drawFadeCurtain'])};return drawFadeCurtain`,
  )(hooks, fade, frames, ctx, { width: 320, height: 200 }, 'black')
  hooks.__openingCauseRun(runner, controller.signal, {})
  const command = (c) =>
    hooks.__openingCauseStep(runner, {
      timing: 'interactive',
      command: { kind: 'leaf', command: c },
    })
  for (const dir of ['out', 'in']) {
    command({ kind: 'fade', dir, ms: 600 })
    const start = frames.now,
      pending = fade.begin(dir === 'out' ? 1 : 0, start, 600, controller.signal)
    for (const time of [0, 300, 600]) {
      frames.now = start + time
      fade.advance(frames.now)
      await Promise.resolve() // Runtime drains script work after advance, before presentation.
      if (time < 600 || dir === 'in') renderFade()
    }
    await pending
  }
  command({ kind: 'ditherScreen', ms: 720 })
  const dither = new Dither(),
    pending = dither.beginSnapshot(() => ({ data: 'source' }), 720, {}, controller.signal)
  const ast = ts.createSourceFile('main.ts', main, ts.ScriptTarget.Latest, true)
  let statements
  const visit = (node) => {
    if (ts.isIfStatement(node) && node.expression.getText(ast) === 'dither.output') {
      const list = node.parent.statements,
        index = list.indexOf(node)
      statements = [node.getText(ast), list[index + 1].getText(ast)].join('\n')
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert(statements)
  let pixels = 0
  const output = new Function(
    'globalThis',
    'ctx',
    'dither',
    'step',
    'pr',
    'isZeroFrame',
    'performance',
    transpile(statements),
  )
  for (const step of [0, 36, 72]) {
    Object.assign(dither.active, { lastStep: step, output: { data: step }, startedAt: 0 })
    output(
      hooks,
      {
        putImageData: () => {
          pixels++
        },
      },
      dither.active,
      step,
      step / 72,
      step === 0,
      { now: () => step * 10 },
    )
  }
  dither.finish()
  await pending
  hooks.__openingCauseSettled(runner, { decision: 'continue' })
  hooks.__openingCauseEnded(runner, { resolved: true, aborted: false })
  const trace = { causes: observer.read() }
  assert.equal(pixels, 3)
  assert.equal(checkPresentationEffects(trace).status, 'proved')
  assert.equal(checkPresentationEffects(trace).final.commands, 3)
  for (const change of [
    (t) => {
      t.causes = t.causes.filter((e) => e.phase !== 'presentation-draw')
    },
    (t) => {
      t.causes.find((e) => e.phase === 'presentation-draw').effectId++
    },
    (t) => {
      t.causes.find(
        (e) => e.phase === 'presentation-draw' && e.presentation.step === 72,
      ).presentation.step = 36
    },
    (t) => {
      t.causes.find(
        (e) => e.phase === 'presentation-draw' && e.presentation.value === 0.5,
      ).presentation.value = 0
    },
    (t) => {
      t.causes = t.causes.filter((e) => e.phase !== 'presentation-end')
    },
    (t) => {
      t.causes.find((e) => e.phase === 'presentation-end').presentation.error = 'cancelled'
    },
    (t) => {
      t.causes.find(
        (e) => e.phase === 'presentation-draw' && e.presentation.step === 72,
      ).presentation.sampledAt = 360
    },
    (t) => {
      const first = t.causes.find((e) => e.phase === 'presentation-start').effectId
      const end = t.causes.find((e) => e.phase === 'presentation-end' && e.effectId === first)
      t.causes.find(
        (e) =>
          e.phase === 'presentation-draw' && e.effectId === first && e.presentation.value === 0.5,
      ).order = end.order + 0.1
    },
  ]) {
    const broken = structuredClone(trace)
    change(broken)
    assert.notEqual(checkPresentationEffects(broken).status, 'proved')
  }
  const before = causes.length
  assert.throws(
    () =>
      output(
        hooks,
        {
          putImageData: () => {
            throw Error('output failed')
          },
        },
        { output: {} },
        72,
        1,
        false,
      ),
    /output failed/,
  )
  assert.equal(causes.length, before, 'failed pixel output cannot leave a success receipt')
})
