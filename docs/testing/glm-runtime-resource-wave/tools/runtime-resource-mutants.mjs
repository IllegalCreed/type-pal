/** TEST-GLM-RUNTIME-RESOURCE-2 各批共用单点业务反控 runner；不改生产源/旧测试/覆盖口径。
 * 判据与 docs/testing/glm-state-commands/tools/state-commands-mutants.mjs 同语义：
 * 对照恰 exit0 全绿；变异恰 exit1、恰一红、红记录绝对文件与 Vitest 实际 fullName 命中、
 * failureMessages 逐条拒混错/timeout/零执行；隔离 loader 只在临时副本 config 注入，
 * 前后产品 hash 不变；判据自测与实跑走同一 judge。用法：node runtime-resource-mutants.mjs <batch>
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
const output = mkdtempSync(join(tmpdir(), 'type-pal-glm-runtime-resource-mutants-'))

/** 每批注册：包根、对照跑范围与总数、该批 2 个单点针。 */
const batches = {
  g: {
    packages: [
      {
        root: resolve(root, 'packages/reforge'),
        tests: ['src/project-map.glm-runtime-resource.test.ts'],
        total: 2,
      },
      {
        root: resolve(root, 'packages/migrate'),
        tests: [
          'src/script-library-normalize.glm-runtime-resource.test.ts',
          'src/project-map-converter.glm-runtime-resource.test.ts',
          'src/script-control-flow-audit.glm-runtime-resource.test.ts',
          'src/script-library-normalize.test.ts',
          'src/script-overlays.test.ts',
          'src/project-map-converter.test.ts',
          'src/project-map-converter.boundaries.test.ts',
          'src/bake-indexed-rgba.test.ts',
        ],
        total: 25,
      },
    ],
    production: [
      'reforge/src/project-map.ts',
      'migrate/src/script-library-normalize.ts',
      'migrate/src/project-map-converter.ts',
      'migrate/src/script-control-flow-audit.ts',
    ],
    mutations: [
      {
        id: 'layer-id-gap-backfill-dropped',
        module: 'reforge/src/project-map.ts',
        package: 0,
        file: 'src/project-map.glm-runtime-resource.test.ts',
        total: 2,
        describe: 'R25 nextProjectMapLayerId',
        title: '仅 floor 层 → layer-1；已有 layer-1/2 → layer-3',
        from: 'for (let n = 1; ; n++) {',
        to: 'for (let n = 2; ; n++) {',
        category: '层 id 序起点错位：新建层永远跳过 layer-1，id 序合同被破坏',
      },
      {
        id: 'zero-pointer-classification-swapped',
        module: 'migrate/src/script-control-flow-audit.ts',
        package: 1,
        file: 'src/script-control-flow-audit.glm-runtime-resource.test.ts',
        total: 4,
        describe: 'R28 collectSourceEntrySites',
        title:
          '0/缺席指针 → empty-pointers 分类（scene L_0、item equip、actor dying、enemy 尾字段）',
        from: "else emptyPointers.push({ sourceId: site.sourceId, disposition: 'empty-pointer' })",
        to: "else emptyPointers.push({ sourceId: site.sourceId, disposition: 'zero-marker' })",
        category: '0 指针处置标记破坏：empty-pointer 分类被改名，下游按处置过滤/统计的消费者失配',
      },
    ],
  },
  f: {
    packageRoot: resolve(root, 'packages/migrate'),
    production: ['src/pal-battle-sprites.ts'],
    control: {
      tests: [
        'src/pal-battle-sprites.glm-runtime-resource.test.ts',
        'src/pal-world-sprite-layouts.test.ts',
        'src/pal-sprite-action-materialize.test.ts',
        'src/pal-world-sprite-semantic-alias.test.ts',
        'src/pal-item-scheme-labels.test.ts',
        'src/pal-store-boundary.test.ts',
        'src/pal-casualty-scripts.test.ts',
        'src/music-reference-audit.test.ts',
      ],
      total: 42,
    },
    mutations: [
      {
        id: 'player-steal-frame-threshold-lowered',
        module: 'src/pal-battle-sprites.ts',
        file: 'src/pal-battle-sprites.glm-runtime-resource.test.ts',
        total: 8,
        describe: 'R21 createPalPlayerBattleSpriteDefinitions',
        title: '常量输入 → 19 定义；fighter 帧映射/steal 条件/effect base 手算',
        from: '...(frameCount > 10 ? { steal: 10 } : {})',
        to: '...(frameCount > 5 ? { steal: 10 } : {})',
        category: 'steal 帧位漂移：10 帧精灵被误配偷窃帧，运行时取到越界帧',
      },
      {
        id: 'summon-definition-id-off-by-one',
        module: 'src/pal-battle-sprites.ts',
        file: 'src/pal-battle-sprites.glm-runtime-resource.test.ts',
        total: 8,
        describe: 'R21 定义号函数',
        title: 'summon godId 0..8 → player-summon-(godId+10)；9 越界拒绝',
        from: 'return palPlayerBattleSpriteDefinitionId(godId + 10)',
        to: 'return palPlayerBattleSpriteDefinitionId(godId + 9)',
        category: '召唤定义号错位：godId 映射到错误战斗精灵（召唤神演出整体错位）',
      },
    ],
  },
  e: {
    packageRoot: resolve(root, 'packages/reforge'),
    production: [
      'src/audio/midi-preview.ts',
      'src/battle-trial-config.ts',
      'src/battle/battle-launch-preparation.ts',
    ],
    control: {
      tests: [
        'src/audio/midi-preview.glm-runtime-resource.test.ts',
        'src/audio/midi-preview.test.ts',
        'src/battle-trial-config.glm-runtime-resource.test.ts',
        'src/battle-trial-config.test.ts',
        'src/battle-trial-config.wave2.test.ts',
        'src/battle-trial-assets.wave2.test.ts',
        'src/battle-trial-prepare.wave2.test.ts',
        'src/battle-sprite-readiness.test.ts',
        'src/battle-launch-preparation.test.ts',
        'src/audio/sfx-readiness.test.ts',
      ],
      total: 77,
    },
    mutations: [
      {
        id: 'trial-integer-upper-bound-dropped',
        module: 'src/battle-trial-config.ts',
        file: 'src/battle-trial-config.glm-runtime-resource.test.ts',
        total: 4,
        describe: 'R20 trial 原语校验器',
        title: 'trialInteger：合法回读；非整数/越界拒绝且消息带 where 与范围',
        from: "if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)",
        to: "if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < -1000000000 || value > max)",
        category: '试打配置上界失守：越界整数被接受，敌人/数值配置可越权',
      },
      {
        id: 'battle-abort-classification-blinded',
        module: 'src/battle/battle-launch-preparation.ts',
        file: 'src/battle-trial-config.glm-runtime-resource.test.ts',
        total: 4,
        describe: 'R20 isBattleAbort 分类矩阵',
        title: 'AbortError 名分类：trialAbortError/DOMException 真；普通错误/字符串/null 假',
        from: "'name' in error && error.name === 'AbortError'",
        to: "'name' in error && error.name === 'NeverAbort'",
        category: '取消分类失明：战斗/试打取消被当普通失败处理，取消语义破坏',
      },
    ],
  },
  d: {
    packageRoot: resolve(root, 'packages/reforge'),
    production: [
      'src/menu/shop-box.ts',
      'src/menu/save-browser-box.ts',
      'src/battle/battle-ui.ts',
      'src/battle/present-battle.ts',
      'src/battle/battle-anim.ts',
      'src/battle/battle-positions.ts',
      'src/battle/settlement.ts',
      'src/battle/battle-settlement-presentation.ts',
    ],
    control: {
      tests: [
        'src/menu/save-browser-box.glm-runtime-resource.test.ts',
        'src/battle/battle-positions.glm-runtime-resource.test.ts',
        'src/battle/settlement.glm-runtime-resource.test.ts',
        'src/battle/battle-anim.glm-runtime-resource.test.ts',
        'src/battle/battle-anim.test.ts',
        'src/battle/battle-anim.attack-all.residual.test.ts',
        'src/battle/present-battle.test.ts',
        'src/battle/present-battle.residual.test.ts',
        'src/battle/battle-ui.residual.test.ts',
        'src/battle/battle-settlement-presentation.test.ts',
        'src/menu/shop-box.test.ts',
        'src/menu/shop-box.residual.test.ts',
      ],
      total: 74,
    },
    mutations: [
      {
        id: 'settlement-hidden-duplicated',
        module: 'src/battle/settlement.ts',
        file: 'src/battle/settlement.glm-runtime-resource.test.ts',
        total: 4,
        describe: 'R16 buildSettlementScreens 屏序',
        title: 'exp-cash → 升级者（升级 → 其隐藏 → 其习得）→ 未升级者隐藏收尾',
        from: 'for (const h of hiddenUps) if (!emitted.has(h)) screens.push(hiddenScreen(h))',
        to: 'for (const h of hiddenUps) if (true) screens.push(hiddenScreen(h))',
        category: '结算屏序破坏：已随升级展示的隐藏提升重复再播，结算流程多出冗余屏',
      },
      {
        id: 'save-browser-blocked-dropped',
        module: 'src/menu/save-browser-box.ts',
        file: 'src/menu/save-browser-box.glm-runtime-resource.test.ts',
        total: 5,
        describe: 'R13 drawSaveBrowser',
        title: 'auto 槽两行标签；save 模式禁用红、选中禁用亮红',
        from: "const blocked = state.mode === 'save' && kind !== 'manual'",
        to: "const blocked = state.mode === 'save' && false",
        category: '存档保护失效：auto/quick 槽在存档模式不再禁用红显，诱导覆盖系统存档',
      },
    ],
  },
  c: {
    packageRoot: resolve(root, 'packages/reforge'),
    production: [
      'src/text/glyph.ts',
      'src/text/text-render.ts',
      'src/engine-chrome/registry.ts',
      'src/menu/item-list.ts',
      'src/menu/menu-box.ts',
      'src/menu/system-box.ts',
      'src/menu/magic-box.ts',
      'src/menu/use-box.ts',
      'src/menu/equip-box.ts',
    ],
    control: {
      tests: [
        'src/text/glyph.glm-runtime-resource.test.ts',
        'src/text/glyph.test.ts',
        'src/text/text-render.glm-runtime-resource.test.ts',
        'src/engine-chrome/registry.glm-runtime-resource.test.ts',
        'src/engine-chrome/registry.test.ts',
        'src/engine-chrome/registry.lifecycle.test.ts',
        'src/menu/menu-box.glm-runtime-resource.test.ts',
        'src/menu/menu-box.residual.test.ts',
        'src/menu/menu-box.status-residual.test.ts',
        'src/menu/item-list.glm-runtime-resource.test.ts',
        'src/menu/system-box.glm-runtime-resource.test.ts',
        'src/menu/magic-box.glm-runtime-resource.test.ts',
        'src/menu/use-box.glm-runtime-resource.test.ts',
        'src/menu/equip-box.glm-runtime-resource.test.ts',
      ],
      total: 60,
    },
    mutations: [
      {
        id: 'item-desc-scroll-rate-slowed',
        module: 'src/menu/item-list.ts',
        file: 'src/menu/item-list.glm-runtime-resource.test.ts',
        total: 5,
        describe: 'R10 drawItemGridList 描述区',
        title: '>3 行滚动：now=0 画首 3 行；now=800（scroll=16px）窗口平移到行 1..3；裁剪矩形固定',
        from: 'const scroll = (now / 50) % period',
        to: 'const scroll = (now / 500) % period',
        category:
          '长说明滚动速率错 10 倍：超出 3 行的描述几乎不可完整阅读（机制全看得到的保证被破坏）',
      },
      {
        id: 'system-disabled-color-dropped',
        module: 'src/menu/system-box.ts',
        file: 'src/menu/system-box.glm-runtime-resource.test.ts',
        total: 4,
        describe: 'R11 drawSystemMenu',
        title: '5 项 (53,72+18i)；禁用项红、选中闪烁、禁用选中 0x1C',
        from: 'const color = it.disabled',
        to: 'const color = false',
        category: '禁用色失效：不可用系统项不再红显，用户无法分辨不可选项',
      },
    ],
  },
  b: {
    packageRoot: resolve(root, 'packages/pal-extract'),
    production: [
      'src/events/disasm.ts',
      'src/events/recompile.ts',
      'src/events/slice.ts',
      'src/events/annotate.ts',
      'src/font/bdf-to-json.ts',
      'src/resources/asset-manifest.ts',
      'src/resources/parsers/battle-fields.ts',
      'src/resources/parsers/enemy-teams.ts',
      'src/resources/parsers/items.ts',
      'src/resources/parsers/stores.ts',
    ],
    control: {
      tests: [
        'src/events/disasm.glm-runtime-resource.test.ts',
        'src/events/disasm.test.ts',
        'src/events/disasm.boundaries.test.ts',
        'src/events/recompile.glm-runtime-resource.test.ts',
        'src/events/recompile.test.ts',
        'src/events/recompile.boundaries.test.ts',
        'src/events/slice.glm-runtime-resource.test.ts',
        'src/events/slice.test.ts',
        'src/events/slice.boundaries.test.ts',
        'src/events/annotate.glm-runtime-resource.test.ts',
        'src/events/annotate.test.ts',
        'src/font/bdf-to-json.glm-runtime-resource.test.ts',
        'src/font/__tests__/bdf-to-json.test.ts',
        'src/font/__tests__/bdf-to-json.boundaries.test.ts',
        'src/resources/asset-manifest.glm-runtime-resource.test.ts',
        'src/__tests__/asset-manifest.test.ts',
        'src/__tests__/asset-manifest.boundaries.test.ts',
        'src/resources/parsers/battle-fields.glm-runtime-resource.test.ts',
        'src/resources/parsers/__tests__/battle-fields.boundaries.test.ts',
        'src/resources/parsers/enemy-teams.glm-runtime-resource.test.ts',
        'src/resources/parsers/__tests__/enemy-teams.boundaries.test.ts',
        'src/resources/parsers/items.glm-runtime-resource.test.ts',
        'src/resources/parsers/__tests__/items.boundaries.test.ts',
        'src/resources/parsers/stores.glm-runtime-resource.test.ts',
        'src/resources/parsers/__tests__/stores.boundaries.test.ts',
      ],
      total: 95,
    },
    mutations: [
      {
        id: 'disasm-random-jump-skip-first-target',
        module: 'src/events/disasm.ts',
        file: 'src/events/disasm.glm-runtime-resource.test.ts',
        total: 6,
        describe: 'R05 disasm 0xA2 随机跳标签收集',
        title: 'op0=2：目标 i+1..i+2 打 L_ 标签，fall-through i+3 不标',
        from: 'for (let k = 1; k <= o0; k++) labelTargets.add(i + k)',
        to: 'for (let k = 2; k <= o0; k++) labelTargets.add(i + k)',
        category: '随机跳目标漏收：0xA2 首个相对目标不打标签，slice BFS 随之丢弃该可达块',
      },
      {
        id: 'stores-truncation-sentinel-dropped',
        module: 'src/resources/parsers/stores.ts',
        file: 'src/resources/parsers/stores.glm-runtime-resource.test.ts',
        total: 2,
        describe: 'R07 parseStores 记录边界',
        title: '满 9 记录与紧邻空记录：9 槽全保留且不串入下一条',
        from: 'if (obj === 0) break // 首个 0 截断列表',
        to: 'if (false) break // 首个 0 截断列表',
        category: '首-0 哨兵失效：商店货单读穿 sentinel，0x0026 买菜单会列出垃圾条目',
      },
    ],
  },
  a: {
    packageRoot: resolve(root, 'packages/pal-extract'),
    production: [
      'src/resources/parsers/ball.ts',
      'src/resources/parsers/rgm.ts',
      'src/resources/parsers/fire.ts',
      'src/resources/scene.ts',
      'src/resources/sprite.ts',
      'src/resources/palette.ts',
    ],
    control: {
      tests: [
        'src/resources/palette.glm-runtime-resource.test.ts',
        'src/resources/palette.test.ts',
        'src/resources/palette.boundaries.test.ts',
        'src/resources/parsers/ball.glm-runtime-resource.test.ts',
        'src/resources/parsers/rgm.glm-runtime-resource.test.ts',
        'src/resources/parsers/fire.glm-runtime-resource.test.ts',
        'src/resources/scene.glm-runtime-resource.test.ts',
        'src/resources/scene.test.ts',
        'src/resources/sprite.glm-runtime-resource.test.ts',
        'src/resources/sprite.test.ts',
      ],
      total: 41,
    },
    mutations: [
      {
        id: 'ball-marker-prefix-misread',
        module: 'src/resources/parsers/ball.ts',
        file: 'src/resources/parsers/ball.glm-runtime-resource.test.ts',
        total: 5,
        describe: 'R03 decodeBallIcon 空槽与标记头',
        title: '0x02000000 标记头剥离：2×1 帧（跳1 + opaque palette-0）→ PNG 真解码 alpha 0/255',
        from: 'if (buf[0] === 0x02 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00) {\n    rleBuf = buf.subarray(4)\n  }',
        to: 'if (false) {\n    rleBuf = buf.subarray(4)\n  }',
        category:
          '标记头语义破坏：BALL/RGM 单帧整-chunk 的 0x02000000 前缀被忽略，带头图标整体解坏成空槽',
      },
      {
        id: 'scene-label-zero-entry',
        module: 'src/resources/scene.ts',
        file: 'src/resources/scene.glm-runtime-resource.test.ts',
        total: 5,
        describe: 'R04 dumpScene 未占用切片轴',
        title: '入口 0：sceneId=0 从 0 切片；onEnter=0 → undefined；onTeleport 非 0 → L_ip',
        from: 'return ip > 0 ? `L_${' + 'ip}` : undefined',
        to: 'return ip >= 0 ? `L_$' + '{ip}` : undefined',
        category:
          '入口 0 语义破坏：ip=0「无入口」被伪造成假 label L_0，runtime 会把 0 当真入口跳转',
      },
    ],
  },
}

