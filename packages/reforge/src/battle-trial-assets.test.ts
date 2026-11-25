import {
  type ActorDef,
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
import { prepareBattleTrialAssets } from './battle-trial-assets.js'
import { battleTrialRevision } from './battle-trial-prepare.js'
import { sha256Bytes } from './hash.js'
import { compressGzip, encodeSpriteChunk } from './index.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import { assertProjectSaveReadable, PROJECT_SAVE_STATE_PATH } from './project-save-state.js'

test('complete trial preparation freezes real project resources and dispose closes only project-owned bitmaps', async () => {
  const f = await readyTrialFixture(),
    host = installTrialChromeHost(f.faceHash)
  const before = structuredClone({ files: f.files, config: f.config, actors: f.project.actorsById })
  let ready: Awaited<ReturnType<typeof prepareBattleTrialAssets>> | undefined
  try {
    ready = await prepareBattleTrialAssets(
      f.project,
      f.config,
      f.token,
      new AbortController().signal,
      f.revision,
    )
    expect(ready.prepared.world.party.map((member) => member.id)).toEqual(['hero'])
    expect(ready.prepared.world.money).toBe(100)
    expect(ready.prepared.players[0]!.skills).toEqual(['trial-spark'])
    expect(ready.prepared.players[0]!.mp).toBe(20)
    expect(Object.keys(ready.assets.fireSprites)).toEqual(['0'])
    expect(ready.assets.glyphs.size).toBeGreaterThan(0)
    expect(ready.project.source).not.toBe(f.project.source)
    const face = host.bitmaps.filter((bitmap) => bitmap.face)
    expect(face).toHaveLength(1)
    expect(face[0]!.close).not.toHaveBeenCalled()
    const frozen = new Uint8Array(await ready.project.source.readBytes(f.facePath))
    expect(frozen).toEqual(new Uint8Array(f.files[f.facePath] as ArrayBuffer))
    expect({ files: f.files, config: f.config, actors: f.project.actorsById }).toEqual(before)
    ready.dispose()
    expect(face[0]!.close).toHaveBeenCalledTimes(1)
    const engineChrome = host.bitmaps.filter((bitmap) => !bitmap.face)
    expect(engineChrome.length).toBeGreaterThan(0)
    for (const bitmap of engineChrome) expect(bitmap.close).not.toHaveBeenCalled()
    const closed = await ready.project.source.readBytes(f.facePath).then(
      () => 'accepted',
      (error) => error.name,
    )
    expect(closed).toBe('AbortError')
  } finally {
    ready?.dispose()
    host.restore()
  }
})
test.each([
  'save-token',
  'revision',
] as const)('trial preparation rejects wrong %s before any asset IO', async (axis) => {
  const f = await readyTrialFixture(),
    host = installTrialChromeHost(f.faceHash)
  try {
    const outcome = await prepareBattleTrialAssets(
      f.project,
      f.config,
      axis === 'save-token' ? 'wrong-token' : f.token,
      new AbortController().signal,
      axis === 'revision' ? 'wrong-revision' : f.revision,
    ).then(
      (ready) => {
        ready.dispose()
        return 'accepted'
      },
      (error) => error.message,
    )
    expect(outcome).toBe(
      axis === 'save-token'
        ? '工程已变化，请保存后重新发起试打'
        : '工程战斗数据已变化，请从编辑器重新开始',
    )
    expect(f.binaryReads).toEqual([])
    expect(host.bitmaps).toEqual([])
  } finally {
    host.restore()
  }
})
test.each([
  'save-token',
  'data',
] as const)('post-resource %s drift rejects and releases already-created project bitmaps', async (axis) => {
  const f = await readyTrialFixture(),
    originalAttack = f.project.actorsById.hero!.battler!.baseStats.attack
  let mutations = 0
  const host = installTrialChromeHost(f.faceHash, () => {
    mutations++
    if (axis === 'save-token')
      f.files[PROJECT_SAVE_STATE_PATH] = {
        kind: 'type-pal-author-save',
        version: 1,
        operationId: '11111111-1111-4111-8111-111111111111',
        phase: 'committed',
        planHash: 'a'.repeat(64),
      }
    else (f.files['content/actors.json'] as ActorDef[])[0]!.battler!.baseStats.attack++
  })
  let accepted: Awaited<ReturnType<typeof prepareBattleTrialAssets>> | undefined
  try {
    const outcome = await prepareBattleTrialAssets(
      f.project,
      f.config,
      f.token,
      new AbortController().signal,
      f.revision,
    ).then(
      (ready) => {
        accepted = ready
        return 'accepted'
      },
      (error) => error.message,
    )
    expect(mutations).toBe(1)
    expect(outcome).toBe(
      axis === 'save-token'
        ? '资源准备期间工程已变化，请重新试打'
        : '资源准备期间战斗数据已被修改，请重新试打',
    )
    const faces = host.bitmaps.filter((bitmap) => bitmap.face)
    expect(faces).toHaveLength(1)
    expect(faces[0]!.close).toHaveBeenCalledTimes(1)
    expect(f.project.actorsById.hero!.battler!.baseStats.attack).toBe(originalAttack)
  } finally {
    accepted?.dispose()
    host.restore()
  }
})
test('real project resource IO rejection never returns a prepared trial', async () => {
  const f = await readyTrialFixture(),
    host = installTrialChromeHost(f.faceHash)
  const before = structuredClone(f.files)
  f.hooks.read = (path) => {
    if (path === f.facePath) throw new Error('face IO unavailable')
  }
  let accepted: Awaited<ReturnType<typeof prepareBattleTrialAssets>> | undefined
  try {
    const outcome = await prepareBattleTrialAssets(
      f.project,
      f.config,
      f.token,
      new AbortController().signal,
      f.revision,
    ).then(
      (ready) => {
        accepted = ready
        return 'accepted'
      },
      (error) => error.message,
    )
    expect(outcome).toContain('face IO unavailable')
    expect(accepted).toBeUndefined()
    expect(host.bitmaps.filter((bitmap) => bitmap.face)).toEqual([])
    expect(f.files).toEqual(before)
  } finally {
    accepted?.dispose()
    host.restore()
  }
})

test('trial preparation rejects a real selected skill beyond the decoded FIRE frame budget', async () => {
  const f = await readyTrialFixture()
  const skill = f.project.skills['trial-spark']
  if (!skill) throw new Error('trial skill missing')
  f.files['content/skills.json'] = {
    skills: [{ ...skill, animation: { ...skill.animation, speed: -4, effectTimes: 94 } }],
    levelUp: {},
  }
  const project = await loadCurrentProjectFrom(f.project.source)
  const revision = await battleTrialRevision(project)
  const browser = installTrialChromeHost(f.faceHash)
  let prepared: Awaited<ReturnType<typeof prepareBattleTrialAssets>> | undefined
  try {
    await expect(
      prepareBattleTrialAssets(
        project,
        f.config,
        f.token,
        new AbortController().signal,
        revision,
      ).then((value) => {
        prepared = value
        return value
      }),
    ).rejects.toThrow('技能 "trial-spark" 的玩家特效: 1045 帧超过 1024 帧')
    expect(f.binaryReads).toContain('assets/generated/fire.rle')
    expect(
      browser.bitmaps
        .filter((bitmap) => bitmap.face)
        .map((bitmap) => bitmap.close.mock.calls.length),
    ).toEqual([1])
  } finally {
    prepared?.dispose()
    browser.restore()
  }
})

test.each([
  'asset',
  'silent',
] as const)('试打音乐模式 %s 决定是否冻结配乐和音色库', async (mode) => {
  const f = await readyTrialFixture()
  // 单轨 MIDI 只含结束事件。音色库字节走 RIFF/sfbk 资源边界，本入口仅冻结字节。
  const musicBytes = Uint8Array.of(
    77,
    84,
    104,
    100,
    0,
    0,
    0,
    6,
    0,
    0,
    0,
    1,
    0,
    96,
    77,
    84,
    114,
    107,
    0,
    0,
    0,
    4,
    0,
    255,
    47,
    0,
  )
  const soundfontBytes = Uint8Array.of(82, 73, 70, 70, 4, 0, 0, 0, 115, 102, 98, 107)
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
  const musicPath = 'assets/generated/theme.mid'
  const soundfontPath = 'assets/generated/soundfont.sf2'
  await addAsset('music.theme', 'music', musicPath, musicBytes, 'audio/midi')
  await addAsset('soundfont.bin', 'soundfont', soundfontPath, soundfontBytes, 'application/x-sf2')
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
    music: mode === 'asset' ? { kind: 'asset', assetId: 'music.theme' } : { kind: 'silent' },
  })
  const member = config.party.members[0]
  if (!member) throw new Error('fixture party missing')
  member.skills = { kind: 'replace', ids: ['trial-spark'] }
  const chrome = installTrialChromeHost(f.faceHash)
  let prepared: Awaited<ReturnType<typeof prepareBattleTrialAssets>> | undefined
  try {
    prepared = await prepareBattleTrialAssets(
      f.project,
      config,
      token,
      new AbortController().signal,
      revision,
    )
    expect(prepared.assets.effectSprite?.frames).toHaveLength(4)
    expect(prepared.assets.fireSprites?.[0]?.frames).toHaveLength(4)
    const musicReads = f.binaryReads.filter((path) => path === musicPath || path === soundfontPath)
    if (mode === 'silent') {
      expect(musicReads).toEqual([])
      return
    }
    expect(musicReads.sort()).toEqual([musicPath, soundfontPath].sort())
    await expect(prepared.project.assetResolver.readBytes('music.theme', 'music')).resolves.toEqual(
      musicBytes.buffer,
    )
  } finally {
    prepared?.dispose()
    chrome.restore()
  }
})
