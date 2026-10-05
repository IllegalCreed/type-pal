/**
 * TEST-GLM-MIGRATE-ASSET-SUPPLY-1 · migrate 资产供应链残余公开合同。
 *
 * 排重 basis（旧 fullName 不重复，fast lcov 一手测量 + 既有套件交叉）：
 * - pal-assets：sounds/static images/world/battle 分区由 kimi-r1、glm-o、sound-closure、
 *   palette、portraits、backgrounds、items、paths、ownership、retirements 等套件覆盖；loadPalAssets
 *   全链真实语料路径由 .pal（loadPalContentSupplySources→loadPalAssets）与 full profile
 *   覆盖。本卡只补 effect-sprites 分区（:499-554，fast 0%）——kimi-r1 ledger 判其合成
 *   不可达（「frameAnimations 需合法 YJ2 压缩 RNG 帧…自造压缩流非法」），本卡以一手
 *   推导修正：YJ2 无 magic，初始树是 yj2.ts:74-81 文档化的固定平衡树，单字面量符号的
 *   合法位流可由 parent(n)=0x141+(n>>1)（偶=左/0，奇=右/1）确定性地构造（已用
 *   decompressYj2 实解码验证），无需跨包引用 pal-extract fixture，也不复刻完整编码器。
 * - pal-store-boundary：test/boundaries/pal 覆盖 item268/270 结构漂移、消息漂移、配方
 *   漂移与商店 id/货单轴；本卡补源九档冻结（:78-79）、item270 池数量（:84）与
 *   item268 craft 数量/配方数（:46-51 两个未走方向）。
 * - project-map-converter：test/boundaries/R27 覆盖 decode/roundtrip/shape 行列轴；
 *   本卡补 tilesetId 非法入参（:19-21）、encodeProjectMapWord 三域越界（:58-63）、
 *   shape 宽/高非正（:79-82）、sourceWordFromProjectMap 缺层（:153）。
 * - pal-authored-overlays：test/boundaries 覆盖 craft 双 effect、跨 kind 混合与空白
 *   message；本卡补 resource-pool 缺 current（:135）与同 kind 姐妹池不同步（:148）。
 * - pal-casualty-scripts：test/wave2 覆盖四入口、36 键冻结、门序/style/回满/stat 映射
 *   与未知 opcode fail-closed；本卡补 0x05 参数非空（:102）、缺 battler（:175）与
 *   0x06 门两元 operands（:131 nil 方向）。
 * - pal-world-sprite-registry：test/kimi-r1 覆盖场景证据、语义别名、tie-break 与
 *   overlay×语义同键；本卡补 overlay 为 primary 且被场景引用的物化身份（:108/:123-134，
 *   无语义角色精灵时 overlay 证据胜出 + 布局变体冲突）。
 * - pal-current-publication：glm-o 覆盖分区替换/census/manifest/资产闭包拒绝，glm-next-wave
 *   覆盖 palAssetPreconditions；本卡补 validateReferences error 汇总门（:358-365）。
 *
 * ledger（不设针/不可达，详见 docs/ops/evidence/TEST-GLM-MIGRATE-ASSET-SUPPLY-1/
 * dedup-ledger.md）：pal-assets :340/:412（冻结常量闭包）、:533（parseSpriteChunkStrict
 * 对 sentinel-only 块先抛「offset 越界」，一手实探）、:559-571（零初始化 surface +
 * readPalette 256 色校验后 colors[i] 恒存在）、:793（parseWorldSpriteChunk 对全 sentinel
 * 先抛，kimi 实探）、:821-833/:941-959/:1050-1103（真实数据冻结总量/digest 哨兵，.pal
 * 与 full profile 覆盖）、:1154（validateAssetCatalog 已强制 legacy-migrated 前缀 +
 * validateProjectRelativePath 已拒绝对应非法段，asset.ts:111-162，防御重复）、:1253
 * （:1225-1230 预检同条件先抛）；publication :175/:184-186（供应核内部不变量，公开
 * 输入不可构造）；registry :93（冻结常量无重复）、:109 nil（无 overlay 且无语义时
 * spriteNum 必来自场景证据）；casualty :54（JSON 无洞数组，commands[ip] 恒非空）、
 * :109（raw 变体类型闭包含 opcode）。
 *
 * 隔离：repo 一律 mkdtemp 合成树（afterEach 清理），不触碰真实 data/extracted、
 * projects/pal、data/raw；publication 合同复用 __tests__/glm-o/supply-fixture.ts
 * 共成 fixture（未改动该文件），全部内存运行、零写盘。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import type { ActorDef, ItemData, ProjectMap, SpriteDef } from '@type-pal/content'
import { palSpriteAssetId } from '@type-pal/content'
import { encodeSpriteChunk } from '@type-pal/shared'
import { PNG } from 'pngjs'
import { afterEach, describe, expect, test } from 'vitest'
import { syntheticBaselineFiles, syntheticSupply } from './__tests__/glm-o/supply-fixture.js'
import type { MigrationSnapshot } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'
import { loadPalAssets } from './pal-assets.js'
import { applyPalGeneratedResourcePoolMessages } from './pal-authored-overlays.js'
import { applyPalCasualtyOverlays, translateCasualtyScript } from './pal-casualty-scripts.js'
import {
  buildPalCurrentPublication,
  validatePalCurrentPublication,
} from './pal-current-publication.js'
import type { SourceStore } from './pal-derived-content.js'
import { buildPalCurrentManifest } from './pal-manifest.js'
import type { SourceScene } from './pal-source-types.js'
import { assertPalAlchemyBoundaryInvariant } from './pal-store-boundary.js'
import { PAL_WORLD_SPRITE_LAYOUT_OVERLAYS } from './pal-world-sprite-layouts.js'
import { createPalWorldSpriteRegistry } from './pal-world-sprite-registry.js'
import {
  convertSourceTilemap,
  encodeProjectMapWord,
  sourceWordFromProjectMap,
  tilesetIdFromSourceNumber,
} from './project-map-converter.js'
import type { SourceCmd } from './source-facts.js'

/** 伤亡解析器经窄化读取的专有字段；与 glm-o supply-fixture 同法以扩展类型承载，无强转。 */
type FixtureCmd = SourceCmd & { messageIndex?: number }

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'mas1-supply-'))
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

