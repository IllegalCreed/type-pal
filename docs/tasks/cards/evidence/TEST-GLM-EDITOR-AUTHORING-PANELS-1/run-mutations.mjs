#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
/**
 * TEST-GLM-EDITOR-AUTHORING-PANELS-1 反控取证脚本。
 *
 * 对 13 个注入点自动执行三态验证：原始绿 → 指定业务变异红 → 恢复绿。
 * 每个注入点把「产品文件唯一锚点」替换为破坏对应合同的变异体，只跑该注入点定向测试
 * （vitest -t 全名过滤），随后原样恢复并复跑全套。落盘证据包含：spawn argv/cwd、JSON
 * reporter 原始输出摘录、exit code、失败用例 file×fullName、唯一业务 AssertionError、
 * 三态 sha256、执行集（排除 skipped）与产品文件 git-clean 证明。
 *
 * 运行：node docs/ops/tasks/evidence/TEST-GLM-EDITOR-AUTHORING-PANELS-1/run-mutations.mjs
 * 产物：同目录 mutation-evidence.json（JSON + 恰好一个末尾换行，可重复产出同形文件）。
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 本文件位于 docs/ops/tasks/evidence/TEST-GLM-EDITOR-AUTHORING-PANELS-1/，向上 5 级到仓库根。
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const editorRoot = join(repoRoot, 'packages/editor')
const vitestBin = join(repoRoot, 'node_modules/.bin/vitest')

const TEST_FILES = {
  pwt: 'src/ui/ProjectWorkbenchTab.glm-authoring.test.tsx',
  actor: 'src/ui/ActorMode.glm-authoring.test.tsx',
  cutscene: 'src/ui/CutsceneTab.glm-authoring.test.tsx',
}

const INJECTIONS = [
  {
    id: 'INJ-1',
    file: 'src/ui/ProjectWorkbenchTab.tsx',
    anchor:
      'patch({\n      seedConditions: Object.keys(seedConditions).length ? seedConditions : undefined,\n    })',
    mutant:
      'patch({\n      seedConditions: Object.keys(seedConditions).length ? seedConditions : {},\n    })',
    suite: 'pwt',
    testName: 'P1',
    contract: 'seedConditions 整键删除 → 变异为保留空对象 {}',
  },
  {
    id: 'INJ-2',
    file: 'src/ui/ProjectWorkbenchTab.tsx',
    anchor: 'if (focusObjectId === undefined) {',
    mutant: 'if (false) {',
    suite: 'pwt',
    testName: 'P3',
    contract: 'focus 清空回落直接启动入口 → 变异为不回落',
  },
  {
    id: 'INJ-3',
    file: 'src/ui/ProjectWorkbenchTab.tsx',
    anchor: 'setLocalSelectedId(focusObjectId)',
    mutant: 'setLocalSelectedId(localSelectedId)',
    suite: 'pwt',
    testName: 'P4',
    contract: '问题页 focus 入向选中分组 → 变异为同步 no-op',
  },
  {
    id: 'INJ-13',
    file: 'src/ui/ProjectWorkbenchTab.tsx',
    anchor: 'const needsRepair = !sameDsSerializableValue(rawCurrent, current)',
    mutant: 'const needsRepair = true',
    suite: 'pwt',
    testName: 'P2',
    contract: '零改动保存零命令 → 变异为恒需修复（无改动也派发命令）',
  },
  {
    id: 'INJ-4',
    file: 'src/ui/ActorMode.tsx',
    anchor: 'if (!id || !displayName || !actorDraft.spriteId) {',
    mutant: 'if (false) {',
    suite: 'actor',
    testName: 'A1',
    contract: '新建空字段守卫 → 变异为跳过守卫（空字段走命令层错误文案）',
  },
  {
    id: 'INJ-5',
    file: 'src/ui/ActorMode.tsx',
    anchor: 'sounds: Object.keys(sounds).length ? sounds : undefined',
    mutant: 'sounds: Object.keys(sounds).length ? sounds : {}',
    suite: 'actor',
    testName: 'A3',
    contract: 'battle sound 最后一键整键删除 → 变异为保留空对象 {}',
  },
  {
    id: 'INJ-6',
    file: 'src/ui/ActorMode.tsx',
    anchor: 'existingIndex !== index',
    mutant: 'false',
    suite: 'actor',
    testName: 'A5',
    contract: '每行选项排除其它行已用技能 → 变异为不排除（重复可选，选项集判别去重）',
  },
  {
    // no-op 抑制由 draft 边界与 number 边界双层持有：单层变异存活（实证），反控须同时变异两层。
    id: 'INJ-7',
    suite: 'actor',
    testName: 'A4',
    contract: '同值重提交 no-op 抑制（draft + number 双层真源） → 两层同时变异为恒派发',
    mutations: [
      {
        file: 'src/ui/design-system/draft-input-state.ts',
        anchor: 'next.value === canonicalValue ? true : onCommit(next.value)',
        mutant: 'onCommit(next.value)',
      },
      {
        file: 'src/ui/design-system/number-inputs.tsx',
        anchor: 'return normalized === value ? false : onCommit(normalized)',
        mutant: 'return onCommit(normalized)',
      },
    ],
  },
  {
    id: 'INJ-8',
    file: 'src/ui/CutsceneTab.tsx',
    anchor: 'const minutes = Math.floor(seconds / 60)',
    mutant: 'const minutes = 0',
    suite: 'cutscene',
    testName: 'C1',
    contract: '时长分钟支 M:SS.S → 变异为恒走秒支',
  },
  {
    id: 'INJ-9',
    file: 'src/ui/CutsceneTab.tsx',
    anchor: 'bytes[3] === 0xa3',
    mutant: 'bytes[3] === 0xa4',
    suite: 'cutscene',
    testName: 'C2',
    contract: 'webm EBML 魔数识别 → 变异为魔数永不匹配',
  },
  {
    id: 'INJ-10',
    file: 'src/ui/CutsceneTab.tsx',
    anchor: 'if (!selected && allEntries[0]) setSelectedId(allEntries[0].id)',
    mutant: 'if (false) setSelectedId(allEntries[0].id)',
    suite: 'cutscene',
    testName: 'C3',
    contract: 'stale selection 回落第一项 → 变异为不回落',
  },
  {
    id: 'INJ-11',
    file: 'src/ui/CutsceneTab.tsx',
    anchor: 'if (!frameEditorDirty) {',
    mutant: 'if (frameEditorDirty) {',
    suite: 'cutscene',
    testName: 'C4a',
    contract: '脏状态切换先弹放弃确认 → 变异为脏状态直接放行不弹窗',
  },
  {
    id: 'INJ-12',
    file: 'src/ui/CutsceneTab.tsx',
    anchor: 'if (objectUrl) URL.revokeObjectURL(objectUrl)',
    mutant: 'if (false) URL.revokeObjectURL(objectUrl)',
    suite: 'cutscene',
    testName: 'C5',
    contract: '卸载回收 objectURL → 变异为不回收',
  },
]

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function runVitest(args) {
  const result = spawnSync(vitestBin, args, { cwd: editorRoot, encoding: 'utf8', timeout: 300000 })
  if (result.error) throw new Error(`vitest spawn 失败：${result.error.message}`)
  return result
}

function parseJsonReport(stdout) {
  const start = stdout.indexOf('{')
  if (start < 0) return null
  try {
    return JSON.parse(stdout.slice(start))
  } catch {
    return null
  }
}

function collectSuites(report) {
  const rows = []
  for (const testResult of report?.testResults ?? []) {
    for (const assertion of testResult.assertionResults ?? []) {
      rows.push({
        file: testResult.name.replace(`${editorRoot}/`, ''),
        fullName: assertion.fullName,
        status: assertion.status,
      })
    }
  }
  return rows
}

function firstBusinessError(report, nameFragment) {
  for (const testResult of report?.testResults ?? []) {
    for (const assertion of testResult.assertionResults ?? []) {
      if (assertion.status === 'failed' && assertion.fullName.includes(nameFragment)) {
        const message = (assertion.failureMessages ?? [])[0] ?? assertion.message ?? ''
        const match = message.match(/AssertionError[^\n]*/)
        return {
          fullName: assertion.fullName,
          assertionError: match?.[0] ?? message.split('\n')[0],
        }
      }
    }
  }
  return null
}

