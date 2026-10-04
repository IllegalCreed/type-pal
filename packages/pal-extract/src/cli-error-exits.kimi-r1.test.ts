/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · CLI 错误退出与输出策略合同（src/cli.ts）。
 *
 * 隔离方式同既有 glm-q 套件（cli-isolated.glm-q.test.ts 确立）：mkdtemp 临时树内复制
 * 只读产品 src/** 与 package.json、symlink node_modules，REPO_ROOT 解析到临时树 →
 * RAW/OUT 全部落临时目录；合成输入，不写真实 data/raw/extracted。
 *
 * 排重 basis（旧 fullName 不重复）：cli-isolated.glm-q.test.ts 已覆盖事件管线成功段、
 * DATA 表段、图像/音频段、全管线 exit 0、FBP 越界、截断 SSS chunk0；
 * cli-global-entries.glm-q.test.ts 覆盖十二类全局 hook 接线。本文件只补：
 * - ROUND-TRIP FAILED → console.error + process.exit(2)（cli.ts:263-267 错误退出）：
 *   setPalette operand[1] 非 0 尾巴被 disasm 丢弃 → recompile 写 0 ≠ 原始字节。
 * - 输入文件不存在：M.MSG / WORD.DAT 缺失 → ENOENT + exit 1。
 * - 输入格式错误：SSS.MKF 头部过短 / 首偏移非 4 对齐 → openMkf 精确诊断 + exit 1。
 * - 输出目录覆盖策略：陈旧产物被清、PRESERVE(videos/) 保留（cli.ts:189-197）。
 * - 命令面真值：cli.ts 不消费 argv，多余参数被忽略（错误诊断仍是 ENOENT 而非 usage）。
 * 每条断言精确到诊断文本与 exit code（卡面要求）。
 */

import { spawn } from 'node:child_process'
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
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, expect, test } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const REAL_PACKAGE = resolve(HERE, '..')

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, value, true)
  return out
}

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2)
  new DataView(out.buffer).setUint16(0, value, true)
  return out
}

/** MKF 归档：N+1 个 u32 LE 偏移头 + 顺序 chunk 数据（shared/mkf.ts 合同）。 */
function mkf(chunks: Uint8Array[]): Uint8Array {
  const headerSize = (chunks.length + 1) * 4
  const bodyLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const buf = new Uint8Array(headerSize + bodyLength)
  const view = new DataView(buf.buffer)
  let offset = headerSize
  for (const [index, chunk] of chunks.entries()) {
    view.setUint32(index * 4, offset, true)
    buf.set(chunk, offset)
    offset += chunk.length
  }
  view.setUint32(chunks.length * 4, offset, true)
  return buf
}

const MSG_TEXT = 'HELLO MSG'

/** 最小合法 SSS.MKF：1 EO / 1 scene(enter=1) / 全 0 OBJECT 表 / msg 偏移表 / 给定 bytecode。 */
function buildSss(bytecode: Uint8Array): Uint8Array {
  const eventObject = new Uint8Array(32)
  const scene = new Uint8Array(8)
  const sceneView = new DataView(scene.buffer)
  sceneView.setUint16(0, 1, true)
  sceneView.setUint16(2, 1, true) // scriptOnEnter → ip 1
  const objects = new Uint8Array(551 * 14)
  const messageOffsets = new Uint8Array([...u32(0), ...u32(MSG_TEXT.length)])
  return mkf([eventObject, scene, objects, messageOffsets, bytecode])
}

function buildWordDat(): Uint8Array {
  return new Uint8Array(565 * 10).fill(0x20)
}

interface RunResult {
  exitCode: number | null
  stdout: string
  stderr: string
}

function runCli(tree: string, args: string[] = []): Promise<RunResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [join(REAL_PACKAGE, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'src/cli.ts', ...args],
      {
        cwd: join(tree, 'packages', 'pal-extract'),
        env: { ...process.env, NODE_COMPILE_CACHE: '' },
      },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.once('error', reject)
    child.on('close', (exitCode) => resolvePromise({ exitCode, stdout, stderr }))
  })
}

const trees: string[] = []
afterAll(() => {
  for (const tree of trees) rmSync(tree, { recursive: true, force: true })
})

