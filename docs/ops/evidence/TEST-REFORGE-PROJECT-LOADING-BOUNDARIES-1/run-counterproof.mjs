// TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1 严格三态反控 runner(证据工具,不进默认 runner)。
//
// 协议:判据自证(judgeSelfTest 合成反例 + 真实 Vitest 探针:纯业务红接受、目标红+afterAll
// 同步抛错拒收、目标红+异步 uncaught 拒收) → 原始绿(两文件执行集快照) → 逐针红(每针独立
// 新树、冻结源核验、恰一文本替换、恰一指定业务 AssertionError) → 还原绿(全新原始树,
// 执行集与快照逐字一致) → 末次重放(首针重建再现红)。任何一步判据非空即整体失败退出,
// 不产出"部分通过"回执。产品变异只发生在 /tmp 临时树,贡献者工作树零改动。
//
// 针设计:每针变异都落在 loader 接线层(project-loader.ts),对应一个合同的独立判别臂;
// marker 为测试内 expect(value, marker) 双锚(phase+message),变异下落成 AssertionError 时
// marker 必在失败文首。红相位只跑该针所在定向文件(与绿快照按文件切片逐字比对)。
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildIsolatedTree,
  executionSetOf,
  judgeGreen,
  judgeRed,
  judgeSelfTest,
  persistJson,
  runJudgeProbes,
  runVitestJson,
  sha256Of,
  TEST_FILES,
} from './lib-isolated-tree.mjs'

const EVIDENCE_DIR = import.meta.dirname
const RUNS_DIR = path.join(EVIDENCE_DIR, 'counters')

const REF_TEST = 'src/project-loader.reference-boundaries.test.ts'
const IO_TEST = 'src/project-loader.io-boundaries.test.ts'

// 变异锚含源码里的模板占位符字面量；拆开存放避免 lint 把它当本文件模板串误报。
const DOLLAR_CURLY = '${'

