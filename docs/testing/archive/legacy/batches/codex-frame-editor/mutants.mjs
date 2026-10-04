import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
const suite = 'packages/editor/src/ui/'
export const needles = [
  {
    id: 'save-stale-label',
    test: `${suite}FrameAnimationEditor.async-ownership.test.tsx`,
    fullName:
      'Frame editor asynchronous source ownership a label edit made during compression survives the asset save and its undo',
    from: "...reader.record(asset.id, 'frame-animation'),",
    to: '...asset.record,',
  },
  {
    id: 'async-source-owner-lost',
    test: `${suite}FrameAnimationEditor.async-ownership.test.tsx`,
    fullName:
      'Frame editor asynchronous source ownership a late quantizer cannot replace the next asset draft after switching',
    from: 'activeOperation.current === operation &&',
    to: 'true &&',
  },
  {
    id: 'obsolete-finally-clears-new-busy',
    test: `${suite}FrameAnimationEditor.async-ownership.test.tsx`,
    fullName:
      'Frame editor asynchronous source ownership an obsolete failure cannot publish its error or clear the newer operation busy state',
    from: 'if (activeOperation.current !== operation) return',
    to: 'if (false) return',
  },
  {
    id: 'late-save-commit',
    test: `${suite}FrameAnimationEditor.async-ownership.test.tsx`,
    fullName:
      'Frame editor asynchronous source ownership a save finishing after switch cannot publish a discarded asset',
    from: 'const hash = await sha256Hex(encoded)\n      if (!ownsOperation(operation)) return',
    to: 'const hash = await sha256Hex(encoded)',
  },
  {
    id: 'late-load-overwrite',
    test: `${suite}FrameAnimationEditor.loading.test.tsx`,
    fullName:
      'Frame editor real container loading late old load cannot replace the already rendered newer asset',
    from: 'if (!alive) return\n        const next = draftFromFrameSequence(sourceOwner.assetId, index)',
    to: 'if (false) return\n        const next = draftFromFrameSequence(sourceOwner.assetId, index)',
  },
  {
    id: 'copy-wrong-frame',
    test: `${suite}FrameAnimationEditor.editing.test.tsx`,
    fullName:
      'Frame editor current editing workflows copy and delete selected frames keep exact pixel order and undo/redo restore the same draft',
    from: '...draft.frames[index]!,\n              id: nextFrameId(),',
    to: '...draft.frames[0]!,\n              id: nextFrameId(),',
  },
  {
    id: 'playback-timer-leak',
    test: `${suite}FrameAnimationEditor.playback.test.tsx`,
    fullName:
      'Frame editor real playback clock pause and unmount cancel the actual playback timer with no late frame drawing',
    from: 'return () => window.clearTimeout(timer)',
    to: 'return () => {}',
  },
  {
    id: 'foreign-pointer-pan',
    test: `${suite}FrameAnimationEditor.viewport.test.tsx`,
    fullName:
      'Frame editor viewport input contracts only the captured left pointer pans manual zoom and cancellation releases ownership',
    from: 'if (!gesture || gesture.pointerId !== event.pointerId) return',
    to: 'if (!gesture) return',
  },
  {
    id: 'save-duration-loss',
    test: `${suite}FrameAnimationEditor.save.test.tsx`,
    fullName:
      'Frame editor real encoding and session save saving modified frames publishes one undoable asset with exact hash, durations and reopened pixels',
    from: 'const duration = frame.durationMs === undefined ? {} : { durationMs: frame.durationMs }',
    to: 'const duration = {}',
  },
  {
    id: 'quantize-all-only-current',
    test: `${suite}FrameAnimationEditor.save.test.tsx`,
    fullName:
      'Frame editor real encoding and session save quantize-all publishes every frame through the codec while preserving alpha and per-frame durations',
    from: 'const indices = all ? draft.frames.map((_frame, index) => index) : [selectedIndex]',
    to: 'const indices = [selectedIndex]',
  },
]

export const source = 'packages/editor/src/ui/FrameAnimationEditor.tsx'
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function judge(run, report, needle, red) {
  assert.equal(run.status, red ? 1 : 0)
  assert.equal(run.signal, null)
  const assertions = report.testResults.flatMap((file) => {
    assert.equal(file.message, '')
    assert.equal(resolve(file.name), resolve(root, needle.test))
    return file.assertionResults.filter((entry) => entry.status !== 'skipped')
  })
  assert.equal(assertions.length, 1)
  assert.equal(assertions[0].fullName, needle.fullName)
  assert.equal(assertions[0].status, red ? 'failed' : 'passed')
  assert.equal(report.numFailedTests, red ? 1 : 0)
  assert.equal(report.numPassedTests, red ? 0 : 1)
  if (red) {
    assert.ok(assertions[0].failureMessages.length > 0)
    for (const message of assertions[0].failureMessages) {
      assert.match(message.trimStart(), /^AssertionError\b/)
      assert.doesNotMatch(message, /(^|\n)\s*(?:Error|TypeError|RangeError|ReferenceError):/)
      assert.doesNotMatch(message, /timed[\s_-]+out|TimeoutError/i)
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = mkdtempSync(join(tmpdir(), 'codex-frame-editor-'))
  const target = resolve(root, source)
  const before = sha256(target)
  for (const needle of needles) {
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const reportPath = join(output, `${id}.json`)
      const hitPath = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        FRAME_EDITOR_NEEDLE: needle.id,
        FRAME_EDITOR_RED: String(red),
        FRAME_EDITOR_REPORT: reportPath,
        FRAME_EDITOR_HIT: hitPath,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/archive/legacy/batches/codex-frame-editor/mutants.config.mjs',
          '-t',
          `^${escapeRegExp(needle.fullName)}$`,
        ],
        { cwd: root, env, encoding: 'utf8', timeout: 60000 },
      )
      writeFileSync(join(output, `${id}.log`), `${run.stdout}\n${run.stderr}`)
      judge(run, JSON.parse(readFileSync(reportPath, 'utf8')), needle, red)
      if (red)
        assert.deepEqual(JSON.parse(readFileSync(hitPath, 'utf8')), { id: needle.id, target })
      assert.equal(sha256(target), before)
      console.log(`${id}: ${red ? 'detected' : 'green'}`)
    }
  }
  console.log(output)
}
