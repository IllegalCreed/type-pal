// Derived planning inventory only. Never runs coverage or changes its baseline.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const sourceRef = 'e58834f6389a40ffe9f187e6a8051f552e964d79'
const metrics = ['lines', 'statements', 'functions', 'branches']
const files = (pkg, names) => names.map((name) => `packages/${pkg}/src/${name}.ts`)
const batches = [
  {
    id: 'TB-00',
    title: '当前独立任务：运行时状态与作者元数据',
    admission: 'existing-card-controls-build',
    files: [
      ...files('content', ['world-variable', 'migration-diagnostic']),
      ...files('reforge', [
        'runtime-script-compiler',
        'runtime-project-view',
        'entity-action-player',
        'frame-animation-player',
        'magic-menu-state',
        'system-menu-state',
        'scene-entry-session',
        'screen-hold-transaction',
        'menu/reward-gain-queue',
      ]),
    ],
  },
  {
    id: 'TB-01',
    title: '内容合同已登记的剩余边界',
    files: files('content', [
      'asset',
      'actor-reference',
      'frame-sequence',
      'author-dialogue',
      'map-index',
      'validate-refs',
    ]),
  },
  {
    id: 'TB-02',
    title: '运行时资源读取、缓存与音效准备',
    files: files('reforge', [
      'audio/sfx',
      'audio/sfx-readiness',
      'project-image-cache',
      'file-source',
      'fsa-source',
      'engine-chrome/registry',
    ]),
  },
  {
    id: 'TB-03',
    title: '编辑器导入、编码工作线程与视频元数据',
    files: files('editor', [
      'core/image-import',
      'core/battle-sprite-import',
      'core/frame-animation-images',
      'core/frame-animation-codec',
      'core/frame-animation-worker-client',
      'core/frame-animation-codec.worker',
      'core/video-metadata',
    ]),
  },
  {
    id: 'TB-04',
    title: '原版表格与文本的自包含二进制输入',
    files: files('pal-extract', [
      'io/sss',
      'io/word',
      'io/msg',
      'resources/parsers/items',
      'resources/parsers/stores',
      'resources/parsers/battle-fields',
      'resources/parsers/enemy-teams',
      'resources/parsers/data-misc',
      'resources/enemy-pos',
    ]),
  },
  {
    id: 'TB-05',
    title: 'RLE、事件工具、字体与资源清单',
    files: [
      ...files('shared', ['rle', 'rle-encode']),
      ...files('pal-extract', [
        'events/disasm',
        'events/recompile',
        'events/annotate',
        'events/slice',
        'resources/palette',
        'font/bdf-to-json',
        'resources/asset-manifest',
      ]),
    ],
  },
  {
    id: 'TB-06',
    title: '地图选区、变换与组合模板的数据合同',
    files: files('editor', [
      'core/map-selection',
      'core/map-transform',
      'core/map-patch',
      'core/stamp-draft',
      'core/stamp-placement',
      'core/stamp-placement-mutation',
      'core/stamp-group-transform',
      'core/stamp-template',
    ]),
  },
  {
    id: 'TB-07',
    title: '脚本编辑与物品、敌人事件纯数据辅助',
    files: files('editor', [
      'core/author-command-edit',
      'core/script-editor',
      'core/script-editor-projection',
      'core/script-reference-catalog',
      'core/item-authoring',
      'core/item-alchemy',
      'ui/enemy-defeated-events',
    ]),
  },
  {
    id: 'TB-08',
    title: '第一阶段菜单导航与选择请求',
    files: files('game', [
      'core/menu/primitives',
      'core/menu/inventory-menu',
      'core/menu/item-select',
      'core/menu/magic-select',
      'core/menu/in-game-magic-menu',
      'core/menu/shop-menu',
      'core/menu/sell-menu',
      'core/menu/equip-menu',
      'core/menu/in-game-menu',
    ]),
  },
  {
    id: 'TB-09',
    title: '第一阶段宿主边界、隐私与计时状态',
    files: files('game', [
      'shell/fetch-retry',
      'shell/input',
      'shell/audio-volume',
      'analytics/analytics-consent',
      'analytics/google-analytics',
      'tools/speedrun/timer',
      'tools/speedrun/detectors',
      'tools/speedrun/time-format',
    ]),
  },
  {
    id: 'TB-10',
    title: '当前迁移流程的纯边界与隔离文件系统合同',
    files: files('migrate', [
      'migration-project-io',
      'migration-transaction',
      'migration-write-plan',
      'project-map-converter',
      'project-map-audit',
      'source-facts',
      'pal-authored-overlays',
      'pal-item-scheme-labels',
      'pal-store-boundary',
    ]),
  },
].map((batch) => ({ admission: 'planning-only-no-build-authority', ...batch }))

