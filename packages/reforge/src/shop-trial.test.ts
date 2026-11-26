// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { shellProject } from './__tests__/runtime-shell/project.js'
import { medicine } from './__tests__/runtime-shell/scenarios.js'
import { expectDefined } from './defined.js'
import { loadCurrentProjectFrom } from './project-loader.js'
import { parseShopTrialParameters } from './shop-trial.js'

let host: ShellHost | undefined

afterEach(async () => {
  await host?.close()
  host = undefined
})

async function setupTrial(query = 'shop-trial=0&money=100', items = ['potion', 'ether']) {
  const browser = await installShellHost(`?${query}`)
  host = browser
  const fixture = await shellProject()
  const manifest = structuredClone(fixture.project.manifest)
  manifest.content.shops = 'content/shops.json'
  fixture.files['manifest.json'] = manifest
  fixture.files['content/shops.json'] = [{ id: 0, items }]
  fixture.files['content/items.json'] = [
    { ...medicine('potion'), buyPrice: 50 },
    { ...medicine('ether'), buyPrice: 50 },
  ]
  const project = await loadCurrentProjectFrom(fixture.source)
  const trial = await import('./shop-trial.js')
  const draw = vi.spyOn(await import('./menu/shop-box.js'), 'drawShop')
  const canvas = expectDefined(document.querySelector('canvas') ?? undefined)
  return { browser, canvas, draw, project, trial }
}

async function waitForFrame(browser: ShellHost) {
  await vi.waitFor(() => expect(browser.frames.size).toBe(1))
}

test('only trial parameters and project identity can accompany a nonnegative shop ID', () => {
  const parse = (query: string) => parseShopTrialParameters(new URLSearchParams(query))
  expect(parse('')).toBeUndefined()
  expect(parse('shop-trial=0&money=0')).toEqual({ shopId: 0, money: 0 })
  expect(parse('shop-trial=3&money=12&project=demo&workspace=w&save-workspace=s')).toEqual({
    shopId: 3,
    money: 12,
  })
  for (const query of [
    'shop-trial=&money=0',
    'shop-trial=-1&money=0',
    'shop-trial=0',
    'shop-trial=0&money=1.5',
    'shop-trial=0&money=NaN',
    'shop-trial=0&money=9007199254740992',
    'shop-trial=0&money=0&money=1',
    'shop-trial=0&shop-trial=1&money=0',
  ])
    expect(() => parse(query)).toThrow(/非负安全整数|重复/)
  for (const key of [
    'scene',
    'entry',
    'battle',
    'skill',
    'e2e-load',
    'gallery',
    'battle-preview',
    'menu',
    'party',
    'give',
    'field',
  ])
    expect(() => parse(`shop-trial=0&money=0&${key}=x`)).toThrow(`独立试买不能同时使用参数 ${key}`)
})

test.each([
  'project',
  'workspace',
] as const)('buys two selected items in the %s scope and exits without opening any save database', async (kind) => {
  const workspaceId = '11111111-1111-4111-8111-111111111111'
  const { browser, canvas, draw, project } = await setupTrial(
    `shop-trial=0&money=100${kind === 'workspace' ? `&save-workspace=${workspaceId}` : ''}`,
  )
  const open = vi.spyOn(indexedDB, 'open')
  const { bootGame } = await import('./main.js')
  const projectId = project.manifest.id
  const run = bootGame(
    project,
    kind === 'workspace' ? { kind, projectId, workspaceId } : { kind, projectId },
  )
  await waitForFrame(browser)

  for (const key of ['Enter', 'ArrowRight', 'Enter']) {
    browser.key(key)
    await browser.frame()
  }
  expect(draw.mock.lastCall?.[2]).toEqual({
    money: 50,
    inventory: [{ itemId: 'potion', count: 1 }],
    party: [],
    learnedSkills: {},
  })
  for (const key of ['ArrowDown', 'Enter', 'ArrowRight', 'Enter', 'Enter']) {
    browser.key(key)
    await browser.frame()
  }
  expect(draw.mock.lastCall?.[2]).toEqual({
    money: 0,
    inventory: [
      { itemId: 'potion', count: 1 },
      { itemId: 'ether', count: 1 },
    ],
    party: [],
    learnedSkills: {},
  })
  expect(draw.mock.lastCall?.[1].phase).toBe('list')
  browser.key('Escape')
  await browser.frame()
  await run
  expect(document.querySelector('[role="status"]')?.textContent).toBe(
    '试买已结束，可关闭此标签页。本次金钱和物品不会保存。',
  )
  expect(canvas.hidden).toBe(true)
  expect(browser.frames.size).toBe(0)
  const attempts = draw.mock.calls.length
  const key = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
  window.dispatchEvent(key)
  expect(key.defaultPrevented).toBe(false)
  await browser.frame()
  expect(draw).toHaveBeenCalledTimes(attempts)
  expect(open).not.toHaveBeenCalled()
})

