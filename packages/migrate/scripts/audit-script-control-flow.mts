/**
 * N3-1 P0 PAL 脚本控制流审计。
 *
 * 默认只读比对入仓基线；只有显式 --write-baseline 才会更新基线文件。
 * 它只读取提取源并运行纯迁移，不读取或改写 projects/pal。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPalHistoricalR13_4V9Migration } from '../src/pal-migration.js'
import { loadPalMigrationSources } from '../src/pal-migration-io.js'
import {
  assertScriptControlFlowAudit,
  auditPalScriptControlFlow,
} from '../src/script-control-flow-audit.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const baseline = resolve(repo, 'packages/migrate/baselines/script-control-flow/pal-v1.json')
const known = new Set(['--', '--check', '--json', '--write-baseline'])
const unknown = process.argv.slice(2).filter((argument) => !known.has(argument))
if (unknown.length) throw new Error(`未知参数: ${unknown.join(', ')}`)

const json = process.argv.includes('--json')
const writeBaseline = process.argv.includes('--write-baseline')
const sources = loadPalMigrationSources(repo)
const migration = buildPalHistoricalR13_4V9Migration(sources)
const report = auditPalScriptControlFlow(sources, migration)
assertScriptControlFlowAudit(report)
const baselineSerialized = `${JSON.stringify(report)}\n`
const displaySerialized = `${JSON.stringify(report, null, 2)}\n`

if (writeBaseline) {
  mkdirSync(dirname(baseline), { recursive: true })
  writeFileSync(baseline, baselineSerialized)
} else {
  if (!existsSync(baseline))
    throw new Error(
      '脚本控制流基线不存在；经审查后显式运行 audit:script-control-flow -- --write-baseline',
    )
  const expected = readFileSync(baseline, 'utf8')
  if (expected !== baselineSerialized) {
    const expectedReport = JSON.parse(expected) as { digest?: unknown }
    const expectedDigest =
      typeof expectedReport.digest === 'string' ? expectedReport.digest : '<missing>'
    throw new Error(
      `脚本控制流基线漂移: expected ${expectedDigest}, actual ${report.digest}; ` +
        '若是已解释的迁移变化，请审查后显式更新基线',
    )
  }
}

if (json) process.stdout.write(displaySerialized)
else {
  const folded = report.product.folded
  console.log(
    `[N3 P0] source=${report.summary.sourceCommands} bodies=${report.summary.productBodies} ` +
      `reachable=${report.summary.runtimeReachableBodies} unreachable=${report.summary.unreachableBodies}`,
  )
  console.log(
    `[控制流] source legacy cycles=${report.summary.legacyRawCyclicComponents} ` +
      `semantic cycles=${report.source.semanticGraph.cyclicComponents} ` +
      `product cycles=${report.summary.productCyclicComponents}/${report.summary.productCyclicBodies} bodies`,
  )
  console.log(
    `[折叠归因] sprite=${folded.spriteAction.entities}/${folded.spriteAction.bodies.length} ` +
      `hostile=${folded.hostileBehavior.entities}/${folded.hostileBehavior.bodies.length} ` +
      `unknown=${folded.unclassifiedUnreachable.length}`,
  )
  console.log(
    `[基线] ${writeBaseline ? '已写入' : '一致'} packages/migrate/baselines/script-control-flow/pal-v1.json ` +
      `digest=${report.digest}`,
  )
}
