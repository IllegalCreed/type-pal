/** TEST-GLM-LEAF-WORKFLOWS-1 · A–D 局部覆盖对照（batch D 里程碑）。
 * 同源码同口径两次 editor 全包 coverage：before 排除 13 个 glm-leaf-wave 新测试，after 全量。
 * include/exclude 与 scripts/coverage/config.mjs 的 official 口径一致；只写 /tmp 报告，不动基线。
 * 用法：node coverage-delta.mjs
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const editorRoot = resolve(root, 'packages/editor')
const output = mkdtempSync(join(tmpdir(), 'glm-leaf-coverage-'))
const editorRequire = createRequire(join(editorRoot, 'package.json'))
const reactPluginPath = editorRequire.resolve('@vitejs/plugin-react')

const newTests = [
  'src/ui/design-system/select.glm-leaf-wave.test.tsx',
  'src/ui/design-system/multi-select.glm-leaf-wave.test.tsx',
  'src/ui/design-system/number-inputs.glm-leaf-wave.test.tsx',
  'src/ui/design-system/list-header.glm-leaf-wave.test.tsx',
  'src/ui/design-system/media.glm-leaf-wave.test.tsx',
  'src/ui/design-system/navigation.glm-leaf-wave.test.tsx',
  'src/ui/design-system/virtual-list.glm-leaf-wave.test.tsx',
  'src/ui/design-system/reorder.glm-leaf-wave.test.tsx',
  'src/ui/design-system/overlays.glm-leaf-wave.test.tsx',
  'src/ui/ImageAssetPicker.glm-leaf-wave.test.tsx',
  'src/ui/MusicPicker.glm-leaf-wave.test.tsx',
  'src/ui/SoundPicker.glm-leaf-wave.test.tsx',
  'src/ui/PortraitEditor.glm-leaf-wave.test.tsx',
  'src/ui/ProjectAudioPreviewButton.glm-leaf-wave.test.tsx',
  'src/ui/PanelResizeHandle.glm-leaf-wave.test.tsx',
  'src/ui/IsometricEditorToolbar.glm-leaf-wave.test.tsx',
  'src/ui/editor-target.glm-leaf-wave.test.ts',
  'src/ui/map-selection-overlay.glm-leaf-wave.test.ts',
  'src/ui/MapSelectionInspector.glm-leaf-wave.test.tsx',
  'src/ui/StampPlacementSelectionInspector.glm-leaf-wave.test.tsx',
  'src/ui/StampContentEditor.glm-leaf-wave.test.tsx',
  'src/ui/StampTemplateDialog.glm-leaf-wave.test.tsx',
  'src/ui/PoisonTab.glm-leaf-wave.test.tsx',
  'src/ui/VarsTab.glm-leaf-wave.test.tsx',
  'src/ui/ShopTab.glm-leaf-wave.test.tsx',
  'src/ui/ItemAlchemyTab.glm-leaf-wave.test.tsx',
  'src/ui/BattleFieldTab.glm-leaf-wave.test.tsx',
  'src/ui/CasualtyEditor.glm-leaf-wave.test.tsx',
  'src/ui/ScriptSceneHookInspector.glm-leaf-wave.test.tsx',
  'src/ui/ScriptBehaviorInspector.glm-leaf-wave.test.tsx',
  'src/ui/enemy-defeated-events.glm-leaf-wave.test.ts',
  'src/core/asset-diagnostics.glm-leaf-wave.test.ts',
  'src/core/command-asset-record.glm-leaf-wave.test.ts',
  'src/core/item-references.glm-leaf-wave.test.ts',
  'src/core/script-references.glm-leaf-wave.test.ts',
  'src/core/stamp-placement.glm-leaf-wave.test.ts',
]

const contentNewTests = [
  'src/frame-sequence.glm-leaf-wave.test.ts',
  'src/script-library.glm-leaf-wave.test.ts',
  'src/world-variable.glm-leaf-wave.test.ts',
  'src/stamp.glm-leaf-wave.test.ts',
  'src/migration-diagnostic.glm-leaf-wave.test.ts',
  'src/map-index.glm-leaf-wave.test.ts',
  'src/tileset.glm-leaf-wave.test.ts',
]

// 与 scripts/coverage/config.mjs 的 official fast 口径一致：
// coverage.exclude（报告面）+ fastTestGlobs/coverageTestExcludes（fast 测试选择）。
const reportExcludes = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.d.ts',
]
const fastTestExcludes = [
  '**/*.pal.test.js',
  '**/*.pal.test.jsx',
  '**/*.pal.test.ts',
  '**/*.pal.test.tsx',
  '**/*.pal.test.mjs',
  '**/*.pal.test.mts',
  '**/*.pal.test.cjs',
  '**/*.pal.test.cts',
  'src/ui/design-system/*-adoption.test.ts',
  'src/ui/design-system/adoption.test.ts',
  'src/ui/design-system/boundary.test.ts',
  'src/ui/design-system/field-commit-boundary.test.ts',
]

