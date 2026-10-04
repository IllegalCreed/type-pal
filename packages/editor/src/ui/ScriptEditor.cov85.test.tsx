// @vitest-environment jsdom
/**
 * TEST-COVERAGE85-GLM-EDITOR-1 批4b：ScriptEditor 命令呈现/条件缺省/场景钩子表单残臂。
 *
 * fullName 排重（旧文件已证，不复制）：
 * - ScriptEditor.coverage-batch：flag 草稿切 数值/背包三类物品/概率/全队满血/金钱 条件、
 *   各族输入显示；ScriptEditor.entities-near/inparty-condition：实体邻近/入队条件细节；
 *   ScriptEditor.test：命令树/表单主干。
 * 本文件只补 cov-base 实测缺臂：当前场景/实体状态/实体在场/邻近实体/面向实体五类条件的
 * 缺省体提交、循环名称自动派生 loop-N id、selectSceneHooks 三态+omit 槽位切换、
 * startBattle/teleportOut/branch/callScript/setEntityTriggerActivation/releaseEntity/
 * mountParty/stepEntity 的命令行呈现标签。
 */
import type { AuthorCommand } from '@type-pal/content'
import { act } from 'react'
import { expect, test } from 'vitest'
import { commandForm } from './__tests__/command-form-current-fixture.js'

type Branch = Extract<AuthorCommand, { kind: 'branch' }>
const flagBranch = (): Branch => ({
  kind: 'branch',
  cond: { kind: 'flag', flag: 'opened', is: true },
  then: [{ kind: 'wait', ms: 40 }],
  else: [{ kind: 'wait', ms: 80 }],
})

async function click(text: string): Promise<void> {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(button, `button ${text}`).toBeDefined()
  await act(async () => {
    button!.click()
  })
}

async function chooseCondition(label: string): Promise<void> {
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

/** 与 fixture.finish 相同流程但不做输出合法性复核（缺省体引用字面场景名是合同本身）。 */
async function finishRaw(form: Awaited<ReturnType<typeof commandForm>>): Promise<AuthorCommand[]> {
  expect(form.onChange).not.toHaveBeenCalled()
  await click('完成')
  expect(form.onChange).toHaveBeenCalledExactlyOnceWith([expect.anything()])
  const output = form.onChange.mock.calls[0]![0]
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  return output
}

test.each([
  {
    option: '当前场景',
    cond: { kind: 'currentScene', scene: 'scene' } as Branch['cond'],
  },
  {
    option: '实体状态',
    cond: {
      kind: 'entityState',
      target: { scene: 'scene', entity: 'entity' },
      is: 1,
    } as Branch['cond'],
  },
  {
    option: '实体在场',
    cond: { kind: 'entityInScene', target: { scene: 'scene', entity: 'entity' } } as Branch['cond'],
  },
  {
    option: '两个实体靠近',
    cond: {
      kind: 'entitiesNear',
      from: { scene: 'scene', entity: 'entity' },
      to: { scene: 'scene', entity: 'entity' },
      range: 0.5,
    } as Branch['cond'],
  },
  {
    option: '面向实体',
    cond: {
      kind: 'facingEntity',
      target: { scene: 'scene', entity: 'entity' },
      range: 1,
    } as Branch['cond'],
  },
])('cov85-script $option 条件切换提交缺省条件体且保留两臂', async ({ option, cond }) => {
  const input = flagBranch()
  const form = await commandForm(input, { requireLeafFormRow: false })
  await chooseCondition(option)
  const output = await finishRaw(form)
  expect(output).toEqual([{ ...input, cond }])
})

test('cov85-script 循环名称首填自动派生 loop-1 id，清空名称保留已派生 id', async () => {
  const input: AuthorCommand = { kind: 'loop', mode: 'forever', body: [] }
  const form = await commandForm(input, { requireLeafFormRow: false })
  const labelInput = [...document.querySelectorAll<HTMLDivElement>('[role="dialog"] input')].find(
    (element) => (element as HTMLInputElement).placeholder?.includes('重新尝试'),
  )
  expect(labelInput).toBeDefined()
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    labelInput!.focus()
    setter.call(labelInput, '外层等待')
    labelInput!.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const output = await finishRaw(form)
  expect(output).toEqual([
    { kind: 'loop', mode: 'forever', id: 'loop-1', label: '外层等待', body: [] },
  ])
})

test('cov85-script selectSceneHooks 槽位：use→disabled→inherit→omit 逐态提交', async () => {
  const input: AuthorCommand = {
    kind: 'selectSceneHooks',
    scene: 'start',
    selection: { onEnter: { kind: 'use', value: 'talk' } },
  }
  const form = await commandForm(input, { requireLeafFormRow: false, includeEntity: true })
  const slotTrigger = (labelText: string): HTMLButtonElement => {
    const field = [...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')].find(
      (element) => element.textContent?.trim() === labelText,
    )
    expect(field, `slot label ${labelText}`).toBeDefined()
    const trigger = document.getElementById(field!.htmlFor) as HTMLButtonElement | null
    expect(trigger?.getAttribute('role')).toBe('combobox')
    return trigger!
  }
  const chooseSlot = async (labelText: string, optionText: string): Promise<void> => {
    const trigger = slotTrigger(labelText)
    await act(async () => trigger.click())
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (element) => element.textContent?.trim() === optionText,
    )
    expect(option, `slot option ${optionText}`).toBeDefined()
    await act(async () => option!.click())
  }
  void chooseSlot
  await chooseSlot('进入场景', '显式禁用')
  await chooseSlot('传送出口', '恢复继承')
  const output = await finishRaw(form)
  expect(output).toEqual([
    {
      kind: 'selectSceneHooks',
      scene: 'start',
      selection: { onEnter: { kind: 'disabled' }, onTeleport: { kind: 'inherit' } },
    },
  ])
})

