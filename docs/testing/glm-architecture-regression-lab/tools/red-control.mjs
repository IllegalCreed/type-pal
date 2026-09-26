/**
 * ARCH-REGRESSION-LAB-GLM-1 负控 runner v2：对五个已钉合同各做单点 Vite load 破坏并核判据。
 * 用法：node docs/testing/glm-architecture-regression-lab/tools/red-control.mjs
 *
 * 判据（每针独立）：恰 exit1；目标测试实际执行；失败首行为业务 AssertionError；
 * 注入见证（LAB_RED_MUTATION_APPLIED）命中；拒绝 0 执行/超时/普通 Error；产品 hash 前后不变。
 *
 * 三针（各自鉴别力）：
 * - lab-startup：UpdateProjectMapLayerCommand.apply 早退 → 启动小样业务实变断言红；
 * - g05-unmount-cleanup：删 SceneScriptWorkspace 卸载 cleanup（return () => playback.stop()）
 *   → G05-04「同实例卸载前后 stop 增量」断言红（生产启动即 stop 不再掩蔽）；
 * - g03-committed：author-save-journal 最终 publishState 由 'committed' 降为 'data-complete'
 *   → G03-03「save-state phase=committed 事务终态」断言红（写盘照常、仅终态缺失）；
 * - g05-immediate-wait：宿主 wait 的 timers.push 改立即 resolve
 *   → G05-02「全量冲刷后流仍停在 wait」断言红（旧等待从未真正挂起即暴露）；
 * - g08-ignore-roots：图根从 [...graphRoots, ...globalRoots] 改为 [...graphRoots]
 *   → G08-06「ownership global=1/unreachable=2」断言红（globalRoots 不进图根即退回无根形态）；
 * - g08-drop-sprite：translate-events.ts 0x65 的 push({setActorSprite}) 改为空块
 *   → G08-07「chunk 内 setActorSprite 精确命令体」断言红（成功路径吞命令即暴露）。
 *
 * 临时目录放系统 /tmp：不污染仓内工作树与 Biome 扫描。
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const labRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const repoRoot = resolve(labRoot, '../../..')

/** 单点破坏锚：类声明 → 该类 apply 签名（泛化 apply 签名有 87 处不可作锚）。 */
function startupMutation(productSrc) {
  const classDecl = 'export class UpdateProjectMapLayerCommand implements Command {'
  const applySig = '  apply(state: EditorState): EditorState {'
  const classIdx = productSrc.indexOf(classDecl)
  if (classIdx === -1) throw new Error('class declaration not found')
  const applyIdx = productSrc.indexOf(applySig, classIdx)
  if (applyIdx === -1) throw new Error('apply signature not found in class')
  const from = productSrc.slice(classIdx, applyIdx + applySig.length)
  const to = `${from} if (this.patch.name !== undefined) return state`
  return { from, to, log: 'LAB_RED_MUTATION_APPLIED UpdateProjectMapLayerCommand.apply' }
}

const needles = [
  {
    id: 'lab-startup',
    productAbs: resolve(repoRoot, 'packages/editor/src/core/commands.ts'),
    targetAbs: resolve(labRoot, 'diagnostics/lab-startup-red.test.tsx'),
    expectExecuted: 1,
    buildMutation: startupMutation,
  },
  {
    id: 'g05-unmount-cleanup',
    productAbs: resolve(repoRoot, 'packages/editor/src/ui/SceneScriptWorkspace.tsx'),
    targetAbs: resolve(labRoot, 'candidates/editor/g05-playback-scope.test.tsx'),
    expectExecuted: 4,
    buildMutation: () => {
      const from = '    return () => playback.stop()\n  }, [playback])'
      const to = '  }, [playback])'
      return { from, to, log: 'LAB_RED_MUTATION_APPLIED SceneScriptWorkspace unmount cleanup' }
    },
  },
  {
    id: 'g03-committed',
    productAbs: resolve(repoRoot, 'packages/editor/src/core/author-save-journal.ts'),
    targetAbs: resolve(labRoot, 'candidates/editor/g03-app-lifecycle.test.tsx'),
    expectExecuted: 3,
    buildMutation: () => {
      const from = "await publishState(receipt, 'committed')"
      const to = "await publishState(receipt, 'data-complete')"
      return { from, to, log: 'LAB_RED_MUTATION_APPLIED save-state final phase' }
    },
  },
  {
    // 宿主 wait 立即完成（timers.push 改立即 resolve）→ G05-02「全量冲刷后流仍停在 wait」红
    id: 'g05-immediate-wait',
    productAbs: resolve(repoRoot, 'packages/editor/src/core/playback.ts'),
    targetAbs: resolve(labRoot, 'candidates/editor/g05-playback-scope.test.tsx'),
    expectExecuted: 4,
    buildMutation: () => {
      const from = `    wait: (ms) =>
      new Promise<void>((resolve) => {
        this.timers.push({ left: ms, resolve })
      }),`
      const to = `    wait: (ms) =>
      new Promise<void>((resolve) => {
        resolve()
      }),`
      return { from, to, log: 'LAB_RED_MUTATION_APPLIED Playback host wait immediate resolve' }
    },
  },
  {
    // 丢输出反控：0x65 的 setActorSprite push 被置空 → G08-07「chunk 内精确命令体」红
    id: 'g08-drop-sprite',
    productAbs: resolve(repoRoot, 'packages/migrate/src/translate-events.ts'),
    targetAbs: resolve(labRoot, 'candidates/migrate/g08-conversion-isolation.test.ts'),
    expectExecuted: 6,
    buildMutation: () => {
      const from = "if (actor && sprite) push({ kind: 'setActorSprite', actor, sprite })"
      const to = 'if (actor && sprite) { /* r10 needle: dropped */ }'
      return { from, to, log: 'LAB_RED_MUTATION_APPLIED drop setActorSprite output' }
    },
  },
  {
    // 图根忽略 globalRoots → G08-06「ownership global=1/unreachable=2」红（退回无根形态）
    id: 'g08-ignore-roots',
    productAbs: resolve(repoRoot, 'packages/migrate/src/migrate-content.ts'),
    targetAbs: resolve(labRoot, 'candidates/migrate/g08-conversion-isolation.test.ts'),
    expectExecuted: 6,
    buildMutation: () => {
      const from = 'const roots = [...graphRoots, ...globalRoots]'
      const to = 'const roots = [...graphRoots]'
      return { from, to, log: 'LAB_RED_MUTATION_APPLIED graph roots ignore globalRoots' }
    },
  },
]

