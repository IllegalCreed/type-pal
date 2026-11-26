import { describe, expect, test } from 'vitest'
import {
  openSystemMenu,
  systemConfirm,
  systemConfirmYes,
  systemSwitchCommit,
  systemToggleConfirm,
} from './system-menu-state.js'

const audioPreferences = { musicOn: true, soundOn: false }

describe('系统面板与宿主请求', () => {
  test('按经典顺序打开五个可选入口', () => {
    const menu = openSystemMenu()
    expect(menu).toMatchObject({ active: true, phase: 'menu', cursor: 0 })
    expect(menu.items).toEqual([
      { id: 'save', label: 'menu.system.save' },
      { id: 'load', label: 'menu.system.load' },
      { id: 'music', label: 'menu.system.music' },
      { id: 'sound', label: 'menu.system.sound' },
      { id: 'quit', label: 'menu.system.quit' },
    ])
  })

  test.each([
    { cursor: 0, kind: 'open-save' },
    { cursor: 1, kind: 'open-load' },
  ])('$kind 交给宿主并保留系统面板', ({ cursor, kind }) => {
    const menu = openSystemMenu(cursor)
    const result = systemConfirm(menu, audioPreferences)
    expect(result.action).toEqual({ kind })
    expect(result.state).toBe(menu)
  })

  test.each([
    { cursor: 2, device: 'music', current: true, action: { kind: 'set-music', on: false } },
    { cursor: 3, device: 'sound', current: false, action: { kind: 'set-sound', on: true } },
  ])('$device 高亮当前值并将切换结果交给宿主', ({ cursor, device, current, action }) => {
    const result = systemConfirm(openSystemMenu(cursor), audioPreferences)
    expect(result.state).toMatchObject({
      phase: 'switch',
      switchTarget: device,
      confirmYes: current,
    })
    expect(result.action).toBeUndefined()
    const toggled = systemToggleConfirm(result.state)
    expect(toggled.confirmYes).toBe(!current)
    expect(systemSwitchCommit(toggled)).toEqual({
      state: { active: false, phase: 'menu', items: [], cursor: 0, confirmYes: false },
      action,
    })
  })

  test('缺省音频偏好时开关高亮开启', () => {
    expect(systemConfirm(openSystemMenu(2)).state.confirmYes).toBe(true)
  })

  test('退出确认默认否，确认后收起系统面板', () => {
    const { state } = systemConfirm(openSystemMenu(4), audioPreferences)
    expect(state).toMatchObject({ phase: 'confirm', confirmYes: false })
    expect(systemConfirmYes(state)).toEqual({
      state: { active: false, phase: 'menu', items: [], cursor: 0, confirmYes: false },
      action: undefined,
    })
  })

  test('改选是再确认时交给宿主返回标题', () => {
    const { state } = systemConfirm(openSystemMenu(4), audioPreferences)
    const confirmed = systemToggleConfirm(state)
    expect(systemConfirmYes(confirmed)).toEqual({ state: confirmed, action: { kind: 'quit' } })
  })
})
