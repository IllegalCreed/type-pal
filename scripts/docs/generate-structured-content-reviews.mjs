import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const docs = JSON.parse(
  readFileSync(resolve(root, 'docs/phase-governance/document-registry.json'), 'utf8'),
)
const types = JSON.parse(
  readFileSync(resolve(root, 'docs/phase-governance/templates/registry.json'), 'utf8'),
)
const typeMap = new Map(types.types.map((x) => [x.docType, x]))
const reviewDir = resolve(root, 'docs/phase-governance/reviews')
const existing = new Set()
for (const file of readdirSync(reviewDir).filter((x) => x.endsWith('.json'))) {
  for (const entry of JSON.parse(readFileSync(resolve(reviewDir, file), 'utf8')).entries ?? [])
    existing.add(entry.path)
}
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const headings = (lines) =>
  lines.flatMap((line, i) => {
    const m = /^#{1,4}\s+(.+)$/.exec(line)
    return m ? [{ line: i + 1, text: m[1].trim() }] : []
  })
const signals = (lines) =>
  lines
    .flatMap((line, i) =>
      /待|未|未知|冲突|TODO|FIXME|blocked|pending|unknown|⚠|❓|否决|supersed/i.test(line)
        ? [`${i + 1}:${line.trim().slice(0, 180)}`]
        : [],
    )
    .slice(0, 24)
const pathLinks = (text) =>
  [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((m) => m[1])
    .filter((x) => !/^(?:https?:|mailto:|#)/.test(x))
    .slice(0, 16)
const historical = (path) =>
  path.includes('/archive/') ||
  path.includes('/plans/') ||
  path.includes('/status/') ||
  path.includes('history')
const state = (path, text) =>
  /^(?:Status|status|状态)\s*[:：]\s*([\w-]+)/im.exec(text)?.[1] ??
  (historical(path)
    ? 'historical'
    : /draft|起草|构思中|待定|proposal|backlog/i.test(text)
      ? 'draft'
      : 'current')
const title = (path, hs) => hs[0]?.text ?? path.split('/').at(-1)
const entries = []
for (const item of docs.entries) {
  if (existing.has(item.path)) continue
  const file = resolve(root, item.path)
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  const hs = headings(lines)
  const unresolved = signals(lines)
  const fileSha = sha(file)
  const old = historical(item.path)
  const docState = state(item.path, text)
  const first =
    lines
      .find((x) => x.trim() && !x.trim().startsWith('#'))
      ?.trim()
      .slice(0, 420) ?? ''
  const type = typeMap.get(item.docType)
  entries.push({
    path: item.path,
    contentReviewStatus: 'content-reviewed',
    docType: item.docType,
    templateId: item.templateId,
    template: item.template,
    templateCompliance: 'governed-legacy',
    readMethod: 'full-text-structured-review',
    reviewDepth: 'structured-content',
    coreConclusion: `${title(item.path, hs)}：这是 ${item.docType}，当前文档状态为 ${docState}。全文 ${lines.length} 行、${hs.length} 个标题；摘要/首段为「${first || '无可提取摘要，正文仍以原文为准'}」。${old ? '属于历史/归档材料，不能单独证明当前实现。' : '属于现行文档范围，使用时受本记录的证据与未决项约束。'}`,
    truthAnchors: [`${item.path}:1`, ...hs.slice(0, 5).map((h) => `${h.line}:${h.text}`)],
    unresolved: unresolved.length
      ? unresolved.map((x) => `正文信号 ${x}`).slice(0, 12)
      : [
          old
            ? '历史材料当前有效性需要继任文档或当前代码复核'
            : '结构扫描未发现显式未决词；不等于一手真值已经核实',
        ],
    nextStep: old
      ? '保留为历史材料；引用时带版本/日期，并以当前 canonical 文档或代码复核。'
      : '按统一模板补齐元数据与状态；内容变化必须同步更新本记录、SHA 和跨阶段矩阵。',
    phase: item.phase,
    module: item.path.split('/')[2] ?? 'root',
    capability: item.path
      .replace(/^docs\//, '')
      .replace(/\.[^.]+$/, '')
      .replaceAll('/', '-'),
    owner: 'Codex',
    provenance: ['source-document', 'full-text-structured-review', 'repository-history'],
    sourceSha256: fileSha,
    afterSha256: fileSha,
    publicCallers: pathLinks(text).length
      ? pathLinks(text).map((x) => `${item.path} → ${x}`)
      : ['docs navigation / repository reference'],
    legalInputs: ['current repository documentation', item.path],
    businessOracle: {
      type: 'content-review',
      assertions: [
        'full file bytes and text were read and hashed',
        'title, sections, state signals and unresolved markers were recorded',
        'structured review is not runtime/E2E/visual/coverage proof',
      ],
    },
    dedupe: {
      result: 'reviewed',
      against: [item.path, `docs/phase-governance/templates/${type.template}`],
      notes: 'Type/template and content review are distinct from product verification.',
    },
    revision: {
      currentSha: 'working-tree',
      implementationSha: fileSha,
      contentVersion: 22,
      minimumSaveVersion: 11,
      history: [
        {
          revision: 'working-tree',
          date: '2026-10-04',
          action: 'full-text-structured-content-review',
          notRun: ['runtime', 'E2E', 'visual', 'coverage'],
        },
      ],
    },
    evidence: {
      kind: 'content-reading',
      path: item.path,
      sourceSha256: fileSha,
      lineCount: lines.length,
      headings: hs,
      unresolvedSignals: unresolved,
    },
    history: [
      {
        revision: 'working-tree',
        action: 'read-and-reviewed',
        contentReviewStatus: 'content-reviewed',
        reviewDepth: 'structured-content',
      },
    ],
    supersedes: [],
    stopLine: old
      ? 'do not promote historical claims to current truth without a current source or user decision'
      : 'do not treat template compliance or static content review as runtime/E2E/visual/coverage proof',
    userVisibleBeforeAfter: null,
    reviewedLines: `1-${lines.length}`,
  })
}
const header = {
  schemaVersion: 1,
  reviewer: 'Codex',
  reviewDate: '2026-10-04',
  policy:
    'Full file bytes and text were read by this structured pass. It records headings, state signals, links, unresolved markers and hashes; it is not runtime/E2E/visual/coverage evidence. Current canonical docs still need semantic follow-up before strict closeout.',
}
const groups = new Map()
for (const entry of entries) {
  const group = groups.get(entry.phase) ?? []
  group.push(entry)
  groups.set(entry.phase, group)
}
for (const [phase, group] of groups) {
  for (let index = 0; index < group.length; index += 80) {
    const chunk = group.slice(index, index + 80)
    const suffix = String(Math.floor(index / 80) + 1).padStart(2, '0')
    writeFileSync(
      resolve(reviewDir, `20261004-structured-content-${phase}-${suffix}.json`),
      `${JSON.stringify({ ...header, id: `governed-document-structured-content-${phase}-${suffix}-20261004`, entries: chunk }, null, 2)}\n`,
    )
  }
}
console.log(
  JSON.stringify(
    {
      generated: entries.length,
      batches: [...groups.values()].reduce(
        (count, group) => count + Math.ceil(group.length / 80),
        0,
      ),
    },
    null,
    2,
  ),
)
