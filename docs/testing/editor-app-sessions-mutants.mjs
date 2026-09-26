/** Isolated real-module mutations for the B1 editor application sessions. */
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
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-editor-app-sessions-mutants-'))
const tests = [
  'ui/use-editor-navigation-session.test.tsx',
  'ui/use-scene-workspace-session.test.tsx',
  'ui/use-battle-trial-session.test.tsx',
  'ui/App.leave-guard.test.tsx',
  'ui/app-session-ownership.test.ts',
]
const mutations = [
  {
    id: 'url-priority',
    source: 'ui/use-editor-navigation-session.ts',
    test: tests[0],
    title:
      'editor navigation session ownership stored state is workspace-scoped and normalized while an explicit URL wins initial selection',
    from: "if (params.has('module') || params.has('page') || params.has('object'))",
    to: "if (false && (params.has('module') || params.has('page') || params.has('object')))",
  },
  {
    id: 'scroll-capture',
    source: 'ui/use-editor-navigation-session.ts',
    test: tests[0],
    title:
      'editor navigation session ownership page navigation captures old columns, persists the new location and restores on replace',
    from: 'center: columns.center?.scrollTop ?? 0,',
    to: 'center: 0,',
  },
  {
    id: 'popstate-history',
    source: 'ui/use-editor-navigation-session.ts',
    test: tests[0],
    title:
      'editor navigation session ownership popstate consumes the URL without writing a new history entry',
    from: "apply(decodeEditorLocation(window.location.search), 'none')",
    to: "apply(decodeEditorLocation(window.location.search), 'push')",
  },
  {
    id: 'restore-frame-cleanup',
    source: 'ui/use-editor-navigation-session.ts',
    test: tests[0],
    title:
      'editor navigation session ownership unmount cancels the owned restore frame and detaches popstate',
    from: 'return () => window.cancelAnimationFrame(frame)',
    to: 'return () => undefined',
  },
  {
    id: 'initial-scene-link',
    source: 'ui/use-scene-workspace-session.ts',
    test: tests[1],
    title:
      'scene workspace session ownership an invalid initial scene deep link falls back to the default scene identity',
    from: "return target && scenes.some((scene) => scene.id === target) ? target : (defaultSceneId ?? '')",
    to: "return target ? target : (defaultSceneId ?? '')",
  },
  {
    id: 'scene-location-sync',
    source: 'ui/use-scene-workspace-session.ts',
    test: tests[1],
    title:
      'scene workspace session ownership a later valid scene-workspace location synchronizes the active scene without resetting tools',
    from: 'setPlaceSceneId(location.objectId)',
    to: 'void location.objectId',
  },
  {
    id: 'scene-switch-reset',
    source: 'ui/use-scene-workspace-session.ts',
    test: tests[1],
    title:
      'scene workspace session ownership explicit workspace switch resets selection and placement before replacing the scene deep link',
    from: 'setSelected(SCENE_SELECTION)',
    to: 'void SCENE_SELECTION',
  },
  {
    id: 'latest-location',
    source: 'ui/use-scene-workspace-session.ts',
    test: tests[1],
    title:
      'scene workspace session ownership a retained switch callback reads the latest location before replacing the deep link',
    from: 'const current = locationRef.current',
    to: 'const current = location',
  },
  {
    id: 'outside-workspace',
    source: 'ui/use-scene-workspace-session.ts',
    test: tests[1],
    title:
      'scene workspace session ownership switching the retained scene outside the scene workspace does not rewrite another module URL',
    from: "if (current.module === 'scene' && current.subpage === 'workspace')",
    to: 'if (true)',
  },
  {
    id: 'trial-unload',
    source: 'ui/use-battle-trial-session.ts',
    test: tests[2],
    title:
      'battle trial session ownership changed temporary configuration owns beforeunload and explicit discard continuation',
    from: 'if (!draft?.changed) return',
    to: 'if (draft?.changed) return',
  },
  {
    id: 'trial-discard-request',
    source: 'ui/use-battle-trial-session.ts',
    test: tests[2],
    title:
      'battle trial session ownership changed temporary configuration owns beforeunload and explicit discard continuation',
    from: 'if (!draftRef.current?.changed) {',
    to: 'if (true) {',
  },
  {
    id: 'trial-discard-confirm',
    source: 'ui/use-battle-trial-session.ts',
    test: tests[2],
    title:
      'battle trial session ownership changed temporary configuration owns beforeunload and explicit discard continuation',
    from: 'continuation?.()',
    to: 'void continuation',
  },
  {
    id: 'trial-single-window',
    source: 'ui/use-battle-trial-session.ts',
    test: tests[2],
    title:
      'battle trial session ownership launch owns one popup, revalidates the captured editor revision and forwards results',
    from: 'if (windows.size)',
    to: 'if (false && windows.size)',
  },
  {
    id: 'trial-dirty-admission',
    source: 'ui/use-battle-trial-session.ts',
    test: tests[2],
    title:
      'battle trial session ownership dirty or blocked launch is rejected before popup creation and unmount closes owned windows',
    from: 'if (current.projectGuard.blocked() || current.main.isDirty() || current.script.isDirty())',
    to: 'if (current.projectGuard.blocked() || false || current.script.isDirty())',
  },
  {
    id: 'trial-revision',
    source: 'ui/use-battle-trial-session.ts',
    test: tests[2],
    title:
      'battle trial session ownership launch owns one popup, revalidates the captured editor revision and forwards results',
    from: 'latest.main.getState() !== startingState ||',
    to: 'false ||',
  },
  {
    id: 'trial-unmount-close',
    source: 'ui/use-battle-trial-session.ts',
    test: tests[2],
    title:
      'battle trial session ownership dirty or blocked launch is rejected before popup creation and unmount closes owned windows',
    from: 'for (const trial of windows) trial.close()',
    to: 'for (const trial of windows) void trial',
  },
  {
    id: 'project-leave-admission',
    source: 'ui/use-editor-project-session.ts',
    test: tests[3],
    title: 'main dirty: real 新建项目 menu waits and cancel preserves both histories',
    from: 'if (inputRef.current.projectGuard.request(intent)) performLeave(intent)',
    to: 'if (true) performLeave(intent)',
  },
  {
    id: 'project-open-revision',
    source: 'ui/use-editor-project-session.ts',
    test: tests[3],
    title: 'late main edit during native picker wait refuses replacing the current project',
    from: "if (projectGuard.canReplace(lease)) current.onOpened?.(opened)\n      else setError('打开期间当前项目又有修改，已保留当前编辑内容。请重新打开。')",
    to: "if (true) current.onOpened?.(opened)\n      else setError('打开期间当前项目又有修改，已保留当前编辑内容。请重新打开。')",
  },
  {
    id: 'project-save-as-revision',
    source: 'ui/use-editor-project-session.ts',
    test: tests[3],
    title: 'save-as main uses the real writer and only replaces an unchanged session',
    from: "if (projectGuard.canReplace(lease)) current.onOpened?.(opened)\n      else setError('副本已保存；当前项目又有新修改，仍未保存，已保留在当前页面。')",
    to: "if (true) current.onOpened?.(opened)\n      else setError('副本已保存；当前项目又有新修改，仍未保存，已保留在当前页面。')",
  },
  {
    id: 'project-export-release',
    source: 'ui/use-editor-project-session.ts',
    test: tests[3],
    title: 'export wait blocks new/open/save-as and releases on its actual read failure',
    from: '.finally(() => current.projectGuard.finish(lease))',
    to: '.finally(() => undefined)',
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
  'packages/editor/src/ui/App.tsx',
  'packages/editor/src/ui/use-editor-navigation-session.ts',
  'packages/editor/src/ui/use-scene-workspace-session.ts',
  'packages/editor/src/ui/use-battle-trial-session.ts',
  'packages/editor/src/ui/use-editor-project-session.ts',
]
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, file)))
    .digest('hex')
const hashes = Object.fromEntries(productFiles.map((file) => [file, hash(file)]))
const selected = process.env.EDITOR_APP_SESSION_MUTANT
assert(
  !selected || mutations.some(({ id }) => id === selected),
  'unknown EDITOR_APP_SESSION_MUTANT',
)

const rows = []
let controls
for (const mutation of [null, ...mutations.filter(({ id }) => !selected || id === selected)]) {
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
export default {root:${JSON.stringify(packageRoot)},plugins:item?[{name:'editor-app-session-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:${JSON.stringify((mutation ? [mutation.test] : tests).map((file) => `src/${file}`))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
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
    assert.equal(entries.length, 50)
    assert.equal(data.numPassedTests, 50)
    assert.equal(data.numPendingTests, 0)
    assert.equal(new Set(entries.map((entry) => `${entry.file}::${entry.fullName}`)).size, 50)
    controls = entries
  } else {
    assert(
      businessRed(run.status, entries, testFile, mutation.title),
      `${id}: not business red; ${output}`,
    )
    assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), { id, target })
    assert.equal(
      data.numPendingTests,
      controls.filter((entry) => entry.file === testFile).length - 1,
    )
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
