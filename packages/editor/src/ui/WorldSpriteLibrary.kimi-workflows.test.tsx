// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K02：WorldSpriteLibrary 真实资源 proof 工作流补测。
 *
 * 旧 file/title → 已证合同 → 本组缺口：
 * - WorldSpriteLibrary.test.tsx 全程 vi.mock SpriteResourceViewer（固定 proof actualFrameCount=20）
 *   与 SpriteUploadWizard，assetReader/assetBase 为 {} as never。已证：引用快照 checking/stale/
 *   failed 与索引缺失 fail-closed（L267/L283/L295）、live 索引失败保留定义（L320）、canonical
 *   新增引用阻断删除（L342）、动作弹窗路由与深链（L381/L421/L460/L496）、dispatch noop 回灌草稿
 *   （L519）、mock proof 下布局提交失败回灌与恢复（L546）、筛选/搜索/目录行（L602/L638/L665）、
 *   深链聚焦与 tab 停靠（L680/L738/L779/L810/L843）、引用页行为（L849/L889/L967/L1043/L1125/L1151）、
 *   「未配置源文件直接显示全部原始帧，并能基于解码证明新增用途」（L704，mock proof）。
 *   未证：proof 来自真实解码链（reader→SpriteAssetCache→磁盘字节 sha/gzip 校验）、
 *   actualFrameCount 绑进四向入口禁用/默认 framesPerDir/每向帧数上限、帧编辑后 reader 重读。
 * - WorldSpriteLibrary.glm-ui-wave.test.tsx 同样 mock viewer（proof=20）：已证删除用途提交与
 *   选择回落+undo（L209）、删除未使用源资源 catalog+blob 清理+undo（L234，reader 真实但走
 *   pending blob 臂）、布局类型 directional↔static 切换+undo（L251）。
 *   未证：删除源资源的磁盘读取臂（无 pending blob 时 readBytes 落盘捕获 undo 字节）。
 * - core/sprite-commands.glm-boundaries.test.ts 已证命令级边界（过期证明恰抛/消费者漂移/缩帧修复），
 *   本组不复制命令层断言，全部经组件 DOM 入口驱动。
 *
 * 姿势编辑对话框（SpriteActionEditorDialog）属 K03 目标；本组只到「proof 门控按钮」为止。
 * 唯一替身：kit 浏览器硬件端口与 gatedFileSource 磁盘闸门；失败注入只允许改写内存磁盘字节
 * （磁盘端口故障），内存项目状态保持装载时合法。
 */

import type { AssetId } from '@type-pal/content'
import type { AssetBase, FileSource } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  buttonByLabel,
  clickButton,
  deepSnapshot,
  loadFilesIntoInput,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { type K02Project, loadK02Project } from './__tests__/kimi-editor-workflows/k02-fixtures.js'
import {
  atlasColors,
  gatedFileSource,
  installBrowserHardwarePorts,
  pngFileOf,
  solidAtlasPng,
} from './__tests__/kimi-editor-workflows/kit.js'
import { WorldSpriteLibrary } from './WorldSpriteLibrary.js'

const STARTER_ASSET = 'sprite.generated.starter'
const STARTER_PATH = 'assets/generated/sprites/starter.rle'

type Notice = { kind: 'info' | 'error'; message: string } | undefined

interface MountedLibrary {
  project: K02Project
  session: EditSession
  reader: EditorAssetReader
  notices: Notice[]
}

