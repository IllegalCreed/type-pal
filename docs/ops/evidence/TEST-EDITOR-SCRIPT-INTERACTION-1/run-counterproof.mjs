// TEST-EDITOR-SCRIPT-INTERACTION-1 反控 runner（按需证据工具，不进默认 runner）。
// 判据只读复用 docs/ops/evidence/TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/lib-isolated-tree.mjs
// （runVitestJson/executionSetOf/judgeGreen/judgeRed/judgeSelfTest/runJudgeProbes/sha 工具）；
// 不搬上一卡的固定源/文件/计数常量：本卡的树、冻结源、测试文件、变异都在本文件定义。
//
// 每针独立 mkdtemp 树（/tmp），复制 packages/editor 的 src/配置，node_modules 软链本 worktree
// 安装（只读复用，不 install 共享）。建树后逐文件核冻结源 sha256 与任务卡一致；四相位：
// 原始绿 → 变异红（恰一指定业务 AssertionError）→ 真正恢复绿 → 末次重放，同判据联判；
// 变异 find 串必须在冻结源中恰出现一次，恢复字节必须等于原始冻结字节，finally 整树删除并留清理证明。
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import {
  executionSetOf,
  judgeGreen,
  judgeRed,
  judgeSelfTest,
  persistJson,
  REPO,
  runJudgeProbes,
  runVitestJson,
  sha256Of,
  writeRaw,
} from '../TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/lib-isolated-tree.mjs'

const EDITOR = path.join(REPO, 'packages/editor')
const EVIDENCE = import.meta.dirname
const COUNTERS = path.join(EVIDENCE, 'counters')
const TEST_FILE = 'src/ui/ScriptEditor.interaction-boundaries.test.tsx'
const EXPECTED_FILES = [TEST_FILE]

// 任务卡冻结源（targets.json 同值）；树内逐文件校验。
export const FROZEN_SOURCES = {
  'src/ui/ScriptEditor.tsx': '880e1af383d3ee45c02b66d7b51bc62ff3fa65f12f9606697f399d6d1b8cf441',
  'src/core/author-command-edit.ts':
    '58827d36cc7530478da0752d6bf73ec4a32ffe08db98bd79c68b8242660da63b',
  'src/ui/SharedScriptTab.tsx': '0cf43c2b0d98971cf12d9c504ad475985b07e6658bb4b43fabae50c687ec2aad',
}

const NEEDLES = [
  {
    id: 'A2-stale-raf-guard',
    title: 'A2 过期定位帧被新 revision 淘汰',
    marker: 'A2 过期帧不得定位旧行',
    find: '    window.requestAnimationFrame(() => {\n      if (lastAppliedFocusRevisionRef.current !== props.focusRevision) return\n',
    replace: '    window.requestAnimationFrame(() => {\n',
  },
  {
    id: 'A4a-insert-discard',
    title: 'A4 插入面板：外部正文真正变化时撤销',
    marker: 'A4 外部真变化必须撤销插入面板',
    find: '      if (bodyChanged && !locallyOwned) {\n        if (selectedIdentityChanged) setSelectedPath(undefined)\n        setEditingDraft(undefined)\n        setInsertPath(undefined)\n',
    replace:
      '      if (bodyChanged && !locallyOwned) {\n        if (selectedIdentityChanged) setSelectedPath(undefined)\n        setEditingDraft(undefined)\n',
  },
  {
    id: 'A4b-insert-survives-same-value',
    title: 'A4 插入面板：同值新引用重渲染不误当变化',
    marker: 'A4 同值新引用不得误当外部变化',
    find: 'const bodyChanged = lastSeenBodyFingerprintRef.current !== fingerprint',
    replace: 'const bodyChanged = true',
  },
  {
    id: 'A5-rejected-copy',
    title: 'A5 复制被拒',
    marker: 'A5 被拒复制不得改选到虚假副本位',
    find: '            onCopy={(path) => {\n              const parsed = parseAuthorCommandPath(path)\n              if (commit(copyAuthorCommandAt(props.body, parsed)))\n                setSelectedPath(commandPathAfterInsert(parsed))\n            }}',
    replace:
      '            onCopy={(path) => {\n              const parsed = parseAuthorCommandPath(path)\n              commit(copyAuthorCommandAt(props.body, parsed))\n              setSelectedPath(commandPathAfterInsert(parsed))\n            }}',
  },
  {
    id: 'A6-rejected-remove',
    title: 'A6 删除被拒',
    marker: 'A6 被拒删除不得丢弃编辑草稿弹层',
    find: '            onRemove={(path) => {\n              if (commit(removeAuthorCommandAt(props.body, parseAuthorCommandPath(path)))) {\n                setSelectedPath(undefined)\n                setEditingDraft(undefined)\n              }\n            }}',
    replace:
      '            onRemove={(path) => {\n              commit(removeAuthorCommandAt(props.body, parseAuthorCommandPath(path)))\n              setSelectedPath(undefined)\n              setEditingDraft(undefined)\n            }}',
  },
  {
    // 干跑判例：变异 CommandRows 包装层的 if (changed) reorderKeys.move 无效——useDsReorderKeys
    // 每次渲染按对象身份调和，props.body 未变时内部 key 自动复位，不可观察。有效针改为
    // 拒绝路径仍重映射选择（setSelectedPath 提到 commit 检查之前）。
    id: 'A7-rejected-nested-reorder',
    title: 'A7 嵌套重排被拒',
    marker: 'A7 被拒重排不得把选择重映射到新位置',
    find: '            onReorder={(parentPath, intent) => {\n              const path = [...parentPath, intent.fromIndex]\n              const next = moveAuthorCommandToIndex(props.body, path, intent.toIndex)\n              if (next === props.body || !commit(next)) return false\n              setSelectedPath((current) =>\n                remapSiblingPath(current, parentPath, intent.fromIndex, intent.toIndex),\n              )\n              return true\n            }}',
    replace:
      '            onReorder={(parentPath, intent) => {\n              const path = [...parentPath, intent.fromIndex]\n              const next = moveAuthorCommandToIndex(props.body, path, intent.toIndex)\n              setSelectedPath((current) =>\n                remapSiblingPath(current, parentPath, intent.fromIndex, intent.toIndex),\n              )\n              if (next === props.body || !commit(next)) return false\n              return true\n            }}',
  },
  {
    id: 'A8-keyboard-domain-guard',
    title: 'A8 键盘事件域',
    marker: 'A8 子按钮键盘事件冒泡不得改选所在行',
    find: '                    if (event.currentTarget !== event.target) return\n',
    replace: '',
  },
]

