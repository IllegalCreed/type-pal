#!/usr/bin/env node
// TEST-GLM-REFORGE-RUNTIME-SESSION-1 — 身份账:本卡 4 个测试文件逐 file×fullName×status。
// 重建:node scripts/rs1-identity-status.mjs
import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const evidenceDir = path.join(pkgRoot, 'src', '__tests__', 'runtime-session-1')
const testFiles = [
  'src/runtime-input-router.runtime-session-1.test.ts',
  'src/runtime-frame-session.runtime-session-1.test.ts',
  'src/runtime-project-view.runtime-session-1.test.ts',
  'src/world-motion-runtime.runtime-session-1.test.ts',
]

const proc = spawnSync('pnpm', ['exec', 'vitest', 'run', ...testFiles, '--reporter=json'], {
  cwd: pkgRoot,
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
})
if (proc.status !== 0) throw new Error(`identity run 非绿: exit ${proc.status}`)
const parsed = JSON.parse(proc.stdout)
const rows = []
for (const suite of parsed.testResults ?? []) {
  const file = path.relative(pkgRoot, suite.name)
  for (const tc of suite.assertionResults ?? [])
    rows.push({ file, fullName: tc.fullName, status: tc.status })
}
rows.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.fullName < b.fullName ? -1 : 1))
await mkdir(evidenceDir, { recursive: true })
await writeFile(
  path.join(evidenceDir, 'rs1-identity-status.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), total: rows.length, rows }, null, 2)}\n`,
)
console.log(`rs1 identity: ${rows.length} 条 → rs1-identity-status.json`)
