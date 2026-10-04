#!/usr/bin/env node
// TEST-COVERAGE85-GLM-REFORGE-1 — 分支账生成:基线 vs 终态逐文件臂级对比 + 目标行闭合明细。
//
// 干净 checkout 重建(两份 lcov 都是运行产物,不在 git 内;在候选分支上执行即可,
// 基线通过排除本卡 `*.c85-*.test.ts` 精确还原 dispatch 交付的测试集,产品文件两边相同):
//   # 基线(dispatch 测试集):
//   TYPE_PAL_COVERAGE_PROFILE=fast TYPE_PAL_COVERAGE=1 pnpm --filter @type-pal/reforge exec \
//     vitest run --passWithNoTests --exclude '**/*.pal.test.ts' --exclude '**/*.c85-*.test.ts' \
//     --coverage --coverage.provider=v8 --coverage.reportsDirectory=<baselineDir> \
//     --coverage.reporter=lcov --coverage.include 'src/**/*.{ts,tsx}' \
//     --coverage.exclude '**/__tests__/**' --coverage.exclude '**/*.test.ts' \
//     --coverage.exclude '**/*.test.tsx' --coverage.exclude '**/*.spec.ts' \
//     --coverage.exclude '**/*.spec.tsx' --coverage.exclude '**/*.d.ts'
//   # 终态(含本卡新测试):同命令去掉 --exclude '**/*.c85-*.test.ts',换 <finalDir>
//   node scripts/c85-branch-delta.mjs <baselineDir>/lcov.info <finalDir>/lcov.info
//
// 缺省参数指向本 worktree 的两份运行产物目录(coverage/c85-baseline、coverage/c85-final)。
// 输出固定写入提交内证据目录 src/__tests__/coverage85/c85-branch-delta.json。
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const pkgRoot = path.resolve(import.meta.dirname, '..')
const evidenceDir = path.join(pkgRoot, 'src', '__tests__', 'coverage85')
const baselineLcov = process.argv[2] ?? path.join(pkgRoot, 'coverage', 'c85-baseline', 'lcov.info')
const finalLcov = process.argv[3] ?? path.join(pkgRoot, 'coverage', 'c85-final', 'lcov.info')

const targets = [
  'src/main.ts',
  'src/battle/battle-session.ts',
  'src/battle/battle-core.ts',
  'src/script-runner.ts',
  'src/script-runner-core.ts',
  'src/script-host-adapter.ts',
  'src/entity-motion.ts',
  'src/script-project-core.ts',
  'src/script-world.ts',
  'src/runtime-script-project.ts',
]

async function readArms(lcovPath) {
  const arms = new Map()
  let current = null
  for (const line of (await readFile(lcovPath, 'utf8')).split('\n')) {
    if (line.startsWith('SF:')) current = line.slice(3).trim()
    else if (line.startsWith('BRDA:') && current) {
      const [lineNo, block, arm, taken] = line.slice(5).trim().split(',')
      arms.set(`${current}:${lineNo}:${block}:${arm}`, taken.trim())
    }
  }
  return arms
}

const baseline = await readArms(baselineLcov)
const final = await readArms(finalLcov)

const perFile = {}
const closedByTarget = {}
for (const suffix of targets) {
  const baseMissed = []
  const finalMissed = []
  for (const [key, taken] of baseline) {
    if (!key.startsWith(`${suffix}:`)) continue
    if (taken === '0' || taken === '-') baseMissed.push(key)
  }
  for (const key of baseMissed)
    if (final.get(key) === '0' || final.get(key) === '-') finalMissed.push(key)
  const lineOf = (key) => Number(key.split(':')[1])
  perFile[suffix] = {
    baselineMissedArms: baseMissed.length,
    finalMissedArms: finalMissed.length,
    closedByThisCard: baseMissed.length - finalMissed.length,
    newlyMissedArms: finalMissed.filter((key) => !baseMissed.includes(key)).length,
    closedLines: [...new Set(baseMissed.filter((k) => !finalMissed.includes(k)).map(lineOf))].sort(
      (a, b) => a - b,
    ),
  }
  closedByTarget[suffix] = perFile[suffix].closedByThisCard
}

const summary = {
  note: '基线=排除本卡 *.c85-*.test.ts 的 fast 全量(精确复现 dispatch 测试集);终态=含本卡新测试。这是 +N 臂闭合账,不是 85% 达标声明。原始 lcov 拷贝:src/__tests__/coverage85/c85-baseline-lcov.info 与 c85-final-lcov.info。',
  inputs: {
    baselineLcov: 'coverage/c85-baseline/lcov.info(运行产物)',
    finalLcov: 'coverage/c85-final/lcov.info(运行产物)',
    argvOverride: 'node scripts/c85-branch-delta.mjs <baselineLcov> <finalLcov>',
  },
  targets: closedByTarget,
  targetClosedTotal: Object.values(closedByTarget).reduce((a, b) => a + b, 0),
  perFile,
}
await mkdir(evidenceDir, { recursive: true })
await writeFile(
  path.join(evidenceDir, 'c85-branch-delta.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
)
// 同目录留双 lcov 原始拷贝,验收方可不重跑直接复核臂级归属
await copyFile(baselineLcov, path.join(evidenceDir, 'c85-baseline-lcov.info'))
await copyFile(finalLcov, path.join(evidenceDir, 'c85-final-lcov.info'))
console.log(JSON.stringify({ targets: closedByTarget, total: summary.targetClosedTotal }, null, 2))