/**
 * 单字面量 YJ2 流（输出 1 字节 = symbol）。初始平衡树路径按 yj2.ts:74-81 的文档化
 * 构造推导：parent(n) = 0x141 + (n >> 1)，偶数 = 左子(bit 0)、奇数 = 右子(bit 1)；
 * 位流自根到叶序、LSB-first 装包，与 decompressYj2 的 bt() 读取序一致。
 */
function yj2LiteralStream(symbol: number): Uint8Array {
  const bits: number[] = []
  for (let node = symbol; node !== 0x280; node = 0x141 + (node >> 1)) bits.push(node % 2)
  bits.reverse()
  const body = new Uint8Array(Math.ceil(bits.length / 8))
  bits.forEach((bit, index) => {
    body[index >> 3]! |= bit << (index & 7)
  })
  const out = new Uint8Array(4 + body.length)
  new DataView(out.buffer).setUint32(0, 1, true)
  out.set(body, 4)
  return out
}

/** 1 帧 RNG 块：sub-MKF 单 sub-chunk = YJ2(字面量 0x00) → decode 1 个全零帧。 */
function oneFrameRngRle(): Uint8Array {
  const yj2 = yj2LiteralStream(0x00)
  const sub = new Uint8Array(8 + yj2.length)
  new DataView(sub.buffer).setUint32(0, 8, true)
  new DataView(sub.buffer).setUint32(4, 8 + yj2.length, true)
  sub.set(yj2, 8)
  return gzipSync(sub)
}

const EFFECT_FRAME = encodeSpriteChunk([
  { width: 2, height: 2, pixels: new Uint8Array(4).fill(3), opaque: new Uint8Array(4).fill(1) },
])
const EFFECT_CHUNK = gzipSync(EFFECT_FRAME)

/**
 * 抵达 loadPalEffectSprites（pal-assets.ts:1040）的合成上游链：soundfont/palette/videos
 * 前缀 + 12 段合法 YJ2 RNG 块 + sounds 505 三方闭包 + static images 全量 census +
 * 56 个特效源。链路顺序性即证明 frameAnimations/sounds/staticImages 阶段全部通过
 * （loadPalAssets 串行推进，任一阶段失败不会到达特效精灵守卫）。
 */
