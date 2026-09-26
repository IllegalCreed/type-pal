/** Isolated real-module mutations for B2 map transform, view and structure sessions. */
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
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-map-workspace-sessions-mutants-'))
const tests = {
  transform: 'ui/map-transform-session.test.ts',
  view: 'ui/map-workspace-view-session.test.tsx',
  structure: 'ui/map-stamp-structure-session.test.tsx',
}
const mutations = [
  {
    id: 'transform-complete',
    source: 'ui/map-transform-session.ts',
    test: tests.transform,
    title:
      'map transform session ownership begin and complete atomically own preview, lock and overwrite state',
    from: "case 'complete':\n      return { ...state, intent: undefined, targetLocked: false, overwriteIntent: undefined }",
    to: "case 'complete':\n      return { ...state, targetLocked: false, overwriteIntent: undefined }",
  },
  {
    id: 'transform-return-adjustment',
    source: 'ui/map-transform-session.ts',
    test: tests.transform,
    title:
      'map transform session ownership returning from overwrite preserves the preview while unlocking adjustment',
    from: "case 'return-to-adjustment':\n      return { ...state, targetLocked: false, overwriteIntent: undefined }",
    to: "case 'return-to-adjustment':\n      return { ...state, targetLocked: true, overwriteIntent: undefined }",
  },
  {
    id: 'transform-map-clipboard',
    source: 'ui/map-transform-session.ts',
    test: tests.transform,
    title:
      'map transform session ownership map reset retains cell clipboard but releases stamp identities and every preview',
    from: "clipboard: state.clipboard?.kind === 'stamp-placements' ? undefined : state.clipboard,",
    to: 'clipboard: undefined,',
  },
  {
    id: 'transform-session-preference',
    source: 'ui/map-transform-session.ts',
    test: tests.transform,
    title:
      'map transform session ownership session reset clears project-bound clipboard and previews without changing collision policy',
    from: "case 'reset-session':\n      return {\n        ...state,\n        clipboard: undefined,",
    to: "case 'reset-session':\n      return {\n        ...state,\n        includeCollision: false,\n        clipboard: undefined,",
  },
  {
    id: 'transform-nudge-lock',
    source: 'ui/map-transform-session.ts',
    test: tests.transform,
    title:
      'map transform session ownership anchor updates remain adjustable while a nudge freezes the new target',
    from: 'anchor: nudgeIsometricLattice(state.intent.anchor, action.direction),\n            },\n            targetLocked: true,',
    to: 'anchor: nudgeIsometricLattice(state.intent.anchor, action.direction),\n            },\n            targetLocked: false,',
  },
  {
    id: 'transform-stamp-classification',
    source: 'ui/map-transform-session.ts',
    test: tests.transform,
    title:
      'map transform session ownership stamp-group classification follows clipboard or selected placements without guessing',
    from: "intent.clipboard.kind === 'stamp-placements'",
    to: 'false',
  },
  {
    id: 'transform-owner-wiring',
    source: 'ui/MapMode.tsx',
    test: tests.transform,
    title:
      'map transform session ownership MapMode composes the transform session while retaining the existing selection reducer',
    from: 'complete: completeTransform',
    to: 'complete: finishTransform',
  },
  {
    id: 'view-reset-tool',
    source: 'ui/map-workspace-view-session.ts',
    test: tests.view,
    title:
      'map workspace view session ownership session reset releases project-bound tool and stamp state but preserves view preferences',
    from: "setTool('pan')",
    to: "setTool('select')",
  },
  {
    id: 'view-reset-preference',
    source: 'ui/map-workspace-view-session.ts',
    test: tests.view,
    title:
      'map workspace view session ownership session reset releases project-bound tool and stamp state but preserves view preferences',
    from: 'setStampDialogOpen(false)\n  }, [])',
    to: 'setStampDialogOpen(false)\n    setShowGrid(true)\n  }, [])',
  },
  {
    id: 'view-invalid-stamp-tool',
    source: 'ui/map-workspace-view-session.ts',
    test: tests.view,
    title: 'map workspace view session ownership invalid stamp cleanup exits only the stamp tool',
    from: "setTool((current) => (current === 'stamp' ? 'select' : current))",
    to: "setTool('select')",
  },
  {
    id: 'view-sampled-height',
    source: 'ui/map-workspace-view-session.ts',
    test: tests.view,
    title:
      'map workspace view session ownership eyedropper sampling updates tile source, both heights and the brush tool atomically',
    from: 'setViewHeight(sample.height)',
    to: 'setViewHeight(0)',
  },
  {
    id: 'view-owner-wiring',
    source: 'ui/MapMode.tsx',
    test: tests.view,
    title:
      'map workspace view session ownership MapMode has one view owner and no duplicate view preference state declarations',
    from: "useMapWorkspaceViewSession(liveMap?.tilesetRefs[0] ?? tilesets[0]?.id ?? '')",
    to: "useMapWorkspaceViewSession('')",
  },
  {
    id: 'structure-focus',
    source: 'ui/map-stamp-structure-session.ts',
    test: tests.structure,
    title:
      'map stamp structure session ownership open captures one map revision, impact list and focus target',
    from: 'returnFocusRef.current = returnFocus',
    to: 'void returnFocus',
  },
  {
    id: 'structure-refresh',
    source: 'ui/map-stamp-structure-session.ts',
    test: tests.structure,
    title:
      'map stamp structure session ownership refresh replaces only the stale snapshot while preserving the requested operation',
    from: 'setIntent((current) => (current ? { ...current, ...snapshot } : current))',
    to: 'setIntent((current) => current)',
  },
  {
    id: 'structure-close-focus',
    source: 'ui/map-stamp-structure-session.ts',
    test: tests.structure,
    title:
      'map stamp structure session ownership close keeps the fallback focus resource until reset releases the whole session',
    from: 'const close = useCallback((): void => setIntent(undefined), [])',
    to: 'const close = useCallback((): void => { setIntent(undefined); returnFocusRef.current = null }, [])',
  },
  {
    id: 'structure-reset-focus',
    source: 'ui/map-stamp-structure-session.ts',
    test: tests.structure,
    title:
      'map stamp structure session ownership close keeps the fallback focus resource until reset releases the whole session',
    from: 'setIntent(undefined)\n    returnFocusRef.current = null',
    to: 'setIntent(undefined)\n    void returnFocusRef',
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
  file: '/candidate.test.ts',
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
  [1, [{ ...sample, file: '/other.test.ts' }]],
  [1, [{ ...sample, fullName: 'other' }]],
  [1, [{ ...sample, status: 'pending' }]],
  [1, [{ ...sample, failureMessages: ['Error: embedded AssertionError'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: timed out'] }]],
])
  assert(!businessRed(exit, entries, sample.file, sample.fullName))

const productFiles = [
  'packages/editor/src/ui/MapMode.tsx',
  'packages/editor/src/ui/map-transform-session.ts',
  'packages/editor/src/ui/map-workspace-view-session.ts',
  'packages/editor/src/ui/map-stamp-structure-session.ts',
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
  const testFile = mutation ? resolve(packageRoot, 'src', mutation.test) : ''
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
export default {root:${JSON.stringify(packageRoot)},plugins:item?[{name:'map-workspace-session-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:${JSON.stringify(Object.values(tests).map((file) => `src/${file}`))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
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
    assert.equal(entries.length, 15)
    assert.equal(data.numPassedTests, 15)
    assert.equal(data.numPendingTests, 0)
    controls = entries
  } else {
    assert(
      businessRed(run.status, entries, testFile, mutation.title),
      `${id}: not business red; ${output}`,
    )
    assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), { id, target })
    assert.equal(data.numPendingTests, 14)
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
