#!/usr/bin/env node
// TEST-REFORGE-OPENING-IO-LIFECYCLE-1 — D-Q01-1 及关联资源缺陷的按需隔离真实红反例（r2 加固）。
//
// 每条 repro 在 mkdtemp 拷贝树内生成一个临时测试文件，经真实产品链路
// （runOpeningMenu + 真实 SaveStore + 有效 PNG + 真实键序列）复现：
//   - Type A（故意证明公开 IO 的指定未处理拒绝，R1/R2/R3/R5a）：业务断言全绿 +
//     恰一指定产品拒绝的未处理拒绝 + exit 1。vitest 4 的 JSON reporter 在未处理拒绝下
//     success 仍为 true（实证 probe），判据不得信任 json success，必须组合 exit=1 +
//     默认 reporter stderr 证据（注入标记 + 产品栈锚 opening-menu.ts + 恰一 Errors 行）。
//     Type A 是诊断判据，与普通反控"无 unhandled"规则分开判，但同样不容忍额外
//     harness/runtime 错误、隐藏 skip 或身份漂移。
//   - Type B（缺失的所有权行为，R4/R5b/R6/R7）：恰 1 指定业务 AssertionError、
//     无未处理拒绝污染。
// r2（Codex 一审 O-R1-03/04）新增：每条 repro 预声明执行身份（file+fullName 精确相等）、
// 逐行/计数互核、零断言失败套件拒收；隔离树 lock+frozen；回执在最终删树取证后写入。
// r3（Codex 二审 O-R2-01）：每条 repro 改为「同一次子进程」双 reporter 联判
// （--reporter=json --reporter=default --outputFile.json），native JSON 与完整原始诊断
// 同进程采集；保留并核 suite.message；Type B 拒收 Failed Suites/Uncaught Exception/
// Unhandled Errors 段/stdout Errors N 行（不能只搜 Unhandled Rejection）；Type A 仍保留
// 恰一指定公开 IO 未处理拒绝，但叠加任何 Uncaught Exception/hook 错误即拒收。
// 两种真实 Vitest 污染形态（afterAll throw → suite.message/Failed Suites；异步 uncaught →
// Errors 行/Uncaught Exception，json 全隐藏）入自测。
// 默认 suite 不留这些红/绿预期（卡面），隔离复现不是门禁通过。
// --discover 模式仅提取 Type B 实际失败锚（人工核对后回填正式锚）。
//
// 干净重建：node docs/ops/evidence/TEST-REFORGE-OPENING-IO-LIFECYCLE-1/tools/run-repros.mjs
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareTree } from './prepare-tree.mjs'

