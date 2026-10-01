// Q10 · pal-extract CLI 隔离实跑（对应 Codex COMMON-01：cli.ts REPO_ROOT 从模块位置派生，
// mkdtemp 复制模块树 + 合成小输入即可隔离覆盖公开 CLI，不触真实 data/raw/extracted）。
//
// 隔离方式：mkdtemp 临时树内复制 src/** 与 package.json（只读产品源的拷贝）、symlink 真实
// node_modules（依赖解析），REPO_ROOT 解析到临时树 → RAW/OUT 全部落临时目录。
// 合成输入为合法最小格式（SSS 5 chunk / WORD.DAT 565×10B / M.MSG 平铺 GBK），
// 不写真实 raw/extracted、不运行主工程生成。
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

const EVENT_OBJECT_SIZE = 32
const SCENE_SIZE = 8
const OBJECT_STRIDE = 14
const OBJECT_TABLE_SLOTS = 551 // 0..550（enemy 段到 550）
const WORD_RECORDS = 565
const WORD_LENGTH = 10

/** 场景入口 ip=1：showDialog(msg 0)；ip=2：end advance。指令 0 不可达填充。 */
function buildSss(options: { truncateEventObjects?: boolean } = {}): Uint8Array {
  const eventObject = new Uint8Array(EVENT_OBJECT_SIZE)
  const scene = new Uint8Array(SCENE_SIZE)
  const sceneView = new DataView(scene.buffer)
  sceneView.setUint16(0, 1, true) // mapNum
  sceneView.setUint16(2, 1, true) // scriptOnEnter → ip 1
  sceneView.setUint16(4, 2, true) // scriptOnTeleport → ip 2
  sceneView.setUint16(6, 0, true) // eventObjectIndex
  const objects = new Uint8Array(OBJECT_TABLE_SLOTS * OBJECT_STRIDE) // 全 0：无全局脚本入口
  // 物品 61 命名走 WORD.DAT；给 61 一个 giveItem 引用（指令 0，不可达填充不参与 slice）
  const messageOffsets = new Uint8Array([...u32(0), ...u32(9)])
  // bytecode：ip0 giveItem(61×1)，ip1 showDialog(msg0)，ip2 end-advance
  const bytecode = new Uint8Array([
    ...u16(0x001f),
    ...u16(61),
    ...u16(1),
    ...u16(0),
    ...u16(0xffff),
    ...u16(0),
    ...u16(0),
    ...u16(0),
    ...u16(0x0001),
    ...u16(0),
    ...u16(0),
    ...u16(0),
  ])
  const chunk0 = options.truncateEventObjects ? eventObject.slice(0, 10) : eventObject
  return mkf([chunk0, scene, objects, messageOffsets, bytecode])
}

function buildWordDat(): Uint8Array {
  const buf = new Uint8Array(WORD_RECORDS * WORD_LENGTH).fill(0x20)
  // 记录 61 = 物品段第 0 条：'ITEMNAME1'（尾部标记 '1' 由 parseWordDat 剥除）
  const name = 'ITEMNAME1'
  for (const [index, ch] of [...name].entries()) buf[61 * WORD_LENGTH + index] = ch.charCodeAt(0)
  return buf
}

const MSG_TEXT = 'HELLO MSG'

interface RunResult {
  exitCode: number | null
  stdout: string
  stderr: string
}

function runCli(tree: string): Promise<RunResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(
      process.execPath,
      [join(REAL_PACKAGE, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'src/cli.ts'],
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
    child.on('close', (exitCode) => resolvePromise({ exitCode, stdout, stderr }))
  })
}

function makeTree(rawFiles: Record<string, Uint8Array>): string {
  const tree = mkdtempSync(join(tmpdir(), 'glm-q-cli-'))
  const pkgDir = join(tree, 'packages', 'pal-extract')
  mkdirSync(pkgDir, { recursive: true })
  cpSync(join(REAL_PACKAGE, 'src'), join(pkgDir, 'src'), { recursive: true })
  cpSync(join(REAL_PACKAGE, 'package.json'), join(pkgDir, 'package.json'))
  symlinkSync(join(REAL_PACKAGE, 'node_modules'), join(pkgDir, 'node_modules'), 'dir')
  const rawDir = join(tree, 'data', 'raw')
  mkdirSync(rawDir, { recursive: true })
  for (const [name, bytes] of Object.entries(rawFiles)) writeFileSync(join(rawDir, name), bytes)
  return tree
}

const trees: string[] = []
afterAll(() => {
  for (const tree of trees) rmSync(tree, { recursive: true, force: true })
})

test('Q10 CLI 隔离实跑：合成小输入走完事件管线（round-trip 门 + 切片落盘 + 词表注记）', async () => {
  const tree = makeTree({
    'SSS.MKF': buildSss(),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
  })
  trees.push(tree)
  const result = await runCli(tree)
  // 事件管线全绿后，数据表阶段因缺 DATA.MKF 拒绝（合成输入只覆盖事件段）。
  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('[pal-extract] events round-trip OK')
  expect(result.stdout).toContain('[pal-extract] events written: 1 scenes')
  expect(result.stderr).toContain('ENOENT')

  const eventsDir = join(tree, 'data', 'extracted', 'events')
  const scene = JSON.parse(readFileSync(join(eventsDir, 'scene-000.json'), 'utf8'))
  expect(scene.scene).toBe(0)
  const sceneCommands = scene.segments.flatMap(
    (segment: { commands: { op: string }[] }) => segment.commands,
  )
  expect(sceneCommands.map((command: { op: string }) => command.op)).toEqual(['showDialog', 'end'])
  expect(sceneCommands[0].text).toBe(MSG_TEXT)
  const shared = JSON.parse(readFileSync(join(eventsDir, 'shared.json'), 'utf8'))
  expect(shared.segments.flatMap((segment: { commands: unknown[] }) => segment.commands)).toEqual(
    [],
  )
  const objects = JSON.parse(readFileSync(join(eventsDir, 'objects.json'), 'utf8'))
  expect(objects.segments.flatMap((segment: { commands: unknown[] }) => segment.commands)).toEqual(
    [],
  )
  const all = JSON.parse(readFileSync(join(eventsDir, 'all.json'), 'utf8'))
  expect(all.segments).toHaveLength(1)
  const allCommands = all.segments[0].commands
  expect(allCommands).toHaveLength(3)
  const give = allCommands.find((command: { op: string }) => command.op === 'giveItem')
  expect(give.itemId).toBe(61)
  expect(give._item).toBe('ITEMNAME') // WORD.DAT 记录 61 + 尾标记剥除
}, 60000)

test('Q10 CLI 隔离实跑：截断 SSS chunk0 在解析边界精确拒绝且不产出事件文件', async () => {
  const tree = makeTree({
    'SSS.MKF': buildSss({ truncateEventObjects: true }),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
  })
  trees.push(tree)
  const result = await runCli(tree)
  expect(result.exitCode).toBe(1)
  expect(result.stdout).not.toContain('[pal-extract] events round-trip OK')
  expect(result.stderr).toContain('SSS chunk0: byte length 10 is not a multiple of 32')
  expect(existsSync(join(tree, 'data', 'extracted', 'events'))).toBe(false)
}, 60000)
