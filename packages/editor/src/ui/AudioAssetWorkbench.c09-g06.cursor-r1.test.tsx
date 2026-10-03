// @vitest-environment jsdom
/**
 * C09-G06：strategy/reader IO 与删除引用 re-verify（排重 staleIndex 异步删旧测，改 music+成功路径）。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  mockSoundStrategy,
  mountAudioWorkbench,
} from '../__tests__/cursor-asset-r1/c09-audio-harness.js'
import { deferred, stubNodeTestHost } from '../__tests__/cursor-asset-r1/kit.js'
import { createWavPreviewTransport } from '../core/audio-preview.js'
import { UpdateManifestAssetRolesCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import type { AudioTimeline, AudioWorkbenchTransport } from './AudioAssetWorkbench.js'
import { asAudioWorkbenchTransport } from './AudioAssetWorkbench.js'
import { catalogControlsEditorState, catalogControlsReader } from './catalog-controls-test-utils.js'

function pcm(duration = 1): AudioTimeline {
  return { kind: 'pcm-peaks', duration, minimums: [0], maximums: [1] }
}

function mockTransport(): AudioWorkbenchTransport {
  return {
    load: vi.fn(async () => pcm()),
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    snapshot: vi.fn(() => ({ currentTime: 0, duration: 1, paused: true })),
    dispose: vi.fn(),
  }
}

let mounted: Awaited<ReturnType<typeof mountAudioWorkbench>> | undefined

beforeEach(async () => {
  await stubNodeTestHost()
})

afterEach(async () => {
  await mounted?.cleanup()
  mounted = undefined
  vi.restoreAllMocks()
})

async function confirmDelete(host: HTMLElement): Promise<void> {
  const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-label="删除音效"]')!
  const confirm = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === '删除音效',
  )!
  await act(async () => confirm.click())
}

describe('C09-G06 AudioAssetWorkbench IO 与引用核验', () => {
  test('C09-G06-01 删除确认 readBytes 带 sound kind 与 asset id', async () => {
    const readBytes = vi.fn(async () => new ArrayBuffer(4))
    const reader = { ...catalogControlsReader, readBytes }
    mounted = await mountAudioWorkbench(mockSoundStrategy(mockTransport), { reader })
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    const deleteButton = [
      ...mounted!.host.querySelectorAll<HTMLButtonElement>('.ds-object-hero button'),
    ].find((candidate) => candidate.textContent?.trim() === '删除')!
    await act(async () => deleteButton.click())
    await confirmDelete(mounted!.host)
    await vi.waitFor(() => expect(readBytes).toHaveBeenCalledWith('sound.hit', 'sound'))
  })

  test('C09-G06-02 无引用时异步 read 完成后删除成功', async () => {
    const pending = deferred<ArrayBuffer>()
    const reader = {
      ...catalogControlsReader,
      readBytes: vi.fn((_id, kind) => {
        expect(kind).toBe('sound')
        return pending.promise
      }),
    }
    mounted = await mountAudioWorkbench(mockSoundStrategy(mockTransport), { reader })
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    const deleteButton = [
      ...mounted!.host.querySelectorAll<HTMLButtonElement>('.ds-object-hero button'),
    ].find((candidate) => candidate.textContent?.trim() === '删除')!
    await act(async () => deleteButton.click())
    await confirmDelete(mounted!.host)
    await act(async () => pending.resolve(new ArrayBuffer(8)))
    await vi.waitFor(() =>
      expect(mounted!.session.getState().assetCatalog.assets['sound.hit']).toBeUndefined(),
    )
  })

  test('C09-G06-03 read 完成时 getCurrentReferenceIndex 有引用则阻断', async () => {
    const pending = deferred<ArrayBuffer>()
    const reader = {
      ...catalogControlsReader,
      readBytes: vi.fn(() => pending.promise),
    }
    mounted = await mountAudioWorkbench(mockSoundStrategy(mockTransport), { reader })
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    await act(async () => {
      mounted!.host.querySelector<HTMLButtonElement>('.ds-object-hero button')!.click()
    })
    const deleteBtn = [
      ...mounted!.host.querySelectorAll<HTMLButtonElement>('.ds-object-hero button'),
    ].find((candidate) => candidate.textContent?.trim() === '删除')!
    await act(async () => deleteBtn.click())
    await confirmDelete(mounted!.host)
    mounted!.session.dispatch(
      new UpdateManifestAssetRolesCommand({ 'audio.battleItemUseSound': 'sound.hit' }),
    )
    await act(async () => pending.resolve(new ArrayBuffer(4)))
    await vi.waitFor(() => expect(mounted!.host.textContent).toContain('仍被 1 处引用，不能删除'))
    expect(mounted!.session.getState().assetCatalog.assets['sound.hit']).toBeDefined()
  })

  test('C09-G06-04 有引用时删除按钮在对话框被禁用', async () => {
    const session = new EditSession(catalogControlsEditorState())
    session.dispatch(
      new UpdateManifestAssetRolesCommand({ 'audio.battleItemUseSound': 'sound.hit' }),
    )
    mounted = await mountAudioWorkbench(mockSoundStrategy(mockTransport), {
      session,
      referenceIndex: collectCurrentProjectReferenceIndex(session.getState()),
    })
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    const deleteButton = [
      ...mounted!.host.querySelectorAll<HTMLButtonElement>('.ds-object-hero button'),
    ].find((candidate) => candidate.textContent?.trim() === '删除')!
    await act(async () => deleteButton.click())
    const dialog = mounted!.host.querySelector<HTMLDialogElement>('dialog[aria-label="删除音效"]')!
    const confirm = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '删除音效',
    )!
    expect(confirm.disabled).toBe(true)
  })

  test('C09-G06-05 referenceStatus stale 显示刷新提示', async () => {
    mounted = await mountAudioWorkbench(mockSoundStrategy(mockTransport), {
      referenceStatus: 'stale',
    })
    expect(mounted!.host.textContent).toContain('引用正在刷新')
  })

  test('C09-G06-06 referenceStatus failed 阻断对话框确认删除', async () => {
    mounted = await mountAudioWorkbench(mockSoundStrategy(mockTransport), {
      referenceIndex: undefined,
      referenceStatus: 'failed',
    })
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    const deleteButton = [
      ...mounted!.host.querySelectorAll<HTMLButtonElement>('.ds-object-hero button'),
    ].find((candidate) => candidate.textContent?.trim() === '删除')!
    await act(async () => deleteButton.click())
    const dialog = mounted!.host.querySelector<HTMLDialogElement>('dialog[aria-label="删除音效"]')!
    const confirm = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '删除音效',
    )!
    expect(confirm.disabled).toBe(true)
    expect(mounted!.host.textContent).toContain('引用扫描失败')
  })

  test('C09-G06-07 真实 WAV transport load 调用 reader sound kind', async () => {
    const readBytes = vi.fn(async () => new ArrayBuffer(44))
    const reader = { ...catalogControlsReader, readBytes }
    const backend = {
      currentTime: 0,
      state: 'running' as AudioContextState,
      resume: vi.fn(async () => {}),
      decode: vi.fn(async () => ({
        duration: 0.5,
        numberOfChannels: 1,
        getChannelData: () => Float32Array.from([0, 1]),
      })),
      createSource: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() })),
      dispose: vi.fn(),
    }
    const strategy = {
      ...mockSoundStrategy(() => mockTransport()),
      createTransport: (r: EditorAssetReader) =>
        asAudioWorkbenchTransport(createWavPreviewTransport(r, backend)),
    }
    mounted = await mountAudioWorkbench(strategy, { reader })
    await vi.waitFor(() => expect(readBytes).toHaveBeenCalled())
    expect(readBytes).toHaveBeenCalledWith(expect.any(String), 'sound')
  })

  test('C09-G06-08 删除成功后选择移到下一行', async () => {
    const pending = deferred<ArrayBuffer>()
    const reader = {
      ...catalogControlsReader,
      readBytes: vi.fn(() => pending.promise),
    }
    mounted = await mountAudioWorkbench(mockSoundStrategy(mockTransport), {
      reader,
      focusObjectId: 'sound.hit',
    })
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    const deleteButton = [
      ...mounted!.host.querySelectorAll<HTMLButtonElement>('.ds-object-hero button'),
    ].find((candidate) => candidate.textContent?.trim() === '删除')!
    await act(async () => deleteButton.click())
    await confirmDelete(mounted!.host)
    await act(async () => pending.resolve(new ArrayBuffer(4)))
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.ds-object-hero__title')?.textContent).toBe('治疗音效'),
    )
  })

  test('C09-G06-09 删除失败保留 hero 标题', async () => {
    const pending = deferred<ArrayBuffer>()
    const reader = { ...catalogControlsReader, readBytes: vi.fn(() => pending.promise) }
    mounted = await mountAudioWorkbench(mockSoundStrategy(mockTransport), { reader })
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    const deleteButton = [
      ...mounted!.host.querySelectorAll<HTMLButtonElement>('.ds-object-hero button'),
    ].find((candidate) => candidate.textContent?.trim() === '删除')!
    await act(async () => deleteButton.click())
    await confirmDelete(mounted!.host)
    mounted!.session.dispatch(
      new UpdateManifestAssetRolesCommand({ 'audio.battleItemUseSound': 'sound.hit' }),
    )
    await act(async () => pending.resolve(new ArrayBuffer(4)))
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.ds-object-hero__title')?.textContent).toBe('命中音效'),
    )
  })

  test('C09-G06-10 目录 trailing 显示引用计数', async () => {
    const session = new EditSession(catalogControlsEditorState())
    session.dispatch(
      new UpdateManifestAssetRolesCommand({ 'audio.battleItemUseSound': 'sound.hit' }),
    )
    mounted = await mountAudioWorkbench(mockSoundStrategy(mockTransport), {
      session,
      referenceIndex: collectCurrentProjectReferenceIndex(session.getState()),
    })
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.ds-catalog-row .ds-tag')?.textContent).toBe('1'),
    )
  })
})