const MIXED_ERROR =
  /(^|\n)\s*(TypeError|RangeError|ReferenceError|SyntaxError|EvalError|URIError|Error)\s*:/
const TIMEOUT = /timed out|timeout/i

function judge(mutation, run, data) {
  const violations = []
  const expectedExit = mutation ? 1 : 0
  const expectedTotal = mutation
    ? mutation.total
    : (mutation_batch.control?.total ??
      (mutation_batch.packages
        ? mutation_batch.packages.reduce((sum, pkg) => sum + pkg.total, 0)
        : 0))
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
  const targetFile = resolve(packageRootOf(mutation), mutation.file)
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

const isMulti = (batch) => Array.isArray(batch.packages)
const packageRootOf = (mutation) =>
  isMulti(mutation_batch)
    ? mutation_batch.packages[mutation.package].root
    : mutation_batch.packageRoot

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
      { name: resolve(packageRootOf(mutation), mutation.file), assertionResults: entries },
    ],
  }
}

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
          '/different-candidate-root/packages/pal-extract',
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
  controlData.numTotalTests =
    mutation_batch.control?.total ??
    mutation_batch.packages.reduce((sum, pkg) => sum + pkg.total, 0)
  controlData.success = true
  const controlEntries = controlData.testResults[0].assertionResults.map((entry, index) =>
    index === 0 ? { ...entry, status: 'passed', failureMessages: [] } : entry,
  )
  const controlTotal =
    mutation_batch.control?.total ??
    mutation_batch.packages.reduce((sum, pkg) => sum + pkg.total, 0)
  while (controlEntries.length < controlTotal)
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
  `usage: node runtime-resource-mutants.mjs <${Object.keys(batches).join('|')}>`,
)

