// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C02-G07：动作 ABI 编辑控件的草稿→提交合同。
 * 排重：glm-m 已证敌人「待机毫秒/行动毫秒」(120/80/0) 草稿与放弃；Library.test 已证玩家阶段槽的拖放/
 * 「用已选」到草稿（mock 预览，无真实提交）。本文件补：攻击特效基帧与放弃零提交、可选偷窃槽
 * 赋值→清除（键缺席而非 undefined）、受伤槽用已选真实提交且不波及兄弟用途、敌人分段滑块
 * （待机结束/施法结束）的边界重算与耦合、毫秒/帧的取整夹取、放弃后时间线回流、召唤无 ABI 字段仅可改名、
 * 4 帧资产新增玩家用途的帧数门与敌人默认分段。
 */
import { act } from 'react'
import { expect, test, vi } from 'vitest'
import {
  A_IDLE,
  applyButton,
  buttonByText,
  chooseActionRow,
  clickButtonByText,
  noticeErrors,
  renameUsage,
  selectAssetRow,
  selectSourceFrame,
  setupBattleSuite,
  usageNameInput,
  waitProof,
} from '../__tests__/cursor-asset-r1/battle-sprite-ui.js'
import { controlByLabel, fillAndBlur, typeDraft } from '../__tests__/cursor-asset-r1/kit.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'

const suite = setupBattleSuite()

type Frames = Record<string, number | undefined>

function playerFrames(
  state: { battleSprites: ReadonlyArray<{ id: string; profile: unknown }> },
  id: string,
): Frames {
  return (state.battleSprites.find((entry) => entry.id === id)!.profile as { frames: Frames })
    .frames
}

function profileOf(
  state: { battleSprites: ReadonlyArray<{ id: string; profile: unknown }> },
  id: string,
): Record<string, unknown> {
  return state.battleSprites.find((entry) => entry.id === id)!.profile as Record<string, unknown>
}

function timeline(host: HTMLElement): string {
  return [...host.querySelectorAll('[aria-label="敌人动作分段"] span')]
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
    .join('|')
}

function range(host: HTMLElement, labelText: string): HTMLInputElement {
  return controlByLabel<HTMLInputElement>(host, labelText)
}