export function buildEditorTree(tag) {
  // 树根固定 /tmp（与判据库同坑规避：/var/folders 下 vite 拒软链 node_modules，/tmp 实测正常）。
  const tmp = mkdtempSync(path.join('/tmp', `tp-editor-script-interaction-${tag}.`))
  try {
    const pkg = path.join(tmp, 'packages/editor')
    mkdirSync(pkg, { recursive: true })
    cpSync(path.join(EDITOR, 'src'), path.join(pkg, 'src'), { recursive: true })
    for (const name of ['package.json', 'tsconfig.json', 'index.html']) {
      cpSync(path.join(EDITOR, name), path.join(pkg, name))
    }
    // 判例（TEST-GLM-EDITOR-AUTHOR-COMMAND-CONTRACTS-1）：软链 node_modules 之外继续解析
    // workspace 包会撞 vite fs.allow（Denied ID 指回 worktree 真实路径）。原配置改名为
    // vite.base.config.ts，树内生成 wrapper 只追加 fs.allow（本树 + 只读复用的 worktree 根），
    // 不改任何测试/产品配置语义；该 wrapper 只存在于一次性隔离树。
    cpSync(path.join(EDITOR, 'vite.config.ts'), path.join(pkg, 'vite.base.config.ts'))
    writeFileSync(
      path.join(pkg, 'vite.config.ts'),
      [
        "import { dirname, resolve } from 'node:path'",
        "import { fileURLToPath } from 'node:url'",
        "import { mergeConfig } from 'vite'",
        "import base from './vite.base.config.ts'",
        '',
        'const treeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")',
        'export default mergeConfig(base, {',
        '  server: { fs: { allow: [treeRoot, @@REPO@@] } },',
        '})',
        '',
      ]
        .join('\n')
        .replaceAll('@@REPO@@', JSON.stringify(REPO)),
    )
    symlinkSync(path.join(EDITOR, 'node_modules'), path.join(pkg, 'node_modules'), 'dir')
    symlinkSync(path.join(REPO, 'node_modules'), path.join(tmp, 'node_modules'), 'dir')
    cpSync(path.join(REPO, 'tsconfig.base.json'), path.join(tmp, 'tsconfig.base.json'))
    for (const [rel, expected] of Object.entries(FROZEN_SOURCES)) {
      const got = sha256Of(path.join(pkg, rel))
      if (got !== expected) {
        throw new Error(`isolated tree is not the frozen product: ${rel} sha256=${got}`)
      }
    }
    return {
      tmp,
      pkg,
      cleanup: () => {
        rmSync(tmp, { recursive: true, force: true })
        return `removed=${!existsSync(tmp)} path=${tmp}`
      },
    }
  } catch (error) {
    rmSync(tmp, { recursive: true, force: true })
    throw error
  }
}

function phaseRun(tree, dir, name) {
  return runVitestJson(
    tree.pkg,
    EXPECTED_FILES,
    path.join(dir, `${name}.raw`),
    path.join(dir, `${name}.json`),
  )
}

function fullNameOf(rows, title) {
  const hits = rows.filter((row) => row.includes(title))
  if (hits.length !== 1) {
    throw new Error(`title ${title} matched ${hits.length} rows: ${hits.join(' | ')}`)
  }
  const hit = hits[0]
  return hit.slice(hit.indexOf(' :: ') + 4)
}

