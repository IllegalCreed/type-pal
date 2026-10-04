/** TEST-GLM-STATE-COMMANDS-1 四批共用单点业务负控；不改生产源/旧测试/覆盖口径。
 * 判据绑定同一失败记录的绝对文件与 Vitest 实际 fullName、恰一红、恰 exit1，
 * 逐条 failureMessages 拒混错/timeout；load 实际命中写入运行态见证；
 * 判据自测与实跑走同一 judge 函数。用法：node state-commands-mutants.mjs <a|b|c|d>
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-state-commands-mutants-'))

/** 每批注册：包根、控制跑范围、以及该批 2–3 个单点针。 */
const batches = {
  a: {
    packageRoot: resolve(root, 'packages/reforge'),
    production: [
      'src/magic-menu-state.ts',
      'src/system-menu-state.ts',
      'src/equip-menu-state.ts',
      'src/use-menu-state.ts',
    ],
    control: {
      tests: [
        'src/magic-menu-state.glm-boundaries.test.ts',
        'src/system-menu-state.glm-boundaries.test.ts',
        'src/equip-menu-state.glm-boundaries.test.ts',
        'src/use-menu-state.glm-boundaries.test.ts',
      ],
      total: 34,
    },
    mutations: [
      {
        id: 'magic-cure-poison-id-inverted',
        module: 'src/magic-menu-state.ts',
        file: 'src/magic-menu-state.glm-boundaries.test.ts',
        total: 12,
        describe: 'A01 castOutdoorSkill 残差',
        title: 'curePoison poisonId 点名：只解匹配毒',
        from: 't.poisons = t.poisons?.filter((ap) => ap.poisonId !== Number(eff.poisonId))',
        to: 't.poisons = t.poisons?.filter((ap) => ap.poisonId === Number(eff.poisonId))',
        category: '错误效果结算：点名校验反转（解错毒）',
      },
      {
        id: 'system-empty-list-guard-drop',
        module: 'src/system-menu-state.ts',
        file: 'src/system-menu-state.glm-boundaries.test.ts',
        total: 7,
        describe: 'A02 system-menu-state 残差',
        title: '空列表导航：同引用不变',
        from: '  if (n === 0) return s',
        to: '  if (false) return s',
        category: '空列表防御拆除：环绕取模得到 NaN 并污染光标',
      },
      {
        id: 'useapply-phase-guard-drop',
        module: 'src/use-menu-state.ts',
        file: 'src/use-menu-state.glm-boundaries.test.ts',
        total: 8,
        describe: 'A04 use-menu-state 残差',
        title: 'useApply：pick-item 阶段 undefined；pick-target 无 selectedItemId undefined',
        from: "  if (s.phase !== 'pick-target' || !s.selectedItemId) return undefined",
        to: '  if (false) return undefined',
        category: '阶段防御拆除：错误阶段/无选中物仍发出执行请求',
      },
    ],
  },
  b: {
    packageRoot: resolve(root, 'packages/editor'),
    production: [
      'src/core/skill-commands.ts',
      'src/core/poison-commands.ts',
      'src/core/enemy-team-commands.ts',
      'src/core/enemy-commands.ts',
    ],
    control: {
      tests: [
        'src/core/skill-commands.glm-boundaries.test.ts',
        'src/core/poison-commands.glm-boundaries.test.ts',
        'src/core/enemy-team-commands.glm-boundaries.test.ts',
        'src/core/enemy-commands.glm-boundaries.test.ts',
      ],
      total: 32,
    },
    mutations: [
      {
        id: 'skill-first-capture-overwrite',
        module: 'src/core/skill-commands.ts',
        file: 'src/core/skill-commands.glm-boundaries.test.ts',
        total: 7,
        describe: 'B01 skill-commands 残差',
        title: 'UpdateSkill：二次 apply 不覆盖首轮 oldPatch（undo 回首次前状态）',
        from: '  if (!this.oldPatch) {',
        to: '  if (true) {',
        category: '坏undo：首轮旧值捕获被二次 apply 覆盖',
      },
      {
        id: 'poison-patch-alias',
        module: 'src/core/poison-commands.ts',
        file: 'src/core/poison-commands.glm-boundaries.test.ts',
        total: 9,
        describe: 'B02 poison-commands 残差',
        title: 'UpdatePoison：构造期深拷贝嵌套 patch——构造后改源不泄漏，apply 不别名',
        from: '    this.patch = structuredClone(patch)',
        to: '    this.patch = patch',
        category: '输入污染：构造期深拷贝退化为别名',
      },
      {
        id: 'enemy-team-old-overwrite',
        module: 'src/core/enemy-team-commands.ts',
        file: 'src/core/enemy-team-commands.glm-boundaries.test.ts',
        total: 8,
        describe: 'B03 enemy-team-commands 残差',
        title: 'UpdateEnemyTeams：二次 apply 保持首轮旧表；未 apply 的新命令 invert 原引用',
        from: '    if (!this.old) this.old = structuredClone(state.enemyTeams ?? []) as EnemyTeamDef[]',
        to: '    if (true) this.old = structuredClone(state.enemyTeams ?? []) as EnemyTeamDef[]',
        category: '坏undo：整表首轮旧队表被二次 apply 覆盖',
      },
    ],
  },
  c: {
    packageRoot: resolve(root, 'packages/editor'),
    production: [
      'src/core/actor-commands.ts',
      'src/core/sprite-commands.ts',
      'src/core/battle-sprite-commands.ts',
      'src/core/tileset-commands.ts',
    ],
    control: {
      tests: [
        'src/core/actor-commands.glm-boundaries.test.ts',
        'src/core/sprite-commands.glm-boundaries.test.ts',
        'src/core/battle-sprite-commands.glm-boundaries.test.ts',
        'src/core/tileset-commands.glm-boundaries.test.ts',
      ],
      total: 35,
    },
    mutations: [
      {
        id: 'sprite-share-undo-overdelete',
        module: 'src/core/sprite-commands.ts',
        file: 'src/core/sprite-commands.glm-boundaries.test.ts',
        total: 10,
        describe: 'C02 sprite-commands 残差',
        title: 'AddSprite：共享物理资产第二语义 → createdAsset=false，undo 保留 catalog/blob',
        from: '    this.createdAsset = !existing',
        to: '    this.createdAsset = true',
        category: '资产旁记录被删：共享物理资产第二语义被撤销时误删 catalog/blob',
      },
      {
        id: 'tileset-remove-shared-cascade',
        module: 'src/core/tileset-commands.ts',
        file: 'src/core/tileset-commands.glm-boundaries.test.ts',
        total: 9,
        describe: 'C04 tileset-commands 残差',
        title: 'RemoveTileset：共享分支后 invert 保 catalog/blob（persistedBytes 缺省不覆盖）',
        from: '    if (nextTilesets.some((candidate) => candidate.asset === removed.asset))',
        to: '    if (false)',
        category: '资产旁记录被删：共享 tileset 资产随定义删除级联',
      },
      {
        id: 'actor-detach-first-capture',
        module: 'src/core/actor-commands.ts',
        file: 'src/core/actor-commands.glm-boundaries.test.ts',
        total: 10,
        describe: 'C01 actor-commands 残差',
        title: 'DetachActorEntity：二次 apply 保持首轮 original，undo 回首次前实体',
        from: '    if (!this.original) this.original = structuredClone(entity)',
        to: '    if (true) this.original = structuredClone(entity)',
        category: '坏undo：首轮实体快照被二次 apply 覆盖',
      },
    ],
  },
  d: {
    packageRoot: resolve(root, 'packages/editor'),
    production: [
      'src/core/shop-commands.ts',
      'src/core/ambience-commands.ts',
      'src/core/battle-field-commands.ts',
      'src/core/world-variable-commands.ts',
    ],
    control: {
      tests: [
        'src/core/shop-commands.glm-boundaries.test.ts',
        'src/core/ambience-commands.glm-boundaries.test.ts',
        'src/core/battle-field-commands.glm-boundaries.test.ts',
        'src/core/world-variable-commands.glm-boundaries.test.ts',
      ],
      total: 25,
    },
    mutations: [
      {
        id: 'shop-update-first-capture',
        module: 'src/core/shop-commands.ts',
        file: 'src/core/shop-commands.glm-boundaries.test.ts',
        total: 6,
        describe: 'D01 shop-commands 残差',
        title: 'UpdateShop：二次 apply 保持首轮旧货单（undo 回首次前）；旁店铺同引用保留',
        from: '    if (!this.captured) {',
        to: '    if (true) {',
        category: '坏undo：首轮旧货单捕获被二次 apply 覆盖',
      },
      {
        id: 'ambience-undo-occupied-silent',
        module: 'src/core/ambience-commands.ts',
        file: 'src/core/ambience-commands.glm-boundaries.test.ts',
        total: 7,
        describe: 'D02 ambience-commands 残差',
        title: 'DeleteAmbience：undo 时 id 已被占用恰抛（整串）',
        from: '      throw new Error(`无法撤销删除：氛围 id 已被占用 $' + '{this.ambienceId}`)',
        to: '      void 0',
        category: '坏undo：undo 重占用 fail-loud 被静默吞掉',
      },
      {
        id: 'battlefield-undefined-delete-drop',
        module: 'src/core/battle-field-commands.ts',
        file: 'src/core/battle-field-commands.glm-boundaries.test.ts',
        total: 7,
        describe: 'D03 battle-field-commands 残差',
        title:
          'UpdateBattleField：缺席 id apply 原引用；二次 apply 首轮 oldPatch；可选键 undefined 删键与还原',
        from: '    for (const [k, v] of Object.entries(this.patch)) if (v === undefined) delete next[k]',
        to: '    for (const [k, v] of Object.entries(this.patch)) if (false) void k',
        category: '输入污染：可选键 undefined 删键合同失效，残留显式 undefined',
      },
    ],
  },
}

