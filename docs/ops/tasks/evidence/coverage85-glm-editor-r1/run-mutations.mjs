#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
/**
 * TEST-COVERAGE85-GLM-EDITOR-1 反控取证脚本（r1 返工版）。
 * 对每个注入点执行 原始绿→变异红→恢复绿 三态，落盘：
 * command/cwd、raw stdout(JSON reporter)、exit code、失败 file×fullName、
 * 唯一业务 AssertionError 差异、original/mutant/restored sha256、清理证明（git diff 空）。
 * 只动产品源做临时变异，结束一律 git checkout 恢复；脚本本身不改任何产品文件。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const editorDir = resolve(repo, 'packages/editor')
const outDir = resolve(repo, 'docs/ops/tasks/evidence/coverage85-glm-editor-r1')
mkdirSync(outDir, { recursive: true })

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

const run = (command, args, cwd) => {
  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    return { stdout, exitCode: 0, signal: null }
  } catch (error) {
    return {
      stdout: String(error.stdout ?? ''),
      stderr: String(error.stderr ?? ''),
      exitCode: error.status ?? 1,
      signal: error.signal ?? null,
    }
  }
}

const INJECTIONS = [
  {
    id: 'INJ-1',
    file: 'src/core/world-sprite-behavior.ts',
    anchor: 'if (percent >= 100) return true',
    mutant: 'if (percent > 100) return true',
    testFile: 'src/core/world-sprite-behavior.cov85-sampler.test.ts',
    testName: 'chance 100% 恒命中：then 臂定格帧',
    businessClaim: 'chance>=100 必走 then 臂：命中帧 #5 而非 else 帧 #6',
  },
  {
    id: 'INJ-2',
    file: 'src/core/script-editor.ts',
    anchor: "id.startsWith('/') || id.endsWith('/')",
    mutant: "id.endsWith('/')",
    testFile: 'src/core/script-editor.cov85-residual.test.ts',
    testName: 'id 卫',
    businessClaim: '前导斜杠 ScriptId 必须被精确拒绝（ScriptId 非法 /lead）',
  },
  {
    id: 'INJ-3',
    file: 'src/ui/ItemTab.tsx',
    anchor: "case 'maxPool':\n      return { kind, pool: 'hp', delta: 50 }",
    mutant: "case 'maxPool':\n      return { kind, pool: 'hp', delta: 25 }",
    testFile: 'src/ui/ItemTab.cov85.test.tsx',
    testName: '上限加成',
    businessClaim: '装备效果切到 maxPool 的缺省体是 delta 50（pool hp）',
  },
  {
    id: 'INJ-4',
    file: 'src/ui/SkillTab.tsx',
    anchor:
      '? EFFECT_KINDS.filter((kind) => ENEMY_RUNTIME_SKILL_EFFECT_KINDS.includes(kind.v as never))\n      : EFFECT_KINDS',
    mutant: '? EFFECT_KINDS\n      : EFFECT_KINDS',
    testFile: 'src/ui/SkillTab.cov85.test.tsx',
    testName: '敌方施法分支',
    businessClaim: '敌方分支效果类型选项数 = ENEMY_RUNTIME_SKILL_EFFECT_KINDS 白名单长度',
  },
  {
    id: 'INJ-6',
    file: 'src/ui/MapMode.tsx',
    anchor:
      "if ((event.key === 'Delete' || event.key === 'Backspace') && selection.kind !== 'none') {",
    mutant:
      "if ((event.key === 'Delete' || event.key === 'Backspace') && selection.kind === 'never-delete') {",
    testFile: 'src/ui/MapMode.cov85.test.tsx',
    testName: 'C1 单选格→Delete 恰好删除该格瓦片并可 undo 恢复',
    businessClaim: 'select 工具单选产生 cells 选区，Delete 必须触发 deleteMapSelection 提交',
  },
  {
    id: 'INJ-7',
    file: 'src/ui/scene-stage.ts',
    anchor: 'setErr(e instanceof Error ? e.message : String(e))',
    mutant: "setErr('')",
    testFile: 'src/ui/PreviewCanvas.cov85.test.tsx',
    testName: 'P1 瓦片集字节被真实拒绝 → 资产读取失败回显资源路径',
    businessClaim: '资产读取异常必须以 err 文本回显（清空 err 将丢失失败可见性）',
  },
  {
    id: 'INJ-5',
    file: 'src/ui/App.tsx',
    anchor: '                              : 15,\n',
    mutant: '                              : 16,\n',
    testFile: 'src/ui/App.cov85.test.tsx',
    testName: 'hide/suspend',
    businessClaim: '逃跑后从 remain 切回 suspend 落缺省 ticks 15（非 suspend 现值不存在时）',
  },
]

const results = []
for (const injection of INJECTIONS) {
  const absolute = resolve(editorDir, injection.file)
  const originalHash = sha256(absolute)
  const entry = {
    ...injection,
    cwd: editorDir,
    commandTemplate: `pnpm exec vitest run <testFile> -t <testName> --reporter=json`,
    phases: {},
  }

  const vitestArgs = [
    'exec',
    'vitest',
    'run',
    injection.testFile,
    '-t',
    injection.testName,
    '--reporter=json',
  ]
  // credited execution set 只认 passed/failed；-t 过滤产生的 skipped/pending 不是执行身份。
  const runPhase = (phase) => {
    const result = run('pnpm', vitestArgs, editorDir)
    const failures = []
    const executedSet = []
    let passed = 0
    let skipped = 0
    let reportParsed = false
    try {
      const report = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')))
      reportParsed = true
      for (const file of report.testResults ?? []) {
        const relative = file.name.split('/type-pal-cov85-editor/')[1]
        for (const assertion of file.assertionResults ?? []) {
          if (assertion.status === 'skipped' || assertion.status === 'pending') {
            skipped += 1
            continue
          }
          executedSet.push({
            file: relative,
            fullName: assertion.fullName,
            status: assertion.status,
          })
          if (assertion.status === 'failed')
            failures.push({
              file: relative,
              fullName: assertion.fullName,
              messages: assertion.failureMessages?.slice(0, 1),
            })
          if (assertion.status === 'passed') passed += 1
        }
      }
    } catch {
      /* JSON 解析失败时保留 raw */
    }
    entry.phases[phase] = {
      spawn: { command: 'pnpm', args: vitestArgs, cwd: editorDir },
      exitCode: result.exitCode,
      signal: result.signal,
      reportParsed,
      executedSet,
      executedCount: executedSet.length,
      skippedExcluded: skipped,
      passed,
      failures,
      rawStdout: result.stdout ?? '',
      rawStderr: result.stderr ?? '',
    }
    return { exitCode: result.exitCode, failures, passed }
  }

  // 原始态：必须绿
  const baseline = runPhase('original')
  // 变异态
  const source = readFileSync(absolute, 'utf8')
  const occurrences = source.split(injection.anchor).length - 1
  if (occurrences !== 1) throw new Error(`${injection.id} anchor 不是唯一（${occurrences}）`)
  writeFileSync(absolute, source.replace(injection.anchor, injection.mutant))
  const mutantHash = sha256(absolute)
  const mutated = runPhase('mutant')
  // 恢复位
  run('git', ['checkout', '--', `packages/editor/${injection.file}`], repo)
  const restoredHash = sha256(absolute)
  const restored = runPhase('restored')

  // 清理证明只针对被变异的产品文件：恢复后该文件无未提交改动 + hash 回到原值。
  const cleanCheck = run(
    'git',
    ['status', '--porcelain', '--', `packages/editor/${injection.file}`],
    repo,
  )
  entry.cleanup = {
    command: `git status --porcelain -- packages/editor/${injection.file}`,
    cwd: repo,
    gitStatusPorcelainMutatedFile: cleanCheck.stdout.trim(),
    restoredEqualsOriginal: restoredHash === originalHash,
    mutatedFileRestored: cleanCheck.stdout.trim().length === 0,
  }
  entry.verdict = {
    originalGreen: baseline.exitCode === 0 && baseline.passed > 0,
    mutantRed: mutated.exitCode !== 0 && mutated.failures.length > 0,
    restoredGreen: restored.exitCode === 0 && restored.passed > 0,
    hashTriple: { original: originalHash, mutant: mutantHash, restored: restoredHash },
    uniqueAssertion:
      mutated.failures[0]?.messages?.[0]?.split('\n').find((line) => line.includes('expected')) ??
      null,
  }
  results.push(entry)
}

writeFileSync(resolve(outDir, 'mutation-evidence.json'), `${JSON.stringify(results, null, 2)}\n`)
const summary = results.map(
  (r) =>
    `${r.id} ${r.verdict.originalGreen && r.verdict.mutantRed && r.verdict.restoredGreen && r.cleanup.restoredEqualsOriginal && r.cleanup.mutatedFileRestored ? 'OK' : 'BAD'} ${r.file}`,
)
console.log(summary.join('\n'))
