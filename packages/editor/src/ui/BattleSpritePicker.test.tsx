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
    const picker = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    expect(picker).not.toBeNull()
    expect(picker.textContent).toContain('测试战斗精灵')
    expect(picker.textContent).toContain('battle.player.test · 玩家战斗 · 8 个动作')
    expect(host.querySelector('.ds-control-group__actions')).toBeNull()
    expect(host.querySelector('button[aria-label^="打开战斗精灵"]')).toBeNull()
    await act(async () => picker.click())
    const listbox = document.getElementById(picker.getAttribute('aria-controls')!)
    const option = listbox?.querySelector<HTMLElement>('[role="option"]')!
    expect(option.querySelector('.ds-select-option__label')?.textContent).toBe('测试战斗精灵')
    expect(option.querySelector('.ds-select-option__description')?.textContent).toBe(
      'battle.player.test · 玩家战斗 · 8 个动作',
    )
    expect(option.title).toBe(
      '测试战斗精灵 · battle.player.test · 玩家战斗 · 8 个动作',
    )
    await act(async () => picker.click())

    await act(async () => root.render(render(true)))
    const open = host.querySelector<HTMLButtonElement>(
      `button[aria-label="打开战斗精灵 ${definition.id}"]`,
    )!
    expect(open).not.toBeNull()
    expect(host.querySelector('.ds-control-group__actions')?.contains(open)).toBe(true)
    await act(async () => open.click())
    expect(onOpenDefinition).toHaveBeenCalledWith(definition.id)

    await act(async () =>
      root.render(
        <BattleSpritePicker
          value="battle.missing"
          definitions={[definition]}
          kind="player-fighter"
          onChange={onChange}
        />,
      ),
    )
    expect(host.querySelector('.ds-select__value')?.textContent).toBe('battle.missing')
    expect(host.querySelector('.ds-select__description')?.textContent).toBe('当前引用缺失')

    const enemyDefinition = {
      ...definition,
      id: 'battle.enemy.test',
      label: '测试敌人精灵',
      profile: {
        kind: 'enemy' as const,
        idle: { start: 0, count: 2 },
        magic: { start: 2, count: 1 },
        attack: { start: 3, count: 2 },
        idleTicksPerFrame: 1,
        actTicksPerFrame: 1,
      },
    }
    await act(async () =>
      root.render(
        <BattleSpritePicker
          value={enemyDefinition.id}
          definitions={[enemyDefinition]}
          kind="player-fighter"
          onChange={onChange}
        />,
      ),
    )
    expect(host.querySelector('.ds-select__value')?.textContent).toBe('测试敌人精灵')
    expect(host.querySelector('.ds-select__description')?.textContent).toBe(
      'battle.enemy.test · 不兼容：敌人 · 3 个动作段 · 5 帧',
    )
  })
})