const evidence = {
  card: 'TEST-GLM-EDITOR-AUTHORING-PANELS-1',
  generatedAt: new Date().toISOString(),
  command: `node docs/ops/tasks/evidence/TEST-GLM-EDITOR-AUTHORING-PANELS-1/run-mutations.mjs`,
  cwd: editorRoot,
  phases: { original: {}, restored: {} },
  injections: [],
}

// —— Phase A：原始绿（三套件全量）——
for (const [suite, file] of Object.entries(TEST_FILES)) {
  const run = runVitest(['run', file, '--reporter=json'])
  const report = parseJsonReport(run.stdout)
  const rows = collectSuites(report)
  const executed = rows.filter((row) => row.status !== 'skipped')
  if (run.status !== 0 || rows.some((row) => row.status !== 'passed')) {
    throw new Error(`Phase A 原始绿失败：${suite} exit=${run.status} rows=${JSON.stringify(rows)}`)
  }
  evidence.phases.original[suite] = {
    argv: ['vitest', 'run', file, '--reporter=json'],
    exit: run.status,
    executedCount: executed.length,
    tests: rows,
  }
}

// —— Phase B：逐注入点 变异红 → 恢复 ——
// mutation 可能是复合的（同一合同由多层守卫持有时，单层变异存活，须同时变异全部层）。
for (const injection of INJECTIONS) {
  const mutations = injection.mutations ?? [
    { file: injection.file, anchor: injection.anchor, mutant: injection.mutant },
  ]
  const snapshots = mutations.map((mutation) => {
    const absolute = join(editorRoot, mutation.file)
    const original = readFileSync(absolute, 'utf8')
    if (original.split(mutation.anchor).length !== 2) {
      throw new Error(`${injection.id} 锚点不唯一或缺失：${mutation.file}`)
    }
    writeFileSync(absolute, original.replace(mutation.anchor, mutation.mutant))
    return { mutation, absolute, original }
  })

  const targetFile = TEST_FILES[injection.suite]
  const argv = ['run', targetFile, '-t', injection.testName, '--reporter=json']
  const run = runVitest(argv)
  const report = parseJsonReport(run.stdout)
  const rows = collectSuites(report)
  const executed = rows.filter((row) => row.status !== 'skipped')
  const failed = rows.filter((row) => row.status === 'failed')
  const business = firstBusinessError(report, injection.testName)
  const mutantOk = run.status !== 0 && failed.length > 0 && business !== null

  const fileEvidences = snapshots.map(({ mutation, absolute, original }) => {
    const mutated = original.replace(mutation.anchor, mutation.mutant)
    writeFileSync(absolute, original)
    const restored = readFileSync(absolute, 'utf8')
    return {
      productFile: mutation.file,
      anchor: mutation.anchor,
      mutant: mutation.mutant,
      hashes: {
        original: sha256(original),
        mutant: sha256(mutated),
        restored: sha256(restored),
      },
      hashOk: sha256(original) === sha256(restored) && sha256(mutated) !== sha256(original),
    }
  })

  evidence.injections.push({
    id: injection.id,
    contract: injection.contract,
    compound: mutations.length > 1,
    productFiles: fileEvidences.map((entry) => entry.productFile),
    targetTestFile: targetFile,
    targetTestName: injection.testName,
    argv: ['vitest', ...argv],
    cwd: editorRoot,
    exit: run.status,
    signal: run.signal,
    executedSet: executed.map((row) => `${row.file} :: ${row.fullName}`),
    executedCount: executed.length,
    skippedExcluded: rows.length - executed.length,
    failed: failed.map((row) => `${row.file} :: ${row.fullName}`),
    uniqueBusinessAssertion: business?.assertionError ?? null,
    failingTargetFullName: business?.fullName ?? null,
    mutantPhaseOk: mutantOk,
    stdoutExcerpt: (run.stdout ?? '').slice(0, 400),
    files: fileEvidences,
    hashOk: fileEvidences.every((entry) => entry.hashOk),
  })
}

