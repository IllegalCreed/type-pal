// Q10 r17 · CLI 战斗资产段隔离实跑（FBP 战斗背景正向 + F/ABC 战斗精灵 dump-all 与 raw 回退）。
//
// 排重 basis（本批两例只打旧证未覆盖的窄轴）：
// - cli-isolated.glm-q.test.ts 全管线例对尾段只断言跳过路径计数——「battle sprite blobs
//   written: 0 sprites」「battle backgrounds written: 0 / 5 chunks」（F/ABC 空 MKF、
//   FBP 全空 chunk）。cli.ts:786-821 loadBattleMkf（非空 chunk → YJ2 解压 / 失败回退
//   raw → gzip blob + parseSpriteChunk 帧数）与 :830-855 FBP 正向（合法 YJ2 64000B →
//   PNG + battle-bgs.json ids / 解压后 ≠64000 精确 warn skip）从未用真实数据走过。
// - 各解码器单元（decompressYj2/parseSpriteChunk/encodeIndexedPng）另有直测，不覆盖
//   CLI 总装落盘。corpus「battle-sprite/battle-bgs/battle bg」0 命中。
// 本文件自包含复制既有合成夹具（不动 cli-isolated 执行集=零针重采）；F/ABC/FBP 真实
// 数据为本批新增。反控 BA1/2 为输入轴分区对照（见 counters/*.axis）。
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
import { gunzipSync } from 'node:zlib'
import { encodeSpriteChunk } from '@type-pal/shared'
import { afterAll, expect, test } from 'vitest'
import { yj2EncodeLiterals } from './__tests__/glm-q/yj2-encoder.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REAL_PACKAGE = resolve(HERE, '..')

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2)
  new DataView(out.buffer).setUint16(0, value, true)
  return out
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, value, true)
  return out
}

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

// ── 以下构造器自包含复制自 cli-isolated.glm-q.test.ts（上游段输入与前波同源同法）──

const EVENT_OBJECT_SIZE = 32
const SCENE_SIZE = 8
const OBJECT_STRIDE = 14
const OBJECT_TABLE_SLOTS = 551
const WORD_RECORDS = 565
const WORD_LENGTH = 10
const MSG_TEXT = 'HELLO MSG'

function buildSss(): Uint8Array {
  const eventObject = new Uint8Array(EVENT_OBJECT_SIZE)
  const scene = new Uint8Array(SCENE_SIZE)
  const sceneView = new DataView(scene.buffer)
  sceneView.setUint16(0, 1, true)
  sceneView.setUint16(2, 1, true)
  sceneView.setUint16(4, 2, true)
  sceneView.setUint16(6, 0, true)
  const objects = new Uint8Array(OBJECT_TABLE_SLOTS * OBJECT_STRIDE)
  const messageOffsets = new Uint8Array([...u32(0), ...u32(9)])
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
  return mkf([eventObject, scene, objects, messageOffsets, bytecode])
}

function buildWordDat(): Uint8Array {
  const buf = new Uint8Array(WORD_RECORDS * WORD_LENGTH).fill(0x20)
  const name = 'ITEMNAME1'
  for (const [index, ch] of [...name].entries()) buf[61 * WORD_LENGTH + index] = ch.charCodeAt(0)
  return buf
}

function buildDataMkf(): Uint8Array {
  const store = new Uint8Array([...u16(61), ...new Uint8Array(16)])
  const roles = new Uint8Array(900)
  new DataView(roles.buffer).setUint16(24, 2, true)
  const spriteChunk = encodeSpriteChunk([
    { width: 4, height: 4, pixels: new Uint8Array(16).fill(3), opaque: new Uint8Array(16).fill(1) },
  ])
  return mkf([
    store,
    new Uint8Array(70),
    new Uint8Array(10),
    roles,
    new Uint8Array(32),
    new Uint8Array(12),
    new Uint8Array(20),
    new Uint8Array(0),
    new Uint8Array(0),
    spriteChunk,
    spriteChunk,
    new Uint8Array(40),
    new Uint8Array(282).fill(7),
    new Uint8Array(100),
    new Uint8Array(200),
  ])
}

function rleBitmap2x2(): Uint8Array {
  return new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x04, 9, 8, 7, 6])
}

