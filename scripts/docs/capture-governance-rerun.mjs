import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const biomeCli = createRequire(import.meta.url).resolve('@biomejs/biome/bin/biome')
const root = fileURLToPath(new URL('../../', import.meta.url))
const evidence = resolve(root, 'docs/ops/evidence/DOCS-RECORD-INTEGRITY-1')
const raw = resolve(evidence, 'raw')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' }).stdout.trim()
const sessionId = randomUUID()
const commands = [
  ['r65-r66-preservation', 'node', ['scripts/docs/verify-r65-r66-preservation.mjs']],
  ['docs-tools', 'pnpm', ['test:docs-tools']],
  ['docs', 'node', ['scripts/docs/check.mjs']],
  ['model', 'node', ['scripts/docs/check-document-model.mjs']],
  ['testing', 'pnpm', ['check:testing-docs']],
  ['phase-lore', 'node', ['scripts/docs/check-phase-lore-governance.mjs']],
  ['content-strict', 'node', ['scripts/docs/check-content-review.mjs', '--strict']],
  ['progress', 'node', ['scripts/docs/report-governance-progress.mjs', '--require-complete']],
  ['check-docs', 'pnpm', ['check:docs']],
  ['lint', 'pnpm', ['lint']],
  ['diff', 'git', ['diff', '--check']],
]
mkdirSync(raw, { recursive: true })
const sourceHead = git(['rev-parse', 'HEAD'])
const trackedDiff = spawnSync('git', ['diff', '--binary', 'HEAD'], { cwd: root }).stdout
const inputPaths = git(['ls-files', '--cached', '--others', '--exclude-standard'])
  .split('\n')
  .filter((path) => /^(docs\/|scripts\/docs\/|package\.json|pnpm-lock\.yaml)/.test(path))
  .filter((path) => !path.startsWith('docs/ops/evidence/DOCS-RECORD-INTEGRITY-1/raw/'))
const inputs = inputPaths.map((path) => ({
  path,
  sha256: hash(readFileSync(resolve(root, path))),
}))
const inputSnapshot = `raw/${sessionId}.inputs.log`
writeFileSync(resolve(evidence, inputSnapshot), `${JSON.stringify(inputs, null, 2)}\n`, {
  flag: 'wx',
})
const executions = []
for (const [name, binary, args] of commands) {
  const executionId = `${name}-${sessionId}`
  const startedAt = new Date().toISOString()
  const result = spawnSync(binary, args, {
    cwd: root,
    env: process.env,
    encoding: 'buffer',
    timeout: 180000,
    killSignal: 'SIGTERM',
    maxBuffer: 16 * 1024 * 1024,
  })
  const stdout = result.stdout ?? Buffer.alloc(0)
  const stderr = result.stderr ?? Buffer.alloc(0)
  const files = []
  for (const [stream, bytes] of [
    ['stdout', stdout],
    ['stderr', stderr],
  ]) {
    const relative = `raw/${executionId}.${stream}.log`
    writeFileSync(resolve(evidence, relative), bytes, { flag: 'wx' })
    files.push({ stream, path: relative, sha256: hash(bytes), bytes: bytes.length })
  }
  executions.push({
    executionId,
    binary,
    args,
    cwd: root,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.status,
    signal: result.signal,
    spawnError: result.error ? { code: result.error.code, message: result.error.message } : null,
    sourceHead,
    inputSnapshot,
    trackedDiffSha256: hash(trackedDiff),
    environment: { NODE_PATH: process.env.NODE_PATH ?? null },
    files,
    reviewerRelationship: 'author self-check; not independent acceptance',
  })
  process.stdout.write(
    `${name}: exit=${result.status} signal=${result.signal} error=${result.error?.code ?? 'none'}\n`,
  )
}
const metadata = {
  schemaVersion: 1,
  kind: 'current-candidate-command-capture-not-historical-rerun-proof',
  sourceHead,
  inputSnapshot,
  sessionId,
  trackedDiffSha256: hash(trackedDiff),
  noHistoricalExecutionCredit: true,
  rawRetention: 'append only; never edit stdout/stderr after capture',
  executions,
}
const formatted = spawnSync(
  process.execPath,
  [biomeCli, 'format', '--stdin-file-path', 'receipt.json'],
  {
    cwd: root,
    input: `${JSON.stringify(metadata, null, 2)}\n`,
    encoding: 'utf8',
  },
)
if (formatted.status !== 0) throw new Error(`receipt serialization failed: ${formatted.stderr}`)
writeFileSync(resolve(evidence, `rerun-${sessionId}.json`), formatted.stdout, { flag: 'wx' })
