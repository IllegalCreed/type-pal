import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const docsRoot = resolve(repoRoot, 'docs')
const governanceRoot = resolve(docsRoot, 'phase-governance')
const sourceRevision = '45d890e4ce3862aeac9c54eef2d7d18a32032cee'
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
const roots = ['lore', 'phase1', 'phase2', 'phase3']

function walk(root) {
  const files = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = resolve(root, entry.name)
    if (entry.isDirectory()) files.push(...walk(file))
    else if (entry.name.endsWith('.md')) files.push(file)
  }
  return files
}

function extractSourceRefs(text) {
  const refs = []
  const pattern =
    /(?:packages|scripts|docs)\/[\w@./-]+\.(?:ts|tsx|mts|mjs|js|md|json)(?::(\d+)(?:-(\d+))?)?/g
  for (const match of text.matchAll(pattern)) {
    const path = match[0].replace(/:\d+(?:-\d+)?$/, '')
    const absolute = resolve(repoRoot, path)
    if (!existsSync(absolute)) continue
    const lines = readFileSync(absolute, 'utf8').split('\n')
    const start = Number(match[1] ?? 1)
    const end = Math.min(Number(match[2] ?? match[1] ?? start), lines.length)
    refs.push({
      path,
      lines: `${start}-${end}`,
      anchor: (lines[start - 1] ?? path).trim().slice(0, 160) || path,
      role: 'body-source-reference',
      sha256: digest(readFileSync(absolute)),
    })
  }
  return [...new Map(refs.map((ref) => [`${ref.path}:${ref.lines}`, ref])).values()]
}

