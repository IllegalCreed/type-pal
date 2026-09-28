// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K03：SpriteActionEditor 合法动作 pose 工作流补测。
 *
 * 旧断言去重（只登记缺口，不复制）：
 * - SpriteActionEditor.test.tsx：
 *   - 'disables continuous action fields until the layout proof is ready' → proof 缺席禁用名称/停留字段，已证。
 *   - 'dispatch noop resyncs the field and a later valid definition commits once' → dispatch 拒收（定义漂移）
 *     重同步 + 恢复后单次提交，已证。
 *   - 'cancels same-valued object drafts and commits name or duration once' → 名称/停留草稿提交、Escape 取消、
 *     undo/redo 字段值，已证。
 *   - '[reorder-family:sprite-actions] step reorder keeps loopFrom...' → 键盘重排步骤保持 loopFrom、合法 drop
 *     追加、三类非法 drop 零提交 + 错误提示，已证。
 *   未证：新建/删除/动作重排/循环控件/步骤插入删除的 loopFrom 迁移/追加按钮落到实际 session 终态与 undo。
 * - SpriteActionEditorDialog.test.tsx（真实内嵌本组件，走 dialog 的 onCommitPoses 覆盖路径）：
 *   referenceStatus checking/stale/failed 禁删、provider 失败与实时引用阻断（alert + 零历史）、create 模式
 *   取消/脏草稿/确认一次命令/连续编辑/外部漂移/proof 丢失、过滤态后移一次命令 + undo、删除焦点落位
 *   （未断 session poses 终态）、窄屏与虚拟化——已证，不重复。
 *   未证：standalone commitPoses 直发真实 UpdateSpriteCommand 的添加/删除/重排 session 终态、confirm 取消侧
 *   零提交、删空后 poses→undefined、循环播放/循环起点控件链、insertStep/removeStep 的 loopFrom 迁移、
 *   追加按钮两入口、真实引用边（实体页 animation）的横幅 + 查看引用 wiring、同步音效 cue 增改删。
 * 本文件全部走真实 EditSession/UpdateSpriteCommand/EditorAssetReader/真实引用索引与合法空白项目，
 * proof 来自 starter 精灵真实解码；唯一替身是浏览器硬件端口（kit.installBrowserHardwarePorts）。
 */
