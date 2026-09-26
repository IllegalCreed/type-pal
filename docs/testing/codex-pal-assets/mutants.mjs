import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const needles = [
  {
    id: 'sound-census',
    group: 'sound-metadata',
    from: 'metadata.chunkCount !== 505',
    to: 'false',
    fullName: 'PAL sound metadata boundaries rejects internally consistent but wrong total',
  },
  {
    id: 'wave-signature',
    group: 'sound-closure',
    from: `assertWave(bytes, \`PAL sound \${chunk.index}\`)`,
    to: 'void bytes',
    fullName:
      'PAL sound three-way closure size-consistent RIFF header corruption is still rejected',
  },
  {
    id: 'png-bake',
    group: 'palette',
    from: 'bakeIndexedRgba(source.data, palette.colors)',
    to: 'source.data',
    fullName:
      'PAL palette loader boundaries bakes real PNG palette RGB while transparent pixels become transparent zero',
  },
  {
    id: 'portrait-renumber',
    group: 'portraits',
    from: 'generatedSource(palPortraitAssetId(chunk), bytes, {',
    to: 'generatedSource(palPortraitAssetId(binaries.length + 1), bytes, {',
    fullName:
      'PAL portrait sparse extraction missing source does not renumber remaining portrait IDs or provenance',
  },
  {
    id: 'item-order',
    group: 'items',
    from: '.sort((left, right) => left - right)\n  if (itemChunks.length !== 233)',
    to: '.sort((left, right) => right - left)\n  if (itemChunks.length !== 233)',
    fullName:
      'PAL item image manifest boundaries input item ordering does not change sorted stable image IDs and zero is omitted',
  },
  {
    id: 'background-alpha',
    group: 'backgrounds',
    from: 'png.data[offset + 3] !== 255',
    to: 'false',
    fullName:
      "PAL indexed background boundaries rejects independently invalid indexed pixel 'alpha'",
  },
  {
    id: 'source-hash',
    group: 'ownership',
    from: 'bytes.byteLength !== source.record.bytes || sha256(bytes) !== source.record.sha256',
    to: 'bytes.byteLength !== source.record.bytes',
    fullName:
      'PAL asset materialization ownership boundaries same-length second source hash corruption rejects before any first-source write',
  },
  {
    id: 'retirement-id-order',
    group: 'retirements',
    from: 'a.path.localeCompare(b.path) || a.id.localeCompare(b.id)',
    to: 'a.path.localeCompare(b.path)',
    fullName:
      'PAL retirement planning boundaries sorts by path then stable ID without changing source insertion order or files',
  },
]
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
function judge(run, data, needle, red) {
  assert.equal(run.status, red ? 1 : 0)
  assert.equal(run.signal, null)
  assert.doesNotMatch(
    `${run.stdout}\n${run.stderr}`,
    /Unhandled Errors?|Unhandled Rejection|Uncaught Exception/,
  )
  const executed = data.testResults.flatMap((r) => {
    assert.ok(!r.message, r.message)
    return r.assertionResults
      .filter((a) => a.status !== 'skipped')
      .map((a) => ({ ...a, file: r.name }))
  })
  assert.equal(executed.length, 1)
  const entry = executed[0]
  assert.equal(entry.fullName, needle.fullName)
  assert.equal(entry.file, resolve(root, `packages/migrate/src/pal-assets.${needle.group}.test.ts`))
  assert.equal(entry.status, red ? 'failed' : 'passed')
  assert.equal(data.numFailedTests, red ? 1 : 0)
  assert.equal(data.numPassedTests, red ? 0 : 1)
  if (red) {
    assert.ok(entry.failureMessages.length > 0)
    for (const message of entry.failureMessages) {
      assert.match(message.trimStart(), /^AssertionError\b/)
      assert.doesNotMatch(
        message,
        /(^|\n)\s*(?:Error|TypeError|RangeError|ReferenceError|SyntaxError):/,
      )
      assert.doesNotMatch(message, /timed[\s_-]+out|TimeoutError/i)
    }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = mkdtempSync(join(tmpdir(), 'codex-pal-assets-mutants-'))
  const target = resolve(root, 'packages/migrate/src/pal-assets.ts')
  const hash = () => createHash('sha256').update(readFileSync(target)).digest('hex')
  const original = hash(),
    summary = []
  for (const needle of needles)
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const report = join(output, `${id}.json`),
        hit = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        PAL_ASSET_NEEDLE: needle.id,
        PAL_ASSET_RED: String(red),
        PAL_ASSET_REPORT: report,
        PAL_ASSET_HIT: hit,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-pal-assets/mutants.config.mjs',
          '-t',
          `^${needle.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        ],
        { cwd: root, env, encoding: 'utf8', timeout: 60000 },
      )
      writeFileSync(join(output, `${id}.log`), `${run.stdout}\n${run.stderr}`)
      const data = JSON.parse(readFileSync(report, 'utf8'))
      judge(run, data, needle, red)
      if (red) {
        assert.deepEqual(JSON.parse(readFileSync(hit, 'utf8')), { id: needle.id, target })
        for (const status of [0, 2, null])
          assert.throws(() => judge({ ...run, status }, data, needle, true))
        assert.throws(() => judge(run, data, { ...needle, fullName: 'wrong title' }, true))
        for (const message of [
          'Error: contains AssertionError',
          'AssertionError: mismatch\n TypeError: secondary',
          'AssertionError: timed out',
        ]) {
          const copy = structuredClone(data)
          copy.testResults
            .flatMap((r) => r.assertionResults)
            .find((a) => a.status === 'failed').failureMessages = [message]
          assert.throws(() => judge(run, copy, needle, true))
        }
      }
      assert.equal(hash(), original)
      summary.push({
        id,
        exit: run.status,
        passed: data.numPassedTests,
        failed: data.numFailedTests,
      })
      console.log(`${id}: ${red ? 'detected' : 'green'}`)
    }
  writeFileSync(join(output, 'summary.json'), JSON.stringify({ original, summary }, null, 2))
  console.log(output)
}
