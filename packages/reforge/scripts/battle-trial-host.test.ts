// @vitest-environment jsdom
import { Blob as StreamBlob } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import { loadCurrentProjectFrom, loadStandardPalette, prepareBattleTrial } from '@type-pal/reforge'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../../editor/src/core/__tests__/battle-trial-project.js'
import {
  parseBattleSimulatorLibrary,
  resolveBattleSimulatorPlan,
} from '../../editor/src/core/battle-simulator-library.js'
import { prepareBattleSpriteReadiness } from '../src/battle/battle-sprite-readiness.js'
import { runBattleTrial } from '../src/battle-trial-host.js'

const probes = vi.hoisted(() => ({ prepare: vi.fn(), store: vi.fn() }))
vi.mock('../src/battle-trial-assets.js', async (original) => ({
  ...(await original<typeof import('../src/battle-trial-assets.js')>()),
  prepareBattleTrialAssets: probes.prepare,
}))
vi.mock('../src/save/store.js', () => ({
  MemorySaveStore: class {
    constructor() {
      probes.store('memory')
      throw Error('normal save forbidden')
    }
  },
  IndexedDbSaveStore: class {
    constructor() {
      probes.store('idb')
      throw Error('normal save forbidden')
    }
  },
}))
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('Blob', StreamBlob)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 7),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('indexedDB', {
    open: vi.fn(() => {
      throw Error('normal storage forbidden')
    }),
  })
  document.body.innerHTML = '<canvas id="screen"></canvas>'
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    {} as CanvasRenderingContext2D,
  )
})
afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function fixture() {
  const files = await battleTrialProjectFiles(),
    project = await loadCurrentProjectFrom(fixtureSource(files))
  const config = resolveBattleSimulatorPlan(
    parseBattleSimulatorLibrary(files['editor/battle-simulator.json']),
    'basic',
  )
  const prepared = prepareBattleTrial(config, project)
  const readiness = await prepareBattleSpriteReadiness({
    cache: project.battleSpriteCache,
    reader: project.assetResolver,
    definitionsById: project.battleSpritesById,
    party: prepared.world.party,
    actorsById: project.actorsById,
    itemsById: prepared.items,
    playerSkillIds: prepared.players.map((p) => p.skills),
    cooperativeSkillIds: [],
    skillsById: project.skills,
    enemyDefs: prepared.enemySlots.filter((e) => e !== null),
    enemiesById: project.enemiesById,
  })
  const loaded = {
    project,
    prepared,
    baseSounds: [],
    portraits: new Map(),
    cursorFrames: [],
    dispose: vi.fn(),
    assets: {
      palette: await loadStandardPalette(project.assetBase),
      glyphs: new Map(),
      ui: { scroll: { tiles: [] } },
      battleSprites: readiness.byDefinitionId,
      playerBaseDefinitionIds: readiness.playerBaseDefinitionIds,
    },
  }
  return { project, config, loaded }
}
const button = (name: string) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent === name)!
test('real host enters BattleSession, rejects F5/F9 and releases its run without constructing any SaveStore', async () => {
  const { project, config, loaded } = await fixture()
  probes.prepare.mockResolvedValue(loaded)
  const controller = new AbortController(),
    result = vi.fn(),
    restart = vi.fn()
  const before = structuredClone(config)
  const storage = vi.spyOn(Storage.prototype, 'setItem')
  const running = runBattleTrial(project, config, {
    signal: controller.signal,
    sourceToken: 'absent',
    revision: 'x',
    onResult: result,
    onRestart: restart,
  })
  await vi.waitFor(() =>
    expect(document.querySelector('[role=status]')?.textContent).toContain('战斗中'),
  )
  expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
  for (const key of ['F5', 'F9']) {
    const event = new KeyboardEvent('keydown', { key, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(document.querySelector('[role=status]')?.textContent).toContain('不提供存档/读档')
  }
  button('停止试打').click()
  await running
  expect(document.querySelector('[role=status]')?.textContent).toContain('已停止')
  expect(button('停止试打').disabled).toBe(true)
  expect(button('重新试打').disabled).toBe(false)
  button('重新试打').click()
  expect(restart).toHaveBeenCalledTimes(1)
  expect(cancelAnimationFrame).toHaveBeenCalledWith(7)
  expect(loaded.dispose).toHaveBeenCalled()
  expect(result).not.toHaveBeenCalled()
  expect(probes.store).not.toHaveBeenCalled()
  expect(indexedDB.open).not.toHaveBeenCalled()
  expect(storage).not.toHaveBeenCalled()
  expect(config).toEqual(before)
  const after = new KeyboardEvent('keydown', { key: 'F5', cancelable: true })
  window.dispatchEvent(after)
  expect(after.defaultPrevented).toBe(false) // 本场监听已解绑。
})
test('cancel while resource preparation is entered settles before late preparation can start a session', async () => {
  const { project, config, loaded } = await fixture()
  let release!: (value: typeof loaded) => void
  probes.prepare.mockImplementation(
    () =>
      new Promise((yes) => {
        release = yes
      }),
  )
  const result = vi.fn()
  const running = runBattleTrial(project, config, {
    signal: new AbortController().signal,
    sourceToken: 'absent',
    revision: 'x',
    onResult: result,
    onRestart() {},
  })
  expect(probes.prepare).toHaveBeenCalledTimes(1)
  button('停止试打').click()
  await running
  release(loaded)
  await Promise.resolve()
  expect(requestAnimationFrame).not.toHaveBeenCalled()
  expect(document.querySelector('[role=status]')?.textContent).toContain('已停止')
  expect(probes.store).not.toHaveBeenCalled()
  expect(result).not.toHaveBeenCalled()
})
test('failed preparation exposes error and restart controls, never a fake victory or save access', async () => {
  const { project, config } = await fixture()
  probes.prepare.mockRejectedValue(new Error('资源摘要不符'))
  await runBattleTrial(project, config, {
    signal: new AbortController().signal,
    sourceToken: 'absent',
    revision: 'x',
    onRestart() {},
  })
  expect(document.querySelector('[role=alert]')?.textContent).toContain('资源摘要不符')
  expect(button('重新试打').disabled).toBe(false)
  expect(requestAnimationFrame).not.toHaveBeenCalled()
  expect(probes.store).not.toHaveBeenCalled()
})

test('a second audio backend construction failure releases the first allocated context', async () => {
  const { project, config, loaded } = await fixture()
  probes.prepare.mockResolvedValue(loaded)
  let created = 0
  const close = vi.fn(async () => {})
  const descriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext')
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    value: class {
      state = 'running'
      constructor() {
        if (++created === 2) throw new Error('音频后端创建失败')
      }
      close = close
    },
  })
  try {
    await runBattleTrial(project, config, {
      signal: new AbortController().signal,
      sourceToken: 'absent',
      revision: 'x',
      onRestart() {},
    })
    expect(created).toBe(2)
    expect(close).toHaveBeenCalledTimes(1)
    expect(loaded.dispose).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[role=alert]')?.textContent).toContain('音频后端创建失败')
    expect(probes.store).not.toHaveBeenCalled()
  } finally {
    if (descriptor) Object.defineProperty(window, 'AudioContext', descriptor)
    else Reflect.deleteProperty(window, 'AudioContext')
  }
})
