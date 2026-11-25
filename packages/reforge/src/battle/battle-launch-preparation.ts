import {
  type AssetId,
  collectCommandAssetReferences,
  type SceneDef,
  type WorldState,
} from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import {
  type BattleFieldEntry,
  type LoadedSprite,
  loadBattleBgFull,
  loadFireSprite,
} from '../assets.js'
import {
  type SfxPlayer,
  SfxReadinessCollectionError,
  SfxReadinessResourceError,
} from '../audio/sfx.js'
import { collectBattleBaseSounds, collectTurnActionSounds } from '../audio/sfx-readiness.js'
import { MenuBox, statusPortraitAsset } from '../menu/menu-box.js'
import type { RuntimeProjectView } from '../runtime-project-view.js'
import type { ScriptHost } from '../script-runner.js'
import { collectBattleCasualtyPortraits } from './battle-casualty-presentation.js'
import {
  assertLoadedFireUses,
  collectBattleSkillFireUses,
  collectBattleThrowFireUses,
  prepareBattleFireSprites,
} from './battle-fire-readiness.js'
import { createBattlePlayers } from './battle-player-input.js'
import type { BattleSession, BattleSessionAssets } from './battle-session.js'
import { prepareBattleSpriteReadiness } from './battle-sprite-readiness.js'

export type BattleLaunchOptions = NonNullable<Parameters<ScriptHost['startBattle']>[1]> & {
  /** Canonical script activity owns the return from this battle. */
  scripted?: true
  /** DEV gateway only; never part of the author command or save model. */
  enemyOverride?: string[]
}
export type BattleContent = Pick<
  RuntimeProjectView,
  | 'actorsById'
  | 'skills'
  | 'items'
  | 'locale'
  | 'enemiesById'
  | 'enemyTeamsById'
  | 'battleSpritesById'
  | 'battleFields'
  | 'poisonsById'
  | 'sharedScripts'
>
export interface BattlePreparationAssets {
  assetBase: RuntimeProjectView['assetBase']
  reader: RuntimeProjectView['assetResolver']
  imageCache: RuntimeProjectView['imageCache']
  spriteCache: RuntimeProjectView['battleSpriteCache']
  soundRoles: RuntimeProjectView['manifest']['assets']['roles']
  portraits: Map<AssetId, ImageBitmap>
  faces: Map<AssetId, ImageBitmap>
  palette(): Palette
  chrome: Pick<BattleSessionAssets, 'glyphs' | 'ui' | 'battleIcons' | 'dialogBox'>
  sfx: SfxPlayer
  loadEffect(): Promise<LoadedSprite | undefined>
}
export interface BattlePreparationPorts {
  readWorld(): WorldState
  readScene(): Pick<SceneDef, 'battleMusic' | 'battleFieldId'>
  debugLeaders(): { dualLeader: string | null; allLeader: string | null }
}
export const isBattleAbort = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'

type SessionOptions = NonNullable<ConstructorParameters<typeof BattleSession>[5]>
type ReportReadiness = (team: string, stage: string, error: Error, fatal: boolean) => void

/** Asset preparation only. No DOM, storage, active session, world mutation or frame scheduling. */
export class BattleLaunchPreparation {
  #fields: Promise<Map<number, BattleFieldEntry>> | null = null
  constructor(
    private readonly content: BattleContent,
    private readonly assets: BattlePreparationAssets,
    private readonly ports: BattlePreparationPorts,
  ) {}