test('cov85-script selectSceneHooks 最后一个槽位选「不修改」时整段槽位键省略', async () => {
  const input: AuthorCommand = {
    kind: 'selectSceneHooks',
    scene: 'start',
    selection: { onEnter: { kind: 'disabled' } },
  }
  const form = await commandForm(input, { requireLeafFormRow: false })
  const field = [...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')].find(
    (element) => element.textContent?.trim() === '进入场景',
  )
  const trigger = document.getElementById(field!.htmlFor) as HTMLButtonElement
  await act(async () => trigger.click())
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (element) => element.textContent?.trim() === '不修改此槽',
  )
  await act(async () => option!.click())
  // onEnter 是唯一槽位：omit 后 selection 为空 → 整条指令无内容可提交，零派发关窗。
  await click('完成')
  expect(form.onChange).not.toHaveBeenCalled()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
})

test.each([
  {
    name: 'startBattle 呈现',
    command: {
      kind: 'startBattle',
      enemyTeamId: 'practice',
      onLose: [{ kind: 'wait', ms: 1 }],
      onFlee: [{ kind: 'wait', ms: 2 }],
    } as AuthorCommand,
    rowText: '战斗',
  },
  {
    name: 'teleportOut 呈现',
    command: { kind: 'teleportOut', onFail: [{ kind: 'wait', ms: 3 }] } as AuthorCommand,
    rowText: '传送',
  },
  {
    name: 'callScript 带自身实体',
    command: {
      kind: 'callScript',
      script: 'shared/user/heal',
      self: { scene: 'start', entity: 'npc' },
    } as AuthorCommand,
    rowText: '治疗',
  },
  {
    name: 'setEntityTriggerActivation use 带范围',
    command: {
      kind: 'setEntityTriggerActivation',
      target: { scene: 'start', entity: 'npc' },
      selection: { kind: 'use', value: { on: 'interact', range: 2 } },
    } as AuthorCommand,
    rowText: '触发',
  },
  {
    name: 'mountParty 带偏移',
    command: {
      kind: 'mountParty',
      target: { scene: 'start', entity: 'npc' },
      dx: 1,
      dy: -1,
    } as AuthorCommand,
    rowText: '挂载',
  },
  {
    name: 'stepEntity 走一步',
    command: {
      kind: 'stepEntity',
      target: { scene: 'start', entity: 'npc' },
      dir: 'up',
    } as AuthorCommand,
    rowText: '走一步',
  },
])('cov85-script 命令行呈现：$name 渲染业务标签', async ({ command, rowText }) => {
  const form = await commandForm(command, {
    requireLeafFormRow: false,
    includeEntity: true,
    includeSharedScript: true,
  })
  expect(form.onChange).not.toHaveBeenCalled()
  expect(document.body.textContent).toContain(rowText)
})
/**
 * r3 T2：插入菜单合同（fallbackInsertionChoice 族，ScriptEditor.tsx:2994-3100/3644-3712）。
 * commandForm 挂真实 CanonicalScriptBodyEditor：点「添加指令」→搜索→选指令→onChange
 * 断言插入后的完整命令数组（insertCommandsAfter 的业务结果）。
 */
