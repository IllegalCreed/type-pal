// @vitest-environment jsdom
/** 共享脚本的显式、继承和失效作用实体均经 canonical 脚本弹窗提交。
 * 运行时 ControlCommandForm 使用另一种 self 形状，不属于这些作者合同。 */
import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { click, commandForm } from './__tests__/command-form-current-fixture.js'

function selfSceneTrigger(): HTMLButtonElement {
  const trigger = document.querySelector<HTMLButtonElement>(
    '[role="dialog"] [role="combobox"][aria-label="场景"]',
  )
  expect(trigger, '聚合弹窗应暴露 self 场景选择器').not.toBeNull()
  return trigger!
}

describe('ScriptEditor 共享脚本作用实体', () => {
  test('共享脚本可指定当前场景的真实实体作为 self，且不改脚本身份', async () => {
    const form = await commandForm(
      { kind: 'callScript', script: 'shared/user/heal' },
      { requireLeafFormRow: false, includeEntity: true, includeSharedScript: true },
    )
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      '治疗 · shared/user/heal',
    )
    await click('指定另一个作用实体')
    await form.finish({
      kind: 'callScript',
      script: 'shared/user/heal',
      self: { scene: 'start', entity: 'npc' },
    })
  })

  test('共享脚本切回当前执行者会删除显式 self，不留旧实体引用', async () => {
    const form = await commandForm(
      {
        kind: 'callScript',
        script: 'shared/user/heal',
        self: { scene: 'start', entity: 'npc' },
      },
      { requireLeafFormRow: false, includeEntity: true, includeSharedScript: true },
    )
    await click('使用当前实体')
    await form.finish({ kind: 'callScript', script: 'shared/user/heal', self: undefined })
  })

  test('共享脚本悬空 self 场景呈引用失效且实体降级文本，重选合法场景自动改绑首个实体', async () => {
    const form = await commandForm(
      { kind: 'callScript', script: 'shared/user/heal', self: { scene: 'gone', entity: 'npc-2' } },
      {
        requireLeafFormRow: false,
        includeEntity: true,
        includeSecondEntity: true,
        includeSharedScript: true,
      },
    )
    expect(selfSceneTrigger().textContent).toContain('gone（引用失效）')
    expect(
      document.querySelector('[role="dialog"] [role="combobox"][aria-label="实体"]'),
      '场景悬空时实体不得伪装成可选下拉',
    ).toBeNull()
    const entityField = document.querySelector<HTMLInputElement>(
      '[role="dialog"] input[aria-label="实体"]',
    )
    expect(entityField?.value).toBe('npc-2')
    const trigger = selfSceneTrigger()
    await act(async () => trigger.click())
    const start = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent === 'start',
    )
    expect(start, '缺少合法场景选项 start').toBeDefined()
    await act(async () => start!.click())
    await form.finish({
      kind: 'callScript',
      script: 'shared/user/heal',
      self: { scene: 'start', entity: 'npc' },
    })
  })
})