  async prepare(
    team: string,
    options: BattleLaunchOptions | undefined,
    signal: AbortSignal,
    assertCurrent: () => void,
    report: ReportReadiness,
    onBattleTrack?: (asset: AssetId) => void,
  ) {
    const { content, assets } = this
    const ports = this.ports
    const enemySlots = options?.enemyOverride
      ? options.enemyOverride.map((id) => content.enemiesById[id] ?? null).slice(0, 5)
      : (content.enemyTeamsById[team]?.slots ?? []).map((id) =>
          id === null ? null : (content.enemiesById[id] ?? null),
        )
    const enemyDefs = enemySlots.filter((e): e is NonNullable<typeof e> => !!e)
    if (enemyDefs.length === 0) throw new Error(`遇敌 ${team}：敌队没有有效敌人，无法开始战斗`)
    const encounterChoreo =
      options?.choreography ?? enemyDefs.flatMap((enemy) => enemy.choreography ?? [])
    const encounterPortraits = new Set(
      collectCommandAssetReferences(encounterChoreo, 'battle.choreography')
        .filter((reference) => reference.expectedKind === 'portrait')
        .map((reference) => reference.asset),
    )
    await Promise.all(
      [...encounterPortraits].map(async (asset) => {
        if (!assets.portraits.has(asset))
          assets.portraits.set(asset, await assets.imageCache.load(asset, 'portrait'))
      }),
    )
    assertCurrent()
    // Read at the original post-portrait boundary, not at request creation.
    const scene = ports.readScene()
    const battleTrack =
      options?.music !== undefined
        ? options.music
        : scene.battleMusic !== undefined
          ? scene.battleMusic
          : assets.reader.assetForRole('audio.defaultBattleMusic')
    if (battleTrack !== null) onBattleTrack?.(battleTrack)
    const players = createBattlePlayers(ports.readWorld(), content, ports.debugLeaders())
    const playerSounds = ports
      .readWorld()
      .party.map((c) => content.actorsById[c.template]?.battler?.sounds)
    const cooperativeSkillIds = ports.readWorld().party.flatMap((c) => {
      const id = content.actorsById[c.template]?.battler?.cooperativeMagicSkillId
      return id ? [id] : []
    })
    const battleBaseSounds = await collectBattleBaseSounds({
      playerSounds,
      cooperativeSkillIds,
      enemyDefs,
      enemiesById: content.enemiesById,
      skills: content.skills,
      itemsById: content.items,
      activePlayerPoisons: players.flatMap((player) => player.poisons ?? []),
      activeEnemyPoisons: [],
      poisonDefs: content.poisonsById,
      roles: assets.soundRoles,
      encounterChoreography: encounterChoreo,
      sharedScripts: content.sharedScripts,
      signal,
    }).catch((error: unknown) => {
      if (isBattleAbort(error)) throw error
      throw new SfxReadinessCollectionError(`${team} battleBase 音效闭包收集失败`, { cause: error })
    })
    assertCurrent()
    await assets.sfx.prepare(battleBaseSounds).catch((error: unknown) => {
      if (!(error instanceof SfxReadinessResourceError)) throw error
      report(team, 'battleBase', error, false)
    })
    assertCurrent()
    const { commitAssets, fieldDef } = await this.prepareVisuals(
      players,
      enemyDefs,
      cooperativeSkillIds,
      options,
      assertCurrent,
    )
    assertCurrent()
    // No mutable world snapshot crosses the asynchronous preparation/commit boundary.
    const commit = () => {
      const sessionOptions: SessionOptions = {
        skills: content.skills,
        enemiesById: content.enemiesById,
        items: content.items,
        inventory: ports.readWorld().inventory.map((x) => ({ ...x })),
        difficulty: 'normal',
        auto: options?.auto,
        boss: options?.boss,
        locale: content.locale,
        fieldWave: fieldDef?.screenWave ?? 0,
        fieldEffect: fieldDef?.magicEffect,
        poisonDefs: content.poisonsById,
        money: ports.readWorld().money,
        actorsById: content.actorsById,
        skillUseCounts: ports.readWorld().skillUseCounts,
        encounterChoreo,
        playerSounds,
        soundRoles: assets.soundRoles,
        prepareTurnSounds: (snapshot) => this.prepareTurnSounds(team, battleBaseSounds, snapshot),
        reportReadinessError: (error, context) =>
          report(team, `turn-${context.turn}`, error, context.fatal),
        worldPartyIdentities: ports.readWorld().party.map(({ id, template }) => ({ id, template })),
      }
      return { sessionAssets: commitAssets(), sessionOptions }
    }
    return { players, enemySlots, commit, battleTrack }
  }

