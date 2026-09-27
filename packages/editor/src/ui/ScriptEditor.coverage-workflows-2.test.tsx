// @vitest-environment jsdom

import type { AuthorCommand } from '@type-pal/content'
import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { click, commandForm } from './__tests__/command-form-current-fixture.js'

function field(label: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  expect(found, `missing current field ${label}`).toBeDefined()
  const control = document.getElementById(found!.htmlFor)
  expect(control, `missing control ${label}`).not.toBeNull()
  return control!
}

async function enter(label: string, value: string | number) {
  const control = field(label)
  expect(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement).toBe(true)
  const prototype =
    control instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  expect(setter).toBeDefined()
  await act(async () => {
    setter!.call(control, String(value))
    control.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function select(label: string, option: string) {
  const trigger = field(label)
  expect(trigger.getAttribute('role')).toBe('combobox')
  await act(async () => (trigger as HTMLButtonElement).click())
  const choice = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent?.trim() === option,
  )
  expect(choice, `missing ${label} option ${option}`).toBeDefined()
  await act(async () => choice!.click())
}

describe('当前脚本属性弹窗的未覆盖作者工作流', () => {
  test('镜头从跟随切为定位后提交精确二维落点', async () => {
    const initial: AuthorCommand = { kind: 'cameraSnap' }
    const f = await commandForm(initial, { requireLeafFormRow: false })
    await select('镜头位置', '定位到指定格子')
    await enter('横向格坐标', 7)
    await enter('纵向格坐标', -2)
    await f.finish({ kind: 'cameraSnap', to: { col: 7, row: -2, height: 0 } })
  })

  test('镜头从显式位置恢复跟随时只去掉位置，不制造零点坐标', async () => {
    const f = await commandForm(
      { kind: 'cameraSnap', to: { col: 7, row: 8, height: 2 } },
      { requireLeafFormRow: false },
    )
    await select('镜头位置', '回到队伍并继续跟随')
    await f.finish({ kind: 'cameraSnap', to: undefined })
  })

  test('追逐距离、速度和穿越地形三个输入保留独立意义', async () => {
    const f = await commandForm({ kind: 'chasePlayer' }, { requireLeafFormRow: false })
    await enter('开始追逐的格数', 3)
    await enter('移动速度', 5)
    const checkbox = [
      ...document.querySelectorAll<HTMLInputElement>('[role="dialog"] input[type="checkbox"]'),
    ].find((candidate) => candidate.labels?.[0]?.textContent?.includes('忽略地形'))
    expect(checkbox).toBeDefined()
    await act(async () => checkbox!.click())
    await f.finish({ kind: 'chasePlayer', range: 3, speed: 5, floating: true })
  })

  test('全队资源的负数扣除与单独法力选择保持原样', async () => {
    const f = await commandForm({ kind: 'increaseHpMp', delta: 10 }, { requireLeafFormRow: false })
    await enter('恢复量（负数表示扣除）', -12)
    await select('作用资源', '仅法力')
    await f.finish({ kind: 'increaseHpMp', delta: -12, pools: 'mp' })
  })

  test('跟随者逐行输入只保留有效精灵身份和原有顺序', async () => {
    const f = await commandForm(
      { kind: 'setFollowers', sprites: [] },
      { requireLeafFormRow: false },
    )
    await enter('跟随者精灵（每行一个，留空表示清除）', '  hero  \n\n  alternate  ')
    await f.finish({ kind: 'setFollowers', sprites: ['hero', 'alternate'] })
  })

  test('战斗结束结果选择从终止切为胜利，不改指令类型', async () => {
    const f = await commandForm(
      { kind: 'endBattle', result: 'terminate' },
      { requireLeafFormRow: false },
    )
    await select('结束结果', '判定玩家胜利')
    await f.finish({ kind: 'endBattle', result: 'won' })
  })

  test('地图覆写明确选择另一场景，保留当前项目地图身份', async () => {
    const f = await commandForm(
      { kind: 'setSceneMapOverride', mapId: 'start' },
      { requireLeafFormRow: false },
    )
    await select('场景', 'other')
    await f.finish({ kind: 'setSceneMapOverride', scene: 'other', mapId: 'start' })
  })

  test('共享脚本可指定当前场景的真实实体作为 self，且不改脚本身份', async () => {
    const f = await commandForm(
      { kind: 'callScript', script: 'shared/user/heal' },
      { requireLeafFormRow: false, includeEntity: true, includeSharedScript: true },
    )
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      '治疗 · shared/user/heal',
    )
    await click('指定另一个作用实体')
    await f.finish({
      kind: 'callScript',
      script: 'shared/user/heal',
      self: { scene: 'start', entity: 'npc' },
    })
  })

  test('共享脚本切回当前执行者会删除显式 self，不留旧实体引用', async () => {
    const f = await commandForm(
      {
        kind: 'callScript',
        script: 'shared/user/heal',
        self: { scene: 'start', entity: 'npc' },
      },
      { requireLeafFormRow: false, includeEntity: true, includeSharedScript: true },
    )
    await click('使用当前实体')
    await f.finish({ kind: 'callScript', script: 'shared/user/heal', self: undefined })
  })

  test('当前实体的定位表单仅改目标格，保持目标稳定身份与高度', async () => {
    const f = await commandForm(
      {
        kind: 'setEntityPos',
        target: { scene: 'start', entity: 'npc' },
        pos: { col: 1, row: 2, height: 3 },
      },
      { requireLeafFormRow: false, includeEntity: true },
    )
    await enter('横向格坐标', 9)
    await enter('纵向格坐标', 6)
    await f.finish({
      kind: 'setEntityPos',
      target: { scene: 'start', entity: 'npc' },
      pos: { col: 9, row: 6, height: 3 },
    })
  })

  test('实体触发方式从继承切到自定义触碰，精确保留当前目标与距离', async () => {
    const f = await commandForm(
      {
        kind: 'setEntityTriggerActivation',
        target: { scene: 'start', entity: 'npc' },
        selection: { kind: 'inherit' },
      },
      { requireLeafFormRow: false, includeEntity: true },
    )
    await select('触发方式来源', '使用自定义方式')
    await select('方式', '触碰')
    await enter('距离', 2)
    await f.finish({
      kind: 'setEntityTriggerActivation',
      target: { scene: 'start', entity: 'npc' },
      selection: { kind: 'use', value: { on: 'touch', range: 2 } },
    })
  })

  test('实体页面从继承改为当前登记的 silent 页面 ID', async () => {
    const f = await commandForm(
      {
        kind: 'selectEntityPage',
        target: { scene: 'start', entity: 'npc' },
        selection: { kind: 'inherit' },
      },
      { requireLeafFormRow: false, includeEntity: true },
    )
    await select('页面选择', '静默 · silent')
    await f.finish({
      kind: 'selectEntityPage',
      target: { scene: 'start', entity: 'npc' },
      selection: { kind: 'use', value: 'silent' },
    })
  })

  test('实体行为只选当前 trigger 注册表里的稳定方案，不写入显示标签', async () => {
    const f = await commandForm(
      {
        kind: 'selectEntityBehavior',
        target: { scene: 'start', entity: 'npc' },
        channel: 'trigger',
        selection: { kind: 'inherit' },
      },
      { requireLeafFormRow: false, includeEntity: true },
    )
    await select('选择', '交谈 · talk')
    await f.finish({
      kind: 'selectEntityBehavior',
      target: { scene: 'start', entity: 'npc' },
      channel: 'trigger',
      selection: { kind: 'use', value: 'talk' },
    })
  })

  test('确认结果标识编辑只提交标识，否分支正文保持原样', async () => {
    const initial: AuthorCommand = {
      kind: 'confirm',
      onNo: [{ kind: 'wait', ms: 40 }],
    }
    const f = await commandForm(initial, { requireLeafFormRow: false })
    await enter('高级：结果识别名', '  refuse  ')
    await f.finish({ ...initial, id: 'refuse' })
  })
})
