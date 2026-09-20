/** Private per-launch byte snapshot. After seal, no project IO is permitted by battle consumers. */
import {
  type AssetCatalogV1,
  type AssetId,
  collectCommandAssetReferences,
  PAL_PHYSICAL_EFFECT_ASSET_ID,
} from '@type-pal/content'
import { AssetResolver } from './asset-resolver.js'
import {
  BattleSpriteAssetCache,
  type LoadedSprite,
  loadBattleBgFull,
  loadEffectSprite,
  loadFireSprite,
  loadStandardPalette,
} from './assets.js'
import { collectBattleBaseSounds, collectTurnActionSounds } from './audio/sfx-readiness.js'
import type { BattleAction } from './battle/battle-core.js'
import {
  collectBattleSkillFireChunks,
  prepareBattleSpriteReadiness,
} from './battle/battle-sprite-readiness.js'
import { battleTrialRevision, prepareBattleTrial } from './battle-trial-prepare.js'
import { loadCursorFrames } from './dialog/dialog-assets.js'
import type { FileSource } from './file-source.js'
import { sha256Bytes } from './hash.js'
import { loadMenuAssets } from './menu/menu-box.js'
import { ProjectImageCache } from './project-image-cache.js'
import { type LoadedCurrentProject, loadCurrentProjectFrom } from './project-loader.js'
import { assertProjectSaveReadable } from './project-save-state.js'
import { loadGlyphs } from './text/glyph.js'

export function trialAbortError(): DOMException {
  return new DOMException('独立试打已取消', 'AbortError')
}
export function abortableTrial<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(trialAbortError())
    if (signal.aborted) {
      promise.catch(() => {})
      reject(trialAbortError())
      return
    }
    signal.addEventListener('abort', abort, { once: true })
    promise
      .then((value) => {
        if (signal.aborted) reject(trialAbortError())
        else resolve(value)
      }, reject)
      .finally(() => signal.removeEventListener('abort', abort))
  })
}
export function createTrialFileSnapshot(
  original: FileSource,
  signal: AbortSignal,
  catalog?: AssetCatalogV1,
) {
  const cache = new Map<string, Promise<ArrayBuffer>>()
  let sealed = false,
    closed = false
  const readBytes = async (path: string): Promise<ArrayBuffer> => {
    if (closed || signal.aborted) throw trialAbortError()
    let pending = cache.get(path)
    if (!pending) {
      if (sealed) throw new Error(`本场试打未冻结资源 ${path}，请返回编辑器重新开始`)
      pending = original.readBytes(path, signal).then(async (bytes) => {
        if (closed || signal.aborted) throw trialAbortError()
        const retained = bytes.slice(0)
        for (const record of Object.values(catalog?.assets ?? {}))
          if (
            record.path === path &&
            (record.bytes !== retained.byteLength ||
              (await sha256Bytes(new Uint8Array(retained))) !== record.sha256)
          )
            throw new Error(`本场资源与catalog登记不符：${path}`)
        if (closed || signal.aborted) throw trialAbortError()
        return retained
      })
      cache.set(path, pending)
    }
    return (await abortableTrial(pending, signal)).slice(0)
  }
  const source: FileSource = {
    readBytes,
    readText: async (path) => new TextDecoder().decode(await readBytes(path)),
    readJson: async <T>(path: string) =>
      JSON.parse(new TextDecoder().decode(await readBytes(path))) as T,
    urlFor: async () => {
      throw new Error('独立试打仅消费已冻结资源字节')
    },
  }
  return {
    source,
    seal() {
      sealed = true
    },
    dispose() {
      closed = true
      cache.clear()
    },
  }
}

