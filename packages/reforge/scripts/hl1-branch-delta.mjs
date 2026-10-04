#!/usr/bin/env node
// TEST-GLM-REFORGE-HOST-LIFECYCLE-1 — 分支账:基线(排除本卡 *.host-lifecycle-1.test.ts)vs
// 终态(含本卡)逐目标文件臂级对比。
//
// 干净 checkout 重建(两份 lcov 均为运行产物,不入 git):
//   # 基线:
//   TYPE_PAL_COVERAGE_PROFILE=fast TYPE_PAL_COVERAGE=1 pnpm --filter @type-pal/reforge exec \
//     vitest run --passWithNoTests --exclude '**/*.pal.test.ts' \
//     --exclude '**/*.host-lifecycle-1.test.ts' \
//     --coverage --coverage.provider=v8 --coverage.reportsDirectory=coverage/hl1-baseline \
//     --coverage.reporter=lcov --coverage.include 'src/**/*.{ts,tsx}' \
//     --coverage.exclude '**/__tests__/**' --coverage.exclude '**/*.test.ts' \
//     --coverage.exclude '**/*.d.ts'
//   # 终态:同命令去掉 --exclude '**/*.host-lifecycle-1.test.ts',reportsDirectory=coverage/hl1-final
//   node scripts/hl1-branch-delta.mjs <baseline lcov> <final lcov>
import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const evidenceDir = path.join(pkgRoot, 'src', '__tests__', 'host-lifecycle-1')
const baselineLcov = process.argv[2] ?? path.join(pkgRoot, 'coverage', 'hl1-baseline', 'lcov.info')
const finalLcov = process.argv[3] ?? path.join(pkgRoot, 'coverage', 'hl1-final', 'lcov.info')
const targets = [
  'src/main.ts',
  'src/script-runner.ts',
  'src/script-runner-core.ts',
  'src/script-host-adapter.ts',
]

function readArms(lcovPath) {
  const arms = new Map()
  let current = null
  for (const line of readFileSync(lcovPath, 'utf8').split('\n')) {
    if (line.startsWith('SF:')) current = line.slice(3).trim()
    else if (line.startsWith('BRDA:') && current) {
      const [lineNo, block, branch, taken] = line.slice(5).split(',')
      arms.set(`${current}:${lineNo}:${block}:${branch}`, {
        file: current,
        line: Number(lineNo),
        taken: !['0', '-'].includes((taken ?? '').trim()),
      })
    }
  }
  return arms
}

const baseline = readArms(baselineLcov)
const final = readArms(finalLcov)
const perFile = {}
let closedTotal = 0
let lostTotal = 0
for (const target of targets) {
  const keys = [...new Set([...baseline.keys(), ...final.keys()])].filter((key) =>
    key.startsWith(`${target}:`),
  )
  let hitB = 0
  let hitF = 0
  const closed = []
  const lost = []
  for (const key of keys) {
    const b = baseline.get(key)
    const f = final.get(key)
    if (b?.taken) hitB++
    if (f?.taken) hitF++
    if (!b?.taken && f?.taken) closed.push(f.line)
    if (b?.taken && !f?.taken) lost.push(f.line)
  }
  closedTotal += closed.length
  lostTotal += lost.length
  perFile[target] = {
    baselineArmsHit: hitB,
    finalArmsHit: hitF,
    closedLines: [...new Set(closed)].sort((a, b) => a - b),
    lostLines: [...new Set(lost)].sort((a, b) => a - b),
  }
}
await mkdir(evidenceDir, { recursive: true })
await writeFile(
  path.join(evidenceDir, 'hl1-branch-delta.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baselineLcov: 'coverage/hl1-baseline/lcov.info(运行产物)',
      finalLcov: 'coverage/hl1-final/lcov.info(运行产物)',
      totals: { closedArms: closedTotal, lostArms: lostTotal },
      perFile,
    },
    null,
    2,
  )}\n`,
)
console.log(`hl1 delta: closed=${closedTotal} lost=${lostTotal} → hl1-branch-delta.json`)
