import {
  type AssetCatalogV1,
  PAL_PHYSICAL_EFFECT_ASSET_ID,
  palMagicEffectSpriteAssetId,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  installTrialChromeHost,
  readyTrialFixture,
  trialConfig,
  trialMember,
} from './__tests__/coverage-wave2/b-trial-catalog.js'
import { memoryFileSource } from './__tests__/glm-runtime-contract-fixtures.js'
import { createTrialFileSnapshot, prepareBattleTrialAssets } from './battle-trial-assets.js'
import { battleTrialRevision } from './battle-trial-prepare.js'
import { sha256Bytes } from './hash.js'
import { compressGzip, encodeSpriteChunk } from './index.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import { assertProjectSaveReadable } from './project-save-state.js'

function memorySource(files: Record<string, ArrayBuffer | Uint8Array>) {
  return {
    readBytes: async (path: string): Promise<ArrayBuffer> => {
      const bytes = files[path]
      if (!bytes) throw new Error(`ENOENT ${path}`)
      return bytes instanceof Uint8Array ? (bytes.slice().buffer as ArrayBuffer) : bytes
    },
    readText: async (path: string) => new TextDecoder().decode(await memoryRead(files, path)),
    readJson: async <T>(path: string) =>
      JSON.parse(new TextDecoder().decode(await memoryRead(files, path))) as T,
    urlFor: async () => 'blob:x',
  }
}
async function memoryRead(files: Record<string, ArrayBuffer | Uint8Array>, path: string) {
  const bytes = files[path]
  if (!bytes) throw new Error(`ENOENT ${path}`)
  return bytes
}

test('N05 snapshot 按 catalog 登记校验字节；urlFor 一律拒绝', async () => {
  const controller = new AbortController()
  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: {
      x: {
        kind: 'sprite',
        path: 'a.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: 4, // 与实际 5 字节不符 → 长度臂
        sha256: 'x'.repeat(64),
        origin: { kind: 'generated' },
      },
    },
  }
  const snapshot = createTrialFileSnapshot(
    memorySource({ 'a.rle': new TextEncoder().encode('hello') }),
    controller.signal,
    catalog,
  )
  try {
    await expect(snapshot.source.readBytes('a.rle')).rejects.toThrow(
      '本场资源与catalog登记不符：a.rle',
    )
    await expect(snapshot.source.urlFor('a.rle')).rejects.toThrow('独立试打仅消费已冻结资源字节')
  } finally {
    snapshot.dispose()
  }
})

