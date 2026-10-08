/**
 * TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1 C2/C3/C4/C6/C7：loader 独立跨表引用接线。
 *
 * 每条红都确认到达目标校验（mapAssetById / validateActorConditionCommandReferences /
 * validateEquipBattleSpriteReferences）而非更早 schema 门：场景/物品/脚本/装备输入本身
 * 全部 schema 合法，只坏目标引用边；同输入补登记后整链绿（正对照）。
 * 与 content 局部 validator 旧测的差异：这里走 loadCurrentProjectFrom 公开 IO 入口，
 * where 形态是 loader 自己的 path 前缀（items[0].… / items[0](id).… 不抄局部断言）。
 * 红断言统一 phase+message 双锚（同一 marker），变异下落成可判别的 AssertionError。
 */
import { describe, expect, test } from 'vitest'
import {
  lbApplyCondition,
  lbBattleSprite,
  lbClearCondition,
  lbMemorySource,
  lbPoison,
  lbPrivateScriptItem,
  lbProjectFiles,
  lbSceneWithHookCommands,
} from './__tests__/project-loading-boundaries/fixture.js'
import type { LoadedCurrentProject } from './project-loader.js'
import { loadAuthorScene, loadCurrentProjectFrom } from './project-loader.js'

type Rejection = { kind: 'resolved' | 'rejected'; message: string }

async function rejectOf(promise: Promise<unknown>): Promise<Rejection> {
  return promise.then(
    () => ({ kind: 'resolved' as const, message: '' }),
    (error: unknown) => ({
      kind: 'rejected' as const,
      message: error instanceof Error ? error.message : String(error),
    }),
  )
}

describe('C2 场景 mapId 引用接线', () => {
  test('mapId 悬空：入口装配与惰性 scene 都在地图索引精确拒绝；登记 mapId 同链绿', async () => {
    const marker = 'C2-map-reference'
    // 入口场景 s001 本身 mapId 悬空：schema 全绿，红必须到达 validateAuthorScene 的地图索引校验
    const entryFiles = lbProjectFiles({
      scenes: { s001: { body: lbSceneWithHookCommands('s001', 'map-ghost', []) } },
    })
    const entry = await rejectOf(loadCurrentProjectFrom(lbMemorySource(entryFiles)))
    expect(entry.kind, marker).toBe('rejected')
    expect(entry.message, marker).toContain(
      'manifest.entryPoints[new-game].scene(s001): mapId "map-ghost" 不在地图索引',
    )
    // 惰性场景 s002 mapId 悬空：工程本体绿，loadAuthorScene 在 indexed path 精确拒绝
    const lazyFiles = lbProjectFiles({
      extraSceneIds: ['s002'],
      scenes: { s002: { body: lbSceneWithHookCommands('s002', 'map-ghost', []) } },
    })
    const project = await loadCurrentProjectFrom(lbMemorySource(lazyFiles))
    const lazy = await rejectOf(loadAuthorScene(project, 's002'))
    expect(lazy.kind, marker).toBe('rejected')
    expect(lazy.message, marker).toContain(
      'content/scenes/s002.json: mapId "map-ghost" 不在地图索引',
    )
    // 正对照：登记 mapId 的同构场景链路绿
    await expect(loadAuthorScene(project, 's001')).resolves.toMatchObject({ id: 's001' })
  })
})

describe('C3 入口场景条件引用接线', () => {
  test('apply 条件缺 actor / 缺毒分别被入口场景路径拒收；合法 actor+毒同链绿', async () => {
    const marker = 'C3-scene-condition'
    // 只坏 actor 边：actor.ghost 不在 actors，毒 7 已登记
    const actorArm = await rejectOf(
      loadCurrentProjectFrom(
        lbMemorySource(
          lbProjectFiles({
            poisons: [lbPoison(7)],
            scenes: {
              s001: {
                body: lbSceneWithHookCommands('s001', 'map-001', [
                  lbApplyCondition('actor.ghost', 7),
                ]),
              },
            },
          }),
        ),
      ),
    )
    expect(actorArm.kind, marker).toBe('rejected')
    expect(actorArm.message, marker).toContain(
      'manifest.entryPoints[new-game].scene(s001).hooks.onEnter.variants.main.flow.stages[0].body[0].actor: 角色 "actor.ghost" 不在 actors',
    )
    // 只坏毒边：actor.hero 在 actors 且有 battler，毒 9 未登记
    const poisonArm = await rejectOf(
      loadCurrentProjectFrom(
        lbMemorySource(
          lbProjectFiles({
            poisons: [lbPoison(7)],
            scenes: {
              s001: {
                body: lbSceneWithHookCommands('s001', 'map-001', [
                  lbApplyCondition('actor.hero', 9),
                ]),
              },
            },
          }),
        ),
      ),
    )
    expect(poisonArm.kind, marker).toBe('rejected')
    expect(poisonArm.message, marker).toContain(
      'manifest.entryPoints[new-game].scene(s001).hooks.onEnter.variants.main.flow.stages[0].body[0].condition.poisonId: 毒 9 不在 poisons',
    )
    // 正对照：apply+clear 都闭合 → 工程绿且 author 正文保真
    const okProject = await loadCurrentProjectFrom(
      lbMemorySource(
        lbProjectFiles({
          poisons: [lbPoison(7)],
          scenes: {
            s001: {
              body: lbSceneWithHookCommands('s001', 'map-001', [
                lbApplyCondition('actor.hero', 7),
                lbClearCondition('actor.hero'),
              ]),
            },
          },
        }),
      ),
    )
    const flow = okProject.authorContent.entryScene.hooks?.onEnter?.variants.main?.flow
    const stageBody = flow && flow.kind === 'stages' ? flow.stages[0]?.body : undefined
    expect(stageBody).toEqual([lbApplyCondition('actor.hero', 7), lbClearCondition('actor.hero')])
  })
})

