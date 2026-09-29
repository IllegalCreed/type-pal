// @vitest-environment jsdom
/**
 * TEST-GLM-NEW-G-1 G05：debug-tools 残差。
 * 旧证（debug-tools{,.commands,.triggers,.battle,.failures,.inspect,.navigation}.test.ts）
 * 已证命令解析/触发器/战斗构造/状态投影/roving focus/隐藏态；本文件只补旧题未覆盖臂：
 *   1) 控制台输入 keydown stopPropagation 隔离：窗口监听者不可见键入（debug-tools.ts:1355）；
 *   2) hidePanel 对面板内焦点元素 blur、Backquote 重开恢复活动 tab 焦点并刷新（:375-386）；
 *   3) presentationBusy 时控制台 scene 命令经 window.confirm 门：拒绝不执行、确认才执行
 *      （:1183-1185；旧题只证过触发器按钮路径）。
 * 全部走真实 installDebugTools + debugHarness 真实工程/运行时；不 mock 被测核心。
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanupDebug, command, debugHarness, field } from './__tests__/debug-tools-fixtures.js'

beforeEach(() => {
  document.body.replaceChildren()
})
afterEach(() => {
  cleanupDebug()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('G05 debug-tools 残差', () => {
  test('控制台输入 keydown 隔离：窗口监听者看不到键入，Enter 仍派发命令', async () => {
    const h = await debugHarness()
    const leaked: string[] = []
    const recorder = (event: KeyboardEvent): void => {
      leaked.push(event.key)
    }
    window.addEventListener('keydown', recorder)
    try {
      command('help')
      // Enter 已在输入框上被消费（stopPropagation），不得泄漏到游戏监听者。
      expect(leaked).toEqual([])
      expect(document.querySelector('.tpd-console')?.textContent).toContain('> help')
      expect(field('调试命令').value).toBe('')
      await h.settle()
    } finally {
      window.removeEventListener('keydown', recorder)
    }
  })

  test('hidePanel blur 焦点元素；Backquote 重开恢复活动 tab 焦点', async () => {
    await debugHarness()
    const panel = document.getElementById('tp-debug')
    if (!panel) throw new Error('debug panel missing')
    const activeTab = panel.querySelector<HTMLButtonElement>('.tpd-tab[aria-selected="true"]')
    if (!activeTab) throw new Error('active tab missing')
    activeTab.focus()
    expect(document.activeElement).toBe(activeTab)
    // Esc 隐藏：面板内焦点被显式 blur。
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
    expect(panel.hidden).toBe(true)
    expect(document.activeElement).toBe(document.body)
    // Backquote 重开：恢复活动 tab 焦点（showPanel 的 focus 恢复臂）。
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '`',
        code: 'Backquote',
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(panel.hidden).toBe(false)
    expect(document.activeElement).toBe(activeTab)
  })

  test('presentationBusy 时控制台 scene 命令经 confirm 门：拒绝不执行、确认才执行', async () => {
    const h = await debugHarness()
    h.state.busy = true // 真实 ctx 的 presentationBusy 读该状态
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    command('scene b 1,2 down')
    await h.settle()
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('主 runner 占用中'))
    expect(h.effects).toEqual([]) // 拒绝 → 零派发
    confirm.mockReturnValue(true)
    command('scene b 1,2 down')
    await h.settle()
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(h.effects.length).toBeGreaterThan(0) // 确认 → 真实 runtime 派发
    expect(h.effects.some((effect) => effect.kind === 'loadScene')).toBe(true)
  })
})
