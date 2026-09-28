/** TEST-GLM-PHASE1-LEAVES-3 六批共用单点业务负控；不改生产源/旧测试/覆盖口径。
 * 判据绑定同一失败记录的绝对文件与 Vitest 实际 fullName、恰一红、恰 exit1，
 * 逐条 failureMessages 拒混错/timeout；loader 实际命中写入运行态见证；
 * 判据自测与实跑走同一 judge 函数。注入只在隔离 config loader（临时副本语义，
 * 不写生产文件），前后 sha256 一致断言。用法：node leaves-mutants.mjs <a|b|c|d|e|f>
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const packageRoot = resolve(root, 'packages/game')
const output = mkdtempSync(join(tmpdir(), 'type-pal-leaves-mutants-'))
const setupFile = resolve(packageRoot, 'vitest.setup.ts')

/** 每批注册：控制跑范围（本批全部新文件）与 2–3 个单点针。 */
const batches = {
  a: {
    control: {
      tests: [
        'src/core/menu/primitives.glm-phase1-leaves.test.ts',
        'src/core/menu/item-select.glm-phase1-leaves.test.ts',
        'src/core/menu/magic-select.glm-phase1-leaves.test.ts',
        'src/core/menu/in-game-magic-menu.glm-phase1-leaves.test.ts',
        'src/core/menu/inventory-menu.glm-phase1-leaves.test.ts',
        'src/core/menu/inventory-action-menu.glm-phase1-leaves.test.ts',
        'src/core/menu/equip-menu.glm-phase1-leaves.test.ts',
        'src/core/menu/in-game-menu.glm-phase1-leaves.test.ts',
      ],
      total: 50,
    },
    production: ['src/core/menu/inventory-menu.ts', 'src/core/menu/in-game-magic-menu.ts'],
    mutations: [
      {
        id: 'inv-menu-icur-clamp',
        module: 'src/core/menu/inventory-menu.ts',
        file: 'src/core/menu/inventory-menu.glm-phase1-leaves.test.ts',
        total: 6,
        describe: 'L03 createInventoryMenu 起始光标与快照默认',
        title: 'gs.iCurInvMenuItem 恢复为起始 cursor；越界 clamp 到末项',
        from: 'const safeCur = inv.length === 0 ? 0 : Math.min(cur, inv.length - 1)',
        to: 'const safeCur = inv.length === 0 ? 0 : cur',
        category: '起始光标越界 clamp 拆除：恢复记忆光标越过库存末项',
      },
      {
        id: 'magic-caster-cursor-memory',
        module: 'src/core/menu/in-game-magic-menu.ts',
        file: 'src/core/menu/in-game-magic-menu.glm-phase1-leaves.test.ts',
        total: 10,
        describe: 'L02 DL22 施法人光标跨开启记忆（uigame.c:674/719 static w）',
        title: '确认即记忆；再开菜单默认停回上次施法人；队伍变小越界归 0',
        from: 'if (sLastCasterCursor < casterItems.length) casterMenu.cursor = sLastCasterCursor',
        to: 'if (false) casterMenu.cursor = sLastCasterCursor',
        category: 'DL22 记忆拆除：再开菜单不再停回上次施法人',
      },
    ],
  },
  b: {
    control: {
      tests: [
        'src/core/menu/shop-menu.glm-phase1-leaves.test.ts',
        'src/core/menu/sell-menu.glm-phase1-leaves.test.ts',
        'src/core/menu/save-slot-menu.glm-phase1-leaves.test.ts',
        'src/core/menu/opening-menu.glm-phase1-leaves.test.ts',
        'src/core/inspect/battle-inspect.glm-phase1-leaves.test.ts',
        'src/dev/state-dump.glm-phase1-leaves.test.ts',
        'src/tools/speedrun/detectors.glm-phase1-leaves.test.ts',
      ],
      total: 31,
    },
    production: ['src/core/menu/sell-menu.ts', 'src/core/inspect/battle-inspect.ts'],
    mutations: [
      {
        id: 'sell-refresh-shrink-clamp',
        module: 'src/core/menu/sell-menu.ts',
        file: 'src/core/menu/sell-menu.glm-phase1-leaves.test.ts',
        total: 3,
        describe: 'L05 sell-menu 剩余合同',
        title: '刷新缩表（非空）：prevCursor 越新末项 → clamp 到 length-1',
        from: 'else if (prevCursor >= s.grid.inventory.length) s.grid.cursor = s.grid.inventory.length - 1',
        to: 'else if (prevCursor >= s.grid.inventory.length) s.grid.cursor = prevCursor',
        category: '刷新缩表 clamp 拆除：光标悬在已消失条目之外',
      },
      {
        id: 'steal-money-item-branch',
        module: 'src/core/inspect/battle-inspect.ts',
        file: 'src/core/inspect/battle-inspect.glm-phase1-leaves.test.ts',
        total: 9,
        describe: 'L07 collectEnemyStatusReadouts 剩余投影',
        title: 'steal 三分支：金钱/知名物品/缺名物品',
        from: 'else if (stealId === 0) steal = `金钱 ×$' + '{stealCount}`',
        to: 'else if (stealId !== 0) steal = `金钱 ×$' + '{stealCount}`',
        category: 'steal 分类反转：stealItem==0 金钱与物品两分支互换',
      },
    ],
  },
  c: {
    control: {
      tests: [
        'src/present/menu/draw-menu.glm-phase1-leaves.test.ts',
        'src/present/menu/draw-confirm.glm-phase1-leaves.test.ts',
        'src/present/menu/draw-magic.glm-phase1-leaves.test.ts',
        'src/present/menu/draw-inventory.glm-phase1-leaves.test.ts',
        'src/present/menu/draw-equip.glm-phase1-leaves.test.ts',
        'src/present/menu/draw-player-status.glm-phase1-leaves.test.ts',
        'src/present/menu/draw-shop.glm-phase1-leaves.test.ts',
        'src/present/menu/draw-opening-menu.glm-phase1-leaves.test.ts',
        'src/present/menu/draw-box.glm-phase1-leaves.test.ts',
      ],
      total: 34,
    },
    production: ['src/present/menu/draw-menu.ts', 'src/present/menu/draw-shop.ts'],
    mutations: [
      {
        id: 'save-slot-saved-times',
        module: 'src/present/menu/draw-menu.ts',
        file: 'src/present/menu/draw-menu.glm-phase1-leaves.test.ts',
        total: 5,
        describe: 'L09 drawMenuStack 剩余分支',
        title:
          'save-slot：5 个单行框 (195,7+38i)、标签字色、slotMetas.savedTimes 黄色数字（缺省 0）',
        from: 'const savedTimes = meta?.savedTimes ?? 0',
        to: 'const savedTimes = 0',
        category: '存档次数显示断链：slotMetas 不再上屏',
      },
      {
        id: 'shop-owned-equipped-count',
        module: 'src/present/menu/draw-shop.ts',
        file: 'src/present/menu/draw-shop.glm-phase1-leaves.test.ts',
        total: 4,
        describe: 'L12 drawShopMenu 剩余分支',
        title: 'ownedCount = 库存 2 + 跨队已装备 1 = 3（uigame.c:1554-1577）',
        from: 'if (eq[slot]?.[role] === itemId) n++',
        to: 'if (false) n++',
        category: '「现有」数漏计全队已装备（uigame.c:1554-1577 拆除）',
      },
    ],
  },
  d: {
    control: {
      tests: [
        'src/present/font.glm-phase1-leaves.test.ts',
        'src/present/framebuffer.glm-phase1-leaves.test.ts',
        'src/present/screen-wave.glm-phase1-leaves.test.ts',
        'src/present/battle/draw-battle-settlement.glm-phase1-leaves.test.ts',
        'src/present/battle/draw-battle-ui.glm-phase1-leaves.test.ts',
        'src/present/battle/draw-battle-sprites.glm-phase1-leaves.test.ts',
      ],
      total: 20,
    },
    production: ['src/present/battle/draw-battle-settlement.ts', 'src/present/screen-wave.ts'],
    mutations: [
      {
        id: 'learn-magic-name-color',
        module: 'src/present/battle/draw-battle-settlement.ts',
        file: 'src/present/battle/draw-battle-settlement.glm-phase1-leaves.test.ts',
        total: 4,
        describe: 'L15 drawBattleSettlement 精确像素',
        title: 'learn-magic：ww 偏移随字宽收窄框，magicName 色 0x1B',
        from: 'renderText(fb, magicName, 75 + 16 * (w1 + w2) - ww, 115, ADDMAGIC_NAME_COLOR, glyphs, false)',
        to: 'renderText(fb, magicName, 75 + 16 * (w1 + w2) - ww, 115, 0, glyphs, false)',
        category: '练成屏 magicName 0x1B 色丢失（battle.c:1321）',
      },
      {
        id: 'wave-fade-only-advance',
        module: 'src/present/screen-wave.ts',
        file: 'src/present/screen-wave.glm-phase1-leaves.test.ts',
        total: 3,
        describe: 'L16 applyScreenWave 剩余合同',
        title:
          'advance=false（DM32 fade-only 补帧）：像素扭曲但 wScreenWave/progression/相位不推进',
        from: 'if (advance) gs.wScreenWave += gs.sWaveProgression',
        to: 'gs.wScreenWave += gs.sWaveProgression',
        category: 'fade-only 补帧误推进波幅计数（DM32 拆除）',
      },
    ],
  },
  e: {
    control: {
      tests: [
        'src/tools/toast.glm-phase1-leaves.test.ts',
        'src/tools/countdown.glm-phase1-leaves.test.ts',
        'src/tools/display-scale.glm-phase1-leaves.test.ts',
        'src/tools/minimap.glm-phase1-leaves.test.ts',
        'src/tools/tools-panel.glm-phase1-leaves.test.ts',
        'src/tools/speedrun/time-format.glm-phase1-leaves.test.ts',
        'src/tools/speedrun/countdown.glm-phase1-leaves.test.ts',
        'src/tools/speedrun/timer.glm-phase1-leaves.test.ts',
      ],
      total: 19,
    },
    production: ['src/tools/toast.ts', 'src/tools/tools-panel.ts'],
    mutations: [
      {
        id: 'toast-container-cleanup',
        module: 'src/tools/toast.ts',
        file: 'src/tools/toast.glm-phase1-leaves.test.ts',
        total: 2,
        describe: 'L19 showToast 堆叠合同',
        title: '最后一条移除后容器自删；info 类型用 · 图标与专属 class',
        from: 'if (container.childElementCount === 0) container.remove()',
        to: 'if (false) container.remove()',
        category: '空容器自删拆除：DOM 残留累积',
      },
      {
        id: 'tools-panel-scale-delegate',
        module: 'src/tools/tools-panel.ts',
        file: 'src/tools/tools-panel.glm-phase1-leaves.test.ts',
        total: 2,
        describe: 'L17 tools-panel 显示区委托',
        title: '缩放滑块 input → setPercent(posToPct(v))（对数刻度 0.75→316%）并同步 % 文案',
        from: 'ds.setPercent(posToPct(Number(scaleSlider.value)))',
        to: 'ds.setPercent(100)',
        category: '缩放滑块委托断链：恒写 100%',
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
  const expectedTotal = mutation ? mutation.total : batch.control.total
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
  const targetFile = resolve(packageRoot, mutation.file)
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
    testResults: [{ name: resolve(packageRoot, mutation.file), assertionResults: entries }],
  }
}

/** 判据自测：反例 + 有效红/exit/零执行，全部调用同一 judge。 */
function selfTest() {
  const mutation = batch.mutations[0]
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
        data.testResults[0].name = resolve('/different-candidate-root/packages/game', mutation.file)
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
  controlData.numTotalTests = batch.control.total
  controlData.success = true
  const controlEntries = controlData.testResults[0].assertionResults.map((entry, index) =>
    index === 0 ? { ...entry, status: 'passed', failureMessages: [] } : entry,
  )
  while (controlEntries.length < batch.control.total)
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
const batch = batches[batchKey]
assert.ok(batch, `usage: node leaves-mutants.mjs <${Object.keys(batches).join('|')}>`)

const selfTestResults = selfTest()
console.log(`criteria self-test: ${selfTestResults.length} cases, all as expected`)

const sourcePath = (name) => resolve(packageRoot, name)
const hash = (name) =>
  createHash('sha256')
    .update(readFileSync(sourcePath(name)))
    .digest('hex')
const hashes = Object.fromEntries(batch.production.map((name) => [name, hash(name)]))

const evidence = []
for (const mutation of [null, ...batch.mutations]) {
  const id = mutation?.id ?? 'control'
  const tests = mutation ? [mutation.file] : batch.control.tests
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
export default {root:${JSON.stringify(packageRoot)},
plugins:mutation?[{name:'isolated-leaves-needle',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(mutation.from).length!==2)throw Error('needle not unique');writeFileSync(${JSON.stringify(entered)},JSON.stringify({id:mutation.id,target}));return source.replace(mutation.from,mutation.to)}}]:[],
test:{environment:'jsdom',setupFiles:[${JSON.stringify(setupFile)}],include:${JSON.stringify(tests)},maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: packageRoot,
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
  `Batch ${batchKey} oracles passed: criteria self-test ${selfTestResults.length} cases + 1 control + ${batch.mutations.length} mutations. ${output}`,
)
