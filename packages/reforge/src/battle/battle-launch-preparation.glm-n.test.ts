// @vitest-environment jsdom
import { palMagicEffectSpriteAssetId, validateBattleFields } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { battleHostFixture } from '../__tests__/battle-host-fixture.js'
import { installGlmNCanvasHost } from '../__tests__/glm-n/canvas-host.js'
import { glmNpng } from '../__tests__/glm-n/png.js'
import { sha256Bytes } from '../hash.js'
import { compressGzip, encodeSpriteChunk, loadStandardPalette } from '../index.js'
import { loadCurrentProjectFrom } from '../project-loader.js'
import { projectItemsView } from '../runtime-project-view.js'
import type { BattleLaunchOptions } from './battle-launch-preparation.js'
import { BattleLaunchPreparation } from './battle-launch-preparation.js'

let f: Awaited<ReturnType<typeof battleHostFixture>> | undefined
afterEach(async () => {
  await f?.close()
  f = undefined
})

async function fieldedFixture() {
  const fixture = await battleHostFixture()
  f = fixture
  // dom-host 的画布替身 getImageData 恒全零 → 换 glm-n 替身（像素恒 5，满足索引图契约读取）。
  installGlmNCanvasHost(5)
  // 战场表 + 背景 + 投掷法术呈现物品 + 对应特效精灵。
  const manifest = fixture.fixture.files['manifest.json'] as {
    content: Record<string, unknown>
  }
  manifest.content.battleFields = 'content/battle-fields.json'
  const fields = [
    {
      id: 7,
      name: 'Wave field',
      screenWave: 128,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      background: 'bg.wave',
    },
  ]
  validateBattleFields(fields)
  fixture.fixture.files['content/battle-fields.json'] = fields
  const catalog = structuredClone(fixture.fixture.project.assetCatalog)
  const bgBytes = glmNpng(320, 200, 5, 255)
  fixture.fixture.binaries.set('assets/generated/bg.wave.png', bgBytes)
  catalog.assets['bg.wave'] = {
    kind: 'battle-background',
    path: 'assets/generated/bg.wave.png',
    mediaType: 'image/png',
    bytes: bgBytes.byteLength,
    sha256: await sha256Bytes(bgBytes),
    origin: { kind: 'generated' },
  }
  const frames = encodeSpriteChunk(
    Array.from({ length: 4 }, () => ({
      width: 1,
      height: 1,
      pixels: new Uint8Array([1]),
      opaque: new Uint8Array([1]),
    })),
  )
  const compressed = await compressGzip(frames)
  fixture.fixture.binaries.set('assets/generated/fire.0.rle', compressed)
  catalog.assets[palMagicEffectSpriteAssetId(0)] = {
    kind: 'effect-sprite',
    path: 'assets/generated/fire.0.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: compressed.byteLength,
    sha256: await sha256Bytes(compressed),
    origin: { kind: 'generated' },
  }
  fixture.fixture.files['assets/index.json'] = catalog
  const items = [
    {
      // battleHostFixture 的开局背包引用 tonic，保留其定义。
      id: 'tonic',
      name: 'tonic',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 10 }] },
    },
    {
      id: 'vial',
      name: 'vial',
      desc: [],
      buyPrice: 1,
      sellPrice: 0,
      sellable: false,
      throw: {
        target: 'oneEnemy',
        effects: [{ kind: 'fixedDamage', amount: 5 }],
        presentation: { kind: 'magic', animation: { effectSprite: 0 } },
      },
    },
  ]
  fixture.fixture.files['content/items.json'] = items
  fixture.fixture.project = await loadCurrentProjectFrom(fixture.fixture.source)
  fixture.replaceWorld()
  const world = fixture.world()
  world.inventory = [{ itemId: 'vial', count: 2 }]
  // battleHostFixture 的 prep 在旧 content 上构造；用重载后的 content 重建本测专用 prep。
  const project = fixture.fixture.project
  const palette = await loadStandardPalette(project.assetBase)
  const prep = new BattleLaunchPreparation(
    { ...project, items: projectItemsView(project.items) },
    {
      assetBase: project.assetBase,
      reader: project.assetResolver,
      imageCache: project.imageCache,
      spriteCache: project.battleSpriteCache,
      soundRoles: project.manifest.assets.roles,
      portraits: new Map(),
      faces: new Map(),
      palette: () => palette,
      chrome: { glyphs: { has: () => false, get: () => undefined } },
      sfx: fixture.sfx,
      loadEffect: async () => undefined,
    },
    {
      readWorld: () => world,
      readScene: () => project.entryScene,
      debugLeaders: () => ({ dualLeader: null, allLeader: null }),
    },
  )
  return { ...fixture, prep }
}

test('N05 显式 options.music 直接成为战斗曲目，不经角色解析', async () => {
  const fixture = await fieldedFixture()
  const options: BattleLaunchOptions = { music: 'music.explicit' }
  const prepared = await fixture.prep
    .prepare('encounter', options, new AbortController().signal, () => {}, vi.fn())
    .then((result) => ({ ...result, ...result.commit() }))
  expect(prepared.battleTrack).toBe('music.explicit')
  fixture.assertInputs()
})

test('N05 指定战场号读取常驻波、索引背景与投掷特效精灵', async () => {
  const fixture = await fieldedFixture()
  const options: BattleLaunchOptions = { fieldId: 7 }
  const prepared = await fixture.prep
    .prepare('encounter', options, new AbortController().signal, () => {}, vi.fn())
    .then((result) => ({ ...result, ...result.commit() }))
  expect(prepared.sessionOptions.fieldWave).toBe(128)
  expect(prepared.sessionAssets.bg).toBeTruthy()
  const indexed = prepared.sessionAssets.bgIndexed
  expect(indexed?.w).toBe(320)
  expect(indexed?.h).toBe(200)
  expect(indexed?.indices.every((value) => value === 5)).toBe(true)
  // 背包投掷物品的 magic 呈现 → fire chunk 0 已加载。
  expect(prepared.sessionAssets.fireSprites?.[0]).toBeTruthy()
  fixture.assertInputs()
})

test('N05 未知战场号缺省 24 号且黑底（无背景资产 IO）', async () => {
  const fixture = await fieldedFixture()
  const fetchSpy = vi.spyOn(window, 'fetch')
  const prepared = await fixture.prep
    .prepare('encounter', undefined, new AbortController().signal, () => {}, vi.fn())
    .then((result) => ({ ...result, ...result.commit() }))
  expect(prepared.sessionOptions.fieldWave).toBe(0)
  expect(prepared.sessionAssets.bg).toBeUndefined()
  expect(prepared.sessionAssets.bgIndexed).toBeUndefined()
  expect(fetchSpy).not.toHaveBeenCalled()
  fixture.assertInputs()
})
