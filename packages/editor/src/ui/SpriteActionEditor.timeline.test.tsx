// @vitest-environment jsdom

import { act } from 'react'
import { expect, test } from 'vitest'
import { encodeWavPcm16 } from '../__tests__/audio-fixtures.js'
import {
  applyHistoryAction,
  buttonByText,
  clickButtonByText,
  controlByAriaLabel,
  controlByLabel,
  fillAndBlur,
  pickCombobox,
  typeDraft,
} from '../__tests__/cursor-asset-r1/kit.js'
import { dispatchDragEvent, MemoryDataTransfer } from '../__tests__/drag-test-ports.js'
import {
  ACTION_ASSET,
  actionPoses,
  mountActionWorkspace,
  openActionEditor,
} from '../__tests__/sprite-action-workspace.js'
import { setupWorldSpriteLibrarySuite } from '../__tests__/world-sprite-library-gestures.js'
import { sha256Hex } from '../core/binary-signature.js'
import { UpsertAssetCommand } from '../core/commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { SPRITE_FRAME_DRAG_MIME } from './SpriteFrameWorkbench.js'

const suite = setupWorldSpriteLibrarySuite()
const first = { frame: 0, durationMs: 100 }
const second = { frame: 1, durationMs: 200 }
const third = { frame: 2, durationMs: 300 }

async function editTimeline(project: string, loopFrom?: number) {
  const library = await mountActionWorkspace(suite, project, {
    idle: { label: '待机', order: 0, steps: [first, second, third], loopFrom },
  })
  const dialog = await openActionEditor(library)
  const currentAction = () => actionPoses(library)?.idle
  return { library, dialog, currentAction }
}

test('[reorder-family:sprite-actions] 键盘移动步骤时循环仍始于同一帧，撤销重做对称', async () => {
  const { library, dialog, currentAction } = await editTimeline('sprite-timeline-reorder', 0)
  const items = () => [
    ...dialog.querySelectorAll<HTMLElement>('.sprite-action-timeline [data-ds-reorder-item]'),
  ]
  const handle = items()[0]!.querySelector<HTMLButtonElement>('[data-ds-reorder-handle]')!
  await act(async () => handle.focus())
  for (const key of [' ', 'End', 'Enter']) {
    await act(async () =>
      handle.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
    )
  }
  expect(library.session.getHistoryVersion()).toBe(1)
  expect(currentAction()).toEqual({
    label: '待机',
    order: 0,
    steps: [second, third, first],
    loopFrom: 2,
  })
  expect(items()[2]?.querySelector('.loop-start canvas')?.getAttribute('aria-label')).toContain(
    '第 3 步，源帧 0',
  )
  const movedHandle = items()[2]?.querySelector('[data-ds-reorder-handle]')
  expect(movedHandle).toBeInstanceOf(HTMLButtonElement)
  expect(document.activeElement).toBe(movedHandle)
  expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
  expect(currentAction()).toEqual({
    label: '待机',
    order: 0,
    steps: [first, second, third],
    loopFrom: 0,
  })
  expect(await applyHistoryAction(library.session, 'redo')).toBe(true)
  expect(currentAction()?.steps).toEqual([second, third, first])
  expect(currentAction()?.loopFrom).toBe(2)
})

test('插入、删除和追加步骤后，合法循环起点与撤销历史同步', async () => {
  const { library, dialog, currentAction } = await editTimeline('sprite-timeline-insert-delete', 1)
  const original = { label: '待机', order: 0, steps: [first, second, third], loopFrom: 1 }
  const appended = { frame: 2, durationMs: 250 }
  const pickFrame = dialog.querySelector<HTMLButtonElement>('[data-source-frame-index="2"]')!
  await act(async () => pickFrame.click())
  expect(pickFrame.getAttribute('aria-selected') ?? pickFrame.getAttribute('aria-pressed')).toBe(
    'true',
  )
  await clickButtonByText(dialog, '在第 2 步之前插入已选源帧 2')
  expect(currentAction()).toEqual({
    ...original,
    steps: [first, appended, second, third],
    loopFrom: 2,
  })
  expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
  expect(currentAction()).toEqual(original)

  await clickButtonByText(dialog, '删除第 1 步')
  expect(currentAction()).toEqual({ ...original, steps: [second, third], loopFrom: 0 })
  expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
  await clickButtonByText(dialog, '删除第 2 步')
  expect(currentAction()).toEqual({ ...original, steps: [first, third] })
  expect(await applyHistoryAction(library.session, 'undo')).toBe(true)

  for (const selector of ['.sprite-action-timeline-head', '.sprite-action-drop-end']) {
    await clickButtonByText(dialog.querySelector(selector)!, '＋ 追加已选 #2')
    expect(currentAction()).toEqual({ ...original, steps: [first, second, third, appended] })
    expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
  }
  expect(currentAction()).toEqual(original)
})

test('循环开关和起点字段分别提交，并能逐步撤销', async () => {
  const { library, dialog, currentAction } = await editTimeline('sprite-timeline-loop')
  const toggle = controlByLabel<HTMLElement>(dialog, '循环播放')
  await act(async () => toggle.click())
  expect(currentAction()?.loopFrom).toBe(0)
  await pickCombobox(controlByLabel(dialog, '循环起点'), '第 2 步')
  expect(currentAction()?.loopFrom).toBe(1)
  await act(async () => toggle.click())
  expect(currentAction()).not.toHaveProperty('loopFrom')
  expect(currentAction()?.steps).toEqual([first, second, third])
  expect(library.session.getHistoryVersion()).toBe(3)
  for (const loopFrom of [1, 0, undefined]) {
    expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
    expect(currentAction()?.loopFrom).toBe(loopFrom)
  }
})

