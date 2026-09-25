/**
 * ARCH-REGRESSION-LAB-GLM-1 负控 runner：对诊断红例做单点 Vite load 破坏并核判据。
 * 用法：node docs/testing/glm-architecture-regression-lab/tools/red-control.mjs
 * 判据（复用架构队列严格纪律）：恰 exit1；钉名测试实际执行；失败首行为业务 AssertionError；
 * 注入见证（LAB_RED_MUTATION_APPLIED）命中；拒绝 0 执行/超时/普通 Error；产品 hash 前后不变。
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const labRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const repoRoot = resolve(labRoot, '../../..')
const targetAbs = resolve(labRoot, 'diagnostics/lab-startup-red.test.tsx')
const productAbs = resolve(repoRoot, 'packages/editor/src/core/commands.ts')

const before = createHash('sha256').update(readFileSync(productAbs)).digest('hex')

// 唯一锚：类声明 → 该类 apply 签名（全文件唯一；泛化 apply 签名有 87 处不可作锚）
const productSrc = readFileSync(productAbs, 'utf8')
const classDecl = 'export class UpdateProjectMapLayerCommand implements Command {'
const applySig = '  apply(state: EditorState): EditorState {'
const classIdx = productSrc.indexOf(classDecl)
if (classIdx === -1) throw new Error('class declaration not found')
const applyIdx = productSrc.indexOf(applySig, classIdx)
if (applyIdx === -1) throw new Error('apply signature not found in class')
const mutationFrom = productSrc.slice(classIdx, applyIdx + applySig.length)
const mutationTo = `${mutationFrom} if (this.patch.name !== undefined) return state`
if (productSrc.split(mutationFrom).length !== 2) throw new Error('anchor not unique')

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
globalThis.__LAB_STARTUP_RED_MUTATION__ = true
const productAbs = ${JSON.stringify(productAbs)}
const targetAbs = ${JSON.stringify(targetAbs)}
const mutationFrom = ${JSON.stringify(mutationFrom)}
const mutationTo = ${JSON.stringify(mutationTo)}
export default defineConfig({
  root: editorRoot,
  plugins: [
    react(),
    { name: 'lab-red-single-point', enforce: 'pre', load(id) {
      if (id.split('?')[0] === productAbs) {
        const src = readFileSync(id, 'utf8')
        assert.equal(src.split(mutationFrom).length, 2, 'unique source point')
        console.log('LAB_RED_MUTATION_APPLIED UpdateProjectMapLayerCommand.apply')
        return src.replace(mutationFrom, mutationTo)
      }
      if (id.split('?')[0] === targetAbs) return readFileSync(id, 'utf8')
    } },
  ],
  resolve: { alias: [
    { find: '@type-pal/reforge', replacement: w('packages/reforge/src/index.ts') },
    { find: '@type-pal/content', replacement: w('packages/content/src/index.ts') },
    { find: '@type-pal/shared', replacement: w('packages/shared/src/index.ts') },
    { find: '@lab/editor/edit-session', replacement: path.resolve(editorRoot, 'src/core/edit-session.ts') },
    { find: '@lab/editor/commands', replacement: path.resolve(editorRoot, 'src/core/commands.ts') },
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
  { cwd: repoRoot, encoding: 'utf8', timeout: 180_000, maxBuffer: 32 * 1024 * 1024 },
)
const log = (run.stdout ?? '') + (run.stderr ?? '')
writeFileSync(join(config, 'red.log'), log)

const verdicts = { witnesses: 0, executed: 0, failed: 0, firstLine: '', exit: run.status }
for (const _m of log.matchAll(/LAB_RED_MUTATION_APPLIED/g)) verdicts.witnesses += 1
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

const after = createHash('sha256').update(readFileSync(productAbs)).digest('hex')
const ok =
  run.status === 1 &&
  verdicts.witnesses > 0 &&
  verdicts.executed === 1 &&
  verdicts.failed === 1 &&
  /^AssertionError/.test(verdicts.firstLine) &&
  !/timed out|waitFor/i.test(verdicts.firstLine) &&
  before === after

console.log(
  JSON.stringify(
    {
      verdict: ok ? 'detected' : 'invalid',
      exit: run.status,
      ...verdicts,
      productHashUnchanged: before === after,
      evidence: config,
    },
    null,
    2,
  ),
)
process.exit(ok ? 0 : 1)
