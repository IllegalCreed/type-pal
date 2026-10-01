// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C05-G04：SpriteActionEditor 目录搜索与宿主回调新轴。
 * 排重：K03 已证新建/删除/重排/循环/步骤/引用工作流；本组只测搜索过滤、Escape、
 * onCommitPoses/onBeforeContextChange 门控与 restrictActionId 目录收缩。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { actionOf, openC05 } from '../__tests__/cursor-asset-r1/c05-action-fixtures.js'
import type { MountedEditor } from '../__tests__/cursor-asset-r1/c05-action-harness.js'
import { mountActionEditor } from '../__tests__/cursor-asset-r1/c05-action-harness.js'
import {
  cleanupEditor,
  clearSearchEscape,
  editorHost,
  heroPoses,
  listOptions,
  openC05Editor,
  pickActionOption,
  renameAction,
  searchActions,
  setupC05Ui,
  teardownC05Ui,
} from '../__tests__/cursor-asset-r1/c05-action-ui.js'

let mounted: MountedEditor | undefined

beforeEach(() => setupC05Ui())
afterEach(async () => {
  await cleanupEditor(mounted)
  mounted = undefined
  teardownC05Ui()
})

describe('C05-G04 目录搜索与宿主回调', () => {
  test('C05-G04-01 搜索 ActionId 子串：只保留匹配项且详情仍指向命中动作', async () => {
    mounted = await openC05Editor('g04-01', {
      alpha: actionOf('甲', [0], { order: 0 }),
      beta: actionOf('乙', [1], { order: 1 }),
    })
    const host = editorHost(mounted)
    await searchActions(host, 'beta')
    expect(listOptions(host)).toHaveLength(1)
    expect(listOptions(host)[0]?.textContent).toContain('beta')
    await pickActionOption(host, 'beta')
    expect(host.querySelector('h3')?.textContent).toBe('乙')
  })

  test('C05-G04-02 搜索标签大小写不敏感：大写查询仍命中中文标签', async () => {
    mounted = await openC05Editor('g04-02', {
      run: actionOf('RunFast', [0], { order: 0 }),
    })
    const host = editorHost(mounted)
    await searchActions(host, 'run')
    expect(listOptions(host)).toHaveLength(1)
    expect(host.textContent).toContain('RunFast')
  })

  test('C05-G04-03 无匹配时显示「没有匹配的预制动作」且保留原 poses', async () => {
    mounted = await openC05Editor('g04-03', {
      idle: actionOf('待机', [0], { order: 0 }),
    })
    const host = editorHost(mounted)
    await searchActions(host, 'zzz')
    expect(host.textContent).toContain('没有匹配的预制动作')
    expect(listOptions(host)).toHaveLength(0)
    expect(heroPoses(mounted)).toBeDefined()
  })

  test('C05-G04-04 Escape 清空搜索框并恢复完整目录', async () => {
    mounted = await openC05Editor('g04-04', {
      a: actionOf('A', [0], { order: 0 }),
      b: actionOf('B', [1], { order: 1 }),
    })
    const host = editorHost(mounted)
    await searchActions(host, 'a')
    expect(listOptions(host).length).toBeLessThan(2)
    await clearSearchEscape(host)
    expect(listOptions(host)).toHaveLength(2)
  })

  test('C05-G04-05 onCommitPoses 返回 false：mutations 记录失败且不写 session', async () => {
    const open = await openC05('g04-05', {
      poses: { idle: actionOf('待机', [0], { order: 0 }) },
    })
    const history = open.session.getHistoryVersion()
    mounted = await mountActionEditor(open, {
      selectedActionId: 'idle',
      onCommitPoses: () => false,
    })
    await renameAction(editorHost(mounted), '新待机名')
    expect(mounted.mutations).toEqual([{ ok: false, reason: '动作修改未能提交。' }])
    expect(open.session.getHistoryVersion()).toBe(history)
  })

  test('C05-G04-06 onCommitPoses 抛错：notices 带 message 且 ok=false', async () => {
    const open = await openC05('g04-06', {
      poses: { idle: actionOf('待机', [0], { order: 0 }) },
    })
    mounted = await mountActionEditor(open, {
      selectedActionId: 'idle',
      onCommitPoses: () => {
        throw new Error('宿主拒绝提交')
      },
    })
    await renameAction(editorHost(mounted), '抛错名')
    expect(mounted.mutations.at(-1)).toEqual({ ok: false, reason: expect.any(Error) })
    expect(mounted.notices.at(-1)).toEqual({ kind: 'error', message: '宿主拒绝提交' })
  })

  test('C05-G04-07 onBeforeContextChange 返回 false：切换动作不触发 selection 变化', async () => {
    mounted = await openC05Editor('g04-07', {
      a: actionOf('甲', [0], { order: 0 }),
      b: actionOf('乙', [1], { order: 1 }),
    })
    await mounted.setOptions({
      selectedActionId: 'a',
      onBeforeContextChange: () => false,
    })
    const before = mounted.selections.length
    await pickActionOption(editorHost(mounted), '乙')
    expect(mounted.selections.length).toBe(before)
    expect(editorHost(mounted).querySelector('h3')?.textContent).toBe('甲')
  })

  test('C05-G04-08 onBeforeContextChange 阻断新建：点击新建零 history', async () => {
    mounted = await openC05Editor('g04-08')
    const history = mounted.open.session.getHistoryVersion()
    await mounted.setOptions({ onBeforeContextChange: () => false })
    const create = [...editorHost(mounted).querySelectorAll<HTMLButtonElement>('button')].find(
      (btn) => btn.textContent?.trim() === '新建预制动作',
    )!
    await act(async () => {
      create.click()
    })
    expect(mounted.open.session.getHistoryVersion()).toBe(history)
    expect(heroPoses(mounted)).toBeUndefined()
  })

  test('C05-G04-09 restrictActionId 只展示单一动作目录项', async () => {
    const open = await openC05('g04-09', {
      poses: {
        keep: actionOf('保留', [0], { order: 0 }),
        hide: actionOf('隐藏', [1], { order: 1 }),
      },
    })
    mounted = await mountActionEditor(open, {
      selectedActionId: 'keep',
      restrictActionId: 'keep',
    })
    expect(listOptions(editorHost(mounted))).toHaveLength(1)
    expect(editorHost(mounted).textContent).toContain('keep')
    expect(editorHost(mounted).textContent).not.toContain('hide')
  })
})