function buildImageStageInputs(): Record<string, Uint8Array> {
  const withHeader = (rle: Uint8Array): Uint8Array =>
    new Uint8Array([...new Uint8Array([0x02, 0x00, 0x00, 0x00]), ...rle])
  return {
    'RNG.MKF': mkf([mkf([new Uint8Array(0)])]),
    'RGM.MKF': mkf([withHeader(rleBitmap2x2())]),
    'BALL.MKF': mkf([withHeader(rleBitmap2x2())]),
    'FIRE.MKF': mkf([]),
    'SOUNDS.MKF': mkf([new Uint8Array(0), new TextEncoder().encode('WAVDATA-1')]),
  }
}

/** 合法 YJ2 字面量压缩（专属编码器 + 0xFFF 终止符；产品 decoder 往返已由 r10 独立验证）。 */
function yj2Compress(data: Uint8Array): Uint8Array {
  return yj2EncodeLiterals(data)
}

const mapChunkYj2 = yj2Compress(new Uint8Array(65536))

// ── 本批新增：战斗资产段真实输入 ──────────────────────────────────────────────

/** F.MKF chunk0：合法 YJ2 压缩的 1 帧 4×4 player sprite group。 */
const playerSpriteChunk = encodeSpriteChunk([
  { width: 4, height: 4, pixels: new Uint8Array(16).fill(11), opaque: new Uint8Array(16).fill(1) },
])

/** ABC.MKF chunk0：合法 YJ2 压缩的 1 帧 4×4 enemy sprite group（与 player 填充值不同）。 */
const enemySpriteChunk = encodeSpriteChunk([
  { width: 4, height: 4, pixels: new Uint8Array(16).fill(22), opaque: new Uint8Array(16).fill(1) },
])

/** FBP 合法战斗背景：64000B（320×200）索引像素模式流。 */
const bg64000 = new Uint8Array(320 * 200)
for (let i = 0; i < bg64000.length; i++) bg64000[i] = (i * 7) % 256

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
  const tree = mkdtempSync(join(tmpdir(), 'glm-q-cli-ba-'))
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

/**
 * 全管线输入 + 本批战斗资产覆盖：
 *   fAbc=true → F.MKF 3 chunk（YJ2 player sprite / 空 / 2B raw 回退）、ABC.MKF 1 chunk；
 *   fbp=true  → FBP.MKF 5 chunk（合法 64000B 背景 / 100B 尺寸门 / 3 空含 splash 3/4）。
 * 分支化 ternary 使反控变异天然限定在单例分支内（另一例走对侧分支不受影响）。
 */
function buildBattleAssetsInputs(opts: {
  fAbc: boolean
  fbp: boolean
}): Record<string, Uint8Array> {
  const palette768 = new Uint8Array(768)
  for (let i = 0; i < 256; i++) {
    palette768[i * 3] = i % 64
    palette768[i * 3 + 1] = (i + 13) % 64
    palette768[i * 3 + 2] = 63 - (i % 64)
  }
  const palette1536 = new Uint8Array(1536)
  palette1536.set(palette768, 0)
  palette1536.set(palette768, 768)
  return {
    ...buildImageStageInputs(),
    'FBP.MKF': opts.fbp
      ? mkf([
          yj2Compress(bg64000),
          yj2Compress(new Uint8Array(100)), // BA2：尺寸门（解压后 ≠64000 → warn skip）
          new Uint8Array(0),
          new Uint8Array(0),
          new Uint8Array(0),
        ])
      : mkf([
          new Uint8Array(0),
          new Uint8Array(0),
          new Uint8Array(0),
          new Uint8Array(0),
          new Uint8Array(0),
        ]),
    'MAP.MKF': mkf([mapChunkYj2, mapChunkYj2]),
    'GOP.MKF': mkf([
      encodeSpriteChunk([
        {
          width: 4,
          height: 4,
          pixels: new Uint8Array(16).fill(3),
          opaque: new Uint8Array(16).fill(1),
        },
      ]),
      encodeSpriteChunk([
        {
          width: 4,
          height: 4,
          pixels: new Uint8Array(16).fill(5),
          opaque: new Uint8Array(16).fill(1),
        },
      ]),
    ]),
    'PAT.MKF': mkf([palette768, palette1536]),
    'MGO.MKF': mkf([yj2Compress(encodeSpriteChunk([]))]),
    'F.MKF': opts.fAbc
      ? mkf([
          yj2Compress(playerSpriteChunk),
          new Uint8Array(0),
          new Uint8Array(2), // BA1：raw 回退（YJ2 source-too-small throw → 原文 blob，0 帧）
        ])
      : mkf([]),
    'ABC.MKF': opts.fAbc ? mkf([yj2Compress(enemySpriteChunk)]) : mkf([]),
  }
}