const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rawDir = path.join(evidenceDir, 'repro-raw')
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const TREE_DIR = 'src/__tests__/opening-io-lifecycle'
const DISCOVER = process.argv.includes('--discover')

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
const stripNoise = (s) => s.replace(ANSI_RE, '').replace(/["']/g, '')

// ── 共享 repro harness（生成进临时树；字符串内避免反引号/模板插值） ──────────────

const HARNESS = [
  '// @vitest-environment jsdom',
  "import { expect, test, vi } from 'vitest'",
  "import { buildWorld } from '@type-pal/content'",
  "import { chromePng, installShellHost, type ShellHost } from '../runtime-shell/dom-host.js'",
  "import { shellProject } from '../runtime-shell/project.js'",
  "import type { OpeningDecision, OpeningMenuObservation } from '../../opening-menu.js'",
  "import { buildCurrentSavePayload } from '../../save/ops.js'",
  "import { MemorySaveStore, type SaveStore } from '../../save/store.js'",
  "import { type SaveMeta, type SlotId, slotKind } from '../../save/types.js'",
  '',
  'async function seedSlot(store: SaveStore, meta: SaveMeta): Promise<void> {',
  '  const fixture = await shellProject()',
  '  const entry = fixture.project.manifest.entryPoints[0]!',
  '  const payload = buildCurrentSavePayload(',
  '    buildWorld(entry.startWorld, fixture.project.actorsById),',
  "    { sceneId: 'a', pos: { col: 2, row: 2, height: 0 }, facing: 'down' },",
  "    'shell-project',",
  '  )',
  "  await store.putSlot(meta, payload, new Blob([chromePng().slice().buffer], { type: 'image/png' }))",
  '}',
  '',
  'function metaOf(slotId: SlotId, mapName: string, savedAt = 1000): SaveMeta {',
  '  return {',
  '    slotId,',
  '    kind: slotKind(slotId),',
  "    party: [{ name: 'Hero', level: 1 }],",
  '    mapName,',
  '    savedAt,',
  '  }',
  '}',
  '',
  'function tracing(r: SaveStore, reads: string[]): SaveStore {',
  '  return {',
  '    putSlot: (m, p, t) => r.putSlot(m, p, t),',
  '    getPayload: (s) => r.getPayload(s),',
  '    getThumb: async (s) => {',
  "      reads.push('thumb:' + s)",
  '      return r.getThumb(s)',
  '    },',
  '    listMeta: async () => {',
  "      reads.push('meta')",
  '      return r.listMeta()',
  '    },',
  '  }',
  '}',
  '',
  'interface MenuHandle {',
  '  host: ShellHost',
  '  state: { value?: OpeningDecision }',
  '  done: Promise<OpeningDecision>',
  '  reads: string[]',
  '  snapshots: OpeningMenuObservation[]',
  '  thumbBitmaps: () => ImageBitmap[]',
  '}',
  '',
  'async function menu(',
  '  real: SaveStore,',
  '  decorate: (real: SaveStore, reads: string[]) => SaveStore,',
  '  options: { stubDecode?: () => void } = {},',
  '): Promise<MenuHandle> {',
  '  const host = await installShellHost()',
  '  const fixture = await shellProject()',
  "  const { loadMenuAssets } = await import('../../menu/menu-box.js')",
  "  const { projectItemsView } = await import('../../runtime-project-view.js')",
  "  const { loadGlyphs } = await import('../../text/glyph.js')",
  "  const { runOpeningMenu } = await import('../../opening-menu.js')",
  '  const menuAssets = await loadMenuAssets(',
  '    projectItemsView(fixture.project.items),',
  '    fixture.project.imageCache,',
  '  )',
  '  const reads: string[] = []',
  "  const canvas = document.querySelector('canvas')!",
  "  const ctx = canvas.getContext('2d')!",
  '  const bg = await createImageBitmap(new Blob([chromePng().slice().buffer]))',
  '  const bitmapsBefore = host.bitmaps.length',
  '  options.stubDecode?.()',
  '  const snapshots: OpeningMenuObservation[] = []',
  '  const done = runOpeningMenu({',
  '    ctx,',
  '    glyphs: await loadGlyphs(),',
  '    bg,',
  '    items: [',
  "      { id: 'first', label: 'A' },",
  "      { id: 'second', label: 'AA' },",
  '    ],',
  '    worldScale: 4,',
  '    locale: {},',
  '    menuAssets,',
  '    saveStore: decorate(real, reads),',
  '    observe: (snapshot) => snapshots.push(snapshot),',
  '  })',
  '  const state: { value?: OpeningDecision } = {}',
  '  void done.then((value) => {',
  '    state.value = value',
  '  })',
  '  host.frame()',
  '  return { host, state, done, reads, snapshots, thumbBitmaps: () => host.bitmaps.slice(bitmapsBefore) }',
  '}',
  '',
  'async function press(host: ShellHost, keyValue: string): Promise<void> {',
  '  host.key(keyValue)',
  '  host.frame(100)',
  '  host.release(keyValue)',
  '  for (let i = 0; i < 20; i++) await Promise.resolve()',
  '}',
  '',
  'async function settle(): Promise<void> {',
  '  await new Promise<void>((resolve) => setImmediate(resolve))',
  '}',
  '',
  'function spanTexts(host: ShellHost): string[] {',
  '  return host.text.mock.calls.flatMap((call) => call[1].map((span) => span.text))',
  '}',
  '',
].join('\n')

// ── repro 定义（testName = 预声明执行身份，判据按 file+fullName 精确相等核） ──────

const repros = [
  {
    id: 'R1-listMeta-reject-dangling',
    type: 'A',
    axis: 'O1',
    testName: 'R1 O1 listMeta拒绝: 菜单Promise悬空+进程级未处理拒绝(D-Q01-1重核)',
    marker: 'R1: 存储listMeta读取拒绝',
    body: [
      "test('R1 O1 listMeta拒绝: 菜单Promise悬空+进程级未处理拒绝(D-Q01-1重核)', async () => {",
      "  const real = new MemorySaveStore({ kind: 'project', projectId: 'shell-project' })",
      '  const o = await menu(',
      '    real,',
      '    (r, reads) => ({',
      '      putSlot: (m, p, t) => r.putSlot(m, p, t),',
      '      getPayload: (s) => r.getPayload(s),',
      '      getThumb: (s) => r.getThumb(s),',
      '      listMeta: async () => {',
      "        reads.push('meta')",
      '        await r.listMeta()',
      "        throw new Error('R1: 存储listMeta读取拒绝(公开存储边界)')",
      '      },',
      '    }),',
      '  )',
      "  await press(o.host, 'ArrowUp')",
      "  await press(o.host, 'Enter')",
      '  await settle()',
      '  await settle()',
      "  expect(o.reads).toEqual(['meta'])",
      '  expect(o.state.value).toBeUndefined()',
      '  expect(o.host.frames.size).toBe(1)',
      "  await press(o.host, 'ArrowDown')",
      "  expect(o.snapshots.at(-1)?.selectedId).toBe('first')",
      "  await press(o.host, 'Enter')",
      "  expect(await o.done).toEqual({ kind: 'new', entryId: 'first' })",
      '})',
    ].join('\n'),
  },
  {
    id: 'R2-getThumb-reject-dangling',
    type: 'A',
    axis: 'O2',
    testName: 'R2 O2 仅getThumb拒绝: 合法档在库, 悬空仍在enterLoad链(故障位置区分O1)',
    marker: 'R2: 存储getThumb读取拒绝',
    body: [
      "test('R2 O2 仅getThumb拒绝: 合法档在库, 悬空仍在enterLoad链(故障位置区分O1)', async () => {",
      "  const real = new MemorySaveStore({ kind: 'project', projectId: 'shell-project' })",
      '  const o = await menu(',
      '    real,',
      '    (r, reads) => ({',
      '      putSlot: (m, p, t) => r.putSlot(m, p, t),',
      '      getPayload: (s) => r.getPayload(s),',
      '      getThumb: async (s) => {',
      "        reads.push('thumb:' + s)",
      '        await r.getThumb(s)',
      "        throw new Error('R2: 存储getThumb读取拒绝(公开存储边界)')",
      '      },',
      '      listMeta: async () => {',
      "        reads.push('meta')",
      '        return r.listMeta()',
      '      },',
      '    }),',
      '  )',
      "  await seedSlot(real, metaOf('m01', '旧港'))",
      "  await press(o.host, 'ArrowUp')",
      "  await press(o.host, 'Enter')",
      '  await settle()',
      '  await settle()',
      "  expect(o.reads).toEqual(['meta', 'thumb:m01'])",
      '  expect(o.state.value).toBeUndefined()',
      "  expect(o.snapshots.at(-1)?.phase).toBe('menu')",
      "  await press(o.host, 'ArrowDown')",
      "  await press(o.host, 'Enter')",
      "  expect(await o.done).toEqual({ kind: 'new', entryId: 'first' })",
      '})',
    ].join('\n'),
  },
  {
    id: 'R3-decode-reject-dangling',
    type: 'A',
    axis: 'O3',
    testName: 'R3 O3 有效PNG解码拒绝: 悬空发生在浏览器解码边界',
    marker: 'R3: 浏览器解码拒绝',
    body: [
      "test('R3 O3 有效PNG解码拒绝: 悬空发生在浏览器解码边界', async () => {",
      "  const real = new MemorySaveStore({ kind: 'project', projectId: 'shell-project' })",
      '  const o = await menu(real, tracing, {',
      '    stubDecode: () => {',
      '      vi.stubGlobal(',
      "        'createImageBitmap',",
      '        async () => {',
      "          throw new Error('R3: 浏览器解码拒绝(有效PNG, 解码边界)')",
      '        },',
      '      )',
      '    },',
      '  })',
      "  await seedSlot(real, metaOf('m01', '旧港'))",
      "  await press(o.host, 'ArrowUp')",
      "  await press(o.host, 'Enter')",
      '  await settle()',
      '  await settle()',
      "  expect(o.reads).toEqual(['meta', 'thumb:m01'])",
      '  expect(o.state.value).toBeUndefined()',
      "  expect(o.snapshots.at(-1)?.phase).toBe('menu')",
      "  await press(o.host, 'ArrowDown')",
      "  await press(o.host, 'Enter')",
      "  expect(await o.done).toEqual({ kind: 'new', entryId: 'first' })",
      '})',
    ].join('\n'),
  },
  {
    id: 'R4-reverse-order-stale-overwrite',
    type: 'B',
    axis: 'O4',
    testName: 'R4 O4 逆序完成: 旧批次metas覆盖新批次(后到旧结果胜出)',
    expectedErrorPart: "expected [ 'menu.system.load', '1/10', …(8) ] to include '新港'",
    body: [
      "test('R4 O4 逆序完成: 旧批次metas覆盖新批次(后到旧结果胜出)', async () => {",
      "  const real = new MemorySaveStore({ kind: 'project', projectId: 'shell-project' })",
      '  let releaseFirst!: () => void',
      '  const gate = new Promise<void>((resolve) => {',
      '    releaseFirst = resolve',
      '  })',
      '  let calls = 0',
      '  const o = await menu(real, (r, reads) => ({',
      '    putSlot: (m, p, t) => r.putSlot(m, p, t),',
      '    getPayload: (s) => r.getPayload(s),',
      '    getThumb: async (s) => {',
      "      reads.push('thumb:' + s)",
      '      return r.getThumb(s)',
      '    },',
      '    listMeta: async () => {',
      '      calls++',
      "      reads.push('meta')",
      '      const metas = await r.listMeta()',
      '      if (calls === 1) await gate',
      '      return metas',
      '    },',
      '  }))',
      "  await seedSlot(real, metaOf('m01', '旧港', 1000))",
      "  await press(o.host, 'ArrowUp')",
      "  o.host.key('Enter') // 第一读(旧快照), 送达被门控",
      '  await settle()',
      "  await seedSlot(real, metaOf('m01', '新港', 2000)) // 期间存档被更新",
      "  o.host.key('Enter') // 第二读(新快照), 立即送达",
      '  await settle()',
      '  await settle()',
      '  o.host.frame(100)',
      "  expect(spanTexts(o.host)).toContain('新港') // 第二读先完成: 当前显示新档",
      '  const mark = o.host.text.mock.calls.length',
      '  releaseFirst() // 第一读(旧)迟到送达',
      '  await settle()',
      '  await settle()',
      '  o.host.frame(100)',
      '  const late = o.host.text.mock.calls',
      '    .slice(mark)',
      '    .flatMap((call) => call[1].map((span) => span.text))',
      "  expect(late).toContain('新港') // 期望最新结果保留; 实际被旧批次覆盖",
      "  expect(late).not.toContain('旧港')",
      '})',
    ].join('\n'),
  },
  {
    id: 'R5a-late-reject-after-exit',
    type: 'A',
    axis: 'O5',
    testName: 'R5a O5 退出后迟到IO拒绝: 悬空拒绝发生在菜单退休之后',
    marker: 'R5a: 退出后迟到的listMeta拒绝',
    body: [
      "test('R5a O5 退出后迟到IO拒绝: 悬空拒绝发生在菜单退休之后', async () => {",
      "  const real = new MemorySaveStore({ kind: 'project', projectId: 'shell-project' })",
      '  let releaseGate!: () => void',
      '  const gate = new Promise<void>((resolve) => {',
      '    releaseGate = resolve',
      '  })',
      '  const o = await menu(',
      '    real,',
      '    (r, reads) => ({',
      '      putSlot: (m, p, t) => r.putSlot(m, p, t),',
      '      getPayload: (s) => r.getPayload(s),',
      '      getThumb: async (s) => {',
      "        reads.push('thumb:' + s)",
      '        return r.getThumb(s)',
      '      },',
      '      listMeta: async () => {',
      "        reads.push('meta')",
      '        await r.listMeta()',
      '        await gate',
      "        throw new Error('R5a: 退出后迟到的listMeta拒绝(公开存储边界)')",
      '      },',
      '    }),',
      '  )',
      "  await seedSlot(real, metaOf('m01', '旧港'))",
      "  await press(o.host, 'ArrowUp')",
      "  o.host.key('Enter') // listMeta 已调用, 送达被门控",
      '  await settle()',
      "  await press(o.host, 'ArrowDown')",
      "  await press(o.host, 'Enter') // 选新局退出: cleanup + resolve",
      "  expect(await o.done).toEqual({ kind: 'new', entryId: 'first' })",
      '  expect(o.host.frames.size).toBe(0)',
      '  releaseGate() // 迟到送达=拒绝(错误在enterLoad链上构造)',
      '  await settle()',
      '  await settle()',
      "  expect(o.reads).toEqual(['meta'])",
      '  expect(o.host.frames.size).toBe(0) // 业务面保持绿: 退休不被复活',
      '})',
    ].join('\n'),
  },
  {
    id: 'R5b-late-decode-after-exit',
    type: 'B',
    axis: 'O5',
    testName: 'R5b O5 退出后迟到IO仍解码位图: 退出不取消在途装载',
    expectedErrorPart: 'expected 1 to be +0 // Object.is equality',
    body: [
      "test('R5b O5 退出后迟到IO仍解码位图: 退出不取消在途装载', async () => {",
      "  const real = new MemorySaveStore({ kind: 'project', projectId: 'shell-project' })",
      '  let releaseGate!: () => void',
      '  const gate = new Promise<void>((resolve) => {',
      '    releaseGate = resolve',
      '  })',
      '  const o = await menu(real, (r, reads) => ({',
      '    putSlot: (m, p, t) => r.putSlot(m, p, t),',
      '    getPayload: (s) => r.getPayload(s),',
      '    getThumb: async (s) => {',
      "      reads.push('thumb:' + s)",
      '      return r.getThumb(s)',
      '    },',
      '    listMeta: async () => {',
      "      reads.push('meta')",
      '      const metas = await r.listMeta()',
      '      await gate',
      '      return metas',
      '    },',
      '  }))',
      "  await seedSlot(real, metaOf('m01', '旧港'))",
      "  await press(o.host, 'ArrowUp')",
      "  o.host.key('Enter') // 读取进度: 送达被门控",
      '  await settle()',
      "  await press(o.host, 'ArrowDown')",
      "  await press(o.host, 'Enter') // 选新局退出",
      "  expect(await o.done).toEqual({ kind: 'new', entryId: 'first' })",
      '  const before = o.thumbBitmaps().length',
      '  releaseGate()',
      '  await settle()',
      '  await settle()',
      '  await settle()',
      "  expect(o.reads).toEqual(['meta', 'thumb:m01']) // 迟到链完整执行(绿事实)",
      '  expect(o.thumbBitmaps().length).toBe(before) // 退出后不应再解码; 实际仍创建',
      '})',
    ].join('\n'),
  },
  {
    id: 'R6-reentry-bitmap-not-closed',
    type: 'B',
    axis: 'O6',
    testName: 'R6 O6 重进读档相位: 旧批缩略图位图未释放(无close)',
    expectedErrorPart: 'expected "vi.fn()" to be called at least once',
    body: [
      "test('R6 O6 重进读档相位: 旧批缩略图位图未释放(无close)', async () => {",
      "  const real = new MemorySaveStore({ kind: 'project', projectId: 'shell-project' })",
      '  const o = await menu(real, tracing)',
      "  await seedSlot(real, metaOf('m01', '旧港'))",
      "  await press(o.host, 'ArrowUp')",
      "  await press(o.host, 'Enter')",
      '  await settle()',
      '  await settle()',
      '  o.host.frame(100) // 快照只在帧上刷新',
      "  expect(o.snapshots.at(-1)?.phase).toBe('load')",
      '  const firstBatch = o.thumbBitmaps()',
      '  expect(firstBatch).toHaveLength(1)',
      "  await press(o.host, 'Escape')",
      "  expect(o.snapshots.at(-1)?.phase).toBe('menu')",
      "  await press(o.host, 'Enter') // 重新进入",
      '  await settle()',
      '  await settle()',
      '  o.host.frame(100)',
      "  expect(o.snapshots.at(-1)?.phase).toBe('load')",
      '  expect(o.thumbBitmaps()).toHaveLength(2)',
      '  expect(firstBatch[0]!.close).toHaveBeenCalled() // 旧批退役应释放; 实际从不close',
      '})',
    ].join('\n'),
  },
  {
    id: 'R7-completion-bitmap-not-closed',
    type: 'B',
    axis: 'O7',
    testName: 'R7 O7 正常完成读档: 已创建缩略图位图未被释放',
    expectedErrorPart: 'expected "vi.fn()" to be called at least once',
    body: [
      "test('R7 O7 正常完成读档: 已创建缩略图位图未被释放', async () => {",
      "  const real = new MemorySaveStore({ kind: 'project', projectId: 'shell-project' })",
      '  const o = await menu(real, tracing)',
      "  await seedSlot(real, metaOf('m01', '旧港'))",
      "  await press(o.host, 'ArrowUp')",
      "  await press(o.host, 'Enter')",
      '  await settle()',
      '  await settle()',
      '  o.host.frame(100) // 快照只在帧上刷新',
      "  expect(o.snapshots.at(-1)?.phase).toBe('load')",
      "  await press(o.host, 'ArrowDown')",
      "  await press(o.host, 'ArrowDown')",
      "  await press(o.host, 'Enter')",
      "  expect(await o.done).toEqual({ kind: 'load', slotId: 'm01' })",
      '  const thumbs = o.thumbBitmaps()',
      '  expect(thumbs).toHaveLength(1)',
      '  expect(thumbs[0]!.close).toHaveBeenCalled() // 完成收尾应释放; 实际从不close',
      '})',
    ].join('\n'),
  },
]

// ── 判据函数（自测与真 repro 共用） ────────────────────────────────────────────

const collectCounts = (parsed) => ({
  numTotalTests: parsed.numTotalTests,
  numPassedTests: parsed.numPassedTests,
  numFailedTests: parsed.numFailedTests,
  numPendingTests: parsed.numPendingTests,
  numTodoTests: parsed.numTodoTests,
  numTotalTestSuites: parsed.numTotalTestSuites,
  numFailedTestSuites: parsed.numFailedTestSuites,
})

const runShapeIssues = (run) => {
  const issues = []
  if (run.exitCode !== 1) issues.push(`exit=${run.exitCode} ≠ 1`)
  if (run.signal !== null) issues.push(`signal=${run.signal}`)
  if (run.spawnError !== null) issues.push(`spawnError=${run.spawnError}`)
  return issues
}

// 预声明执行身份核：恰一 suite、file 精确等于临时测试路径、恰一 assertion 且
// fullName 精确等于声明名；零断言失败套件（collection error 形态）拒收。
const identityIssues = (parsed, relFile, testName) => {
  const issues = []
  const suites = parsed.testResults ?? []
  if ((parsed.numTotalTestSuites ?? suites.length) !== 1)
    issues.push(`numTotalTestSuites=${parsed.numTotalTestSuites} ≠ 1`)
  for (const suite of suites) {
    if (suite.status === 'failed' && (suite.assertionResults ?? []).length === 0)
      issues.push(`collection/runtime error suite（零断言失败套件）: ${suite.name}`)
    if (suite.message)
      issues.push(
        `suite.message 非空（hook/collection 层额外错误，拒收）: ${suite.name} → ${String(suite.message).slice(0, 80)}`,
      )
  }
  if (suites.length !== 1) {
    issues.push(`suite 数 ${suites.length} ≠ 1`)
    return { issues, assertion: undefined }
  }
  const suite = suites[0]
  if (!suite.name.endsWith(relFile))
    issues.push(`执行文件身份漂移: ${suite.name} 不以 ${relFile} 结尾`)
  const assertions = suite.assertionResults ?? []
  if (assertions.length !== 1) issues.push(`断言数 ${assertions.length} ≠ 1`)
  const assertion = assertions[0]
  if (assertion && assertion.fullName !== testName)
    issues.push(
      `执行身份漂移: fullName=${JSON.stringify(assertion.fullName)} ≠ 声明 ${JSON.stringify(testName)}`,
    )
  if ((parsed.numTotalTests ?? 0) !== 1) issues.push(`numTotalTests=${parsed.numTotalTests} ≠ 1`)
  if ((parsed.numPendingTests ?? 0) !== 0 || (parsed.numTodoTests ?? 0) !== 0)
    issues.push('存在 pending/todo（隐藏 skip 拒收）')
  return { issues, assertion }
}

// 同次子进程诊断核：businessMarkers 任一出现即污染（业务相位/Type B 用）。
const businessPollutionIssues = (diagnostics) => {
  const issues = []
  const hay = stripNoise(diagnostics)
  if (hay.includes('Failed Suites')) issues.push("诊断含 'Failed Suites'（hook 层错误）")
  if (hay.includes('Unhandled Rejection')) issues.push("诊断含 'Unhandled Rejection'")
  if (hay.includes('Uncaught Exception')) issues.push("诊断含 'Uncaught Exception'")
  if (hay.includes('Unhandled Errors'))
    issues.push("诊断含 'Unhandled Errors' 段（进程级错误存在）")
  if (/(^|\n)\s*Errors\s+\d/.test(hay))
    issues.push("stdout 含 'Errors  N' 摘要行（进程级错误存在）")
  return issues
}

const validateTypeA = (phase, relFile, testName, marker) => {
  const issues = []
  if (!phase.parseable) issues.push(`json 不可解析: ${phase.parseError}`)
  else {
    const { issues: idIssues } = identityIssues(phase.parsed, relFile, testName)
    issues.push(...idIssues)
    const c = collectCounts(phase.parsed)
    if (c.numPassedTests !== 1 || c.numFailedTests !== 0)
      issues.push(`业务断言必须全绿(1/1): passed=${c.numPassedTests} failed=${c.numFailedTests}`)
  }
  issues.push(...runShapeIssues(phase.run))
  const hay = stripNoise(phase.diagnostics)
  const rejectionCount = hay.split('Unhandled Rejection').length - 1
  if (rejectionCount !== 1)
    issues.push(`未处理拒绝计数 ${rejectionCount} ≠ 1（恰一指定产品拒绝，额外错误拒收）`)
  if (!hay.includes(stripNoise(marker))) issues.push(`未处理拒绝不含注入标记 ${marker}`)
  if (!hay.includes('opening-menu.ts')) issues.push('未处理拒绝无产品栈锚(opening-menu.ts)')
  if (hay.includes('Uncaught Exception'))
    issues.push("Type A 叠加 'Uncaught Exception'（额外运行错误拒收）")
  if (hay.includes('Failed Suites'))
    issues.push("Type A 叠加 'Failed Suites'（额外 hook 错误拒收）")
  if (!stripNoise(phase.diagnosticsStdout ?? '').includes('Errors  1 error'))
    issues.push('同次 stdout 摘要无恰一 Errors 1 error 行')
  return issues
}

const validateTypeB = (phase, relFile, testName, expectedErrorPart) => {
  const issues = []
  let failedMessages = []
  if (!phase.parseable) issues.push(`json 不可解析: ${phase.parseError}`)
  else {
    const { issues: idIssues, assertion } = identityIssues(phase.parsed, relFile, testName)
    issues.push(...idIssues)
    const c = collectCounts(phase.parsed)
    if (c.numFailedTests !== 1) issues.push(`numFailedTests=${c.numFailedTests} ≠ 1`)
    if (assertion) {
      if (assertion.status !== 'failed') issues.push(`唯一断言状态 ${assertion.status} ≠ failed`)
      failedMessages = assertion.failureMessages ?? []
    }
    if (failedMessages.length && !failedMessages.some((m) => m.includes('AssertionError')))
      issues.push('失败非 AssertionError')
    else if (
      failedMessages.length &&
      !stripNoise(failedMessages.join('\n')).includes(stripNoise(expectedErrorPart))
    )
      issues.push(`失败消息不含指定片段: ${expectedErrorPart}`)
  }
  issues.push(...runShapeIssues(phase.run), ...businessPollutionIssues(phase.diagnostics))
  return { issues, failedMessages }
}

// ── 自测（合成输入必须被同一判据正确拒收/放行） ────────────────────────────────

const selfTest = () => {
  const relFile = 'src/__tests__/opening-io-lifecycle/x.test.ts'
  const testName = 'R1 O1 listMeta拒绝: 菜单Promise悬空+进程级未处理拒绝(D-Q01-1重核)'
  const marker = 'R1: 存储listMeta读取拒绝'
  const typeBName = 'R4 O4 逆序完成: 旧批次metas覆盖新批次(后到旧结果胜出)'
  const typeBPart = "to include '新港'"
  // 同次子进程相位形态：parsed(json) + run + diagnostics(stdout+stderr) + diagnosticsStdout。
  const mkPhase = (parsedOver = {}, runOver = {}, diagnostics = '', diagnosticsStdout = '') => ({
    parseable: true,
    parseError: null,
    parsed: {
      numTotalTestSuites: 1,
      numTotalTests: 1,
      numPassedTests: 1,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      testResults: [
        {
          name: `/tmp/tree/packages/reforge/${relFile}`,
          status: 'passed',
          message: '',
          assertionResults: [{ fullName: testName, status: 'passed', failureMessages: [] }],
        },
      ],
      ...parsedOver,
    },
    run: { exitCode: 1, signal: null, spawnError: null, ...runOver },
    diagnostics,
    diagnosticsStdout: diagnosticsStdout || diagnostics,
  })
  const cleanGreenConsole = 'Test Files  1 passed (1)\nTests  1 passed (1)'
  const typeADiag = `Test Files  1 passed (1)\n     Errors  1 error\nUnhandled Errors ⎯⎯\n⎯⎯ Unhandled Rejection ⎯⎯\nError: ${marker}(公开存储边界)\n ❯ Object.listMeta x.test.ts:126\n ❯ enterLoad src/opening-menu.ts:123`
  const typeBJson = {
    numPassedTests: 0,
    numFailedTests: 1,
    testResults: [
      {
        name: `/tmp/tree/packages/reforge/${relFile}`,
        status: 'failed',
        message: '',
        assertionResults: [
          {
            fullName: typeBName,
            status: 'failed',
            failureMessages: [
              "AssertionError: expected [ 'menu.system.load', '1/10', …(8) ] to include '新港'",
            ],
          },
        ],
      },
    ],
  }
  const typeBDiag =
    "Test Files  1 failed (1)\nTests  1 failed\nAssertionError: expected [ 'menu.system.load', '1/10', …(8) ] to include '新港'"
  // 二审两种真实 Vitest 污染形态（按实测 json/console 构造）。
  const hookSuiteMsg = {
    testResults: [
      {
        name: `/tmp/tree/packages/reforge/${relFile}`,
        status: 'failed',
        message: 'Error: CODEX_EXTRA_HOOK_ERROR',
        assertionResults: [
          {
            fullName: typeBName,
            status: 'failed',
            failureMessages: [
              "AssertionError: expected [ 'menu.system.load', '1/10', …(8) ] to include '新港'",
            ],
          },
        ],
      },
    ],
  }
  const hookConsole = `${typeBDiag}\nFailed Suites 1\nFAIL x.test.ts\nError: CODEX_EXTRA_HOOK_ERROR`
  const uncaughtConsole = `${typeBDiag}\n     Errors  1 error\nUnhandled Errors ⎯⎯\n⎯⎯ Uncaught Exception ⎯⎯\nError: CODEX_EXTRA_RUNTIME_ERROR\n ❯ Timeout._onTimeout x.test.ts:13:11`
  const typeAUncaught = `Test Files  1 passed (1)\n     Errors  2 errors\nUnhandled Errors ⎯⎯\n⎯⎯ Unhandled Rejection ⎯⎯\nError: ${marker}\n ❯ enterLoad src/opening-menu.ts:123\n⎯⎯ Uncaught Exception ⎯⎯\nError: CODEX_EXTRA_RUNTIME_ERROR`
  const cases = [
    {
      case: 'typeA-valid-accept',
      expect: 'accept',
      issues: validateTypeA(mkPhase({}, {}, typeADiag), relFile, testName, marker),
    },
    {
      case: 'typeA-json-success-true-not-trusted',
      expect: 'accept',
      issues: validateTypeA(mkPhase({ success: true }, {}, typeADiag), relFile, testName, marker),
    },
    {
      case: 'typeA-exit-zero-reject',
      expect: 'reject',
      issues: validateTypeA(mkPhase({}, { exitCode: 0 }, typeADiag), relFile, testName, marker),
    },
    {
      case: 'typeA-business-failed-reject',
      expect: 'reject',
      issues: validateTypeA(
        mkPhase({ numPassedTests: 0, numFailedTests: 1 }, {}, typeADiag),
        relFile,
        testName,
        marker,
      ),
    },
    {
      case: 'typeA-missing-rejection-evidence-reject',
      expect: 'reject',
      issues: validateTypeA(mkPhase({}, {}, cleanGreenConsole), relFile, testName, marker),
    },
    {
      case: 'typeA-wrong-marker-reject',
      expect: 'reject',
      issues: validateTypeA(mkPhase({}, {}, typeADiag), relFile, testName, 'R9: 不存在的标记'),
    },
    {
      case: 'typeA-no-product-frame-reject',
      expect: 'reject',
      issues: validateTypeA(
        mkPhase(
          {},
          {},
          `Test Files  1 passed (1)\n     Errors  1 error\nUnhandled Errors ⎯⎯\n⎯⎯ Unhandled Rejection ⎯⎯\nError: ${marker}`,
        ),
        relFile,
        testName,
        marker,
      ),
    },
    {
      case: 'typeA-extra-unhandled-reject',
      expect: 'reject',
      issues: validateTypeA(
        mkPhase(
          {},
          {},
          `Test Files  1 passed (1)\n     Errors  2 errors\nUnhandled Rejection\nError: ${marker}\nenterLoad src/opening-menu.ts:1\nUnhandled Rejection\nError: stray`,
        ),
        relFile,
        testName,
        marker,
      ),
    },
    {
      case: 'typeA-with-uncaught-exception-reject',
      expect: 'reject',
      issues: validateTypeA(mkPhase({}, {}, typeAUncaught), relFile, testName, marker),
    },
    {
      case: 'typeA-hook-error-reject',
      expect: 'reject',
      issues: validateTypeA(
        mkPhase(
          { testResults: hookSuiteMsg.testResults },
          {},
          `${typeADiag}\nFailed Suites 1\nError: CODEX_EXTRA_HOOK_ERROR`,
        ),
        relFile,
        testName,
        marker,
      ),
    },
    {
      case: 'typeA-pending-reject',
      expect: 'reject',
      issues: validateTypeA(
        mkPhase({ numPendingTests: 1 }, {}, typeADiag),
        relFile,
        testName,
        marker,
      ),
    },
    {
      case: 'typeA-fullname-drift-reject',
      expect: 'reject',
      issues: validateTypeA(mkPhase({}, {}, typeADiag), relFile, 'R8 不存在的测试名', marker),
    },
    {
      case: 'typeA-file-drift-reject',
      expect: 'reject',
      issues: validateTypeA(
        mkPhase(
          {
            testResults: [
              {
                name: '/tmp/tree/packages/reforge/src/__tests__/opening-io-lifecycle/other.test.ts',
                status: 'passed',
                message: '',
                assertionResults: [{ fullName: testName, status: 'passed', failureMessages: [] }],
              },
            ],
          },
          {},
          typeADiag,
        ),
        relFile,
        testName,
        marker,
      ),
    },
    {
      case: 'typeB-valid-accept',
      expect: 'accept',
      issues: validateTypeB(mkPhase(typeBJson, {}, typeBDiag), relFile, typeBName, typeBPart)
        .issues,
    },
    {
      case: 'typeB-hook-error-via-suite-message-reject',
      expect: 'reject',
      issues: validateTypeB(mkPhase(hookSuiteMsg, {}, hookConsole), relFile, typeBName, typeBPart)
        .issues,
    },
    {
      case: 'typeB-runtime-uncaught-via-diagnostics-reject',
      expect: 'reject',
      issues: validateTypeB(mkPhase(typeBJson, {}, uncaughtConsole), relFile, typeBName, typeBPart)
        .issues,
    },
    {
      case: 'typeB-wrong-fullname-plus-collection-suite-reject',
      expect: 'reject',
      issues: validateTypeB(
        mkPhase(
          {
            numTotalTestSuites: 2,
            numFailedTests: 1,
            testResults: [
              {
                name: '/tmp/tree/packages/reforge/src/__tests__/opening-io-lifecycle/broken.test.ts',
                status: 'failed',
                message: '',
                assertionResults: [],
              },
              {
                name: `/tmp/tree/packages/reforge/${relFile}`,
                status: 'failed',
                message: '',
                assertionResults: [
                  {
                    fullName: '完全不同的测试名',
                    status: 'failed',
                    failureMessages: ["AssertionError: expected [ x ] to include '新港'"],
                  },
                ],
              },
            ],
          },
          {},
          typeBDiag,
        ),
        relFile,
        typeBName,
        typeBPart,
      ).issues,
    },
    {
      case: 'typeB-two-failures-reject',
      expect: 'reject',
      issues: validateTypeB(
        mkPhase(
          {
            numTotalTests: 2,
            numPassedTests: 0,
            numFailedTests: 2,
            testResults: [
              {
                name: `/tmp/tree/packages/reforge/${relFile}`,
                status: 'failed',
                message: '',
                assertionResults: [
                  { fullName: typeBName, status: 'failed', failureMessages: ['AssertionError: x'] },
                  { fullName: '第二个', status: 'failed', failureMessages: ['AssertionError: y'] },
                ],
              },
            ],
          },
          {},
          typeBDiag,
        ),
        relFile,
        typeBName,
        typeBPart,
      ).issues,
    },
    {
      case: 'typeB-unhandled-contamination-reject',
      expect: 'reject',
      issues: validateTypeB(
        mkPhase(typeBJson, {}, `${typeBDiag}\nUnhandled Rejection\nError: stray`),
        relFile,
        typeBName,
        typeBPart,
      ).issues,
    },
  ]
  return cases.map((c) => ({
    case: c.case,
    expect: c.expect,
    ok: c.expect === 'accept' ? c.issues.length === 0 : c.issues.length > 0,
    issues: c.issues,
  }))
}

// ── 主流程 ─────────────────────────────────────────────────────────────────────

// 同次子进程双 reporter：native JSON 落 outputFile、完整诊断取 stdout+stderr（O-R2-01）。
const runDual = (pkgRoot, args, jsonOutAbs) => {
  const env = { ...process.env }
  delete env.NODE_COMPILE_CACHE
  const argv = [
    'exec',
    'vitest',
    'run',
    ...args,
    '--reporter=json',
    '--reporter=default',
    `--outputFile.json=${jsonOutAbs}`,
  ]
  const proc = spawnSync('pnpm', argv, {
    cwd: pkgRoot,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    env,
    timeout: 600_000,
  })
  return {
    argv: ['pnpm', ...argv],
    exitCode: proc.status,
    signal: proc.signal,
    spawnError: proc.error ? String(proc.error.message) : null,
    stdout: proc.stdout ?? '',
    stderr: proc.stderr ?? '',
  }
}

const writeRaw = async (file, text) => {
  const normalized = `${text.replace(/[\r\n \t]+$/, '')}\n`
  await writeFile(file, normalized)
  // JSON 证据落盘即过 biome（回执 hash 按格式化后字节计，保证 lint 零诊断且账实一致）。
  if (file.endsWith('.json')) {
    const fmt = spawnSync(
      'pnpm',
      ['exec', 'biome', 'check', '--write', path.relative(repoRoot, file)],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: 120_000,
      },
    )
    if (fmt.status !== 0)
      throw new Error(`raw json biome 格式化失败 ${file}: ${fmt.stdout ?? ''}${fmt.stderr ?? ''}`)
  }
  const onDisk = await readFile(file)
  return {
    bytes: onDisk.length,
    sha256: sha256(onDisk),
    path: path.relative(evidenceDir, file),
  }
}

const extractAnchor = (messages, id) => {
  const first = messages.find((m) => m.includes('AssertionError')) ?? ''
  const clean = first.split('\n')[0]?.trim() ?? ''
  const m = /^AssertionError: (.*)$/.exec(clean)
  const line = (m ? m[1] : clean).slice(0, 120)
  if (!line || line.length < 8) throw new Error(`[${id}] 无法提取锚: ${first.slice(0, 200)}`)
  return line
}

let tree = null
try {
  const selfTestResults = selfTest()
  if (!selfTestResults.every((c) => c.ok))
    throw new Error(
      `runner 自测未过: ${JSON.stringify(selfTestResults.filter((c) => !c.ok).map((c) => c.case))}`,
    )

  await rm(rawDir, { recursive: true, force: true })
  await mkdir(rawDir, { recursive: true })
  tree = await prepareTree('repros')
  await mkdir(path.join(tree.pkgRoot, TREE_DIR), { recursive: true })

  const receipts = []
  for (const repro of repros) {
    const source = `${HARNESS}\n${repro.body}\n`
    const fileName = `${repro.id}.test.ts`
    const absFile = path.join(tree.pkgRoot, TREE_DIR, fileName)
    await writeFile(absFile, source)
    const rel = `${TREE_DIR}/${fileName}`

    const jsonAbs = path.join(rawDir, `${repro.id}.json`)
    const run = runDual(tree.pkgRoot, [rel], jsonAbs)
    let rawJson = null
    let parseable = true
    let parseError = null
    try {
      rawJson = await readFile(jsonAbs, 'utf8')
      JSON.parse(rawJson)
    } catch (error) {
      parseable = false
      parseError = String(error.message)
    }
    const diagnostics = `${run.stdout}\n${run.stderr}`
    const phase = {
      parseable,
      parseError,
      parsed: parseable ? JSON.parse(rawJson) : null,
      run,
      diagnostics,
      diagnosticsStdout: run.stdout,
    }
    const jsonStat = await writeRaw(jsonAbs, rawJson ?? '')
    const consoleStat = await writeRaw(path.join(rawDir, `${repro.id}.console`), diagnostics)

    let issues
    let anchor = null
    if (repro.type === 'A') {
      issues = validateTypeA(phase, rel, repro.testName, repro.marker)
    } else {
      const verdict = validateTypeB(phase, rel, repro.testName, repro.expectedErrorPart)
      anchor = extractAnchor(verdict.failedMessages, repro.id)
      const pinned = !repro.expectedErrorPart.startsWith('ANCHOR-')
      const effective = pinned ? repro.expectedErrorPart : anchor
      issues = validateTypeB(phase, rel, repro.testName, effective).issues
      if (pinned && effective !== anchor)
        throw new Error(
          `[${repro.id}] 钉死锚与实际红消息不一致: pinned=${effective} actual=${anchor}`,
        )
      anchor = effective
    }

    receipts.push({
      id: repro.id,
      type: repro.type,
      axis: repro.axis,
      declaredIdentity: { file: rel, fullName: repro.testName },
      subprocess:
        'single（--reporter=json --reporter=default --outputFile.json，JSON 与诊断同进程）',
      argv: run.argv,
      env: { nodeVersion: process.version, NODE_COMPILE_CACHE: 'deleted', cwd: tree.pkgRoot },
      file: rel,
      sourceSha256: sha256(Buffer.from(source, 'utf8')),
      sourceText: source,
      expectedErrorPart: anchor,
      jsonPhase: {
        exitCode: run.exitCode,
        signal: run.signal,
        spawnError: run.spawnError,
        counts: parseable ? collectCounts(phase.parsed) : null,
        // vitest 4 实证：未处理拒绝下 json success 可为 true，不可作为通过依据。
        jsonSuccess: parseable ? phase.parsed.success : null,
        parseable,
        artifact: jsonStat,
      },
      defaultPhase: {
        exitCode: run.exitCode,
        signal: run.signal,
        spawnError: run.spawnError,
        artifact: consoleStat,
      },
      issues,
      pass: issues.length === 0,
    })
    await rm(absFile, { force: true })
  }

  // 最终删树举证 → 回执在清理之后写入（O-R1-04）。
  const cleanupProof = await tree.removeTree()
  tree = null

  const allPass = receipts.every((r) => r.pass) && selfTestResults.every((c) => c.ok)
  const receipt = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    mode: DISCOVER ? 'discover（锚提取，供回填）' : 'pinned（正式门）',
    treePolicy:
      'mkdtemp 拷贝树（lock+frozen）内生成临时测试并调用真实产品；回执在最终删树取证后写入，不触碰活动工作树',
    subprocessPolicy:
      '每条 repro 一次子进程双 reporter 联判：native JSON（outputFile）与完整原始诊断（stdout+stderr）同进程采集（O-R2-01；JSON 单跑隐藏全局错误，双进程互证无效）',
    pollutionPolicy:
      'Type B 拒收 suite.message 非空/Failed Suites/Unhandled Rejection/Uncaught Exception/Unhandled Errors 段/Errors N 摘要行；Type A 保留恰一指定公开 IO 未处理拒绝，但叠加 Uncaught Exception/hook 错误即拒收（两种真实 Vitest 污染形态入自测）',
    jsonSuccessWarning:
      'vitest 4.1.7 实证：未处理拒绝下 JSON reporter success 仍为 true、无 unhandledErrors 字段；Type A 判据组合 exit=1 + 默认 reporter stderr 证据（恰一注入标记+产品栈锚），不信任 json success',
    identityPolicy:
      '每条 repro 预声明执行身份（file+fullName 精确相等）；恰一 suite、零断言失败套件拒收、计数与行数互核、隐藏 skip 拒收',
    selfTest: { cases: selfTestResults, allOk: selfTestResults.every((c) => c.ok) },
    repros: receipts,
    cleanup: {
      ...cleanupProof,
      policy:
        '成功路径删树后 existsSync=false 取证；准备失败路径在 prepareTree 内部清理并在异常信息携带证明',
    },
    allPass,
  }
  const outPath = path.join(evidenceDir, 'repros.json')
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`)
  const fmt = spawnSync('pnpm', ['exec', 'biome', 'check', '--write', outPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120_000,
  })
  if (fmt.status !== 0)
    throw new Error(`repros.json biome 格式化失败: ${fmt.stdout ?? ''}${fmt.stderr ?? ''}`)
  if (!allPass)
    throw new Error(
      `repro 存在未过项: ${JSON.stringify(
        receipts.filter((r) => !r.pass).map((r) => ({ id: r.id, issues: r.issues })),
      )}`,
    )
  console.log(
    `opening-io repros: ${receipts.length}/${receipts.length} PASS (${DISCOVER ? 'discover' : 'pinned'}) → ${outPath}`,
  )
  if (DISCOVER)
    for (const r of receipts)
      console.log(`  anchor ${r.id}: ${JSON.stringify(r.expectedErrorPart)}`)
} finally {
  // 失败路径清理：回执未写时也不留树。
  if (tree) await tree.removeTree()
}