function buildEffectChainRepo(physicalEffect: Uint8Array = EFFECT_CHUNK): string {
  const repo = tempRepo()
  write(repo, 'packages/reforge/public/soundfont.sf3', 'synthetic-soundfont')
  writeJson(repo, `${EXTRACTED}/data/palette/0.json`, paletteJson())
  for (let video = 1; video <= 6; video++)
    write(repo, `${EXTRACTED}/videos/${video}.mp4`, `synthetic-video-${video}`)

  writeJson(repo, `${EXTRACTED}/data/rng-frames.json`, {
    chunks: Array.from({ length: 12 }, (_, index) => ({
      chunkIndex: index,
      frameCount: 1,
      frames: [{ index: 0 }],
    })),
  })
  for (const palette of [2, 3, 6])
    writeJson(repo, `${EXTRACTED}/data/palette/${palette}.json`, paletteJson())
  const rngRle = oneFrameRngRle()
  for (let index = 0; index < 12; index++)
    write(repo, `${EXTRACTED}/data/animation/rng-${String(index).padStart(2, '0')}.rle`, rngRle)

  const wav = new Uint8Array(16)
  wav.set([0x52, 0x49, 0x46, 0x46, 0x0c, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45])
  const chunks = Array.from({ length: 505 }, (_, index) => ({
    index,
    size: index >= 1 && index <= 363 ? 16 : 0,
    isEmpty: !(index >= 1 && index <= 363),
  }))
  writeJson(repo, `${EXTRACTED}/data/sounds-metadata.json`, { chunkCount: 505, chunks })
  writeJson(repo, `${EXTRACTED}/asset-manifest.json`, {
    files: Array.from({ length: 363 }, (_, index) => ({
      path: `sounds/${index + 1}.wav`,
      size: 16,
    })),
  })
  for (let index = 1; index <= 363; index++) write(repo, `${EXTRACTED}/sounds/${index}.wav`, wav)

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
  const background = indexedPng(320, 200)
  for (let chunk = 6; chunk <= 57; chunk++)
    write(repo, `${EXTRACTED}/images/battle/bg/${String(chunk).padStart(3, '0')}.png`, background)

  write(repo, `${EXTRACTED}/data/magic/effect.rle`, physicalEffect)
  for (let chunk = 0; chunk <= 54; chunk++)
    write(repo, `${EXTRACTED}/data/magic/fire-${String(chunk).padStart(2, '0')}.rle`, EFFECT_CHUNK)
  return repo
}

describe('MAS1 effect-sprites 分区闭包（经 loadPalAssets 公开入口）', () => {
  test('56 个合法 gzip 特效源推进到冻结 census 并以精确计数拒绝（bytes/frames 闭包）', () => {
    const repo = buildEffectChainRepo()
    expect(() => loadPalAssets(repo, [], [])).toThrow(
      `PAL 特效精灵基线漂移: assets=56 bytes=${56 * EFFECT_CHUNK.length} frames=56`,
    )
  })

  test('物理特效源 gzip magic 缺陷在首文件精确拒绝（首字节 0x1f、次字节非 0x8b）', () => {
    const repo = buildEffectChainRepo(new Uint8Array([0x1f, 0x00, 0x00, 0x00]))
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL 物理命中特效: 期望 gzip RLE')
  })
})

// ── pal-store-boundary：源所有权残余拒收臂 ────────────────────────────────────

const STORE0_REWARDS = ['100', '105', '95', '112', '72', '131', '97', '102', '111']

function baseItem(id: string, buyPrice = 1): ItemData {
  return { id, name: `物品 ${id}`, desc: [], buyPrice, sellPrice: 0, sellable: false }
}

type ItemEffect = NonNullable<ItemData['use']>['effects'][number]

function craftEffect(): ItemEffect {
  return {
    kind: 'craftRecipe',
    unavailableMessage: '炼蛊的材料不足',
    recipes: ['117', '118', '119', '120', '121'].map((itemId) => ({
      ingredients: [{ itemId, count: 1 }],
      products: [{ itemId: '148', count: 1 }],
    })),
  }
}

function poolEffect(): ItemEffect {
  return {
    kind: 'drawFromResourcePool',
    resource: 'collectValue',
    maxRoll: 9,
    rewards: STORE0_REWARDS.map((itemId) => ({ itemId, count: 1 })),
    unavailableMessage: '无任何效果',
  }
}

function storeBoundaryItems(): ItemData[] {
  return [
    ...STORE0_REWARDS.map((id) => baseItem(id, id === '112' || id === '72' ? 0 : 1)),
    { ...baseItem('268'), use: { target: 'scene', consuming: false, effects: [craftEffect()] } },
    { ...baseItem('270'), use: { target: 'scene', consuming: false, effects: [poolEffect()] } },
    ...['117', '118', '119', '120', '121', '148'].map((id) => baseItem(id)),
  ]
}

