// @vitest-environment jsdom

import { act } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { encodeWavPcm16 } from '../__tests__/audio-fixtures.js'
import { installAudioContextPort } from '../__tests__/audio-ports.js'
import {
  blankProjectBase,
  installAudioWorkbenchTestHost,
  seedSound,
} from './__tests__/audio-workbench-harness.js'
import { buttonByLabel, inputByAriaLabel } from './__tests__/dom-gestures.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'

const { host, renderTab, catalogRow, waitPlayerState } = installAudioWorkbenchTestHost()
let audio: ReturnType<typeof installAudioContextPort>
beforeEach(() => {
  audio = installAudioContextPort()
})

test('搜索音效目录只过滤行，保留当前试听与导入入口', async () => {
  const base = await blankProjectBase('sound-catalog-filter')
  await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16([0.5, -0.5]))
  await seedSound(base, 'sound.heal', '治疗音效', encodeWavPcm16([0.25, -0.25]))
  await renderTab('sound', base, 'sound.hit')
  await waitPlayerState('就绪')
  const search = inputByAriaLabel<HTMLInputElement>(host, '搜索音效')
  expect(host.querySelector('.audio-workspace')?.getAttribute('aria-label')).toBe('音效工作区')
  expect(host.querySelector('.ds-list-header__count')?.textContent).toContain('2')

  await setCatalogSearch(search, 'heal')
  expect(host.querySelector('.ds-list-header__count')?.textContent).toContain('1')
  expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(1)
  expect(catalogRow('sound.heal').hasAttribute('data-selected')).toBe(false)
  expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('命中音效')

  const importFile = inputByAriaLabel<HTMLInputElement>(host, '导入音效')
  const openFilePicker = vi.fn()
  importFile.addEventListener('click', openFilePicker, { once: true })
  await act(async () => buttonByLabel(host, '导入 WAV').click())
  expect(openFilePicker).toHaveBeenCalledOnce()

  await setCatalogSearch(search, '不存在')
  expect(host.textContent).toContain('没有匹配的资源。')
  expect(host.querySelector('.ds-list-header__count')?.textContent).toContain('0')
  await setCatalogSearch(search, '')
  expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(2)
  expect(catalogRow('sound.hit').hasAttribute('data-selected')).toBe(true)
  expect(audio.contexts[0]?.decodeCalls).toBe(1)
})
