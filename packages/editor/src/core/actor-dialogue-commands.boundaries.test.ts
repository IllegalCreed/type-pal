/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 B1～B3：角色立绘与表情引用命令边界
 * （actor-dialogue-commands.ts:44-197）。既有 actor-dialogue-commands.test.ts 已覆盖：
 * 重命名一次改写+撤销、被引用表情/立绘组删除阻断、未引用表情可删保默认。
 * 本文件补：空白名/缺目标/同名冲突抛错、非目标 actor 引用不改写、删最后表情保留默认、
 * 无引用立绘组删除+inverse、缺目标 no-op、独立深快照自证。
 */
import { describe, expect, test } from 'vitest'
import { actorCue, deepSnapshot } from './__tests__/glm-editor-logic-fixtures.js'
import {
  RemoveActorPortraitExpressionCommand,
  RemoveActorPortraitSetCommand,
  RenameActorPortraitExpressionCommand,
} from './actor-dialogue-commands.js'
import type { EditorState } from './edit-session.js'

function state(): EditorState {
  return {
    manifest: {
      id: 'dialogue-expression',
      name: 'dialogue expression',
      contentVersion: 20,
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
        onEnter: [{ body: [actorCue('angry')] }],
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
      {
        id: 'other',
        name: 'name.other',
        spriteId: 'sprite.other',
        portraits: {
          default: 'portrait.other',
          expressions: { angry: 'portrait.other.angry' },
        },
      },
      {
        id: 'bystander',
        name: 'name.bystander',
        spriteId: 'sprite.bystander',
        portraits: { default: 'portrait.bystander', expressions: {} },
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
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'itemPrivateScript',
              script: { id: 'use', label: '使用', body: [actorCue('calm')] },
            },
          ],
        },
      },
    ],
    sharedScripts: {
      shared: {
        name: 'shared.name',
        self: 'none',
        body: [
          {
            kind: 'dialog',
            cue: {
              identity: {
                kind: 'actor',
                actor: 'other',
                portrait: { kind: 'expression', expression: 'angry', side: 'left' },
              },
              slot: 'bottom',
              rows: [{ text: 'x' }],
            },
          },
        ],
      },
    },
    scriptChunks: {
      chunk: { version: 1, scripts: { script: [actorCue('angry')] } },
    },
    enemies: [
      { id: 'enemy', name: 'enemy.name', ai: { rules: [] }, onDefeated: [actorCue('angry')] },
    ],
    skills: [],
    levelUp: {},
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

