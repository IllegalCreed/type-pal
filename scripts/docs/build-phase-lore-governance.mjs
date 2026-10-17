import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPhaseLoreCatalog } from './phase-lore-catalog.mjs'

// The original path classifier could overwrite reviewed metadata. This command
// now renders projections only; catalog changes require explicit reviewed edits.
export function renderPhaseGovernanceIndexes(catalog) {
  const entries = [...catalog.entries].sort((a, b) => a.path.localeCompare(b.path, 'en'))
  const escapeIndexCell = (value) =>
    String(value)
      .replaceAll('|', '\\|')
      .replace(/[\r\n]+/g, ' ')
  const intro =
    '由 `scripts/docs/build-phase-lore-governance.mjs` 从现有 catalog 生成；只投影已登记字段，不判定内容真值或授予 reviewed。'
  const byPhase = ['# Lore / 三阶段文档索引', '', intro, '']
  for (const phase of ['lore', 'phase1', 'phase2', 'phase3']) {
    byPhase.push(`## ${phase}`, '', '| 文档 | 模块 | 状态 | Owner |', '|---|---|---|---|')
    for (const entry of entries.filter((item) => item.phase === phase))
      byPhase.push(
        `| [${escapeIndexCell(entry.title)}](../${entry.path.replace(/^docs\//, '')}) | ${escapeIndexCell(entry.module)} | ${escapeIndexCell(entry.status)} | ${escapeIndexCell(entry.owner)} |`,
      )
    byPhase.push('')
  }
  const byStatus = ['# Lore / 三阶段文档状态索引', '', intro, '']
  for (const status of [...new Set(entries.map((entry) => entry.status))].sort()) {
    byStatus.push(`## ${status}`, '')
    for (const entry of entries.filter((item) => item.status === status))
      byStatus.push(
        `- [${escapeIndexCell(entry.title)}](../${entry.path.replace(/^docs\//, '')}) · ${entry.phase}/${entry.module}`,
      )
    byStatus.push('')
  }
  return {
    'by-phase.md': `${byPhase.join('\n').trimEnd()}\n`,
    'by-status.md': `${byStatus.join('\n').trimEnd()}\n`,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2)
    throw new Error('Usage: node scripts/docs/build-phase-lore-governance.mjs')
  const directory = fileURLToPath(new URL('../../docs/phase-governance/', import.meta.url))
  const catalogPath = resolve(directory, 'catalog.json')
  const catalogBytes = readFileSync(catalogPath, 'utf8')
  const catalog = loadPhaseLoreCatalog({ manifestPath: catalogPath })
  for (const [name, text] of Object.entries(renderPhaseGovernanceIndexes(catalog)))
    writeFileSync(resolve(directory, name), text)
  if (readFileSync(resolve(directory, 'catalog.json'), 'utf8') !== catalogBytes)
    throw new Error('index generation changed the authoritative catalog')
  console.log(
    `phase/lore indexes: ${catalog.entries.length} registered documents; catalog unchanged`,
  )
}
