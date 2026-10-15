import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const testingRoot = resolve(repoRoot, 'docs/testing')
export const catalogPath = resolve(testingRoot, 'catalog.json')

export function loadCatalog(root = testingRoot) {
  return JSON.parse(readFileSync(resolve(root, 'catalog.json'), 'utf8'))
}

const link = (entry) => `[${entry.title}](../${entry.canonical})`
const rows = (entries) =>
  entries
    .map((entry) => `| ${entry.id} | ${link(entry)} | ${entry.status} | ${entry.owner} |`)
    .join('\n')
const table = (entries) =>
  ['| ID | 文档 | 状态 | Owner |', '|---|---|---|---|', rows(entries), ''].join('\n')
const list = (entries) =>
  entries.map((entry) => `- ${entry.id} — ${link(entry)}（${entry.status}）`).join('\n')
const uniqueIds = (entries) => new Set(entries.map((entry) => entry.id)).size

function groupEntries(entries, valuesFor) {
  const groups = new Map()
  for (const entry of entries)
    for (const value of valuesFor(entry)) groups.set(value, [...(groups.get(value) ?? []), entry])
  return [...groups.keys()].sort().map((name) => [name, groups.get(name)])
}

const memberships = (groups) => groups.reduce((total, [, entries]) => total + entries.length, 0)
const counts = (groups) => groups.map(([name, entries]) => `${name} ${entries.length}`).join('；')
const groupedBody = (groups, render = table) =>
  groups.map(([name, entries]) => `### ${name}\n\n${render(entries)}\n`).join('\n')

function view({ title, purpose, scope, state, authority, body, legacy = false }) {
  const source = legacy
    ? '[legacy-flat-classification.json](../legacy-flat-classification.json)'
    : '[catalog.json](../catalog.json)'
  return [
    `# ${title}`,
    '',
    'Status: current',
    'Owner: Codex（新增索引与 producer 治理维护职责）',
    'Last reviewed: 2026-10-16',
    'Template: governance-index-v1 / 1.0.0',
    '',
    '## 目的',
    '',
    purpose,
    '',
    '## 范围',
    '',
    scope,
    '',
    '## 当前状态',
    '',
    state,
    '',
    '页面 current 仅指导航投影有效；行的出版状态、历史验收与本轮深审分开。原视图没有文档级 Owner 或审查日期，上方责任是本次新增治理职责。',
    '2026-10-16 只记录当时索引规则、来源与导航语义的审查；重新生成不会续期日期，也不授予变化后的正文或下游报告新的审查、runtime/E2E/视觉/coverage 信用。',
    '',
    '## 入口与责任',
    '',
    authority,
    '本页由 [generate-testing-index.mjs](../../../scripts/docs/generate-testing-index.mjs) 生成，不能手工维护派生行；人工总入口是 [README](README.md)。',
    '',
    body.trimEnd(),
    '',
    '## 证据与下一步',
    '',
    `业务来源为 ${source}；原始报告、SHA、输入、oracle 与执行证据须继续沿目标正文回读，不能由本索引补证。`,
    '模板与源保真边界见 [L 冻结设计](../../phase-governance/reviews/20261016-testing-index-design.md)。本轮只替换同路径索引版式，不 supersede 下游报告或其历史结论。',
    '缺来源、成员或链接不一致、重生成丢章节时停止接收；先在对应事实源解释并审查变更，再运行公开生成命令及完整文档门。真实语义 scope 改变须新审查和 review 记录，不能刷日期或 SHA 代替核读。',
    '',
  ].join('\n')
}

