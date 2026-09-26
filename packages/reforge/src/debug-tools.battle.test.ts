// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
import {
  button,
  cleanupDebug,
  debugHarness,
  drain,
  element,
  field,
  selectActor,
  status,
} from './__tests__/debug-tools-fixtures.js'
import { projectData } from './__tests__/runtime-shell/project.js'

afterEach(cleanupDebug)
describe('Debug battle request construction', () => {
  test('empty party and absent team are rejected before preset allocation', async () => {
    const h = await debugHarness({ noTeams: true })
    button('⚔ 开战').click()
    expect(status()).toContain('至少选择一名')
    selectActor()
    button('⚔ 开战').click()
    expect(status()).toContain('请选择敌队')
    expect(h.startBattle).not.toHaveBeenCalled()
    expect(h.buildPreset).not.toHaveBeenCalled()
  })
  test('existing team uses real preset construction without changing live world or project', async () => {
    const h = await debugHarness(),
      before = structuredClone(h.world)
    selectActor('hero')
    selectActor('friend')
    field('hero HP').value = '0'
    field('hero MP').value = '17'
    button('⚔ 开战').click()
    await drain()
    expect(h.buildPreset).toHaveBeenCalledExactlyOnceWith(['hero', 'friend'], {
      hero: { hp: 0, mp: 17 },
      friend: {},
    })
    const preset = h.startBattle.mock.calls[0]![0].partyPreset!
    expect(h.startBattle.mock.calls[0]?.[0]).toEqual({
      enemyTeamId: 'team',
      fieldId: 7,
      partyPreset: preset,
    })
    expect(preset.party.map((c) => [c.id, c.hp, c.mp])).toEqual([
      ['hero', 0, 17],
      ['friend', 80, 30],
    ])
    expect(status()).toBe('战斗结束: victory（世界已恢复战前）')
    expect(h.world).toEqual(before)
    expect(projectData(h.project)).toEqual(h.projectBefore)
  })
  test('overrides apply only to the selected generated member and parse each free-form boundary', async () => {
    const h = await debugHarness(),
      before = structuredClone(h.world)
    selectActor('hero')
    selectActor('friend')
    field('hero 等级').value = '12'
    field('hero 装备').value = ' hand = tonic ,broken,feet=elixir,=orphan'
    field('hero 状态').value = 'protect,invalid,haste'
    field('hero 中毒').value = '1,Infinity,bad,3'
    field('道具预设').value = 'tonic×2, elixir, tonic×bad, ×7, ,elixir×0'
    button('⚔ 开战').click()
    await drain()
    const preset = h.startBattle.mock.calls[0]![0].partyPreset!
    const expected = structuredClone(before.party)
    expected[0]!.level = 12
    expected[0]!.equipment = { hand: 'tonic', feet: 'elixir' }
    expected[0]!.extraStatuses = [
      { status: 'protect', turns: 7 },
      { status: 'haste', turns: 7 },
    ]
    expected[0]!.poisons = [
      { poisonId: 1, tickIndex: 0 },
      { poisonId: 3, tickIndex: 0 },
    ]
    expect(preset).toEqual({
      party: expected,
      learnedSkills: before.learnedSkills,
      inventory: [
        { itemId: 'tonic', count: 2 },
        { itemId: 'elixir', count: 5 },
        { itemId: 'tonic', count: 5 },
        { itemId: 'elixir', count: 0 },
      ],
    })
    expect(h.world).toEqual(before)
    // These text fields are parsing contracts, not proof that arbitrary equipment/poison IDs are game-valid.
  })
  test('template identity resolves overridden instance when preset owner allocates a distinct instance id', async () => {
    const h = await debugHarness()
    const base = structuredClone({ party: h.world.party, learnedSkills: h.world.learnedSkills })
    base.party[0]!.id = 'hero-instance'
    const expected = structuredClone(base)
    expected.party[0]!.level = 8
    h.buildPreset.mockImplementation(() => structuredClone(base))
    selectActor('hero')
    field('hero 等级').value = '8'
    button('⚔ 开战').click()
    await drain()
    expect(h.startBattle.mock.calls[0]![0].partyPreset).toEqual(expected)
    expect(base.party[0]!.level).toBe(1)
  })
  test('custom enemy selection preserves registration order and no-field project omits fieldId', async () => {
    const h = await debugHarness({ noFields: true })
    selectActor()
    element<HTMLInputElement>('#tp-debug-enemy-custom').click()
    element<HTMLInputElement>('input[value="slime"]').click()
    expect(element<HTMLSelectElement>('[aria-label="现成敌队"]').disabled).toBe(true)
    button('⚔ 开战').click()
    await drain()
    const request = h.startBattle.mock.calls[0]![0]
    expect(request).toEqual({
      enemyTeamId: 'debug-custom',
      enemyOverride: ['slime'],
      partyPreset: h.buildPreset.mock.results[0]!.value,
    })
    expect(Object.hasOwn(request, 'fieldId')).toBe(false)
  })
  test('clear form removes per-member overrides and restores existing-team mode', async () => {
    await debugHarness()
    selectActor()
    field('hero HP').value = '7'
    field('道具预设').value = 'tonic×2'
    element<HTMLInputElement>('#tp-debug-enemy-custom').click()
    element<HTMLInputElement>('input[value="slime"]').click()
    button('清空表单').click()
    expect(document.querySelectorAll('.tpd-member-row')).toHaveLength(0)
    expect(field('道具预设').value).toBe('')
    expect(
      [...document.querySelectorAll<HTMLInputElement>('.tpd-option input')].every(
        (c) => !c.checked,
      ),
    ).toBe(true)
    expect(element<HTMLInputElement>('#tp-debug-enemy-team').checked).toBe(true)
    expect(element<HTMLSelectElement>('[aria-label="现成敌队"]').disabled).toBe(false)
    selectActor()
    expect(field('hero HP').value).toBe('')
  })
  test('battle failure reports error and dispose cancels only a pending battle signal', async () => {
    const h = await debugHarness()
    h.startBattle.mockRejectedValueOnce(new Error('rejected battle'))
    selectActor()
    button('⚔ 开战').click()
    await drain()
    expect(status()).toContain('rejected battle')
    const settledSignal = h.startBattle.mock.calls[0]![1]
    let finish!: () => void
    h.startBattle.mockImplementationOnce(
      (_request, signal) =>
        new Promise((resolve) => {
          finish = () => resolve('terminated')
          signal.addEventListener('abort', finish, { once: true })
        }),
    )
    button('⚔ 开战').click()
    const pendingSignal = h.startBattle.mock.calls[1]![1]
    try {
      h.dispose()
      await drain()
      expect(pendingSignal.aborted).toBe(true)
      expect(settledSignal.aborted).toBe(false)
    } finally {
      finish()
      await drain()
    }
  })
})