describe('C4 item-private 使用脚本条件接线', () => {
  test('合法 item 脚本过结构校验后，条件引用不闭合由 items 精确路径拒收；闭合即绿', async () => {
    const marker = 'C4-item-condition'
    // item 本身 schema 合法（itemPrivateScript body 过 checkBaseAuthorCommands），只坏 actor 边
    const red = await rejectOf(
      loadCurrentProjectFrom(
        lbMemorySource(
          lbProjectFiles({
            poisons: [lbPoison(7)],
            items: [lbPrivateScriptItem('talisman', [lbApplyCondition('actor.ghost', 7)])],
          }),
        ),
      ),
    )
    expect(red.kind, marker).toBe('rejected')
    expect(red.message, marker).toContain(
      'items[0].use.effects[0].script.body[0].actor: 角色 "actor.ghost" 不在 actors',
    )
    // 正对照：同输入换闭合 actor → 工程绿，运行时投影保真携带私有脚本
    const okProject: LoadedCurrentProject = await loadCurrentProjectFrom(
      lbMemorySource(
        lbProjectFiles({
          poisons: [lbPoison(7)],
          items: [lbPrivateScriptItem('talisman', [lbApplyCondition('actor.hero', 7)])],
        }),
      ),
    )
    expect(okProject.items.talisman?.use?.effects[0]).toEqual({
      kind: 'itemPrivateScript',
      script: { id: 'use', label: '使用', body: [lbApplyCondition('actor.hero', 7)] },
    })
  })
})

describe('C6 sharedScripts 条件接线', () => {
  test('shared 脚本 actor/poison 条件经实际组装拒收；合法链绿且运行时库保真', async () => {
    const marker = 'C6-shared-condition'
    const sharedBody = (actor: string, poisonId: number) => ({
      talisman: { name: 'Talisman', self: 'none', body: [lbApplyCondition(actor, poisonId)] },
    })
    // 只坏 actor 边（毒 7 已登记）；与旧 dialog 缺表情合同不同轴：本树无任何 dialog
    const actorArm = await rejectOf(
      loadCurrentProjectFrom(
        lbMemorySource(
          lbProjectFiles({ poisons: [lbPoison(7)], sharedScripts: sharedBody('actor.ghost', 7) }),
        ),
      ),
    )
    expect(actorArm.kind, marker).toBe('rejected')
    expect(actorArm.message, marker).toContain(
      'sharedScripts.talisman.body[0].actor: 角色 "actor.ghost" 不在 actors',
    )
    // 只坏毒边：actor.hero 有 battler，毒 9 未登记
    const poisonArm = await rejectOf(
      loadCurrentProjectFrom(
        lbMemorySource(
          lbProjectFiles({ poisons: [lbPoison(7)], sharedScripts: sharedBody('actor.hero', 9) }),
        ),
      ),
    )
    expect(poisonArm.kind, marker).toBe('rejected')
    expect(poisonArm.message, marker).toContain(
      'sharedScripts.talisman.body[0].condition.poisonId: 毒 9 不在 poisons',
    )
    // 正对照
    const okProject = await loadCurrentProjectFrom(
      lbMemorySource(
        lbProjectFiles({
          poisons: [lbPoison(7)],
          sharedScripts: sharedBody('actor.hero', 7),
        }),
      ),
    )
    expect(okProject.sharedScripts.talisman?.body[0]).toEqual(lbApplyCondition('actor.hero', 7))
  })
})

describe('C7 装备战斗精灵引用接线', () => {
  test('合法 item/actor/equip 过前置门后，悬空 battle sprite 在组装后置接线拒收；补登记即绿', async () => {
    const marker = 'C7-equip-battle-sprite'
    const equipItem = (battleSprite: string) => ({
      id: 'sword-1',
      name: 'item.sword-1',
      desc: [],
      buyPrice: 100,
      sellPrice: 50,
      sellable: true,
      equip: {
        slot: 'weapon',
        equipableBy: ['actor.hero'],
        effects: [{ kind: 'battleSprite', byActor: { 'actor.hero': battleSprite } }],
      },
    })
    // 前置门全绿：actor.hero 有 battler 且在 equipableBy，equip 形状合法，battleSprites 表本身合法；
    // 只有 byActor 指到的 bs.ghost 不在注册表
    const red = await rejectOf(
      loadCurrentProjectFrom(
        lbMemorySource(
          lbProjectFiles({
            battleSprites: [lbBattleSprite('bs.hero', 'battle.hero')],
            items: [equipItem('bs.ghost')],
          }),
        ),
      ),
    )
    expect(red.kind, marker).toBe('rejected')
    expect(red.message, marker).toContain(
      'items[0](sword-1).equip.effects[0].byActor.actor.hero: 战斗精灵 "bs.ghost" 不在 battleSprites 注册表',
    )
    // 正对照：同输入补登记 bs.ghost → 整链绿，装备边与注册表都保真
    const okProject = await loadCurrentProjectFrom(
      lbMemorySource(
        lbProjectFiles({
          battleSprites: [
            lbBattleSprite('bs.hero', 'battle.hero'),
            lbBattleSprite('bs.ghost', 'battle.hero'),
          ],
          items: [equipItem('bs.ghost')],
        }),
      ),
    )
    expect(okProject.battleSpritesById['bs.ghost']).toBeDefined()
    expect(okProject.items['sword-1']?.equip?.effects[0]).toEqual({
      kind: 'battleSprite',
      byActor: { 'actor.hero': 'bs.ghost' },
    })
  })
})