/** Caller holds the editor workspace read lock through this entire preparation. */
export async function prepareBattleTrialAssets(
  input: LoadedCurrentProject,
  config: unknown,
  expectedToken: string,
  signal: AbortSignal,
  expectedRevision: string,
) {
  if (signal.aborted) throw trialAbortError()
  if ((await assertProjectSaveReadable(input.source)) !== expectedToken)
    throw new Error('工程已变化，请保存后重新发起试打')
  if ((await battleTrialRevision(input)) !== expectedRevision)
    throw new Error('工程战斗数据已变化，请从编辑器重新开始')
  const prepared = prepareBattleTrial(config, input)
  const snapshot = createTrialFileSnapshot(input.source, signal, input.assetCatalog)
  const resolver = new AssetResolver(
    input.manifest.id,
    input.assetCatalog,
    input.manifest.assets.roles,
    snapshot.source,
  )
  const imageCache = new ProjectImageCache(resolver)
  const spriteCache = new BattleSpriteAssetCache()
  const project: LoadedCurrentProject = {
    ...input,
    assetResolver: resolver,
    source: snapshot.source,
    assetBase: { source: snapshot.source, assetResolver: resolver },
    imageCache,
    battleSpriteCache: spriteCache,
  }
  let closed = false
  const dispose = () => {
    closed = true
    snapshot.dispose()
    imageCache.dispose()
    spriteCache.clear()
  }
  const preparing = (async () => {
    const { world, players, items, enemySlots, field } = prepared
    const enemyDefs = enemySlots.filter((enemy) => enemy !== null)
    const playerSounds = world.party.map((c) => project.actorsById[c.template]?.battler?.sounds)
    const cooperativeSkillIds = players.flatMap((player) =>
      player.cooperativeMagicSkillId ? [player.cooperativeMagicSkillId] : [],
    )
    const encounterChoreo = enemyDefs.flatMap((enemy) => enemy.choreography ?? [])
    const baseSounds = await collectBattleBaseSounds({
      playerSounds,
      cooperativeSkillIds,
      enemyDefs,
      enemiesById: project.enemiesById,
      skills: project.skills,
      itemsById: items,
      poisonDefs: project.poisonsById,
      roles: project.manifest.assets.roles,
      encounterChoreography: encounterChoreo,
      sharedScripts: project.sharedScripts,
      signal,
    })
    const readiness = await prepareBattleSpriteReadiness({
      cache: spriteCache,
      reader: resolver,
      definitionsById: project.battleSpritesById,
      party: world.party,
      actorsById: project.actorsById,
      itemsById: items,
      playerSkillIds: players.map((player) => player.skills),
      cooperativeSkillIds,
      skillsById: project.skills,
      enemyDefs,
      enemiesById: project.enemiesById,
    })
    const possibleItems = new Set([
      ...world.inventory.map((item) => item.itemId),
      ...readiness.reachableEnemyDefs.flatMap((enemy) => (enemy.steal ? [enemy.steal.itemId] : [])),
    ])
    const actions: BattleAction[] = players.flatMap((player) =>
      player.skills.map((skillId) => ({ kind: 'cast' as const, skillId })),
    )
    for (const itemId of possibleItems) {
      actions.push({ kind: 'item', itemId }, { kind: 'throw', itemId })
    }
    const futureSounds = collectTurnActionSounds({
      pendingActions: actions,
      skills: project.skills,
      itemsById: items,
      poisonDefs: project.poisonsById,
    })
    const musicAssets = new Set<AssetId>()
    for (const key of [
      'audio.defaultBattleMusic',
      'audio.normalVictoryMusic',
      'audio.bossVictoryMusic',
    ] as const) {
      const asset = project.manifest.assets.roles[key]
      if (asset) musicAssets.add(asset)
    }
    if (prepared.config.music.kind === 'asset') musicAssets.add(prepared.config.music.assetId)
    const portraits = new Map<AssetId, ImageBitmap>()
    const choreoAssets = collectCommandAssetReferences(
      [encounterChoreo, ...readiness.reachableEnemyDefs.map((enemy) => enemy.ai.hooks)],
      'trial',
    )
    for (const ref of choreoAssets) if (ref.expectedKind === 'music') musicAssets.add(ref.asset)
    if (prepared.config.music.kind === 'silent') musicAssets.clear()
    const palette = await loadStandardPalette(project.assetBase)
    const [glyphs, cursorFrames, ui, bg] = await Promise.all([
      loadGlyphs(),
      loadCursorFrames(),
      loadMenuAssets(items, imageCache),
      field.background ? loadBattleBgFull(project.assetBase, field.background, palette) : undefined,
      ...choreoAssets
        .filter((ref) => ref.expectedKind === 'portrait')
        .map(async (ref) => {
          portraits.set(ref.asset, await imageCache.load(ref.asset, 'portrait'))
        }),
      ...[...new Set([...baseSounds, ...futureSounds])].map(async (asset) =>
        resolver.readBytes(asset, 'sound'),
      ),
      ...[...musicAssets].map((asset) => resolver.readBytes(asset, 'music')),
      ...(musicAssets.size ? [resolver.readRoleBytes('audio.midiSoundfont')] : []),
    ])
    const faces: Record<string, ImageBitmap | undefined> = {}
    await Promise.all(
      world.party.map(async (member) => {
        const asset = project.actorsById[member.template]?.face
        faces[member.id] = asset ? await imageCache.load(asset, 'face') : undefined
      }),
    )
    const fireChunks = collectBattleSkillFireChunks({
      playerSkillIds: players.map((player) => player.skills),
      cooperativeSkillIds,
      reachableEnemySkillIds: readiness.reachableEnemySkillIds,
      skillsById: project.skills,
    })
    for (const id of possibleItems) {
      const presentation = items[id]?.throw?.presentation
      if (presentation?.kind === 'magic' && presentation.animation.effectSprite >= 0)
        fireChunks.add(presentation.animation.effectSprite)
    }
    const fireSprites: Record<number, LoadedSprite> = {}
    await Promise.all(
      [...fireChunks].map(async (chunk) => {
        fireSprites[chunk] = await loadFireSprite(project.assetBase, chunk)
      }),
    )
    const effectSprite = project.assetCatalog.assets[PAL_PHYSICAL_EFFECT_ASSET_ID]
      ? await loadEffectSprite(project.assetBase)
      : undefined
    if ((await assertProjectSaveReadable(input.source)) !== expectedToken)
      throw new Error('资源准备期间工程已变化，请重新试打')
    if (
      (await battleTrialRevision(await loadCurrentProjectFrom(input.source))) !==
        expectedRevision ||
      (await assertProjectSaveReadable(input.source)) !== expectedToken
    )
      throw new Error('资源准备期间战斗数据已被修改，请重新试打')
    if (signal.aborted || closed) throw trialAbortError()
    snapshot.seal()
    return {
      prepared,
      project,
      baseSounds,
      playerSounds,
      encounterChoreo,
      portraits,
      cursorFrames,
      dispose,
      assets: {
        palette,
        glyphs,
        ui,
        faces,
        fireSprites,
        effectSprite,
        battleIcons: ui.battleIcons,
        battleSprites: readiness.byDefinitionId,
        playerBaseDefinitionIds: readiness.playerBaseDefinitionIds,
        bg: bg?.canvas,
        bgIndexed: bg ? { indices: bg.indices, w: bg.w, h: bg.h } : undefined,
      },
    }
  })()
  void preparing.then(
    () => {
      if (closed) dispose()
    },
    () => {
      if (closed) dispose()
    },
  )
  try {
    return await abortableTrial(preparing, signal)
  } catch (error) {
    dispose()
    throw error
  }
}