const results = []
let overall = true

for (const needle of needles) {
  const productBefore = createHash('sha256').update(readFileSync(needle.productAbs)).digest('hex')
  const productSrc = readFileSync(needle.productAbs, 'utf8')
  const { from, to, log } = needle.buildMutation(productSrc)
  if (productSrc.split(from).length !== 2) throw new Error(`[${needle.id}] anchor not unique`)

  // 临时目录放系统 /tmp：不污染仓内工作树与 Biome 扫描（r5 起纪律）
  const config = mkdtempSync(join(tmpdir(), 'glm-lab-red-'))
  const configFile = join(config, 'red.config.mts')
  const generated = `import { createRequire } from 'node:module'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const requireFromRepo = createRequire(${JSON.stringify(join(repoRoot, 'package.json'))})
const { defineConfig } = await import(requireFromRepo.resolve('vitest/config'))
const labRoot = ${JSON.stringify(labRoot)}
const editorRoot = path.resolve(labRoot, '../../../packages/editor')
const editorRequire = createRequire(path.resolve(editorRoot, 'package.json'))
const react = editorRequire('@vitejs/plugin-react')
const w = (p) => path.resolve(labRoot, '../../../', p)
const productAbs = ${JSON.stringify(needle.productAbs)}
const targetAbs = ${JSON.stringify(needle.targetAbs)}
const mutationFrom = ${JSON.stringify(from)}
const mutationTo = ${JSON.stringify(to)}
export default defineConfig({
  root: editorRoot,
  plugins: [
    react(),
    { name: 'lab-red-single-point', enforce: 'pre', load(id) {
      if (id.split('?')[0] === productAbs) {
        const src = readFileSync(id, 'utf8')
        assert.equal(src.split(mutationFrom).length, 2, 'unique source point')
        console.log(${JSON.stringify(log)})
        return src.replace(mutationFrom, mutationTo)
      }
      if (id.split('?')[0] === targetAbs) return readFileSync(id, 'utf8')
    } },
  ],
  resolve: { alias: [
    { find: '@type-pal/reforge/entity-action-player', replacement: w('packages/reforge/src/entity-action-player.ts') },
    { find: '@type-pal/reforge/script-compiler-core', replacement: w('packages/reforge/src/script-compiler-core.ts') },
    { find: '@type-pal/reforge', replacement: w('packages/reforge/src/index.ts') },
    { find: '@type-pal/content', replacement: w('packages/content/src/index.ts') },
    { find: '@type-pal/shared', replacement: w('packages/shared/src/index.ts') },
    { find: '@lab/editor/edit-session', replacement: path.resolve(editorRoot, 'src/core/edit-session.ts') },
    { find: '@lab/editor/commands', replacement: path.resolve(editorRoot, 'src/core/commands.ts') },
    { find: '@lab/editor/map-mode', replacement: path.resolve(editorRoot, 'src/ui/MapMode.tsx') },
    { find: '@lab/editor/app', replacement: path.resolve(editorRoot, 'src/ui/App.tsx') },
    { find: '@lab/editor/scene-script-workspace', replacement: path.resolve(editorRoot, 'src/ui/SceneScriptWorkspace.tsx') },
    { find: '@lab/editor/scene-canvas', replacement: path.resolve(editorRoot, 'src/ui/SceneCanvas.tsx') },
    { find: '@lab/editor/playback', replacement: path.resolve(editorRoot, 'src/core/playback.ts') },
    { find: '@lab/editor/history-coordinator', replacement: path.resolve(editorRoot, 'src/core/editor-history-coordinator.ts') },
    { find: '@lab/editor/script-editor', replacement: path.resolve(editorRoot, 'src/core/script-editor.ts') },
    { find: '@lab/editor/script-editor-projection', replacement: path.resolve(editorRoot, 'src/core/script-editor-projection.ts') },
    { find: '@lab/editor/project-io', replacement: path.resolve(editorRoot, 'src/core/project-io.ts') },
    { find: '@lab/editor/seed', replacement: path.resolve(editorRoot, 'src/core/seed.ts') },
    { find: '@lab/editor/open-actions', replacement: path.resolve(editorRoot, 'src/core/open-actions.ts') },
    { find: '@lab/editor/author-save-store', replacement: path.resolve(editorRoot, 'src/core/author-save-store.ts') },
    { find: '@lab/editor/handle-store', replacement: path.resolve(editorRoot, 'src/core/handle-store.ts') },
    { find: '@lab/fixtures/author-save-fixture', replacement: path.resolve(editorRoot, 'src/core/__tests__/author-save-fixture.ts') },
    { find: '@lab/fixtures/author-save-store-fixture', replacement: path.resolve(editorRoot, 'src/core/__tests__/author-save-store-fixture.ts') },
    { find: '@lab/migrate/migrate-content', replacement: w('packages/migrate/src/migrate-content.ts') },
    { find: '@lab/migrate/source-facts', replacement: w('packages/migrate/src/source-facts.ts') },
    { find: /^react-dom\\/client$/, replacement: path.resolve(editorRoot, 'node_modules/react-dom/client.js') },
    { find: /^react-dom$/, replacement: path.resolve(editorRoot, 'node_modules/react-dom/index.js') },
    { find: /^react$/, replacement: path.resolve(editorRoot, 'node_modules/react/index.js') },
    { find: /^react\\/jsx-runtime$/, replacement: path.resolve(editorRoot, 'node_modules/react/jsx-runtime.js') },
    { find: /^react\\/jsx-dev-runtime$/, replacement: path.resolve(editorRoot, 'node_modules/react/jsx-dev-runtime.js') },
  ] },
  test: { environment: 'jsdom', include: [targetAbs], maxWorkers: 1 },
})
`
  writeFileSync(configFile, generated)

  const run = spawnSync(
    'npx',
    [
      'vitest',
      'run',
      '--config',
      configFile,
      '--reporter=json',
      '--outputFile',
      join(config, 'red.json'),
    ],
    { cwd: repoRoot, encoding: 'utf8', timeout: 240_000, maxBuffer: 32 * 1024 * 1024 },
  )
  const stdout = (run.stdout ?? '') + (run.stderr ?? '')
  writeFileSync(join(config, 'red.log'), stdout)

  const verdicts = { witnesses: 0, executed: 0, failed: 0, firstLine: '', exit: run.status }
  for (const _m of stdout.matchAll(/LAB_RED_MUTATION_APPLIED/g)) verdicts.witnesses += 1
  try {
    const report = JSON.parse(readFileSync(join(config, 'red.json'), 'utf8'))
    const assertions = report.testResults.flatMap((s) => s.assertionResults ?? [])
    verdicts.executed = assertions.filter((a) => a.status !== 'skipped').length
    const failed = assertions.filter((a) => a.status === 'failed')
    verdicts.failed = failed.length
    verdicts.firstLine = (failed[0]?.failureMessages?.[0] ?? '').split('\n', 1)[0] ?? ''
  } catch {
    verdicts.firstLine = 'NO_REPORT'
  }

  const productAfter = createHash('sha256').update(readFileSync(needle.productAbs)).digest('hex')
  const ok =
    run.status === 1 &&
    verdicts.witnesses > 0 &&
    verdicts.executed === needle.expectExecuted &&
    verdicts.failed === 1 &&
    /^AssertionError/.test(verdicts.firstLine) &&
    !/timed out|waitFor/i.test(verdicts.firstLine) &&
    productBefore === productAfter

  results.push({ id: needle.id, verdict: ok ? 'detected' : 'invalid', ...verdicts })
  if (!ok) overall = false
}

console.log(
  JSON.stringify(
    {
      verdict: overall ? 'detected' : 'invalid',
      needles: results,
    },
    null,
    2,
  ),
)
process.exit(overall ? 0 : 1)
