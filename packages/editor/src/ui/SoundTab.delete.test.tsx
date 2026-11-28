// @vitest-environment jsdom
import type { AssetCatalogV1 } from '@type-pal/content'
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { act } from 'react'
import { beforeEach, describe, expect, test } from 'vitest'
import { encodeWavPcm16 } from '../__tests__/audio-fixtures.js'
import { type AudioContextPort, installAudioContextPort } from '../__tests__/audio-ports.js'
import { loadFixtureProjectMaps } from '../__tests__/project-map-fixtures.js'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { sha256Hex } from '../core/binary-signature.js'
import { UpdateManifestAssetRolesCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { toEditorState } from '../core/project-io.js'
import { buildBlankProject } from '../core/seed.js'
import {
  blankProjectBase,
  blobSha,
  installAudioWorkbenchTestHost,
  seedSound,
} from './__tests__/audio-workbench-harness.js'
import { buttonByLabel, clickButton, deepSnapshot } from './__tests__/glm-ui-wave-kit.js'
import { gatedFileSource } from './__tests__/kimi-editor-workflows/kit.js'

/** 交替 ±0.5 的 0.5s 采样（8kHz 单声道）：每个峰值 bucket 恒为 max 0.5 / min -0.5。 */
const HIT_SAMPLES = Array.from({ length: 4000 }, (_, index) => (index % 2 === 0 ? 0.5 : -0.5))
/** 恒定 0.25 的 0.25s 采样：峰值 bucket 恒为 max=min=0.25。 */
const HEAL_SAMPLES = Array.from({ length: 2000 }, () => 0.25)
const { host, renderTab, catalogRow, waitPlayerState, deleteDialog } =
  installAudioWorkbenchTestHost()

describe('音效引用与删除', () => {
  let audio: AudioContextPort
  beforeEach(() => {
    audio = installAudioContextPort()
  })

  test('删除生命周期：取消零提交、引用阻断禁用、解除后成功删除并 undo/redo 字节级还原', async () => {
    const base = await blankProjectBase('sound-delete')
    const seeded = await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    await seedSound(base, 'sound.heal', '治疗音效', encodeWavPcm16(HEAL_SAMPLES))
    const mounted = await renderTab('sound', base, 'sound.hit')
    await waitPlayerState('就绪')
    const recordBefore = deepSnapshot(mounted.session.getState().assetCatalog.assets['sound.hit']!)

    // 取消侧：对话框打开后取消，零提交。
    await clickButton(host, '删除')
    expect(deleteDialog().open).toBe(true)
    expect(deleteDialog().textContent).toContain('0 处')
    const historyBefore = mounted.session.getHistoryVersion()
    await clickButton(deleteDialog(), '取消')
    await waitForReact(() => {
      expect(deleteDialog().open).toBe(false)
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toBeDefined()

    // 真实引用索引下删除确认禁用（fail-closed）。
    await act(async () => {
      mounted.session.dispatch(
        new UpdateManifestAssetRolesCommand({ 'audio.battleItemUseSound': 'sound.hit' }),
      )
    })
    await waitForReact(() => {
      expect(buttonByLabel(host, '删除').title).toBe('查看 1 处阻断引用')
    })
    await clickButton(host, '删除')
    expect(deleteDialog().textContent).toContain('1 处')
    expect(catalogRow('sound.hit').querySelector('.ds-tag')?.textContent).toBe('1')
    expect(buttonByLabel(deleteDialog(), '删除音效').disabled).toBe(true)
    await clickButton(deleteDialog(), '取消')
    await waitForReact(() => {
      expect(deleteDialog().open).toBe(false)
    })
    expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toBeDefined()
    expect(mounted.session.getState().manifest.assets.roles['audio.battleItemUseSound']).toBe(
      'sound.hit',
    )

    // 解除引用后删除成功：记录/pending blob 移除、选择前移到下一项、focus 见证。
    await act(async () => {
      mounted.session.dispatch(
        new UpdateManifestAssetRolesCommand({ 'audio.battleItemUseSound': undefined }),
      )
    })
    await waitForReact(() => {
      expect(buttonByLabel(host, '删除').title).toBe('删除当前音效')
    })
    await clickButton(host, '删除')
    await clickButton(deleteDialog(), '删除音效')
    await waitForReact(() => {
      expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toBeUndefined()
    })
    expect(mounted.session.getState().assetBlobs[seeded.path]).toBeUndefined()
    expect(deleteDialog().open).toBe(false)
    expect(mounted.focusLog.at(-1)).toBe('sound.heal')
    await waitForReact(() => {
      expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('治疗音效')
    })
    expect(catalogRow('sound.heal').hasAttribute('data-selected')).toBe(true)
    await waitPlayerState('就绪')

    // undo 字节级还原（删除前预读字节物化回 pending blob），redo 再删。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toEqual(recordBefore)
    expect(await blobSha(mounted.session, seeded.path)).toBe(recordBefore.sha256)
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[seeded.path]).toBeUndefined()
  })

  test('删除在途磁盘读取失败：错误身份透传、对话框保持开启、选择/记录保全、取消收尾', async () => {
    // 磁盘-only 音效：字节不入会话 blob，删除前预读必然落到磁盘端口闸门。
    const wav = encodeWavPcm16(HIT_SAMPLES)
    const sha = await sha256Hex(wav)
    const path = `assets/authored/${sha}.wav`
    const blank = await buildBlankProject('sound-disk-undo')
    const catalogValue = blank['assets/index.json']
    if (typeof catalogValue !== 'object' || catalogValue === null)
      throw new Error('blank 种子缺资源 catalog')
    const catalog = catalogValue as AssetCatalogV1
    catalog.assets['sound.disk'] = {
      kind: 'sound',
      path,
      mediaType: 'audio/wav',
      bytes: wav.byteLength,
      sha256: sha,
      label: '磁盘音效',
      origin: { kind: 'authored', ref: 'disk.wav' },
    }
    blank[path] = wav.slice().buffer
    const gated = gatedFileSource(fsaSource(memoryAuthorDirectory(blank).dir))
    const project = await loadCurrentProjectFrom(gated.source)
    const state = toEditorState(
      project,
      await loadAllAuthorScenes(project),
      await loadFixtureProjectMaps(project),
      {},
      [],
    )
    assertProjectSaveValid(state)
    const session = new EditSession(state)

    // 播放器读取先卡在闸门（进入见证），放行后真实解码到就绪（退出见证）。
    const playerGate = gated.gate(path)
    await renderTab('sound', { session, source: gated.source }, 'sound.disk')
    await waitForReact(() => {
      expect(gated.calls).toContain(path)
    })
    expect(gated.completed).not.toContain(path)
    await waitPlayerState('正在读取…')
    await act(async () => {
      playerGate.resolve()
    })
    await waitPlayerState('就绪')
    expect(gated.completed).toContain(path)

    // 删除确认后的字节预读卡在第二道闸门：busy 在途、读取已进入但未完成。
    const recordBefore = deepSnapshot(session.getState().assetCatalog.assets['sound.disk']!)
    const historyBefore = session.getHistoryVersion()
    const deleteGate = gated.gate(path)
    await clickButton(host, '删除')
    await act(async () => {
      buttonByLabel(deleteDialog(), '删除音效').click()
    })
    await waitForReact(() => {
      expect(gated.calls.filter((entry) => entry === path)).toHaveLength(2)
    })
    expect(gated.completed.filter((entry) => entry === path)).toHaveLength(1)
    // busy 中确认按钮文案换成「处理中」，按 aria-busy 定位。
    const busyConfirm = deleteDialog().querySelector('button[aria-busy="true"]')
    expect(busyConfirm, '删除确认按钮 busy 在途').not.toBeNull()
    expect(busyConfirm!.textContent).toBe('处理中')

    // 闸门拒绝：错误身份原样透出，零提交，对话框保持开启且 busy 复位。
    await act(async () => {
      deleteGate.reject(new Error('注入磁盘故障'))
    })
    await waitForReact(() => {
      expect(host.textContent).toContain('注入磁盘故障')
    })
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getState().assetCatalog.assets['sound.disk']).toEqual(recordBefore)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('磁盘音效')
    expect(catalogRow('sound.disk').hasAttribute('data-selected')).toBe(true)
    expect(deleteDialog().open).toBe(true)
    expect(buttonByLabel(deleteDialog(), '删除音效').getAttribute('aria-busy')).toBeNull()
    expect(gated.completed.filter((entry) => entry === path)).toHaveLength(1)
    expect(audio.contexts[0]!.decodeCalls).toBe(1)

    // 取消收尾：对话框关闭，仍零提交。
    await clickButton(deleteDialog(), '取消')
    await waitForReact(() => {
      expect(deleteDialog().open).toBe(false)
    })
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getState().assetCatalog.assets['sound.disk']).toEqual(recordBefore)
  })
  test.each([
    ['stale', '引用正在刷新'],
    ['failed', '派生引用检查失败'],
  ] as const)('引用索引为 %s 时禁止确认删除', async (referenceStatus, message) => {
    const base = await blankProjectBase(`sound-references-${referenceStatus}`)
    const record = await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    await renderTab('sound', base, 'sound.hit', { referenceStatus })
    await waitPlayerState('就绪')

    await clickButton(host, '删除')
    expect(buttonByLabel(deleteDialog(), '删除音效').disabled).toBe(true)
    expect(deleteDialog().textContent).toContain('引用未知（扫描失败）')
    expect(host.textContent).toContain(message)
    expect(base.session.getState().assetCatalog.assets['sound.hit']).toEqual(record)
  })
})
