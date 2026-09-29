// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A01：ControlCommandForm 当前资源/引用行的表单合同。
 * 去重：CommandForm.current-data 已证 setFlag/setVar/addVar/openShop/giveMoney/giveItem/
 * loseItem 提交；current-movement 已证 cameraPan；ScriptEditor.coverage-batch 已证 branch
 * 条件臂；coverage-workflows-2 已证 callScript/cameraSnap（canonical 内联）。本文件只补：
 * playSound/playMusic 资产选择与 onOpenSound 委派、setAmbience 有/无氛围表的两路、
 * learnSkill 数字槽位与警告、clearDialog 无参合同。jumpScript/setEntityTrigger 等运行时
 * 方言 kind 被 checkAuthorCommands 拒绝（非 current 作者命令），ControlCommandForm 的对应臂
 * 在当前唯一调用方（canonical author 路径）不可达，登记回执不测试；scriptIndex 携带的
 * 「可复用脚本」臂同样无人传递，不测。
 */
import { act } from 'react'
import { expect, test, vi } from 'vitest'
import {
  chooseRowOption,
  clickButton,
  mountCommandForm,
  row,
} from '../__tests__/glm-large-wave/command-form-glw-kit.js'

test('playSound picks a catalog sound and forwards onOpenSound with the stable asset id', async () => {
  const onOpenSound = vi.fn()
  const form = await mountCommandForm(
    { kind: 'playSound', asset: 'sound-bell' },
    {
      soundAssets: [
        ['sound-bell', '铃声'],
        ['sound-drum', '鼓点'],
      ],
      onOpenSound,
    },
  )
  expect(row('音效').textContent).toContain('铃声 (sound-bell)')
  await chooseRowOption('音效', '鼓点 (sound-drum)')
  expect(form.expectLegal()).toEqual({ kind: 'playSound', asset: 'sound-drum' })
  await clickButton('在音效库打开 sound-drum')
  expect(onOpenSound).toHaveBeenCalledExactlyOnceWith('sound-drum')
})

test('playSound surfaces a missing or mistyped asset as an explicit invalid option', async () => {
  const form = await mountCommandForm(
    { kind: 'playSound', asset: 'sound-ghost' },
    {
      soundAssets: [['sound-bell', '铃声']],
    },
  )
  expect(row('音效').textContent).toContain('sound-ghost（缺失或类型错误）')
  expect(form.onChange).not.toHaveBeenCalled()
})

test('playSound with an empty catalog states the lack instead of offering a commit', async () => {
  const form = await mountCommandForm({ kind: 'playSound', asset: 'sound-bell' })
  const trigger = row('音效').querySelector<HTMLButtonElement>('[role="combobox"]')!
  await act(async () => trigger.click())
  const options = [...document.querySelectorAll('[role="option"]')].map(
    (option) => option.textContent,
  )
  expect(options).toContain('⚠ sound-bell（缺失或类型错误）')
  expect(options).toContain('项目没有可用音效')
  expect(form.onChange).not.toHaveBeenCalled()
})

test('playMusic commits the selected music asset id', async () => {
  const form = await mountCommandForm(
    { kind: 'playMusic', asset: 'music-theme' },
    {
      musicAssets: [
        ['music-theme', '主题曲'],
        ['music-battle', '战斗曲'],
      ],
    },
  )
  expect(row('音乐').textContent).toContain('主题曲 (music-theme)')
  await chooseRowOption('音乐', '战斗曲 (music-battle)')
  expect(form.expectLegal()).toEqual({ kind: 'playMusic', asset: 'music-battle' })
})

test('setAmbience with a project ambience table commits the stable id via the picker', async () => {
  const form = await mountCommandForm(
    { kind: 'setAmbience', ambience: 'night' },
    {
      ambiences: [
        { id: 'night', name: '夜晚', tint: [117, 230, 255] },
        { id: 'dusk', name: '黄昏', tint: [255, 150, 80] },
      ],
    },
  )
  expect(row('氛围').textContent).toContain('夜晚')
  await chooseRowOption('氛围', '黄昏')
  expect(form.expectLegal()).toEqual({ kind: 'setAmbience', ambience: 'dusk' })
})

test('setAmbience without a table degrades to a raw text input that commits the typed id', async () => {
  const form = await mountCommandForm({ kind: 'setAmbience', ambience: 'legacy-007' })
  const input = row('氛围').querySelector<HTMLInputElement>('input')
  expect(input, 'degraded text input').not.toBeNull()
  expect(input!.value).toBe('legacy-007')
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, 'underwater')
    input!.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(form.expectLegal()).toEqual({ kind: 'setAmbience', ambience: 'underwater' })
})

test('learnSkill keeps the legacy numeric role slot and commits the role change', async () => {
  const form = await mountCommandForm({ kind: 'learnSkill', role: 0, skill: 'trial-spark' })
  expect(row('原版角色槽位').querySelector('input')?.value).toBe('0')
  expect(document.querySelector('.cf-warn')?.textContent).toContain('原版数字槽位')
  expect(row('仙术').textContent).toContain('试炼术')
  const roleInput = row('原版角色槽位').querySelector<HTMLInputElement>('input')!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    roleInput.focus()
    setter.call(roleInput, '2')
    roleInput.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(form.expectLegal()).toEqual({ kind: 'learnSkill', role: 2, skill: 'trial-spark' })
})

test('clearDialog has no editable parameters', async () => {
  const form = await mountCommandForm({ kind: 'clearDialog' })
  expect(document.querySelector('.cf-row')).toBeNull()
  expect(document.querySelector('.hint')?.textContent).toContain('无可编参数')
  expect(form.onChange).not.toHaveBeenCalled()
})