export function renderIndexes(catalog, classification = { entries: [] }) {
  const entries = [...catalog.entries].sort((a, b) => a.id.localeCompare(b.id, 'en'))
  const stage = entries.filter((entry) => entry.kind === 'e2e-stage')
  const statuses = groupEntries(entries, (entry) => [entry.status])
  const tags = groupEntries(entries, (entry) => entry.tags)
  const owners = groupEntries(entries, (entry) => [entry.owner])
  const domains = groupEntries(entries, (entry) => [entry.domain ?? 'unspecified'])
  const modules = groupEntries(entries, (entry) => [
    `${entry.domain ?? 'unspecified'}/${entry.module ?? 'unspecified'}`,
  ])
  const phases = groupEntries(entries, (entry) => entry.phase ?? [])
  const engines = groupEntries(entries, (entry) => entry.engines ?? [])
  const ledger = [...classification.entries].sort((a, b) =>
    `${a.domain}/${a.module}/${a.path}`.localeCompare(`${b.domain}/${b.module}/${b.path}`),
  )
  const legacyDomains = groupEntries(ledger, (entry) => [entry.domain])
  const legacyTarget = (entry) =>
    entry.disposition === 'migrated' ? entry.canonicalTarget : entry.path
  const byLegacyDomain = legacyDomains
    .map(([domain, records]) =>
      [
        `### ${domain}`,
        '',
        '| 文件 | 模块 | 处理 | 旧分类账 reviewStatus | 分类依据 |',
        '|---|---|---|---|---|',
        ...records.map(
          (entry) =>
            `| [${entry.path}](../${legacyTarget(entry)}) | ${entry.module} | ${entry.disposition} | ${entry.reviewStatus} | ${entry.classificationBasis} |`,
        ),
        '',
      ].join('\n'),
    )
    .join('\n')
  return {
    'by-stage.md': view({
      title: 'E2E / 测试文档多维索引：按阶段',
      purpose:
        '选择稳定 E2E 阶段的正式报告，继续查其前驱、checkpoint 与证据；这张表不是顺序执行 runner。',
      scope: `当前仅投影 kind=e2e-stage 的 ${stage.length} 个阶段、${uniqueIds(stage)} 个稳定 ID。跨阶段合同、路线建议和共性审计不混入阶段表。`,
      state: `阶段行状态来自 catalog：${counts(groupEntries(stage, (entry) => [entry.status]))}。页面 current 不改变任何阶段的 rework、verified 或其它原状态，也不恢复旧运行授权。`,
      authority:
        'catalog 的 kind 决定是否入表；阶段报告负责合法输入、前驱和录像证据，维护者需先核报告/evidence 配对。',
      body: table(stage),
    }),
    'by-status.md': view({
      title: '测试文档索引：按状态',
      purpose: '按 catalog 原出版或阶段状态找报告，区分候选、返工和既有验收结论。',
      scope: `当前 ${uniqueIds(entries)} 个唯一 ID、${statuses.length} 个状态组：${counts(statuses)}。每个 ID 仅落入自己的原状态组。`,
      state:
        '本页没有第二套状态账。source publication 的 current 不是执行通过，历史 verified 不因重生成变成本日重验，proposal 也不成为实施承诺。',
      authority:
        '生命周期和 reviewBy 由 catalog 与测试治理维护；下游按状态选择阅读入口，不能用本页覆盖原报告的失败或停止线。',
      body: groupedBody(statuses),
    }),
    'by-tag.md': view({
      title: '测试文档索引：按标签',
      purpose: '用主题标签找到同一份报告的不同检索入口，继续回 canonical 查结论与证据。',
      scope: `当前 ${tags.length} 个标签组、${memberships(tags)} 个成员关系、${uniqueIds(entries)} 个唯一 ID；标签成员数不是测试数。`,
      state:
        '标签原值来自 catalog。visual、document-audit 等标签不证明已看图、已完成本轮深审或已实跑；跨标签重复按稳定 ID 排重。',
      authority:
        '维护者只在 catalog 增删 tags，使用者按主题检索；标签不得改变 Owner、执行状态或证据范围。',
      body: groupedBody(tags, list),
    }),
    'by-owner.md': view({
      title: '测试文档索引：按 Owner',
      purpose: '定位已登记文档的出版维护责任，便于跟进具体报告的更新与缺口。',
      scope: `当前 ${owners.length} 个 Owner 组、${uniqueIds(entries)} 个唯一 ID：${counts(owners)}。不覆盖 catalog 之外未登记贡献者。`,
      state:
        '组名来自 catalog.owner；它不是本索引的原作者身份，也不是本轮独立审查签名。历史原作者仍由各报告 provenance 保留。',
      authority:
        '下列 Owner 负责对应出版记录；本页新增治理维护职责与表内责任分开。责任冲突回 catalog/任务卡解决，不由生成器代签 accept。',
      body: groupedBody(owners, list),
    }),
    'by-domain.md': view({
      title: '测试文档索引：工程域',
      purpose: '按实际登记的工程域进入报告与证据，避免以目录或文件名猜测职责。',
      scope: `当前 ${domains.length} 个工程域、${uniqueIds(entries)} 个唯一 ID：${counts(domains)}。每份登记记录在该维度只列一次。`,
      state:
        '工程域只负责导航；各行 status 与 Owner 保留 catalog 原值。source audit 和历史实跑须按目标报告的边界分别阅读。',
      authority:
        'domain 字段决定组别；人和 Agent 从组内 canonical 继续查 evidence，域冲突回 catalog 解释，不在派生页重分类。',
      body: groupedBody(domains),
    }),
    'by-module.md': view({
      title: '测试文档索引：模块/功能',
      purpose: '按工程域/模块组合查功能报告，区分不同工程域中名称相近的职责。',
      scope: `当前 ${modules.length} 个 domain/module 组、${uniqueIds(entries)} 个唯一 ID：${counts(modules)}。同组多篇仍是不同稳定 ID。`,
      state:
        '组合键来自 catalog 字段，不从路径补推。同组报告不自动合并真源，也不等于重复执行；业务结论仍取各自 canonical。',
      authority:
        '下游按组合键查报告，维护者在 catalog 解释模块边界；例如 battle 的多条记录按 ID 保留，不用标题去重或创造产品取舍。',
      body: groupedBody(modules),
    }),
    'by-phase.md': view({
      title: '测试文档索引：阶段',
      purpose: '按 ops、第一阶段或第二阶段的适用范围查报告，不混用两阶段的真值和验收边界。',
      scope: `当前 ${phases.length} 个适用阶段组、${memberships(phases)} 个成员关系、${uniqueIds(entries)} 个唯一 ID：${counts(phases)}。跨组出现指向同一报告。`,
      state:
        'phase 数组是适用范围，不是执行次数；第一阶段旧验证不能继承成第二阶段通过。早期 capture 的分组纠正已在本轮之前完成，本页沿用批准的来源。',
      authority:
        'catalog.phase 决定组别，报告分别提供各阶段 primary source 与执行边界；阶段冲突回事实源审查，不由 renderer 裁决。',
      body: groupedBody(phases),
    }),
    'by-engine.md': view({
      title: '测试文档索引：执行引擎',
      purpose: '按登记的引擎适用范围发现报告，区分内容、编辑器和两运行时的职责。',
      scope: `当前 ${engines.length} 个引擎组、${memberships(engines)} 个成员关系、${uniqueIds(entries)} 个唯一 ID：${counts(engines)}。多引擎成员不是新增测试。`,
      state:
        'engines 数组只说明适用范围，不证明各引擎都已实际执行。早期 capture 中三项范围纠正已在本轮之前完成，保留批准 source 的成员关系。',
      authority:
        'catalog.engines 决定成员；下游回报告核 source audit 与 runtime-execution 的区别，同一 audit 跨引擎出现不能重复计审查或执行信用。',
      body: groupedBody(engines),
    }),
    'legacy-by-domain.md': view({
      title: 'Legacy 文件工程域分类',
      purpose: '从旧原路径追溯工程域、模块、迁移落点与分类依据，保留历史来源的可发现性。',
      scope: `当前 ${ledger.length} 条原路径、${legacyDomains.length} 个工程域、${new Set(ledger.map(legacyTarget)).size} 个唯一目标：${counts(legacyDomains)}。目标可能是归档、当前报告或收口计划。`,
      state:
        '旧分类账 reviewStatus 原值保留。reviewed 由旧 classifier 的 movedTo/closeout 成员关系产生，不是本轮逐篇语义 accept；candidate-needs-depth-review 也不是已经验收。分类依据的正文路径/文件名线索不替代内容审查。',
      authority:
        '原路径名与 Agent 名称是 provenance。历史 lab 多条记录汇入同一 history，不得按行数重复计执行；旧 tool 指向 closeout 计划也不是合法 runner。完整锚点、SHA、reason 与停止线回分类账，当前深审进度取真实中央 review。',
      body: byLegacyDomain,
      legacy: true,
    }),
  }
}

export function writeIndexes(root = testingRoot) {
  // Both authoritative inputs must parse before any generated output is touched.
  const catalog = loadCatalog(root)
  const classification = JSON.parse(
    readFileSync(resolve(root, 'legacy-flat-classification.json'), 'utf8'),
  )
  const indexes = renderIndexes(catalog, classification)
  for (const [name, text] of Object.entries(indexes))
    writeFileSync(resolve(root, 'indexes', name), text)
  return indexes
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const indexes = writeIndexes()
  console.log(`testing indexes generated: ${Object.keys(indexes).join(', ')}`)
}
