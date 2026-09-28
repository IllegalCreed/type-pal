/** TEST-GLM-LEAF-WORKFLOWS-1 八批共用单点业务负控；不改生产源/旧测试/覆盖口径。
 * 判据形状复用 docs/testing/glm-state-commands/tools/state-commands-mutants.mjs（未改动原工具）：
 * 绑定同一失败记录的绝对文件与 Vitest 实际 fullName、恰一红、恰 exit1，逐条 failureMessages
 * 拒混错/timeout；load 实际命中写入运行态见证；判据自测与实跑走同一 judge 函数。
 * 用法：node leaf-mutants.mjs <a|b|c|d|e|f|g|h>
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-glm-leaf-mutants-'))
// 反引号字符，供拼接含模板字面量的 needle；避免触发 noTemplateCurlyInString。
const BT = String.fromCharCode(96)

/** 每批注册：包根、控制跑范围（该批全部新测试文件）、以及该批代表单点针。 */
const batches = {
  a: {
    packageRoot: resolve(root, 'packages/editor'),
    production: [
      'src/ui/design-system/select.tsx',
      'src/ui/design-system/multi-select.tsx',
      'src/ui/design-system/number-inputs.tsx',
      'src/ui/design-system/draft-input-state.ts',
      'src/ui/design-system/list-header.tsx',
      'src/ui/design-system/media.tsx',
    ],
    control: {
      tests: [
        'src/ui/design-system/select.glm-leaf-wave.test.tsx',
        'src/ui/design-system/multi-select.glm-leaf-wave.test.tsx',
        'src/ui/design-system/number-inputs.glm-leaf-wave.test.tsx',
        'src/ui/design-system/list-header.glm-leaf-wave.test.tsx',
        'src/ui/design-system/media.glm-leaf-wave.test.tsx',
      ],
      total: 25,
    },
    mutations: [
      {
        id: 'multiselect-select-all-adds-disabled',
        module: 'src/ui/design-system/multi-select.tsx',
        file: 'src/ui/design-system/multi-select.glm-leaf-wave.test.tsx',
        total: 7,
        describe: 'DsMultiSelect 剩余合同',
        title: 'select-all keeps prior values, follows the filter and never adds disabled options',
        from: '                if (!option.disabled) next.add(option.value)',
        to: '                if (true) next.add(option.value)',
        category: '禁用过滤拆除：全选把禁用项混入已选值',
      },
      {
        id: 'draft-number-same-value-recommit',
        module: 'src/ui/design-system/number-inputs.tsx',
        file: 'src/ui/design-system/number-inputs.glm-leaf-wave.test.tsx',
        total: 7,
        describe: 'DsDraftNumberInput 剩余合同',
        title: 'Enter and blur commit canonical values; Escape cancels; same value never recommits',
        from: '        return normalized === value ? false : onCommit(normalized)',
        to: '        return onCommit(normalized)',
        category: '提交取消拆除：同值草稿重复外发 onCommit',
      },
    ],
  },
  b: {
    packageRoot: resolve(root, 'packages/editor'),
    production: [
      'src/ui/design-system/navigation.tsx',
      'src/ui/design-system/virtual-list.tsx',
      'src/ui/design-system/reorder.tsx',
      'src/ui/design-system/overlays.tsx',
      'src/ui/design-system/add-picker.tsx',
    ],
    control: {
      tests: [
        'src/ui/design-system/navigation.glm-leaf-wave.test.tsx',
        'src/ui/design-system/virtual-list.glm-leaf-wave.test.tsx',
        'src/ui/design-system/reorder.glm-leaf-wave.test.tsx',
        'src/ui/design-system/overlays.glm-leaf-wave.test.tsx',
      ],
      total: 28,
    },
    mutations: [
      {
        id: 'reorder-move-walk-ignores-drop-disabled',
        module: 'src/ui/design-system/reorder.tsx',
        file: 'src/ui/design-system/reorder.glm-leaf-wave.test.tsx',
        total: 10,
        describe: 'DsReorderMoveButton 剩余合同',
        title: 'walks over drop-disabled chains and disables at boundaries and collection locks',
        from: '    entries[target]?.dropDisabled',
        to: '    false && entries[target]?.dropDisabled',
        category: '边界移动拆除：移动目标解析跳过 dropDisabled 链的合同失效',
      },
      {
        id: 'dialog-close-focus-restore-drop',
        module: 'src/ui/design-system/overlays.tsx',
        file: 'src/ui/design-system/overlays.glm-leaf-wave.test.tsx',
        total: 6,
        describe: 'DsDrawer 剩余合同',
        title: 'opens with body focus, closes once from the close button and restores opener focus',
        from: ': null\n      target?.focus()',
        to: ': null\n      void target',
        category: '关闭恢复拆除：弹层关闭后不再恢复触发器焦点',
      },
    ],
  },
  c: {
    packageRoot: resolve(root, 'packages/editor'),
    production: [
      'src/ui/ImageAssetPicker.tsx',
      'src/ui/MusicPicker.tsx',
      'src/ui/SoundPicker.tsx',
      'src/ui/PortraitEditor.tsx',
      'src/ui/ProjectAudioPreviewButton.tsx',
      'src/ui/PanelResizeHandle.tsx',
      'src/ui/IsometricEditorToolbar.tsx',
    ],
    control: {
      tests: [
        'src/ui/ImageAssetPicker.glm-leaf-wave.test.tsx',
        'src/ui/MusicPicker.glm-leaf-wave.test.tsx',
        'src/ui/SoundPicker.glm-leaf-wave.test.tsx',
        'src/ui/PortraitEditor.glm-leaf-wave.test.tsx',
        'src/ui/ProjectAudioPreviewButton.glm-leaf-wave.test.tsx',
        'src/ui/PanelResizeHandle.glm-leaf-wave.test.tsx',
        'src/ui/IsometricEditorToolbar.glm-leaf-wave.test.tsx',
      ],
      total: 28,
    },
    mutations: [
      {
        id: 'music-stop-sentinel-mapped-to-id',
        module: 'src/ui/MusicPicker.tsx',
        file: 'src/ui/MusicPicker.glm-leaf-wave.test.tsx',
        total: 4,
        describe: 'MusicPicker 剩余合同',
        title: 'commits plain selections and (延续上一曲)/(停止音乐) sentinels exactly',
        from: 'next === STOP ? null : next',
        to: "next === STOP ? 'music.lab.001' : next",
        category: '类型哨兵拆除：停止音乐被映射回具体曲目而非 null',
      },
      {
        id: 'sound-preview-error-swallowed',
        module: 'src/ui/SoundPicker.tsx',
        file: 'src/ui/SoundPicker.glm-leaf-wave.test.tsx',
        total: 5,
        describe: 'SoundPicker 剩余合同',
        title: 'surfaces a visible preview error when the reader rejects the asset',
        from: 'setError(cause instanceof Error ? cause.message : String(cause))',
        to: 'void cause',
        category: '失败状态拆除：试听失败不再显示可读错误',
      },
    ],
  },
  d: {
    packageRoot: resolve(root, 'packages/editor'),
    production: [
      'src/ui/editor-target.ts',
      'src/ui/editor-navigation.ts',
      'src/ui/map-selection-overlay.ts',
      'src/ui/MapSelectionInspector.tsx',
      'src/ui/StampPlacementSelectionInspector.tsx',
      'src/ui/StampContentEditor.tsx',
      'src/ui/StampTemplateDialog.tsx',
    ],
    control: {
      tests: [
        'src/ui/editor-target.glm-leaf-wave.test.ts',
        'src/ui/map-selection-overlay.glm-leaf-wave.test.ts',
        'src/ui/MapSelectionInspector.glm-leaf-wave.test.tsx',
        'src/ui/StampPlacementSelectionInspector.glm-leaf-wave.test.tsx',
        'src/ui/StampContentEditor.glm-leaf-wave.test.tsx',
        'src/ui/StampTemplateDialog.glm-leaf-wave.test.tsx',
      ],
      total: 33,
    },
    mutations: [
      {
        id: 'overlay-boundary-dedup-drop',
        module: 'src/ui/map-selection-overlay.ts',
        file: 'src/ui/map-selection-overlay.glm-leaf-wave.test.ts',
        total: 7,
        describe: 'mapSelectionBoundarySegments 剩余合同',
        title: 'edge-adjacent diamonds cancel the shared edge on the staggered lattice',
        from: 'if (boundary.has(key)) boundary.delete(key)',
        to: 'if (false) boundary.delete(key)',
        category: '同实参保真拆除：相邻共享边不再互相抵消，外轮廓翻倍',
      },
      {
        id: 'inspector-tileid-validation-drop',
        module: 'src/ui/MapSelectionInspector.tsx',
        file: 'src/ui/MapSelectionInspector.glm-leaf-wave.test.tsx',
        total: 5,
        describe: 'MapSelectionInspector 剩余合同',
        title:
          'invalid tile and collision inputs report through onValidationError without patching',
        from: "    const value = Number(raw)\n    if (!Number.isInteger(value) || value < 0) {\n      const message = 'tileId 必须是非负整数。'",
        to: "    const value = Number(raw)\n    if (false) {\n      const message = 'tileId 必须是非负整数。'",
        category: '数值校验拆除：负数 tileId 直接下发补丁',
      },
    ],
  },
  e: {
    packageRoot: resolve(root, 'packages/editor'),
    production: [
      'src/ui/PoisonTab.tsx',
      'src/ui/VarsTab.tsx',
      'src/ui/ShopTab.tsx',
      'src/ui/ItemAlchemyTab.tsx',
      'src/ui/ItemAlchemyEditors.tsx',
      'src/core/poison-commands.ts',
      'src/core/world-variable-commands.ts',
      'src/core/shop-commands.ts',
    ],
    control: {
      tests: [
        'src/ui/PoisonTab.glm-leaf-wave.test.tsx',
        'src/ui/VarsTab.glm-leaf-wave.test.tsx',
        'src/ui/ShopTab.glm-leaf-wave.test.tsx',
        'src/ui/ItemAlchemyTab.glm-leaf-wave.test.tsx',
      ],
      total: 12,
    },
    mutations: [
      {
        id: 'shop-delist-filter-inverted',
        module: 'src/ui/ShopTab.tsx',
        file: 'src/ui/ShopTab.glm-leaf-wave.test.tsx',
        total: 2,
        describe: 'ShopTab 剩余合同',
        title: 'delisting one stock entry commits exactly once and undo restores the order',
        from: 'shop.items.filter((_, j) => j !== i)',
        to: 'shop.items.filter((_, j) => j === i)',
        category: '下架语义反转：保留的恰是被下架的单件',
      },
      {
        id: 'world-variable-dup-silent-overwrite',
        module: 'src/core/world-variable-commands.ts',
        file: 'src/ui/VarsTab.glm-leaf-wave.test.tsx',
        total: 3,
        describe: 'VarsTab 剩余合同',
        title: 'duplicate ids are a silent no-op and reserved sys: ids surface the guard copy',
        from: 'if (state.worldVariables?.[this.id]) return state',
        to: 'if (false) return state',
        category: '唯一 owner 拆除：重复 id 直接覆盖既有定义',
      },
    ],
  },
  f: {
    packageRoot: resolve(root, 'packages/editor'),
    production: [
      'src/ui/BattleFieldTab.tsx',
      'src/ui/CasualtyEditor.tsx',
      'src/ui/ScriptSceneHookInspector.tsx',
      'src/ui/ScriptBehaviorInspector.tsx',
      'src/ui/enemy-defeated-events.ts',
    ],
    control: {
      tests: [
        'src/ui/BattleFieldTab.glm-leaf-wave.test.tsx',
        'src/ui/CasualtyEditor.glm-leaf-wave.test.tsx',
        'src/ui/ScriptSceneHookInspector.glm-leaf-wave.test.tsx',
        'src/ui/ScriptBehaviorInspector.glm-leaf-wave.test.tsx',
        'src/ui/enemy-defeated-events.glm-leaf-wave.test.ts',
      ],
      total: 16,
    },
    mutations: [
      {
        id: 'reward-replace-probability-inverted',
        module: 'src/ui/enemy-defeated-events.ts',
        file: 'src/ui/enemy-defeated-events.glm-leaf-wave.test.ts',
        total: 5,
        describe: 'replaceEditableEnemyDefeatedItemReward 剩余合同',
        title: 'rewrites probability branch, item and keeps the trailing dialog text',
        from: "cond: { kind: 'chance', percent: 100 - next.probability },",
        to: "cond: { kind: 'chance', percent: next.probability },",
        category: '奖励替换反转：掉落概率写成其补数',
      },
      {
        id: 'casualty-chance-floor-drop',
        module: 'src/ui/CasualtyEditor.tsx',
        file: 'src/ui/CasualtyEditor.glm-leaf-wave.test.tsx',
        total: 3,
        describe: 'CasualtyEditor 剩余合同',
        title: 'chance gates write integers once per blur and undo restores the prior value',
        from: 'normalize={(value) => Math.max(1, Math.min(100, Math.trunc(value)))}',
        to: 'normalize={(value) => Math.max(1, Math.min(100, value))}',
        category: '概率取整拆除：非整数概率直接写库',
      },
    ],
  },
  g: {
    packageRoot: resolve(root, 'packages/editor'),
    production: [
      'src/core/asset-diagnostics.ts',
      'src/core/video-metadata.ts',
      'src/core/command-asset-record.ts',
      'src/core/battle-data-references.ts',
      'src/core/item-references.ts',
      'src/core/script-references.ts',
      'src/core/stamp-ownership.ts',
      'src/core/stamp-placement.ts',
    ],
    control: {
      tests: [
        'src/core/asset-diagnostics.glm-leaf-wave.test.ts',
        'src/core/command-asset-record.glm-leaf-wave.test.ts',
        'src/core/item-references.glm-leaf-wave.test.ts',
        'src/core/script-references.glm-leaf-wave.test.ts',
        'src/core/stamp-placement.glm-leaf-wave.test.ts',
      ],
      total: 21,
    },
    mutations: [
      {
        id: 'asset-record-gzip-head-drop',
        module: 'src/core/command-asset-record.ts',
        file: 'src/core/command-asset-record.glm-leaf-wave.test.ts',
        total: 6,
        describe: 'assert*Record 剩余合同',
        title:
          'sprite and battle-sprite guards enforce their own kinds with the same bytes contract',
        from: "  const view = new Uint8Array(bytes)\n  if (view[0] !== 0x1f || view[1] !== 0x8b) throw new Error('战斗精灵资源必须是 canonical gzip')",
        to: "  const view = new Uint8Array(bytes)\n  if (false) throw new Error('战斗精灵资源必须是 canonical gzip')",
        category: 'record 头部校验拆除：非 gzip 字节被当战斗精灵资产接受',
      },
      {
        id: 'stamp-placement-suffix-one',
        module: 'src/core/stamp-placement.ts',
        file: 'src/core/stamp-placement.glm-leaf-wave.test.ts',
        total: 4,
        describe: 'stamp-placement 剩余合同',
        title: 'nextStampPlacementId sanitizes and dedupes existing ids',
        from: '  if (!used.has(stem)) return stem\n  for (let index = 2; ; index++) {',
        to: '  if (!used.has(stem)) return stem\n  for (let index = 1; ; index++) {',
        category: 'ID 边界拆除：首个候选后缀从 1 起与既有序号语义漂移',
      },
    ],
  },
  h: {
    packageRoot: resolve(root, 'packages/content'),
    production: [
      'src/frame-sequence.ts',
      'src/script-library.ts',
      'src/world-variable.ts',
      'src/stamp.ts',
      'src/migration-diagnostic.ts',
      'src/map-index.ts',
      'src/tileset.ts',
    ],
    control: {
      tests: [
        'src/frame-sequence.glm-leaf-wave.test.ts',
        'src/script-library.glm-leaf-wave.test.ts',
        'src/world-variable.glm-leaf-wave.test.ts',
        'src/stamp.glm-leaf-wave.test.ts',
        'src/migration-diagnostic.glm-leaf-wave.test.ts',
        'src/map-index.glm-leaf-wave.test.ts',
        'src/tileset.glm-leaf-wave.test.ts',
      ],
      total: 24,
    },
    mutations: [
      {
        id: 'stamp-anchor-bounds-drop',
        module: 'src/stamp.ts',
        file: 'src/stamp.glm-leaf-wave.test.ts',
        total: 3,
        describe: 'stamp 剩余合同',
        title: 'rejects duplicate ids, slash ids, empty visuals and out-of-surface anchors',
        from: ['throw new Error(', BT, '$', '{path}.anchor: 锚点超出局部 surface', BT, ')'].join(
          '',
        ),
        to: 'void 0',
        category: '合法边界拆除：越界锚点被接受',
      },
      {
        id: 'script-library-empty-chunk-keep',
        module: 'src/script-library.ts',
        file: 'src/script-library.glm-leaf-wave.test.ts',
        total: 4,
        describe: 'script-library 剩余合同',
        title: 'remove deletes the library entry and the emptied chunk, failing loudly when absent',
        from: '  if (Object.keys(ownerChunk.scripts).length === 0) delete nextChunks[owner]',
        to: '  if (false) delete nextChunks[owner]',
        category: '分域清理拆除：清空后的 chunk 不再移除',
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
assert.ok(mutation_batch, `usage: node leaf-mutants.mjs <${Object.keys(batches).join('|')}>`)

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
plugins:mutation?[{name:'isolated-glm-leaf',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(mutation.from).length!==2)throw Error('needle not unique');writeFileSync(${JSON.stringify(entered)},JSON.stringify({id:mutation.id,target}));return source.replace(mutation.from,mutation.to)}}]:[],
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
