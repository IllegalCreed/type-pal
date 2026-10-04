import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const testingRoot = resolve(repoRoot, 'docs/testing')
export const outputPath = resolve(testingRoot, 'legacy-flat-classification.json')

const provenancePrefixes = new Map([
  ['codex', 'Codex'],
  ['cursor', 'Cursor'],
  ['glm', 'GLM'],
  ['grok', 'Grok'],
  ['kimi', 'Kimi'],
  ['gemini', 'Gemini'],
])

const domainRules = [
  ['e2e|checkpoint|pre-e2e', 'e2e', 'route-and-checkpoint'],
  ['battle', 'runtime', 'battle'],
  ['editor|menu|command|item|preview|sprite|design-system|ui', 'editor', 'editor-workflows'],
  ['content|script|scene|world|map|active', 'content', 'authoring-and-runtime'],
  ['migration|pal-assets|import|resource', 'migration', 'supply-and-import'],
  ['save|checkpoint-export', 'persistence', 'save-and-recovery'],
  ['coverage|quality|guard|stability', 'quality', 'quality-gates'],
  ['phase1|reforge|runtime', 'runtime', 'engine-boundaries'],
]

const agentPattern = /(?:^|[-_])(codex|cursor|glm|grok|kimi|gemini)(?=$|[-_])/i

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/(?:^|[-_])(codex|cursor|glm|grok|kimi|gemini)(?=$|[-_])/gi, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function classifyPath(path, kind, sourceSha) {
  const stem = path.replace(/\.[^.]+$/, '').toLowerCase()
  const prefix = stem.match(/^(codex|cursor|glm|grok|kimi|gemini)(?:[-_]|$)/i)?.[1]?.toLowerCase()
  const provenance = prefix ? provenancePrefixes.get(prefix) : 'unattributed'
  const rule = domainRules.find(([pattern]) => new RegExp(pattern).test(stem))
  const domain = rule?.[1] ?? 'ops'
  const module = rule?.[2] ?? 'testing-records'
  const slug = slugify(stem) || 'legacy-record'
  const archiveHistory = stem.startsWith('architecture-regression-lab-codex-')
  return {
    path,
    kind,
    domain,
    module,
    capability: slug,
    provenance,
    sourceSha,
    canonicalTarget: `domains/${domain}/${module}/${slug}${path.slice(stem.length)}`,
    disposition: archiveHistory ? 'archive-history' : 'retain-legacy',
    supersededBy: archiveHistory ? 'archive/architecture-regression-lab-history.md' : null,
    reason: archiveHistory
      ? '逐轮反证属于同一实验包；保留原始结论，由历史汇总承接当前导航。'
      : '尚未完成独立迁移/删除核验；保留原文件，禁止继续新增同类平面文件。',
    agentInCanonicalPath: agentPattern.test(`domains/${domain}/${module}/${slug}`),
  }
}

export function buildClassification(root = testingRoot) {
  const legacy = JSON.parse(readFileSync(resolve(root, 'legacy-flat.json'), 'utf8'))
  const entries = legacy.entries.map((entry) => {
    const absolute = resolve(root, entry.path)
    const sourceSha = existsSync(absolute)
      ? createHash('sha256').update(readFileSync(absolute)).digest('hex')
      : null
    return classifyPath(entry.path, entry.kind, sourceSha)
  })
  const byDomain = Object.groupBy(entries, (entry) => entry.domain)
  return {
    schemaVersion: 1,
    generatedBy: 'scripts/docs/classify-testing-legacy.mjs',
    generatedFrom: 'docs/testing/legacy-flat.json',
    policy: 'Agent names are provenance only; canonical targets are domain/module/function names.',
    summary: {
      total: entries.length,
      byDomain: Object.fromEntries(
        Object.entries(byDomain).map(([domain, values]) => [domain, values.length]),
      ),
      byDisposition: Object.fromEntries(
        Object.entries(Object.groupBy(entries, (entry) => entry.disposition)).map(
          ([key, values]) => [key, values.length],
        ),
      ),
    },
    entries,
  }
}

export function writeClassification(root = testingRoot) {
  const output = resolve(root, 'legacy-flat-classification.json')
  mkdirSync(dirname(output), { recursive: true })
  const classification = buildClassification(root)
  writeFileSync(output, `${JSON.stringify(classification, null, 2)}\n`)
  return classification
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const classification = writeClassification()
  console.log(`legacy testing classification written: ${classification.summary.total} entries`)
}
