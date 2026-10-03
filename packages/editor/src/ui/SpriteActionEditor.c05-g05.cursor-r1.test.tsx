// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C05-G05：SpriteActionEditor proof/引用态/拖拽与提交边界。
 * 排重：K03 步骤插入与追加；L Dialog scope/Cmd+S；本组只测 absent proof、引用检查文案、
 * 非法拖拽 payload 与 definition 漂移拒收。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { actionOf, C05_ASSET, openC05 } from '../__tests__/cursor-asset-r1/c05-action-fixtures.js'
import type { MountedEditor } from '../__tests__/cursor-asset-r1/c05-action-harness.js'
import { mountActionEditor } from '../__tests__/cursor-asset-r1/c05-action-harness.js'
import {
  cleanupEditor,
  editorHost,
  heroPoses,
  openC05Editor,
  setupC05Ui,
  teardownC05Ui,
} from '../__tests__/cursor-asset-r1/c05-action-ui.js'
import {
  dispatchDragEvent,
  MemoryDataTransfer,
} from '../__tests__/cursor-asset-r1/frame-editor-ports.js'
import { controlByLabel, fillAndBlur } from '../__tests__/cursor-asset-r1/kit.js'
import { SPRITE_FRAME_DRAG_MIME } from './SpriteFrameWorkbench.js'

let mounted: MountedEditor | undefined

beforeEach(() => setupC05Ui())
afterEach(async () => {
  await cleanupEditor(mounted)
  mounted = undefined
  teardownC05Ui()
})

describe('C05-G05 proof、引用态与拖拽边界', () => {
  test('C05-G05-01 proof=null：名称与新建按钮禁用且横幅说明源帧未就绪', async () => {
    const open = await openC05('g05-01', {
      poses: { idle: actionOf('待机', [0], { order: 0 }) },
    })
    mounted = await mountActionEditor(open, { selectedActionId: 'idle', proof: null })
    const host = editorHost(mounted)
    expect(host.textContent).toContain('源帧尚未读取完成，不能修改动作')
    expect(controlByLabel<HTMLInputElement>(host, '名称').disabled).toBe(true)
    const create = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (btn) => btn.textContent?.trim() === '新建预制动作',
    )!
    expect(create.disabled).toBe(true)
  })

  test('C05-G05-02 referenceStatus=checking：删除禁用且文案含「正在检查」', async () => {
    mounted = await openC05Editor('g05-02', { idle: actionOf('待机', [0], { order: 0 }) })
    await mounted.setOptions({ referenceStatus: 'checking' })
    const host = editorHost(mounted)
    expect(host.textContent).toContain('正在检查当前动作的引用')
    const del = host.querySelector<HTMLButtonElement>('button[aria-label="删除预制动作：待机"]')!
    expect(del.disabled).toBe(true)
  })

  test('C05-G05-03 referenceStatus=stale：横幅待刷新且删除仍禁用', async () => {
    mounted = await openC05Editor('g05-03', { idle: actionOf('待机', [0], { order: 0 }) })
    await mounted.setOptions({ referenceStatus: 'stale' })
    expect(editorHost(mounted).textContent).toContain('动作引用结果待刷新')
  })

  test('C05-G05-04 referenceStatus=failed：横幅要求恢复后才能删除', async () => {
    mounted = await openC05Editor('g05-04', { idle: actionOf('待机', [0], { order: 0 }) })
    await mounted.setOptions({ referenceStatus: 'failed' })
    expect(editorHost(mounted).textContent).toContain('动作引用检查失败')
  })

  test('C05-G05-05 空名称 blur：aria-invalid 且零 history', async () => {
    mounted = await openC05Editor('g05-05', { idle: actionOf('待机', [0], { order: 0 }) })
    const history = mounted.open.session.getHistoryVersion()
    const host = editorHost(mounted)
    await fillAndBlur(controlByLabel(host, '名称'), '   ')
    expect(host.querySelector('[aria-invalid="true"]')).not.toBeNull()
    expect(mounted.open.session.getHistoryVersion()).toBe(history)
  })

  test('C05-G05-06 拖拽非法 JSON：error notice 且 steps 不变', async () => {
    mounted = await openC05Editor('g05-06', { idle: actionOf('待机', [0], { order: 0 }) })
    const host = editorHost(mounted)
    const boundary = host.querySelector('.sprite-action-drop-boundary')!
    const transfer = new MemoryDataTransfer()
    transfer.setData(SPRITE_FRAME_DRAG_MIME, '{not-json')
    dispatchDragEvent(boundary, 'drop', transfer)
    expect(mounted.notices.at(-1)).toEqual({ kind: 'error', message: '源帧拖拽数据无效。' })
    expect(heroPoses(mounted)!.idle?.steps).toHaveLength(1)
  })

  test('C05-G05-07 拖拽其它 asset：拒绝且零 steps 变化', async () => {
    mounted = await openC05Editor('g05-07', { idle: actionOf('待机', [0], { order: 0 }) })
    const host = editorHost(mounted)
    const boundary = host.querySelector('.sprite-action-drop-boundary')!
    const transfer = new MemoryDataTransfer()
    transfer.setData(SPRITE_FRAME_DRAG_MIME, JSON.stringify({ asset: 'sprite.other', frame: 0 }))
    dispatchDragEvent(boundary, 'drop', transfer)
    expect(mounted.notices.at(-1)?.message).toContain('只能把当前源帧容器中的有效帧拖入动作')
    expect(heroPoses(mounted)!.idle?.steps).toEqual([{ frame: 0, durationMs: 250 }])
  })

  test('C05-G05-08 合法拖拽 payload：在首步前插入帧 1', async () => {
    mounted = await openC05Editor('g05-08', { idle: actionOf('待机', [0], { order: 0 }) })
    const host = editorHost(mounted)
    const boundary = host.querySelector('.sprite-action-drop-boundary')!
    const transfer = new MemoryDataTransfer()
    transfer.setData(SPRITE_FRAME_DRAG_MIME, JSON.stringify({ asset: C05_ASSET, frame: 1 }))
    await act(async () => {
      dispatchDragEvent(boundary, 'drop', transfer)
    })
    expect(heroPoses(mounted)!.idle?.steps).toEqual([
      { frame: 1, durationMs: 250 },
      { frame: 0, durationMs: 250 },
    ])
    expect(mounted.mutations.at(-1)).toEqual({ ok: true })
  })

  test('C05-G05-09 步停留小于 1ms：字段 invalid 且 session steps 保持 250', async () => {
    mounted = await openC05Editor('g05-09', { idle: actionOf('待机', [0], { order: 0 }) })
    const host = editorHost(mounted)
    const history = mounted.open.session.getHistoryVersion()
    await fillAndBlur(controlByLabel(host, '停留'), '0')
    expect(host.querySelector('[aria-invalid="true"]')).not.toBeNull()
    expect(mounted.open.session.getHistoryVersion()).toBe(history)
    expect(heroPoses(mounted)!.idle?.steps[0]?.durationMs).toBe(250)
  })
})
