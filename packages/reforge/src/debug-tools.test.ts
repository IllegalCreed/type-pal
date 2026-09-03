// @vitest-environment jsdom

import type { WorldState } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  type DebugMotionSnapshot,
  type DebugToolsContext,
  injectDebugToolsStyles,
  installDebugTools,
} from './debug-tools.js'

function motionSnapshot(overrides: Partial<DebugMotionSnapshot> = {}): DebugMotionSnapshot {
  return {
    scene: 's001',
    worldTick: 12,
    player: {
      id: 'hero-instance',
      template: 'hero',
      pos: { col: 10, row: 20, height: 0 },
      facing: 'down',
      walking: false,
      authority: { kind: 'world' },
      authorityEpoch: 0,
    },
    followers: [],
    extraFollowers: [],
    entities: [],
    pendingTouch: false,
    pendingChase: [],
    hostileBusy: false,
    runnerActive: false,
    ...overrides,
  }
}

const OPEN_GATES = {
  visible: true,
  collidable: true,
  manualInteractable: false,
  touchTriggerable: true,
  autoAllowed: true,
  hostileAllowed: false,
}

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
  const runnerBusy = vi.fn(() => false)
  const dialogBusy = vi.fn(() => false)
  let motion = motionSnapshot()
  const readMotion = vi.fn(() => structuredClone(motion))
  const ctx = {
    world: () => world,
    motionState: readMotion,
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
    runnerBusy,
    dialogBusy,
    presentationBusy: () => false,
    runDetached: async () => undefined,
    startBattleDev,
    buildPresetParty: () => ({ party: [], learnedSkills: {} }),
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
    runnerBusy,
    dialogBusy,
    readMotion,
    setMotion(next: DebugMotionSnapshot) {
      motion = next
    },
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
    expect(css).toContain('#tp-debug[hidden] { display:none; }')
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

  test('状态页按四类对象显示唯一快照，区分控制权、partyMove、epoch 与已注册 motion', () => {
    vi.useFakeTimers()
    const h = harness()
    h.setMotion(
      motionSnapshot({
        worldTick: 41,
        player: {
          id: 'party-leader',
          template: 'hero',
          pos: { col: 1, row: 2, height: 0 },
          facing: 'left',
          walking: true,
          authority: { kind: 'script' },
          authorityEpoch: 7,
          partyMove: { to: { col: 9, row: 8, height: 0 }, speed: 'fast' },
        },
        followers: [
          {
            partyIndex: 1,
            id: 'party-follower',
            template: 'friend',
            pos: { col: 0, row: 2, height: 0 },
            facing: 'left',
            authority: { kind: 'follow' },
          },
          {
            partyIndex: 2,
            id: 'mounted-follower',
            template: 'friend-2',
            pos: { col: 4, row: 5, height: 0 },
            facing: 'up',
            authority: { kind: 'mount', parent: 'raft', dx: 0, dy: -1 },
          },
        ],
        extraFollowers: [
          {
            runtimeSlot: 0,
            spriteId: 'missing-extra-sprite',
            pos: { col: 0, row: 1, height: 0 },
            facing: 'down',
            authority: { kind: 'follow' },
            renderable: false,
          },
        ],
        entities: [
          {
            id: 'e-scripted',
            pos: { col: 6.25, row: 7.5, height: 1 },
            facing: 'right',
            authority: { kind: 'script' },
            authorityEpoch: 4,
            autoMotion: {
              source: 'auto',
              kind: 'move',
              commandEpoch: 12,
              sceneSessionId: 's001:1',
              activationOwnerId: 'e-owner',
              activationEpoch: 3,
              authorityEpochAtEnqueue: 2,
              pausedByAuthority: true,
            },
            gait: 2,
            gates: OPEN_GATES,
          },
          {
            id: 'raft',
            pos: { col: 4, row: 6, height: 0 },
            facing: 'up',
            authority: { kind: 'world' },
            authorityEpoch: 0,
            gait: null,
            gates: { ...OPEN_GATES, autoAllowed: false, touchTriggerable: false },
          },
        ],
      }),
    )

    const dispose = installDebugTools(h.ctx)
    const rows = [...document.querySelectorAll<HTMLElement>('.tpd-motion-row')]
    expect(rows.map((row) => row.dataset.motionKind)).toEqual([
      'leader',
      'party-follower',
      'party-follower',
      'extra-follower',
      'entity',
      'entity',
    ])
    expect(rows.map((row) => row.dataset.motionId)).toEqual([
      'party-leader',
      'party-follower',
      'mounted-follower',
      'missing-extra-sprite',
      'e-scripted',
      'raft',
    ])
    expect(rows[0]!.textContent).toContain('partyMove → 9,8,0 fast')
    expect(rows[2]!.textContent).toContain('载具 raft (0,-1)')
    expect(rows[3]!.textContent).toContain('资源未就绪')
    expect(rows[4]!.textContent).toContain('authority@4')
    expect(rows[4]!.textContent).toContain(
      'auto move#12 owner e-owner@3 authority@2（被控制权暂停）',
    )
    expect(h.readMotion).toHaveBeenCalledOnce()

    h.setMotion(motionSnapshot({ worldTick: 42 }))
    ;[...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === '刷新状态')!
      .click()
    expect(h.readMotion).toHaveBeenCalledTimes(2)
    expect(document.querySelector('.tpd-motion-row')?.textContent).toContain('tick 42')
    dispose()
  })

  test('Backquote 只在隐藏态和安全目标重开，Esc capture 不泄漏到关闭态', () => {
    vi.useFakeTimers()
    const { ctx } = harness()
    const gameKeydown = vi.fn()
    window.addEventListener('keydown', gameKeydown)
    const dispose = installDebugTools(ctx)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
    expect(document.getElementById('tp-debug')?.hidden).toBe(true)
    expect(gameKeydown).not.toHaveBeenCalled()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
    expect(gameKeydown).toHaveBeenCalledOnce()

    const guardedTargets: HTMLElement[] = [
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
    ]
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    const editableChild = document.createElement('span')
    editable.appendChild(editableChild)
    guardedTargets.push(editableChild)
    document.body.append(...guardedTargets.slice(0, 3), editable)
    for (const target of guardedTargets) {
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: '`',
          code: 'Backquote',
          bubbles: true,
          cancelable: true,
        }),
      )
      expect(document.getElementById('tp-debug')?.hidden).toBe(true)
    }
    for (const guarded of [
      { repeat: true },
      { isComposing: true },
      { shiftKey: true },
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
    ]) {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: '`', code: 'Backquote', ...guarded }),
      )
      expect(document.getElementById('tp-debug')?.hidden).toBe(true)
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '`', code: 'KeyA' }))
    expect(document.getElementById('tp-debug')?.hidden).toBe(true)

    const beforeOpen = gameKeydown.mock.calls.length
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '§', code: 'Backquote' }))
    expect(document.getElementById('tp-debug')?.hidden).toBe(false)
    expect(gameKeydown).toHaveBeenCalledTimes(beforeOpen)
    dispose()
    window.removeEventListener('keydown', gameKeydown)
  })

  test('三轮 hide/show 与重复安装始终单实例，dispose 幂等且 stale disposer 不碰新实例', () => {
    vi.useFakeTimers()
    const first = harness()
    const disposeFirst = installDebugTools(first.ctx)
    for (let round = 0; round < 3; round++) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
      expect(document.getElementById('tp-debug')?.hidden).toBe(true)
      const callsWhileHidden = first.runnerBusy.mock.calls.length
      vi.advanceTimersByTime(1_000)
      expect(first.runnerBusy).toHaveBeenCalledTimes(callsWhileHidden)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '`', code: 'Backquote' }))
      expect(document.getElementById('tp-debug')?.hidden).toBe(false)
      const callsAfterShow = first.runnerBusy.mock.calls.length
      vi.advanceTimersByTime(500)
      expect(first.runnerBusy.mock.calls.length).toBeGreaterThan(callsAfterShow)
      expect(document.querySelectorAll('#tp-debug')).toHaveLength(1)
      expect(document.querySelectorAll('#tp-reforge-debug-style')).toHaveLength(1)
    }

    const second = harness()
    second.setMotion(
      motionSnapshot({
        player: {
          ...motionSnapshot().player,
          id: 'second-controller',
        },
      }),
    )
    const disposeSecond = installDebugTools(second.ctx)
    expect(document.querySelector('[data-motion-id="second-controller"]')).not.toBeNull()
    disposeFirst()
    expect(document.querySelector('[data-motion-id="second-controller"]')).not.toBeNull()
    expect(document.querySelectorAll('#tp-debug')).toHaveLength(1)
    disposeSecond()
    disposeSecond()
    expect(document.getElementById('tp-debug')).toBeNull()
    expect(document.getElementById('tp-reforge-debug-style')).toBeNull()
    const callsAfterDispose = second.runnerBusy.mock.calls.length
    vi.advanceTimersByTime(1_000)
    expect(second.runnerBusy).toHaveBeenCalledTimes(callsAfterDispose)
  })

  test('hide 保留在途调试操作，dispose 才集中 abort', async () => {
    vi.useFakeTimers()
    const h = harness()
    Object.assign(h.ctx.canonicalProject.sharedScripts, {
      probe: { name: 'probe', self: 'none', body: [] },
    })
    let operationSignal: AbortSignal | undefined
    h.ctx.runDetached = (signal) => {
      operationSignal = signal
      return new Promise((_, reject) => {
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('cancelled', 'AbortError')),
          { once: true },
        )
      })
    }
    const dispose = installDebugTools(h.ctx)
    const trigger = [...document.querySelectorAll<HTMLButtonElement>('.tpd-trigger-button')].find(
      (button) => button.textContent?.includes('shared/probe'),
    )!
    trigger.click()
    expect(operationSignal?.aborted).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
    expect(operationSignal?.aborted).toBe(false)
    dispose()
    expect(operationSignal?.aborted).toBe(true)
    await Promise.resolve()
  })

  test('Esc 隐藏并 reset 帧步进，Backquote 重显；dispose 才移除根节点与样式', () => {
    vi.useFakeTimers()
    const { ctx, frameState, reset, setActive } = harness()
    const dispose = installDebugTools(ctx)
    ;[...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((tab) => tab.textContent === '图层')!
      .click()
    ;[...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.startsWith('▶ 单步'))!
      .click()
    expect(frameState()).toEqual({ active: true, requested: true })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
    expect(setActive).toHaveBeenLastCalledWith(false)
    expect(reset).toHaveBeenCalledOnce()
    expect(frameState()).toEqual({ active: false, requested: false })
    expect(document.getElementById('tp-debug')?.hidden).toBe(true)
    expect(document.getElementById('tp-reforge-debug-style')).not.toBeNull()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '§', code: 'Backquote' }))
    expect(document.getElementById('tp-debug')?.hidden).toBe(false)

    dispose()
    expect(document.getElementById('tp-debug')).toBeNull()
    expect(document.getElementById('tp-reforge-debug-style')).toBeNull()
  })
})
