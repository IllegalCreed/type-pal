/** TEST-GLM-WAVE-O-1 O08：世界物品用途 preflight 拒绝轴与资产 catalog 残余合同。
 *  旧证：item.*.test.ts 覆盖执行效果；asset.contracts 覆盖 catalog 正控；本卡按 gap-map
 *  直击未覆盖臂：preflight unknown-item/wrong-context/not-owned/missing-target 精确 reason、
 *  validateAssetCatalog kind 域与 origin 前缀轴、resolveWorldItemUse 透传 preflight。
 */
import { describe, expect, test } from 'vitest'
import type { ItemData, ItemDataMap } from '@type-pal/content'
import { resolveWorldItemUse } from './item.js'
import { validateAssetCatalog } from './asset.js'

const world = () =>
  ({
    party: [
      {
        id: 'hero',
        template: 'hero',
        level: 1,
        hp: 80,
        maxHP: 100,
        mp: 20,
        maxMP: 30,
        attack: 10,
        defense: 10,
        magicAttack: 10,
        speed: 10,
        luck: 10,
        equipment: {},
        tags: [],
        poisons: [],
        extraStatuses: [],
      },
    ],
    learnedSkills: {},
    money: 100,
    inventory: [{ itemId: 'herb', count: 2 }],
  }) as never

const useItem = (over: Record<string, unknown>): ItemData =>
  ({
    id: 'herb',
    name: '草药',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    ...over,
  }) as ItemData

const healUse = {
  target: 'oneAlly',
  consuming: true,
  effects: [{ kind: 'healHp', amount: 30 }],
}

describe('O08 preflightWorldItemUse（经 resolveWorldItemUse 透传）：reason 轴', () => {
  test('unknown-item：物品不存在或无 use', () => {
    const outcome = resolveWorldItemUse(world(), 'hero', 'ghost', {} as ItemDataMap)
    expect(outcome).toMatchObject({ status: 'failure', reason: 'unknown-item', consumed: false })
  })

  test('wrong-context：battleOnly 用途不进世界执行器', () => {
    const items: ItemDataMap = {
      herb: useItem({ use: { ...healUse, battleOnly: true } }),
    }
    const outcome = resolveWorldItemUse(world(), 'hero', 'herb', items)
    expect(outcome).toMatchObject({ status: 'failure', reason: 'wrong-context' })
  })

  test('not-owned：背包与装备均无该物品', () => {
    const items: ItemDataMap = { herb: useItem({ use: healUse }) }
    const w = world()
    ;(w as { inventory: unknown }).inventory = [{ itemId: 'other', count: 1 }]
    const outcome = resolveWorldItemUse(w, 'hero', 'herb', items)
    expect(outcome).toMatchObject({ status: 'failure', reason: 'not-owned' })
  })

  test('missing-target：needsTarget 且指定目标不在 party', () => {
    const items: ItemDataMap = { herb: useItem({ use: healUse }) }
    const outcome = resolveWorldItemUse(world(), 'ghost', 'herb', items)
    expect(outcome).toMatchObject({ status: 'failure', reason: 'missing-target' })
  })

  test('allAllies 目标不需要 party 命中（走执行）', () => {
    const items: ItemDataMap = {
      herb: useItem({
        use: {
          target: 'allAllies',
          consuming: true,
          effects: [{ kind: 'healHp', amount: 5 }],
        },
      }),
    }
    const outcome = resolveWorldItemUse(world(), 'hero', 'herb', items)
    expect(outcome.reason).not.toBe('missing-target')
  })
})

describe('O09 validateAssetCatalog：kind/origin/路径轴', () => {
  const record = (over: Record<string, unknown>): Record<string, unknown> => ({
    kind: 'sprite',
    path: 'assets/generated/x.png',
    mediaType: 'image/png',
    bytes: 16,
    sha256: 'a'.repeat(64),
    origin: { kind: 'generated' },
    ...over,
  })
  const catalog = (assets: Record<string, unknown>) => ({ version: 1, assets })

  test('非法 kind / 非法 sha 逐轴拒绝', () => {
    expect(() =>
      validateAssetCatalog(catalog({ a: record({ kind: 'not-a-kind' }) })),
    ).toThrow('assets/index.json.assets["a"].kind: 非法 AssetKind')
    expect(() => validateAssetCatalog(catalog({ a: record({ sha256: 'xyz' }) }))).toThrow(
      /sha256/,
    )
  })

  test('origin legacy-migrated 前缀不符拒绝；authored 前缀合法', () => {
    expect(() =>
      validateAssetCatalog(
        catalog({ a: record({ path: 'assets/generated/x.png', origin: { kind: 'legacy-migrated', ref: 'x' } }) }),
      ),
    ).toThrow(/legacy-migrated 资源必须位于 assets\/migrated\//)
    expect(() =>
      validateAssetCatalog(
        catalog({
          a: record({ path: 'assets/authored/x.png', origin: { kind: 'authored' } }),
        }),
      ),
    ).not.toThrow()
  })

  test('版本漂移拒绝', () => {
    expect(() => validateAssetCatalog({ version: 2, assets: {} })).toThrow(/version/)
  })
})
