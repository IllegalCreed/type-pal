import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const testingRoot = resolve(repoRoot, 'docs/testing')
export const outputPath = resolve(testingRoot, 'legacy-flat-classification.json')
const closeoutPlanPath = resolve(testingRoot, 'archive/migrations/legacy-full-closeout-plan.json')
const closeoutPlan = existsSync(closeoutPlanPath)
  ? JSON.parse(readFileSync(closeoutPlanPath, 'utf8'))
  : { entries: [] }
const closeoutEntries = [
  ...(closeoutPlan.entries ?? []),
  ...(closeoutPlan.entryFiles ?? []).flatMap(
    (path) => JSON.parse(readFileSync(resolve(testingRoot, path), 'utf8')).entries,
  ),
]
const closeoutByPath = new Map(closeoutEntries.map((entry) => [entry.path, entry]))

const provenancePrefixes = new Map([
  ['codex', 'Codex'],
  ['cursor', 'Cursor'],
  ['glm', 'GLM'],
  ['grok', 'Grok'],
  ['kimi', 'Kimi'],
  ['gemini', 'Gemini'],
])

const domainRules = [
  ['coverage|quality|stability', 'quality', 'quality-gates'],
  ['save|checkpoint-export', 'persistence', 'save-and-recovery'],
  [
    'migration|migrate|translate-events|pal-assets|import|resource',
    'migration',
    'supply-and-import',
  ],
  ['e2e|checkpoint|pre-e2e', 'e2e', 'route-and-checkpoint'],
  ['battle', 'runtime', 'battle'],
  ['editor|menu|command|item|preview|sprite|design-system|ui', 'editor', 'editor-workflows'],
  ['content|script|scene|world|map|active', 'content', 'authoring-and-runtime'],
  ['migration|pal-assets|import|resource', 'migration', 'supply-and-import'],
  ['save|checkpoint-export', 'persistence', 'save-and-recovery'],
  ['coverage|quality|guard|stability', 'quality', 'quality-gates'],
  ['phase1|reforge|runtime', 'runtime', 'engine-boundaries'],
]

const sourceDomains = {
  game: 'phase1-runtime',
  reforge: 'runtime',
  editor: 'editor',
  content: 'content',
  migrate: 'migration',
  'pal-extract': 'extraction',
  shared: 'shared',
}

function contentInventory(text) {
  const sources = new Map()
  for (const match of text.matchAll(
    /packages\/(game|reforge|editor|content|migrate|pal-extract|shared)\/(?:src|scripts)\/[\w./-]+\.(?:ts|tsx|mts|mjs)(?::\d+(?:[-–]\d+)?)?/g,
  )) {
    const path = match[0].replace(/:\d+(?:[-–]\d+)?$/, '')
    if (!sources.has(path)) sources.set(path, { path, domain: sourceDomains[match[1]] })
  }
  const totals = Object.groupBy([...sources.values()], (source) => source.domain)
  const sorted = Object.entries(totals).sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  )
  const dominant =
    sorted.length && (sorted.length === 1 || sorted[0][1].length > sorted[1][1].length)
      ? sorted[0][0]
      : null
  return {
    sourceFiles: [...sources.values()].map((source) => source.path).sort(),
    sourceDomains: Object.fromEntries(sorted.map(([domain, values]) => [domain, values.length])),
    dominant,
    title: /^# (.+)$/m.exec(text)?.[1] ?? null,
    lineCount: text.split('\n').length,
    containsExecutionClaims: /实跑|实测|passed|exit\s*0|独立复跑|detected/i.test(text),
    containsHistoricalCounter: /counter|失败|未证|未运行/.test(text),
  }
}