describe('B1 RenameActorPortraitExpressionCommand · 边界', () => {
  test('空白与带首尾空格名拒绝；缺表情抛错；同名冲突抛错；from===to no-op（现行合同）', () => {
    const s0 = state()
    expect(() =>
      new RenameActorPortraitExpressionCommand('hero', 'angry', '  fury ').apply(s0),
    ).toThrow(/表情名不能为空或包含首尾空格/)
    expect(() => new RenameActorPortraitExpressionCommand('hero', 'angry', ' ').apply(s0)).toThrow(
      /表情名不能为空或包含首尾空格/,
    )
    expect(() => new RenameActorPortraitExpressionCommand('hero', 'ghost', 'x').apply(s0)).toThrow(
      /人物 hero 不存在表情“ghost”/,
    )
    expect(() =>
      new RenameActorPortraitExpressionCommand('hero', 'angry', 'calm').apply(s0),
    ).toThrow(/人物 hero 已存在表情“calm”/)
    expect(new RenameActorPortraitExpressionCommand('hero', 'angry', 'angry').apply(s0)).toBe(s0)
  })
  test('改写命中全部目标 cue 且不改其它 actor 引用；actor 目标表/asset 映射钉住；输入不变；invert 完整恢复（深快照）', () => {
    const s0 = state()
    const before = deepSnapshot(s0)
    const command = new RenameActorPortraitExpressionCommand('hero', 'angry', 'fury')
    const s1 = command.apply(s0)
    // hero 的 angry → fury（scene onEnter + scriptChunks + enemy onDefeated 三处）
    expect(s1.scenes[0]!.onEnter![0]!.body[0]).toMatchObject({
      cue: { identity: { portrait: { expression: 'fury' } } },
    })
    expect(s1.scriptChunks.chunk?.scripts.script![0]).toMatchObject({
      cue: { identity: { portrait: { expression: 'fury' } } },
    })
    expect(s1.enemies?.[0]!.onDefeated![0]).toMatchObject({
      cue: { identity: { portrait: { expression: 'fury' } } },
    })
    // R2 钉 actor 目标表：旧 key 移除、新 key 指向**原 asset**、未触表情与其它 actor 完整保留
    const heroExpressions = s1.actors[0]!.portraits!.expressions!
    expect(Object.keys(heroExpressions).sort()).toEqual(['calm', 'fury'])
    expect(heroExpressions.fury).toBe('portrait.hero.angry') // 新 key 承接原 asset，不得指向其它图
    expect(heroExpressions.calm).toBe('portrait.hero.calm')
    expect(s1.actors[0]!.portraits!.default).toBe('portrait.hero')
    expect(s1.actors[1]!.portraits).toEqual(before.actors[1]!.portraits) // other 不动
    expect(s1.actors[2]!.portraits).toEqual(before.actors[2]!.portraits) // bystander 不动
    // calm（item 内）与 other actor 的 angry 不改
    expect(s1.items[0]!.use!.effects[0]).toMatchObject({
      kind: 'itemPrivateScript',
      script: { body: [{ cue: { identity: { portrait: { expression: 'calm' } } } }] },
    })
    expect(s1.sharedScripts!.shared!.body[0]!).toMatchObject({
      cue: { identity: { actor: 'other', portrait: { expression: 'angry' } } },
    })
    // R2 输入不可变：apply 后原输入与深快照逐域相等（污染会在此红）
    expect(s0).toEqual(before)
    // R2 invert 半边：invert 前独立深快照 s1，invert 后核 s1 全状态不变 + 完整预期恢复结果
    const s1Before = deepSnapshot(s1)
    const s2 = command.invert(s1)
    expect(s1).toEqual(s1Before) // invert 不污染其输入（restore 内污染会在此红）
    expect(s2).toEqual(before) // 完整恢复到 apply 前深快照（全状态，非部分域）
    expect(s1.actors[0]!.portraits!.expressions).toHaveProperty('fury') // s1 仍含 fury（引用隔离自证）
  })
})

describe('B2 RemoveActorPortraitExpressionCommand · 边界', () => {
  test('被 cue 引用的表情删除阻断（真实引用守卫）', () => {
    const s0 = state()
    expect(() => new RemoveActorPortraitExpressionCommand('hero', 'angry').apply(s0)).toThrow(
      /仍被 \d+ 处对话引用/,
    )
    expect(s0.actors[0]!.portraits!.expressions).toHaveProperty('angry') // 状态不变
  })
  test('缺 actor/缺表情 no-op（现行合同）', () => {
    const s0 = state()
    expect(new RemoveActorPortraitExpressionCommand('ghost', 'angry').apply(s0)).toBe(s0)
    expect(new RemoveActorPortraitExpressionCommand('hero', 'ghost').apply(s0)).toBe(s0)
  })
  test('删最后表情只保留默认立绘且 inverse 恢复', () => {
    const base = state()
    const s0: EditorState = {
      ...base,
      actors: [
        {
          id: 'solo',
          name: 'name.solo',
          spriteId: 'sprite.solo',
          portraits: { default: 'p.default', expressions: { only: 'p.only' } },
        },
      ],
    }
    const before = deepSnapshot(s0)
    const command = new RemoveActorPortraitExpressionCommand('solo', 'only')
    const s1 = command.apply(s0)
    expect(s1.actors[0]!.portraits).toEqual({ default: 'p.default' })
    const s2 = command.invert(s1)
    expect(s2.actors[0]!.portraits).toEqual(before.actors[0]!.portraits)
  })
})

describe('B3 RemoveActorPortraitSetCommand · 边界', () => {
  test('无引用立绘组可删且 inverse 恢复；缺目标 actor no-op', () => {
    const s0 = state()
    const before = deepSnapshot(s0)
    const command = new RemoveActorPortraitSetCommand('bystander')
    const s1 = command.apply(s0)
    expect(s1.actors[2]!.portraits).toBeUndefined()
    expect(s1.actors[0]).toEqual(before.actors[0])
    expect(s1.scenes).toEqual(before.scenes) // bystander 无任何 cue 引用
    const s2 = command.invert(s1)
    expect(s2.actors[2]!.portraits).toEqual(before.actors[2]!.portraits)
    expect(new RemoveActorPortraitSetCommand('ghost').apply(s0)).toBe(s0)
  })
})
