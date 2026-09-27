// @vitest-environment jsdom

import type { AuthorCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { choose, click, commandForm, input, row } from './__tests__/command-form-current-fixture.js'

describe('当前角色状态与编队命令的正式弹窗提交', () => {
  test('状态施加从护体切到临时毒抗，只提交同一实际角色的新加值', async () => {
    const command: AuthorCommand = {
      kind: 'applyActorCondition',
      actor: 'hero',
      condition: { kind: 'status', status: 'protect', turns: 3 },
    }
    const f = await commandForm(command)
    await choose('当前状态', '临时毒抗')
    await input('毒抗加值', 7)
    await f.finish({
      kind: 'applyActorCondition',
      actor: 'hero',
      condition: { kind: 'poisonResistance', amount: 7 },
    })
  })

  test('状态清除从指定状态切到全部临时毒抗，不携带旧 status', async () => {
    const f = await commandForm({
      kind: 'clearActorCondition',
      actor: 'hero',
      condition: { kind: 'status', status: 'protect' },
    })
    await choose('清除状态', '全部临时毒抗')
    await f.finish({
      kind: 'clearActorCondition',
      actor: 'hero',
      condition: { kind: 'poisonResistance' },
    })
  })

  test('从一人编队添加到合法三人阵容，队长与实际角色稳定 ID 顺序不变', async () => {
    const f = await commandForm({ kind: 'setParty', members: ['hero'] })
    await click('添加队员')
    await click('添加队员')
    expect(row('').textContent).toContain('顺序=站位')
    const rows = [...document.querySelectorAll<HTMLElement>('[role="dialog"] .cf-party-row')]
    expect(rows.map((entry) => entry.querySelector('.cf-label')?.textContent)).toEqual([
      '队长',
      '队员 1',
      '队员 2',
    ])
    await f.finish({ kind: 'setParty', members: ['hero', 'ally-2', 'ally-3'] })
  })
})
