// @vitest-environment jsdom

import { checkStages, type ScriptStage } from '@type-pal/content'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { ScriptTree } from './ScriptTree.js'

const references: ScriptReferenceCatalog = {
  choices: () => [],
  has: () => false,
  label: (_kind, id) => id,
}

const mounted: Array<{ root: Root; host: HTMLDivElement }> = []
afterEach(async () => {
  for (const { root, host } of mounted.splice(0).reverse()) {
    await act(async () => root.unmount())
    host.remove()
  }
  vi.unstubAllGlobals()
})

async function renderTree(
  stages: ScriptStage[],
  extras: Partial<ComponentProps<typeof ScriptTree>> = {},
) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  checkStages(stages, 'tree.stages', { allowSceneEntry: extras.showSceneEntry === true })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  mounted.push({ root, host })
  const props = { stages, locale: {}, references, ...extras }
  await act(async () => root.render(<ScriptTree {...props} />))
  return {
    host,
    rerender: async (nextStages: ScriptStage[]) => {
      checkStages(nextStages, 'tree.nextStages', {
        allowSceneEntry: extras.showSceneEntry === true,
      })
      await act(async () => root.render(<ScriptTree {...props} stages={nextStages} />))
    },
  }
}

async function choose(trigger: HTMLButtonElement, label: string) {
  await act(async () => trigger.click())
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  expect(option, `missing option ${label}`).toBeDefined()
  await act(async () => option!.click())
}

