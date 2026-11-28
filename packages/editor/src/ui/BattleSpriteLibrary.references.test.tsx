// @vitest-environment jsdom
import { expect, test, vi } from 'vitest'
import {
  applyButton,
  chooseActionRow,
  clickButtonByText,
  deleteUsageButton,
  noticeErrors,
  openTab,
  selectSourceFrame,
  setupBattleSuite,
  stageByLabel,
} from '../__tests__/battle-sprite-library-gestures.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { worldVariableScriptStateFromEditorStateV1 } from '../core/world-variable-references.js'

const suite = setupBattleSuite()

test.each([
  ['checking', false, 'loading'],
  ['stale', false, 'partial'],
  ['failed', false, 'error'],
  ['current', true, 'error'],
] as const)('引用状态 %s 且索引缺失标记为 %s 时用途删除保持禁用', async (referenceStatus, omitReferenceIndex, panelState) => {
  const mounted = await suite.mount('battle-reference-availability', {
    focus: 'shared-fighter-a',
  })
  expect(deleteUsageButton(mounted.host)?.disabled).toBe(false)
  await mounted.update({ referenceStatus, omitReferenceIndex })

  expect(deleteUsageButton(mounted.host)?.disabled).toBe(true)
  await openTab(mounted.host, '引用')
  const panel = mounted.host.querySelector<HTMLElement>('.ds-reference-panel')
  expect(panel?.dataset.state).toBe(panelState)
  expect(panel?.textContent).toContain('数量未知')
})

test('用途删除遇到引用读取失败时保留原定义和历史，并显示原错误', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const mounted = await suite.mount('battle-reference-read-failure', {
    focus: 'shared-fighter-a',
    liveReferences: () => {
      throw new Error('读取作者引用失败')
    },
  })
  const before = structuredClone(mounted.session.getState().battleSprites)
  expect(deleteUsageButton(mounted.host)?.disabled).toBe(false)

  await clickButtonByText(mounted.host, '删除用途')

  expect(mounted.session.getState().battleSprites).toEqual(before)
  expect(mounted.session.getHistoryVersion()).toBe(0)
  expect(noticeErrors(mounted.notices)).toEqual(['读取作者引用失败'])
})

test('显示零引用后有脚本引用该用途时，提交前的当前作者索引拒绝删除', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const mounted = await suite.mount('battle-current-author-reference', {
    focus: 'shared-fighter-a',
    liveReferences: (state) => {
      const author = worldVariableScriptStateFromEditorStateV1(state)
      return collectCurrentProjectReferenceIndex(state, {
        ...author,
        sharedScripts: {
          ...author.sharedScripts,
          'hero-battle-appearance': {
            name: '主角战斗外观',
            self: 'none',
            body: [
              {
                kind: 'setActorAppearance',
                actor: 'hero',
                battleSprite: 'shared-fighter-a',
              },
            ],
          },
        },
      })
    },
  })
  const before = structuredClone(mounted.session.getState().battleSprites)
  await openTab(mounted.host, '引用 0')
  expect(mounted.host.querySelector('.ds-reference-panel')?.textContent).toContain(
    '当前用途尚未被使用',
  )
  expect(deleteUsageButton(mounted.host)?.disabled).toBe(false)

  await clickButtonByText(mounted.host, '删除用途')

  expect(mounted.session.getState().battleSprites).toEqual(before)
  expect(mounted.session.getHistoryVersion()).toBe(0)
  expect(noticeErrors(mounted.notices)).toEqual(['仍有 1 处引用，无法删除战斗精灵用途。'])
})

test('取消引用尚未刷新时的动作修改确认，不提交已选源帧', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const mounted = await suite.mount('battle-missing-reference-abi-cancel', {
    focus: 'shared-fighter-a',
    referenceStatus: 'stale',
  })
  const before = structuredClone(mounted.session.getState().battleSprites)
  await chooseActionRow(mounted.host, '普通攻击')
  await selectSourceFrame(mounted.host, 4)
  await clickButtonByText(stageByLabel(mounted.host, '冲刺'), '用已选 #4')
  expect(applyButton(mounted.host).disabled).toBe(false)

  await clickButtonByText(mounted.host, '应用修改')

  expect(confirm).toHaveBeenCalledExactlyOnceWith(
    '战斗精灵引用仍在刷新；修改动作 ABI 会影响全部使用位置。继续吗？',
  )
  expect(mounted.session.getState().battleSprites).toEqual(before)
  expect(mounted.session.getHistoryVersion()).toBe(0)
})