test('C02-G07-01 攻击特效基帧：草稿不动规范值，放弃零提交，应用只改该字段', async () => {
  const m = await suite.mount('c02-g07-01', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  const field = () => controlByLabel<HTMLInputElement>(m.host, '攻击特效基帧')
  await fillAndBlur(field(), '3')
  expect(applyButton(m.host).disabled).toBe(false)
  await act(async () => buttonByText(m.host, '放弃修改').click())
  expect(field().value).toBe('0')
  expect(applyButton(m.host).disabled).toBe(true)
  expect(m.session.getHistoryVersion()).toBe(0)

  await fillAndBlur(field(), '3')
  await act(async () => applyButton(m.host).click())
  const profile = profileOf(m.session.getState(), 'shared-fighter-a')
  expect(profile.attackEffectBase).toBe(3)
  expect(profile.castEffectBase).toBe(0)
  expect(profileOf(m.session.getState(), 'shared-fighter-b').attackEffectBase).toBe(0)
  expect(m.session.getHistoryVersion()).toBe(1)
  assertProjectSaveValid(m.session.getState())
})

test('C02-G07-02 可选偷窃槽：用已选第 11 帧写入，清除后键缺席，过保存门且逐级可撤销', async () => {
  const m = await suite.mount('c02-g07-02', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  expect('steal' in playerFrames(m.session.getState(), 'shared-fighter-a')).toBe(false)
  await chooseActionRow(m.host, '偷窃')
  await selectSourceFrame(m.host, 11)
  await act(async () => {
    m.host.querySelector<HTMLButtonElement>('button[aria-label="用已选 #11 替换偷窃动作"]')!.click()
  })
  await act(async () => applyButton(m.host).click())
  expect(playerFrames(m.session.getState(), 'shared-fighter-a').steal).toBe(11)
  assertProjectSaveValid(m.session.getState())

  await act(async () => {
    m.host.querySelector<HTMLButtonElement>('button[aria-label="清除偷窃动作"]')!.click()
  })
  await act(async () => applyButton(m.host).click())
  expect('steal' in playerFrames(m.session.getState(), 'shared-fighter-a')).toBe(false)
  assertProjectSaveValid(m.session.getState())
  expect(m.session.getHistoryVersion()).toBe(2)

  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  expect(playerFrames(m.session.getState(), 'shared-fighter-a').steal).toBe(11)
  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  expect('steal' in playerFrames(m.session.getState(), 'shared-fighter-a')).toBe(false)
})

test('C02-G07-03 受伤槽用已选 #5 真实提交：选中按钮标签反映帧号，兄弟用途保持原值', async () => {
  const m = await suite.mount('c02-g07-03', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await chooseActionRow(m.host, '受伤')
  await selectSourceFrame(m.host, 5)
  await act(async () => {
    m.host.querySelector<HTMLButtonElement>('button[aria-label="用已选 #5 替换姿势"]')!.click()
  })
  expect(m.host.querySelector('button[aria-label="选中姿势，当前为原始帧 5"]')).not.toBeNull()
  expect(playerFrames(m.session.getState(), 'shared-fighter-a').hurt).toBe(4)
  await act(async () => applyButton(m.host).click())
  expect(playerFrames(m.session.getState(), 'shared-fighter-a').hurt).toBe(5)
  expect(playerFrames(m.session.getState(), 'shared-fighter-b').hurt).toBe(3)
  expect(noticeErrors(m.notices)).toEqual([])
  assertProjectSaveValid(m.session.getState())
})

test('C02-G07-04 敌人待机结束滑块：待机段扩到 3 帧，施法段被挤空，提交后规范分段一致', async () => {
  const m = await suite.mount('c02-g07-04', { focus: 'enemy-red' })
  await waitProof(m.host, 6, 1)
  expect(timeline(m.host)).toBe('待机 #0–1|施法 #2–2|攻击 #3–5')
  await typeDraft(range(m.host, '待机结束：#1'), '3')
  expect(timeline(m.host)).toBe('待机 #0–2|攻击 #3–5')
  expect(profileOf(m.session.getState(), 'enemy-red').idle).toEqual({ start: 0, count: 2 })
  await act(async () => applyButton(m.host).click())
  const profile = profileOf(m.session.getState(), 'enemy-red')
  expect(profile.idle).toEqual({ start: 0, count: 3 })
  expect(profile.magic).toEqual({ start: 3, count: 0 })
  expect(profile.attack).toEqual({ start: 3, count: 3 })
  assertProjectSaveValid(m.session.getState())
  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  expect(timeline(m.host)).toBe('待机 #0–1|施法 #2–2|攻击 #3–5')
})

test('C02-G07-05 敌人施法结束滑块：施法段扩到 3 帧，攻击段收缩为 1 帧', async () => {
  const m = await suite.mount('c02-g07-05', { focus: 'enemy-red' })
  await waitProof(m.host, 6, 1)
  await typeDraft(range(m.host, '施法结束：#2'), '5')
  expect(timeline(m.host)).toBe('待机 #0–1|施法 #2–4|攻击 #5–5')
  await act(async () => applyButton(m.host).click())
  const profile = profileOf(m.session.getState(), 'enemy-red')
  expect(profile.idle).toEqual({ start: 0, count: 2 })
  expect(profile.magic).toEqual({ start: 2, count: 3 })
  expect(profile.attack).toEqual({ start: 5, count: 1 })
  assertProjectSaveValid(m.session.getState())
})

test('C02-G07-06 毫秒/帧换算取整：待机 20ms 夹到 1 tick、行动 100ms 取整为 3 tick，单次提交', async () => {
  const m = await suite.mount('c02-g07-06', { focus: 'enemy-red' })
  await waitProof(m.host, 6, 1)
  await fillAndBlur(controlByLabel<HTMLInputElement>(m.host, '待机毫秒/帧'), '20')
  await fillAndBlur(controlByLabel<HTMLInputElement>(m.host, '行动毫秒/帧'), '100')
  expect(m.session.getHistoryVersion()).toBe(0)
  await act(async () => applyButton(m.host).click())
  const profile = profileOf(m.session.getState(), 'enemy-red')
  expect(profile.idleTicksPerFrame).toBe(1)
  expect(profile.actTicksPerFrame).toBe(3)
  expect(profile.idle).toEqual({ start: 0, count: 2 })
  expect(m.session.getHistoryVersion()).toBe(1)
  assertProjectSaveValid(m.session.getState())
})

test('C02-G07-07 放弃修改让滑块与分段时间线回到规范值，应用恢复禁用且零提交', async () => {
  const m = await suite.mount('c02-g07-07', { focus: 'enemy-red' })
  await waitProof(m.host, 6, 1)
  await typeDraft(range(m.host, '施法结束：#2'), '4')
  expect(timeline(m.host)).toBe('待机 #0–1|施法 #2–3|攻击 #4–5')
  expect(applyButton(m.host).disabled).toBe(false)
  await act(async () => buttonByText(m.host, '放弃修改').click())
  expect(timeline(m.host)).toBe('待机 #0–1|施法 #2–2|攻击 #3–5')
  expect(range(m.host, '施法结束：#2').value).toBe('3')
  expect(applyButton(m.host).disabled).toBe(true)
  expect(m.session.getHistoryVersion()).toBe(0)
})

test('C02-G07-08 召唤用途无 ABI 字段：仅提示文案，改名可提交且 profile 保持 {kind: summon}', async () => {
  const m = await suite.mount('c02-g07-08', { focus: 'summon-fox' })
  await waitProof(m.host, 5, 1)
  expect(m.host.textContent).toContain(
    '召唤现身按源帧顺序播放；速度、染色和声音由引用它的技能设置。',
  )
  expect(m.host.querySelector('[aria-label="敌人动作分段"]')).toBeNull()
  expect(applyButton(m.host).disabled).toBe(true)
  await renameUsage(m.host, '狐火·二')
  await act(async () => applyButton(m.host).click())
  const entry = m.session.getState().battleSprites.find((e) => e.id === 'summon-fox')!
  expect(entry.label).toBe('狐火·二')
  expect(entry.profile).toEqual({ kind: 'summon' })
  expect(noticeErrors(m.notices)).toEqual([])
})

test('C02-G07-09 4 帧资产新增玩家用途被帧数门拒绝且不留草稿、类型菜单保持打开；改选敌人得到 2/0/2 默认分段', async () => {
  const m = await suite.mount('c02-g07-09', { focus: 'shared-fighter-a' })
  await selectAssetRow(m.host, A_IDLE)
  await waitProof(m.host, 4, 0)
  await clickButtonByText(m.host, '新增用途')
  await clickButtonByText(m.host, '玩家战斗')
  expect(noticeErrors(m.notices).at(-1)).toContain('玩家战斗精灵至少需要 10 帧')
  expect(m.host.textContent).not.toContain('新用途尚未写入项目')
  expect(m.session.getHistoryVersion()).toBe(0)
  expect(m.host.querySelector('[aria-label="新增用途类型"]')).not.toBeNull()

  await clickButtonByText(m.host, '敌人')
  await vi.waitFor(() => {
    expect(m.host.textContent).toContain('新用途尚未写入项目')
  })
  expect(usageNameInput(m.host)?.value).toBe('C02闲置 · 敌人')
  await act(async () => applyButton(m.host).click())
  await vi.waitFor(() => {
    expect(m.session.getState().battleSprites.some((e) => e.id === 'c02-enemy')).toBe(true)
  })
  const profile = profileOf(m.session.getState(), 'c02-enemy')
  expect(profile.idle).toEqual({ start: 0, count: 2 })
  expect(profile.magic).toEqual({ start: 2, count: 0 })
  expect(profile.attack).toEqual({ start: 2, count: 2 })
  assertProjectSaveValid(m.session.getState())
})

test('C02-G07-10 待机结束越过施法段：施法被推空、攻击从新边界起，施法结束滑块下限随之抬高', async () => {
  const m = await suite.mount('c02-g07-10', { focus: 'enemy-red' })
  await waitProof(m.host, 6, 1)
  const idle = range(m.host, '待机结束：#1')
  expect([idle.min, idle.max, idle.value]).toEqual(['1', '6', '2'])
  const magic = range(m.host, '施法结束：#2')
  expect([magic.min, magic.max, magic.value]).toEqual(['2', '6', '3'])

  await typeDraft(idle, '5')
  expect(timeline(m.host)).toBe('待机 #0–4|攻击 #5–5')
  const magicAfter = range(m.host, '施法结束：无施法段')
  expect([magicAfter.min, magicAfter.max, magicAfter.value]).toEqual(['5', '6', '5'])
  await act(async () => applyButton(m.host).click())
  const profile = profileOf(m.session.getState(), 'enemy-red')
  expect(profile.idle).toEqual({ start: 0, count: 5 })
  expect(profile.magic).toEqual({ start: 5, count: 0 })
  expect(profile.attack).toEqual({ start: 5, count: 1 })
  assertProjectSaveValid(m.session.getState())
})