import type { SpriteActionDef, SpriteDef } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import {
  AddEntityCommand,
  type SpriteLayoutEditProof,
  UpdateSpriteCommand,
  UpsertAssetCommand,
} from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { loadEditorSprite } from '../core/sprite-assets.js'
import {
  buttonByLabel,
  chooseComboboxOption,
  clickButton,
  clickCheckboxByLabel,
  deepSnapshot,
  fieldControlByLabel,
  loadLegalUiProject,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { DsInspectorHost } from './design-system/index.js'
import { SpriteActionEditor } from './SpriteActionEditor.js'
import type { SpriteFrameView } from './SpriteFrameWorkbench.js'

const HERO = 'hero'
const STARTER_ASSET = 'sprite.generated.starter'

type Poses = Record<string, SpriteActionDef>
type Notice = { kind: 'info' | 'error'; message: string } | undefined

interface Mounted {
  session: EditSession
  source: FileSource
  proof: SpriteLayoutEditProof
  frameCount: number
  notices: Notice[]
  mutations: Array<{ ok: boolean; reason?: unknown }>
  openedReferences: string[]
  selections: Array<string | undefined>
  rerender: (selectedSourceFrame: number) => Promise<void>
}

function Harness(props: {
  session: EditSession
  proof: SpriteLayoutEditProof
  frames: readonly SpriteFrameView[]
  selectedSourceFrame: number
  notices: Notice[]
  mutations: Mounted['mutations']
  openedReferences: string[]
  selections: Array<string | undefined>
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const definition = current.sprites.find((sprite) => sprite.id === HERO)!
  const [selected, setSelected] = useState<string | undefined>(undefined)
  // 与 WorldSpriteLibrary 同款的当前引用口径：真实索引 → world-sprite 边 → 动作用途过滤。
  const references = collectCurrentProjectReferenceIndex(current)
    .referencesTo({ kind: 'world-sprite', id: definition.id })
    .filter((edge) => edge.relation.kind === 'world-sprite-action-use')
  return (
    <DsInspectorHost>
      <SpriteActionEditor
        definition={definition}
        catalog={current.assetCatalog}
        proof={props.proof}
        frames={props.frames}
        selectedSourceFrame={props.selectedSourceFrame}
        references={references}
        referenceStatus="current"
        getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
        session={props.session}
        selectedActionId={selected}
        onSelectedActionChange={(id) => {
          props.selections.push(id)
          setSelected(id)
        }}
        onOpenReferences={(id) => props.openedReferences.push(id)}
        onMutationResult={(result) => props.mutations.push(result)}
        onStatusNotice={(notice) => props.notices.push(notice)}
      />
    </DsInspectorHost>
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

async function mountEditor(selectedSourceFrame = 2): Promise<Mounted> {
  const legal = await loadLegalUiProject('kimi-k03-action-editor')
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  // proof 必须来自真实解码：record.sha256 与帧数都是当前 catalog/字节的事实。
  const record = reader.record(STARTER_ASSET, 'sprite')
  const decoded = await loadEditorSprite(reader, STARTER_ASSET)
  const proof: SpriteLayoutEditProof = {
    asset: STARTER_ASSET,
    sha256: record.sha256,
    actualFrameCount: decoded.frames.length,
  }
  expect(proof.actualFrameCount).toBeGreaterThanOrEqual(3)
  const frames: SpriteFrameView[] = decoded.frames.map((frame) => ({
    canvas: undefined,
    width: frame.width,
    height: frame.height,
  }))
  const mounted: Mounted = {
    session,
    source: legal.source,
    proof,
    frameCount: decoded.frames.length,
    notices: [],
    mutations: [],
    openedReferences: [],
    selections: [],
    rerender: async (nextFrame) => {
      await act(async () => {
        root.render(
          <Harness
            session={session}
            proof={proof}
            frames={frames}
            selectedSourceFrame={nextFrame}
            notices={mounted.notices}
            mutations={mounted.mutations}
            openedReferences={mounted.openedReferences}
            selections={mounted.selections}
          />,
        )
        await Promise.resolve()
      })
    },
  }
  await mounted.rerender(selectedSourceFrame)
  return mounted
}

/** 真实命令播种：当前 proof 下的合法 poses 直发 UpdateSpriteCommand（act 内dispatch）。 */
async function seedPoses(mounted: Mounted, poses: Poses): Promise<void> {
  await act(async () => {
    expect(
      mounted.session.dispatch(
        new UpdateSpriteCommand(
          HERO,
          { poses },
          mounted.proof,
          collectCurrentProjectReferenceIndex,
        ),
      ),
    ).toBe(true)
  })
}

function heroPoses(mounted: Mounted): Poses | undefined {
  return mounted.session.getState().sprites.find((sprite) => sprite.id === HERO)?.poses
}

function heroSprite(mounted: Mounted): SpriteDef {
  return mounted.session.getState().sprites.find((sprite) => sprite.id === HERO)!
}

async function undo(mounted: Mounted): Promise<void> {
  await act(async () => {
    expect(mounted.session.undo()).toBe(true)
  })
}

async function redo(mounted: Mounted): Promise<void> {
  await act(async () => {
    expect(mounted.session.redo()).toBe(true)
  })
}

/** 真实 RIFF/WAVE PCM16 单声道字节（cue 选择只需真实 catalog 记录；字节本身可解码）。 */
function wavPcm16Mono(samples: readonly number[], sampleRate = 8000): Uint8Array {
  const dataSize = samples.length * 2
  const bytes = new Uint8Array(44 + dataSize)
  const view = new DataView(bytes.buffer)
  const writeAscii = (at: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1)
      view.setUint8(at + index, text.charCodeAt(index))
  }
  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, dataSize, true)
  samples.forEach((sample, index) => {
    view.setInt16(44 + index * 2, sample, true)
  })
  return bytes
}

/** 真实命令登记音效资源：真实字节 + 真实 sha256，UpsertAssetCommand 入 pending blob。 */
async function seedSound(mounted: Mounted, asset: string, label: string, samples: number[]) {
  const wav = wavPcm16Mono(samples)
  const sha256 = await sha256Hex(wav)
  await act(async () => {
    expect(
      mounted.session.dispatch(
        new UpsertAssetCommand(
          asset,
          {
            kind: 'sound',
            path: `assets/authored/sounds/${sha256}.wav`,
            mediaType: 'audio/wav',
            bytes: wav.byteLength,
            sha256,
            label,
            origin: { kind: 'authored' },
          },
          wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer,
        ),
      ),
    ).toBe(true)
  })
  return { sha256, bytes: wav.byteLength }
}

describe('K03 SpriteActionEditor 合法动作 pose 工作流', () => {
  test('空用途连续新建两个动作落到实际 session（越界已选回退帧 0），undo/redo 对称', async () => {
    const mounted = await mountEditor(2)
    expect(heroPoses(mounted)).toBeUndefined()
    expect(host.textContent).toContain('尚无预制动作。新建后可从源帧选择区添加动作步骤。')

    const historyBefore = mounted.session.getHistoryVersion()
    await clickButton(host, '新建预制动作')
    expect(heroPoses(mounted)).toEqual({
      action: { label: '动作 1', order: 0, steps: [{ frame: 2, durationMs: 250 }] },
    })
    expect(mounted.selections.at(-1)).toBe('action')
    expect(mounted.mutations).toEqual([{ ok: true }])
    expect(mounted.notices.at(-1)).toBeUndefined()
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore + 1)
    assertProjectSaveValid(mounted.session.getState())

    // 已选源帧越界（-1）时新建回退帧 0；nextSpriteActionId 取空闲后缀 action-2。
    await mounted.rerender(-1)
    await clickButton(host, '新建预制动作')
    expect(heroPoses(mounted)).toEqual({
      action: { label: '动作 1', order: 0, steps: [{ frame: 2, durationMs: 250 }] },
      'action-2': { label: '动作 2', order: 1, steps: [{ frame: 0, durationMs: 250 }] },
    })
    expect(mounted.selections.at(-1)).toBe('action-2')
    expect(mounted.mutations).toEqual([{ ok: true }, { ok: true }])
    assertProjectSaveValid(mounted.session.getState())

    await undo(mounted)
    expect(heroPoses(mounted)).toEqual({
      action: { label: '动作 1', order: 0, steps: [{ frame: 2, durationMs: 250 }] },
    })
    await undo(mounted)
    expect(heroPoses(mounted)).toBeUndefined()
    await redo(mounted)
    await redo(mounted)
    expect(heroPoses(mounted)).toEqual({
      action: { label: '动作 1', order: 0, steps: [{ frame: 2, durationMs: 250 }] },
      'action-2': { label: '动作 2', order: 1, steps: [{ frame: 0, durationMs: 250 }] },
    })
  })

  test('删除动作：confirm 取消零提交；确认后剩余 order 重排并逐个删空为 undefined，undo/redo 对称', async () => {
    const mounted = await mountEditor(2)
    await seedPoses(mounted, {
      idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 100 }] },
      'action-2': { label: '疾跑', order: 1, steps: [{ frame: 1, durationMs: 200 }] },
      'action-3': { label: '跳跃', order: 2, steps: [{ frame: 2, durationMs: 300 }] },
    })
    await mounted.rerender(2)
    // 选中中间的「疾跑」。
    await act(async () => {
      ;[...host.querySelectorAll<HTMLElement>('[role="option"]')]
        .find((option) => option.textContent?.includes('疾跑'))!
        .click()
    })
    expect(host.querySelector('h3')?.textContent).toBe('疾跑')
    const seededPoses = deepSnapshot(heroPoses(mounted)!)

    // 取消侧：confirm=false → 零提交、零通知、零选择变化。
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const historyBefore = mounted.session.getHistoryVersion()
    await act(async () => {
      buttonByLabel(host, '删除预制动作：疾跑').click()
    })
    expect(confirm).toHaveBeenCalledWith('删除预制动作“疾跑”（action-2）？')
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(heroPoses(mounted)).toEqual(seededPoses)
    expect(mounted.mutations).toEqual([])
    expect(mounted.notices).toEqual([])

    // 确认侧：真实删除，剩余动作 order 重排为 0/1，选择移到后继 action-3。
    confirm.mockReturnValue(true)
    await act(async () => {
      buttonByLabel(host, '删除预制动作：疾跑').click()
    })
    expect(heroPoses(mounted)).toEqual({
      idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 100 }] },
      'action-3': { label: '跳跃', order: 1, steps: [{ frame: 2, durationMs: 300 }] },
    })
    expect(mounted.selections.at(-1)).toBe('action-3')
    expect(mounted.mutations).toEqual([{ ok: true }])
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore + 1)
    assertProjectSaveValid(mounted.session.getState())

    await undo(mounted)
    expect(heroPoses(mounted)).toEqual(seededPoses)
    await redo(mounted)
    expect(heroPoses(mounted)!['action-2']).toBeUndefined()

    // 逐个删空：最后一个动作删除后 poses 整键撤销为 undefined，选择清空。
    await act(async () => {
      buttonByLabel(host, '删除预制动作：跳跃').click()
    })
    expect(heroPoses(mounted)).toEqual({
      idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 100 }] },
    })
    expect(mounted.selections.at(-1)).toBe('idle')
    await act(async () => {
      buttonByLabel(host, '删除预制动作：待机').click()
    })
    expect(heroSprite(mounted).poses).toBeUndefined()
    expect(mounted.selections.at(-1)).toBeUndefined()
    expect(host.querySelector('.sprite-action-detail-pane')).toBeNull()
    expect(host.textContent).toContain('尚无预制动作。新建后可从源帧选择区添加动作步骤。')

    await undo(mounted)
    expect(heroPoses(mounted)).toEqual({
      idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 100 }] },
    })
  })

  test('前移/后移重排 order 且 ActionId/内容稳定，首尾方向禁用，undo/redo 对称', async () => {
    const mounted = await mountEditor(2)
    await seedPoses(mounted, {
      idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 100 }] },
      'action-2': { label: '疾跑', order: 1, steps: [{ frame: 1, durationMs: 200 }] },
      'action-3': { label: '跳跃', order: 2, steps: [{ frame: 2, durationMs: 300 }] },
    })
    await mounted.rerender(2)
    const seededPoses = deepSnapshot(heroPoses(mounted)!)

    // 首个动作：前移禁用、后移放行；末个动作：后移禁用。
    await act(async () => {
      ;[...host.querySelectorAll<HTMLElement>('[role="option"]')]
        .find((option) => option.textContent?.includes('待机'))!
        .click()
    })
    expect(buttonByLabel(host, '前移预制动作：待机').disabled).toBe(true)
    expect(buttonByLabel(host, '后移预制动作：待机').disabled).toBe(false)
    await act(async () => {
      ;[...host.querySelectorAll<HTMLElement>('[role="option"]')]
        .find((option) => option.textContent?.includes('跳跃'))!
        .click()
    })
    expect(buttonByLabel(host, '后移预制动作：跳跃').disabled).toBe(true)

    // 中间动作前移：与前一动作交换 order，ActionId 与 steps 不动。
    await act(async () => {
      ;[...host.querySelectorAll<HTMLElement>('[role="option"]')]
        .find((option) => option.textContent?.includes('疾跑'))!
        .click()
    })
    const historyBefore = mounted.session.getHistoryVersion()
    await act(async () => {
      buttonByLabel(host, '前移预制动作：疾跑').click()
    })
    expect(heroPoses(mounted)).toEqual({
      idle: { label: '待机', order: 1, steps: [{ frame: 0, durationMs: 100 }] },
      'action-2': { label: '疾跑', order: 0, steps: [{ frame: 1, durationMs: 200 }] },
      'action-3': { label: '跳跃', order: 2, steps: [{ frame: 2, durationMs: 300 }] },
    })
    expect(mounted.mutations).toEqual([{ ok: true }])
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore + 1)
    assertProjectSaveValid(mounted.session.getState())

    await undo(mounted)
    expect(heroPoses(mounted)).toEqual(seededPoses)
    await redo(mounted)
    expect(heroPoses(mounted)!['action-2']?.order).toBe(0)

    // 后移：疾跑当前在下标 0（redo 后），后移一格与待机交换，回到播种序。
    await act(async () => {
      buttonByLabel(host, '后移预制动作：疾跑').click()
    })
    expect(heroPoses(mounted)).toEqual(seededPoses)
    await undo(mounted)
    expect(heroPoses(mounted)).toEqual({
      idle: { label: '待机', order: 1, steps: [{ frame: 0, durationMs: 100 }] },
      'action-2': { label: '疾跑', order: 0, steps: [{ frame: 1, durationMs: 200 }] },
      'action-3': { label: '跳跃', order: 2, steps: [{ frame: 2, durationMs: 300 }] },
    })
  })

  test('循环播放开关与循环起点选择落到实际 session，undo 链逐级还原', async () => {
    const mounted = await mountEditor(2)
    await seedPoses(mounted, {
      idle: {
        label: '待机',
        order: 0,
        steps: [
          { frame: 0, durationMs: 100 },
          { frame: 1, durationMs: 200 },
          { frame: 2, durationMs: 300 },
        ],
      },
    })
    await mounted.rerender(2)
    expect(host.textContent).toContain('单次 · 3 步')

    await clickCheckboxByLabel(host, '循环播放')
    expect(heroPoses(mounted)!.idle?.loopFrom).toBe(0)
    expect(host.textContent).toContain('循环 · 3 步')
    await undo(mounted)
    expect('loopFrom' in heroPoses(mounted)!.idle!).toBe(false)
    await redo(mounted)
    expect(heroPoses(mounted)!.idle?.loopFrom).toBe(0)

    // 循环起点选「第 2 步」→ loopFrom=1；取消勾选 → loopFrom 键删除。
    await chooseComboboxOption(fieldControlByLabel(host, '循环起点'), '第 2 步')
    expect(heroPoses(mounted)!.idle).toEqual({
      label: '待机',
      order: 0,
      loopFrom: 1,
      steps: [
        { frame: 0, durationMs: 100 },
        { frame: 1, durationMs: 200 },
        { frame: 2, durationMs: 300 },
      ],
    })
    await clickCheckboxByLabel(host, '循环播放')
    expect('loopFrom' in heroPoses(mounted)!.idle!).toBe(false)
    expect(heroPoses(mounted)!.idle?.steps).toHaveLength(3)

    await undo(mounted)
    expect(heroPoses(mounted)!.idle?.loopFrom).toBe(1)
    await undo(mounted)
    expect(heroPoses(mounted)!.idle?.loopFrom).toBe(0)
    await undo(mounted)
    expect('loopFrom' in heroPoses(mounted)!.idle!).toBe(false)
    expect(mounted.mutations).toEqual([{ ok: true }, { ok: true }, { ok: true }])
  })

  test('步骤插入/删除迁移 loopFrom 到实际 session；追加按钮两入口与越界禁用', async () => {
    const mounted = await mountEditor(2)
    await seedPoses(mounted, {
      idle: {
        label: '待机',
        order: 0,
        loopFrom: 1,
        steps: [
          { frame: 0, durationMs: 100 },
          { frame: 1, durationMs: 200 },
          { frame: 2, durationMs: 300 },
        ],
      },
    })
    await mounted.rerender(2)
    const seededPoses = deepSnapshot(heroPoses(mounted)!)

    // 在循环起点（第 2 步）之前插入已选帧 2 → 新步占下标 1，loopFrom 迁移到 2。
    await act(async () => {
      buttonByLabel(host, '在第 2 步之前插入已选源帧 2').click()
    })
    expect(heroPoses(mounted)!.idle).toEqual({
      label: '待机',
      order: 0,
      loopFrom: 2,
      steps: [
        { frame: 0, durationMs: 100 },
        { frame: 2, durationMs: 250 },
        { frame: 1, durationMs: 200 },
        { frame: 2, durationMs: 300 },
      ],
    })
    await undo(mounted)
    expect(heroPoses(mounted)).toEqual(seededPoses)

    // 删除循环起点之前的第 1 步 → loopFrom 收缩到 0。
    await act(async () => {
      buttonByLabel(host, '删除第 1 步').click()
    })
    expect(heroPoses(mounted)!.idle).toEqual({
      label: '待机',
      order: 0,
      loopFrom: 0,
      steps: [
        { frame: 1, durationMs: 200 },
        { frame: 2, durationMs: 300 },
      ],
    })
    await undo(mounted)
    expect(heroPoses(mounted)).toEqual(seededPoses)

    // 删除循环起点本身（第 2 步）→ loopFrom 夹到同下标（现指向帧 2）。
    await act(async () => {
      buttonByLabel(host, '删除第 2 步').click()
    })
    expect(heroPoses(mounted)!.idle).toEqual({
      label: '待机',
      order: 0,
      loopFrom: 1,
      steps: [
        { frame: 0, durationMs: 100 },
        { frame: 2, durationMs: 300 },
      ],
    })
    await undo(mounted)
    expect(heroPoses(mounted)).toEqual(seededPoses)

    // 追加按钮两入口：时间线头部与拖放末尾，都是 {frame: 已选, durationMs: 250} 真实提交。
    const head = host.querySelector<HTMLElement>('.sprite-action-timeline-head')!
    await clickButton(head, '＋ 追加已选 #2')
    expect(heroPoses(mounted)!.idle?.steps).toEqual([
      { frame: 0, durationMs: 100 },
      { frame: 1, durationMs: 200 },
      { frame: 2, durationMs: 300 },
      { frame: 2, durationMs: 250 },
    ])
    await undo(mounted)
    const dropEnd = host.querySelector<HTMLElement>('.sprite-action-drop-end')!
    await clickButton(dropEnd, '＋ 追加已选 #2')
    expect(heroPoses(mounted)!.idle?.steps).toHaveLength(4)
    await undo(mounted)
    expect(heroPoses(mounted)).toEqual(seededPoses)

    // 已选源帧越界：两处追加与插入全部禁用，点击零提交。
    await mounted.rerender(mounted.frameCount)
    const historyBefore = mounted.session.getHistoryVersion()
    expect(buttonByLabel(head, `＋ 追加已选 #${mounted.frameCount}`).disabled).toBe(true)
    expect(buttonByLabel(dropEnd, `＋ 追加已选 #${mounted.frameCount}`).disabled).toBe(true)
    expect(buttonByLabel(host, `在第 1 步之前插入已选源帧 ${mounted.frameCount}`).disabled).toBe(
      true,
    )
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(heroPoses(mounted)).toEqual(seededPoses)
  })

  test('同步音效 cue：增/改/删落到实际 session 且不触碰 catalog，undo 链逐级还原', async () => {
    const mounted = await mountEditor(2)
    const soundA = await seedSound(mounted, 'sound.k03-a', '音效甲', [0, 1200, -1200, 0])
    const soundB = await seedSound(mounted, 'sound.k03-b', '音效乙', [0, 400, -400, 0])
    await seedPoses(mounted, {
      idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 250 }] },
    })
    await mounted.rerender(2)
    const catalogBefore = deepSnapshot(mounted.session.getState().assetCatalog)

    // 增：首个音效资源落为默认 cue。
    await clickButton(host, '＋ 同步音效')
    expect(heroPoses(mounted)!.idle?.steps[0]?.cues).toEqual([
      { kind: 'sound', asset: 'sound.k03-a' },
    ])

    // 改：cue 下拉切到第二个音效（option 文本 = 标签 + 描述 asset id）。
    const cueSelect = host.querySelector<HTMLElement>(
      'button[role="combobox"][aria-label="第 1 步第 1 个音效"]',
    )!
    await act(async () => {
      cueSelect.click()
    })
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) => candidate.textContent?.includes('sound.k03-b'),
    )!
    await act(async () => {
      option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(heroPoses(mounted)!.idle?.steps[0]?.cues).toEqual([
      { kind: 'sound', asset: 'sound.k03-b' },
    ])

    // 删：cues 清空后整键删除，不留空数组。
    await act(async () => {
      buttonByLabel(host, '移除第 1 步第 1 个同步音效').click()
    })
    expect('cues' in heroPoses(mounted)!.idle!.steps[0]!).toBe(false)

    // cue 编辑只动 poses，catalog（含两个音效记录的字节/sha）不动。
    expect(mounted.session.getState().assetCatalog).toEqual(catalogBefore)
    expect(mounted.session.getState().assetCatalog.assets['sound.k03-a']?.sha256).toBe(
      soundA.sha256,
    )
    expect(mounted.session.getState().assetCatalog.assets['sound.k03-b']?.bytes).toBe(soundB.bytes)
    assertProjectSaveValid(mounted.session.getState())

    await undo(mounted)
    expect(heroPoses(mounted)!.idle?.steps[0]?.cues).toEqual([
      { kind: 'sound', asset: 'sound.k03-b' },
    ])
    await undo(mounted)
    expect(heroPoses(mounted)!.idle?.steps[0]?.cues).toEqual([
      { kind: 'sound', asset: 'sound.k03-a' },
    ])
    await undo(mounted)
    expect('cues' in heroPoses(mounted)!.idle!.steps[0]!).toBe(false)
    expect(mounted.mutations).toEqual([{ ok: true }, { ok: true }, { ok: true }])
  })

  test('真实引用边（实体页 animation）阻断删除并接通查看引用；撤销引用后放行', async () => {
    const mounted = await mountEditor(2)
    await seedPoses(mounted, {
      idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 100 }] },
    })
    // 真实命令落一个实体页默认动作引用：场景 start · 实体 e-ref → hero/idle。
    await act(async () => {
      expect(
        mounted.session.dispatch(
          new AddEntityCommand('start', {
            id: 'e-ref',
            pos: { col: 2, row: 2, height: 0 },
            sprite: HERO,
            pages: [{ animation: { sprite: HERO, action: 'idle', loop: true } }],
          }),
        ),
      ).toBe(true)
    })
    await mounted.rerender(2)
    const historyBefore = mounted.session.getHistoryVersion()

    // 横幅显示真实引用计数；删除按钮禁用；查看引用把稳定 ActionId 交给宿主。
    expect(host.textContent).toContain('当前动作有 1 个引用，处理引用后才能删除。')
    expect(buttonByLabel(host, '删除预制动作：待机').disabled).toBe(true)
    await clickButton(host, '查看引用')
    expect(mounted.openedReferences).toEqual(['idle'])
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(heroPoses(mounted)!.idle).toBeDefined()
    expect(mounted.mutations).toEqual([])

    // 撤销实体引用后 banner 消失，删除重新可用（引用为派生态，不是快照残留）。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(host.textContent).not.toContain('处理引用后才能删除')
    expect(buttonByLabel(host, '删除预制动作：待机').disabled).toBe(false)
  })
})
