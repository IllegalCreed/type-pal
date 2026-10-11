// Independent acceptance on the current product; historical contributor receipts are immutable.
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import {
  executionSetOf,
  judgeGreen,
  judgeRed,
  judgeSelfTest,
  REPO,
  sha256Of,
} from '../TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/lib-isolated-tree.mjs'

const config = JSON.parse(
  readFileSync(path.join(import.meta.dirname, 'codex-needles.json'), 'utf8'),
)
const output = path.resolve(REPO, process.argv[2] ?? 'build/ci/glm-boundaries-20261011/counters')
if (process.argv[3] && !config.groups.some((group) => group.id === process.argv[3]))
  throw new Error('Unknown replay group')
if (!output.startsWith(`${path.join(REPO, 'build')}${path.sep}`))
  throw new Error('Output must be under ignored build/')
if (existsSync(output)) throw new Error('Refusing to overwrite an existing receipt directory')
mkdirSync(output, { recursive: true })
const receipt = {
  base: config.base,
  createdAt: new Date().toISOString(),
  status: 'running',
  groups: [],
}
const persist = () =>
  writeFileSync(path.join(output, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)

function assertNoProblems(problems, phase) {
  if (problems.length) throw new Error(`${phase}: ${problems.join('; ')}`)
}

function buildTree(group, tag) {
  const tmp = mkdtempSync(path.join('/tmp', `tp-codex-${group.id}-${tag}-`))
  const pkg = path.join(tmp, 'packages', group.pkg)
  const cleanup = () => {
    rmSync(tmp, { recursive: true, force: true })
    if (existsSync(tmp)) throw new Error(`Cleanup failed: ${tmp}`)
    return { path: tmp, removed: true }
  }
  try {
    const original = path.join(REPO, 'packages', group.pkg)
    mkdirSync(pkg, { recursive: true })
    cpSync(path.join(original, 'src'), path.join(pkg, 'src'), { recursive: true })
    for (const name of ['package.json', 'tsconfig.json', 'index.html']) {
      if (existsSync(path.join(original, name)))
        cpSync(path.join(original, name), path.join(pkg, name))
    }
    cpSync(path.join(original, 'vite.config.ts'), path.join(pkg, 'vite.base.config.ts'))
    writeFileSync(
      path.join(pkg, 'vite.config.ts'),
      `import base from './vite.base.config.ts'\nexport default { ...base, server: { ...base.server, fs: { allow: [${JSON.stringify(tmp)}, ${JSON.stringify(REPO)}] } } }\n`,
    )
    cpSync(path.join(REPO, 'tsconfig.base.json'), path.join(tmp, 'tsconfig.base.json'))
    symlinkSync(path.join(original, 'node_modules'), path.join(pkg, 'node_modules'), 'dir')
    symlinkSync(path.join(REPO, 'node_modules'), path.join(tmp, 'node_modules'), 'dir')
    for (const [file, expected] of Object.entries(group.frozen)) {
      if (
        sha256Of(path.join(tmp, file)) !== expected ||
        sha256Of(path.join(REPO, file)) !== expected
      )
        throw new Error(`Product drift: ${file}`)
    }
    for (const [file, expected] of Object.entries(group.testHashes)) {
      if (sha256Of(path.join(pkg, file)) !== expected) throw new Error(`Test drift: ${file}`)
    }
    return { tmp, pkg, cleanup }
  } catch (error) {
    cleanup()
    throw error
  }
}

function summary(run) {
  return {
    argv: run.argv,
    cwd: run.cwd,
    env: run.env,
    pid: run.pid,
    exit: run.exit,
    signal: run.signal,
    spawnError: run.spawnError,
    unhandled: run.unhandledInOutput,
    raw: { path: path.relative(output, run.rawFile), sha256: run.rawSha256 },
    json: { path: path.relative(output, run.jsonFile), sha256: run.jsonSha256 },
  }
}

function runPhase(tree, files, dir, tag) {
  const rawFile = path.join(dir, `${tag}.raw`)
  const jsonFile = path.join(dir, `${tag}.json`)
  const argv = [
    process.execPath,
    path.join(REPO, 'node_modules/vitest/vitest.mjs'),
    'run',
    ...files,
    '--reporter=default',
    '--reporter=json',
    `--outputFile.json=${jsonFile}`,
  ]
  const run = spawnSync(argv[0], argv.slice(1), {
    cwd: tree.pkg,
    encoding: 'utf8',
    env: { ...process.env, NODE_COMPILE_CACHE: '' },
    maxBuffer: 64 * 1024 * 1024,
    timeout: 240_000,
  })
  const raw = `${run.stdout ?? ''}${run.stderr ?? ''}`
  writeFileSync(rawFile, raw)
  const report = JSON.parse(readFileSync(jsonFile, 'utf8'))
  const suites = report.testResults ?? []
  return {
    argv,
    cwd: tree.pkg,
    pid: run.pid,
    exit: run.status,
    signal: run.signal,
    spawnError: run.error ? String(run.error) : null,
    env: {
      node: process.version,
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? null,
      NODE_ENV: process.env.NODE_ENV ?? null,
      TZ: process.env.TZ ?? null,
      NODE_COMPILE_CACHE: '',
    },
    rawFile,
    jsonFile,
    rawSha256: sha256Of(rawFile),
    jsonSha256: sha256Of(jsonFile),
    report,
    suites,
    tests: suites.flatMap((suite) => suite.assertionResults),
    unhandledInOutput:
      /Unhandled (Errors?|Rejection)|unhandledRejection|Uncaught Exception|uncaughtException/i.test(
        raw,
      ),
  }
}

function probes(tree, dir) {
  const file = 'src/codex-judge-probe.test.ts'
  const target = path.join(tree.pkg, file)
  const code =
    "import { test, expect, afterAll } from 'vitest'\ntest('judge target', () => expect(1, 'PROBE').toBe(0))\n"
  const cases = [
    { id: 'probe-business', reject: false, suffix: '' },
    {
      id: 'probe-hook',
      reject: true,
      suffix: "afterAll(() => { throw new Error('EXTRA_HOOK') })\n",
    },
    {
      id: 'probe-uncaught',
      reject: true,
      suffix:
        "afterAll(async () => { setTimeout(() => { throw new Error('EXTRA_RUNTIME') }, 0); await new Promise(resolve => setTimeout(resolve, 30)) })\n",
    },
  ]
  try {
    return cases.map((probe) => {
      writeFileSync(target, code + probe.suffix)
      const run = runPhase(tree, [file], dir, probe.id)
      const problems = judgeRed(run, [`${file} :: judge target`], [file], 'judge target', 'PROBE')
      if (problems.length > 0 !== probe.reject) throw new Error(`Judge probe failed: ${probe.id}`)
      return { id: probe.id, rejected: probe.reject, problems, process: summary(run) }
    })
  } finally {
    rmSync(target)
  }
}

try {
  for (const group of config.groups.filter(
    (entry) => !process.argv[3] || entry.id === process.argv[3],
  )) {
    const dir = path.join(output, group.id)
    mkdirSync(dir)
    const result = {
      id: group.id,
      frozen: group.frozen,
      tests: group.testHashes,
      selfTest: judgeSelfTest(group.files),
      needles: [],
    }
    receipt.groups.push(result)
    const greenTree = buildTree(group, 'green')
    let rows
    try {
      const run = runPhase(greenTree, group.files, dir, 'green')
      rows = executionSetOf(run, group.files)
      assertNoProblems(judgeGreen(run, rows, group.files), `${group.id} green`)
      const raw = readFileSync(run.rawFile, 'utf8')
      if (/not wrapped in act|console\.error|An update to .*inside a test/i.test(raw))
        throw new Error('New UI set has console/act diagnostics')
      result.green = { process: summary(run), executionSet: rows }
      result.probes = probes(greenTree, dir)
    } finally {
      result.greenCleanup = greenTree.cleanup()
      persist()
    }
    function runNeedle(needle, tag) {
      const tree = buildTree(group, tag)
      const record = { id: needle.id }
      try {
        const target = path.join(tree.pkg, needle.file)
        const source = readFileSync(target, 'utf8')
        if (source.split(needle.from).length !== 2)
          throw new Error(`Non-unique mutation anchor: ${needle.id}`)
        writeFileSync(target, source.replace(needle.from, needle.to))
        const names = rows.filter(
          (row) => row.startsWith(`${needle.testFile} :: `) && row.includes(needle.title),
        )
        if (names.length !== 1)
          throw new Error(`Non-unique test identity: ${needle.id}: ${names.length}`)
        const fullName = names[0].slice(`${needle.testFile} :: `.length)
        const run = runPhase(tree, group.files, dir, tag)
        const problems = judgeRed(run, rows, group.files, fullName, needle.marker)
        Object.assign(record, {
          fullName,
          mutation: {
            file: needle.file,
            from: needle.from,
            to: needle.to,
            original: group.frozen[`packages/${group.pkg}/${needle.file}`],
            mutant: sha256Of(target),
          },
          process: summary(run),
          problems,
        })
        assertNoProblems(problems, needle.id)
        record.status = 'valid'
        return record
      } finally {
        record.cleanup = tree.cleanup()
        result.needles.push(record)
        persist()
      }
    }
    for (const needle of group.needles) {
      runNeedle(needle, needle.id)
      console.log(`${group.id}/${needle.id}: valid`)
    }
    const restoredTree = buildTree(group, 'restored')
    try {
      const run = runPhase(restoredTree, group.files, dir, 'restored')
      assertNoProblems(judgeGreen(run, rows, group.files), `${group.id} restored`)
      result.restored = { process: summary(run), executionSetIdentical: true }
    } finally {
      result.restoredCleanup = restoredTree.cleanup()
      persist()
    }
    result.replay = runNeedle(group.needles[0], 'final-replay')
    result.status = 'passed'
    persist()
  }
  receipt.status = 'passed'
} catch (error) {
  receipt.status = 'failed'
  receipt.error = String(error)
  throw error
} finally {
  persist()
}
