import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const testingRoot = resolve(repoRoot, 'docs/testing')
export const catalogPath = resolve(testingRoot, 'catalog.json')

export function loadCatalog(root = testingRoot) {
  const path = resolve(root, 'catalog.json')
  return JSON.parse(readFileSync(path, 'utf8'))
}

const link = (entry) => `[${entry.title}](../${entry.canonical})`
const rows = (entries) =>
  entries
    .map((entry) => `| ${entry.id} | ${link(entry)} | ${entry.status} | ${entry.owner} |`)
    .join('\n')

export function renderIndexes(catalog, classification = { entries: [] }) {
  const entries = [...catalog.entries].sort((a, b) => a.id.localeCompare(b.id, 'en'))
  const tags = new Map()
  const owners = new Map()
  for (const entry of entries) {
    for (const tag of entry.tags) tags.set(tag, [...(tags.get(tag) ?? []), entry])
    owners.set(entry.owner, [...(owners.get(entry.owner) ?? []), entry])
  }
  const byStage = [
    '# E2E / 测试文档多维索引：按阶段',
    '',
    '本页由 `scripts/docs/generate-testing-index.mjs` 生成；状态来自 `catalog.json`。',
    '',
    '| ID | 文档 | 状态 | Owner |',
    '|---|---|---|---|',
    rows(entries.filter((entry) => entry.kind === 'e2e-stage')),
    '',
  ].join('\n')
  const byStatus = [
    '# 测试文档索引：按状态',
    '',
    '本页由 `scripts/docs/generate-testing-index.mjs` 生成。',
    '',
    ...[...new Set(entries.map((entry) => entry.status))]
      .sort()
      .map((status) =>
        [
          `## ${status}`,
          '',
          '| ID | 文档 | 状态 | Owner |',
          '|---|---|---|---|',
          rows(entries.filter((entry) => entry.status === status)),
          '',
        ].join('\n'),
      ),
  ].join('\n')
  const byTag = [
    '# 测试文档索引：按标签',
    '',
    '本页由 `scripts/docs/generate-testing-index.mjs` 生成。',
    '',
    ...[...tags.keys()]
      .sort()
      .map((tag) =>
        [
          `## ${tag}`,
          '',
          ...tags.get(tag).map((entry) => `- ${entry.id} — ${link(entry)}（${entry.status}）`),
          '',
        ].join('\n'),
      ),
  ].join('\n')
  const byOwner = [
    '# 测试文档索引：按 Owner',
    '',
    '本页由 `scripts/docs/generate-testing-index.mjs` 生成。',
    '',
    ...[...owners.keys()]
      .sort()
      .map((owner) =>
        [
          `## ${owner}`,
          '',
          ...owners.get(owner).map((entry) => `- ${entry.id} — ${link(entry)}（${entry.status}）`),
          '',
        ].join('\n'),
      ),
  ].join('\n')
  function grouped(title, valuesFor) {
    const groups = new Map()
    for (const entry of entries)
      for (const value of valuesFor(entry)) groups.set(value, [...(groups.get(value) ?? []), entry])
    return [
      `# 测试文档索引：${title}`,
      '',
      '由 `scripts/docs/generate-testing-index.mjs` 从 catalog 生成；current source audit 与历史实跑按报告边界阅读。',
      '',
      ...[...groups.keys()]
        .sort()
        .flatMap((value) => [
          `## ${value}`,
          '',
          '| ID | 文档 | 状态 | Owner |',
          '|---|---|---|---|',
          rows(groups.get(value)),
          '',
        ]),
    ].join('\n')
  }
  const ledger = [...classification.entries].sort((a, b) =>
    `${a.domain}/${a.module}/${a.path}`.localeCompare(`${b.domain}/${b.module}/${b.path}`),
  )
  const byLegacyDomain = [
    '# Legacy 文件工程域分类',
    '',
    '分类依据来自正文源码路径或文件名线索。candidate-needs-depth-review 不是已经验收；完整锚点/SHA/理由见分类账。',
    '',
    ...[...new Set(ledger.map((entry) => entry.domain))].sort().flatMap((domain) => [
      `## ${domain}`,
      '',
      '| 文件 | 模块 | 处理 | 深审状态 | 分类依据 |',
      '|---|---|---|---|---|',
      ...ledger
        .filter((entry) => entry.domain === domain)
        .map((entry) => {
          const path = entry.disposition === 'migrated' ? entry.canonicalTarget : entry.path
          return `| [${entry.path}](../${path}) | ${entry.module} | ${entry.disposition} | ${entry.reviewStatus} | ${entry.classificationBasis} |`
        }),
      '',
    ]),
  ].join('\n')
  return {
    'by-stage.md': byStage,
    'by-status.md': byStatus,
    'by-tag.md': byTag,
    'by-owner.md': byOwner,
    'by-domain.md': grouped('工程域', (entry) => [entry.domain ?? 'unspecified']),
    'by-module.md': grouped('模块/功能', (entry) => [
      `${entry.domain ?? 'unspecified'}/${entry.module ?? 'unspecified'}`,
    ]),
    'by-phase.md': grouped('阶段', (entry) => entry.phase ?? []),
    'by-engine.md': grouped('执行引擎', (entry) => entry.engines ?? []),
    'legacy-by-domain.md': byLegacyDomain,
  }
}

export function writeIndexes(root = testingRoot) {
  const catalog = loadCatalog(root)
  const output = resolve(root, 'indexes')
  const ledgerPath = resolve(root, 'legacy-flat-classification.json')
  const classification = existsSync(ledgerPath)
    ? JSON.parse(readFileSync(ledgerPath, 'utf8'))
    : { entries: [] }
  const indexes = renderIndexes(catalog, classification)
  for (const [name, text] of Object.entries(indexes)) writeFileSync(resolve(output, name), text)
  return indexes
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const indexes = writeIndexes()
  console.log(`testing indexes generated: ${Object.keys(indexes).join(', ')}`)
}