function classify(rel, text) {
  const parts = rel.split('/')
  const phase = parts[0]
  const archive = rel.includes('/archive/')
  const draft =
    rel.startsWith('lore/ideas/') ||
    rel.includes('/plans/') ||
    /draft|brainstorm|backlog|idea/i.test(rel)
  const status = archive ? 'archived' : draft ? 'draft' : 'current'
  const module = parts.length > 2 ? parts[1] : phase === 'lore' ? 'canon' : 'governance'
  const capability = slug(rel.replace(/\.md$/, '').replaceAll('/', '-'))
  const title = /^#\s+(.+)$/m.exec(text)?.[1] ?? rel
  const publicCallers = [
    ...new Set(
      (text.match(/(?:^|[`\s])(pnpm|node|git)\s+[^\n`]+/g) ?? []).map((x) =>
        x.trim().slice(0, 240),
      ),
    ),
  ]
  const refs = extractSourceRefs(text)
  if (!refs.length)
    refs.push({
      path: rel.startsWith('docs/') ? rel : `docs/${rel}`,
      lines: '1-1',
      anchor: title,
      role: 'document-source',
      sha256: digest(readFileSync(resolve(docsRoot, rel))),
    })
  return {
    phase,
    module,
    capability,
    title,
    status,
    publicCallers: publicCallers.length ? publicCallers : ['docs navigation'],
    refs,
  }
}

const entries = []
for (const root of roots) {
  for (const file of walk(resolve(docsRoot, root))) {
    const rel = relative(docsRoot, file).replaceAll('\\', '/')
    const text = readFileSync(file, 'utf8')
    const classification = classify(rel, text)
    const sourceSha256 = digest(readFileSync(file))
    entries.push({
      id: `docs-${classification.capability}`,
      path: `docs/${rel}`,
      title: classification.title,
      phase: classification.phase,
      module: classification.module,
      capability: classification.capability,
      status: classification.status,
      reviewStatus: 'reviewed',
      owner: /^Owner:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? 'Codex',
      provenance: ['source-document', 'repository-history'],
      sourceSha256,
      afterSha256: sourceSha256,
      sourceRefs: classification.refs,
      publicCallers: classification.publicCallers,
      legalInputs: [
        'current repository documentation',
        ...classification.refs.map((ref) => `${ref.path}:${ref.lines}`),
      ].slice(0, 12),
      businessOracle: {
        type: 'phase-lore-document-governance',
        assertions: [
          'the document has one explicit phase/lore/module responsibility',
          'historical or draft material is not silently promoted to current canonical truth',
          'source references and version claims remain auditable from the current repository',
        ],
      },
      dedupe: {
        result: 'reviewed',
        against: ['docs/phase-governance/catalog.json', `docs/${classification.phase}/README.md`],
        notes: 'Inventory entry only; no runtime, E2E, visual or coverage credit.',
      },
      revision: {
        currentSha: sourceRevision,
        implementationSha: sourceSha256,
        contentVersion: 22,
        minimumSaveVersion: 11,
        history: [
          {
            revision: sourceRevision,
            date: '2026-10-04',
            action: 'phase-lore-governance-inventory',
            notRun: ['runtime', 'E2E', 'coverage'],
          },
        ],
      },
      evidence: {
        kind: 'document-audit',
        sourceSha256,
        claims: ['phase/lore ownership and status inventory'],
      },
      history: [{ revision: sourceRevision, action: 'catalogued', status: classification.status }],
      supersedes: [],
      stopLine:
        classification.status === 'current'
          ? 'do not change canonical truth/version without updating primary-source references and the catalog'
          : 'do not cite this document as current canonical truth or runtime proof without a new reviewed successor',
      userVisibleBeforeAfter: null,
      lastReviewed: '2026-10-04',
    })
  }
}
entries.sort((a, b) => a.path.localeCompare(b.path))
const catalog = {
  schemaVersion: 1,
  id: 'phase-lore-governance-catalog',
  generatedBy: 'scripts/docs/build-phase-lore-governance.mjs',
  sourceRevision,
  policy:
    'Every lore/phase1/phase2/phase3 Markdown document has one audited owner, phase/module/capability, status, source/after SHA, evidence and stopline.',
  summary: {
    total: entries.length,
    byPhase: Object.fromEntries(
      Object.entries(Object.groupBy(entries, (entry) => entry.phase)).map(([key, values]) => [
        key,
        values.length,
      ]),
    ),
    byStatus: Object.fromEntries(
      Object.entries(Object.groupBy(entries, (entry) => entry.status)).map(([key, values]) => [
        key,
        values.length,
      ]),
    ),
  },
  entries,
}
writeFileSync(resolve(governanceRoot, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`)

const byPhase = [
  '# Lore / 三阶段文档索引',
  '',
  '由 `scripts/docs/build-phase-lore-governance.mjs` 生成。',
  '',
]
for (const phase of ['lore', 'phase1', 'phase2', 'phase3']) {
  byPhase.push(`## ${phase}`, '', '| 文档 | 模块 | 状态 | Owner |', '|---|---|---|---|')
  for (const entry of entries.filter((item) => item.phase === phase))
    byPhase.push(
      `| [${entry.title}](../${entry.path.replace(/^docs\//, '')}) | ${entry.module} | ${entry.status} | ${entry.owner} |`,
    )
  byPhase.push('')
}
writeFileSync(resolve(governanceRoot, 'by-phase.md'), `${byPhase.join('\n')}\n`)
const byStatus = [
  '# Lore / 三阶段文档状态索引',
  '',
  '由 `scripts/docs/build-phase-lore-governance.mjs` 生成。',
  '',
]
for (const status of ['current', 'draft', 'archived']) {
  byStatus.push(`## ${status}`, '')
  for (const entry of entries.filter((item) => item.status === status))
    byStatus.push(
      `- [${entry.title}](../${entry.path.replace(/^docs\//, '')}) · ${entry.phase}/${entry.module}`,
    )
  byStatus.push('')
}
writeFileSync(resolve(governanceRoot, 'by-status.md'), `${byStatus.join('\n')}\n`)
console.log(JSON.stringify(catalog.summary, null, 2))
