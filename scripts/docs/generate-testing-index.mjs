import { readFileSync, writeFileSync } from 'node:fs'
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

export function renderIndexes(catalog) {
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
          '| ID | 文档 | Owner |',
          '|---|---|---|',
          rows(
            entries
              .filter((entry) => entry.status === status)
              .map((entry) => ({ ...entry, owner: entry.owner })),
          ).replace(/ \| (?:[^|]+) \|$/, ' |'),
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
  return {
    'by-stage.md': byStage,
    'by-status.md': byStatus,
    'by-tag.md': byTag,
    'by-owner.md': byOwner,
  }
}

export function writeIndexes(root = testingRoot) {
  const catalog = loadCatalog(root)
  const output = resolve(root, 'indexes')
  const indexes = renderIndexes(catalog)
  for (const [name, text] of Object.entries(indexes)) writeFileSync(resolve(output, name), text)
  return indexes
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeIndexes()
  console.log(`testing indexes generated: ${Object.keys(renderIndexes(loadCatalog())).join(', ')}`)
}