// fullName 由绿快照按唯一后缀解析(JSON reporter fullName 为 describe+test 空格连接),
// 红态判据仍要求精确相等;解析不到或多于一条即失败,不做模糊匹配。
const NEEDLES = [
  {
    id: 'N-C2-scene-map-ref',
    file: 'src/project-loader.ts',
    from: 'if (!mapAssetById(mapIndex, scene.mapId))',
    to: 'if (false && !mapAssetById(mapIndex, scene.mapId))',
    testFile: REF_TEST,
    fullNameSuffix: 'mapId 悬空：入口装配与惰性 scene 都在地图索引精确拒绝',
    marker: 'C2-map-reference',
    axis: 'C2 validateAuthorScene 地图索引校验(project-loader.ts:162-163)',
  },
  {
    id: 'N-C3-scene-condition',
    file: 'src/project-loader.ts',
    from: 'validateActorConditionCommandReferences(scene, actors, poisons, path)[0]',
    to: 'validateActorConditionCommandReferences(scene, actors, poisons, path).slice(1)[0]',
    testFile: REF_TEST,
    fullNameSuffix: 'apply 条件缺 actor / 缺毒分别被入口场景路径拒收',
    marker: 'C3-scene-condition',
    axis: 'C3 validateAuthorScene 条件校验接线(project-loader.ts:171-172)',
  },
  {
    id: 'N-C4-items-condition',
    file: 'src/project-loader.ts',
    from: "    [authorItems, 'items'],",
    to: "    [[], 'items'],",
    testFile: REF_TEST,
    fullNameSuffix: '合法 item 脚本过结构校验后，条件引用不闭合由 items 精确路径拒收',
    marker: 'C4-item-condition',
    axis: 'C4 assemble items root 条件校验接线(project-loader.ts:237)',
  },
  {
    id: 'N-C6-shared-condition',
    file: 'src/project-loader.ts',
    from: "    [authorSharedScripts, 'sharedScripts'],",
    to: "    [{}, 'sharedScripts'],",
    testFile: REF_TEST,
    fullNameSuffix: 'shared 脚本 actor/poison 条件经实际组装拒收',
    marker: 'C6-shared-condition',
    axis: 'C6 assemble sharedScripts root 条件校验接线(project-loader.ts:239)',
  },
  {
    id: 'N-C7-equip-battle-sprite',
    file: 'src/project-loader.ts',
    from: 'validateEquipBattleSpriteReferences(items, actors, battleSprites)[0]',
    to: 'validateEquipBattleSpriteReferences([], actors, battleSprites)[0]',
    testFile: REF_TEST,
    fullNameSuffix: '合法 item/actor/equip 过前置门后，悬空 battle sprite 在组装后置接线拒收',
    marker: 'C7-equip-battle-sprite',
    axis: 'C7 装备战斗精灵后置接线(project-loader.ts:271-272)',
  },
  {
    id: 'N-C8-entry-non-error-detail',
    file: 'src/project-loader.ts',
    from: 'const detail = error instanceof Error ? error.message : String(error)',
    to: "const detail = error instanceof Error ? error.message : 'opaque-io-failure'",
    testFile: IO_TEST,
    fullNameSuffix: '外部 IO 对入口场景抛非 Error',
    marker: 'C8-entry-io-context',
    axis: 'C8 入口 IO 非 Error detail 渲染(project-loader.ts:373-375)',
  },
  {
    id: 'N-C9a-unregistered-gate',
    file: 'src/project-loader.ts',
    from: `  if (!asset) throw new Error(\`loadProjectMapById: mapId "${DOLLAR_CURLY}mapId}" 不在 map index\`)`,
    to: "  if (!asset) return loadProjectMap(project.assetBase, 'content/maps/map-001.json')",
    testFile: IO_TEST,
    fullNameSuffix: '未登记 mapId 零 IO 精确拒绝',
    marker: 'C9-map-by-id',
    axis: 'C9a loadProjectMapById 未登记门(project-loader.ts:529-530)',
  },
  {
    id: 'N-C9b-registered-real-load',
    file: 'src/project-loader.ts',
    from: '  return loadProjectMap(project.assetBase, asset.path)',
    to: "  return loadProjectMap(project.assetBase, 'content/maps/map-001.json')",
    testFile: IO_TEST,
    fullNameSuffix: '未登记 mapId 零 IO 精确拒绝',
    marker: 'C9-map-by-id',
    axis: 'C9b loadProjectMapById 已登记真实加载(project-loader.ts:531)',
  },
  {
    id: 'N-C9c-stable-id-placement',
    file: 'src/project-loader.ts',
    from: '      maps[asset.id] = await loadProjectMap(project.assetBase, asset.path)',
    to: '      maps[asset.path] = await loadProjectMap(project.assetBase, asset.path)',
    testFile: IO_TEST,
    fullNameSuffix: 'loadAllProjectMaps 乱序完成仍按稳定 id 归位',
    marker: 'C9-map-batch',
    axis: 'C9c loadAllProjectMaps 稳定 id 归位(project-loader.ts:517-521)',
  },
  {
    id: 'N-C10-poisons-field',
    file: 'src/project-loader.ts',
    from: '    poisons: poisonList,',
    to: '    poisons: [],',
    testFile: IO_TEST,
    fullNameSuffix: '可缺表缺席 → 空默认',
    marker: 'C10-optional-tables',
    axis: 'C10 poisons 表保真返回(project-loader.ts:313)',
  },
]

function rel(file) {
  return path.relative(EVIDENCE_DIR, file)
}

function runSummary(run) {
  return {
    exit: run.exit,
    signal: run.signal,
    pid: run.pid,
    spawnError: run.spawnError,
    argvTail: run.argv.slice(-4),
    cwd: run.cwd,
    env: run.env,
    unhandledInOutput: run.unhandledInOutput,
    numTotalTests: run.report.numTotalTests,
    numPassedTests: run.report.numPassedTests,
    numFailedTests: run.report.numFailedTests,
    raw: { file: rel(run.rawFile), sha256: run.rawSha256 },
    json: { file: rel(run.jsonFile), sha256: run.jsonSha256 },
  }
}

