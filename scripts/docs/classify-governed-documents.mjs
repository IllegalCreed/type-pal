import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const roots = ['docs/ops', 'docs/lore', 'docs/phase1', 'docs/phase2', 'docs/phase3']
const allowed = new Set(['.md', '.json', '.html'])
const registryPath = resolve(repoRoot, 'docs/phase-governance/templates/registry.json')
const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
const templates = new Map(registry.types.map((entry) => [entry.docType, entry]))

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const absolute = resolve(dir, entry.name)
    if (entry.isDirectory()) walk(absolute, out)
    else if (allowed.has(entry.name.includes('.') ? `.${entry.name.split('.').at(-1)}` : ''))
      out.push(`docs/${relative(resolve(repoRoot, 'docs'), absolute).replaceAll('\\', '/')}`)
  }
  return out
}

function classify(path) {
  const file = path.split('/').at(-1).toLowerCase()
  const parts = path.split('/')
  const text = readFileSync(resolve(repoRoot, path), 'utf8')
  if (parts.includes('tasks')) return 'task-card'
  if (parts.includes('evidence') || /evidence|receipt|result|report\.json|\.log/i.test(file))
    return 'evidence-receipt'
  if (parts.includes('audits') || /audit|review|diff|gap|assessment|coverage/i.test(file))
    return 'audit-report'
  if (
    parts.includes('designs') ||
    parts.includes('specs') ||
    /design|schema|architecture|interface|contract|api/i.test(file)
  )
    return 'design-spec'
  if (
    parts.includes('plans') ||
    parts.includes('status') ||
    /backlog|roadmap|plan|status|milestone|timeline/i.test(file)
  )
    return 'plan-status'
  if (parts.includes('archive') || /historical|history|snapshot|old|legacy/i.test(file))
    return 'archive-record'
  if (parts.includes('guides') || /runbook|workflow|how[-_ ]to|guide|playbook/i.test(file))
    return 'guide-runbook'
  if (
    parts.includes('reference') ||
    parts.includes('lore') ||
    /canon|character|faction|world|rules|taboo|version|mechanic/i.test(file)
  )
    return 'reference-canon'
  if (parts.includes('ideas') || /idea|brainstorm|beat|story|narrative|dlc/i.test(file))
    return 'narrative-idea'
  if (
    file === 'readme.md' ||
    file === 'index.md' ||
    file === 'board.md' ||
    /catalog|registry|matrix/i.test(file)
  )
    return 'governance-index'
  if (/^\s*\{/.test(text) || path.endsWith('.json')) return 'evidence-receipt'
  return 'governance-index'
}

const paths = roots.flatMap((root) => walk(resolve(repoRoot, root)))
const entries = paths.map((path) => {
  const docType = classify(path)
  const template = templates.get(docType)
  return {
    path,
    phase: path.split('/')[1],
    docType,
    templateId: template.templateId,
    template: `docs/phase-governance/templates/${template.template}`,
    templateCompliance: 'governed-legacy',
    reviewStatus: 'unread',
  }
})
const output = {
  schemaVersion: 1,
  id: 'governed-document-registry-20261004',
  generatedBy: 'scripts/docs/classify-governed-documents.mjs',
  policy:
    'Classification is inventory only; content review status is granted only by a content review record with matching SHA and evidence.',
  roots,
  extensions: [...allowed],
  summary: {
    total: entries.length,
    byPhase: Object.fromEntries(
      roots.map((root) => [
        root.split('/')[1],
        entries.filter((entry) => entry.phase === root.split('/')[1]).length,
      ]),
    ),
    byType: Object.fromEntries(
      [...new Set(entries.map((entry) => entry.docType))]
        .sort()
        .map((type) => [type, entries.filter((entry) => entry.docType === type).length]),
    ),
  },
  entries,
}
writeFileSync(
  resolve(repoRoot, 'docs/phase-governance/document-registry.json'),
  `${JSON.stringify(output, null, 2)}\n`,
)
console.log(JSON.stringify(output.summary, null, 2))
