// @vitest-environment jsdom
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { fileOfBytes, midiSmf0 } from '../__tests__/audio-fixtures.js'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { sha256Hex } from '../core/binary-signature.js'
import {
  blankProjectBase,
  blobSha,
  installAudioWorkbenchTestHost,
  seedMusic,
} from './__tests__/audio-workbench-harness.js'
import {
  buttonByLabel,
  clickButton,
  inputByAriaLabel,
  loadFilesIntoInput,
} from './__tests__/glm-ui-wave-kit.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'

/** 两音符真实 SMF：0–0.25s vel127、0.5–1.0s vel32（96 tick/四分音符，默认速度总长 1.0s）。 */
const THEME_MIDI = midiSmf0([
  { tick: 0, length: 48, note: 60, velocity: 127 },
  { tick: 96, length: 96, note: 64, velocity: 32 },
])

const { host, renderTab, catalogRow, playerTime, waitPlayerState } = installAudioWorkbenchTestHost()

describe('音乐工作台导入', () => {
  test('空目录接线 + 真实 .mid 导入入库 + 真实解析时间轴 + undo/redo + 无硬件端口播放降级', async () => {
    const mounted = await renderTab('music', await blankProjectBase('music-import'))

    // 策略接线：标题/单位/导入入口/accept/空态全部来自 MUSIC_STRATEGY。
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 首')
    expect(buttonByLabel(host, '导入 MIDI')).toBeDefined()
    const importInput = inputByAriaLabel<HTMLInputElement>(host, '导入音乐')
    expect(importInput.accept).toBe('.mid,audio/midi')
    expect(host.querySelector('.ds-object-workspace .insp-empty')?.textContent).toBe(
      '项目中还没有音乐资源。',
    )

    const sha = await sha256Hex(THEME_MIDI)
    const id = `music.authored.${sha.slice(0, 16)}`
    const historyBefore = mounted.session.getHistoryVersion()
    await loadFilesIntoInput(importInput, [fileOfBytes('主题.mid', 'audio/midi', THEME_MIDI)])
    await waitForReact(() => {
      expect(mounted.session.getState().assetCatalog.assets[id]).toBeDefined()
    })

    // 入库合同：record 全字段精确、pending blob 字节与 sha 一致、选择与 focus 见证。
    const record = mounted.session.getState().assetCatalog.assets[id]!
    expect(record).toEqual({
      kind: 'music',
      path: `assets/authored/${sha}.mid`,
      mediaType: 'audio/midi',
      bytes: THEME_MIDI.byteLength,
      sha256: sha,
      label: '主题',
      origin: { kind: 'authored', ref: '主题.mid' },
    })
    expect(await blobSha(mounted.session, record.path)).toBe(sha)
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore + 1)
    expect(mounted.focusLog).toEqual([id])
    expect(catalogRow(id).hasAttribute('data-selected')).toBe(true)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('主题')
    expect(host.textContent).toContain('audio/midi')
    expect(host.textContent).toContain('项目创作')
    expect(host.textContent).toContain(`${THEME_MIDI.byteLength} B`)
    // 注意：blank 项目没有 soundfont 资源，音乐入库后保存门会要求 audio.midiSoundfont
    // 角色（项目级保存政策），与本卡的导入/预览工作流无关，这里不断言 save-valid。

    // 真实解析：spessasynth_core 读出 duration=1.0s、160 个音符活动 bucket；
    // vel127 段满幅、两音符之间为 0、vel32 段归一高度≈0.25197。
    await waitPlayerState('就绪')
    expect(host.textContent).toContain('音符活动')
    expect(host.textContent).toContain('时间轴显示 MIDI 音符活动，不代表 PCM 振幅。')
    const rects = host.querySelectorAll('.audio-timeline__graphic rect')
    expect(rects).toHaveLength(160)
    expect(rects[0]!.getAttribute('height')).toBe('56')
    expect(rects[0]!.getAttribute('y')).toBe('4')
    expect(rects[50]!.getAttribute('height')).toBe('0')
    expect(Number(rects[100]!.getAttribute('height'))).toBeCloseTo(14.11023622047244, 6)
    expect(playerTime()).toContain('0:00 / 0:01')
    expect(
      host.querySelector('input[aria-label="音乐试听进度"]')?.getAttribute('aria-valuetext'),
    ).toBe('0:00 / 0:01')

    // undo/redo 对称：catalog 与 pending blob 同进同退。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[record.path]).toBeUndefined()
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]?.sha256).toBe(sha)
    expect(mounted.session.getState().assetBlobs[record.path]?.byteLength).toBe(
      THEME_MIDI.byteLength,
    )
    await waitForReact(() => {
      expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('主题')
    })
    await waitPlayerState('就绪')

    // 无 AudioContext 的 jsdom 下 MIDI 播放走产品既定降级：错误面可见且零提交。
    const historyAtReady = mounted.session.getHistoryVersion()
    await clickButton(host, '播放')
    await waitForReact(() => {
      expect(host.textContent).toContain('当前浏览器不支持 MIDI 试听。')
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyAtReady)
    await waitPlayerState('就绪')
  })

  test('两次导入同一 MIDI 交错完成时，保留两个音乐 ID 和各自标签', async () => {
    const mounted = await renderTab('music', await blankProjectBase('midi-concurrent-import'))
    const input = inputByAriaLabel<HTMLInputElement>(host, '导入音乐')
    const first = fileOfBytes('first.mid', 'audio/midi', THEME_MIDI)
    const bytes = await first.arrayBuffer()
    let resolveRead!: (bytes: ArrayBuffer) => void
    const pending = new Promise<ArrayBuffer>((resolve) => {
      resolveRead = resolve
    })
    vi.spyOn(first, 'arrayBuffer').mockReturnValue(pending)

    try {
      await loadFilesIntoInput(input, [first])
      await loadFilesIntoInput(input, [fileOfBytes('second.mid', 'audio/midi', THEME_MIDI)])
      await waitForReact(() => expect(mounted.session.getHistoryVersion()).toBe(1))
    } finally {
      await act(async () => resolveRead(bytes))
    }
    await waitForReact(() => expect(mounted.session.getHistoryVersion()).toBe(2))

    const id = `music.authored.${(await sha256Hex(bytes)).slice(0, 16)}`
    const assets = mounted.session.getState().assetCatalog.assets
    expect(assets[id]?.label).toBe('second')
    expect(assets[`${id}-2`]?.label).toBe('first')
  })

  test('同字节重复导入分配 -2 后缀 id；非法扩展名与坏魔数零提交且选择保全', async () => {
    const mounted = await renderTab('music', await blankProjectBase('music-duplicate-import'))
    const sha = await sha256Hex(THEME_MIDI)
    const firstId = `music.authored.${sha.slice(0, 16)}`
    const input = inputByAriaLabel<HTMLInputElement>(host, '导入音乐')

    await loadFilesIntoInput(input, [fileOfBytes('a.mid', 'audio/midi', THEME_MIDI)])
    await waitForReact(() => {
      expect(mounted.session.getState().assetCatalog.assets[firstId]).toBeDefined()
    })
    // nextMusicId 碰撞后缀：同字节第二次导入得到 '<base>-2'，两条记录共存同一路径。
    await loadFilesIntoInput(input, [fileOfBytes('副本.mid', 'audio/midi', THEME_MIDI)])
    const secondId = `${firstId}-2`
    await waitForReact(() => {
      expect(mounted.session.getState().assetCatalog.assets[secondId]).toBeDefined()
    })
    expect(mounted.session.getState().assetCatalog.assets[secondId]).toEqual({
      ...mounted.session.getState().assetCatalog.assets[firstId]!,
      label: '副本',
      origin: { kind: 'authored', ref: '副本.mid' },
    })
    expect(mounted.focusLog).toEqual([firstId, secondId])
    expect(catalogRow(secondId).hasAttribute('data-selected')).toBe(true)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('副本')

    // 非法扩展名：真实 assertMidi 拒绝，零提交且选择/记录保全。
    const historyBefore = mounted.session.getHistoryVersion()
    await loadFilesIntoInput(input, [fileOfBytes('bad.dat', 'audio/midi', THEME_MIDI)])
    await waitForReact(() => {
      expect(host.textContent).toContain('只允许导入 .mid 文件')
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    // 坏魔数：.mid 命名但首 4 字节不是 MThd。
    await loadFilesIntoInput(input, [
      fileOfBytes('bad.mid', 'audio/midi', new TextEncoder().encode('NOPE')),
    ])
    await waitForReact(() => {
      expect(host.textContent).toContain('不是有效 MIDI 文件')
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(
      Object.keys(mounted.session.getState().assetCatalog.assets).filter((entry) =>
        entry.startsWith('music.authored.'),
      ),
    ).toEqual([firstId, secondId])
    expect(catalogRow(secondId).hasAttribute('data-selected')).toBe(true)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('副本')
    expect(mounted.focusLog).toEqual([firstId, secondId])
  })

  test('严格模式下过滤音乐目录仍保留选中的曲目', async () => {
    const base = await blankProjectBase('music-catalog-filter')
    await seedMusic(base, 'music.opening', '开场音乐', THEME_MIDI)
    await seedMusic(base, 'music.ending', '终章音乐', THEME_MIDI)
    await renderTab('music', base, 'music.opening', { strict: true })
    await waitPlayerState('就绪')

    const search = inputByAriaLabel<HTMLInputElement>(host, '搜索音乐')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('2 首')
    await setCatalogSearch(search, '终章')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('1 首')
    expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(1)
    expect(catalogRow('music.ending').hasAttribute('data-selected')).toBe(false)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('开场音乐')
    expect(buttonByLabel(host, '导入 MIDI')).toBeDefined()

    await setCatalogSearch(search, '不存在')
    expect(host.textContent).toContain('没有匹配的资源。')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 首')
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(2)
    expect(catalogRow('music.opening').hasAttribute('data-selected')).toBe(true)
  })
})