function Harness(props: {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  initialView: 'definition' | 'asset'
  initialFocus?: string
  notices: Notice[]
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [view, setView] = useState<'definition' | 'asset'>(props.initialView)
  const [focus, setFocus] = useState<string | undefined>(props.initialFocus)
  return (
    <WorldSpriteLibrary
      definitions={current.sprites}
      catalog={current.assetCatalog}
      assetBase={props.assetBase}
      assetReader={props.reader}
      session={props.session}
      tabBar={null}
      view={view}
      focusObjectId={focus}
      onViewChange={(next, objectId) => {
        setView(next)
        setFocus(objectId)
      }}
      onObjectFocus={setFocus}
      onBattleDomain={() => undefined}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      onStatusNotice={(notice) => props.notices.push(notice)}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** 挂载完整真实 WorldSpriteLibrary（内嵌真实 SpriteResourceViewer/命令/reader 链）。 */
async function mountLibrary(
  project: K02Project,
  input: { view?: 'definition' | 'asset'; focus?: string; source?: FileSource } = {},
): Promise<MountedLibrary> {
  const session = new EditSession(project.state)
  const reader = createEditorAssetReader(input.source ?? project.source, () => session.getState())
  const notices: Notice[] = []
  await act(async () => {
    root.render(
      <Harness
        session={session}
        assetBase={project.assetBase}
        reader={reader}
        initialView={input.view ?? 'definition'}
        initialFocus={input.focus}
        notices={notices}
      />,
    )
    await Promise.resolve()
  })
  return { project, session, reader, notices }
}

async function waitMeta(frames: number, consumers: number): Promise<void> {
  await vi.waitFor(() => {
    expect(host.textContent).toContain(`${frames} 帧 · ${consumers} 个用途定义`)
  })
}

async function selectAssetRow(asset: AssetId): Promise<void> {
  await vi.waitFor(() => {
    const row = [...host.querySelectorAll<HTMLElement>('.sprite-resource-row')].find(
      (candidate) => candidate.querySelector('.ds-catalog-row__meta')?.textContent === asset,
    )
    expect(row, `目录行 ${asset}`).toBeDefined()
    row!.click()
  })
  await act(async () => Promise.resolve())
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
        definitions: [{ id: 'k02-six-user', label: 'K02SixUser', layout: { kind: 'static' } }],
      },
    ])
    const seeded = project.seeded.get('sprite.authored.k02six')!
    const gate = gatedFileSource(project.source)
    const hold = gate.gate(seeded.path)
    const mounted = await mountLibrary(project, { focus: 'k02-six-user', source: gate.source })

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
    hold.resolve()
    await waitMeta(6, 1)
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
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyBefore)
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
        definitions: [{ id: 'k02-two-user', label: 'K02TwoUser', layout: { kind: 'static' } }],
      },
    ])
    const mounted = await mountLibrary(project, { focus: 'k02-two-user' })
    await waitMeta(2, 1)
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
    await waitMeta(12, 1)
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

    // 经内嵌真实 viewer 追加 2 帧：catalog sha 改写，用途定义逐字段保全。
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await clickButton(host, '追加帧')
    const atlas = solidAtlasPng(8, 8, [atlasColors(16)[10]!, atlasColors(16)[11]!])
    await loadFilesIntoInput(
      [
        ...host.querySelectorAll<HTMLInputElement>('input[type="file"].sprite-hidden-file-input'),
      ][1]!,
      [pngFileOf('追加两帧.png', atlas.bytes)],
    )
    await vi.waitFor(() => {
      expect(host.textContent).toContain('将 16×8 图片切为')
    })
    const panel = host.querySelector<HTMLElement>('.sprite-raw-append-panel')!
    await setInputValue(panel.querySelectorAll<HTMLInputElement>('input')[0]!, '2')
    await vi.waitFor(() => {
      expect(panel.textContent).toContain('2 帧，每帧 8×8')
    })
    await clickButton(host, '确认追加')
    await vi.waitFor(() => {
      expect(confirm).toHaveBeenCalledWith('追加 2 帧会更新 1 个用途共享的源帧容器。继续吗？')
    })
    // 成功消息随 revision 重载被 viewer 清空；持久证据是状态栏通知与 catalog/字节。
    await vi.waitFor(() => {
      expect(mounted.notices.at(-1)).toEqual({ kind: 'info', message: '追加源帧 ×2；可撤销。' })
    })
    const recordAfter = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!
    expect(recordAfter.sha256).not.toBe(recordBefore.sha256)
    expect(recordAfter.path).toBe(`assets/authored/sprites/${recordAfter.sha256}.rle`)
    expect(mounted.session.getState().sprites.find((entry) => entry.id === 'hero')).toEqual({
      ...heroBefore,
      layout: { kind: 'directional', framesPerDir: 2 },
    })

    // reader 重读见证：proof 追踪新 sha（该等待在注入缺陷运行中同样成立，后续同步断言才见血）。
    await vi.waitFor(() => {
      expect(host.textContent).toContain('源帧容器共 14 帧')
    })
    expect(framesPerDirField().max).toBe('3')
    // 重读后的 proof 继续驱动编辑：sha 过期 proof 在此必然被命令层拒绝。
    await setInputValue(framesPerDirField(), '3')
    expect(mounted.session.getState().sprites.find((entry) => entry.id === 'hero')?.layout).toEqual(
      { kind: 'directional', framesPerDir: 3 },
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
    await vi.waitFor(() => {
      expect(host.textContent).toContain('源帧容器共 12 帧')
    })
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
    const mounted = await mountLibrary(project, { focus: 'hero', source: gate.source })
    expect(gate.calls).toContain(STARTER_PATH)
    expect(gate.completed).not.toContain(STARTER_PATH)
    expect(host.textContent).toContain('正在解析帧资源 sprite.generated.starter…')
    expect(buttonByLabel(host, '新建预制动作').disabled).toBe(true)

    // 切到 B：B 的磁盘读取未设闸，真实解码交付 proof 并解锁编辑。
    await selectAssetRow('sprite.authored.k02b')
    await waitMeta(6, 1)
    await clickButton(host, '用途')
    await vi.waitFor(() => {
      expect(host.textContent).toContain(
        '默认显示源帧 #0；场景脚本仍可切换其它帧 · 源帧容器共 6 帧',
      )
    })
    expect(buttonByLabel(host, '新建预制动作').disabled).toBe(false)

    // 放行迟到的 A：读取真实完成（退出见证），proof 归属已失效，界面保持 B。
    hold.resolve()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(gate.completed).toContain(STARTER_PATH)
    expect(host.textContent).toContain('6 帧 · 1 个用途定义')
    expect(host.textContent).toContain('源帧容器共 6 帧')
    expect(host.textContent).not.toContain('源帧容器共 12 帧')
    expect(mounted.notices.filter((notice) => notice?.kind === 'error')).toHaveLength(0)

    // 主动切回 A：迟到的读取已落真实缓存，proof 归 A 本人并解锁 A 的编辑。
    await selectAssetRow(STARTER_ASSET)
    await waitMeta(12, 1)
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
        definitions: [{ id: 'k02-bad-user', label: 'K02BadUser', layout: { kind: 'static' } }],
      },
    ])
    const seeded = project.seeded.get('sprite.authored.k02bad')!
    // 磁盘端口故障注入：装载完成后覆盖磁盘字节（内存项目保持合法），reader 无 pending blob 必读磁盘。
    project.disk.set(seeded.path, new ArrayBuffer(64))
    const gate = gatedFileSource(project.source)
    const mounted = await mountLibrary(project, { focus: 'k02-bad-user', source: gate.source })

    await vi.waitFor(() => {
      expect(host.querySelector('.sprite-resource-load-state.error')?.textContent).toContain(
        '帧资源加载失败：',
      )
    })
    expect(gate.calls).toContain(seeded.path)
    expect(gate.completed).toContain(seeded.path)
    expect(host.querySelector('.ds-object-hero__meta .ds-tag')?.textContent).toContain('加载失败')
    expect(buttonByLabel(host, '新建预制动作').disabled).toBe(true)
    expect(layoutKindSelect().disabled).toBe(true)
    expect(host.textContent).toContain('正在读取实际帧数；载入完成后可编辑。')
    expect(mounted.session.getHistoryVersion()).toBe(0)

    // 故障隔离：切到健康资源正常解码。
    await selectAssetRow(STARTER_ASSET)
    await waitMeta(12, 1)
    expect(host.querySelector('.sprite-resource-load-state.error')).toBeNull()

    // 切回坏资源：失败 promise 已被真实缓存驱逐，重试再次落到磁盘端口。
    const callsBefore = gate.calls.filter((path) => path === seeded.path).length
    await selectAssetRow('sprite.authored.k02bad')
    await vi.waitFor(() => {
      expect(host.querySelector('.sprite-resource-load-state.error')).not.toBeNull()
    })
    expect(gate.calls.filter((path) => path === seeded.path).length).toBe(callsBefore + 1)
    expect(mounted.session.getHistoryVersion()).toBe(0)
  })

  test('删除未使用源资源：磁盘端口捕获 undo 字节，撤销后 catalog 与 blob 完整还原', async () => {
    const project = await loadK02Project('k02-lib-delete', [
      { asset: 'sprite.authored.k02free', label: 'K02Free', frameCount: 3, definitions: [] },
    ])
    const seeded = project.seeded.get('sprite.authored.k02free')!
    const mounted = await mountLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.k02free',
    })
    await waitMeta(3, 0)
    // 无 pending blob：删除前的字节捕获必须走真实磁盘端口。
    expect(mounted.session.getState().assetBlobs[seeded.path]).toBeUndefined()

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await clickButton(host, '删除源资源')
    await vi.waitFor(() => {
      expect(confirm).toHaveBeenCalledWith('永久移除未使用源资源“K02Free”？此操作可撤销。')
    })
    await vi.waitFor(() => {
      expect(
        mounted.session.getState().assetCatalog.assets['sprite.authored.k02free'],
      ).toBeUndefined()
    })
    expect(mounted.session.getState().assetBlobs[seeded.path]).toBeUndefined()
    expect(mounted.notices.at(-1)).toEqual({ kind: 'info', message: '未使用源资源已移除。' })

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
