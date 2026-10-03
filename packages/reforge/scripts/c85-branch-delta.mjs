#!/usr/bin/env node
// TEST-COVERAGE85-GLM-REFORGE-1 — 分支账生成:基线 vs 终态逐文件臂级对比 + 目标行闭合明细。
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const pkgRoot = path.resolve(import.meta.dirname, '..')
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
      const key = `${current}:${lineNo}:${block}:${arm}`
      arms.set(key, taken.trim())
    }
  }
  return arms
}

const baseline = await readArms(path.join(pkgRoot, 'coverage', 'c85-scan-reforge', 'lcov.info'))
const final = await readArms(path.join(pkgRoot, 'coverage', 'c85-final', 'lcov.info'))

const perFile = {}
const closedByTarget = {}
for (const suffix of targets) {
  const file = suffix
  const baseMissed = []
  const finalMissed = []
  for (const [key, taken] of baseline) {
    if (!key.startsWith(`${file}:`)) continue
    total++
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
  targets: closedByTarget,
  targetClosedTotal: Object.values(closedByTarget).reduce((a, b) => a + b, 0),
  perFile,
}
await mkdir(path.join(pkgRoot, 'coverage'), { recursive: true })
await writeFile(
  path.join(pkgRoot, 'coverage', 'c85-branch-delta.json'),
  JSON.stringify(summary, null, 2),
)
console.log(JSON.stringify({ targets: closedByTarget, total: summary.targetClosedTotal }, null, 2))
