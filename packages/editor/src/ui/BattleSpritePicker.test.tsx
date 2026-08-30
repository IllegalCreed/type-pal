// @vitest-environment jsdom
import type { BattleSpriteDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { BattleSpritePicker } from './BattleSpritePicker.js'

const definition: BattleSpriteDef = {
  id: 'battle.player.test',
  label: '测试战斗精灵',
  asset: 'battle-sprite.test',
  profile: {
    kind: 'player-fighter',
    frames: {
      idle: 0,
      dying: 1,
      dead: 2,
      defend: 3,
      hurt: 4,
      preMagic: 5,
      magic: 6,
      attackWindup: 7,
      attackRush: 8,
      attackStrike: 9,
      steal: 10,
    },
    castEffectBase: 15,
    attackEffectBase: 0,
  },
}

describe('BattleSpritePicker action ownership', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
  })

  test('没有资源跳转 owner 时只显示选择器，提供 owner 时保留打开动作', async () => {
    const onChange = vi.fn()
    const onOpenDefinition = vi.fn()
    const render = (allowOpen: boolean) => (
      <BattleSpritePicker
        value={definition.id}
        definitions={[definition]}
        kind="player-fighter"
        onChange={onChange}
        onOpenDefinition={allowOpen ? onOpenDefinition : undefined}
      />
    )

    await act(async () => root.render(render(false)))
    expect(host.querySelector('[role="combobox"]')).not.toBeNull()
    expect(host.querySelector('.ds-control-group__actions')).toBeNull()
    expect(host.querySelector('button[aria-label^="打开战斗精灵"]')).toBeNull()

    await act(async () => root.render(render(true)))
    const open = host.querySelector<HTMLButtonElement>(
      `button[aria-label="打开战斗精灵 ${definition.id}"]`,
    )!
    expect(open).not.toBeNull()
    expect(host.querySelector('.ds-control-group__actions')?.contains(open)).toBe(true)
    await act(async () => open.click())
    expect(onOpenDefinition).toHaveBeenCalledWith(definition.id)
  })
})
