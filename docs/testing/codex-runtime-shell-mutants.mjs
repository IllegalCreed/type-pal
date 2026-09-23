/** Isolated loader mutations of the actual runtime modules; never rewrites product files. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-runtime-shell-mutants-'))
const files = [
  'main.boot-flows',
  'opening-menu.flows',
  'main.menu-flows',
  'main.dialog-flows',
  'main.save-flows',
  'main.scene-flows',
].map((stem) => `src/${stem}.test.ts`)

// Optional read-only diagnosis of a surprising pre-existing coverage count. Keep it separate
// from mutation acceptance: an unexpected count never becomes a passing mutation oracle.
if (process.argv.includes('--probe-core-coverage')) {
  const baseline = JSON.parse(
    readFileSync(resolve(root, 'scripts/coverage/baseline.fast.json'), 'utf8'),
  )
  assert.equal(baseline.testCount, 7790, 'run the coverage witness on its frozen 7790 candidate')
  const oldTests = baseline.packages.reforge.fastTests.files.map((file) =>
    file.replace('packages/reforge/', ''),
  )
  const target = resolve(root, 'packages/reforge/src/script-runner-core.ts')
  const original = readFileSync(target, 'utf8')
  const sourceHash = createHash('sha256').update(original).digest('hex')
  const needle = `throw new Error(\`ScriptRunnerCore: compilerVersion \${executable.compilerVersion} 不受支持\`)`
  assert.equal(original.split(needle).length, 2)
  const marker = join(output, 'invalid-version-entered')
  const loaded = join(output, 'core-trace-loaded')
  const replacement = `throw new Error((__shellTrace(${JSON.stringify(marker)}, 'entered\\n'), \`ScriptRunnerCore: compilerVersion \${executable.compilerVersion} 不受支持\`))`
  const rows = []
  for (const mode of ['old-fast', 'old-plus-shell', 'execution-trace']) {
    const reportDir = join(output, mode)
    const config = join(output, `${mode}.config.mjs`)
    const trace = mode === 'execution-trace'
    const configuration = {
      root: resolve(root, 'packages/reforge'),
      test: {
        include: mode === 'old-plus-shell' ? [...oldTests, ...files] : oldTests,
        maxWorkers: 2,
        reporters: ['json'],
        outputFile: join(output, `${mode}.json`),
        ...(!trace
          ? {
              coverage: {
                enabled: true,
                provider: 'v8',
                include: ['src/script-runner-core.ts'],
                reporter: ['json', 'json-summary'],
                reportsDirectory: reportDir,
              },
            }
          : {}),
      },
    }
    const plugin = trace
      ? `[{name:'core-execution-witness',enforce:'pre',load(id){if(id!==${JSON.stringify(target)})return;const source=readFileSync(id,'utf8');if(source.split(${JSON.stringify(needle)}).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(loaded)},id);return "import {appendFileSync as __shellTrace} from 'node:fs';\\n"+source.replace(${JSON.stringify(needle)},${JSON.stringify(replacement)})}}]`
      : '[]'
    writeFileSync(
      config,
      `import {readFileSync,writeFileSync} from 'node:fs';\nconst config=${JSON.stringify(configuration)};config.plugins=${plugin};export default config;\n`,
    )
    const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
      cwd: root,
      encoding: 'utf8',
    })
    writeFileSync(join(output, `${mode}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
    assert.equal(run.status, 0, `${mode}: diagnostic suite failed; ${output}`)
    const tests = JSON.parse(readFileSync(join(output, `${mode}.json`), 'utf8'))
    assert.equal(tests.numPassedTests, trace || mode === 'old-fast' ? 1378 : 1414)
    if (trace) {
      assert.equal(readFileSync(loaded, 'utf8'), target, 'trace injection never loaded')
      let entered = false
      try {
        entered = readFileSync(marker, 'utf8').length > 0
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      rows.push({
        mode,
        tests: tests.numPassedTests,
        traceLoaded: true,
        invalidVersionBranchEntered: entered,
      })
    } else {
      const coverage = Object.values(
        JSON.parse(readFileSync(join(reportDir, 'coverage-final.json'), 'utf8')),
      )[0]
      const statement = Object.entries(coverage.statementMap).find(
        ([, location]) => location.start.line === 123,
      )
      assert(statement, 'guard statement moved')
      const totals = JSON.parse(
        readFileSync(join(reportDir, 'coverage-summary.json'), 'utf8'),
      ).total
      rows.push({
        mode,
        tests: tests.numPassedTests,
        metrics: totals,
        invalidVersionStatementCount: coverage.s[statement[0]],
      })
    }
    assert.equal(createHash('sha256').update(readFileSync(target)).digest('hex'), sourceHash)
    console.log(`${mode}: ${JSON.stringify(rows.at(-1))}`)
  }
  writeFileSync(
    join(output, 'core-witness.json'),
    `${JSON.stringify({ sourceHash, rows }, null, 2)}\n`,
  )
  console.log(`Coverage witness (observation only, not an acceptance waiver): ${output}`)
  process.exit(0)
}
const mutations = [
  {
    id: 'scope',
    source: 'main',
    test: 'main.boot-flows',
    title: 'H1 scope failure has no playable frame or published world',
    from: 'const boundSaveScope = assertSaveScopeProject(saveScope, inputProject.manifest.id)',
    to: 'const boundSaveScope = saveScope',
  },
  {
    id: 'opening-key-owner',
    source: 'opening-menu',
    test: 'opening-menu.flows',
    title: 'H2 ArrowDown chooses second entry and completion removes frame and key owner',
    from: "window.removeEventListener('keydown', onKey, true)",
    to: 'void onKey',
  },
  {
    id: 'cast-dispatch',
    source: 'main',
    test: 'main.menu-flows',
    title:
      'H3 real magic route selects caster and target, heals only target, charges caster once, and backs out',
    from: 'if (skill) {\n              castOutdoorSkill(',
    to: 'if (false && skill) {\n              castOutdoorSkill(',
  },
  {
    id: 'dialog-input',
    source: 'main',
    test: 'main.dialog-flows',
    title:
      'H4 multi-page dialogue retains its real runner until the last displayed page is acknowledged',
    from: 'if (interact) dialogBox.advance(t)',
    to: 'if (false && interact) dialogBox.advance(t)',
  },
  {
    id: 'save-count',
    source: 'main',
    test: 'main.save-flows',
    title:
      'H5 F5 stores real SAVE8 data, F9 restores after actual menu spell, and scopes remain isolated',
    from: 'const savedTimes = committedSavedTimes + 1',
    to: 'const savedTimes = committedSavedTimes + 2',
  },
  {
    id: 'corrupt-message',
    source: 'main',
    test: 'main.save-flows',
    title:
      'H5 corrupt snapshot is rejected without mutation, menu remains usable, then the original snapshot restores',
    from: '? err.shortMessage',
    to: "? 'incorrect structure error text'",
  },
  {
    id: 'scene-routing',
    source: 'main',
    test: 'main.scene-flows',
    title:
      'H6 public next/previous scene input commits complete scenes and preserves party identity',
    from: "ids[(cur + (pressed.has(']') ? 1 : ids.length - 1)) % ids.length]",
    to: "ids[(cur + (pressed.has(']') ? 0 : ids.length - 1)) % ids.length]",
  },
]
const baseline = JSON.parse(
  readFileSync(resolve(root, 'scripts/coverage/baseline.fast.json'), 'utf8'),
)
const sourceFiles = Object.values(baseline.packages).flatMap((pkg) => pkg.sourceFiles)
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, file)))
    .digest('hex')
const hashes = Object.fromEntries(sourceFiles.map((file) => [file, hash(file)]))
const assertionOnly = (entry) =>
  entry.status === 'failed' &&
  entry.failureMessages.length > 0 &&
  entry.failureMessages.every((value) => {
    const clean = stripVTControlCharacters(value).trimStart()
    return /^AssertionError(?:\b|:)/.test(clean) && !/(?:timed out|timeout of|waitFor)/i.test(clean)
  })
assert(assertionOnly({ status: 'failed', failureMessages: ['AssertionError: expected'] }))
for (const failureMessages of [
  ['Error: embedded AssertionError'],
  ['AssertionError: expected', 'TypeError: host'],
  ['AssertionError: waitFor timed out'],
  [],
])
  assert(!assertionOnly({ status: 'failed', failureMessages }))
assert(!assertionOnly({ status: 'pending', failureMessages: ['AssertionError: skipped'] }))

// The only baked PNG sample is copied from a real tracked UI resource. Verify complete bytes/CRC,
// while explicitly not treating our Canvas adapter or thumbnail stand-in as a pixel renderer.
const fixture = readFileSync(
  resolve(root, 'packages/reforge/src/__tests__/runtime-shell/dom-host.ts'),
  'utf8',
)
const samples = [...fixture.matchAll(/atob\(\s*'([^']+)'/g)]
assert.equal(samples.length, 1)
const bytes = Buffer.from(samples[0][1], 'base64')
assert(
  bytes.equals(
    readFileSync(resolve(root, 'packages/reforge/src/engine-chrome/assets/ui/num/1.png')),
  ),
)
const { PNG } = createRequire(resolve(root, 'packages/migrate/package.json'))('pngjs')
const png = PNG.sync.read(bytes, { checkCRC: true })

const evidence = []
let control
const selected = process.env.SHELL_MUTANT
if (selected)
  assert(
    mutations.some((item) => item.id === selected),
    'unknown SHELL_MUTANT',
  )
for (const mutation of [null, ...mutations.filter((item) => !selected || item.id === selected)]) {
  const id = mutation?.id ?? 'control',
    report = join(output, `${id}.json`),
    config = join(output, `${id}.config.mjs`)
  const target = mutation ? resolve(root, `packages/reforge/src/${mutation.source}.ts`) : ''
  const targetFile = mutation ? resolve(root, `packages/reforge/src/${mutation.test}.test.ts`) : ''
  if (mutation) {
    assert.equal(
      readFileSync(target, 'utf8').split(mutation.from).length - 1,
      1,
      `${id}: unique needle`,
    )
    assert.equal(
      control.filter((entry) => entry.file === targetFile && entry.title === mutation.title).length,
      1,
      `${id}: exact positive title`,
    )
  }
  const pattern = mutation
    ? `^${mutation.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
    : undefined
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const item=${JSON.stringify(mutation)},target=${JSON.stringify(target)};
export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:item?[{name:'shell-single-mutant',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(item.from).length!==2)throw Error('nonunique mutation');writeFileSync(${JSON.stringify(join(output, `${id}.entered`))},id);return source.replace(item.from,item.to)}}]:[],test:{include:${JSON.stringify(mutation ? [`src/${mutation.test}.test.ts`] : files)},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    encoding: 'utf8',
  })
  const log = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
  writeFileSync(join(output, `${id}.log`), log)
  assert.equal(run.signal, null, `${id}: interrupted`)
  assert(
    !/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/.test(stripVTControlCharacters(log)),
    `${id}: unhandled runtime error`,
  )
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert(
    data.testResults.every((file) => !file.message),
    `${id}: suite error; ${output}`,
  )
  const entries = data.testResults.flatMap((file) =>
    file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
  )
  const failed = entries.filter((entry) => entry.status === 'failed')
  assert.equal(data.numTodoTests, 0)
  if (!mutation) {
    assert.equal(run.status, 0, `control failed: ${output}`)
    assert.equal(data.numTotalTests, 36)
    assert.equal(data.numPendingTests, 0)
    assert.equal(failed.length, 0)
    assert.equal(data.numPassedTests, 36)
    assert.equal(entries.length, 36)
    assert.equal(new Set(entries.map((entry) => `${entry.file}::${entry.fullName}`)).size, 36)
    control = entries
  } else {
    const count = control.filter((entry) => entry.file === targetFile).length
    assert.equal(data.numTotalTests, count)
    assert.equal(data.numPendingTests, count - 1)
    assert.equal(data.numPassedTests, 0)
    assert.equal(run.status, 1, `${id}: not red; ${output}`)
    assert.equal(failed.length, 1)
    assert.equal(failed[0].title, mutation.title)
    assert.equal(failed[0].file, targetFile)
    assert(assertionOnly(failed[0]), `${id}: not an immediate business AssertionError; ${output}`)
    assert.equal(readFileSync(join(output, `${id}.entered`), 'utf8'), target)
  }
  for (const [file, expected] of Object.entries(hashes))
    assert.equal(hash(file), expected, `${id}: product modified`)
  evidence.push({
    id,
    exit: run.status,
    executed: data.numTotalTests - data.numPendingTests,
    filteredByExactName: data.numPendingTests,
    failed: failed.map((entry) => ({
      file: entry.file,
      title: entry.title,
      message: stripVTControlCharacters(entry.failureMessages.join('\n')),
    })),
  })
  console.log(`${id}: ${mutation ? 'business red' : 'green'}`)
}
writeFileSync(
  join(output, 'summary.json'),
  `${JSON.stringify({ hashes, png: { width: png.width, height: png.height, bytes: bytes.length }, evidence }, null, 2)}\n`,
)
console.log(`Runtime shell evidence: ${output}`)
