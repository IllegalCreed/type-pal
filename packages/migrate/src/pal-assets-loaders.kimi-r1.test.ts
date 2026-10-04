/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · pal-assets 加载器残余分支（pal-assets.ts:361-1120）。
 *
 * 隔离：repo 一律为本次 mkdtemp 合成 extracted 树（afterEach 仅清理本次目录）；
 * 不触碰真实 data/extracted、projects/pal 或 packages/reforge 资产。
 *
 * 公开 caller 边界：loadPalEffectSprites / loadPalFrameAnimations 是模块私有函数，
 * 唯一公开入口是 loadPalAssets（pal-assets.ts:979）；本文件对这两个阶段的合同一律
 * 经 loadPalAssets 实跑，上游阶段用关系闭包自洽的合成输入（RNG 零帧 manifest +
 * 空 sub-MKF 动画块、sounds 505 三方闭包、static images 全量），不 mock 核心管线。
 *
 * 排重 basis（旧 fullName 不重复）：pal-assets.sound-closure/sound-metadata/palette/
 * portraits/backgrounds/items/glm-o/glm-next-wave 各套件已覆盖 sounds 三方闭包主路径、
 * palette/立绘主面与若干守卫。本文件只补 fast lcov 一手测量的未覆盖 edge：
 * - loadPalSoundAssets：metadata 段号不连续（:623）。
 * - （经 loadPalAssets）loadPalFrameAnimations manifest 段数/段号/帧清单守卫
 *   （:692/:698/:700/:701）与解码帧数不符（:716）。
 * - loadPalStaticImages：portraits count 非正（:381）、立绘≠88（:407）、物品 0 哨兵
 *   漂移（:435）、非零图标≠233（:444-445）、图标源缺失（:451）、战场背景尺寸/像素
 *   非法（:348/:353）；合法全量 happy path（378 条记录逐字段断言 + hash 自洽）。
 * - loadPalWorldSprites：源集合不完整（:774）、非 gzip（:790）、字节总量漂移（:819，
 *   附 legacy 坏尾归集）。
 * - loadPalBattleSprites：manifest 非数组（:873）、序列不符（:878-881）、目录集合
 *   漂移（:894）、非 gzip（:910）、总量漂移（:940，含 kind 三元 :913 双向、label
 *   三元 :935 双向、legacy 坏尾归集 :920）。
 * 不覆盖（ledger）：
 * - :339 bakeIndexedPng 像素长度——PNG.sync.read 恒产出 w*h*4 data，guard 构造上不可达。
 * - :412 未知 roleId——PAL_PLAYER_FACE_FRAME_BY_ROLE_ID/ROLE_SLUGS 冻结常量闭包，不可注入。
 * - :530/:533/:546 effectSprites 与 :1059 tileset strict 0 帧——effectSprites 阶段在
 *   loadPalAssets 全链上游（frameAnimations 需合法 YJ2 压缩 RNG 帧使 decode 出帧）通过
 *   后方可到达；合法 YJ2 Huffman 压缩只能由 pal-extract 专属 fixture
 *   （src/__tests__/glm-q/yj2-encoder.ts）产生，migrate 跨包引用越界、自造压缩流非法；
 *   真实数据路径由 full profile 覆盖。:533/:1059 另因 parseSpriteChunkStrict 对
 *   declaredCount<=0 先抛「sprite chunk 不含帧」，frames.length===0 判断构造上不可达。
 * - :559-564 bakeRgbaFrames——decodeRngFrames 帧索引恒连续；palette 经 readPalette
 *   256 色校验后 colors[i] 恒存在，非法颜色臂不可达。
 * - :705 legacy 命中 / :707 cache-hit——同上 YJ2 边界：frameAnimations 全段通过需合法
 *   YJ2 RNG 帧；?? 0 回退与 miss/set 方向已随 manifest 守卫测试覆盖。
 * - :793 不含有效帧——shared parseWorldSpriteChunk 对全 sentinel 输入先抛
 *   「sprite chunk legacy 尾槽前不含有效帧」（一手实探：gzip([01 00 00 00]) 合成输入），
 *   frames.length===0 判断构造上不可达。
 * - :799/:821-829（world）、:941-955（battle）精确总量/digest/坏尾集合等值断言——digest 与总量是真实数据冻结 SHA256/字节数，合成输入不可构造等值
 *   （可达臂 :819/:940 已以合成漂移输入覆盖）。
 * - :1050-1101 loadPalAssets tileset/catalog 段——world/battle 阶段的冻结总量/digest
 *   哨兵（:825/:955）使合成输入无法通过到 tileset 阶段；真实数据路径由 full profile
 *   （.pal.test.ts / fastTestExcludes 套件）覆盖。
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { encodeSpriteChunk } from '@type-pal/shared'
import { PNG } from 'pngjs'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256 } from './migration-baseline.js'
import {
  loadPalAssets,
  loadPalBattleSprites,
  loadPalSoundAssets,
  loadPalStaticImages,
  loadPalWorldSprites,
} from './pal-assets.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'kimi-r1-palassets-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function write(repo: string, rel: string, data: Uint8Array | string): void {
  const full = resolve(repo, rel)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, data)
}