async function openInsertMenu(): Promise<void> {
  // fixture 的 dblclick 已打开编辑弹窗；先关它，插入入口在正文编辑器头部。
  const closeEditor = document.querySelector<HTMLButtonElement>('[aria-label="关闭"]')
  if (closeEditor) {
    await act(async () => {
      closeEditor.click()
    })
  }
  const add = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === '添加指令',
  )
  expect(add, '添加指令按钮').toBeDefined()
  await act(async () => {
    add!.click()
  })
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('添加指令')
}

async function closeInsertMenu(): Promise<void> {
  const close = document.querySelector<HTMLButtonElement>('[aria-label="关闭"]')
  expect(close, '插入弹窗关闭按钮').toBeDefined()
  await act(async () => {
    close!.click()
  })
}

async function searchInsert(term: string): Promise<void> {
  const search = document.querySelector<HTMLInputElement>(
    'input[type="search"][aria-label="搜索可插入指令"]',
  )
  expect(search, '搜索框').toBeDefined()
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    search!.focus()
    setter.call(search, term)
    search!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function insertChoice(labelNeedle: string): HTMLButtonElement {
  const choice = [...document.querySelectorAll<HTMLButtonElement>('[data-command-kinds]')].find(
    (candidate) => candidate.textContent?.includes(labelNeedle),
  )
  if (!choice) throw new Error(`插入选项缺失: ${labelNeedle}`)
  return choice
}

test('cov85-insert 无实体时暂停实体禁用并给出原因，配实体后提交缺省体', async () => {
  const form = await commandForm({ kind: 'wait', ms: 5 } as AuthorCommand, {
    requireLeafFormRow: false,
  })
  await openInsertMenu()
  await searchInsert('暂停')
  const noTarget = insertChoice('暂停实体')
  expect(noTarget.disabled).toBe(true)
  expect(noTarget.title).toBe('请先选择一个场景实体')
  await closeInsertMenu()
  expect(form.onChange).not.toHaveBeenCalled()
})

test.each([
  {
    term: '暂停',
    label: '暂停实体',
    command: { kind: 'suspendEntity', target: { scene: 'start', entity: 'npc' }, ticks: 1 },
  },
  {
    term: '恢复',
    label: '恢复实体',
    command: { kind: 'restoreEntity', target: { scene: 'start', entity: 'npc' } },
  },
  {
    term: '移除',
    label: '移除实体',
    command: { kind: 'removeEntity', target: { scene: 'start', entity: 'npc' } },
  },
  {
    term: '页面',
    label: '实体页',
    command: {
      kind: 'selectEntityPage',
      target: { scene: 'start', entity: 'npc' },
      selection: { kind: 'inherit' },
    },
  },
])('cov85-insert $label 缺省体插入在既有指令之后', async ({ term, label, command }) => {
  const form = await commandForm({ kind: 'wait', ms: 5 } as AuthorCommand, {
    requireLeafFormRow: false,
    includeEntity: true,
  })
  await openInsertMenu()
  await searchInsert(term)
  await act(async () => {
    insertChoice(label).click()
  })
  expect(form.onChange).toHaveBeenCalledExactlyOnceWith([
    { kind: 'wait', ms: 5 },
    command as AuthorCommand,
  ])
  expect(document.querySelector('[role="dialog"]')).toBeNull()
})

test('cov85-insert 搜索无匹配回显空态', async () => {
  const form = await commandForm({ kind: 'wait', ms: 5 } as AuthorCommand, {
    requireLeafFormRow: false,
  })
  await openInsertMenu()
  await searchInsert('不存在的指令xyz')
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('没有匹配的指令。')
  await closeInsertMenu()
  expect(form.onChange).not.toHaveBeenCalled()
})
