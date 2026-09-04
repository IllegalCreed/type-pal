// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
  setCatalogSearch,
} from './catalog-controls-test-utils.js'
import { assertWave, authoredSoundId, authoredWaveRecord, SoundTab } from './SoundTab.js'

function waveBytes(): ArrayBuffer {
  const bytes = new Uint8Array(44)
  bytes.set(new TextEncoder().encode('RIFF'), 0)
  bytes.set(new TextEncoder().encode('WAVE'), 8)
  return bytes.buffer
}

function waveFile(name = 'hit.wav'): File {
  return new File([waveBytes()], name, { type: 'audio/wav' })
}

describe('A7-1 SoundTab WAV 导入', () => {
  test('同内容生成稳定 AssetId 与 sound catalog record', async () => {
    const first = await authoredWaveRecord(waveFile(), undefined)
    const second = await authoredWaveRecord(waveFile('copy.wav'), undefined)

    expect(first.hash).toBe(second.hash)
    expect(authoredSoundId(first.hash)).toBe(authoredSoundId(second.hash))
    expect(authoredSoundId(first.hash)).toMatch(/^sound\.authored\.[a-f0-9]{16}$/)
    expect(first.record).toMatchObject({
      kind: 'sound',
      mediaType: 'audio/wav',
      bytes: 44,
      sha256: first.hash,
      label: 'hit',
      origin: { kind: 'authored', ref: 'hit.wav' },
    })
    expect(first.record.path).toBe(`assets/authored/${first.hash}.wav`)
  })

  test('扩展名和 RIFF/WAVE 双魔数都必须正确', () => {
    expect(() => assertWave({ name: 'hit.mp3' }, waveBytes())).toThrow('只允许导入 .wav')
    expect(() => assertWave({ name: 'hit.wav' }, new Uint8Array(44).buffer)).toThrow('不是有效 WAV')
  })

  test('共享目录搜索会同步筛选结果数，且保留导入入口', async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const session = new EditSession(catalogControlsEditorState())

    try {
      await act(async () => {
        root.render(
          createElement(SoundTab, {
            assetDiagnostics: [],
            referenceIndex: collectCurrentProjectReferenceIndex(session.getState()),
            referenceStatus: 'current',
            getCurrentReferenceIndex: collectCurrentProjectReferenceIndex,
            catalog: catalogControlsAssetCatalog,
            reader: catalogControlsReader,
            session,
            focusObjectId: 'sound.hit',
          }),
        )
      })

      const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索音效"]')
      expect(search).not.toBeNull()
      expect(host.querySelector('.ds-list-header__count')?.textContent).toContain('2')
      expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(2)

      await setCatalogSearch(search!, 'heal')
      expect(host.querySelector('.ds-list-header__count')?.textContent).toContain('1')
      expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(1)
      expect(host.querySelector('.ds-catalog-row__title')?.textContent).toBe('治疗音效')
      expect(host.querySelector('.ds-catalog-row[data-selected]')).toBeNull()
      expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('命中音效')

      const importButton = host.querySelector<HTMLButtonElement>('button[aria-label="导入 WAV"]')
      const importInput = host.querySelector<HTMLInputElement>('input[type="file"]')
      const onImportWav = vi.fn()
      importInput?.addEventListener('click', onImportWav)
      expect(importButton).not.toBeNull()
      await act(async () => importButton!.click())
      expect(onImportWav).toHaveBeenCalledTimes(1)

      await setCatalogSearch(search!, '不存在')
      expect(host.querySelector('.ds-list-header__count')?.textContent).toContain('0')
      expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(0)
      await setCatalogSearch(search!, '')
      expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(2)
      expect(host.querySelector('.ds-catalog-row[data-selected] .ds-catalog-row__title')?.textContent)
        .toBe('命中音效')
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })
})
