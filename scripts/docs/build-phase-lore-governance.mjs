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
  const indexHead = (title, purpose, organization) => [
    `# ${title}`,
    '',
    'Status: current',
    'Owner: Codex（catalog维护）；本页由生成器投影',
    'Last reviewed: 2026-10-30',
    'Template: governance-index-v1 / 1.0.0',
    '',
    '## 目的',
    '',
    purpose,
    '',
    '## 范围',
    '',
    `覆盖catalog登记的${entries.length}份lore/phase1/phase2/phase3 Markdown；不含ops/testing、物理review分片或全1838冻结cohort。${organization}`,
    '',
    '## 当前状态',
    '',
    '本页current仅指导航有效。成员的draft/current/historical/archived标签取catalog原值，不能用目录名或本页状态覆盖成员状态；生成和模板通过不授语义/runtime信用。',
    '',
    '## 入口与责任',
    '',
    '权威入口是[catalog manifest](catalog.json)及其四个phase分片；另一视图为[相位索引](by-phase.md)和[状态索引](by-status.md)。成员正文与review保留各自来源、Owner及接受边界，存储descriptor由loader核对。',
    '',
    '## 证据与下一步',
    '',
    intro,
    '修改成员登记须先核正文与来源，再运行生成器；check-phase-lore-governance同时核完整目录集合、after SHA、两视图逐字节和本五章合同。未解释冲突停止对应成员，不从生成结果自动授信。',
    '',
  ]
  const byPhase = indexHead(
    'Lore / 三阶段文档索引',
    '按阶段查找真实文档身份、模块、成熟度和责任人，避免把跨阶段知识混为同一实现方针。',
    '以下四组各列一个阶段，组内按path稳定排序。',
  )
  for (const phase of ['lore', 'phase1', 'phase2', 'phase3']) {
    byPhase.push(`## ${phase}`, '', '| 文档 | 模块 | 状态 | Owner |', '|---|---|---|---|')
    for (const entry of entries.filter((item) => item.phase === phase))
      byPhase.push(
        `| [${escapeIndexCell(entry.title)}](../${entry.path.replace(/^docs\//, '')}) | ${escapeIndexCell(entry.module)} | ${escapeIndexCell(entry.status)} | ${escapeIndexCell(entry.owner)} |`,
      )
    byPhase.push('')
  }
  const byStatus = indexHead(
    'Lore / 三阶段文档状态索引',
    '按catalog成熟度查找候选、现行入口与历史材料，供维护者选择可用来源及待核项。',
    '状态分组按原生status字典序，组内按path稳定排序。',
  )
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