  private async prepareVisuals(
    players: ReturnType<typeof createBattlePlayers>,
    enemyDefs: BattleContent['enemiesById'][string][],
    cooperativeSkillIds: string[],
    options: BattleLaunchOptions | undefined,
    assertCurrent: () => void,
  ) {
    const { content, assets } = this
    const ports = this.ports
    const sprites = await prepareBattleSpriteReadiness({
      cache: assets.spriteCache,
      reader: assets.reader,
      definitionsById: content.battleSpritesById,
      party: ports.readWorld().party,
      actorsById: content.actorsById,
      itemsById: content.items,
      playerSkillIds: players.map((player) => player.skills),
      cooperativeSkillIds,
      skillsById: content.skills,
      enemyDefs,
      enemiesById: content.enemiesById,
    })
    assertCurrent()
    const fieldId = options?.fieldId ?? ports.readScene().battleFieldId ?? 24
    const fields = await this.fields()
    assertCurrent()
    const fieldDef = fields.get(Number(fieldId))
    const portraits = collectBattleCasualtyPortraits(players, content.actorsById)
    if (assets.chrome.ui)
      for (const member of ports.readWorld().party) {
        const asset = statusPortraitAsset(member, content.actorsById[member.template])
        if (asset) portraits.add(asset)
      }
    for (const enemy of sprites.reachableEnemyDefs) {
      const references = collectCommandAssetReferences(enemy.ai.hooks, 'battle.enemyHooks')
      for (const { asset, expectedKind } of references) {
        if (expectedKind === 'portrait') portraits.add(asset)
      }
    }
    const [bgFull, faceList, effectSprite] = await Promise.all([
      fieldDef?.background
        ? loadBattleBgFull(assets.assetBase, fieldDef.background, assets.palette())
        : Promise.resolve(undefined),
      Promise.resolve(
        ports.readWorld().party.map((c) => {
          const asset = content.actorsById[c.template]?.face
          return asset ? assets.faces.get(asset) : undefined
        }),
      ),
      assets.loadEffect(),
      ...[...portraits].map(async (asset) => {
        if (!assets.portraits.has(asset))
          assets.portraits.set(asset, await assets.imageCache.load(asset, 'portrait'))
      }),
    ])
    assertCurrent()
    const skillFireUses = collectBattleSkillFireUses({
      playerSkillIds: players.map((player) => player.skills),
      cooperativeSkillIds,
      reachableEnemySkillIds: sprites.reachableEnemySkillIds,
      skillsById: content.skills,
    })
    const carriedItems = () =>
      ports
        .readWorld()
        .inventory.filter(({ count }) => count > 0)
        .map(({ itemId }) => itemId)
    const throwFireUses = collectBattleThrowFireUses(content.items, [
      ...sprites.reachableEnemyDefs.flatMap((enemy) => (enemy.steal ? [enemy.steal.itemId] : [])),
      ...carriedItems(),
    ])
    const fireSprites = await prepareBattleFireSprites(
      [...skillFireUses, ...throwFireUses],
      (chunk) => loadFireSprite(assets.assetBase, chunk).catch(() => undefined),
    )
    assertCurrent()
    const commitAssets = (): BattleSessionAssets => {
      // Inventory is live at commit. A late item can use a sheet that another action already loaded.
      assertLoadedFireUses(collectBattleThrowFireUses(content.items, carriedItems()), fireSprites)
      const faces: Record<string, ImageBitmap | undefined> = {}
      const { party } = ports.readWorld()
      party.forEach((c, i) => {
        faces[c.id] = faceList[i]
      })
      const { glyphs, ui } = assets.chrome
      const palette = assets.palette()
      const statusPanel = ui
        ? {
            renderer: new MenuBox(glyphs, content.locale, ui, content.items, {
              actorsById: content.actorsById,
              poisonsById: content.poisonsById,
              palette,
              portraits: assets.portraits,
            }),
            party,
          }
        : undefined
      const sessionAssets: BattleSessionAssets = {
        ...assets.chrome,
        bg: bgFull?.canvas,
        bgIndexed: bgFull ? { indices: bgFull.indices, w: bgFull.w, h: bgFull.h } : undefined,
        palette,
        battleSprites: sprites.byDefinitionId,
        playerBaseDefinitionIds: sprites.playerBaseDefinitionIds,
        statusPanel,
        faces,
        sfx: assets.sfx,
        effectSprite,
        fireSprites,
      }
      return sessionAssets
    }
    return { commitAssets, fieldDef }
  }

  private fields() {
    this.#fields ??= Promise.resolve(
      new Map(
        this.content.battleFields.map((f) => [
          Number(f.id),
          {
            screenWave: f.screenWave ?? 0,
            ...(f.magicEffect ? { magicEffect: f.magicEffect } : {}),
            ...(f.background ? { background: f.background } : {}),
          },
        ]),
      ),
    )
    return this.#fields
  }

  private async prepareTurnSounds(
    team: string,
    base: Set<AssetId>,
    snapshot: Parameters<NonNullable<SessionOptions['prepareTurnSounds']>>[0],
  ) {
    let sounds: ReturnType<typeof collectTurnActionSounds>
    try {
      sounds = collectTurnActionSounds({
        pendingActions: snapshot.actions.values(),
        activePlayerPoisons: snapshot.activePlayerPoisons,
        activeEnemyPoisons: snapshot.activeEnemyPoisons,
        skills: this.content.skills,
        itemsById: this.content.items,
        poisonDefs: this.content.poisonsById,
      })
    } catch (error) {
      throw new SfxReadinessCollectionError(`${team} turn-${snapshot.turn} 音效闭包收集失败`, {
        cause: error,
      })
    }
    // Re-touch the entire union, not just additions: base sounds must survive the LRU.
    await this.assets.sfx.prepare(new Set([...base, ...sounds]))
  }
}