test('N05 预取消的试打准备在任何 IO 前拒绝', async () => {
  const f = await readyTrialFixture()
  const controller = new AbortController()
  controller.abort()
  await expect(
    prepareBattleTrialAssets(f.project, f.config, f.token, controller.signal, f.revision),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(f.binaryReads).toEqual([])
})

test('N05 asset 音乐与实体特效精灵进入冻结准备；soundfont 只在真有音乐时读取', async () => {
  const f = await readyTrialFixture()
  // 1) 补 catalog/files：音乐、soundfont 角色（validator 要求音乐切片五角色齐全）、物理特效精灵。
  const musicBytes = new TextEncoder().encode('midi-or-soundfont-bytes')
  const catalog = f.files['assets/index.json'] as AssetCatalogV1
  const manifest = f.files['manifest.json'] as {
    assets: { roles: Record<string, string> }
  }
  manifest.assets.roles['audio.midiSoundfont'] = 'soundfont.bin'
  manifest.assets.roles['audio.defaultBattleMusic'] = 'music.theme'
  manifest.assets.roles['audio.bossVictoryMusic'] = 'music.theme'
  manifest.assets.roles['audio.normalVictoryMusic'] = 'music.theme'
  manifest.assets.roles['audio.openingMenuMusic'] = 'music.theme'
  const addAsset = async (
    id: string,
    kind: AssetCatalogV1['assets'][string]['kind'],
    path: string,
    bytes: Uint8Array,
    mediaType: string,
  ) => {
    f.files[path] = bytes.slice().buffer
    catalog.assets[id] = {
      kind,
      path,
      mediaType,
      bytes: bytes.byteLength,
      sha256: await sha256Bytes(bytes),
      origin: { kind: 'generated' },
    }
  }
  await addAsset('music.theme', 'music', 'assets/generated/theme.bin', musicBytes, 'audio/midi')
  await addAsset(
    'soundfont.bin',
    'soundfont',
    'assets/generated/soundfont.bin',
    musicBytes,
    'audio/midi',
  )
  const frames = encodeSpriteChunk(
    Array.from({ length: 4 }, () => ({
      width: 1,
      height: 1,
      pixels: new Uint8Array([1]),
      opaque: new Uint8Array([1]),
    })),
  )
  const compressed = await compressGzip(frames)
  await addAsset(
    PAL_PHYSICAL_EFFECT_ASSET_ID,
    'effect-sprite',
    'assets/generated/physical.rle',
    compressed,
    'application/vnd.type-pal.rle',
  )
  await addAsset(
    palMagicEffectSpriteAssetId(0),
    'effect-sprite',
    'assets/generated/fire.rle',
    compressed,
    'application/vnd.type-pal.rle',
  )
  // 2) 按补丁后的文件表重载工程，再计算 token/revision（准备期复查基于同一 files 表）。
  const reloadBase = memoryFileSource(f.files)
  const reloadSource = {
    ...reloadBase,
    readBytes: async (path: string) => {
      f.binaryReads.push(path)
      return reloadBase.readBytes(path)
    },
  }
  f.project = await loadCurrentProjectFrom(reloadSource)
  const token = await assertProjectSaveReadable(reloadSource)
  const revision = await battleTrialRevision(f.project)
  f.binaryReads.length = 0
  const config = trialConfig([trialMember({ mp: { kind: 'value', value: 20 } })], {
    money: 100,
    music: { kind: 'asset', assetId: 'music.theme' },
  })
  const member = config.party.members[0]
  if (!member) throw new Error('fixture party missing')
  member.skills = { kind: 'replace', ids: ['trial-spark'] }
  const chrome = installTrialChromeHost(f.faceHash)
  try {
    const prepared = await prepareBattleTrialAssets(
      f.project,
      config,
      token,
      new AbortController().signal,
      revision,
    )
    expect(prepared.baseSounds).toBeInstanceOf(Set)
    // 音乐与 soundfont 字节都已被冻结预读。
    expect(f.binaryReads).toContain('assets/generated/theme.bin')
    expect(f.binaryReads).toContain('assets/generated/soundfont.bin')
    // 物理特效精灵已按 catalog 存在性加载。
    expect(prepared.assets.effectSprite).toBeTruthy()
    expect(prepared.assets.effectSprite?.frames.length).toBe(4)
    // 冻结后按 AssetId 再读一致。
    await expect(prepared.project.assetResolver.readBytes('music.theme', 'music')).resolves.toEqual(
      musicBytes.buffer as ArrayBuffer,
    )
    prepared.dispose()
    await expect(prepared.project.assetResolver.readBytes('music.theme', 'music')).rejects.toThrow(
      '独立试打已取消',
    )
  } finally {
    chrome.restore()
  }
})

test('N05 silent 配置不读取任何音乐角色字节', async () => {
  const f = await readyTrialFixture()
  const chrome = installTrialChromeHost(f.faceHash)
  try {
    const prepared = await prepareBattleTrialAssets(
      f.project,
      f.config, // music: { kind: 'silent' }
      f.token,
      new AbortController().signal,
      f.revision,
    )
    expect(f.binaryReads.some((path) => path.includes('soundfont'))).toBe(false)
    prepared.dispose()
  } finally {
    chrome.restore()
  }
})

test('N05 缓存路径 seal 后可复读；dispose 后同路径拒绝', async () => {
  const files = { 'a.bin': new TextEncoder().encode('data') }
  const snapshot = createTrialFileSnapshot(memorySource(files), new AbortController().signal)
  const first = await snapshot.source.readBytes('a.bin')
  expect(first.byteLength).toBe(4)
  snapshot.seal()
  // 已缓存路径在 seal 后仍可复读（返回同一 retained 字节的拷贝）。
  const again = await snapshot.source.readBytes('a.bin')
  expect(again.byteLength).toBe(4)
  expect(again).not.toBe(first)
  snapshot.dispose()
  await expect(snapshot.source.readBytes('a.bin')).rejects.toMatchObject({ name: 'AbortError' })
})