function store0Sources(items: number[]): SourceStore[] {
  return [
    { id: 0, items },
    ...Array.from({ length: 20 }, (_, index) => ({ id: index + 1, items: [141] })),
  ]
}

describe('MAS1 Store0 源所有权残余守卫', () => {
  test('源 Store0 九档奖励集合漂移（换序）被精确拒绝', () => {
    const reordered = [...STORE0_REWARDS]
    reordered[0] = STORE0_REWARDS[1]!
    reordered[1] = STORE0_REWARDS[0]!
    expect(() =>
      assertPalAlchemyBoundaryInvariant({
        sourceStores: store0Sources(reordered.map(Number)),
        items: storeBoundaryItems(),
      }),
    ).toThrow(`源 Store0 九档漂移 ${reordered.join(',')}`)
  })

  test('item270 携带两个资源池被精确拒绝（数量 != 1）', () => {
    const items = storeBoundaryItems()
    const gourd = items.find(({ id }) => id === '270')!
    if (!gourd.use) throw new Error('fixture: item270 应携带 use')
    gourd.use.effects.push(poolEffect())
    expect(() =>
      assertPalAlchemyBoundaryInvariant({
        sourceStores: store0Sources(STORE0_REWARDS.map(Number)),
        items,
      }),
    ).toThrow('PAL Store0 invariant: item270 resource pool 数量 2 != 1')
  })

  test('item268 craft 数量与配方数量漂移逐轴精确拒绝', () => {
    const doubled = storeBoundaryItems()
    const vessel = doubled.find(({ id }) => id === '268')!
    if (!vessel.use) throw new Error('fixture: item268 应携带 use')
    vessel.use.effects.push(craftEffect())
    expect(() =>
      assertPalAlchemyBoundaryInvariant({
        sourceStores: store0Sources(STORE0_REWARDS.map(Number)),
        items: doubled,
      }),
    ).toThrow('PAL Store0 invariant: item268 craftRecipe=2/recipes=5/resourcePool=0')

    const trimmed = storeBoundaryItems()
    const single = trimmed.find(({ id }) => id === '268')!
    if (!single.use) throw new Error('fixture: item268 应携带 use')
    const craft = single.use.effects[0]
    if (craft?.kind !== 'craftRecipe') throw new Error('fixture: item268 应携带 craftRecipe')
    craft.recipes.length = 3
    expect(() =>
      assertPalAlchemyBoundaryInvariant({
        sourceStores: store0Sources(STORE0_REWARDS.map(Number)),
        items: trimmed,
      }),
    ).toThrow('PAL Store0 invariant: item268 craftRecipe=1/recipes=3/resourcePool=0')
  })
})

// ── project-map-converter：形状域与回编码域守卫 ───────────────────────────────

describe('MAS1 旧地图 word 回编码与形状域守卫', () => {
  test('tilesetIdFromSourceNumber 非正整数被精确拒绝', () => {
    expect(() => tilesetIdFromSourceNumber(0)).toThrow('mapNum: 期望正整数，收到 0')
  })

  test('encodeProjectMapWord 三域越界（layer0 tile / layer1 tile / height）逐轴精确拒绝', () => {
    expect(() => encodeProjectMapWord(0x200, 0, null, 0, 0)).toThrow(
      'layer0 tile 超出旧格式可回编码范围: 512',
    )
    expect(() => encodeProjectMapWord(0, 0, 0x1ff, 0, 0)).toThrow(
      'layer1 tile 超出旧格式可回编码范围: 511',
    )
    expect(() => encodeProjectMapWord(0, 16, null, 0, 0)).toThrow(
      'height 超出旧格式可回编码范围 0..15',
    )
  })

  test('convertSourceTilemap 源 shape 宽/高非正整数逐轴精确拒绝', () => {
    expect(() =>
      convertSourceTilemap(1, { width: 0, height: 1, tileset: 'tileset/1.rle', cells: [[]] }),
    ).toThrow('tilemap.width 非正整数')
    expect(() =>
      convertSourceTilemap(1, { width: 1, height: 0, tileset: 'tileset/1.rle', cells: [] }),
    ).toThrow('tilemap.height 非正整数')
  })

  test('sourceWordFromProjectMap 缺 layer-1 时精确拒绝', () => {
    const map: ProjectMap = {
      version: 4,
      width: 1,
      height: 1,
      tilesetRefs: ['tileset-001'],
      layers: [{ id: 'layer-0', name: '下层', tiles: [[0]], sources: [[0]] }],
      collision: [[0]],
    }
    expect(() => sourceWordFromProjectMap(map, 0, 0)).toThrow('源图回编码要求 layer-0/layer-1 两层')
  })
})