test('rejects mismatched or missing save identities before browser work', async () => {
  const { browser, project } = await setupTrial()
  const { bootGame } = await import('./main.js')
  const open = vi.spyOn(indexedDB, 'open')
  await expect(bootGame(project, { kind: 'project', projectId: 'different' })).rejects.toThrow(
    '当前项目',
  )
  await expect(Reflect.apply(bootGame, undefined, [project])).rejects.toThrow('存档')
  expect(browser.fetches).toEqual([])
  expect(browser.frames.size).toBe(0)
  expect(open).not.toHaveBeenCalled()
})

test('reports missing shop and missing stock before asset loading', async () => {
  const { browser, project, trial } = await setupTrial()
  await expect(trial.runShopTrial(project, { shopId: 9, money: 0 })).rejects.toThrow(
    '商店 9 不存在',
  )
  const incomplete = { ...project, shops: [{ id: 0, items: ['missing'] }] }
  await expect(trial.runShopTrial(incomplete, { shopId: 0, money: 0 })).rejects.toThrow(
    '物品 missing',
  )
  expect(browser.fetches).toEqual([])
  expect(browser.frames.size).toBe(0)
})

test('empty stock stays at the first row and pagehide stops rendering', async () => {
  const { browser, draw, project, trial } = await setupTrial(undefined, [])
  const run = trial.runShopTrial(project, { shopId: 0, money: 0 })
  await waitForFrame(browser)
  browser.key('ArrowDown')
  await browser.frame()
  expect(draw.mock.lastCall?.[1].cursor).toBe(0)
  window.dispatchEvent(new Event('pagehide'))
  await run
  expect(browser.frames.size).toBe(0)
})

test('four-times canvas scale shrinks to one and a blur clears keys queued for the next frame', async () => {
  vi.stubGlobal('innerWidth', 1920)
  vi.stubGlobal('innerHeight', 1080)
  const { browser, canvas, draw, project, trial } = await setupTrial()
  const run = trial.runShopTrial(project, { shopId: 0, money: 100 })
  await waitForFrame(browser)
  expect([canvas.width, canvas.height]).toEqual([1280, 800])
  expect(document.title).toBe('商店 0 · 独立试买')
  expect(canvas.getAttribute('aria-label')).toContain('独立试买')
  vi.stubGlobal('innerWidth', 160)
  vi.stubGlobal('innerHeight', 100)
  window.dispatchEvent(new Event('resize'))
  expect([canvas.width, canvas.height]).toEqual([320, 200])

  browser.key('ArrowDown')
  window.dispatchEvent(new Event('blur'))
  await browser.frame()
  expect(draw.mock.lastCall?.[1].cursor).toBe(0)
  browser.key('ArrowDown')
  await browser.frame()
  expect(draw.mock.lastCall?.[1].cursor).toBe(1)
  window.dispatchEvent(new Event('pagehide'))
  await run
})

test('a draw failure rejects the trial and removes input and frame ownership', async () => {
  const { browser, draw, project, trial } = await setupTrial()
  draw.mockImplementationOnce(() => {
    throw new Error('draw failed')
  })
  const run = trial.runShopTrial(project, { shopId: 0, money: 100 })
  const failed = expect(run).rejects.toThrow('draw failed')
  await waitForFrame(browser)
  await browser.frame()
  await failed
  expect(browser.frames.size).toBe(0)
  const key = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
  window.dispatchEvent(key)
  expect(key.defaultPrevented).toBe(false)
})
