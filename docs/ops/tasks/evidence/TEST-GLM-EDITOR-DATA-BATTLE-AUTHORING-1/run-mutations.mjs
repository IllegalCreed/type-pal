#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
/**
 * TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 反控取证脚本。
 *
 * 对 12 个注入点自动执行三态验证：原始绿 → 指定业务变异红 → 恢复绿。
 * 每个注入点把「产品文件唯一锚点」替换为破坏对应合同的变异体，只跑该注入点定向测试
 * （vitest -t 全名过滤），随后原样恢复并复跑全套。落盘证据包含：spawn argv/cwd、JSON
 * reporter 原始输出摘录、exit code、失败用例 file×fullName、唯一业务 AssertionError、
 * 三态 sha256、执行集（排除 skipped）与产品文件 git-clean 证明。
 *
 * 运行：node docs/ops/tasks/evidence/TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1/run-mutations.mjs
 * 产物：同目录 mutation-evidence.json（JSON + 恰好一个末尾换行，可重复产出同形文件）。
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 本文件位于 docs/ops/tasks/evidence/TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1/，向上 5 级到仓库根。
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const editorRoot = join(repoRoot, 'packages/editor')
const vitestBin = join(repoRoot, 'node_modules/.bin/vitest')

const TEST_FILES = {
  battlefield: 'src/ui/BattleFieldTab.glm-data-authoring.test.tsx',
  poison: 'src/ui/PoisonTab.glm-data-authoring.test.tsx',
  alchemy: 'src/ui/ItemAlchemyTab.glm-data-authoring.test.tsx',
  enemy: 'src/ui/EnemyTab.glm-data-authoring.test.tsx',
  datamode: 'src/ui/DataMode.glm-data-authoring.test.tsx',
}

const INJECTIONS = [
  {
    id: 'INJ-1',
    file: 'src/ui/BattleFieldTab.tsx',
    anchor: 'onObjectFocus?.(next === undefined ? undefined : String(next))',
    mutant: 'onObjectFocus?.(undefined)',
    suite: 'battlefield',
    testName: '零引用战场确认删除',
    contract: '删除后 stale-selection 回退并回报父级 focus → 变异为不回报真实 id',
  },
  {
    id: 'INJ-2',
    file: 'src/ui/BattleFieldTab.tsx',
    anchor: '      setSelId(parsed)\n      setCreating(false)',
    mutant: '      setSelId(parsed)',
    suite: 'battlefield',
    testName: '创建卡打开时收到深链',
    contract: '深链到达退出创建卡 → 变异为保持创建态',
  },
  {
    id: 'INJ-3',
    file: 'src/ui/PoisonTab.tsx',
    anchor: 'onChange(arr.length ? arr : undefined) // 清空 = 删键(无 DoT)',
    mutant: 'onChange(arr.length ? arr : []) // 清空 = 删键(无 DoT)',
    suite: 'poison',
    testName: '删到零=整键删除',
    contract: 'tick 清空整键删除 → 变异为保留空数组',
  },
  {
    id: 'INJ-4',
    file: 'src/ui/PoisonTab.tsx',
    anchor: 'onChange([...list, { hpDelta: -10 }])',
    mutant: 'onChange([...list, { hpDelta: -1 }])',
    suite: 'poison',
    testName: '删到零=整键删除',
    contract: '「添加回合」补缺省 {hpDelta:-10} → 变异为 -1',
  },
  {
    id: 'INJ-5',
    file: 'src/ui/PoisonTab.tsx',
    anchor: 'symmetric: byId.get(p.lethalWith)?.lethalWith === p.id',
    mutant: 'symmetric: true',
    suite: 'poison',
    testName: '关系总览',
    contract: '致死对不对称 ⚠ 警告 → 变异为恒对称',
  },
  {
    id: 'INJ-6',
    file: 'src/ui/PoisonTab.tsx',
    anchor: 'onObjectFocus?.(String(id))',
    mutant: 'onObjectFocus?.(undefined)',
    suite: 'poison',
    testName: '关系总览',
    contract: '关系总览 onPick 联动选毒回报 focus → 变异为不回报真实 id',
  },
  {
    id: 'INJ-7',
    file: 'src/ui/PoisonTab.tsx',
    anchor: '      if (cur.id === ids[0]) {\n        loop = true\n        break\n      }',
    mutant: '      if (cur.id === ids[0]) {\n        loop = false\n        break\n      }',
    suite: 'poison',
    testName: '关系总览',
    contract: '相克链首尾闭环 ⟲ 收口标记 → 变异为不闭环',
  },
  {
    id: 'INJ-8',
    file: 'src/ui/ItemAlchemyTab.tsx',
    anchor:
      '                            resizeResourcePoolEffect(\n                              effect,\n                              maxRoll,\n                              items[0]?.id ?? selectedItem.id,\n                            ),',
    mutant:
      '                            {\n                              ...effect,\n                              maxRoll,\n                            },',
    suite: 'alchemy',
    testName: '直改：扩张克隆末档补齐',
    contract:
      'maxRoll 直改经 resizeResourcePoolEffect 严格同步奖励长度 → 变异为只改 maxRoll 不动 rewards',
  },
  {
    id: 'INJ-9',
    file: 'src/ui/ItemAlchemyTab.tsx',
    anchor: 'if (!focusObjectId && canonicalOwner) onObjectFocus?.(canonicalOwner.id)',
    mutant: 'if (false) onObjectFocus?.(canonicalOwner.id)',
    suite: 'alchemy',
    testName: '机制页身份',
    contract: '无深链挂载自动回报 canonical owner → 变异为不回报',
  },
  {
    id: 'INJ-10',
    file: 'src/ui/ItemAlchemyTab.tsx',
    anchor: 'props.onOpenItem?.(selectedItem.id)',
    mutant: "props.onOpenItem?.('broken-owner')",
    suite: 'alchemy',
    testName: '机制页身份',
    contract: '「打开承载物品」传出 owner id → 变异为传出伪造 id',
  },
  {
    id: 'INJ-11',
    file: 'src/ui/EnemyTab.tsx',
    anchor: '      enemies.some((entry) => entry.id === focusObjectId)',
    mutant: '      true',
    suite: 'enemy',
    testName: '无效/陈旧深链被忽略',
    contract: '无效深链守卫（敌人存在性检查）→ 变异为恒放行（选中被偷换到不存在的敌人）',
  },
  {
    id: 'INJ-12',
    file: 'src/ui/DataMode.tsx',
    anchor: "(id) => props.onBattleTrial?.({ kind: 'enemy-team', id })",
    mutant: "(id) => props.onBattleTrial?.({ kind: 'enemy', id })",
    suite: 'datamode',
    testName: '试打整形',
    contract: '敌队试打经路由整形 {kind:"enemy-team"} → 变异为 enemy 形状',
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
  card: 'TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1',
  generatedAt: new Date().toISOString(),
  command: 'node docs/ops/tasks/evidence/TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1/run-mutations.mjs',
  cwd: editorRoot,
  phases: { original: {}, restored: {} },
  injections: [],
}

// —— Phase A：原始绿（五套件全量）——
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

// —— Phase C：恢复绿（五套件复跑）+ 产品文件 git-clean ——
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