// ── pal-authored-overlays：resource-pool message 同步残余臂 ──────────────────

function poolBase(message?: string): NonNullable<ItemData['use']>['effects'][number] {
  return {
    kind: 'drawFromResourcePool',
    resource: 'collectValue',
    maxRoll: 1,
    rewards: [{ itemId: '117', count: 1 }],
    ...(message === undefined ? {} : { unavailableMessage: message }),
  }
}

function poolItem(id: string, pools: NonNullable<ItemData['use']>['effects']): ItemData {
  return { ...baseItem(id), use: { target: 'scene', consuming: true, effects: pools } }
}

describe('MAS1 authored resource-pool message 同步残余臂', () => {
  test('generated 池消息指向 current 缺失物品时 fail-loud', () => {
    expect(() =>
      applyPalGeneratedResourcePoolMessages(
        [poolItem('5', [poolBase()])],
        [poolItem('9', [poolBase('资源不足')])],
      ),
    ).toThrow('PAL generated resource message: current 缺物品 9')
  })

  test('姐妹池仅同步带 message 的那条：对位不同步、作者字段保留、current 输入不可变', () => {
    const current = [poolItem('5', [poolBase(), poolBase()])]
    const currentBefore = structuredClone(current)
    const generated = [poolItem('5', [poolBase(), poolBase('资源不足')])]
    const output = applyPalGeneratedResourcePoolMessages(current, generated)
    const synced = output[0]!.use?.effects[1]
    if (synced?.kind !== 'drawFromResourcePool')
      throw new Error('fixture: 第二池应为 drawFromResourcePool')
    expect(synced.unavailableMessage).toBe('资源不足')
    expect(output[0]!.use?.effects[0]).not.toHaveProperty('unavailableMessage')
    const expected = structuredClone(current)
    const secondPool = expected[0]!.use!.effects[1]
    if (secondPool?.kind !== 'drawFromResourcePool')
      throw new Error('fixture: 第二池应为 drawFromResourcePool')
    secondPool.unavailableMessage = '资源不足'
    expect(output).toEqual(expected)
    expect(current).toEqual(currentBefore)
  })
})

// ── pal-casualty-scripts：残余 fail-closed 臂 ────────────────────────────────

function battlerActor(id: string): ActorDef {
  return {
    id,
    name: `name.${id}`,
    spriteId: id,
    battler: {
      baseStats: {
        level: 1,
        hp: 100,
        maxHP: 100,
        mp: 50,
        maxMP: 50,
        attack: 10,
        defense: 10,
        magicAttack: 10,
        speed: 10,
        luck: 10,
      },
      initialEquipment: {},
      initialMagic: [],
      battleSprite: `battle-sprite.${id}`,
    },
  }
}

describe('MAS1 伤亡脚本残余 fail-closed 臂', () => {
  test('0x05 重绘指令参数非空被精确拒绝（0x06 门两元 operands 合法）', () => {
    const commands: FixtureCmd[] = [
      { op: 'raw', opcode: 0x06, operands: [100, 3] },
      { op: 'end' },
      { op: 'end' },
      { op: 'raw', opcode: 0x05, operands: [0, 1, 0] },
      { op: 'end' },
    ]
    expect(() => translateCasualtyScript(commands, 0, {})).toThrow(
      'B11-1 casualty: branch @3 0x05 参数非空 [0,1,0]',
    )
  })

  test('伤亡入口角色缺 battler 时 fail-closed', () => {
    const commands: FixtureCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x06, operands: [100, 4, 0] },
      { op: 'setDialogStyleBottom' },
      { op: 'showDialog', messageIndex: 13470, text: '台词' },
      { op: 'end' },
    ]
    const actors = [
      battlerActor('a0'),
      battlerActor('a1'),
      { id: 'a2', name: 'name.a2', spriteId: 'a2' },
    ]
    expect(() =>
      applyPalCasualtyOverlays(actors, commands, [
        { scriptOnFriendDeath: 1, scriptOnDying: 0 },
        { scriptOnFriendDeath: 0, scriptOnDying: 1 },
        { scriptOnFriendDeath: 1, scriptOnDying: 1 },
      ]),
    ).toThrow('B11-1 casualty: 角色 2 缺 battler')
  })
})

