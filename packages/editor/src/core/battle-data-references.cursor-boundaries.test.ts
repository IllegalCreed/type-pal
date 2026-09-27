/**
 * TEST-CURSOR-PURE-WAVE-1 C02：trial-sword grantSkill 走正式保存门后的技能引用。
 * 初始仙术 / 升级 / 敌人施法见 battle-data-references.test.ts。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, saveGatedGrantSkillProject } from './__tests__/cursor-pure-fixtures.js'
import { collectBattleDataReferences } from './battle-data-references.js'

describe('C02 battle-data-references 剩余合同', () => {
  test('保存门后 trial-sword grantSkill 指向 trial-spark，trial-herb 无授予边', async () => {
    const { state } = await saveGatedGrantSkillProject()
    const itemsSnap = inputSnap(state.items)
    const refs = collectBattleDataReferences(state, 'skill')
    expect(state.items).toEqual(itemsSnap)
    expect(refs).toEqual([
      {
        target: 'skill',
        targetId: 'trial-spark',
        kind: 'item-grant-skill',
        label: '物品 trial.sword',
        where: 'items[1](trial-sword).equip.effects[1].skillId',
        detail: '装备后授予技能',
        locator: { kind: 'item', itemId: 'trial-sword' },
      },
    ])
    expect(
      refs.some(
        (reference) =>
          reference.kind === 'item-grant-skill' &&
          reference.locator?.kind === 'item' &&
          reference.locator.itemId === 'trial-herb',
      ),
    ).toBe(false)
  })
})