function makeTree(rawFiles: Record<string, Uint8Array>): string {
  const tree = mkdtempSync(join(tmpdir(), 'kimi-r1-cli-'))
  const pkgDir = join(tree, 'packages', 'pal-extract')
  mkdirSync(pkgDir, { recursive: true })
  cpSync(join(REAL_PACKAGE, 'src'), join(pkgDir, 'src'), { recursive: true })
  cpSync(join(REAL_PACKAGE, 'package.json'), join(pkgDir, 'package.json'))
  symlinkSync(join(REAL_PACKAGE, 'node_modules'), join(pkgDir, 'node_modules'), 'dir')
  const rawDir = join(tree, 'data', 'raw')
  mkdirSync(rawDir, { recursive: true })
  for (const [name, bytes] of Object.entries(rawFiles)) writeFileSync(join(rawDir, name), bytes)
  trees.push(tree)
  return tree
}

test('KIMI-R1 CLI：ROUND-TRIP FAILED 精确诊断 + exit 2（setPalette 非 0 尾 operand）', async () => {
  // bytecode: ip0 setPalette(9, op1=1) —— disasm 丢 operand[1]，recompile 写 0 ≠ 原始；
  //           ip1 end。cli.ts:263-267 自检拒绝 → exit 2（不是 exit 1）。
  const bytecode = new Uint8Array([
    ...u16(0x008b),
    ...u16(9),
    ...u16(1),
    ...u16(0),
    ...u16(0x0000),
    ...u16(0),
    ...u16(0),
    ...u16(0),
  ])
  const tree = makeTree({
    'SSS.MKF': buildSss(bytecode),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
  })
  const result = await runCli(tree)
  expect(result.exitCode).toBe(2)
  expect(result.stderr).toContain('[pal-extract] ROUND-TRIP FAILED — events 不忠实')
  expect(result.stdout).not.toContain('[pal-extract] events round-trip OK')
  // round-trip 门在切片落盘之前触发：不得有任何 events 产物
  expect(existsSync(join(tree, 'data', 'extracted', 'events'))).toBe(false)
})

test('KIMI-R1 CLI：M.MSG 缺失 → ENOENT + exit 1', async () => {
  const tree = makeTree({ 'SSS.MKF': buildSss(new Uint8Array(8)), 'WORD.DAT': buildWordDat() })
  const result = await runCli(tree)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('ENOENT')
  expect(result.stderr).toContain('M.MSG')
})

test('KIMI-R1 CLI：WORD.DAT 缺失 → ENOENT + exit 1', async () => {
  const tree = makeTree({
    'SSS.MKF': buildSss(new Uint8Array(8)),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
  })
  const result = await runCli(tree)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('ENOENT')
  expect(result.stderr).toContain('WORD.DAT')
})

test('KIMI-R1 CLI：SSS.MKF 头部过短 → MKF 精确诊断 + exit 1', async () => {
  const tree = makeTree({
    'SSS.MKF': new Uint8Array([0x08, 0x00]),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
  })
  const result = await runCli(tree)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('MKF: buffer too small for header')
})

test('KIMI-R1 CLI：SSS.MKF 首偏移非 4 对齐 → MKF 精确诊断 + exit 1', async () => {
  const tree = makeTree({
    'SSS.MKF': new Uint8Array([0x06, 0x00, 0x00, 0x00, 0, 0, 0, 0]),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
  })
  const result = await runCli(tree)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('MKF: first offset 6 not multiple of 4')
})

test('KIMI-R1 CLI：输出目录覆盖策略——陈旧产物清除、videos/ PRESERVE 保留', async () => {
  const tree = makeTree({}) // 无 SSS.MKF：清理在加载输入之前执行
  const extracted = join(tree, 'data', 'extracted')
  mkdirSync(join(extracted, 'videos'), { recursive: true })
  writeFileSync(join(extracted, 'stale-events.json'), '{}')
  writeFileSync(join(extracted, 'videos', '1.mp4'), 'KEEP')
  const result = await runCli(tree)
  expect(result.exitCode).toBe(1) // 随后加载 SSS.MKF 才失败
  expect(result.stderr).toContain('SSS.MKF')
  expect(existsSync(join(extracted, 'stale-events.json'))).toBe(false) // 陈旧产物被清
  expect(readFileSync(join(extracted, 'videos', '1.mp4'), 'utf8')).toBe('KEEP') // PRESERVE
})

test('KIMI-R1 CLI：命令面真值——不消费 argv，多余参数被忽略', async () => {
  const tree = makeTree({})
  const result = await runCli(tree, ['--definitely-not-a-command', 'extra'])
  // 参数被忽略、管线照常尝试加载输入 → 诊断仍是 ENOENT SSS.MKF（而非 usage/未知参数）
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('SSS.MKF')
  expect(result.stderr).not.toContain('Usage')
})