function fail(message) {
  throw new Error(message)
}

function resolveFullName(rows, testFile, suffix) {
  const hits = rows.filter((row) => row.startsWith(`${testFile} :: `) && row.includes(suffix))
  if (hits.length !== 1) fail(`fullName 解析失败(${hits.length} 命中): ${suffix}`)
  return hits[0].slice(`${testFile} :: `.length)
}

// ---- 主协议 ----
rmSync(RUNS_DIR, { recursive: true, force: true })
mkdirSync(RUNS_DIR, { recursive: true })
const receipt = {
  protocol: 'green → per-needle red (fresh isolated tree each) → restored green → final replay',
  createdAt: new Date().toISOString(),
  judgeCriteria:
    '四态同判据:进程层(exit/signal/spawnError) + 非空 file×fullName 执行集逐字锁定 + 计数/明细一致 + 非空 suite.message 拒收 + 零断言 failed suite 拒收 + stdout/stderr 无 unhandled + 红态恰一指定业务 AssertionError',
}

// Phase 0a:判据自证(合成反例)。
receipt.judgeSelfTest = judgeSelfTest(TEST_FILES)

// Phase 1:原始绿(两文件)+ 探针。
const greenTree = buildIsolatedTree('green')
try {
  const greenRun = runVitestJson(
    greenTree.pkg,
    TEST_FILES,
    path.join(RUNS_DIR, 'green.raw'),
    path.join(RUNS_DIR, 'green.json'),
  )
  const greenRows = executionSetOf(greenRun, TEST_FILES)
  const greenProblems = judgeGreen(greenRun, greenRows, TEST_FILES)
  if (greenProblems.length) fail(`green 判据失败: ${greenProblems.join('; ')}`)
  if (greenRows.length !== 9) fail(`green 执行集 ${greenRows.length} 行,预期 9(5 reference + 4 io)`)
  receipt.green = { process: runSummary(greenRun), executionSet: greenRows }
  // 探针复用同一棵原始树(探针文件用后即删)。
  receipt.judgeProbes = runJudgeProbes(greenTree, RUNS_DIR)
} finally {
  receipt.greenCleanup = greenTree.cleanup()
}
const greenRows = receipt.green.executionSet
const rowsByFile = {}
for (const file of TEST_FILES)
  rowsByFile[file] = greenRows.filter((row) => row.startsWith(`${file} :: `))

// Phase 2:逐针红(增量落盘回执,失败时保留现场证据)。
receipt.needles = []
const persistReceipt = () => {
  persistJson(path.join(EVIDENCE_DIR, 'counter-receipt.json'), JSON.stringify(receipt, null, 2))
}
for (const needle of NEEDLES) {
  const tree = buildIsolatedTree(needle.id)
  let pushed = false
  try {
    const target = path.join(tree.pkg, needle.file)
    const pristine = sha256Of(target)
    const source = readFileSync(target, 'utf8')
    const hits = source.split(needle.from).length - 1
    if (hits !== 1) fail(`${needle.id}: 变异锚命中 ${hits} 次(要求恰 1)`)
    writeFileSync(target, source.replace(needle.from, needle.to))
    const mutantSha = sha256Of(target)
    if (mutantSha === pristine) fail(`${needle.id}: 变异未改变文件`)
    const run = runVitestJson(
      tree.pkg,
      [needle.testFile],
      path.join(RUNS_DIR, `${needle.id}.raw`),
      path.join(RUNS_DIR, `${needle.id}.json`),
    )
    const fullName = resolveFullName(greenRows, needle.testFile, needle.fullNameSuffix)
    const problems = judgeRed(
      run,
      rowsByFile[needle.testFile],
      [needle.testFile],
      fullName,
      needle.marker,
    )
    const failed = run.tests.filter((t) => t.status === 'failed')
    receipt.needles.push({
      id: needle.id,
      axis: needle.axis,
      testFile: needle.testFile,
      fullName,
      mutation: {
        file: `packages/reforge/${needle.file}`,
        from: needle.from,
        to: needle.to,
        frozenSha256: pristine,
        mutantSha256: mutantSha,
      },
      treeFrozenVerified: true,
      judge: problems.length === 0 ? 'VALID' : `INVALID: ${problems.join('; ')}`,
      failed: failed.map((t) => t.fullName),
      failureExcerpt: (failed[0]?.failureMessages ?? []).join('\n').slice(0, 400),
      process: runSummary(run),
    })
    pushed = true
    if (problems.length) {
      persistReceipt()
      fail(`${needle.id}: 红态判据失败: ${problems.join('; ')}`)
    }
  } finally {
    const cleanup = tree.cleanup()
    if (pushed) receipt.needles.at(-1).cleanup = cleanup
    persistReceipt()
  }
}

