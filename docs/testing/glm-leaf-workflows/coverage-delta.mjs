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

function runBatch(label, extraExcludes) {
  const config = join(output, `${label}.config.mjs`)
  writeFileSync(
    config,
    `export default {
  root: ${JSON.stringify(editorRoot)},
  plugins: (await import(${JSON.stringify(pathToFileURL(reactPluginPath).href)})).default(),
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
    { cwd: editorRoot, encoding: 'utf8', env: { ...process.env, NODE_COMPILE_CACHE: '' } },
  )
  writeFileSync(join(output, `${label}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  if (run.status !== 0) throw new Error(`${label} exited ${run.status}`)
  return JSON.parse(readFileSync(join(output, label, 'coverage-summary.json'), 'utf8'))
}

const before = runBatch(
  'before',
  newTests.map((file) => `**/${file.split('/').at(-1)}`),
)
const after = runBatch('after', [])

const rows = []
for (const [file, afterEntry] of Object.entries(after)) {
  if (file === 'total') continue
  const beforeEntry = before[file]
  const beforeLines = beforeEntry?.lines.pct ?? 0
  const delta = Number((afterEntry.lines.pct - beforeLines).toFixed(2))
  if (delta > 0)
    rows.push({
      file: file.replace(`${editorRoot}/`, ''),
      before: beforeLines,
      after: afterEntry.lines.pct,
      delta,
    })
}
rows.sort((left, right) => right.delta - left.delta)

const result = {
  beforeTotal: before.total.lines,
  afterTotal: after.total.lines,
  beforeBranches: before.total.branches,
  afterBranches: after.total.branches,
  improvedFiles: rows.slice(0, 40),
  outputDir: output,
}
writeFileSync('/tmp/glm-leaf-A-D-coverage-delta.json', `${JSON.stringify(result, null, 2)}\n`)
console.log(
  `lines ${(before.total.lines.pct).toFixed(2)}% -> ${(after.total.lines.pct).toFixed(2)}% ` +
    `(${before.total.lines.covered}/${before.total.lines.total} -> ${after.total.lines.covered}/${after.total.lines.total})`,
)
console.log(
  `branches ${(before.total.branches.pct).toFixed(2)}% -> ${(after.total.branches.pct).toFixed(2)}% ` +
    `(${before.total.branches.covered}/${before.total.branches.total} -> ${after.total.branches.covered}/${after.total.branches.total})`,
)
console.log(`improved files: ${rows.length} (top rows in /tmp/glm-leaf-A-D-coverage-delta.json)`)
