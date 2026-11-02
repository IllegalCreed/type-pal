// TEST-EDITOR-ALCHEMY-BOUNDARIES-1 严格四态反控 runner(证据工具,不进默认 runner)。
// 协议:判据自证(judgeSelfTest 合成反例 + 真实 Vitest 探针:纯业务红接受、目标红+afterAll
// 同步抛错拒收、目标红+异步 uncaught 拒收) → 原始绿(六文件定向执行集快照) → 逐针红
// (每针独立新树、冻结源核验、恰一文本替换、全定向集恰一指定业务 AssertionError——跨文件
// 无附带红) → 还原绿(全新原始树,执行集与快照逐字一致、针目标文件字节回到工作树) →
// 末次重放(首针重建再现同一恰一红)。任何一步判据非空即整体失败退出,不产出"部分通过"
// 回执。产品变异只发生在 /tmp 临时树,贡献者工作树产品零改动;每树用后删除并落清理证明。
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildIsolatedTree,
  executionSetOf,
  judgeGreen,
  judgeRed,
  judgeSelfTest,
  persistJson,
  REPO,
  runJudgeProbes,
  runVitestJson,
  sha256Of,
  TEST_FILES,
} from './lib-alchemy-tree.mjs'

const EVIDENCE_DIR = import.meta.dirname
const RUNS_DIR = path.join(EVIDENCE_DIR, 'counterproof-runs')

const FN_PREFIX = 'TEST-EDITOR-ALCHEMY-BOUNDARIES-1 机制页边界 '
const EXPECTED_TOTAL = 31