function writeJson(repo: string, rel: string, value: unknown): void {
  write(repo, rel, JSON.stringify(value))
}

const EXTRACTED = 'data/extracted'

function indexedPng(width: number, height: number, fill = 7): Uint8Array {
  const png = new PNG({ width, height })
  for (let i = 0; i < width * height; i++) {
    png.data[i * 4] = fill
    png.data[i * 4 + 1] = fill
    png.data[i * 4 + 2] = fill
    png.data[i * 4 + 3] = 255
  }
  return PNG.sync.write(png)
}

function paletteJson(): unknown {
  return { colors: Array.from({ length: 256 }, (_, i) => [i, i, i]) }
}

const frame2x2 = (): Uint8Array =>
  encodeSpriteChunk([
    { width: 2, height: 2, pixels: new Uint8Array(4).fill(3), opaque: new Uint8Array(4).fill(1) },
  ])

/** 合法 3 槽 chunk：frame0 合法 + 坏尾槽 + 0 sentinel（shared rle.boundaries 同构配方）。 */
function legacyTailChunk(): Uint8Array {
  const frame = [0x01, 0x00, 0x01, 0x00, 0x01, 0x07] // 1×1 单像素帧
  const badTail = [0xff, 0x0f, 0xff, 0x0f, 0x01, 0x00] // width/height 0x0FFF 不可解
  const declared = 3
  const tableBytes = declared * 2
  const chunk = new Uint8Array(tableBytes + frame.length + badTail.length)
  const view = new DataView(chunk.buffer)
  view.setUint16(0, declared, true)
  view.setUint16(2, (tableBytes + frame.length) / 2, true) // slot1 = 坏尾（word 偏移）
  // slot2 (byte 4) 保持 0 = trailing sentinel
  chunk.set(frame, tableBytes)
  chunk.set(badTail, tableBytes + frame.length)
  return chunk
}

// ── 合成上游链（loadPalAssets 公开入口用）────────────────────────────────

/** 空 sub-MKF 动画块（1 个 0 字节 sub-chunk）：decodeRngFrames → 0 帧。 */
function emptyRngBlob(): Uint8Array {
  const subMkf = new Uint8Array(8)
  new DataView(subMkf.buffer).setUint32(0, 8, true)
  new DataView(subMkf.buffer).setUint32(4, 8, true)
  return gzipSync(subMkf)
}

