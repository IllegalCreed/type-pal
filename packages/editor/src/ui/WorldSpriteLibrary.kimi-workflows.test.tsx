// @vitest-environment jsdom
/**
 * 大世界精灵真实资源工作流：proof 门控、用途创建、源帧追加、迟到读取、失败重试与删除撤销。
 * 与 C01 共享真实挂载宿主；等待实际 sprite/palette 和提交完成，不轮询点击或用延时猜完成。
 * 保留六例相邻工作流；其它测试的完整合同排重仍待核，不声明本片独占覆盖。
 */

import type { AssetId } from '@type-pal/content'
import { type FileSource, loadStandardPalette } from '@type-pal/reforge'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  type MountedWorldSpriteLibrary,
  mountWorldSpriteLibrary,
  unmountWorldSpriteLibrary,
  waitForWorldSpriteResource,
} from '../__tests__/cursor-asset-r1/world-sprite-harness.js'
import { sha256Hex } from '../core/binary-signature.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { loadEditorSprite } from '../core/sprite-assets.js'
import {
  buttonByLabel,
  clickButton,
  deepSnapshot,
  loadFilesIntoInput,
  setInputValue,
} from './__tests__/glm-ui-wave-kit.js'
import { type K02Project, loadK02Project } from './__tests__/kimi-editor-workflows/k02-fixtures.js'
import {
  atlasColors,
  gatedFileSource,
  installBrowserHardwarePorts,
  pngFileOf,
  solidAtlasPng,
} from './__tests__/kimi-editor-workflows/kit.js'

const STARTER_ASSET = 'sprite.generated.starter'
const STARTER_PATH = 'assets/generated/sprites/starter.rle'

let mounted: MountedWorldSpriteLibrary | undefined
let host: HTMLDivElement

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  installBrowserHardwarePorts()
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

async function mountLibrary(
  project: K02Project,
  input: {
    view?: 'definition' | 'asset'
    focus?: string
    source?: FileSource
    waitForResource?: boolean
  } = {},
): Promise<MountedWorldSpriteLibrary> {
  mounted = await mountWorldSpriteLibrary(project, input)
  host = mounted.host
  return mounted
}

function expectMeta(frames: number, consumers: number): void {
  expect(host.textContent).toContain(`${frames} 帧 · ${consumers} 个用途定义`)
}

async function selectAssetRow(asset: AssetId, waitForResource = true): Promise<void> {
  const row = [...host.querySelectorAll<HTMLElement>('.sprite-resource-row')].find(
    (candidate) => candidate.querySelector('.ds-catalog-row__meta')?.textContent === asset,
  )
  expect(row, `目录行 ${asset}`).toBeDefined()
  await act(async () => {
    row!.click()
  })
  if (waitForResource) await waitForWorldSpriteResource(mounted!, asset)
}

function layoutKindSelect(): HTMLButtonElement {
  const select = host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')
  expect(select, '布局类型 select').not.toBeNull()
  return select!
}

function framesPerDirField(): HTMLInputElement {
  const field = host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')
  expect(field, '每向帧数字段').not.toBeNull()
  return field!
}

function usageMenu(): HTMLElement {
  const menu = host.querySelector<HTMLElement>('[role="group"][aria-label="新增用途类型"]')
  expect(menu, '新增用途类型菜单').not.toBeNull()
  return menu!
}

