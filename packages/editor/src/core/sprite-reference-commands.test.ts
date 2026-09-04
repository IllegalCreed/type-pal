import type { BattleSpriteDef, SpriteDef } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  RemoveBattleSpriteDefinitionCommand,
  RemoveSpriteDefinitionCommand,
  SpriteInUseError,
  UpdateBattleSpriteDefinitionCommand,
  UpdateSpriteCommand,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import type { ScriptEditorState } from './script-editor.js'

const sha = 'a'.repeat(64)
const worldSprite: SpriteDef = {
  id: 'world',
  label: '世界精灵',
  asset: 'asset.world',
  layout: { kind: 'static' },
  poses: { wave: { label: '挥手', steps: [{ frame: 0, durationMs: 120 }] } },
}
const battleSprite: BattleSpriteDef = {
  id: 'battle',
  label: '战斗精灵',
  asset: 'asset.battle',
  profile: {
    kind: 'player-fighter',
    frames: {
      idle: 0,
      dying: 1,
      dead: 2,
      defend: 3,
      hurt: 4,
      preMagic: 5,
      magic: 6,
      attackWindup: 7,
      attackRush: 8,
      attackStrike: 9,
    },
    castEffectBase: 0,
    attackEffectBase: 0,
  },
}

function state(): EditorState {
  return {
    manifest: {
      id: 'sprite-refs',
      name: 'sprite-refs',
      contentVersion: 19,
      minimumSaveVersion: 8,
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [],
    },
    scenes: [],
    actors: [],
    items: [],
    skills: [],
    levelUp: {},
    locale: {},
    sprites: [structuredClone(worldSprite)],
    battleSprites: [structuredClone(battleSprite)],
    enemies: [],
    enemyTeams: [],
    battleFields: [],
    shops: [],
    poisons: [],
    ambiences: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    stamps: [],
    scriptChunks: {},
    assetCatalog: {
      version: 1,
      assets: {
        'asset.world': {
          kind: 'sprite',
          path: 'assets/world.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 1,
          sha256: sha,
          origin: { kind: 'authored' },
        },
        'asset.battle': {
          kind: 'battle-sprite',
          path: 'assets/battle.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 1,
          sha256: sha,
          origin: { kind: 'authored' },
        },
      },
    },
    assetBlobs: {},
  } as unknown as EditorState
}

function canonical(body: ScriptEditorState['sharedScripts'][string]['body']): ScriptEditorState {
  return {
    scenes: [],
    items: [],
    sharedScripts: { shared: { name: '共享演出', self: 'none', body } },
  }
}

describe('sprite unified reference commands', () => {
  test('action edge blocks both action and definition deletion while definition-only use does not lock action', () => {
    const current = state()
    const scripts = canonical([
      {
        kind: 'playEntityAction',
        target: { scene: 'scene', entity: 'entity' },
        sprite: 'world',
        action: 'wave',
        loop: false,
      },
    ])
    const provider = (next: EditorState) => collectCurrentProjectReferenceIndex(next, scripts)

    expect(() => new RemoveSpriteDefinitionCommand('world', provider).apply(current)).toThrow(
      SpriteInUseError,
    )
    expect(() =>
      new UpdateSpriteCommand(
        'world',
        { poses: undefined },
        { asset: 'asset.world', sha256: sha, actualFrameCount: 1 },
        provider,
      ).apply(current),
    ).toThrow(SpriteInUseError)

    scripts.sharedScripts.shared!.body = [
      { kind: 'setActorSprite', actor: 'hero', sprite: 'world' },
    ]
    expect(() =>
      new UpdateSpriteCommand(
        'world',
        { poses: undefined },
        { asset: 'asset.world', sha256: sha, actualFrameCount: 1 },
        provider,
      ).apply(current),
    ).not.toThrow()
    expect(() => new RemoveSpriteDefinitionCommand('world', provider).apply(current)).toThrow(
      SpriteInUseError,
    )
  })

  test('battle definition removal and profile kind changes use the live canonical oracle', () => {
    const current = state()
    const scripts = canonical([
      {
        kind: 'setActorAppearance',
        actor: 'hero',
        battleSprite: 'battle',
      },
    ])
    const provider = (next: EditorState) => collectCurrentProjectReferenceIndex(next, scripts)

    expect(() => new RemoveBattleSpriteDefinitionCommand('battle', provider).apply(current)).toThrow(
      SpriteInUseError,
    )
    expect(() =>
      new UpdateBattleSpriteDefinitionCommand(
        'battle',
        { profile: { kind: 'summon' } },
        { asset: 'asset.battle', sha256: sha, actualFrameCount: 10 },
        provider,
      ).apply(current),
    ).toThrow(/profile.*不兼容/)

    scripts.sharedScripts.shared!.body = []
    expect(
      new RemoveBattleSpriteDefinitionCommand('battle', provider).apply(current).battleSprites,
    ).toEqual([])
  })

  test('missing targets skip the provider, provider failures preserve state, and redo revalidates', () => {
    const current = state()
    const failed = vi.fn(() => {
      throw new Error('oracle unavailable')
    })
    expect(new RemoveSpriteDefinitionCommand('missing', failed).apply(current)).toBe(current)
    expect(new RemoveBattleSpriteDefinitionCommand('missing', failed).apply(current)).toBe(current)
    expect(failed).not.toHaveBeenCalled()
    expect(() => new RemoveSpriteDefinitionCommand('world', failed).apply(current)).toThrow(
      /oracle unavailable/,
    )
    expect(current.sprites).toHaveLength(1)

    const scripts = canonical([])
    const provider = (next: EditorState) => collectCurrentProjectReferenceIndex(next, scripts)
    const session = new EditSession(current)
    expect(session.dispatch(new RemoveSpriteDefinitionCommand('world', provider))).toBe(true)
    expect(session.undo()).toBe(true)
    scripts.sharedScripts.shared!.body = [
      { kind: 'setActorSprite', actor: 'hero', sprite: 'world' },
    ]
    expect(() => session.redo()).toThrow(SpriteInUseError)
    expect(session.getState().sprites).toHaveLength(1)
    expect(session.canRedo()).toBe(true)
  })

  test('action deletion preserves history on provider failure and revalidates live references on redo', () => {
    const proof = { asset: 'asset.world', sha256: sha, actualFrameCount: 1 } as const
    const failedSession = new EditSession(state())
    expect(() =>
      failedSession.dispatch(
        new UpdateSpriteCommand('world', { poses: undefined }, proof, () => {
          throw new Error('oracle unavailable')
        }),
      ),
    ).toThrow(/oracle unavailable/)
    expect(failedSession.getHistoryVersion()).toBe(0)
    expect(failedSession.getState().sprites[0]?.poses?.wave).toBeDefined()

    const scripts = canonical([])
    const provider = (next: EditorState) => collectCurrentProjectReferenceIndex(next, scripts)
    const session = new EditSession(state())
    expect(session.dispatch(new UpdateSpriteCommand('world', { poses: undefined }, proof, provider))).toBe(
      true,
    )
    expect(session.undo()).toBe(true)
    scripts.sharedScripts.shared!.body = [
      {
        kind: 'playEntityAction',
        target: { scene: 'scene', entity: 'entity' },
        sprite: 'world',
        action: 'wave',
        loop: false,
      },
    ]
    expect(() => session.redo()).toThrow(SpriteInUseError)
    expect(session.getState().sprites[0]?.poses?.wave).toBeDefined()
    expect(session.canRedo()).toBe(true)
  })
})