/** frameAnimations 阶段关系闭包自洽输入（12 段 × frameCount 0 + 4 块 legacy 调色板）。 */
function buildFrameAnimationsTree(repo: string): void {
  writeJson(repo, `${EXTRACTED}/data/rng-frames.json`, {
    chunks: Array.from({ length: 12 }, (_, index) => ({
      chunkIndex: index,
      frameCount: 0,
      frames: [],
    })),
  })
  for (const palette of [0, 2, 3, 6])
    writeJson(repo, `${EXTRACTED}/data/palette/${palette}.json`, paletteJson())
  const blob = emptyRngBlob()
  for (let index = 0; index < 12; index++)
    write(repo, `${EXTRACTED}/data/animation/rng-${String(index).padStart(2, '0')}.rle`, blob)
}

/** 合法 static-images 输入树（88 立绘 + 5 脸 + 234 物品/233 图标 + 52 战场背景）。 */
function buildStaticImagesTree(repo: string): void {
  writeJson(repo, `${EXTRACTED}/data/palette/0.json`, paletteJson())
  writeJson(repo, `${EXTRACTED}/data/portraits.json`, { count: 88 })
  const portrait = indexedPng(4, 4)
  for (let chunk = 1; chunk <= 88; chunk++)
    write(repo, `${EXTRACTED}/images/portraits/${String(chunk).padStart(2, '0')}.png`, portrait)
  for (const frame of [48, 49, 50, 51, 52])
    write(repo, `${EXTRACTED}/images/ui/frame-${frame}.png`, portrait)
  const items = Array.from({ length: 234 }, (_, i) =>
    i === 0 ? { id: 277, bitmap: 0 } : { id: 61 + i, bitmap: i },
  )
  writeJson(repo, `${EXTRACTED}/data/items.json`, items)
  const icon = indexedPng(4, 4)
  for (let chunk = 1; chunk <= 233; chunk++)
    write(repo, `${EXTRACTED}/images/items/${String(chunk).padStart(3, '0')}.png`, icon)
  const bg = indexedPng(320, 200)
  for (let chunk = 6; chunk <= 57; chunk++)
    write(repo, `${EXTRACTED}/images/battle/bg/${String(chunk).padStart(3, '0')}.png`, bg)
}

// ── sounds ──────────────────────────────────────────────────────────────

describe('KIMI-R1 loadPalSoundAssets 残余守卫', () => {
  test('三方闭包自洽全绿：363 非空 + 142 空，报告与记录逐字段断言', () => {
    const repo = tempRepo()
    const wav = new Uint8Array(16)
    wav.set([0x52, 0x49, 0x46, 0x46, 0x0c, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]) // RIFF....WAVE
    const chunks = Array.from({ length: 505 }, (_, index) => ({
      index,
      size: index >= 1 && index <= 363 ? 16 : 0, // 音效号必须为正整数：非空段 1..363
      isEmpty: !(index >= 1 && index <= 363),
    }))
    writeJson(repo, `${EXTRACTED}/data/sounds-metadata.json`, { chunkCount: 505, chunks })
    writeJson(repo, `${EXTRACTED}/asset-manifest.json`, {
      files: chunks
        .filter((chunk) => !chunk.isEmpty)
        .map((chunk) => ({ path: `sounds/${chunk.index}.wav`, size: 16 })),
    })
    for (let index = 1; index <= 363; index++) write(repo, `${EXTRACTED}/sounds/${index}.wav`, wav)
    const { binaries, report } = loadPalSoundAssets(repo)
    expect(report).toEqual({ sounds: 363, emptySounds: 142, soundBytes: 363 * 16 })
    expect(binaries).toHaveLength(363)
    expect(binaries[0]?.record).toMatchObject({
      kind: 'sound',
      path: 'assets/migrated/sounds/001.wav',
      mediaType: 'audio/wav',
      label: 'PAL 音效 001',
      origin: { kind: 'legacy-migrated', ref: 'sounds/1.wav' },
    })
    expect(binaries[0]?.record.sha256).toBe(sha256(wav))
  })

  test('metadata 段号不连续精确拒绝', () => {
    const repo = tempRepo()
    const chunks = Array.from({ length: 505 }, (_, index) => ({
      index,
      size: 0,
      isEmpty: true,
    }))
    chunks[7] = { index: 8, size: 0, isEmpty: true } // 期望 7 实际 8
    writeJson(repo, `${EXTRACTED}/data/sounds-metadata.json`, { chunkCount: 505, chunks })
    expect(() => loadPalSoundAssets(repo)).toThrow('PAL sound 段号不连续，期望 7，实际 8')
  })
})

