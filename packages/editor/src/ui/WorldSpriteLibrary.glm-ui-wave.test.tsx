// @vitest-environment jsdom
/**
 * 大世界精灵删除用途、pending blob 资产撤销、布局切换的相邻工作流。
 * 使用真实 viewer/reader/命令和共享宿主；其它测试的完整排重仍待核。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  type MountedWorldSpriteLibrary,
  mountWorldSpriteLibrary,
  unmountWorldSpriteLibrary,
  waitForWorldSpriteResource,
} from '../__tests__/cursor-asset-r1/world-sprite-harness.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { clickButton } from './__tests__/glm-ui-wave-kit.js'
import { loadK02Project } from './__tests__/kimi-editor-workflows/k02-fixtures.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'

const HERO_ASSET = 'sprite.generated.starter'
let mounted: MountedWorldSpriteLibrary | undefined

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  installBrowserHardwarePorts()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(async () => {
  try {
    if (mounted) await unmountWorldSpriteLibrary(mounted)
  } finally {
    mounted = undefined
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

async function mountLibrary(focus = 'hero-static', view: 'asset' | 'definition' = 'definition') {
  const project = await loadK02Project('glm-ui-wave-world', [
    {
      asset: 'sprite.raw',
      label: '未配置精灵帧',
      frameCount: 3,
      definitions: [],
    },
  ])
  const raw = project.seeded.get('sprite.raw')!
  // 磁盘端口故障：viewer/删除必须消费当前 pending blob，不能退回磁盘的损坏字节。
  project.disk.set(raw.path, new ArrayBuffer(1))
  project.state = {
    ...project.state,
    sprites: [
      ...project.state.sprites,
      {
        id: 'hero-static',
        label: '主角静止',
        asset: HERO_ASSET,
        layout: { kind: 'static' },
      },
    ],
    assetBlobs: { ...project.state.assetBlobs, [raw.path]: raw.bytes.slice(0) },
  }
  assertProjectSaveValid(project.state)
  mounted = await mountWorldSpriteLibrary(project, { focus, view })
  return { library: mounted, raw }
}

describe('U2b WorldSpriteLibrary 残差', () => {
  test('删除用途：确认后提交 RemoveSpriteDefinitionCommand，选择回落到兄弟用途', async () => {
    const { library } = await mountLibrary()
    const before = library.session.getHistoryVersion()
    await clickButton(library.host, '删除用途')
    expect(library.session.getState().sprites.map((entry) => entry.id)).toEqual(['hero'])
    expect(library.session.getHistoryVersion()).toBe(before + 1)
    expect(library.host.querySelector('.insp-head .who')?.textContent).toBe(
      library.project.state.sprites.find((entry) => entry.id === 'hero')!.label,
    )
    await act(async () => {
      expect(library.session.undo()).toBe(true)
    })
    await waitForWorldSpriteResource(library, HERO_ASSET)
    expect(library.session.getState().sprites.map((entry) => entry.id)).toEqual([
      'hero',
      'hero-static',
    ])
  })

  test('删除未使用源资源：catalog 记录与孤立 blob 一并清理，undo 连 bytes 一起恢复', async () => {
    const { library, raw } = await mountLibrary('sprite.raw', 'asset')
    expect(new Uint8Array(library.session.getState().assetBlobs[raw.path]!)).toEqual(
      new Uint8Array(raw.bytes),
    )
    await act(async () => {
      await clickButton(library.host, '删除源资源')
      await vi.waitFor(() => {
        expect(library.notices.at(-1)).toEqual({
          kind: 'info',
          message: '未使用源资源已移除。',
        })
      })
    })
    await waitForWorldSpriteResource(library, HERO_ASSET)
    expect(library.session.getState().assetCatalog.assets['sprite.raw']).toBeUndefined()
    expect(library.session.getState().assetBlobs[raw.path]).toBeUndefined()
    await act(async () => {
      expect(library.session.undo()).toBe(true)
    })
    expect(library.session.getState().assetCatalog.assets['sprite.raw']).toEqual(
      library.project.state.assetCatalog.assets['sprite.raw'],
    )
    expect(new Uint8Array(library.session.getState().assetBlobs[raw.path]!)).toEqual(
      new Uint8Array(raw.bytes),
    )
    assertProjectSaveValid(library.session.getState())
  })

  test('布局类型切换提交 UpdateSpriteCommand：directional ↔ static', async () => {
    const { library } = await mountLibrary()
    const trigger = library.host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')!
    await act(async () => trigger.click())
    const listbox = document.getElementById(trigger.getAttribute('aria-controls')!)!
    const option = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('四向行走'),
    )
    expect(option, '四向行走 option').not.toBeNull()
    await act(async () => option!.click())
    expect(
      library.session.getState().sprites.find((entry) => entry.id === 'hero-static')?.layout,
    ).toEqual({ kind: 'directional', framesPerDir: 3 })
    await act(async () => {
      expect(library.session.undo()).toBe(true)
    })
    expect(
      library.session.getState().sprites.find((entry) => entry.id === 'hero-static')?.layout,
    ).toEqual({ kind: 'static' })
  })
})
