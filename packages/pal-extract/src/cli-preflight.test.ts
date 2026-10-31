/** Real CLI preflight failures, faithful roundtrip, ignored unknown arguments and output ownership. */

import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, expect, test } from 'vitest'
import {
  mkfContainer as mkf,
  u16Bytes as u16,
  u32Bytes as u32,
} from './__tests__/binary-fixtures.js'
import { createCliTestHost } from './__tests__/cli-host.js'

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

const cliHost = createCliTestHost('cli-preflight-')

const { runCli } = cliHost

function makeTree(rawFiles: Record<string, Uint8Array>): string {
  const tree = cliHost.createTree()
  const rawDir = join(tree, 'data', 'raw')
  for (const [name, bytes] of Object.entries(rawFiles)) writeFileSync(join(rawDir, name), bytes)
  return tree
}

afterAll(cliHost.disposeAll)

test('ROUND-TRIP FAILED 精确诊断 + exit 2（setPalette 非 0 尾 operand）', async () => {
  // bytecode: ip0 setPalette(9, op1=1) —— disasm 丢 operand[1]，recompile 写 0 ≠ 原始；
  //           ip1 end。CLI round-trip guard 自检拒绝 → exit 2（不是 exit 1）。
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
  const result = await runCli(tree, ['--faithful'])
  expect(result.exitCode).toBe(2)
  expect(result.stderr).toContain('[pal-extract] ROUND-TRIP FAILED — events 不忠实')
  expect(result.stdout).not.toContain('[pal-extract] events round-trip OK')
  // round-trip 门在切片落盘之前触发：不得有任何 events 产物
  expect(existsSync(join(tree, 'data', 'extracted', 'events'))).toBe(false)
})

test('M.MSG 缺失 → ENOENT + exit 1', async () => {
  const tree = makeTree({ 'SSS.MKF': buildSss(new Uint8Array(8)), 'WORD.DAT': buildWordDat() })
  const result = await runCli(tree, ['--faithful'])
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('ENOENT')
  expect(result.stderr).toContain('M.MSG')
})

test('WORD.DAT 缺失 → ENOENT + exit 1', async () => {
  const tree = makeTree({
    'SSS.MKF': buildSss(new Uint8Array(8)),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
  })
  const result = await runCli(tree, ['--faithful'])
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('ENOENT')
  expect(result.stderr).toContain('WORD.DAT')
})

test('SSS.MKF 头部过短 → MKF 精确诊断 + exit 1', async () => {
  const tree = makeTree({
    'SSS.MKF': new Uint8Array([0x08, 0x00]),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
  })
  const result = await runCli(tree, ['--faithful'])
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('MKF: buffer too small for header')
})

test('SSS.MKF 首偏移非 4 对齐 → MKF 精确诊断 + exit 1', async () => {
  const tree = makeTree({
    'SSS.MKF': new Uint8Array([0x06, 0x00, 0x00, 0x00, 0, 0, 0, 0]),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
  })
  const result = await runCli(tree, ['--faithful'])
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('MKF: first offset 6 not multiple of 4')
})

test('输入预检失败保留既有产物与 videos', async () => {
  const tree = makeTree({}) // 无 SSS.MKF：输入预检失败不得清理旧输出
  const extracted = join(tree, 'data', 'extracted')
  mkdirSync(join(extracted, 'videos'), { recursive: true })
  writeFileSync(join(extracted, 'stale-events.json'), '{}')
  writeFileSync(join(extracted, 'videos', '1.mp4'), 'KEEP')
  const result = await runCli(tree, ['--faithful'])
  expect(result.exitCode).toBe(1) // 在加载 SSS.MKF 时失败
  expect(result.stderr).toContain('SSS.MKF')
  expect(readFileSync(join(extracted, 'stale-events.json'), 'utf8')).toBe('{}')
  expect(readFileSync(join(extracted, 'videos', '1.mp4'), 'utf8')).toBe('KEEP') // PRESERVE
})

test('未知参数被忽略：仍执行输入预检并报告缺SSS', async () => {
  const tree = makeTree({})
  const result = await runCli(tree, ['--definitely-not-a-command', 'extra'])
  // 未知参数被忽略；已知faithful/english选项仍由CLI解析。此处缺SSS先失败。
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('SSS.MKF')
  expect(result.stderr).not.toContain('Usage')
})

test('OUT 根是共享 symlink 时，清理前拒绝且保留目标 marker', async () => {
  const tree = makeTree({})
  const extracted = join(tree, 'data', 'extracted')
  const sharedOut = join(tree, 'shared-extracted')
  mkdirSync(sharedOut, { recursive: true })
  writeFileSync(join(sharedOut, 'owned-by-other-tree'), 'KEEP')
  rmSync(extracted, { recursive: true, force: true })
  symlinkSync(sharedOut, extracted, 'dir')

  const result = await runCli(tree, ['--faithful'])
  expect(result.exitCode).toBe(1)
  expect(existsSync(join(sharedOut, 'owned-by-other-tree'))).toBe(true)
  expect(readFileSync(join(sharedOut, 'owned-by-other-tree'), 'utf8')).toBe('KEEP')
  expect(result.stderr).toContain('shared output')
})

test('data 父目录是共享 symlink 时，清理前拒绝且保留目标 marker', async () => {
  const tree = makeTree({})
  const data = join(tree, 'data')
  const sharedData = join(tree, 'shared-data')
  mkdirSync(join(sharedData, 'extracted'), { recursive: true })
  writeFileSync(join(sharedData, 'extracted', 'owned-by-other-tree'), 'KEEP')
  rmSync(data, { recursive: true, force: true })
  symlinkSync(sharedData, data, 'dir')

  const result = await runCli(tree, ['--faithful'])
  expect(result.exitCode).toBe(1)
  expect(existsSync(join(sharedData, 'extracted', 'owned-by-other-tree'))).toBe(true)
  expect(readFileSync(join(sharedData, 'extracted', 'owned-by-other-tree'), 'utf8')).toBe('KEEP')
  expect(result.stderr).toContain('shared output')
})