// ── frame animations manifest 守卫（经公开 loadPalAssets）────────────────

/** loadPalAssets 到达 loadPalFrameAnimations 的最小前缀（soundfont/palette/videos + 合法 manifest/blobs）。 */
function buildPreFrameAnimationsTree(repo: string): void {
  write(repo, 'packages/reforge/public/soundfont.sf3', new Uint8Array([0x53, 0x46]))
  for (let video = 1; video <= 6; video++)
    write(repo, `${EXTRACTED}/videos/${video}.mp4`, new Uint8Array([0x00]))
  buildFrameAnimationsTree(repo)
}

describe('KIMI-R1 loadPalAssets → frameAnimations manifest 残余守卫', () => {
  test('RNG manifest 段数≠12 精确拒绝', () => {
    const repo = tempRepo()
    buildPreFrameAnimationsTree(repo)
    writeJson(repo, `${EXTRACTED}/data/rng-frames.json`, {
      chunks: [{ chunkIndex: 0, frameCount: 0, frames: [] }],
    })
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL RNG manifest 期望 12 段，收到 1')
  })

  test('RNG manifest 段号不连续精确拒绝', () => {
    const repo = tempRepo()
    buildPreFrameAnimationsTree(repo)
    writeJson(repo, `${EXTRACTED}/data/rng-frames.json`, {
      chunks: Array.from({ length: 12 }, (_, index) => ({
        chunkIndex: index === 0 ? 7 : index, // 首段即不符：守卫先于任何 blob 解码
        frameCount: 0,
        frames: [],
      })),
    })
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL RNG manifest 段号不连续，期望 0，实际 7')
  })

  test('RNG manifest 帧数与帧清单长度不符精确拒绝', () => {
    const repo = tempRepo()
    buildPreFrameAnimationsTree(repo)
    writeJson(repo, `${EXTRACTED}/data/rng-frames.json`, {
      chunks: Array.from({ length: 12 }, (_, index) => ({
        chunkIndex: index,
        frameCount: index === 0 ? 2 : 0,
        frames: index === 0 ? [{ index: 0 }] : [],
      })),
    })
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL RNG 0: manifest 帧清单不连续')
  })

  test('RNG manifest 帧下标不连续精确拒绝', () => {
    const repo = tempRepo()
    buildPreFrameAnimationsTree(repo)
    writeJson(repo, `${EXTRACTED}/data/rng-frames.json`, {
      chunks: Array.from({ length: 12 }, (_, index) => ({
        chunkIndex: index,
        frameCount: index === 0 ? 1 : 0,
        frames: index === 0 ? [{ index: 5 }] : [],
      })),
    })
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL RNG 0: manifest 帧清单不连续')
  })

  test('RNG 解码 0 帧 ≠ 登记 1 帧精确拒绝', () => {
    const repo = tempRepo()
    buildPreFrameAnimationsTree(repo)
    writeJson(repo, `${EXTRACTED}/data/rng-frames.json`, {
      chunks: Array.from({ length: 12 }, (_, index) => ({
        chunkIndex: index,
        frameCount: 1,
        frames: [{ index: 0 }],
      })),
    })
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL RNG 000: 解码 0 帧，manifest 登记 1')
  })
})

// ── static images ───────────────────────────────────────────────────────

