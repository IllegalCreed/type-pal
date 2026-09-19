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

describe('A1 unbound 直连肖像臂（先过现行 cue 守卫）', () => {
  test('合法 unbound cue → 精确 AssetId 肖像引用（where/kind 完整）', () => {
    const cue = unboundCue()
    expect(() => checkAuthorDialogueCue(cue, 'c')).not.toThrow() // 守卫自证
    const references = commandAssetTaggedReferencesAtNode({ kind: 'dialog', cue }, 'root.body[0]')
    expect(references).toEqual([
      {
        asset: 'portrait.hero',
        expectedKind: 'portrait',
        where: 'root.body[0].cue.identity.portrait.asset',
      },
    ])
  })
  test('非 dialog 命令/unbound 缺 portrait/asset 非字符串 → 不产出肖像边；输入不变', () => {
    const cue = unboundCue()
    const snapshot = deepSnapshot(cue)
    expect(commandAssetTaggedReferencesAtNode({ kind: 'wait', ms: 5 }, 'w')).toEqual([])
    const noPortrait = { identity: { kind: 'unbound' }, rows: cue.rows } as never
    expect(commandAssetTaggedReferencesAtNode({ kind: 'dialog', cue: noPortrait }, 'x')).toEqual([])
    const badAsset = {
      identity: { kind: 'unbound', portrait: { asset: 42, side: 'left' } },
      rows: cue.rows,
    } as never
    expect(commandAssetTaggedReferencesAtNode({ kind: 'dialog', cue: badAsset }, 'x')).toEqual([])
    expect(cue).toEqual(snapshot) // 实际传入对象不变
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
