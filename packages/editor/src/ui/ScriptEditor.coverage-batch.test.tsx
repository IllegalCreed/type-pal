// @vitest-environment jsdom

import type { AuthorCommand } from '@type-pal/content'
import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { commandForm } from './__tests__/command-form-current-fixture.js'

type Branch = Extract<AuthorCommand, { kind: 'branch' }>
const initial = (): Branch => ({
  kind: 'branch',
  cond: { kind: 'flag', flag: 'opened', is: true },
  then: [{ kind: 'wait', ms: 40 }],
  else: [{ kind: 'wait', ms: 80 }],
})

async function chooseCondition(label: string) {
  const field = [...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')].find(
    (element) => element.textContent?.trim() === '条件',
  )
  expect(field, 'condition selector label').toBeDefined()
  const trigger = document.getElementById(field!.htmlFor) as HTMLButtonElement | null
  expect(trigger?.getAttribute('role')).toBe('combobox')
  await act(async () => trigger!.click())
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (element) => element.textContent?.trim() === label,
  )
  expect(option, `condition option ${label}`).toBeDefined()
  await act(async () => option!.click())
}

async function chooseField(label: string, optionNeedle: string) {
  const field = [...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')].find(
    (element) =>
      element.textContent?.trim() === label || element.querySelector('span')?.textContent === label,
  )
  expect(field, `field ${label}`).toBeDefined()
  const trigger = (
    document.getElementById(field!.htmlFor)?.getAttribute('role') === 'combobox'
      ? document.getElementById(field!.htmlFor)
      : field!.closest('.ds-field')?.querySelector('[role="combobox"]')
  ) as HTMLButtonElement | null
  expect(trigger?.getAttribute('role')).toBe('combobox')
  await act(async () => trigger!.click())
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((element) =>
    element.textContent?.includes(optionNeedle),
  )
  expect(option, `option ${optionNeedle}`).toBeDefined()
  await act(async () => option!.click())
}

async function enterNumber(label: string, value: number) {
  const field = [...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')].find(
    (element) => element.textContent?.trim() === label,
  )
  expect(field, `number field ${label}`).toBeDefined()
  const input = document.getElementById(field!.htmlFor) as HTMLInputElement | null
  expect(input?.tagName).toBe('INPUT')
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  expect(setter).toBeDefined()
  await act(async () => {
    setter!.call(input, String(value))
    input!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('当前脚本条件编辑器的真实弹窗流程', () => {
  test('数值条件选择真实登记变量并设置比较/阈值，保留原分支体', async () => {
    const input = initial()
    const f = await commandForm(input, { requireLeafFormRow: false })
    await chooseCondition('数值')
    await chooseField('数值 id', 'count')
    await chooseField('比较', '>=')
    await enterNumber('值', 3)
    await f.finish({ ...input, cond: { kind: 'var', var: 'count', op: '>=', value: 3 } })
  })

  test.each([
    { option: '背包持有物品', kind: 'hasItem' as const },
    { option: '拥有物品', kind: 'ownsItem' as const },
    { option: '已装备物品', kind: 'itemEquipped' as const },
  ])('$option 只提交当前项目登记的物品身份与数量', async ({ option, kind }) => {
    const input = initial()
    const f = await commandForm(input, { requireLeafFormRow: false })
    await chooseCondition(option)
    await chooseField('物品', 'trial-herb')
    await enterNumber('至少', 3)
    await f.finish({ ...input, cond: { kind, itemId: 'trial-herb', atLeast: 3 } })
  })

  test.each([
    { option: '概率', condition: { kind: 'chance', percent: 50 } },
    { option: '全队满血', condition: { kind: 'allFullHp' } },
    { option: '金钱', condition: { kind: 'hasMoney', atLeast: 0 } },
  ] satisfies Array<{
    option: string
    condition: Branch['cond']
  }>)('$option 从当前 flag 草稿切换，保留两臂并只提交一次', async ({ option, condition }) => {
    const input = initial()
    const f = await commandForm(input, { requireLeafFormRow: false })
    expect(document.querySelector('[role="dialog"] .canonical-condition-editor')).not.toBeNull()
    await chooseCondition(option)
    await f.finish({ ...input, cond: condition })
  })

  test.each([
    { option: '数值', field: '数值 id' },
    { option: '当前场景', field: '场景' },
    { option: '背包持有物品', field: '物品' },
    { option: '拥有物品', field: '物品' },
    { option: '已装备物品', field: '物品' },
    { option: '实体状态', field: '实体' },
    { option: '实体在场', field: '实体' },
    { option: '面向实体', field: '实体' },
    { option: '全部满足', field: '添加条件' },
    { option: '任一满足', field: '添加条件' },
    { option: '取反', field: '条件' },
  ])('$option 显示该族专用输入且取消草稿不改原脚本', async ({ option, field }) => {
    const f = await commandForm(initial(), { requireLeafFormRow: false })
    expect(document.querySelector('[role="dialog"] .canonical-condition-editor')).not.toBeNull()
    await chooseCondition(option)
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(field)
    f.pending()
  })
})