describe('KIMI-R1 loadPalStaticImages 残余守卫与 happy path', () => {
  test('合法全量：378 条记录逐字段断言 + bytes/sha256 与来源自洽', () => {
    const repo = tempRepo()
    buildStaticImagesTree(repo)
    const { binaries, report } = loadPalStaticImages(repo)
    expect(binaries).toHaveLength(378)
    expect(report.portraits).toBe(88)
    expect(report.faces).toBe(5)
    expect(report.itemIcons).toBe(233)
    expect(report.battleBackgrounds).toBe(52)
    const portrait = binaries.find((asset) => asset.id.endsWith('001'))
    expect(portrait?.record).toMatchObject({
      kind: 'portrait',
      path: 'assets/migrated/portraits/001.png',
      mediaType: 'image/png',
      label: 'PAL 立绘 001',
      origin: { kind: 'legacy-migrated', ref: 'images/portraits/01.png' },
    })
    for (const asset of [binaries[0]!, binaries[100]!, binaries[377]!]) {
      const actual =
        asset.sourcePath === undefined
          ? asset.bytes!
          : new Uint8Array(readFileSync(asset.sourcePath))
      expect(asset.record.bytes).toBe(actual.byteLength)
      expect(asset.record.sha256).toBe(sha256(actual))
    }
  })

  test('portraits manifest count 非正整数精确拒绝', () => {
    const repo = tempRepo()
    writeJson(repo, `${EXTRACTED}/data/palette/0.json`, paletteJson())
    writeJson(repo, `${EXTRACTED}/data/portraits.json`, { count: 0 })
    expect(() => loadPalStaticImages(repo)).toThrow('PAL portraits manifest 期望正整数 count')
  })

  test('立绘实到 87 ≠ 88 精确拒绝', () => {
    const repo = tempRepo()
    writeJson(repo, `${EXTRACTED}/data/palette/0.json`, paletteJson())
    writeJson(repo, `${EXTRACTED}/data/portraits.json`, { count: 88 })
    const portrait = indexedPng(4, 4)
    for (let chunk = 1; chunk <= 87; chunk++)
      write(repo, `${EXTRACTED}/images/portraits/${String(chunk).padStart(2, '0')}.png`, portrait)
    expect(() => loadPalStaticImages(repo)).toThrow('PAL 立绘期望 88 张，收到 87')
  })

  test('物品 0 哨兵漂移（两个 bitmap 0）精确拒绝', () => {
    const repo = tempRepo()
    writeJson(repo, `${EXTRACTED}/data/palette/0.json`, paletteJson())
    writeJson(repo, `${EXTRACTED}/data/portraits.json`, { count: 88 })
    const portrait = indexedPng(4, 4)
    for (let chunk = 1; chunk <= 88; chunk++)
      write(repo, `${EXTRACTED}/images/portraits/${String(chunk).padStart(2, '0')}.png`, portrait)
    for (const frame of [48, 49, 50, 51, 52])
      write(repo, `${EXTRACTED}/images/ui/frame-${frame}.png`, portrait)
    const items = Array.from({ length: 234 }, (_, i) =>
      i < 2 ? { id: 277 + i, bitmap: 0 } : { id: 61 + i, bitmap: i },
    )
    writeJson(repo, `${EXTRACTED}/data/items.json`, items)
    expect(() => loadPalStaticImages(repo)).toThrow(
      'PAL 物品图标 0 哨兵漂移: items=234 zero=277,278',
    )
  })

  test('非零物品图标 232 ≠ 233（共享 bitmap）精确拒绝', () => {
    const repo = tempRepo()
    writeJson(repo, `${EXTRACTED}/data/palette/0.json`, paletteJson())
    writeJson(repo, `${EXTRACTED}/data/portraits.json`, { count: 88 })
    const portrait = indexedPng(4, 4)
    for (let chunk = 1; chunk <= 88; chunk++)
      write(repo, `${EXTRACTED}/images/portraits/${String(chunk).padStart(2, '0')}.png`, portrait)
    for (const frame of [48, 49, 50, 51, 52])
      write(repo, `${EXTRACTED}/images/ui/frame-${frame}.png`, portrait)
    const items = Array.from({ length: 234 }, (_, i) =>
      i === 0 ? { id: 277, bitmap: 0 } : { id: 61 + i, bitmap: Math.min(i, 232) },
    )
    writeJson(repo, `${EXTRACTED}/data/items.json`, items)
    expect(() => loadPalStaticImages(repo)).toThrow('PAL 非零物品图标期望 233 个，收到 232')
  })

  test('物品图标源缺失精确拒绝', () => {
    const repo = tempRepo()
    writeJson(repo, `${EXTRACTED}/data/palette/0.json`, paletteJson())
    writeJson(repo, `${EXTRACTED}/data/portraits.json`, { count: 88 })
    const portrait = indexedPng(4, 4)
    for (let chunk = 1; chunk <= 88; chunk++)
      write(repo, `${EXTRACTED}/images/portraits/${String(chunk).padStart(2, '0')}.png`, portrait)
    for (const frame of [48, 49, 50, 51, 52])
      write(repo, `${EXTRACTED}/images/ui/frame-${frame}.png`, portrait)
    const items = Array.from({ length: 234 }, (_, i) =>
      i === 0 ? { id: 277, bitmap: 0 } : { id: 61 + i, bitmap: i },
    )
    writeJson(repo, `${EXTRACTED}/data/items.json`, items)
    const icon = indexedPng(4, 4)
    for (let chunk = 1; chunk <= 233; chunk++)
      if (chunk !== 7)
        write(repo, `${EXTRACTED}/images/items/${String(chunk).padStart(3, '0')}.png`, icon)
    expect(() => loadPalStaticImages(repo)).toThrow('PAL 物品图标源缺失: images/items/007.png')
  })

  test('战场背景尺寸非法精确拒绝', () => {
    const repo = tempRepo()
    buildStaticImagesTree(repo)
    write(repo, `${EXTRACTED}/images/battle/bg/006.png`, indexedPng(4, 4))
    expect(() => loadPalStaticImages(repo)).toThrow(
      'PAL 战场背景 006: 战场背景期望 320×200，实际 4×4',
    )
  })

  test('战场背景像素不满足 R=G=B=index 精确拒绝', () => {
    const repo = tempRepo()
    buildStaticImagesTree(repo)
    const bad = new PNG({ width: 320, height: 200 })
    for (let i = 0; i < 320 * 200; i++) {
      bad.data[i * 4] = 7
      bad.data[i * 4 + 1] = 7
      bad.data[i * 4 + 2] = 7
      bad.data[i * 4 + 3] = 255
    }
    bad.data[4] = 9 // 像素 1：R≠G
    write(repo, `${EXTRACTED}/images/battle/bg/006.png`, PNG.sync.write(bad))
    expect(() => loadPalStaticImages(repo)).toThrow(
      'PAL 战场背景 006: 像素 1 不满足 R=G=B=index 且 alpha=255',
    )
  })
})

