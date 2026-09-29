// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A02（actor 对）：条件目标的候选资格与数值钳制、编队成员替换。
 * 去重：CommandForm.actor-workflow-coverage 已证 apply/clear 的类型切换与提交、
 * current-characterization 已证状态词表与清除语义、coverage-workflows-2 已证 setParty
 * 加人。本文件只补：不可参战/不存在目标的显式禁用项、持续回合与毒抗加值的边界钳制、
 * 按行替换编队成员保持顺序。mountParty/ride 属 AUTHOR_CUSTOM，canonical 路径走
 * ScriptEditor 内联表单，ActorCommandForm 的对应臂不可达，登记回执不测试。
 */
import { act } from 'react'
import { expect, test } from 'vitest'
import {
  chooseAriaOption,
  mountCommandForm,
  row,
} from '../__tests__/glm-large-wave/command-form-glw-kit.js'

async function setInput(rowLabel: string, value: string): Promise<void> {
  const input = row(rowLabel).querySelector<HTMLInputElement>('input[type="number"]')
  if (!input) throw new Error(`missing number input ${rowLabel}`)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

test('applyActorCondition marks a non-battler actor as ineligible instead of dropping it', async () => {
  const form = await mountCommandForm(
    {
      kind: 'applyActorCondition',
      actor: 'ally-2',
      condition: { kind: 'poisonResistance', amount: 1 },
    },
    { nonBattler: 'ally-2' },
  )
  const trigger = row('目标角色').querySelector<HTMLButtonElement>('[role="combobox"]')!
  await act(async () => trigger.click())
  const ineligible = [...document.querySelectorAll('[role="option"]')].find((option) =>
    option.textContent?.includes('不可参战'),
  )
  expect(ineligible).not.toBeNull()
  expect(ineligible!.getAttribute('aria-disabled')).toBe('true')
  expect(form.onChange).not.toHaveBeenCalled()
})

test('applyActorCondition keeps an unknown actor visible as a repair context', async () => {
  const form = await mountCommandForm({
    kind: 'applyActorCondition',
    actor: 'ghost-actor',
    condition: { kind: 'poisonResistance', amount: 1 },
  })
  expect(row('目标角色').textContent).toContain('ghost-actor（角色不存在）')
  expect(form.onChange).not.toHaveBeenCalled()
})

test('applied status turns clamp into the carried-status turn range', async () => {
  const form = await mountCommandForm({
    kind: 'applyActorCondition',
    actor: 'hero',
    condition: { kind: 'status', status: 'protect', turns: 7 },
  })
  await setInput('持续回合', '5000')
  expect(form.expectLegal()).toEqual({
    kind: 'applyActorCondition',
    actor: 'hero',
    condition: { kind: 'status', status: 'protect', turns: 999 },
  })
  await setInput('持续回合', '0')
  expect(form.expectLegal()).toEqual({
    kind: 'applyActorCondition',
    actor: 'hero',
    condition: { kind: 'status', status: 'protect', turns: 1 },
  })
})

test('applied poison resistance floors at one', async () => {
  const form = await mountCommandForm({
    kind: 'applyActorCondition',
    actor: 'hero',
    condition: { kind: 'poisonResistance', amount: 3 },
  })
  await setInput('毒抗加值', '0')
  expect(form.expectLegal()).toEqual({
    kind: 'applyActorCondition',
    actor: 'hero',
    condition: { kind: 'poisonResistance', amount: 1 },
  })
})

test('setParty replaces a member in place and keeps the seating order', async () => {
  const form = await mountCommandForm({
    kind: 'setParty',
    members: ['hero', 'ally-2'],
  })
  await chooseAriaOption('队员 1', '队员3')
  expect(form.expectLegal()).toEqual({ kind: 'setParty', members: ['hero', 'ally-3'] })
})