test('两处拖放边界只接受当前源素材的有效帧', async () => {
  const { library, dialog, currentAction } = await editTimeline('sprite-timeline-drag')
  const boundary = dialog.querySelector('.sprite-action-drop-boundary')!
  const end = dialog.querySelector('.sprite-action-drop-end')!
  async function drop(target: Element, payload: string) {
    const transfer = new MemoryDataTransfer()
    transfer.setData(SPRITE_FRAME_DRAG_MIME, payload)
    await act(async () => dispatchDragEvent(target, 'drop', transfer))
  }
  await drop(boundary, JSON.stringify({ asset: ACTION_ASSET, frame: 1 }))
  await drop(end, JSON.stringify({ asset: ACTION_ASSET, frame: 2 }))
  const steps = [{ frame: 1, durationMs: 250 }, first, second, third, { frame: 2, durationMs: 250 }]
  expect(currentAction()?.steps).toEqual(steps)
  const failures = [
    ['{bad', '源帧拖拽数据无效。'],
    [JSON.stringify({ asset: 'sprite.generated.starter', frame: 1 }), '有效帧'],
    [JSON.stringify({ asset: ACTION_ASSET, frame: 4 }), '有效帧'],
  ] as const
  for (const [payload, message] of failures) {
    await drop(end, payload)
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain(message)
    expect(currentAction()?.steps).toEqual(steps)
    expect(library.session.getHistoryVersion()).toBe(2)
  }
})

test('停留字段拒绝零时间，提交整数毫秒一次，Escape 撤回未提交值', async () => {
  const { library, dialog, currentAction } = await editTimeline('sprite-timeline-duration')
  const field = dialog.querySelector<HTMLInputElement>('[id$="-duration"]')!
  await fillAndBlur(field, '0')
  expect(field.getAttribute('aria-invalid')).toBe('true')
  expect(currentAction()?.steps[0]).toEqual(first)
  expect(library.session.getHistoryVersion()).toBe(0)
  await fillAndBlur(field, '399')
  const rendered = dialog.querySelector<HTMLInputElement>('[id$="-duration"]')!
  expect(rendered.value).toBe('399')
  expect(currentAction()?.steps).toEqual([{ ...first, durationMs: 399 }, second, third])
  expect(library.session.getHistoryVersion()).toBe(1)

  await act(async () => rendered.focus())
  await typeDraft(rendered, '777')
  await act(async () =>
    rendered.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  )
  expect(rendered.value).toBe('399')
  expect(library.session.getHistoryVersion()).toBe(1)
  expect(buttonByText(dialog, '完成').disabled).toBe(false)
})

test('同步音效引用真实资源，添加、替换和移除都可撤销', async () => {
  const { library, dialog, currentAction } = await editTimeline('sprite-timeline-sound-cues')
  const timelineStep = () => dialog.querySelector('.sprite-action-timeline [data-ds-reorder-item]')!
  expect(buttonByText(timelineStep(), '＋ 同步音效').disabled).toBe(true)
  for (const { id, label, sample } of [
    { id: 'sound.authoring.first', label: '短提示', sample: 0.25 },
    { id: 'sound.authoring.second', label: '长提示', sample: -0.5 },
  ]) {
    const bytes = Uint8Array.from(encodeWavPcm16([0, sample, 0])).buffer
    const sha256 = await sha256Hex(bytes)
    await act(async () => {
      expect(
        library.session.dispatch(
          new UpsertAssetCommand(
            id,
            {
              kind: 'sound',
              path: `assets/authored/sounds/${sha256}.wav`,
              mediaType: 'audio/wav',
              sha256,
              bytes: bytes.byteLength,
              label,
              origin: { kind: 'authored' },
            },
            bytes,
          ),
        ),
      ).toBe(true)
    })
  }
  const catalog = library.session.getState().assetCatalog
  const history = library.session.getHistoryVersion()
  const firstCue = [{ kind: 'sound', asset: 'sound.authoring.first' }]
  const secondCue = [{ kind: 'sound', asset: 'sound.authoring.second' }]
  await clickButtonByText(timelineStep(), '＋ 同步音效')
  expect(currentAction()?.steps[0]?.cues).toEqual(firstCue)
  await pickCombobox(controlByAriaLabel(dialog, '第 1 步第 1 个音效', 'button'), '长提示')
  expect(currentAction()?.steps[0]?.cues).toEqual(secondCue)
  await clickButtonByText(dialog, '移除第 1 步第 1 个同步音效')
  expect(currentAction()?.steps[0]).not.toHaveProperty('cues')
  expect(library.session.getHistoryVersion()).toBe(history + 3)
  for (const cues of [secondCue, firstCue, undefined]) {
    expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
    expect(currentAction()?.steps[0]?.cues).toEqual(cues)
  }
  expect(library.session.getState().assetCatalog).toBe(catalog)
  assertProjectSaveValid(library.session.getState())
})