// ── world sprites ───────────────────────────────────────────────────────

function buildWorldSpriteTree(repo: string, sprite1: Uint8Array): void {
  mkdirSync(resolve(repo, EXTRACTED, 'data/sprite'), { recursive: true })
  write(repo, `${EXTRACTED}/data/sprite/1.rle`, sprite1)
  const filler = gzipSync(frame2x2())
  for (let sprite = 2; sprite <= 636; sprite++)
    write(repo, `${EXTRACTED}/data/sprite/${sprite}.rle`, filler)
}

describe('KIMI-R1 loadPalWorldSprites 残余守卫', () => {
  test('源集合不完整（空目录）精确拒绝', () => {
    const repo = tempRepo()
    mkdirSync(resolve(repo, EXTRACTED, 'data/sprite'), { recursive: true })
    expect(() => loadPalWorldSprites(repo)).toThrow('PAL 大世界精灵源集合期望完整 1..636')
  })

  test('sprite 1 非 gzip 精确拒绝（首字节合法、次字节非法的单轴输入）', () => {
    const repo = tempRepo()
    buildWorldSpriteTree(repo, new Uint8Array([0x1f, 0x00]))
    expect(() => loadPalWorldSprites(repo)).toThrow('PAL 大世界精灵 1 必须是 gzip RLE')
  })

  test('合法 gzip 但字节总量漂移精确拒绝（附 legacy 坏尾归集）', () => {
    const repo = tempRepo()
    buildWorldSpriteTree(repo, gzipSync(legacyTailChunk()))
    expect(() => loadPalWorldSprites(repo)).toThrow(/^PAL 大世界精灵字节期望 1332725，收到 \d+$/)
  })
})

