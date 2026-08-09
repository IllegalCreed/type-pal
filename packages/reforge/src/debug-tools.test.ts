// @vitest-environment jsdom

import type { WorldState } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { type DebugToolsContext, injectDebugToolsStyles, installDebugTools } from './debug-tools.js'

function harness() {
  const world: WorldState = {
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
  }
  let frameActive = false
  let stepRequested = false
  const reset = vi.fn(() => {
    stepRequested = false
  })
  const setActive = vi.fn((active: boolean) => {
    frameActive = active
    if (!active) stepRequested = false
  })
  const startBattleDev = vi.fn(async () => 'win' as const)
  const ctx = {
    world: () => world,
    sceneId: () => 's001',
    scene: () => undefined,
    canonicalProject: {
      sharedScripts: {},
      battleFields: [{ id: 7, background: 'field.7' }],
      enemyTeamsById: { 'team-1': { id: 'team-1', enemies: [] } },
      enemiesById: { slime: { id: 'slime' } },
      actorsById: { hero: { id: 'hero' } },
    },
    runtime: () => undefined,
    runnerBusy: () => false,
    dialogBusy: () => false,
    presentationBusy: () => false,
    runDetached: async () => undefined,
    startBattleDev,
    buildPresetParty: () => [],
    setParty: () => undefined,
    grantSkill: () => undefined,
    frameStep: {
      get active() {
        return frameActive
      },
      setActive,
      requestStep() {
        stepRequested = true
      },
      reset,
    },
    layers: { collision: false, triggers: false },
    showToast: () => undefined,
  } as unknown as DebugToolsContext
  return {
    ctx,
    reset,
    setActive,
    startBattleDev,
    frameState: () => ({ active: frameActive, requested: stepRequested }),
  }
}

afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
  document.getElementById('tp-reforge-debug-style')?.remove()
})

describe('Reforge debug tools', () => {
  test('样式幂等，五个语义 tab 使用 roving focus，切换后表单与 console 状态不丢', () => {
    vi.useFakeTimers()
    injectDebugToolsStyles()
    injectDebugToolsStyles()
    expect(document.querySelectorAll('#tp-reforge-debug-style')).toHaveLength(1)
    const css = document.getElementById('tp-reforge-debug-style')!.textContent
    expect(css).toContain('--tpd-bg:rgba(24,24,28,.96)')
    expect(css).toContain('--tpd-accent:#6c8eef')
    expect(css).not.toContain('Songti SC')

    const { ctx } = harness()
    const close = installDebugTools(ctx)
    expect(document.querySelector('[role="tablist"]')?.getAttribute('aria-orientation')).toBe(
      'horizontal',
    )
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    const panels = [...document.querySelectorAll<HTMLElement>('[role="tabpanel"]')]
    expect(tabs.map((tab) => tab.textContent)).toEqual(['状态', '指令', '触发', '战斗', '图层'])
    expect(panels).toHaveLength(5)
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1, -1])

    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true')
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1, -1, -1])
    const command = document.querySelector<HTMLInputElement>('[aria-label="调试命令"]')!
    command.value = 'help'
    command.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(document.querySelector('.tpd-console')?.textContent).toContain('scene <id>')

    tabs[4]!.click()
    tabs[1]!.click()
    expect(document.querySelector('.tpd-console')?.textContent).toContain('scene <id>')
    expect(command.isConnected).toBe(true)
    close()
  })

  test('战场 option 使用显式有限 id；非法值 fail-closed，不启动战斗', () => {
    vi.useFakeTimers()
    const { ctx, startBattleDev } = harness()
    const close = installDebugTools(ctx)
    const battleTab = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (tab) => tab.textContent === '战斗',
    )!
    battleTab.click()
    const field = document.querySelector<HTMLSelectElement>('[aria-label="战场"]')!
    expect(field.options[0]!.value).toBe('7')
    field.options[0]!.value = 'Infinity'
    field.value = 'Infinity'
    document.querySelector<HTMLInputElement>('.tpd-scrollbox input[value="hero"]')!.click()
    ;[...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === '⚔ 开战')!
      .click()
    expect(startBattleDev).not.toHaveBeenCalled()
    expect(document.querySelector('[role="status"]')?.textContent).toContain('有限数字')
    close()
  })

  test('关闭显式退出并 reset 帧步进，随后移除独立样式', () => {
    vi.useFakeTimers()
    const { ctx, frameState, reset, setActive } = harness()
    installDebugTools(ctx)
    ;[...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((tab) => tab.textContent === '图层')!
      .click()
    ;[...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.startsWith('▶ 单步'))!
      .click()
    expect(frameState()).toEqual({ active: true, requested: true })

    document.querySelector<HTMLButtonElement>('[aria-label^="关闭调试面板"]')!.click()
    expect(setActive).toHaveBeenLastCalledWith(false)
    expect(reset).toHaveBeenCalledOnce()
    expect(frameState()).toEqual({ active: false, requested: false })
    expect(document.getElementById('tp-debug')).toBeNull()
    expect(document.getElementById('tp-reforge-debug-style')).toBeNull()
  })
})
