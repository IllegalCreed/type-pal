/** Loader 接线合同：合法当前工程只破坏一条引用边，红臂附同构闭合对照。 */
import { describe, expect, test } from 'vitest'
import {
  lbApplyCondition,
  lbBattleSprite,
  lbMemorySource,
  lbPoison,
  lbPrivateScriptItem,
  lbProjectFiles,
  lbSceneWithHookCommands,
} from './__tests__/project-loading-boundaries/fixture.js'
import { loadAuthorScene, loadCurrentProjectFrom } from './project-loader.js'

async function rejectOf(promise: Promise<unknown>) {
  return promise.then(
    () => ({ kind: 'resolved', message: '' }),
    (error: unknown) => ({
      kind: 'rejected',
      message: error instanceof Error ? error.message : String(error),
    }),
  )
}

describe('C2 场景 mapId 引用接线', () => {
  test('入口 mapId 悬空精确拒绝，登记同一 mapId 后装配成功', async () => {
    const marker = 'C2-entry-map-reference'
    const scenes = { s001: { body: lbSceneWithHookCommands('s001', 'map-ghost', []) } }
    const red = await rejectOf(loadCurrentProjectFrom(lbMemorySource(lbProjectFiles({ scenes }))))
    expect(red.kind, marker).toBe('rejected')
    expect(red.message, marker).toContain(
      'manifest.entryPoints[new-game].scene(s001): mapId "map-ghost" 不在地图索引',
    )
    const files = lbProjectFiles({ scenes })
    files['content/maps/index.json'] = {
      version: 1,
      maps: [{ id: 'map-ghost', name: '登记地图', path: 'content/maps/map-001.json' }],
    }
    const green = await loadCurrentProjectFrom(lbMemorySource(files))
    expect(green.entryScene.mapId).toBe('map-ghost')
  })

  test('惰性场景 mapId 悬空精确拒绝，登记同一 mapId 后加载成功', async () => {
    const marker = 'C2-lazy-map-reference'
    const files = lbProjectFiles({
      extraSceneIds: ['s002'],
      scenes: { s002: { body: lbSceneWithHookCommands('s002', 'map-ghost', []) } },
    })
    const project = await loadCurrentProjectFrom(lbMemorySource(files))
    const red = await rejectOf(loadAuthorScene(project, 's002'))
    expect(red.kind, marker).toBe('rejected')
    expect(red.message, marker).toContain(
      'content/scenes/s002.json: mapId "map-ghost" 不在地图索引',
    )
    files['content/maps/index.json'] = {
      version: 1,
      maps: [
        { id: 'map-001', name: '入口地图', path: 'content/maps/map-001.json' },
        { id: 'map-ghost', name: '登记地图', path: 'content/maps/map-ghost.json' },
      ],
    }
    const restored = await loadCurrentProjectFrom(lbMemorySource(files))
    await expect(loadAuthorScene(restored, 's002')).resolves.toMatchObject({
      id: 's002',
      mapId: 'map-ghost',
    })
  })
})

const conditionArms = [
  {
    axis: 'actor',
    actor: 'actor.ghost',
    poison: 7,
    suffix: '.actor: 角色 "actor.ghost" 不在 actors',
  },
  {
    axis: 'poison',
    actor: 'actor.hero',
    poison: 9,
    suffix: '.condition.poisonId: 毒 9 不在 poisons',
  },
]

describe('C3 入口场景条件引用接线', () => {
  test.each(conditionArms)('入口 $axis 引用悬空精确拒绝，闭合同链绿', async ({
    axis,
    actor,
    poison,
    suffix,
  }) => {
    const marker = `C3-scene-${axis}`
    const scene = (commandActor: string, poisonId: number) => ({
      s001: {
        body: lbSceneWithHookCommands('s001', 'map-001', [
          lbApplyCondition(commandActor, poisonId),
        ]),
      },
    })
    const red = await rejectOf(
      loadCurrentProjectFrom(
        lbMemorySource(
          lbProjectFiles({
            poisons: [lbPoison(7)],
            scenes: scene(actor, poison),
          }),
        ),
      ),
    )
    expect(red.kind, marker).toBe('rejected')
    expect(red.message, marker).toContain(
      `manifest.entryPoints[new-game].scene(s001).hooks.onEnter.variants.main.flow.stages[0].body[0]${suffix}`,
    )
    const green = await loadCurrentProjectFrom(
      lbMemorySource(
        lbProjectFiles({
          poisons: [lbPoison(7)],
          scenes: scene('actor.hero', 7),
        }),
      ),
    )
    const flow = green.authorContent.entryScene.hooks?.onEnter?.variants.main?.flow
    expect(flow && flow.kind === 'stages' ? flow.stages[0]?.body : undefined).toEqual([
      lbApplyCondition('actor.hero', 7),
    ])
  })
})

