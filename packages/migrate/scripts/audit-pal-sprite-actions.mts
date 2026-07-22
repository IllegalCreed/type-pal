import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPalMigration } from '../src/pal-migration.js'
import { loadPalMigrationSources } from '../src/pal-migration-io.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const sources = loadPalMigrationSources(repo)
// G2 只认 legacy 提取源生成的纯 theirs；不得读 projects/pal 的 authored/MG2 合并态。
const migration = buildPalMigration(sources)
const report = migration.report.spriteActions

if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
else {
  console.log(JSON.stringify(report.summary, null, 2))
  console.log('\n[重叠拒绝分类]')
  console.log(JSON.stringify(report.reasonCounts, null, 2))
  console.log('\n[外部写入拒绝分类（按实例去重，类别可重叠）]')
  console.log(JSON.stringify(report.externalWriteCategoryCounts, null, 2))
  console.log('\n[稳定摘要 SHA-256]')
  console.log(JSON.stringify(report.digests, null, 2))
  for (const spriteId of ['sprite-8', 'sprite-35', 'sprite-72', 'sprite-96', 'sprite-490']) {
    const sites = report.instances.filter((instance) => instance.spriteId === spriteId)
    console.log(`\n[${spriteId}] ${sites.length} 个 page0 auto 实例`)
    for (const site of sites.slice(0, 60))
      console.log(
        `  ${site.sceneId}/${site.entityId}: ${site.reasons.join(',') || 'accepted'}${
          site.timeline ? ` · ${site.timeline.durationMs}ms/${site.timeline.cycleDurationMs}ms` : ''
        }`,
      )
  }
}