const agentPattern = /(?:^|[-_])(codex|cursor|glm|grok|kimi|gemini)(?=$|[-_])/i

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/(?:^|[-_])(codex|cursor|glm|grok|kimi|gemini)(?=$|[-_])/gi, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function classifyPath(path, kind, sourceSha, options = {}) {
  const stem = path.replace(/\.[^.]+$/, '').toLowerCase()
  const prefix = stem
    .match(/(?:^|[-_])(codex|cursor|glm|grok|kimi|gemini)(?:[-_]|$)/i)?.[1]
    ?.toLowerCase()
  const provenance = prefix ? provenancePrefixes.get(prefix) : 'unattributed'
  const rule = domainRules.find(([pattern]) => new RegExp(pattern).test(stem))
  const inventory = contentInventory(options.text ?? '')
  const domain =
    options.reviewedDomain ??
    (/coverage|quality|stability|pre-e2e/.test(stem) ? rule?.[1] : inventory.dominant) ??
    rule?.[1] ??
    'ops'
  const module =
    options.reviewedModule ??
    (domain === 'runtime' && /active-scene|scene-preparation/.test(stem)
      ? 'scene'
      : domain === 'runtime' && /world-runtime/.test(stem)
        ? 'world'
        : (rule?.[2] ?? 'testing-records'))
  const slug = slugify(stem) || 'legacy-record'
  const archiveHistory = stem.startsWith('architecture-regression-lab-codex-')
  const closeout = options.closeout ?? null
  const retainedWithStopline = closeout?.resolution === 'retain-legacy-with-stopline'
  const reviewed = Boolean(options.movedTo || closeout)
  return {
    path,
    kind,
    domain,
    module,
    capability: slug,
    provenance,
    sourceSha,
    classificationBasis: options.movedTo
      ? 'reviewed-migration-batch'
      : closeout
        ? 'legacy-full-closeout-review'
        : inventory.dominant
          ? 'body-source-paths'
          : 'filename-hint-only',
    reviewStatus: reviewed ? 'reviewed' : 'candidate-needs-depth-review',
    inventory,
    canonicalTarget:
      (retainedWithStopline ? 'archive/migrations/legacy-full-closeout-plan.json' : null) ??
      options.canonicalTarget ??
      options.movedTo ??
      `domains/${domain}/${module}/${slug}${path.slice(stem.length)}`,
    disposition: options.movedTo
      ? 'migrated'
      : retainedWithStopline
        ? 'retain-legacy'
        : archiveHistory
          ? 'archive-history'
          : 'retain-legacy',
    supersededBy: options.movedTo
      ? (options.supersededBy ?? 'docs/testing/archive/migrations/testing-domains-20261004.json')
      : archiveHistory
        ? 'archive/architecture-regression-lab-history.md'
        : null,
    reason: closeout
      ? `${closeout.reason}; stop line: ${closeout.stopLine}`
      : options.movedTo
        ? '已按 SHA 锁定迁入工程域/历史归档；当前 canonical 负责导航，原正文和源 SHA 由 history 保留。'
        : archiveHistory
          ? '逐轮反证属于同一实验包；保留原始结论，由历史汇总承接当前导航。'
          : '尚未完成独立迁移/删除核验；保留原文件，禁止继续新增同类平面文件。',
    proposedCanonicalTarget: closeout?.canonicalTarget ?? null,
    closeoutResolution: closeout?.resolution ?? null,
    stopLine: closeout?.stopLine ?? null,
    agentInCanonicalPath:
      !String(options.movedTo ?? '').startsWith('archive/legacy/') &&
      agentPattern.test(`domains/${domain}/${module}/${slug}`),
  }
}

export function buildClassification(root = testingRoot) {
  const legacy = JSON.parse(readFileSync(resolve(root, 'legacy-flat.json'), 'utf8'))
  const active = legacy.entries
  const retired = (legacy.retired ?? []).map((entry) => ({
    ...entry,
    path: entry.path,
    movedTo: entry.movedTo,
  }))
  const entries = [...active, ...retired].map((entry) => {
    const absolute = resolve(root, entry.historicalTarget ?? entry.movedTo ?? entry.path)
    const sourceSha =
      entry.sourceSha256 ??
      (existsSync(absolute)
        ? createHash('sha256').update(readFileSync(absolute)).digest('hex')
        : null)
    return classifyPath(entry.path, entry.kind, sourceSha, {
      movedTo: entry.movedTo,
      closeout: closeoutByPath.get(entry.path),
      supersededBy: entry.plan ?? undefined,
      text: existsSync(absolute) ? readFileSync(absolute, 'utf8') : '',
      reviewedDomain: entry.movedTo?.startsWith('domains/runtime/')
        ? 'runtime'
        : entry.movedTo?.startsWith('archive/architecture-regression-lab/')
          ? 'cross-domain'
          : undefined,
      reviewedModule: entry.movedTo?.startsWith('archive/architecture-regression-lab/')
        ? 'architecture-regression'
        : entry.movedTo?.split('/')[2],
      canonicalTarget: entry.movedTo?.startsWith('archive/architecture-regression-lab/')
        ? 'archive/architecture-regression-lab-history.md'
        : entry.movedTo,
    })
  })
  const byDomain = Object.groupBy(entries, (entry) => entry.domain)
  return {
    schemaVersion: 1,
    generatedBy: 'scripts/docs/classify-testing-legacy.mjs',
    generatedFrom: 'docs/testing/legacy-flat.json',
    policy: 'Agent names are provenance only; canonical targets are domain/module/function names.',
    summary: {
      total: entries.length,
      active: active.length,
      retired: retired.length,
      reviewed: entries.filter((entry) => entry.reviewStatus === 'reviewed').length,
      pendingDepthReview: entries.filter((entry) => entry.reviewStatus !== 'reviewed').length,
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