describe('C4 item-private 使用脚本条件接线', () => {
  test('item 脚本 actor 引用悬空精确拒绝，闭合同链绿', async () => {
    const marker = 'C4-item-condition'
    const files = (actor: string) =>
      lbProjectFiles({
        poisons: [lbPoison(7)],
        items: [lbPrivateScriptItem('talisman', [lbApplyCondition(actor, 7)])],
      })
    const red = await rejectOf(loadCurrentProjectFrom(lbMemorySource(files('actor.ghost'))))
    expect(red.kind, marker).toBe('rejected')
    expect(red.message, marker).toContain(
      'items[0].use.effects[0].script.body[0].actor: 角色 "actor.ghost" 不在 actors',
    )
    const green = await loadCurrentProjectFrom(lbMemorySource(files('actor.hero')))
    expect(green.items.talisman?.use?.effects[0]).toEqual({
      kind: 'itemPrivateScript',
      script: { id: 'use', label: '使用', body: [lbApplyCondition('actor.hero', 7)] },
    })
  })
})

describe('C6 sharedScripts 条件接线', () => {
  test.each(conditionArms)('shared $axis 引用悬空精确拒绝，闭合同链绿', async ({
    axis,
    actor,
    poison,
    suffix,
  }) => {
    const marker = `C6-shared-${axis}`
    const files = (commandActor: string, poisonId: number) =>
      lbProjectFiles({
        poisons: [lbPoison(7)],
        sharedScripts: {
          talisman: {
            name: 'Talisman',
            self: 'none',
            body: [lbApplyCondition(commandActor, poisonId)],
          },
        },
      })
    const red = await rejectOf(loadCurrentProjectFrom(lbMemorySource(files(actor, poison))))
    expect(red.kind, marker).toBe('rejected')
    expect(red.message, marker).toContain(`sharedScripts.talisman.body[0]${suffix}`)
    const green = await loadCurrentProjectFrom(lbMemorySource(files('actor.hero', 7)))
    expect(green.sharedScripts.talisman?.body[0]).toEqual(lbApplyCondition('actor.hero', 7))
  })
})

describe('C7 装备战斗精灵引用接线', () => {
  test('悬空 battle sprite 后置接线拒收，补登记同链绿', async () => {
    const marker = 'C7-equip-battle-sprite'
    const items = [
      {
        id: 'sword-1',
        name: 'item.sword-1',
        desc: [],
        buyPrice: 100,
        sellPrice: 50,
        sellable: true,
        equip: {
          slot: 'weapon',
          equipableBy: ['actor.hero'],
          effects: [{ kind: 'battleSprite', byActor: { 'actor.hero': 'bs.ghost' } }],
        },
      },
    ]
    const red = await rejectOf(
      loadCurrentProjectFrom(
        lbMemorySource(
          lbProjectFiles({
            items,
            battleSprites: [lbBattleSprite('bs.hero', 'battle.hero')],
          }),
        ),
      ),
    )
    expect(red.kind, marker).toBe('rejected')
    expect(red.message, marker).toContain(
      'items[0](sword-1).equip.effects[0].byActor.actor.hero: 战斗精灵 "bs.ghost" 不在 battleSprites 注册表',
    )
    const green = await loadCurrentProjectFrom(
      lbMemorySource(
        lbProjectFiles({
          items,
          battleSprites: [
            lbBattleSprite('bs.hero', 'battle.hero'),
            lbBattleSprite('bs.ghost', 'battle.hero'),
          ],
        }),
      ),
    )
    expect(green.battleSpritesById['bs.ghost']).toBeDefined()
    expect(green.items['sword-1']?.equip?.effects[0]).toEqual({
      kind: 'battleSprite',
      byActor: { 'actor.hero': 'bs.ghost' },
    })
  })
})