const consumerReview = new Set([
  'packages/content/src/enemy-team-reference.ts',
  'packages/content/src/script-library.ts',
  'packages/reforge/src/script-chunk-store.ts',
])
// Routing heuristics are NOT semantic audits or declarations of defects/dead code.
const routeFor = (file, counts, batch) => {
  if (batch) return [batch === 'TB-00' ? 'current-card' : 'planned-batch', batch]
  if (consumerReview.has(file)) return ['current-consumer-review', 'explicit-caller-census-needed']
  if (metrics.every((key) => counts[key].total === 0))
    return ['no-executable-counters', 'zero-denominator-not-100-percent']
  if (metrics.every((key) => counts[key].covered === counts[key].total))
    return ['no-fast-metric-gap', 'business-assertions-not-proven-by-coverage']
  if (
    /\/(main|bootstrap|App)\.(ts|tsx)$/.test(file) ||
    /\.(tsx)$/.test(file) ||
    /\/(render|renderer|ui|present|overlay)(\/|-|\.)/.test(file)
  ) {
    return ['codex-ui-or-shell-triage', 'path-heuristic-not-visual-verification']
  }
  if (
    file.startsWith('packages/migrate/') ||
    /(?:save|journal|workspace|project-io|project-write|battle|script-runner|script-world|script-project-core|author-script-core|enemy-script|\/script\.ts|yj2|service-worker)/.test(
      file,
    )
  ) {
    return ['contract-or-fix-first-triage', 'name-heuristic-requires-owner-and-current-contract']
  }
  return ['glm-readonly-triage', 'unselected-gap-not-yet-an-implementation-task']
}

const read = (path) => readFileSync(resolve(root, path), 'utf8')
const baselinePath = 'scripts/coverage/baseline.fast.json'
const baselineBytes = read(baselinePath)
const baseline = JSON.parse(baselineBytes)
const summary = JSON.parse(read('coverage/fast/summary.json'))
assert.equal(baseline.profile, 'fast')
assert.equal(summary.profile, 'fast')
assert.equal(
  baseline.sourceFileCount,
  617,
  'Queue snapshot needs explicit re-census after scope changes',
)
assert.equal(
  baseline.testCount,
  7049,
  'Do not silently reuse a later baseline for this frozen plan',
)
assert.equal(summary.testCount, baseline.testCount)
assert.equal(summary.sourceFileCount, baseline.sourceFileCount)
assert.deepEqual(summary.provider, baseline.provider)
assert.deepEqual(summary.total, baseline.total)
assert.deepEqual(Object.keys(summary.packages).sort(), Object.keys(baseline.packages).sort())