describe('K02 WorldSpriteLibrary 真实资源 proof 工作流', () => {
  test('proof 绑定真实帧数：解码在途时编辑禁用；新增四向用途默认帧数取 floor(实际帧数/4)', async () => {
    const project = await loadK02Project('k02-lib-proof', [
      {
        asset: 'sprite.authored.k02six',
        label: 'K02Six',
        frameCount: 6,
        definitions: [
          {
            id: 'k02-six-user',
            label: 'K02SixUser',
            layout: { kind: 'static' },
          },
        ],
      },
    ])
    const seeded = project.seeded.get('sprite.authored.k02six')!
    const gate = gatedFileSource(project.source)
    const hold = gate.gate(seeded.path)
    const mounted = await mountLibrary(project, {
      focus: 'k02-six-user',
      source: gate.source,
      waitForResource: false,
    })

    // 在途见证：磁盘读取已进入未放行；proof 缺席 → 全部 proof 门控禁用。
    expect(gate.calls).toContain(seeded.path)
    expect(gate.completed).not.toContain(seeded.path)
    expect(host.textContent).toContain('正在解析帧资源 sprite.authored.k02six…')
    expect(buttonByLabel(host, '新建预制动作').disabled).toBe(true)
    expect(layoutKindSelect().disabled).toBe(true)
    expect(host.textContent).toContain('正在读取实际帧数；载入完成后可编辑。')
    await clickButton(host, '新增用途定义')
    expect(buttonByLabel(usageMenu(), '四向行走').disabled).toBe(true)
    await clickButton(host, '新增用途定义')

    // 放行 → 真实 proof 落地，门控解锁且帧数绑进文案。
    await act(async () => {
      hold.resolve()
      await Promise.all([
        loadEditorSprite(mounted.reader, 'sprite.authored.k02six'),
        loadStandardPalette(project.assetBase),
      ])
    })
    expectMeta(6, 1)
    expect(buttonByLabel(host, '新建预制动作').disabled).toBe(false)
    expect(layoutKindSelect().disabled).toBe(false)
    expect(host.textContent).toContain('默认显示源帧 #0；场景脚本仍可切换其它帧 · 源帧容器共 6 帧')

    // 新增四向用途：默认 framesPerDir = max(1, min(3, floor(6/4))) = 1，proof 实际帧数直接入库。
    await clickButton(host, '新增用途定义')
    expect(buttonByLabel(usageMenu(), '四向行走').disabled).toBe(false)
    await act(async () => {
      buttonByLabel(usageMenu(), '四向行走').click()
    })
    expect(host.textContent).toContain('初始布局：四向行走 · 源容器 6 帧；应用后才会写入项目。')
    const historyBefore = mounted.session.getHistoryVersion()
    await clickButton(host, '应用')
    const created = mounted.session.getState().sprites.find((entry) => entry.id === 'k02six-walk')
    expect(created).toBeDefined()
    expect(created).toEqual({
      id: 'k02six-walk',
      asset: 'sprite.authored.k02six',
      label: 'K02Six · 四向',
      layout: { kind: 'directional', framesPerDir: 1 },
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore + 1)
    expect(mounted.notices.at(-1)).toBeUndefined()
    assertProjectSaveValid(mounted.session.getState())

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().sprites.some((entry) => entry.id === 'k02six-walk')).toBe(
      false,
    )
    expect(mounted.session.getState().sprites.map((entry) => entry.id)).toEqual([
      'hero',
      'k02-six-user',
    ])
  })

  test('实际帧数不足 4 时四向入口禁用；默认定格用途经真实 proof 入库且不动 catalog/blob', async () => {
    const project = await loadK02Project('k02-lib-two', [
      {
        asset: 'sprite.authored.k02two',
        label: 'K02Two',
        frameCount: 2,
        definitions: [
          {
            id: 'k02-two-user',
            label: 'K02TwoUser',
            layout: { kind: 'static' },
          },
        ],
      },
    ])
    const mounted = await mountLibrary(project, { focus: 'k02-two-user' })
    expectMeta(2, 1)
    const catalogBefore = deepSnapshot(mounted.session.getState().assetCatalog)

    await clickButton(host, '新增用途定义')
    expect(buttonByLabel(usageMenu(), '四向行走').disabled).toBe(true)
    await act(async () => {
      buttonByLabel(usageMenu(), '默认定格').click()
    })
    expect(host.textContent).toContain('初始布局：默认定格 · 源容器 2 帧；应用后才会写入项目。')
    await clickButton(host, '应用')
    const created = mounted.session.getState().sprites.find((entry) => entry.id === 'k02two-static')
    expect(created).toEqual({
      id: 'k02two-static',
      asset: 'sprite.authored.k02two',
      label: 'K02Two · 默认定格',
      layout: { kind: 'static' },
    })
    // AddSpriteDefinitionCommand 只增定义：catalog 与 blob 零改动。
    expect(mounted.session.getState().assetCatalog).toEqual(catalogBefore)
    expect(mounted.session.getState().assetBlobs).toEqual({})
    assertProjectSaveValid(mounted.session.getState())

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().sprites.map((entry) => entry.id)).toEqual([
      'hero',
      'k02-two-user',
    ])
  })

  test('布局编辑与源帧追加串联：reader 重读后每向帧数上限绑新帧数，编辑继续可用，undo 全链还原', async () => {
    const project = await loadK02Project('k02-lib-reread', [])
    const mounted = await mountLibrary(project, { focus: 'hero' })
    expectMeta(12, 1)
    const heroBefore = deepSnapshot(
      mounted.session.getState().sprites.find((entry) => entry.id === 'hero')!,
    )
    const recordBefore = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!

    // 上限绑定真实解码帧数：floor(12/4)=3，草稿 4 触发范围错误反馈（零提交、错误留在字段上）。
    expect(framesPerDirField().value).toBe('3')
    expect(framesPerDirField().max).toBe('3')
    const history0 = mounted.session.getHistoryVersion()
    await setInputValue(framesPerDirField(), '4')
    expect(mounted.session.getHistoryVersion()).toBe(history0)
    expect(framesPerDirField().value).toBe('4')
    expect(framesPerDirField().title).toBe('不能大于 3。')
    expect(mounted.session.getState().sprites.find((entry) => entry.id === 'hero')?.layout).toEqual(
      { kind: 'directional', framesPerDir: 3 },
    )

    // 合法布局提交：UpdateSpriteCommand 带真实 proof 入库。
    await setInputValue(framesPerDirField(), '2')
    expect(mounted.session.getState().sprites.find((entry) => entry.id === 'hero')?.layout).toEqual(
      { kind: 'directional', framesPerDir: 2 },
    )
    expect(mounted.notices.at(-1)).toBeUndefined()

    // 经内嵌真实 viewer 追加 4 帧，跨过每向上限 3→4：catalog sha 改写，用途定义逐字段保全。
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await clickButton(host, '追加帧')
    const atlas = solidAtlasPng(8, 8, atlasColors(16).slice(10, 14))
    const bitmapRead = vi.spyOn(globalThis, 'createImageBitmap')
    await act(async () => {
      await loadFilesIntoInput(
        [
          ...host.querySelectorAll<HTMLInputElement>('input[type="file"].sprite-hidden-file-input'),
        ][1]!,
        [pngFileOf('追加四帧.png', atlas.bytes)],
      )
      const pending = bitmapRead.mock.results.at(-1)
      if (pending?.type !== 'return') throw new Error('PNG decode port did not return a promise')
      await pending.value
    })
    expect(host.textContent).toContain('将 32×8 图片切为')
    const panel = host.querySelector<HTMLElement>('.sprite-raw-append-panel')!
    await setInputValue(panel.querySelectorAll<HTMLInputElement>('input')[0]!, '4')
    await vi.waitFor(() => {
      expect(panel.textContent).toContain('4 帧，每帧 8×8')
    })
    await act(async () => {
      await clickButton(host, '确认追加')
      await vi.waitFor(() => {
        expect(confirm).toHaveBeenCalledWith('追加 4 帧会更新 1 个用途共享的源帧容器。继续吗？')
      })
      // 成功消息随 revision 重载被 viewer 清空；持久证据是状态栏通知与 catalog/字节。
      await vi.waitFor(() => {
        expect(mounted.notices.at(-1)).toEqual({
          kind: 'info',
          message: '追加源帧 ×4；可撤销。',
        })
      })
    })
    await waitForWorldSpriteResource(mounted, STARTER_ASSET)
    const recordAfter = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!
    expect(recordAfter.sha256).not.toBe(recordBefore.sha256)
    expect(recordAfter.path).toBe(`assets/authored/sprites/${recordAfter.sha256}.rle`)
    expect(mounted.session.getState().sprites.find((entry) => entry.id === 'hero')).toEqual({
      ...heroBefore,
      layout: { kind: 'directional', framesPerDir: 2 },
    })

    // reader 重读见证：proof 追踪新 sha（该等待在注入缺陷运行中同样成立，后续同步断言才见血）。
    await vi.waitFor(() => {
      expect(host.textContent).toContain('源帧容器共 16 帧')
    })
    expect(framesPerDirField().max).toBe('4')
    // 重读后的 proof 继续驱动编辑：sha 过期 proof 在此必然被命令层拒绝。
    await setInputValue(framesPerDirField(), '4')
    expect(mounted.session.getState().sprites.find((entry) => entry.id === 'hero')?.layout).toEqual(
      { kind: 'directional', framesPerDir: 4 },
    )
    expect(mounted.notices.at(-1)).toBeUndefined()

    // undo 全链还原：布局 → 追加（sha/字节）→ 布局。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().sprites.find((entry) => entry.id === 'hero')?.layout).toEqual(
      { kind: 'directional', framesPerDir: 2 },
    )
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
      recordBefore.sha256,
    )
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.path).toBe(STARTER_PATH)
    await waitForWorldSpriteResource(mounted, STARTER_ASSET)
    expect(host.textContent).toContain('源帧容器共 12 帧')
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().sprites.find((entry) => entry.id === 'hero')?.layout).toEqual(
      { kind: 'directional', framesPerDir: 3 },
    )
    assertProjectSaveValid(mounted.session.getState())
  })

  test('迟到磁盘读取归属：闸门内旧读取完成后不得盖掉已切换的新选择', async () => {
    const project = await loadK02Project('k02-lib-late', [
      {
        asset: 'sprite.authored.k02b',
        label: 'K02B',
        frameCount: 6,
        definitions: [{ id: 'k02-b-user', label: 'K02BUser', layout: { kind: 'static' } }],
      },
    ])
    const gate = gatedFileSource(project.source)
    const hold = gate.gate(STARTER_PATH)
    const mounted = await mountLibrary(project, {
      focus: 'hero',
      source: gate.source,
      waitForResource: false,
    })
    expect(gate.calls).toContain(STARTER_PATH)
    expect(gate.completed).not.toContain(STARTER_PATH)
    expect(host.textContent).toContain('正在解析帧资源 sprite.generated.starter…')
    expect(buttonByLabel(host, '新建预制动作').disabled).toBe(true)

    // 切到 B：B 的磁盘读取未设闸，真实解码交付 proof 并解锁编辑。
    await selectAssetRow('sprite.authored.k02b')
    expectMeta(6, 1)
    await clickButton(host, '用途')
    await vi.waitFor(() => {
      expect(host.textContent).toContain(
        '默认显示源帧 #0；场景脚本仍可切换其它帧 · 源帧容器共 6 帧',
      )
    })
    expect(buttonByLabel(host, '新建预制动作').disabled).toBe(false)

    // 放行迟到的 A：读取真实完成（退出见证），proof 归属已失效，界面保持 B。
    await act(async () => {
      hold.resolve()
      await Promise.all([
        loadEditorSprite(mounted.reader, STARTER_ASSET),
        loadStandardPalette(project.assetBase),
      ])
    })
    expect(gate.completed).toContain(STARTER_PATH)
    expect(host.textContent).toContain('6 帧 · 1 个用途定义')
    expect(host.textContent).toContain('源帧容器共 6 帧')
    expect(host.textContent).not.toContain('源帧容器共 12 帧')
    expect(mounted.notices.filter((notice) => notice?.kind === 'error')).toHaveLength(0)

    // 主动切回 A：迟到的读取已落真实缓存，proof 归 A 本人并解锁 A 的编辑。
    await selectAssetRow(STARTER_ASSET)
    expectMeta(12, 1)
    await clickButton(host, '用途')
    await vi.waitFor(() => {
      expect(host.textContent).toContain('4 向 × 3 帧 · 源帧容器共 12 帧')
    })
    expect(buttonByLabel(host, '新建预制动作').disabled).toBe(false)
  })

  test('磁盘字节损坏：真实解码失败 fail-loud 且编辑保持禁用；切走再切回真实重试', async () => {
    const project = await loadK02Project('k02-lib-bad', [
      {
        asset: 'sprite.authored.k02bad',
        label: 'K02Bad',
        frameCount: 4,
        definitions: [
          {
            id: 'k02-bad-user',
            label: 'K02BadUser',
            layout: { kind: 'static' },
          },
        ],
      },
    ])
    const seeded = project.seeded.get('sprite.authored.k02bad')!
    // 磁盘端口故障注入：装载完成后覆盖磁盘字节（内存项目保持合法），reader 无 pending blob 必读磁盘。
    project.disk.set(seeded.path, new ArrayBuffer(64))
    const gate = gatedFileSource(project.source)
    const failedRead = gate.gate(seeded.path)
    const mounted = await mountLibrary(project, {
      focus: 'k02-bad-user',
      source: gate.source,
      waitForResource: false,
    })

    const error = `bytes 登记 ${seeded.bytes.byteLength}，实际 64`
    const expectFailure = async (hold: ReturnType<typeof gate.gate>) => {
      await act(async () => {
        const pending = loadEditorSprite(mounted.reader, 'sprite.authored.k02bad')
        hold.resolve()
        await Promise.all([
          expect(pending).rejects.toThrow(error),
          loadStandardPalette(project.assetBase),
        ])
      })
      expect(host.querySelector('.sprite-resource-load-state.error')?.textContent).toContain(error)
    }
    await expectFailure(failedRead)
    expect(gate.calls).toContain(seeded.path)
    expect(gate.completed).toContain(seeded.path)
    expect(host.querySelector('.ds-object-hero__meta .ds-tag')?.textContent).toContain('加载失败')
    expect(buttonByLabel(host, '新建预制动作').disabled).toBe(true)
    expect(layoutKindSelect().disabled).toBe(true)
    expect(host.textContent).toContain('正在读取实际帧数；载入完成后可编辑。')
    expect(mounted.session.getHistoryVersion()).toBe(0)

    // 故障隔离：切到健康资源正常解码。
    await selectAssetRow(STARTER_ASSET)
    expectMeta(12, 1)
    expect(host.querySelector('.sprite-resource-load-state.error')).toBeNull()

    // 切回坏资源：失败 promise 已被真实缓存驱逐，重试再次落到磁盘端口。
    const callsBefore = gate.calls.filter((path) => path === seeded.path).length
    const retryRead = gate.gate(seeded.path)
    await selectAssetRow('sprite.authored.k02bad', false)
    await expectFailure(retryRead)
    expect(gate.calls.filter((path) => path === seeded.path).length).toBe(callsBefore + 1)
    expect(mounted.session.getHistoryVersion()).toBe(0)
  })

  test('删除未使用源资源：磁盘端口捕获 undo 字节，撤销后 catalog 与 blob 完整还原', async () => {
    const project = await loadK02Project('k02-lib-delete', [
      {
        asset: 'sprite.authored.k02free',
        label: 'K02Free',
        frameCount: 3,
        definitions: [],
      },
    ])
    const seeded = project.seeded.get('sprite.authored.k02free')!
    const mounted = await mountLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.k02free',
    })
    expectMeta(3, 0)
    // 无 pending blob：删除前的字节捕获必须走真实磁盘端口。
    expect(mounted.session.getState().assetBlobs[seeded.path]).toBeUndefined()

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await act(async () => {
      await clickButton(host, '删除源资源')
      await vi.waitFor(() => {
        expect(confirm).toHaveBeenCalledWith('永久移除未使用源资源“K02Free”？此操作可撤销。')
      })
      await vi.waitFor(() => {
        expect(
          mounted.session.getState().assetCatalog.assets['sprite.authored.k02free'],
        ).toBeUndefined()
      })
    })
    await waitForWorldSpriteResource(mounted, STARTER_ASSET)
    expect(mounted.session.getState().assetBlobs[seeded.path]).toBeUndefined()
    expect(mounted.notices.at(-1)).toEqual({
      kind: 'info',
      message: '未使用源资源已移除。',
    })

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    const restored = mounted.session.getState().assetCatalog.assets['sprite.authored.k02free']
    expect(restored).toBeDefined()
    expect(restored).toEqual(
      expect.objectContaining({
        kind: 'sprite',
        path: seeded.path,
        bytes: seeded.bytes.byteLength,
        sha256: seeded.sha256,
        origin: { kind: 'authored' },
      }),
    )
    const blob = mounted.session.getState().assetBlobs[seeded.path]
    expect(blob).toBeDefined()
    expect(await sha256Hex(blob!.slice(0))).toBe(seeded.sha256)
    assertProjectSaveValid(mounted.session.getState())
  })
})