// Phase 3:还原绿(全新原始树,执行集与 Phase 1 快照逐字一致)。
const restoredTree = buildIsolatedTree('restored-green')
try {
  const restoredRun = runVitestJson(
    restoredTree.pkg,
    TEST_FILES,
    path.join(RUNS_DIR, 'restored-green.raw'),
    path.join(RUNS_DIR, 'restored-green.json'),
  )
  const restoredRows = executionSetOf(restoredRun, TEST_FILES)
  const restoredProblems = judgeGreen(restoredRun, greenRows, TEST_FILES)
  if (restoredRows.join('\n') !== greenRows.join('\n')) fail('还原绿执行集与原始快照不一致')
  if (restoredProblems.length) fail(`还原绿判据失败: ${restoredProblems.join('; ')}`)
  receipt.restoredGreen = {
    process: runSummary(restoredRun),
    executionSetIdentical: true,
    problems: restoredProblems,
  }
} finally {
  receipt.restoredGreenCleanup = restoredTree.cleanup()
}

// Phase 4:末次重放(首针独立重建,再现同一恰一红)。
const replayNeedle = NEEDLES[0]
const replayTree = buildIsolatedTree('final-replay')
try {
  const target = path.join(replayTree.pkg, replayNeedle.file)
  const source = readFileSync(target, 'utf8')
  if (source.split(replayNeedle.from).length - 1 !== 1) fail('final-replay: 变异锚不再恰一命中')
  writeFileSync(target, source.replace(replayNeedle.from, replayNeedle.to))
  const run = runVitestJson(
    replayTree.pkg,
    [replayNeedle.testFile],
    path.join(RUNS_DIR, 'final-replay.raw'),
    path.join(RUNS_DIR, 'final-replay.json'),
  )
  const fullName = resolveFullName(greenRows, replayNeedle.testFile, replayNeedle.fullNameSuffix)
  const problems = judgeRed(
    run,
    rowsByFile[replayNeedle.testFile],
    [replayNeedle.testFile],
    fullName,
    replayNeedle.marker,
  )
  if (problems.length) fail(`final-replay 判据失败: ${problems.join('; ')}`)
  receipt.finalReplay = {
    needle: replayNeedle.id,
    judge: problems.length === 0 ? 'VALID' : `INVALID: ${problems.join('; ')}`,
    process: runSummary(run),
  }
} finally {
  receipt.finalReplayCleanup = replayTree.cleanup()
}

receipt.summary = {
  needles: receipt.needles.length,
  allValid: receipt.needles.every((n) => n.judge === 'VALID'),
  executionSetSize: greenRows.length,
}
persistReceipt()
console.log(
  `counterproof OK: ${receipt.needles.length} needles all VALID, execution set ${greenRows.length} rows`,
)