const selfTestResults = selfTest()
console.log(`criteria self-test: ${selfTestResults.length} cases, all as expected`)

const sourcePath = (name) => resolve(mutation_batch.packageRoot, name)
const hash = (name) =>
  createHash('sha256')
    .update(readFileSync(sourcePath(name)))
    .digest('hex')
const hashOf = (name) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, 'packages', name)))
    .digest('hex')
const hashes = Object.fromEntries(
  mutation_batch.production.map((name) => [
    name,
    isMulti(mutation_batch) ? hashOf(name) : hash(name),
  ]),
)

const evidence = []
const runVitest = (packageRoot, tests, id, mutation) => {
  const report = join(output, `${id}.json`)
  const entered = join(output, `${id}.entered.json`)
  const config = join(output, `${id}.config.mjs`)
  const moduleRel =
    mutation && isMulti(mutation_batch) ? mutation.module.replace(/^[^/]+\//, '') : mutation?.module
  const target = mutation ? resolve(packageRoot, moduleRel) : ''
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const mutation=${JSON.stringify(mutation)}, target=${JSON.stringify(target)};
export default {root:${JSON.stringify(packageRoot)},
plugins:mutation?[{name:'isolated-runtime-resource',enforce:'pre',load(id){const hit=typeof id==='string'&&id.endsWith(target.split('/').slice(-3).join('/'));if(!hit)return;const targetPath=id;const source=readFileSync(targetPath,'utf8');if(source.split(mutation.from).length!==2)throw Error('needle not unique');writeFileSync(${JSON.stringify(entered)},JSON.stringify({id:mutation.id,target:targetPath}));return source.replace(mutation.from,mutation.to)}}]:[],
test:{include:${JSON.stringify(tests)},maxWorkers:1,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
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
  return { run, data }
}

for (const mutation of [null, ...mutation_batch.mutations]) {
  const id = mutation?.id ?? 'control'
  if (mutation)
    assert.equal(
      readFileSync(
        resolve(
          isMulti(mutation_batch) ? root : mutation_batch.packageRoot,
          ...(isMulti(mutation_batch) ? ['packages'] : []),
          mutation.module,
        ),
        'utf8',
      ).split(mutation.from).length - 1,
      1,
      `${id}: unique needle required`,
    )
  const runs = isMulti(mutation_batch)
    ? mutation_batch.packages
        .map((pkg, index) => {
          const runId = mutation && index !== mutation.package ? `${id}#${index}` : id
          const active = !mutation || index === mutation.package
          return {
            ...runVitest(
              pkg.root,
              active ? (mutation ? [mutation.file] : pkg.tests) : [],
              runId,
              mutation,
            ),
            pkg,
            index,
            enteredFile: join(output, `${runId}.entered.json`),
          }
        })
        .filter((entry) => !mutation || entry.index === mutation.package)
    : [
        {
          ...runVitest(
            mutation_batch.packageRoot,
            mutation ? [mutation.file] : mutation_batch.control.tests,
            id,
            mutation,
          ),
          pkg: { root: mutation_batch.packageRoot, total: mutation_batch.control.total },
          index: 0,
          enteredFile: join(output, `${id}.entered.json`),
        },
      ]

  const combined = {
    numTotalTests: runs.reduce((sum, entry) => sum + (entry.data?.numTotalTests ?? 0), 0),
    numPendingTests: 0,
    numTodoTests: 0,
    success: runs.every((entry) => entry.run.status === 0),
    testResults: runs.flatMap((entry) => entry.data?.testResults ?? []),
  }
  const combinedRun = {
    status: runs.every((entry) => entry.run.status === 0)
      ? 0
      : (runs.find((entry) => entry.run.status !== 0)?.run.status ?? 1),
    signal: runs.every((entry) => entry.run.signal === null) ? null : 'SIGKILL',
    stdout: '',
    stderr: '',
  }
  const violations = judge(mutation, combinedRun, combined)
  assert.deepEqual(violations, [], `${id}: judge violations: ${JSON.stringify(violations)}`)
  const failed = (combined.testResults ?? []).flatMap((file) =>
    (file.assertionResults ?? []).filter((x) => x.status === 'failed').map((x) => x.fullName),
  )
  let enteredWitness = null
  if (mutation) {
    const witness = JSON.parse(readFileSync(runs[0].enteredFile, 'utf8'))
    assert.deepEqual(
      witness,
      {
        id,
        target: resolve(
          runs[0].pkg.root,
          isMulti(mutation_batch) ? mutation.module.replace(/^[^/]+\//, '') : mutation.module,
        ),
      },
      `${id}: load-hit witness mismatch`,
    )
    enteredWitness = witness
  }
  const totalTests = combined.numTotalTests
  for (const name of mutation_batch.production) {
    const before = hashes[name]
    assert.equal(
      isMulti(mutation_batch) ? hashOf(name) : hash(name),
      before,
      `${id}: production modified`,
    )
  }
  evidence.push({
    id,
    exitCode: runs[0].run.status,
    tests: totalTests,
    entered: enteredWitness,
    failed,
  })
  console.log(`${id}: ${mutation ? 'business red' : 'green'} (${totalTests} tests)`)
}
writeFileSync(
  join(output, 'summary.json'),
  `${JSON.stringify({ batch: batchKey, hashes, selfTest: selfTestResults, evidence }, null, 2)}\n`,
)
console.log(
  `Batch ${batchKey} oracles passed: criteria self-test ${selfTestResults.length} cases + 1 control + ${mutation_batch.mutations.length} mutations. ${output}`,
)
