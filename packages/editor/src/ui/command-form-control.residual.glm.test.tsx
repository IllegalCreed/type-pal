// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1 残余合同（R-SELF-INVALID-1，唯一新增）。
 * 排重结论：ControlCommandForm 的 callScript/jumpScript self 臂在唯一产品调用方不可达
 * （作者方言 callScript 属 AUTHOR_CUSTOM_COMMAND_KINDS，bridge 拒绝后走 ScriptEditor 内联
 * 表单；运行时方言 ref+self:string 被 checkAuthorCommands 拒绝），真实调用方的 self 合同
 * 仅剩「悬空 self 地址」未证：explicit/inherit 已证于 coverage-workflows-2，required 已证于
 * 校验层 script-references.test。本合同经真实 CanonicalScriptBodyEditor 行双击 →
 * 聚合弹窗 → EntityAddressEditor：悬空场景呈「引用失效」禁用项、实体降级原始文本不伪装
 * 可选；重选合法场景自动改绑首个可接受实体，完成才提交可解析地址。
 */
import { act } from 'react'
import { expect, test } from 'vitest'
import { commandForm } from './__tests__/command-form-current-fixture.js'

function selfSceneSelect(): HTMLButtonElement {
  const trigger = document.querySelector<HTMLButtonElement>(
    '[role="dialog"] [role="combobox"][aria-label="场景"]',
  )
  expect(trigger, '聚合弹窗应暴露 self 场景选择器').not.toBeNull()
  return trigger!
}

test('共享脚本悬空 self 场景呈引用失效且实体降级文本，重选合法场景自动改绑首个实体', async () => {
  const f = await commandForm(
    { kind: 'callScript', script: 'shared/user/heal', self: { scene: 'gone', entity: 'npc-2' } },
    {
      requireLeafFormRow: false,
      includeEntity: true,
      includeSecondEntity: true,
      includeSharedScript: true,
    },
  )
  expect(selfSceneSelect().textContent).toContain('gone（引用失效）')
  expect(
    document.querySelector('[role="dialog"] [role="combobox"][aria-label="实体"]'),
    '场景悬空时实体不得伪装成可选下拉',
  ).toBeNull()
  const entityField = document.querySelector<HTMLInputElement>(
    '[role="dialog"] input[aria-label="实体"]',
  )
  expect(entityField?.value).toBe('npc-2')
  const trigger = selfSceneSelect()
  await act(async () => trigger.click())
  const start = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (option) => option.textContent === 'start',
  )
  expect(start, '缺少合法场景选项 start').toBeDefined()
  await act(async () => start!.click())
  await f.finish({
    kind: 'callScript',
    script: 'shared/user/heal',
    self: { scene: 'start', entity: 'npc' },
  })
})
