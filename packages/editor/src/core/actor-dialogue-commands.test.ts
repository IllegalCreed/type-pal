import { describe, expect, test } from 'vitest'
import {
  RemoveActorPortraitExpressionCommand,
  RemoveActorPortraitSetCommand,
  RenameActorPortraitExpressionCommand,
} from './actor-dialogue-commands.js'
import { collectEditorDialoguePortraitReferences } from './actor-references.js'
import type { EditorState } from './edit-session.js'

const actorCue = () => ({
  kind: 'dialog' as const,
  cue: {
    identity: {
      kind: 'actor' as const,
      actor: 'hero',
      portrait: { kind: 'expression' as const, expression: 'angry' },
    },
    slot: 'bottom' as const,
    rows: ['dialog.hero'],
  },
})

function state(): EditorState {
  return {
    manifest: {
      id: 'dialogue-expression',
      name: 'dialogue expression',
      contentVersion: 19,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      minimumSaveVersion: 8,
    },
    scenes: [
      {
        id: 's',
        mapId: 'map-s',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
        onEnter: [{ body: [actorCue()] }],
      },
    ],
    actors: [
      {
        id: 'hero',
        name: 'name.hero',
        spriteId: 'sprite.hero',
        portraits: {
          default: 'portrait.hero',
          expressions: { angry: 'portrait.hero.angry', calm: 'portrait.hero.calm' },
        },
      },
    ],
    items: [
      {
        id: 'item',
        name: 'item.name',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: { effects: [{ kind: 'itemPrivateScript', script: { body: [actorCue()] } }] },
      },
    ],
    sharedScripts: {
      shared: { name: 'shared.name', self: { scene: 's', entity: 'e' }, body: [actorCue()] },
    },
    scriptChunks: {
      chunk: { version: 1, scripts: { script: [actorCue()] } },
    },
    enemies: [
      {
        id: 'enemy',
        name: 'enemy.name',
        ai: { rules: [] },
        onDefeated: [actorCue()],
      },
    ],
    skills: [],
    levelUp: {},
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

describe('人物立绘表情引用事务', () => {
  test('重命名一次改写所有作者面并可精确撤销', () => {
    const before = state()
    expect(collectEditorDialoguePortraitReferences(before)).toHaveLength(5)
    const command = new RenameActorPortraitExpressionCommand('hero', 'angry', 'furious')
    const after = command.apply(before)

    expect(before.actors[0]?.portraits?.expressions).toHaveProperty('angry')
    expect(after.actors[0]?.portraits?.expressions).not.toHaveProperty('angry')
    expect(after.actors[0]?.portraits?.expressions?.furious).toBe('portrait.hero.angry')
    expect(
      collectEditorDialoguePortraitReferences(after).map((reference) => reference.expression),
    ).toEqual(['furious', 'furious', 'furious', 'furious', 'furious'])
    expect(command.invert(after)).toEqual(before)
  })

  test('被引用的表情和整个立绘组都禁止删除', () => {
    const current = state()
    expect(() => new RemoveActorPortraitExpressionCommand('hero', 'angry').apply(current)).toThrow(
      /仍被 5 处对话引用/,
    )
    expect(() => new RemoveActorPortraitSetCommand('hero').apply(current)).toThrow(
      /仍被 5 处对话引用/,
    )
  })

  test('未引用表情可删且不改变默认立绘', () => {
    const before = state()
    const command = new RemoveActorPortraitExpressionCommand('hero', 'calm')
    const after = command.apply(before)
    expect(after.actors[0]?.portraits).toEqual({
      default: 'portrait.hero',
      expressions: { angry: 'portrait.hero.angry' },
    })
    expect(command.invert(after)).toEqual(before)
  })
})
