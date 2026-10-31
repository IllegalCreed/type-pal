/** Real CLI battle sprite/background bytes, PNG pixels and admission; source-only process host owns isolation. */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { encodeSpriteChunk } from '@type-pal/shared'
import { PNG } from 'pngjs'
import { afterAll, expect, test } from 'vitest'
import { mkfContainer as mkfArchive } from './__tests__/binary-fixtures.js'
import { type CliRunResult, createCliTestHost } from './__tests__/cli-host.js'
import {
  buildDataMkfArchive,
  buildSssArchive,
  buildTailPipelineInputs,
  buildWordDatArchive,
} from './__tests__/cli-pipeline-inputs.js'
import { yj2EncodeLiterals as yj2Compress } from './__tests__/yj2-literals.js'

const cliHost = createCliTestHost('cli-battle-assets-')

/** F.MKF chunk0：合法 YJ2 压缩的 1 帧 4×4 player sprite group。 */
const playerSpriteChunk = encodeSpriteChunk([
  { width: 4, height: 4, pixels: new Uint8Array(16).fill(11), opaque: new Uint8Array(16).fill(1) },
])

/** ABC.MKF chunk0：合法 YJ2 压缩的 1 帧 4×4 enemy sprite group（与 player 填充值不同）。 */
const enemySpriteChunk = encodeSpriteChunk([
  { width: 4, height: 4, pixels: new Uint8Array(16).fill(22), opaque: new Uint8Array(16).fill(1) },
])

/** FBP 合法战斗背景：64000B（320×200）索引像素模式流。 */
function makeBattleBackground(): Uint8Array {
  const pixels = new Uint8Array(320 * 200)
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 7) % 256
  return pixels
}

const bg64000 = makeBattleBackground()

async function runBattleAssetsCli(battleInputs: Record<string, Uint8Array>): Promise<{
  tree: string
  result: CliRunResult
}> {
  const tree = cliHost.createTree()
  const rawDir = join(tree, 'data', 'raw')
  const rawFiles = {
    'SSS.MKF': buildSssArchive(),
    'M.MSG': new TextEncoder().encode('HELLO MSG'),
    'WORD.DAT': buildWordDatArchive(),
    'DATA.MKF': buildDataMkfArchive(),
    ...buildTailPipelineInputs(),
    ...battleInputs,
  }
  for (const [name, bytes] of Object.entries(rawFiles)) writeFileSync(join(rawDir, name), bytes)
  mkdirSync(join(tree, 'data', 'raw', 'Musics'), { recursive: true })
  writeFileSync(join(tree, 'data', 'raw', 'mus.mkf'), new Uint8Array([8, 0, 0, 0, 8, 0, 0, 0]))
  const result = await cliHost.runCli(tree, ['--faithful'])
  return { tree, result }
}

afterAll(cliHost.disposeAll)

test('战斗精灵 dump-all：F/ABC 合法 YJ2 sprite 解压落 gzip blob + raw 回退原文 + manifest', async () => {
  const { tree, result } = await runBattleAssetsCli({
    'F.MKF': mkfArchive([
      yj2Compress(playerSpriteChunk),
      new Uint8Array(0),
      new Uint8Array(2), // YJ2 source-too-small → raw bytes, zero frames.
    ]),
    'ABC.MKF': mkfArchive([yj2Compress(enemySpriteChunk)]),
  })
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('done. output →')
  // F chunk0（1 帧）+ F chunk2（raw 2B，0 帧）+ ABC chunk0（1 帧）
  expect(result.stdout).toContain('battle sprite blobs written: 3 sprites, 2 frames total')
  const out = (rel: string) => join(tree, 'data', 'extracted', rel)
  expect(result.stderr).toBe('[pal-extract] unifont-cn.bdf 缺,跳过 font\n')
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

test('战斗背景正向：合法 YJ2 64000B FBP → PNG + ids；解压后尺寸不符精确 warn skip', async () => {
  const { tree, result } = await runBattleAssetsCli({
    'FBP.MKF': mkfArchive([
      yj2Compress(bg64000),
      yj2Compress(new Uint8Array(100)), // Valid compressed stream, invalid image dimensions.
      new Uint8Array(0),
      new Uint8Array(0),
      new Uint8Array(0),
    ]),
  })
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('done. output →')
  expect(result.stdout).toContain('battle backgrounds written: 1 / 5 chunks')
  expect(result.stderr).toBe(
    '[pal-extract] FBP chunk 1: 解压后 100 bytes ≠ 64000,skip\n' +
      '[pal-extract] unifont-cn.bdf 缺,跳过 font\n',
  )
  const out = (rel: string) => join(tree, 'data', 'extracted', rel)
  // 尺寸门通过的 chunk0 → 320×200 indexed PNG（签名 + IHDR 维度）
  const png = readFileSync(out('images/battle/bg/000.png'))
  expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = new DataView(png.buffer, png.byteOffset, png.byteLength)
  expect(ihdr.getUint32(16)).toBe(320)
  expect(ihdr.getUint32(20)).toBe(200)
  // 独立PNG解包后逐像素核R/G/B为输入下标、A全不透明；不能用同一个编码器造oracle。
  const decoded = PNG.sync.read(png)
  const expectedRgba = Buffer.alloc(bg64000.length * 4)
  for (const [index, value] of bg64000.entries()) {
    expectedRgba[index * 4] = value
    expectedRgba[index * 4 + 1] = value
    expectedRgba[index * 4 + 2] = value
    expectedRgba[index * 4 + 3] = 255
  }
  expect(decoded.data).toEqual(expectedRgba)
  // 尺寸门拒绝/空 chunk 不落 PNG
  expect(existsSync(out('images/battle/bg/001.png'))).toBe(false)
  expect(existsSync(out('images/battle/bg/002.png'))).toBe(false)
  // battle-bgs.json：count=全部 chunk 数、ids 只含有效背景
  const bgs = JSON.parse(readFileSync(out('data/battle-bgs.json'), 'utf8'))
  expect(bgs).toEqual({ count: 5, ids: [0] })
})
