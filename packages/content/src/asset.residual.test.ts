/**
 * TEST-CONTENT-RESIDUAL-1 A1/A2：资产侧残项（asset.ts）。
 * A1：commandAssetTaggedReferencesAtNode 的 unbound 直连肖像臂（r2 订正函数名；先过
 * checkAuthorDialogueCue 守卫）；A2：palBattleSpriteAssetId 合法参数轴（真实 caller 在
 * migrate/pal-battle-sprites.ts:53/63/116，本包只核参数域不造类型域外 channel）。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-residual-fixtures.js'
import { commandAssetTaggedReferencesAtNode, palBattleSpriteAssetId } from './asset.js'
import { type AuthorDialogueCue, checkAuthorDialogueCue } from './author-dialogue.js'

const unboundCue = (): AuthorDialogueCue => ({
  identity: { kind: 'unbound', portrait: { asset: 'portrait.hero', side: 'left' } },
  rows: [{ text: '旁白立绘' }],
})

describe('A1 unbound 直连肖像臂（先过现行 cue 守卫；实际入参保真）', () => {
  test('合法 unbound cue → 精确 AssetId 肖像引用（where/kind 完整）；扫描后实际 cue 不变', () => {
    const cue = unboundCue()
    expect(() => checkAuthorDialogueCue(cue, 'c')).not.toThrow() // 守卫自证
    const command = { kind: 'dialog', cue }
    const before = deepSnapshot(command) // 快照真正传入扫描器的对象
    const references = commandAssetTaggedReferencesAtNode(command, 'root.body[0]')
    expect(references).toEqual([
      {
        asset: 'portrait.hero',
        expectedKind: 'portrait',
        where: 'root.body[0].cue.identity.portrait.asset',
      },
    ])
    expect(command).toEqual(before) // 消费后同一对象逐值不变（portrait.side/asset 等嵌套域）
  })
  test('非 dialog 命令/unbound 缺 portrait → 不产出肖像边；实际传入对象不变（非字符串 asset 为防御轴）', () => {
    const wait = { kind: 'wait', ms: 5 }
    const waitSnapshot = deepSnapshot(wait)
    expect(commandAssetTaggedReferencesAtNode(wait, 'w')).toEqual([])
    expect(wait).toEqual(waitSnapshot)
    const noPortrait: AuthorDialogueCue = {
      identity: { kind: 'unbound', speaker: '旁白' },
      rows: [{ text: '无肖像' }],
    }
    checkAuthorDialogueCue(noPortrait, 'noPortrait')
    const noPortraitCommand = { kind: 'dialog', cue: noPortrait }
    const noPortraitSnapshot = deepSnapshot(noPortraitCommand)
    expect(commandAssetTaggedReferencesAtNode(noPortraitCommand, 'x')).toEqual([])
    expect(noPortraitCommand).toEqual(noPortraitSnapshot)
    const badAsset = {
      identity: { kind: 'unbound', portrait: { asset: 42, side: 'left' } },
      rows: [{ text: '防御输入' }],
    }
    expect(() => checkAuthorDialogueCue(badAsset, 'badAsset')).toThrow()
    const badCommand = { kind: 'dialog', cue: badAsset }
    const badSnapshot = deepSnapshot(badCommand)
    expect(commandAssetTaggedReferencesAtNode(badCommand, 'x')).toEqual([])
    expect(badCommand).toEqual(badSnapshot) // 防御轴同样比较真实被消费对象，不冒称合法cue
  })
})

describe('A2 palBattleSpriteAssetId 参数域（channel 是身份一部分）', () => {
  test('player 0 合法/enemy 最小 1；正数与三位零填充格式；越界与错型精确拒绝', () => {
    expect(palBattleSpriteAssetId('player', 0)).toBe('battle-sprite.pal.player.000')
    expect(palBattleSpriteAssetId('player', 7)).toBe('battle-sprite.pal.player.007')
    expect(palBattleSpriteAssetId('enemy', 1)).toBe('battle-sprite.pal.enemy.001')
    expect(palBattleSpriteAssetId('enemy', 123)).toBe('battle-sprite.pal.enemy.123')
    expect(() => palBattleSpriteAssetId('enemy', 0)).toThrow(
      'PAL enemy 战斗精灵号必须是 正整数，收到 0',
    )
    expect(() => palBattleSpriteAssetId('player', -1)).toThrow(
      'PAL player 战斗精灵号必须是 非负整数，收到 -1',
    )
    expect(() => palBattleSpriteAssetId('player', 1.5)).toThrow(
      'PAL player 战斗精灵号必须是 非负整数，收到 1.5',
    )
  })
})