const MIXED_ERROR =
  /(^|\n)\s*(TypeError|RangeError|ReferenceError|SyntaxError|EvalError|URIError|Error)\s*:/
const TIMEOUT = /timed out|timeout/i

/**
 * 同一真实判据：实跑验收与自测反例都走本函数。返回违规列表，空列表 = 判定通过。
 * mutation 为 null 时要求恰 exit0 全绿（control.total）；否则恰 exit1、恰一红且该失败
 * 记录的绝对文件与实际 fullName 都等于目标，失败消息逐条拒混错/timeout。
 */
function judge(mutation, run, data) {
  const violations = []
  const expectedExit = mutation ? 1 : 0
  const expectedTotal = mutation ? mutation.total : mutation_batch.control.total
  if (run.signal !== null) violations.push(`terminated by signal ${String(run.signal)}`)
  if (run.status !== expectedExit) violations.push(`exit ${String(run.status)} != ${expectedExit}`)
  const text = stripVTControlCharacters(`${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  if (/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/.test(text))
    violations.push('unhandled runtime error')
  if (!data || !Array.isArray(data.testResults)) {
    violations.push('no report data')
    return violations
  }
  if (data.numTotalTests !== expectedTotal)
    violations.push(`numTotalTests ${data.numTotalTests} != ${expectedTotal}`)
  if (data.numPendingTests !== 0 || data.numTodoTests !== 0) violations.push('pending/todo present')
  if (data.testResults.some((file) => file.message)) violations.push('suite-level failure')
  const assertions = data.testResults.flatMap((file) => file.assertionResults ?? [])
  if (assertions.length !== expectedTotal)
    violations.push(`assertions ${assertions.length} != ${expectedTotal}`)
  if (new Set(assertions.map((entry) => entry.fullName)).size !== expectedTotal)
    violations.push('duplicate fullName in scope')
  const badStatus = assertions.filter(
    (entry) => entry.status !== 'passed' && entry.status !== 'failed',
  )
  if (badStatus.length > 0) violations.push(`${badStatus.length} entries neither passed nor failed`)
  const failed = assertions.filter((entry) => entry.status === 'failed')
  const passed = assertions.filter((entry) => entry.status === 'passed')
  if (passed.length !== expectedTotal - failed.length)
    violations.push(`passed ${passed.length} inconsistent with ${failed.length} failed`)
  if (!mutation) {
    if (failed.length !== 0) violations.push(`control red: ${failed.length}`)
    return violations
  }
  if (failed.length !== 1) {
    violations.push(`failed ${failed.length}, expected exactly 1`)
    return violations
  }
  const red = failed[0]
  const targetFullName = `${mutation.describe} ${mutation.title}`
  if (red.fullName !== targetFullName)
    violations.push(
      `red fullName ${JSON.stringify(red.fullName)} != ${JSON.stringify(targetFullName)}`,
    )
  const host = data.testResults.find((file) =>
    (file.assertionResults ?? []).some((entry) => entry.status === 'failed'),
  )
  const targetFile = resolve(mutation_batch.packageRoot, mutation.file)
  if (!host || host.name !== targetFile)
    violations.push(`red file ${String(host?.name)} != ${targetFile}`)
  const messages = red.failureMessages ?? []
  if (messages.length === 0) violations.push('failure without messages')
  for (const message of messages) {
    const trimmed = message.trimStart()
    if (!/^AssertionError\b/.test(trimmed)) {
      violations.push(`non-assertion failure: ${trimmed.slice(0, 80)}`)
      continue
    }
    if (TIMEOUT.test(trimmed.split('\n', 1)[0] ?? ''))
      violations.push(`timeout treated as red: ${trimmed.slice(0, 80)}`)
    if (MIXED_ERROR.test(trimmed))
      violations.push(`mixed non-business error: ${trimmed.slice(0, 80)}`)
  }
  return violations
}

/** 自测样本：目标失败记录默认落在正确的绝对文件与 fullName 上。 */
function sample(mutation) {
  const entries = Array.from({ length: mutation.total }, (_, index) => ({
    title: `other ${index}`,
    ancestorTitles: ['other'],
    fullName: `other other ${index}`,
    status: 'passed',
    failureMessages: [],
  }))
  entries[0] = {
    title: mutation.title,
    ancestorTitles: [mutation.describe],
    fullName: `${mutation.describe} ${mutation.title}`,
    status: 'failed',
    failureMessages: ['AssertionError: expected business rejection'],
  }
  return {
    numTotalTests: mutation.total,
    numPendingTests: 0,
    numTodoTests: 0,
    success: false,
    testResults: [
      { name: resolve(mutation_batch.packageRoot, mutation.file), assertionResults: entries },
    ],
  }
}

/** 判据自测：反例 + 有效红/exit/零执行，全部调用同一 judge。 */
function selfTest() {
  const mutation = mutation_batch.mutations[0]
  const baseRun = { status: 1, signal: null, stdout: '', stderr: '' }
  const cases = [
    { id: 'valid-red', expectReject: false, run: baseRun, edit() {} },
    {
      id: 'same-message-mixed-error',
      expectReject: true,
      run: baseRun,
      edit(data) {
        data.testResults[0].assertionResults[0].failureMessages[0] +=
          '\nTypeError: environment broken'
      },
    },
    {
      id: 'assertion-prefixed-timeout',
      expectReject: true,
      run: baseRun,
      edit(data) {
        data.testResults[0].assertionResults[0].failureMessages = ['AssertionError: test timed out']
      },
    },
    {
      id: 'additional-unrelated-red',
      expectReject: true,
      run: baseRun,
      edit(data) {
        const extra = data.testResults[0].assertionResults[1]
        extra.status = 'failed'
        extra.failureMessages = ['AssertionError: unrelated red']
      },
    },
    {
      id: 'wrong-fullname-red-with-intended-green',
      expectReject: true,
      run: baseRun,
      edit(data) {
        const entries = data.testResults[0].assertionResults
        entries[0].status = 'passed'
        entries[0].failureMessages = []
        entries[1] = {
          title: mutation.title,
          ancestorTitles: ['different group'],
          fullName: `different group ${mutation.title}`,
          status: 'failed',
          failureMessages: ['AssertionError: wrong case'],
        }
      },
    },
    {
      id: 'foreign-file-same-suffix',
      expectReject: true,
      run: baseRun,
      edit(data) {
        data.testResults[0].name = resolve(
          '/different-candidate-root/packages/editor',
          mutation.file,
        )
      },
    },
    {
      id: 'exit-two',
      expectReject: true,
      run: { status: 2, signal: null, stdout: '', stderr: '' },
      edit() {},
    },
    {
      id: 'exit-null',
      expectReject: true,
      run: { status: null, signal: null, stdout: '', stderr: '' },
      edit() {},
    },
    {
      id: 'zero-execution',
      expectReject: true,
      run: baseRun,
      edit(data) {
        data.numTotalTests = 0
        data.testResults[0].assertionResults = []
      },
    },
  ]
  const results = []
  for (const item of cases) {
    const data = sample(mutation)
    item.edit(data)
    const violations = judge(mutation, item.run, data)
    const rejected = violations.length > 0
    assert.equal(
      rejected,
      item.expectReject,
      `${item.id}: expected ${item.expectReject ? 'reject' : 'accept'}, got ${JSON.stringify(violations)}`,
    )
    results.push({ id: item.id, expectReject: item.expectReject, rejected, violations })
  }
  const controlData = sample(mutation)
  controlData.numTotalTests = mutation_batch.control.total
  controlData.success = true
  const controlEntries = controlData.testResults[0].assertionResults.map((entry, index) =>
    index === 0 ? { ...entry, status: 'passed', failureMessages: [] } : entry,
  )
  while (controlEntries.length < mutation_batch.control.total)
    controlEntries.push({
      title: `control filler ${controlEntries.length}`,
      ancestorTitles: ['control'],
      fullName: `control control filler ${controlEntries.length}`,
      status: 'passed',
      failureMessages: [],
    })
  controlData.testResults[0].assertionResults = controlEntries
  const controlViolations = judge(
    null,
    { status: 0, signal: null, stdout: '', stderr: '' },
    controlData,
  )
  assert.equal(
    controlViolations.length,
    0,
    `control sample must pass: ${JSON.stringify(controlViolations)}`,
  )
  results.push({ id: 'control-sample', expectReject: false, rejected: false, violations: [] })
  return results
}

const batchKey = process.argv[2] ?? ''
const mutation_batch = batches[batchKey]
assert.ok(
  mutation_batch,
  `usage: node state-commands-mutants.mjs <${Object.keys(batches).join('|')}>`,
)

const selfTestResults = selfTest()
console.log(`criteria self-test: ${selfTestResults.length} cases, all as expected`)

const sourcePath = (name) => resolve(mutation_batch.packageRoot, name)
const hash = (name) =>
  createHash('sha256')
    .update(readFileSync(sourcePath(name)))
    .digest('hex')
const hashes = Object.fromEntries(mutation_batch.production.map((name) => [name, hash(name)]))

const evidence = []
for (const mutation of [null, ...mutation_batch.mutations]) {
  const id = mutation?.id ?? 'control'
  const tests = mutation ? [mutation.file] : mutation_batch.control.tests
  if (mutation)
    assert.equal(
      readFileSync(sourcePath(mutation.module), 'utf8').split(mutation.from).length - 1,
      1,
      `${id}: unique needle required`,
    )
  const report = join(output, `${id}.json`)
  const entered = join(output, `${id}.entered.json`)
  const config = join(output, `${id}.config.mjs`)
  const target = mutation ? sourcePath(mutation.module) : ''
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const mutation=${JSON.stringify(mutation)}, target=${JSON.stringify(target)};
export default {root:${JSON.stringify(mutation_batch.packageRoot)},
plugins:mutation?[{name:'isolated-state-command',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(mutation.from).length!==2)throw Error('needle not unique');writeFileSync(${JSON.stringify(entered)},JSON.stringify({id:mutation.id,target}));return source.replace(mutation.from,mutation.to)}}]:[],
test:{include:${JSON.stringify(tests)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: mutation_batch.packageRoot,
    encoding: 'utf8',
  })
  writeFileSync(join(output, `${id}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  let data = null
  try {
    data = JSON.parse(readFileSync(report, 'utf8'))
  } catch {}
  const violations = judge(mutation, run, data)
  assert.deepEqual(violations, [], `${id}: judge violations: ${JSON.stringify(violations)}`)
  let enteredWitness = null
  if (mutation) {
    enteredWitness = JSON.parse(readFileSync(entered, 'utf8'))
    assert.deepEqual(enteredWitness, { id, target }, `${id}: load-hit witness mismatch`)
  }
  for (const [name, before] of Object.entries(hashes))
    assert.equal(hash(name), before, `${id}: production modified`)
  const failed = (data?.testResults ?? []).flatMap((file) =>
    (file.assertionResults ?? [])
      .filter((entry) => entry.status === 'failed')
      .map((entry) => entry.fullName),
  )
  evidence.push({
    id,
    exitCode: run.status,
    tests: data?.numTotalTests ?? null,
    entered: enteredWitness,
    failed,
  })
  console.log(`${id}: ${mutation ? 'business red' : 'green'}`)
}
writeFileSync(
  join(output, 'summary.json'),
  `${JSON.stringify({ batch: batchKey, hashes, selfTest: selfTestResults, evidence }, null, 2)}\n`,
)
console.log(
  `Batch ${batchKey} oracles passed: criteria self-test ${selfTestResults.length} cases + 1 control + ${mutation_batch.mutations.length} mutations. ${output}`,
)