describe('脚本树当前公开交互剩余合同', () => {
  test('合法空段只有在可编辑时提供插入入口', async () => {
    const stages: ScriptStage[] = [{ body: [] }]
    const before = structuredClone(stages)
    const onRowAction = vi.fn()
    const editable = await renderTree(stages, { onRowAction })
    const insert = [...editable.host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('插入第一条指令'),
    )
    expect(insert).toBeDefined()
    await act(async () => insert!.click())
    expect(onRowAction).toHaveBeenCalledExactlyOnceWith('0/-1', 'insert')
    expect(stages).toEqual(before)

    const readonly = await renderTree(stages)
    expect(readonly.host.textContent).toContain('（空段）')
    expect(readonly.host.textContent).not.toContain('插入第一条指令')
  })

  test('分支两臂的行点击、臂内插入与删除都传递精确路径而不改输入', async () => {
    const stages: ScriptStage[] = [
      {
        body: [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'opened', is: true },
            then: [{ kind: 'wait', ms: 20 }],
            else: [{ kind: 'wait', ms: 40 }],
          },
        ],
      },
    ]
    const before = structuredClone(stages)
    const onSelect = vi.fn()
    const onRowAction = vi.fn()
    const { host } = await renderTree(stages, { onSelect, onRowAction })
    expect(
      [...host.querySelectorAll('.cmd-block-title')].map((title) => title.textContent),
    ).toEqual(['则', '否则'])
    const rows = [...host.querySelectorAll<HTMLElement>('.cmd-row')]
    expect(rows.map((row) => row.querySelector('.cmd-label')?.textContent)).toEqual([
      '如果 旗标 opened 为真',
      '等待 20ms',
      '等待 40ms',
    ])
    await act(async () => rows[1]!.click())
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('0/0/then/0', { kind: 'wait', ms: 20 })

    const afterThen = rows[1]!.querySelector<HTMLButtonElement>('button[title="在此后插入"]')
    const removeElse = rows[2]!.querySelector<HTMLButtonElement>('button[title="删除"]')
    expect(afterThen).not.toBeNull()
    expect(removeElse).not.toBeNull()
    await act(async () => afterThen!.click())
    await act(async () => removeElse!.click())
    expect(onRowAction.mock.calls).toEqual([
      ['0/0/then/0', 'insert'],
      ['0/0/else/0', 'remove'],
    ])
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(stages).toEqual(before)
  })

  test('多段下一步选择、追加和删除按段号回调，拒绝组件私自改数组', async () => {
    const stages: ScriptStage[] = [{ body: [{ kind: 'wait', ms: 20 }] }, { body: [] }]
    const before = structuredClone(stages)
    const onStageAction = vi.fn()
    const { host } = await renderTree(stages, { onStageAction })
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="第 1 段跑完后的去向"]')
    expect(trigger).not.toBeNull()
    await choose(trigger!, '推进下一段')
    await choose(trigger!, '回第 2 段')
    const add = host.querySelector<HTMLButtonElement>('[title="在本段之后插入新段"]')
    const remove = host.querySelector<HTMLButtonElement>('[title^="删除本段"]')
    expect(add).not.toBeNull()
    expect(remove).not.toBeNull()
    await act(async () => add!.click())
    await act(async () => remove!.click())
    expect(onStageAction.mock.calls).toEqual([
      [0, { kind: 'next', next: 'advance' }],
      [0, { kind: 'next', next: 1 }],
      [0, { kind: 'addAfter' }],
      [0, { kind: 'remove' }],
    ])
    expect(stages).toEqual(before)
  })

  test('场景入场缺席态显式化与准备区空态各自给出精确回调', async () => {
    const stages: ScriptStage[] = [{ body: [{ kind: 'wait', ms: 20 }] }]
    const before = structuredClone(stages)
    const onRowAction = vi.fn()
    const onSceneEntryChange = vi.fn()
    const tree = await renderTree(stages, {
      showSceneEntry: true,
      onRowAction,
      onSceneEntryChange,
    })
    const makeExplicit = [...tree.host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.includes('设为显式入场'),
    )
    expect(makeExplicit).toBeDefined()
    await act(async () => makeExplicit!.click())
    expect(onSceneEntryChange).toHaveBeenCalledExactlyOnceWith(0, {
      prepare: [],
      reveal: { kind: 'fade', outMs: 260, inMs: 260 },
    })
    expect(stages).toEqual(before)

    await tree.rerender([
      { entry: { prepare: [], reveal: { kind: 'cut' } }, body: [{ kind: 'wait', ms: 20 }] },
    ])
    const addPrepare = [...tree.host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('添加准备指令'),
    )
    expect(addPrepare).toBeDefined()
    await act(async () => addPrepare!.click())
    expect(onRowAction).toHaveBeenCalledExactlyOnceWith('0/entry/prepare/-1', 'insert')
    expect(tree.host.textContent).toContain('呈现后脚本1 条')
  })

  test('入场呈现从淡变换到逐像素后可回默认；不可编辑态禁用揭示控件', async () => {
    const stages: ScriptStage[] = [
      { entry: { prepare: [], reveal: { kind: 'fade', outMs: 100, inMs: 200 } }, body: [] },
    ]
    const before = structuredClone(stages)
    const onSceneEntryChange = vi.fn()
    const tree = await renderTree(stages, { showSceneEntry: true, onSceneEntryChange })
    const selectReveal = tree.host.querySelector<HTMLButtonElement>('[aria-label="场景揭示方式"]')
    expect(selectReveal).not.toBeNull()
    await choose(selectReveal!, '逐像素渐变')
    expect(onSceneEntryChange).toHaveBeenCalledWith(0, {
      prepare: [],
      reveal: { kind: 'dither', ms: 720, source: 'previousPresentedFrame' },
    })
    await tree.rerender([
      {
        entry: {
          prepare: [],
          reveal: { kind: 'dither', ms: 720, source: 'previousPresentedFrame' },
        },
        body: [],
      },
    ])
    const duration = tree.host.querySelector<HTMLInputElement>('input.scene-reveal-number')
    expect(duration).not.toBeNull()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    expect(setter).toBeDefined()
    await act(async () => {
      setter!.call(duration, '480')
      duration!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onSceneEntryChange).toHaveBeenLastCalledWith(0, {
      prepare: [],
      reveal: { kind: 'dither', ms: 480, source: 'previousPresentedFrame' },
    })
    const reset = [...tree.host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('恢复默认'),
    )
    expect(reset).toBeDefined()
    await act(async () => reset!.click())
    expect(onSceneEntryChange).toHaveBeenLastCalledWith(0, undefined)
    expect(stages).toEqual(before)

    const readonly = await renderTree(stages, { showSceneEntry: true })
    expect(
      readonly.host.querySelector<HTMLButtonElement>('[aria-label="场景揭示方式"]')?.disabled,
    ).toBe(true)
    expect(readonly.host.textContent).not.toContain('恢复默认')
  })
})
