/** Isolated Vite load of production modules; disk sources stay untouched. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const clean = (value) => stripVTControlCharacters(value)

const cases = [
  {
    id: 'w3-view-copy',
    pkg: 'packages/editor',
    target: 'packages/editor/src/core/binary-signature.ts',
    include: 'src/core/binary-signature.test.ts',
    title: 'an offset view hashes only its window and does not mutate the source',
    from: 'bytes instanceof Uint8Array ? Uint8Array.from(bytes).buffer : bytes',
    to: 'bytes instanceof Uint8Array ? bytes.buffer : bytes',
    environment: 'node',
  },
  {
    id: 'w4-fps-threshold',
    pkg: 'packages/game',
    target: 'packages/game/src/tools/fps-overlay.ts',
    include: 'src/tools/fps-overlay.test.ts',
    title: '采样满窗后 ≥50 为绿、<50 为红；49 不得误标绿',
    from: "v.className = fps >= 50 ? 'v' : 'v lo'",
    to: "v.className = fps >= 49 ? 'v' : 'v lo'",
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
]

function businessRed(exit, entries, title) {
  const executed = entries.filter((entry) => ['passed', 'failed'].includes(entry.status))
  if (exit !== 1 || executed.length !== 1) return false
  const [entry] = executed
  const name = entry.fullName ?? entry.title
  return (
    (name === title || name.endsWith(title)) &&
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

function runCase(item, mutate, output) {
  const pkg = resolve(root, item.pkg)
  const target = resolve(root, item.target)
  const report = resolve(output, `${item.id}-${mutate ? 'mutant' : 'control'}.json`)
  const config = resolve(output, `${item.id}-${mutate ? 'mutant' : 'control'}.config.mjs`)
  const marker = resolve(output, `${item.id}.entered`)
  writeFileSync(
    config,
    `import { readFileSync, writeFileSync } from 'node:fs';
const target = ${JSON.stringify(target)};
const from = ${JSON.stringify(item.from)};
const to = ${JSON.stringify(item.to)};
const marker = ${JSON.stringify(marker)};
const mutate = ${mutate ? 'true' : 'false'};
function fileId(id) {
  return id.split('\\0')[0].split('?')[0];
}
export default {
  root: ${JSON.stringify(pkg)},
  plugins: mutate
    ? [{
        name: 'wave2-single-point',
        enforce: 'pre',
        load(id) {
          const file = fileId(id);
          if (file !== target) return;
          const source = readFileSync(target, 'utf8');
          if (source.split(from).length !== 2) throw new Error('needle drift');
          writeFileSync(marker, JSON.stringify({ target, from, to }));
          return source.replace(from, to);
        },
      }]
    : [],
  test: {
    environment: ${JSON.stringify(item.environment)},
    setupFiles: ${JSON.stringify(item.setupFiles ?? [])},
    include: [${JSON.stringify(item.include)}],
    maxWorkers: 1,
    fileParallelism: false,
    reporters: ['json'],
    outputFile: ${JSON.stringify(report)},
  },
};
`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config, '-t', item.title], {
    cwd: pkg,
    encoding: 'utf8',
    env: { ...process.env, NODE_DISABLE_COMPILE_CACHE: '1' },
  })
  writeFileSync(
    resolve(output, `${item.id}-${mutate ? 'mutant' : 'control'}.log`),
    `${run.stdout ?? ''}\n${run.stderr ?? ''}`,
  )
  assert.equal(run.signal, null, `${item.id}: signal ${run.signal}`)
  const data = JSON.parse(readFileSync(report, 'utf8'))
  const entries = data.testResults.flatMap((file) =>
    file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
  )
  return { run, data, entries, marker }
}

const output = mkdtempSync(resolve(tmpdir(), 'type-pal-wave2-mutants-'))
const hashes = Object.fromEntries(
  cases.map((item) => [item.target, digest(resolve(root, item.target))]),
)
try {
  for (const item of cases) {
    assert.equal(
      readFileSync(resolve(root, item.target), 'utf8').split(item.from).length,
      2,
      `${item.id}: unique needle`,
    )
    const control = runCase(item, false, output)
    const controlRan = control.entries.filter((entry) => entry.status === 'passed')
    assert.equal(control.run.status, 0, `${item.id} control: ${output}`)
    assert.equal(controlRan.length, 1, `${item.id} control count`)
    assert.match(
      controlRan[0].fullName,
      new RegExp(item.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    )
    const mutant = runCase(item, true, output)
    assert(
      businessRed(mutant.run.status, mutant.entries, item.title),
      `${item.id}: expected business AssertionError; ${output}`,
    )
    assert.deepEqual(JSON.parse(readFileSync(mutant.marker, 'utf8')), {
      target: resolve(root, item.target),
      from: item.from,
      to: item.to,
    })
    assert.equal(
      digest(resolve(root, item.target)),
      hashes[item.target],
      `${item.id}: disk source changed`,
    )
  }
  writeFileSync(
    resolve(output, 'summary.json'),
    `${JSON.stringify({ hashes, output, cases: cases.map(({ id, title }) => ({ id, title })) }, null, 2)}\n`,
  )
  console.log(
    `wave2 module mutants: 2 control green / 2 business AssertionError\nEvidence: ${output}`,
  )
} finally {
  // Keep evidence only if WAVE2_MUTANT_KEEP=1; otherwise remove the isolated tree.
  if (process.env.WAVE2_MUTANT_KEEP !== '1') rmSync(output, { recursive: true, force: true })
}