async function runBattleAssetsCli(opts: { fAbc: boolean; fbp: boolean }): Promise<{
  tree: string
  result: RunResult
}> {
  const tree = makeTree({
    'SSS.MKF': buildSss(),
    'M.MSG': new TextEncoder().encode(MSG_TEXT),
    'WORD.DAT': buildWordDat(),
    'DATA.MKF': buildDataMkf(),
    ...buildBattleAssetsInputs(opts),
  })
  mkdirSync(join(tree, 'data', 'raw', 'Musics'), { recursive: true })
  trees.push(tree)
  const result = await runCli(tree)
  return { tree, result }
}

test('Q10 CLI 战斗精灵 dump-all：F/ABC 合法 YJ2 sprite 解压落 gzip blob + raw 回退原文 + manifest', async () => {
  const { tree, result } = await runBattleAssetsCli({ fAbc: true, fbp: false })
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('done. output →')
  // F chunk0（1 帧）+ F chunk2（raw 2B，0 帧）+ ABC chunk0（1 帧）
  expect(result.stdout).toContain('battle sprite blobs written: 3 sprites, 2 frames total')
  const out = (rel: string) => join(tree, 'data', 'extracted', rel)
  // YJ2 臂：blob = gzip(解压后 sprite group) —— gunzip 后与编码前逐字节一致
  expect(existsSync(out('data/battle-sprite/player/0.rle'))).toBe(true)
  const ungzip = (rel: string): Uint8Array => new Uint8Array(gunzipSync(readFileSync(out(rel))))
  expect(ungzip('data/battle-sprite/player/0.rle')).toEqual(playerSpriteChunk)
  expect(ungzip('data/battle-sprite/enemy/0.rle')).toEqual(enemySpriteChunk)
  // raw 回退臂：YJ2 失败（source too small）→ 原文 2B 逐字节保留
  expect(ungzip('data/battle-sprite/player/2.rle')).toEqual(new Uint8Array(2))
  // manifest：F 循环先于 ABC，空 chunk 不入列
  const manifest = JSON.parse(readFileSync(out('data/battle-sprites.json'), 'utf8'))
  expect(manifest.sprites).toEqual([
    { kind: 'player', id: 0 },
    { kind: 'player', id: 2 },
    { kind: 'enemy', id: 0 },
  ])
})

test('Q10 CLI 战斗背景正向：合法 YJ2 64000B FBP → PNG + ids；解压后尺寸不符精确 warn skip', async () => {
  const { tree, result } = await runBattleAssetsCli({ fAbc: false, fbp: true })
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('done. output →')
  expect(result.stdout).toContain('battle backgrounds written: 1 / 5 chunks')
  expect(result.stderr).toContain('FBP chunk 1: 解压后 100 bytes ≠ 64000,skip')
  const out = (rel: string) => join(tree, 'data', 'extracted', rel)
  // 尺寸门通过的 chunk0 → 320×200 indexed PNG（签名 + IHDR 维度）
  const png = readFileSync(out('images/battle/bg/000.png'))
  expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = new DataView(png.buffer, png.byteOffset, png.byteLength)
  expect(ihdr.getUint32(16)).toBe(320)
  expect(ihdr.getUint32(20)).toBe(200)
  // 尺寸门拒绝/空 chunk 不落 PNG
  expect(existsSync(out('images/battle/bg/001.png'))).toBe(false)
  expect(existsSync(out('images/battle/bg/002.png'))).toBe(false)
  // battle-bgs.json：count=全部 chunk 数、ids 只含有效背景
  const bgs = JSON.parse(readFileSync(out('data/battle-bgs.json'), 'utf8'))
  expect(bgs).toEqual({ count: 5, ids: [0] })
})
