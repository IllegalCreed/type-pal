import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const mutations = [
  {
    id: 'block-index',
    module: 'frame-sequence',
    from: 'blockIndex >= sequence.index.blocks.length',
    to: 'blockIndex > sequence.index.blocks.length',
    title: 'TPFS invalid index 1 rejects before any inflation',
  },
  {
    id: 'remove-alias',
    module: 'script-library',
    from: 'const nextChunks = cloneJson(chunks) as Record<string, ScriptChunkV1>',
    to: 'const nextChunks = chunks as Record<string, ScriptChunkV1>',
    title:
      'authored removal keeps collocated siblings and updates metadata without mutating either input',
  },
  {
    id: 'drop-choreography',
    module: 'asset',
    from: "record.kind === 'startBattle' && record.choreography !== undefined",
    to: 'false',
    title:
      'canonical single-node asset visit includes choreography but leaves normal nested arms to its caller',
  },
  {
    id: 'empty-team',
    module: 'enemy-team-reference',
    from: 'record.enemyTeamId.length > 0',
    to: 'true',
    title:
      'enemy-team scanner ignores unrelated same-name fields and malformed leaves without hiding valid siblings',
  },
  {
    id: 'coerce-map-name',
    module: 'project-map',
    from: `const name = requireNonEmptyString(entry.name, \`\${path}.name\`)`,
    to: 'const name = String(entry.name)',
    title: 'project map boundary: name wrong type',
  },
]

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export function judge(run, data, mutation) {
  assert.equal(run.status, mutation ? 1 : 0)
  assert.equal(run.signal, null)
  assert.doesNotMatch(
    `${run.stdout}\n${run.stderr}`,
    /Unhandled Errors?|Unhandled Rejection|Uncaught Exception/,
  )
  assert.equal(data.numTotalTests, 65)
  assert.equal(data.numPendingTests, 0)
  assert.equal(data.numTodoTests, 0)
  assert.equal(data.numPassedTests, mutation ? 64 : 65)
  assert.equal(data.numFailedTests, mutation ? 1 : 0)
  const entries = data.testResults.flatMap((file) => {
    assert.ok(!file.message, file.message)
    return file.assertionResults.map((entry) => ({ ...entry, file: file.name }))
  })
  assert.equal(entries.length, 65)
  assert.equal(new Set(entries.map((entry) => `${entry.file}:${entry.fullName}`)).size, 65)
  assert.ok(entries.every((entry) => ['passed', 'failed'].includes(entry.status)))
  const failed = entries.filter((entry) => entry.status === 'failed')
  assert.equal(failed.length, mutation ? 1 : 0)
  if (!mutation) return
  const red = failed[0]
  assert.equal(
    red.file,
    resolve(root, `packages/content/src/${mutation.module}.resource-boundaries.test.ts`),
  )
  assert.equal(red.fullName, mutation.title)
  assert.ok(red.failureMessages.length > 0)
  for (const message of red.failureMessages) {
    assert.match(message.trimStart(), /^AssertionError\b/)
    assert.doesNotMatch(
      message,
      /(^|\n)\s*(?:TypeError|Error|RangeError|SyntaxError|ReferenceError):/,
    )
    assert.doesNotMatch(message.split('\n')[0], /timeout|timed out/i)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = mkdtempSync(join(tmpdir(), 'codex-resource-mutants-'))
  const sourcePath = (module) => resolve(root, `packages/content/src/${module}.ts`)
  const hash = (module) =>
    createHash('sha256')
      .update(readFileSync(sourcePath(module)))
      .digest('hex')
  const hashes = Object.fromEntries(mutations.map((m) => [m.module, hash(m.module)]))
  const results = []
  for (const mutation of [null, ...mutations]) {
    const id = mutation?.id ?? 'control'
    if (mutation)
      assert.equal(readFileSync(sourcePath(mutation.module), 'utf8').split(mutation.from).length, 2)
    const report = join(output, `${id}.json`)
    const hit = join(output, `${id}.hit.json`)
    const env = {
      ...process.env,
      RESOURCE_MUTATION: id,
      RESOURCE_REPORT: report,
      RESOURCE_HIT: hit,
    }
    delete env.NODE_COMPILE_CACHE
    const run = spawnSync(
      'pnpm',
      [
        'exec',
        'vitest',
        'run',
        '--config',
        'docs/testing/codex-content-resources/mutants.config.mjs',
      ],
      { cwd: root, env, encoding: 'utf8', timeout: 60000 },
    )
    writeFileSync(join(output, `${id}.log`), `${run.stdout}\n${run.stderr}`)
    const data = JSON.parse(readFileSync(report, 'utf8'))
    judge(run, data, mutation)
    if (mutation)
      assert.deepEqual(JSON.parse(readFileSync(hit, 'utf8')), {
        id,
        target: sourcePath(mutation.module),
      })
    for (const [module, expected] of Object.entries(hashes)) assert.equal(hash(module), expected)
    results.push({ id, exit: run.status, passed: data.numPassedTests, failed: data.numFailedTests })
    console.log(`${id}: ${mutation ? 'detected (candidate AssertionError)' : '65/65 green'}`)
    if (mutation) {
      // Same real judge rejects exit/signal/title/mixed-error/timeout impostors.
      for (const status of [0, 2, null])
        assert.throws(() => judge({ ...run, status }, data, mutation))
      assert.throws(() => judge({ ...run, signal: 'SIGTERM' }, data, mutation))
      assert.throws(() => judge(run, data, { ...mutation, title: 'wrong target' }))
      for (const message of [
        'Error: embedded AssertionError',
        'AssertionError: x\nTypeError: y',
        'AssertionError: test timed out',
      ]) {
        const copy = structuredClone(data)
        copy.testResults
          .flatMap((file) => file.assertionResults)
          .find((entry) => entry.status === 'failed').failureMessages = [message]
        assert.throws(() => judge(run, copy, mutation))
      }
    }
  }
  writeFileSync(join(output, 'summary.json'), `${JSON.stringify({ hashes, results }, null, 2)}\n`)
  console.log(output)
}