// ── battle sprites ──────────────────────────────────────────────────────

function battleManifest(): unknown {
  return {
    sprites: [
      ...Array.from({ length: 19 }, (_, id) => ({ kind: 'player', id })),
      ...Array.from({ length: 153 }, (_, index) => ({ kind: 'enemy', id: index + 1 })),
    ],
  }
}

function buildBattleSpriteTree(repo: string, player0: Uint8Array): void {
  writeJson(repo, `${EXTRACTED}/data/battle-sprites.json`, battleManifest())
  write(repo, `${EXTRACTED}/data/battle-sprite/player/0.rle`, player0)
  const filler = gzipSync(frame2x2())
  for (let id = 1; id <= 18; id++)
    write(repo, `${EXTRACTED}/data/battle-sprite/player/${id}.rle`, filler)
  for (let id = 1; id <= 153; id++)
    write(repo, `${EXTRACTED}/data/battle-sprite/enemy/${id}.rle`, filler)
}

describe('KIMI-R1 loadPalBattleSprites 残余守卫', () => {
  test('manifest.sprites 非数组精确拒绝', () => {
    const repo = tempRepo()
    writeJson(repo, `${EXTRACTED}/data/battle-sprites.json`, { sprites: {} })
    expect(() => loadPalBattleSprites(repo)).toThrow('PAL battle-sprites.json 期望 sprites 数组')
  })

  test('源序列不符（player 段混入 enemy）精确拒绝', () => {
    const repo = tempRepo()
    writeJson(repo, `${EXTRACTED}/data/battle-sprites.json`, {
      sprites: [{ kind: 'enemy', id: 1 }],
    })
    expect(() => loadPalBattleSprites(repo)).toThrow(
      'PAL battle-sprites 源集合期望 player 0..18 后接 enemy 1..153',
    )
  })

  test('player 目录集合漂移精确拒绝', () => {
    const repo = tempRepo()
    writeJson(repo, `${EXTRACTED}/data/battle-sprites.json`, battleManifest())
    mkdirSync(resolve(repo, EXTRACTED, 'data/battle-sprite/player'), { recursive: true })
    write(repo, `${EXTRACTED}/data/battle-sprite/player/0.rle`, gzipSync(frame2x2()))
    expect(() => loadPalBattleSprites(repo)).toThrow('PAL battle-sprite/player 目录集合发生漂移')
  })

  test('player 0 非 gzip 精确拒绝（首字节合法、次字节非法的单轴输入）', () => {
    const repo = tempRepo()
    buildBattleSpriteTree(repo, new Uint8Array([0x1f, 0x00]))
    expect(() => loadPalBattleSprites(repo)).toThrow('PAL player 战斗精灵 0 必须是 gzip RLE')
  })

  test('172 条合法 gzip 但总量漂移精确拒绝（player canonical/enemy legacy 双向 + 坏尾归集）', () => {
    const repo = tempRepo()
    buildBattleSpriteTree(repo, gzipSync(frame2x2()))
    // enemy 24 = 冻结表内的坏尾样本位：换成 legacy 坏尾 chunk（canonical 必拒、legacy 跳 1 槽）
    write(repo, `${EXTRACTED}/data/battle-sprite/enemy/24.rle`, gzipSync(legacyTailChunk()))
    expect(() => loadPalBattleSprites(repo)).toThrow(
      /^PAL 战斗精灵基线漂移: bytes=\d+ raw=\d+ frames=\d+ bad-tail=1$/,
    )
  })
})
