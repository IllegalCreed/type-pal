#!/usr/bin/env node
// TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1 — 定向/相邻执行集 identity 账再生脚本。
// 以 vitest JSON reporter 解析 file×fullName×status，写入证据目录 identity.json；
// 零 diff 再生（同输入同字节）。cwd=packages/reforge 裸 pnpm exec（判例口径）。
import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(pkgRoot, '..', '..')
const evidenceDir = path.join(repoRoot, 'docs/ops/evidence/TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1')

const DIRECTED = [
  'src/battle/battle-core.enemy-cast-residual.test.ts',
  'src/battle/battle-session.enemy-flee-residual.test.ts',
]

const ADJACENT = [
  'src/battle/battle-core.test.ts',
  'src/battle/battle-core.glm-next-wave.test.ts',
  'src/battle/battle-core.c85-branches.test.ts',
  'src/battle/battle-enemy-confused.test.ts',
  'src/battle/battle-casualty.test.ts',
  'src/battle/r13-six-b-battle.test.ts',
  'src/battle/battle-session.test.ts',
  'src/battle/battle-session.action-flows.test.ts',
  'src/battle/battle-session.c85-arms.test.ts',
  'src/battle/battle-session.flow-residual.test.ts',
  'src/battle/battle-session.glm-next-wave.test.ts',
  'src/battle/battle-session.round-flows.test.ts',
  'src/battle/battle-session.script-flows.test.ts',
  'src/battle/battle-session.selection-flows.test.ts',
  'src/battle/battle-session.terminal-flows.test.ts',
  'src/battle/battle-session.writeback-flows.test.ts',
  'src/battle/battle-command-selection.test.ts',
  'src/battle/battle-command-selection.residual.test.ts',
  'src/battle/battle-command-selection.glm-next-wave.test.ts',
  'src/battle/battle-turn-readiness.test.ts',
  'src/battle/battle-action-presentation-scheduler.test.ts',
  'src/main.battle-host-flows.test.ts',
  'src/battle/battle-host.test.ts',
  'src/battle/battle-host.finalization.test.ts',
]

const runJson = (files) => {
  const env = { ...process.env }
  delete env.NODE_COMPILE_CACHE
  const proc = spawnSync('pnpm', ['exec', 'vitest', 'run', ...files, '--reporter=json'], {
    cwd: pkgRoot,
    encoding: 'buffer',
    maxBuffer: 512 * 1024 * 1024,
    env,
    timeout: 600_000,
  })
  if (proc.status !== 0) throw new Error(`vitest exit=${proc.status}: ${files.join(' ')}`)
  return JSON.parse(proc.stdout.toString('utf8'))
}

const collect = (parsed) => {
  const rows = []
  for (const suite of parsed.testResults ?? [])
    for (const tc of suite.assertionResults ?? [])
      rows.push({ file: suite.name, fullName: tc.fullName, status: tc.status })
  rows.sort((a, b) =>
    a.file < b.file ? -1 : a.file > b.file ? 1 : a.fullName < b.fullName ? -1 : 1,
  )
  return rows
}

const directed = collect(runJson(DIRECTED))
const adjacent = collect(runJson(ADJACENT))
if (directed.some((r) => r.status !== 'passed')) throw new Error('directed suite not green')
if (adjacent.some((r) => r.status !== 'passed')) throw new Error('adjacent suite not green')

const report = {
  card: 'TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1',
  suite: `定向 ${DIRECTED.length} 文件 ${directed.length} 测试 + 相邻 ${ADJACENT.length} 文件 ${adjacent.length} 测试全绿（vitest run，cwd=packages/reforge）`,
  files: DIRECTED.map((f) => `packages/reforge/${f}`),
  fullNames: directed.map((r) => r.fullName),
  adjacent: { files: ADJACENT.map((f) => `packages/reforge/${f}`), rows: adjacent.length },
  counts: {
    directedPassed: directed.filter((r) => r.status === 'passed').length,
    adjacentPassed: adjacent.filter((r) => r.status === 'passed').length,
  },
}
await mkdir(evidenceDir, { recursive: true })
const out = path.join(evidenceDir, 'identity.json')
await writeFile(out, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  `bcs1 identity: directed ${report.counts.directedPassed}/${directed.length}, adjacent ${report.counts.adjacentPassed}/${adjacent.length} → ${path.relative(repoRoot, out)}`,
)