// ── pal-world-sprite-registry：overlay-primary 物化身份 ─────────────────────

describe('MAS1 大世界精灵 overlay-primary 物化身份', () => {
  test('overlay 精灵被场景引用时以 overlay 证据物化中性 id；异布局场景证据建 -f 变体并报告冲突', () => {
    const overlay = PAL_WORLD_SPRITE_LAYOUT_OVERLAYS.find((entry) => entry.spriteNum === 242)
    if (!overlay) throw new Error('fixture: spriteNum 242 必须有冻结布局 overlay')
    expect(overlay.layout).toEqual({ kind: 'static' })

    const staticEntity = { id: 3331, x: 0, y: 0, spriteNum: 242, nSpriteFrames: 0 }
    const scene: SourceScene = { sceneId: 193, mapNum: 1, eventObjects: [staticEntity] }
    const registry = createPalWorldSpriteRegistry([scene], new Map())
    expect(registry.spriteRef(staticEntity)).toBe('sprite-242')
    const expectedDef: SpriteDef = {
      id: 'sprite-242',
      asset: palSpriteAssetId(242),
      label: '原精灵 242(0x65 换装)',
      layout: { kind: 'static' },
    }
    expect(registry.spriteDefs.get('sprite-242')).toEqual(expectedDef)
    expect(registry.report.layoutEvidence[0]?.source).toBe('pal-overlay')
    expect(registry.report.layoutEvidence[0]?.definitionId).toBe('sprite-242')
    expect(registry.report.layoutEvidence).toEqual([
      {
        spriteNum: 242,
        definitionId: 'sprite-242',
        source: 'pal-overlay',
        evidence: overlay.evidence,
      },
    ])
    expect(registry.report.layoutConflicts).toEqual([])

    const variantEntity = { id: 3332, x: 0, y: 0, spriteNum: 242, nSpriteFrames: 3 }
    const variantRegistry = createPalWorldSpriteRegistry(
      [{ ...scene, eventObjects: [...scene.eventObjects, variantEntity] }],
      new Map(),
    )
    expect(variantRegistry.spriteRef(staticEntity)).toBe('sprite-242')
    expect(variantRegistry.spriteRef(variantEntity)).toBe('sprite-242-f3')
    expect(variantRegistry.spriteDefs.get('sprite-242-f3')?.layout).toEqual({
      kind: 'directional',
      framesPerDir: 3,
    })
    expect(variantRegistry.report.layoutConflicts).toEqual(['sprite-242-f3'])
    expect(
      variantRegistry.report.layoutEvidence
        .filter((entry) => entry.spriteNum === 242)
        .map((entry) => entry.source),
    ).toEqual(['pal-overlay', 'scene'])
  })
})

// ── pal-current-publication：跨引用 error 汇总门 ────────────────────────────

describe('MAS1 current publication 跨引用 error 汇总门', () => {
  test('发布商店引用未知物品时 validateReferences 以精确 where 拒绝', () => {
    const { sources } = syntheticSupply()
    const files = new Map<string, MigrationJson>()
    for (const [path, value] of syntheticBaselineFiles())
      files.set(path, JSON.parse(JSON.stringify(value)) as MigrationJson)
    const baseline: MigrationSnapshot = { files, managedFiles: new Set(files.keys()) }
    const publication = buildPalCurrentPublication(baseline, sources)
    const shops = publication.files.get('content/shops.json')
    if (!Array.isArray(shops)) throw new Error('fixture: content/shops.json 应为数组')
    const mutated = shops.map((shop) => {
      if (shop === null || typeof shop !== 'object' || Array.isArray(shop) || shop.id !== 1)
        return shop
      return { ...shop, items: ['item.不存在'] }
    })
    publication.files.set('content/shops.json', mutated)
    expect(() =>
      validatePalCurrentPublication({
        publication,
        manifest: buildPalCurrentManifest(sources.assetCatalog),
        sources,
      }),
    ).toThrow('PAL current 跨引用失败:\nshops[0](1).items[0]: 商店物品 "item.不存在" 不在 items')
  })
})
