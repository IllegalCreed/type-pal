/** Isolated real-module mutations for B2-a map pointer gesture ownership. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packageRoot = resolve(root, 'packages/editor')
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-map-pointer-gesture-mutants-'))
const test = 'ui/map-pointer-gesture-session.test.tsx'
const mutations = [
  {
    id: 'stroke-overwrite',
    source: 'ui/map-pointer-gesture-session.ts',
    title:
      'map pointer gesture session ownership a painting stroke replaces duplicate cells and can be consumed exactly once',
    from: 'this.#strokes.set(key, edit)',
    to: 'if (!this.#strokes.has(key)) this.#strokes.set(key, edit)',
  },
  {
    id: 'stroke-consume',
    source: 'ui/map-pointer-gesture-session.ts',
    title:
      'map pointer gesture session ownership a painting stroke replaces duplicate cells and can be consumed exactly once',
    from: 'this.#painting = false\n    this.#rectAnchor = null\n    this.#strokes.clear()\n    return edits',
    to: 'this.#painting = false\n    this.#rectAnchor = null\n    void this.#strokes\n    return edits',
  },
  {
    id: 'selection-pointer',
    source: 'ui/map-pointer-gesture-session.ts',
    title:
      'map pointer gesture session ownership selection completion rejects another pointer and atomically consumes the preview',
    from: 'if (!drag || drag.pointerId !== pointerId) return null',
    to: 'if (!drag) return null',
  },
  {
    id: 'selection-consume',
    source: 'ui/map-pointer-gesture-session.ts',
    title:
      'map pointer gesture session ownership selection completion rejects another pointer and atomically consumes the preview',
    from: 'this.#selectionDrag = null\n    this.#selectionPreview = undefined\n    return { drag: { ...drag }, selection }',
    to: 'void this.#selectionDrag\n    this.#selectionPreview = undefined\n    return { drag: { ...drag }, selection }',
  },
  {
    id: 'cancel-paint-signal',
    source: 'ui/map-pointer-gesture-session.ts',
    title:
      'map pointer gesture session ownership cancel synchronously clears selection, paint and pan without returning edits',
    from: 'const paintPreviewInvalidated = this.#painting || this.#strokes.size > 0',
    to: 'const paintPreviewInvalidated = false',
  },
  {
    id: 'cancel-pan-release',
    source: 'ui/map-pointer-gesture-session.ts',
    title:
      'map pointer gesture session ownership cancel synchronously clears selection, paint and pan without returning edits',
    from: 'this.#rectAnchor = null\n    this.#strokes.clear()\n    this.#pan = null\n    return { paintPreviewInvalidated }',
    to: 'this.#rectAnchor = null\n    this.#strokes.clear()\n    void this.#pan\n    return { paintPreviewInvalidated }',
  },
  {
    id: 'reset-coordinate',
    source: 'ui/map-pointer-gesture-session.ts',
    title:
      'map pointer gesture session ownership reset may preserve the sampled coordinate while always releasing active gestures',
    from: 'if (!options.preserveCoordinateHover) this.#coordinateHover = null',
    to: 'this.#coordinateHover = null',
  },
  {
    id: 'blur-cancel',
    source: 'ui/map-pointer-gesture-session.ts',
    title:
      'map pointer gesture session ownership the hook owns blur cancellation, preview state and repaint notifications',
    from: "window.addEventListener('blur', onBlur)",
    to: 'void onBlur',
  },
  {
    id: 'lost-capture-routing',
    source: 'ui/MapMode.tsx',
    title:
      'map pointer gesture session ownership MapMode delegates transient pointer resources to one session owner',
    from: 'if (pointerGesture.isActive()) cancelPointerInteraction()',
    to: 'if (false) cancelPointerInteraction()',
  },
]

const clean = (value) => stripVTControlCharacters(value)
function businessRed(exit, entries, file, title) {
  const executed = entries.filter((entry) => ['passed', 'failed'].includes(entry.status))
  if (exit !== 1 || executed.length !== 1) return false
  const [entry] = executed
  return (
    entry.file === file &&
    entry.fullName === title &&
    entry.status === 'failed' &&
    entry.failureMessages.length > 0 &&
    entry.failureMessages.every(
      (message) =>
        /^AssertionError(?:\b|:)/.test(clean(message).trimStart()) &&
        !/(?:\btimeout\b|\btimed out\b|unhandled|(?:^|\n)\s*(?:Error|TypeError|RangeError):)/i.test(
          clean(message),
        ),
    )
  )
}

const sample = {
  file: '/candidate.test.tsx',
  fullName: 'exact',
  status: 'failed',
  failureMessages: ['AssertionError: business difference'],
}
assert(businessRed(1, [sample], sample.file, sample.fullName))
for (const [exit, entries] of [
  [0, [sample]],
  [2, [sample]],
  [null, [sample]],
  [1, []],
  [1, [sample, sample]],
  [1, [{ ...sample, file: '/other.test.tsx' }]],
  [1, [{ ...sample, fullName: 'other' }]],
  [1, [{ ...sample, status: 'pending' }]],
  [1, [{ ...sample, failureMessages: ['Error: embedded AssertionError'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: timed out'] }]],
])
  assert(!businessRed(exit, entries, sample.file, sample.fullName))

const productFiles = [
  'packages/editor/src/ui/MapMode.tsx',
  'packages/editor/src/ui/map-pointer-gesture-session.ts',
]
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, file)))
    .digest('hex')
const hashes = Object.fromEntries(productFiles.map((file) => [file, hash(file)]))
const rows = []
let controls

for (const mutation of [null, ...mutations]) {
  const id = mutation?.id ?? 'control'
  const report = resolve(output, `${id}.json`)
  const config = resolve(output, `${id}.config.mjs`)
  const target = mutation ? resolve(packageRoot, 'src', mutation.source) : ''
  const testFile = resolve(packageRoot, 'src', test)
  const marker = resolve(output, `${id}.entered`)
  if (mutation) {
    assert.equal(
      readFileSync(target, 'utf8').split(mutation.from).length,
      2,
      `${id}: unique needle`,
    )
    assert.equal(
      controls.filter((entry) => entry.file === testFile && entry.fullName === mutation.title)
        .length,
      1,
      `${id}: exact passing control`,
    )
  }
  const pattern = mutation
    ? `^${mutation.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
    : undefined
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const item=${JSON.stringify(mutation)},target=${JSON.stringify(target)};
export default {root:${JSON.stringify(packageRoot)},plugins:item?[{name:'map-pointer-gesture-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:['src/${test}'],testNamePattern:${JSON.stringify(pattern)},maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: packageRoot,
    env: preciseCoverageEnvironment(),
    encoding: 'utf8',
  })
  const log = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
  writeFileSync(resolve(output, `${id}.log`), log)
  assert.equal(run.signal, null)
  assert(
    !/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/i.test(clean(log)),
    `${id}: runtime error`,
  )
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert(
    data.testResults.every((file) => !file.message),
    `${id}: suite error`,
  )
  assert.equal(data.numTodoTests, 0)
  const entries = data.testResults.flatMap((file) =>
    file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
  )
  if (!mutation) {
    assert.equal(run.status, 0, `control: ${output}`)
    assert.equal(entries.length, 6)
    assert.equal(data.numPassedTests, 6)
    assert.equal(data.numPendingTests, 0)
    controls = entries
  } else {
    assert(
      businessRed(run.status, entries, testFile, mutation.title),
      `${id}: not business red; ${output}`,
    )
    assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), { id, target })
    assert.equal(data.numPendingTests, 5)
  }
  for (const [file, expected] of Object.entries(hashes))
    assert.equal(hash(file), expected, `${id}: changed product`)
  rows.push({
    id,
    exit: run.status,
    executed: entries
      .filter((entry) => ['passed', 'failed'].includes(entry.status))
      .map(({ file, fullName, status, failureMessages }) => ({
        file,
        fullName,
        status,
        failureMessages,
      })),
  })
  console.log(
    `${id}: ${mutation ? 'detected (candidate AssertionError)' : `${data.numPassedTests} passing`}`,
  )
}

writeFileSync(
  resolve(output, 'summary.json'),
  `${JSON.stringify({ hashes, judge: { positive: 1, rejected: 9 }, rows }, null, 2)}\n`,
)
console.log(`Evidence: ${output}`)