const assignments = new Map()
for (const batch of batches) {
  for (const file of batch.files) {
    assert(!assignments.has(file), `Duplicate assignment: ${file}`)
    assignments.set(file, batch.id)
  }
}
assert.equal(batches[0].files.length, 11)
assert.equal(assignments.size, 89)
const emptyMetrics = () => Object.fromEntries(metrics.map((key) => [key, { covered: 0, total: 0 }]))
const add = (to, from) => {
  for (const key of metrics) {
    to[key].covered += from[key].covered
    to[key].total += from[key].total
  }
}
const inventory = []
const totals = emptyMetrics()
const packageSummary = {}
const reportHashes = {}
for (const [pkg, scope] of Object.entries(baseline.packages)) {
  const current = summary.packages[pkg]
  assert.deepEqual(current.sourceFiles, scope.sourceFiles, `${pkg} source scope mismatch`)
  assert.equal(current.scopeDigest, scope.scopeDigest)
  for (const key of Object.keys(scope.fastTests)) {
    assert.deepEqual(
      current.fastTests[key],
      scope.fastTests[key],
      `${pkg} test inventory mismatch: ${key}`,
    )
  }
  assert.deepEqual(current.metrics, scope.metrics, `${pkg} official counts mismatch`)
  const reportBytes = read(`coverage/fast/${pkg}/coverage-summary.json`)
  reportHashes[pkg] = createHash('sha256').update(reportBytes).digest('hex')
  const report = JSON.parse(reportBytes)
  const byFile = new Map()
  for (const [absolute, counts] of Object.entries(report)) {
    if (absolute === 'total') continue
    const file = absolute.slice(absolute.lastIndexOf('/packages/') + 1)
    assert(file.startsWith(`packages/${pkg}/`), `Unexpected coverage path: ${absolute}`)
    assert(!byFile.has(file), `Duplicate coverage path: ${file}`)
    byFile.set(file, counts)
  }
  assert.equal(byFile.size, scope.sourceFileCount)
  const packageMetrics = emptyMetrics()
  const routeCounts = {}
  for (const file of scope.sourceFiles) {
    assert(existsSync(resolve(root, file)), `Missing current source: ${file}`)
    const raw = byFile.get(file)
    assert(raw, `Missing coverage row: ${file}`)
    const counts = Object.fromEntries(
      metrics.map((key) => {
        const { covered, total } = raw[key]
        assert(
          Number.isInteger(covered) && Number.isInteger(total) && covered >= 0 && covered <= total,
        )
        return [key, { covered, total }]
      }),
    )
    const [route, basis] = routeFor(file, counts, assignments.get(file))
    inventory.push({ file, route, basis, metrics: counts })
    routeCounts[route] = (routeCounts[route] ?? 0) + 1
    add(packageMetrics, counts)
  }
  assert.deepEqual(
    packageMetrics,
    scope.metrics,
    `${pkg} per-file sum differs from official counts`,
  )
  add(totals, packageMetrics)
  packageSummary[pkg] = {
    files: scope.sourceFileCount,
    routes: routeCounts,
    metrics: packageMetrics,
  }
}
assert.deepEqual(totals, baseline.total)
const paths = inventory.map(({ file }) => file)
assert.equal(new Set(paths).size, 617)
for (const file of assignments.keys()) assert(paths.includes(file), `Unknown target: ${file}`)
// Includes current worktree changes, not just committed HEAD. No checkout or stash.
execFileSync('git', ['diff', '--quiet', sourceRef, '--', ...paths], { cwd: root })
const routes = {}
for (const { route } of inventory) routes[route] = (routes[route] ?? 0) + 1
const output = {
  schemaVersion: 1,
  purpose:
    'Planning-only metadata census; not 617 semantic audits, accepted tests, or build authorization',
  sourceRef,
  baseline: {
    path: baselinePath,
    generatedAt: baseline.generatedAt,
    sha256: createHash('sha256').update(baselineBytes).digest('hex'),
    profile: 'fast',
    tests: 7049,
    files: 617,
  },
  reportHashes,
  routes,
  packages: packageSummary,
  batches: batches.map((batch) => ({
    ...batch,
    metrics: inventory
      .filter(({ file }) => batch.files.includes(file))
      .reduce((sum, row) => {
        add(sum, row.metrics)
        return sum
      }, emptyMetrics()),
  })),
  files: inventory,
}
const target = 'docs/testing/glm-coverage-work-queue.json'
const serialized = `${JSON.stringify(output, null, 2)}\n`
const mode = process.argv[2]
assert(
  mode === undefined || mode === '--check',
  'Usage: node docs/testing/glm-coverage-queue-census.mjs [--check]',
)
if (mode === '--check') {
  // Formatting-only differences (Biome) are irrelevant to the derived artifact.
  assert.deepEqual(JSON.parse(read(target)), output, 'Planning inventory is stale')
} else {
  writeFileSync(resolve(root, target), serialized)
}
console.log(
  JSON.stringify({
    mode: mode ?? 'generate',
    files: inventory.length,
    futureBatches: batches.length - 1,
    futureModules: assignments.size - 11,
    routes,
  }),
)