function processSummary(run) {
  return {
    exit: run.exit,
    signal: run.signal,
    pid: run.pid,
    spawnError: run.spawnError,
    unhandledInOutput: run.unhandledInOutput,
    numTotalTests: run.report.numTotalTests,
    numPassedTests: run.report.numPassedTests,
    numFailedTests: run.report.numFailedTests,
    raw: { file: path.relative(EVIDENCE, run.rawFile), sha256: run.rawSha256 },
    json: { file: path.relative(EVIDENCE, run.jsonFile), sha256: run.jsonSha256 },
  }
}

async function main() {
  mkdirSync(COUNTERS, { recursive: true })
  const receipt = {
    task: 'TEST-EDITOR-SCRIPT-INTERACTION-1',
    judgeLib:
      '../TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/lib-isolated-tree.mjs（只读复用判据，不搬上一卡常量）',
    testFile: TEST_FILE,
    selfTest: judgeSelfTest(EXPECTED_FILES),
    frozenSources: FROZEN_SOURCES,
    needles: [],
  }

  // 基线树：原始绿（提供执行身份多重集基准）+ 真实 Vitest 探针。
  const baselineDir = path.join(COUNTERS, 'baseline')
  mkdirSync(baselineDir, { recursive: true })
  const baselineTree = buildEditorTree('baseline')
  try {
    const green = phaseRun(baselineTree, baselineDir, 'green')
    const rows = executionSetOf(green, EXPECTED_FILES)
    const greenProblems = judgeGreen(green, rows, EXPECTED_FILES)
    if (greenProblems.length) {
      throw new Error(`baseline green rejected: ${greenProblems.join('; ')}`)
    }
    receipt.baseline = processSummary(green)
    receipt.executionRows = rows
    receipt.probes = runJudgeProbes(baselineTree, path.join(COUNTERS, 'probes'))
  } finally {
    receipt.baselineCleanup = baselineTree.cleanup()
  }

  for (const needle of NEEDLES) {
    const dir = path.join(COUNTERS, needle.id)
    mkdirSync(dir, { recursive: true })
    const tree = buildEditorTree(needle.id)
    const entry = { id: needle.id, title: needle.title, marker: needle.marker }
    try {
      const sourcePath = path.join(tree.pkg, 'src/ui/ScriptEditor.tsx')
      const testPath = path.join(tree.pkg, TEST_FILE)
      const originalSource = readFileSync(sourcePath)
      entry.sourceSha256 = sha256Of(sourcePath)
      entry.testSha256 = sha256Of(testPath)
      if (entry.sourceSha256 !== FROZEN_SOURCES['src/ui/ScriptEditor.tsx']) {
        throw new Error(`${needle.id}: tree source drifted before mutation`)
      }

      const rows = receipt.executionRows
      const failedFullName = fullNameOf(rows, needle.title)

      const green = phaseRun(tree, dir, 'green')
      entry.green = { problems: judgeGreen(green, rows, EXPECTED_FILES), ...processSummary(green) }

      const mutated = originalSource.toString('utf8').replace(needle.find, needle.replace)
      if (mutated === originalSource.toString('utf8')) {
        throw new Error(`${needle.id}: mutation find-string not found`)
      }
      if (originalSource.toString('utf8').split(needle.find).length !== 2) {
        throw new Error(`${needle.id}: mutation find-string not unique`)
      }
      writeFileSync(sourcePath, mutated)
      entry.mutantSha256 = sha256Of(sourcePath)

      const red = phaseRun(tree, dir, 'red')
      entry.red = {
        problems: judgeRed(red, rows, EXPECTED_FILES, failedFullName, needle.marker),
        failedFullName,
        ...processSummary(red),
      }

      writeFileSync(sourcePath, originalSource)
      entry.restoredSha256 = sha256Of(sourcePath)
      if (entry.restoredSha256 !== entry.sourceSha256) {
        throw new Error(`${needle.id}: restore bytes differ from frozen original`)
      }

      const replay = phaseRun(tree, dir, 'replay')
      entry.replay = {
        problems: judgeGreen(replay, rows, EXPECTED_FILES),
        ...processSummary(replay),
      }

      const accepted = [
        entry.green.problems.length === 0,
        entry.red.problems.length === 0,
        entry.replay.problems.length === 0,
        entry.restoredSha256 === entry.sourceSha256,
      ].every(Boolean)
      entry.accepted = accepted
      if (!accepted) {
        throw new Error(`${needle.id}: counterproof phase rejected — see counters/${needle.id}`)
      }
    } finally {
      entry.cleanup = tree.cleanup()
    }
    receipt.needles.push(entry)
  }

  const receiptFile = path.join(EVIDENCE, 'counter-receipt.json')
  const receiptSha = persistJson(receiptFile, JSON.stringify(receipt, null, 2))
  writeRaw(path.join(EVIDENCE, 'counter-receipt.sha256'), `${receiptSha}\n`)
  console.log(
    `counterproof accepted: ${receipt.needles.length}/${NEEDLES.length} needles; receipt sha256=${receiptSha}`,
  )
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main()
}
