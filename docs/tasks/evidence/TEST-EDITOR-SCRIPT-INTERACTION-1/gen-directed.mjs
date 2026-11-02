// TEST-EDITOR-SCRIPT-INTERACTION-1 定向+相邻证据：在贡献者 worktree 的 packages/editor 上
// 以同进程 default+native JSON 双 reporter 实跑卡面定向集，产出 directed.json / directed.raw。
// 双 reporter 联判工具只读复用 TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 判据库。
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  persistJson,
  REPO,
  runVitestJson,
  writeRaw,
} from '../TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/lib-isolated-tree.mjs'

const DIRECTED_FILES = [
  'src/ui/ScriptEditor.interaction-boundaries.test.tsx',
  'src/ui/ScriptEditor.test.tsx',
  'src/core/author-command-edit.test.ts',
  'src/core/author-command-edit.boundaries.test.ts',
  'src/ui/SharedScriptTab.test.tsx',
]

const evidence = import.meta.dirname
const run = runVitestJson(
  path.join(REPO, 'packages/editor'),
  DIRECTED_FILES,
  path.join(evidence, 'directed.raw'),
  path.join(evidence, 'directed.json'),
)
const summary = {
  cwd: run.cwd,
  argv: run.argv,
  exit: run.exit,
  signal: run.signal,
  spawnError: run.spawnError,
  unhandledInOutput: run.unhandledInOutput,
  numTotalTests: run.report.numTotalTests,
  numPassedTests: run.report.numPassedTests,
  numFailedTests: run.report.numFailedTests,
  numPendingTests: run.report.numPendingTests ?? 0,
  numTodoTests: run.report.numTodoTests ?? 0,
  files: run.suites.map((suite) => ({
    file: suite.name.slice(suite.name.indexOf('src/')),
    status: suite.status,
    tests: suite.assertionResults.length,
  })),
  rawSha256: run.rawSha256,
  jsonSha256: run.jsonSha256,
}
mkdirSync(path.join(evidence, 'counters'), { recursive: true })
const summarySha = persistJson(
  path.join(evidence, 'directed-summary.json'),
  JSON.stringify(summary, null, 2),
)
writeRaw(path.join(evidence, 'directed-summary.sha256'), `${summarySha}\n`)
console.log(
  `directed: exit=${run.exit} tests=${run.report.numTotalTests} passed=${run.report.numPassedTests} failed=${run.report.numFailedTests} raw=${run.rawSha256.slice(0, 12)} json=${run.jsonSha256.slice(0, 12)}`,
)
if (run.exit !== 0 || run.report.numFailedTests !== 0) {
  throw new Error('directed run is not green')
}