function runBatch(label, packageRoot, extraExcludes, withReactPlugin) {
  const pluginImport = withReactPlugin
    ? `plugins: (await import(${JSON.stringify(pathToFileURL(reactPluginPath).href)})).default(),`
    : ''
  const config = join(output, `${label}.config.mjs`)
  writeFileSync(
    config,
    `export default {
  root: ${JSON.stringify(packageRoot)},
  ${pluginImport}
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ${JSON.stringify(reportExcludes)},
      reporter: ['json-summary'],
      reportsDirectory: ${JSON.stringify(join(output, label))},
    },
    exclude: ${JSON.stringify([
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      ...fastTestExcludes,
      ...extraExcludes,
    ])},
    maxWorkers: 2,
  },
};
`,
  )
  const run = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', '--coverage', '--config', config, '--reporter=dot'],
    { cwd: packageRoot, encoding: 'utf8', env: { ...process.env, NODE_COMPILE_CACHE: '' } },
  )
  writeFileSync(join(output, `${label}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  if (run.status !== 0) throw new Error(`${label} exited ${run.status}`)
  return JSON.parse(readFileSync(join(output, label, 'coverage-summary.json'), 'utf8'))
}

const ehFiles = [
  'src/ui/PoisonTab.glm-leaf-wave.test.tsx',
  'src/ui/VarsTab.glm-leaf-wave.test.tsx',
  'src/ui/ShopTab.glm-leaf-wave.test.tsx',
  'src/ui/ItemAlchemyTab.glm-leaf-wave.test.tsx',
  'src/ui/BattleFieldTab.glm-leaf-wave.test.tsx',
  'src/ui/CasualtyEditor.glm-leaf-wave.test.tsx',
  'src/ui/ScriptSceneHookInspector.glm-leaf-wave.test.tsx',
  'src/ui/ScriptBehaviorInspector.glm-leaf-wave.test.tsx',
  'src/ui/enemy-defeated-events.glm-leaf-wave.test.ts',
  'src/core/asset-diagnostics.glm-leaf-wave.test.ts',
  'src/core/command-asset-record.glm-leaf-wave.test.ts',
  'src/core/item-references.glm-leaf-wave.test.ts',
  'src/core/script-references.glm-leaf-wave.test.ts',
  'src/core/stamp-placement.glm-leaf-wave.test.ts',
]

const globFor = (file) => `**/${file.split('/').at(-1)}`

// editor: before（排除全部新测试）/ ad（A–D 在，E–H 排除）/ after（全量）。
const beforeEditor = runBatch('before-editor', editorRoot, newTests.map(globFor), true)
const adEditor = runBatch('ad-editor', editorRoot, ehFiles.map(globFor), true)
const afterEditor = runBatch('after-editor', editorRoot, [], true)

// content: before/after（7 个 H 批新测试文件）。
const contentRoot = resolve(root, 'packages/content')
const beforeContent = runBatch('before-content', contentRoot, contentNewTests.map(globFor), false)
const afterContent = runBatch('after-content', contentRoot, [], false)

function delta(beforeEntry, afterEntry) {
  return {
    lines: {
      before: beforeEntry.lines,
      after: afterEntry.lines,
      coveredDelta: afterEntry.lines.covered - beforeEntry.lines.covered,
    },
    branches: {
      before: beforeEntry.branches,
      after: afterEntry.branches,
      coveredDelta: afterEntry.branches.covered - beforeEntry.branches.covered,
    },
  }
}

const improvedRows = []
for (const [file, afterEntry] of Object.entries(afterEditor)) {
  if (file === 'total') continue
  const beforePct = beforeEditor[file]?.lines.pct ?? 0
  const deltaPct = Number((afterEntry.lines.pct - beforePct).toFixed(2))
  if (deltaPct > 0)
    improvedRows.push({
      file: file.replace(`${editorRoot}/`, ''),
      before: beforePct,
      after: afterEntry.lines.pct,
      delta: deltaPct,
    })
}
improvedRows.sort((left, right) => right.delta - left.delta)

const result = {
  editor: {
    adVsBefore: delta(beforeEditor.total, adEditor.total),
    ehIncrement: delta(adEditor.total, afterEditor.total),
    union: delta(beforeEditor.total, afterEditor.total),
    testCounts: {
      before: beforeEditor.total,
      note: 'testCounts 为覆盖 summary 的行分母，不是用例数；用例数见各 log。',
    },
  },
  content: {
    beforeVsAfter: delta(beforeContent.total, afterContent.total),
  },
  improvedFiles: improvedRows.slice(0, 40),
  outputDir: output,
}
writeFileSync('/tmp/glm-leaf-A-H-coverage-delta.json', `${JSON.stringify(result, null, 2)}\n`)
console.log(
  `editor lines ${beforeEditor.total.lines.pct}% -> ${afterEditor.total.lines.pct}% ` +
    `(+${afterEditor.total.lines.covered - beforeEditor.total.lines.covered}); ` +
    `A–D +${adEditor.total.lines.covered - beforeEditor.total.lines.covered}; ` +
    `E–H +${afterEditor.total.lines.covered - adEditor.total.lines.covered}`,
)
console.log(
  `editor branches ${beforeEditor.total.branches.pct}% -> ${afterEditor.total.branches.pct}% ` +
    `(+${afterEditor.total.branches.covered - beforeEditor.total.branches.covered}); ` +
    `A–D +${adEditor.total.branches.covered - beforeEditor.total.branches.covered}; ` +
    `E–H +${afterEditor.total.branches.covered - adEditor.total.branches.covered}`,
)
console.log(
  `content lines ${beforeContent.total.lines.pct}% -> ${afterContent.total.lines.pct}% ` +
    `(+${afterContent.total.lines.covered - beforeContent.total.lines.covered}); ` +
    `branches ${beforeContent.total.branches.pct}% -> ${afterContent.total.branches.pct}% ` +
    `(+${afterContent.total.branches.covered - beforeContent.total.branches.covered})`,
)
console.log(
  `improved editor files: ${improvedRows.length} (top rows in /tmp/glm-leaf-A-H-coverage-delta.json)`,
)