// 每针 = 一个新合同的最小可反证变异;marker 取自 vitest4 AssertionError 原文稳定片段。
const NEEDLES = [
  {
    id: 'N-B2-deleted-deeplink-empty-state',
    file: 'src/ui/ItemAlchemyTab.tsx',
    from: 'title="机制承载物品已被删除"',
    to: 'title="机制承载物品已被删除针"',
    fullName: `${FN_PREFIX}B2 深链指向真实已删除物品：精确 deleted 空态，不自动跳 owner、不派生第二 owner、零写`,
    marker: "to be '机制承载物品已被删除'",
    axis: 'B2 已删除深链精确空态(ItemAlchemyTab.tsx:215)',
  },
  {
    id: 'N-B4-missing-reference-dedup',
    file: 'src/ui/ItemAlchemyTab.tsx',
    from: '[...new Set(referencedItemIds(effect))]',
    to: 'referencedItemIds(effect)',
    fullName: `${FN_PREFIX}B4 材料/产物多处缺同一引用：Inspector 缺失集合去重，配方不被自动修复且零写`,
    marker: "to be 'ghost-b4、phantom-b4'",
    axis: 'B4 缺失引用集合去重(ItemAlchemyTab.tsx:139)',
  },
  {
    id: 'N-B5-commit-rejection-propagation',
    file: 'src/ui/ItemAlchemyTab.tsx',
    from: `      mutateItemAlchemyEffect(session, selectedItem.id, 'crafting', () => next)
    } catch (cause) {
      reportError(cause)
    }`,
    to: `      mutateItemAlchemyEffect(session, selectedItem.id, 'crafting', () => next)
    } catch (cause) {
    }`,
    fullName: `${FN_PREFIX}B5 草稿提交以最新会话为准：目标 effect 已被公开命令移除时精确拒绝并传播，不吞错不误派发`,
    marker: '物品 vessel-b5 缺 craftRecipe effect',
    axis: 'B5 拒绝传播 alert+onStatusNotice(ItemAlchemyTab.tsx:149-156)',
  },
  {
    id: 'N-B6-craft-unavailable-trim',
    file: 'src/ui/ItemAlchemyTab.tsx',
    from: 'commitCraft({ ...effect, unavailableMessage: value.trim() || undefined })',
    to: 'commitCraft({ ...effect, unavailableMessage: value })',
    fullName: `${FN_PREFIX}B6 crafting 材料不足提示：trim 提交、清空删键、单命令历史边界可精确撤销`,
    // vitest4 对大对象 toEqual 失败摘要会截断字段(…(2)),不含 unavailableMessage 值;
    // marker 取断言类型稳定片段(先例:save-precision M_EQUAL),完整对象见 failureExcerpt/raw。
    marker: 'to deeply equal',
    axis: 'B6 crafting unavailable trim/空白省略(ItemAlchemyTab.tsx:237-239)',
  },
  {
    id: 'N-B7-unique-material-gate',
    file: 'src/ui/ItemAlchemyEditors.tsx',
    from: '(item) => !consuming || item.id !== ownerItemId',
    to: '() => true',
    fullName: `${FN_PREFIX}B7 消耗者唯一材料门：仅 owner 自身时纯函数与 UI 双层禁用，物品数组公开变化后恢复合法追加`,
    marker: 'to be undefined',
    axis: 'B7 appendCraftRecipe 唯一材料门(ItemAlchemyEditors.tsx:222)',
  },
  {
    id: 'N-B8-tier-999-append-cap',
    file: 'src/ui/ItemAlchemyTab.tsx',
    from: 'effect.maxRoll >= 999',
    to: 'effect.maxRoll >= 1000',
    fullName: `${FN_PREFIX}B8 灵葫 999 档上限：追加禁用零历史漂移，合法降档后恢复可追加且同步克隆末档`,
    marker: 'expected false to be true',
    axis: 'B8 999 上限追加禁用(ItemAlchemyTab.tsx:347)',
  },
  {
    id: 'N-B9-draft-identity-discard',
    file: 'src/ui/ItemAlchemyTab.tsx',
    // 变异打 Tab 层的 syncToken 接线(crafting unavailable 字段冻结版本 0):在途草稿的
    // source 不随事务版本推进,typed 草稿残留显示 → B9 的丢弃断言变红。draft-input-state
    // 内部的 effect+fallback 是双保险,单层变异不改变显示(实测),不作为针。
    from: `draftKey={\`item-alchemy:\${selectedItem.id}:crafting:unavailable\`}\n                      syncToken={session.getHistoryVersion()}`,
    to: `draftKey={\`item-alchemy:\${selectedItem.id}:crafting:unavailable\`}\n                      syncToken={0}`,
    fullName: `${FN_PREFIX}B9 草稿身份切换：外部版本推进丢弃在途草稿不落账，surface 切换不串旧提示/数量`,
    marker: "expected '途中草稿' to be ''",
    axis: 'B9 草稿随 draftKey/syncToken 身份丢弃(ItemAlchemyTab.tsx:234-235 接线)',
  },
  {
    id: 'N-B10-open-item-degradation',
    file: 'src/ui/ItemAlchemyTab.tsx',
    from: 'props.onOpenItem ? (',
    to: 'true ? (',
    fullName: `${FN_PREFIX}B10 拒绝收尾与跳转降级：无 onOpenItem 不渲染跳转按钮，拒绝后恢复提交精确落账`,
    marker: 'expected true to be false',
    axis: 'B10 跳转 affordance 仅在回调在场时渲染(ItemAlchemyTab.tsx:187)',
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

// ---- 主协议 ----
rmSync(RUNS_DIR, { recursive: true, force: true })
mkdirSync(RUNS_DIR, { recursive: true })
const receipt = {
  protocol:
    'green → per-needle red (fresh isolated tree each, full directed set) → restored green → final replay',
  createdAt: new Date().toISOString(),
  judgeCriteria:
    '四态同判据:进程层(exit/signal/spawnError) + 非空 file×fullName 执行集逐字锁定 + 计数/明细一致 + 非空 suite.message 拒收 + 零断言 failed suite 拒收 + stdout/stderr 无 unhandled + 红态在全部 6 个定向文件上恰一指定业务 AssertionError',
  testFiles: TEST_FILES,
  testFileSha256: Object.fromEntries(
    TEST_FILES.map((f) => [f, sha256Of(path.join(REPO, 'packages/editor', f))]),
  ),
}

// Phase 0a:判据自证(合成反例)。
receipt.judgeSelfTest = judgeSelfTest(TEST_FILES)

// Phase 1:原始绿(六文件定向集)+ 探针。
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
  if (greenRows.length !== EXPECTED_TOTAL)
    fail(`green 执行集 ${greenRows.length} 行,预期 ${EXPECTED_TOTAL}`)
  receipt.green = { process: runSummary(greenRun), executionSet: greenRows }
  // 探针复用同一棵原始树(探针文件用后即删)。
  receipt.judgeProbes = runJudgeProbes(greenTree, RUNS_DIR)
} finally {
  receipt.greenCleanup = greenTree.cleanup()
}
const greenRows = receipt.green.executionSet

// Phase 2:逐针红(增量落盘回执,失败时保留现场证据)。
receipt.needles = []
const persistReceipt = () => {
  persistJson(path.join(EVIDENCE_DIR, 'counterproof.json'), JSON.stringify(receipt, null, 2))
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
    // 红相位跑全部定向文件:恰一红必须跨文件成立(无附带旧测红)。
    const run = runVitestJson(
      tree.pkg,
      TEST_FILES,
      path.join(RUNS_DIR, `${needle.id}.raw`),
      path.join(RUNS_DIR, `${needle.id}.json`),
    )
    const problems = judgeRed(run, greenRows, TEST_FILES, needle.fullName, needle.marker)
    const failed = run.tests.filter((t) => t.status === 'failed')
    receipt.needles.push({
      id: needle.id,
      axis: needle.axis,
      mutation: {
        file: `packages/editor/${needle.file}`,
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

// Phase 3:还原绿(全新原始树,执行集与 Phase 1 快照逐字一致;针目标文件字节与工作树一致)。
const restoredTree = buildIsolatedTree('restored-green')
try {
  for (const needle of NEEDLES) {
    const treeSha = sha256Of(path.join(restoredTree.pkg, needle.file))
    const workSha = sha256Of(path.join(REPO, 'packages/editor', needle.file))
    if (treeSha !== workSha)
      fail(`restored-green: ${needle.file} 字节与工作树不一致(${treeSha} != ${workSha})`)
  }
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
    needleTargetFilesMatchWorkspace: true,
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
    TEST_FILES,
    path.join(RUNS_DIR, 'final-replay.raw'),
    path.join(RUNS_DIR, 'final-replay.json'),
  )
  const problems = judgeRed(run, greenRows, TEST_FILES, replayNeedle.fullName, replayNeedle.marker)
  if (problems.length) fail(`final-replay 判据失败: ${problems.join('; ')}`)
  receipt.finalReplay = {
    needle: replayNeedle.id,
    judge: 'VALID',
    process: runSummary(run),
  }
} finally {
  receipt.finalReplayCleanup = replayTree.cleanup()
}

persistReceipt()
console.log(
  `counterproof OK: ${NEEDLES.length} needles VALID, green rows=${greenRows.length}, receipt=${path.join(EVIDENCE_DIR, 'counterproof.json')}`,
)