// —— Phase C：恢复绿（三套件复跑）+ 产品文件 git-clean ——
for (const [suite, file] of Object.entries(TEST_FILES)) {
  const run = runVitest(['run', file, '--reporter=json'])
  const report = parseJsonReport(run.stdout)
  const rows = collectSuites(report)
  if (run.status !== 0 || rows.some((row) => row.status !== 'passed')) {
    throw new Error(`Phase C 恢复绿失败：${suite} exit=${run.status}`)
  }
  evidence.phases.restored[suite] = {
    argv: ['vitest', 'run', file, '--reporter=json'],
    exit: run.status,
    executedCount: rows.filter((row) => row.status !== 'skipped').length,
    tests: rows,
  }
}

const mutatedProductFiles = [
  ...new Set(
    INJECTIONS.flatMap((injection) =>
      (injection.mutations ?? [injection]).map((mutation) => mutation.file),
    ),
  ),
]
evidence.productFilesGitStatus = mutatedProductFiles.map((file) => {
  const status = spawnSync('git', ['-C', repoRoot, 'status', '--porcelain', '--', file], {
    encoding: 'utf8',
  })
  return { file, status: status.stdout.trim(), clean: status.stdout.trim().length === 0 }
})
evidence.allMutantPhasesOk = evidence.injections.every(
  (entry) => entry.mutantPhaseOk && entry.hashOk,
)
evidence.productFilesAllClean = evidence.productFilesGitStatus.every((row) => row.clean)

const outPath = join(dirname(fileURLToPath(import.meta.url)), 'mutation-evidence.json')
writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`)
// 产物必须过仓库 biome format 门；格式化确定性，脚本可重复产出同形文件。
const format = spawnSync(
  join(repoRoot, 'node_modules/.bin/biome'),
  ['format', '--write', outPath],
  {
    encoding: 'utf8',
  },
)
if (format.status !== 0) throw new Error(`biome format 产物失败：${format.stdout}${format.stderr}`)
console.log(
  evidence.allMutantPhasesOk && evidence.productFilesAllClean
    ? `OK: ${INJECTIONS.length} 注入点三态全部通过，产品文件零残留 → ${outPath}`
    : `FAIL: 存在三态或清理失败项 → ${outPath}`,
)
process.exit(evidence.allMutantPhasesOk && evidence.productFilesAllClean ? 0 : 1)
