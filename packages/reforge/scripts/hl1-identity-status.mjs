#!/usr/bin/env node
// TEST-GLM-REFORGE-HOST-LIFECYCLE-1 — 身份账:本卡 4 个测试文件逐 file×fullName×status。
// 重建:node scripts/hl1-identity-status.mjs
import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const evidenceDir = path.join(pkgRoot, 'src', '__tests__', 'host-lifecycle-1')
const testFiles = [
  'src/main.host-lifecycle-1.test.ts',
  'src/script-runner.host-lifecycle-1.test.ts',
  'src/script-runner-core.host-lifecycle-1.test.ts',
  'src/script-host-adapter.host-lifecycle-1.test.ts',
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
  path.join(evidenceDir, 'hl1-identity-status.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), total: rows.length, rows }, null, 2)}\n`,
)
console.log(`hl1 identity: ${rows.length} 条 → hl1-identity-status.json`)
