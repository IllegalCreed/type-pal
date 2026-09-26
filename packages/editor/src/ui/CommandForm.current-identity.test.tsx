// @vitest-environment jsdom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { choose, click, commandForm, row } from './__tests__/command-form-current-fixture.js'

describe('Current command actor appearance', () => {
  test('actor and sprite selectors commit stable identities rather than display labels', async () => {
    const f = await commandForm({ kind: 'setActorSprite', actor: 'hero', sprite: 'hero' })
    await choose('角色', '队员2')
    await choose('大世界精灵', '备用精灵')
    await f.finish({ kind: 'setActorSprite', actor: 'ally-2', sprite: 'alternate' })
  })
  test('adding an appearance override and then clearing it preserves the other override', async () => {
    const f = await commandForm({
      kind: 'setActorAppearance',
      actor: 'hero',
      battleSprite: 'starter-fighter',
    })
    await choose('大世界精灵', '备用精灵')
    await click('不修改')
    await choose('角色', '队员2')
    await f.finish({
      kind: 'setActorAppearance',
      actor: 'ally-2',
      battleSprite: 'starter-fighter',
      spriteId: undefined,
    })
  })
  test('battle appearance can be cleared while world sprite remains explicit', async () => {
    const f = await commandForm({
      kind: 'setActorAppearance',
      actor: 'hero',
      spriteId: 'hero',
      battleSprite: 'starter-fighter',
    })
    await click('打开战斗精灵 starter-fighter')
    expect(f.onOpenBattleSprite).toHaveBeenCalledExactlyOnceWith('starter-fighter')
    await choose('战斗形象', '（不改战斗形象）')
    await f.finish({
      kind: 'setActorAppearance',
      actor: 'hero',
      spriteId: 'hero',
      battleSprite: undefined,
    })
  })
  test('appearance profile picker accepts only player fighter definitions', async () => {
    const f = await commandForm({ kind: 'setActorAppearance', actor: 'hero', spriteId: 'hero' })
    const picker = row('战斗形象').querySelector<HTMLButtonElement>('[role="combobox"]')
    if (!picker) throw new Error('missing appearance picker')
    await act(async () => picker.click())
    const options = [...document.querySelectorAll('[role="option"]')].map((e) => e.textContent)
    expect(options.some((text) => text?.includes('starter-fighter'))).toBe(true)
    expect(options.some((text) => text?.includes('dummy-fighter'))).toBe(false)
    expect(f.context.battleSprites.some((definition) => definition.id === 'dummy-fighter')).toBe(
      true,
    )
    await choose('战斗形象', '占位主角战斗形象')
    await f.finish({
      kind: 'setActorAppearance',
      actor: 'hero',
      spriteId: 'hero',
      battleSprite: 'starter-fighter',
    })
  })
})
