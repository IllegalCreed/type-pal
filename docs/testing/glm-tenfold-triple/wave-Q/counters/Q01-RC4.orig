// @vitest-environment jsdom
// Q01 · shop-trial 残差（排重：旧 6 例已证严格参数拒绝矩阵、双 scope 真买、scope 前置失败、
// 缺商店/物品前置失败、空库存退出、draw 异步失败清理；本文件只补白名单参数接受臂、
// resize 适配钳制、blur 清键与普通关闭的终态 DOM 合同）。
import { afterEach, expect, test, vi } from 'vitest'
import { shopProject } from './__tests__/glm-q/shop-project.js'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, until } from './__tests__/runtime-shell/driver.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

async function runTrial(query: string) {
  host = await installShellHost(query)
  const fixture = await shopProject()
  const run = (await import('./shop-trial.js')).runShopTrial(fixture.project, {
    shopId: 0,
    money: 30,
  })
  return { run, canvas: document.querySelector<HTMLCanvasElement>('canvas')! }
}

test('Q01 白名单伴随参数（project/workspace/save-workspace）接受并精确解析', async () => {
  const { parseShopTrialParameters } = await import('./shop-trial.js')
  const parsed = parseShopTrialParameters(
    new URLSearchParams('shop-trial=3&money=12&project=demo&workspace=w&save-workspace=s'),
  )
  expect(parsed).toEqual({ shopId: 3, money: 12 })
})

test('Q01 初始 fit 按 320×200 逻辑分辨率取 1..4 整数倍；resize 后重新钳制', async () => {
  const { run, canvas } = await runTrial('?shop-trial=0&money=30')
  await vi.waitFor(() => expect(canvas.width).toBe(960)) // jsdom 1024×768 → floor(3.2, 3.84) = 3
  expect(canvas.height).toBe(600)
  expect(document.title).toBe('商店 0 · 独立试买')
  expect(canvas.getAttribute('aria-label')).toContain('独立试买')
  Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 200, configurable: true })
  window.dispatchEvent(new Event('resize'))
  await drain()
  expect(canvas.width).toBe(320) // floor(min(1,1)) = 1
  expect(canvas.height).toBe(200)
  window.dispatchEvent(new Event('pagehide'))
  await run
})

test('Q01 blur 清空未释放按键：blur 后同帧不产生二次输入', async () => {
  const { run } = await runTrial('?shop-trial=0&money=30')
  const drawShop = vi.spyOn(await import('./menu/shop-box.js'), 'drawShop')
  await until(host!, () => drawShop.mock.calls.length > 0)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
  host!.frame(100)
  const cursorAfterDown = (drawShop.mock.lastCall?.[1] as { cursor: number }).cursor
  expect(cursorAfterDown).toBe(1)
  window.dispatchEvent(new Event('blur'))
  host!.frame(100)
  expect((drawShop.mock.lastCall?.[1] as { cursor: number }).cursor).toBe(cursorAfterDown)
  window.dispatchEvent(new Event('pagehide'))
  await run
  drawShop.mockRestore()
})

test('Q01 Escape 结束试买：终态 role=status 文本、画布隐藏、帧循环与键盘监听全部移除', async () => {
  const { run, canvas } = await runTrial('?shop-trial=0&money=30')
  await until(host!, () => host!.draws.length > 0)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
  host!.frame(100)
  await run
  const status = document.querySelector('p[role="status"]')
  expect(status?.textContent).toBe('试买已结束，可关闭此标签页。本次金钱和物品不会保存。')
  expect(canvas.hidden).toBe(true)
  expect(host!.frames.size).toBe(0)
  const before = host!.draws.length
  host!.key('Enter')
  host!.frame(100)
  expect(host!.draws).toHaveLength(before)
})
