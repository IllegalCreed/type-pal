// @vitest-environment jsdom
// Web Audio is the test port. Asset reading, transport selection and preview ownership are real.

import type { AssetCatalogV1 } from '@type-pal/content'
import {
  analyzeMidiBytes,
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { encodeWavPcm16, fileOfBytes, midiSmf0 } from '../__tests__/audio-fixtures.js'
import { installAudioContextPort } from '../__tests__/audio-ports.js'
import { loadFixtureProjectMaps } from '../__tests__/project-map-fixtures.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { claimEditorAudioPreview, stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { sha256Hex } from '../core/binary-signature.js'
import { UpsertAssetCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { toEditorState } from '../core/project-io.js'
import { buildBlankProject } from '../core/seed.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import {
  gatedFileSource,
  installBrowserHardwarePorts,
} from './__tests__/kimi-editor-workflows/kit.js'
import { authoredMidiRecord } from './MusicTab.js'
import {
  createProjectAudioPreviewTransport,
  ProjectAudioPreviewButton,
  type ProjectAudioPreviewTransportFactory,
} from './ProjectAudioPreviewButton.js'
import { authoredWaveRecord } from './SoundTab.js'

const HIT_SAMPLES = Array.from({ length: 4000 }, (_, index) => (index % 2 === 0 ? 0.5 : -0.5))
const HEAL_SAMPLES = Array.from({ length: 2000 }, () => 0.25)
const THEME_MIDI = midiSmf0([
  { tick: 0, length: 48, note: 60, velocity: 127 },
  { tick: 96, length: 96, note: 64, velocity: 32 },
])

interface Base {
  session: EditSession
  source: FileSource
  reader: EditorAssetReader
}

async function legalBase(name: string): Promise<Base> {
  const legal = await loadLegalUiProject(name)
  const session = new EditSession(legal.state)
  return {
    session,
    source: legal.source,
    reader: createEditorAssetReader(legal.source, () => session.getState()),
  }
}

async function seedSound(base: Base, id: string, label: string, wav: Uint8Array): Promise<string> {
  const prepared = await authoredWaveRecord(fileOfBytes(`${label}.wav`, 'audio/wav', wav), label)
  base.session.dispatch(new UpsertAssetCommand(id, prepared.record, prepared.bytes, undefined))
  return prepared.hash
}

async function seedMusic(base: Base, id: string, label: string, midi: Uint8Array): Promise<string> {
  const prepared = await authoredMidiRecord(fileOfBytes(`${label}.mid`, 'audio/midi', midi), label)
  base.session.dispatch(new UpsertAssetCommand(id, prepared.record, prepared.bytes, undefined))
  return prepared.hash
}

/** 全委托记录包装：输入记录进 log，行为全部走真实默认工厂产物。 */
interface TransportLog {
  loads: Array<[string, string | undefined]>
  plays: number
  stops: number
  disposes: number
}
function recordingTransportFactory(
  log: TransportLog,
  hooks?: { onPlaySettled?: () => void },
): ProjectAudioPreviewTransportFactory {
  return (kind, reader) => {
    const real = createProjectAudioPreviewTransport(kind, reader)
    return {
      load: (asset, cacheKey) => {
        log.loads.push([asset, cacheKey])
        return real.load(asset, cacheKey)
      },
      play: () => {
        log.plays += 1
        return real.play().finally(() => hooks?.onPlaySettled?.())
      },
      stop: () => {
        log.stops += 1
        real.stop()
      },
      snapshot: () => real.snapshot(),
      dispose: () => {
        log.disposes += 1
        real.dispose()
      },
    }
  }
}

function previewButton(props: {
  asset: string
  label: string
  kind: 'music' | 'sound'
  cacheKey: string
  reader: EditorAssetReader
  createTransport?: ProjectAudioPreviewTransportFactory
}) {
  return <ProjectAudioPreviewButton {...props} />
}

function button(label: string): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
  expect(found, `按钮 ${label}`).toBeDefined()
  return found!
}

async function flushChain(): Promise<void> {
  for (let index = 0; index < 14; index += 1) await Promise.resolve()
}

async function clickPreview(label: string): Promise<void> {
  await act(async () => {
    button(label).click()
    await flushChain()
  })
}

let root: Root | undefined
let host: HTMLDivElement
let restoreAct: () => void
const createdObjectUrls: string[] = []
const revokedObjectUrls: string[] = []

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  stopEditorAudioPreview()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  createdObjectUrls.length = 0
  revokedObjectUrls.length = 0
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL(_blob: Blob): string {
        const url = `blob:project-audio-${createdObjectUrls.length}`
        createdObjectUrls.push(url)
        return url
      }
      static override revokeObjectURL(url: string): void {
        revokedObjectUrls.push(url)
      }
    },
  )
})

afterEach(async () => {
  const current = root
  root = undefined
  try {
    if (current) await act(async () => current.unmount())
    stopEditorAudioPreview()
    expect(revokedObjectUrls).toEqual(createdObjectUrls)
  } finally {
    host.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    restoreAct()
  }
})

describe('项目槽位 WAV 试听的所有权', () => {
  test('同页相邻按钮用默认真实工厂互相接管：旧真实源停止、旧按钮回 idle、transport 不销毁', async () => {
    const base = await legalBase('project-audio-takeover')
    const hitSha = await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    const healSha = await seedSound(base, 'sound.heal', '治疗音效', encodeWavPcm16(HEAL_SAMPLES))
    const audio = installAudioContextPort()
    await act(async () => {
      root!.render(
        <>
          {previewButton({
            asset: 'sound.hit',
            label: '命中音效',
            kind: 'sound',
            cacheKey: hitSha,
            reader: base.reader,
          })}
          {previewButton({
            asset: 'sound.heal',
            label: '治疗音效',
            kind: 'sound',
            cacheKey: healSha,
            reader: base.reader,
          })}
        </>,
      )
      await Promise.resolve()
    })

    await clickPreview('试听 命中音效')
    expect(button('停止试听 命中音效')).toBeDefined()
    const hitContext = audio.contexts[0]!
    expect(hitContext.sources).toHaveLength(1)
    expect(hitContext.sources[0]!.starts).toEqual([0])

    await clickPreview('试听 治疗音效')
    expect(hitContext.sources[0]!.stopCalls).toBe(1)
    expect(hitContext.sources[0]!.disconnectCalls).toBe(1)
    expect(button('试听 命中音效')).toBeDefined()
    expect(hitContext.closeCalls).toBe(0)
    expect(button('停止试听 治疗音效')).toBeDefined()
    expect(audio.contexts).toHaveLength(2)
    expect(audio.contexts[1]!.sources[0]!.starts).toEqual([0])

    await clickPreview('停止试听 治疗音效')
    expect(button('试听 治疗音效')).toBeDefined()
    expect(audio.contexts[1]!.sources[0]!.stopCalls).toBe(1)
    expect(hitContext.closeCalls).toBe(0)
  })

  test('绑定值切换：stop 并回 idle、不 dispose、再试听 load 新 asset+cacheKey', async () => {
    const base = await legalBase('project-audio-switch')
    const hitSha = await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    const healSha = await seedSound(base, 'sound.heal', '治疗音效', encodeWavPcm16(HEAL_SAMPLES))
    const audio = installAudioContextPort()
    const log: TransportLog = { loads: [], plays: 0, stops: 0, disposes: 0 }
    const createTransport = recordingTransportFactory(log)
    const shared = {
      label: '原位音效',
      kind: 'sound' as const,
      reader: base.reader,
      createTransport,
    }

    await act(async () => {
      root!.render(previewButton({ ...shared, asset: 'sound.hit', cacheKey: hitSha }))
      await flushChain()
    })
    // mount 期 effect 本就会对全新 transport 做一次幂等 stop 复位，先记基线。
    const stopsAfterMount = log.stops
    await clickPreview('试听 原位音效')
    expect(button('停止试听 原位音效')).toBeDefined()
    expect(log.loads).toEqual([['sound.hit', hitSha]])
    expect(log.plays).toBe(1)

    await act(async () => {
      root!.render(previewButton({ ...shared, asset: 'sound.heal', cacheKey: healSha }))
      await flushChain()
    })
    expect(button('试听 原位音效')).toBeDefined()
    expect(log.stops).toBe(stopsAfterMount + 1)
    expect(log.disposes).toBe(0)
    expect(audio.contexts).toHaveLength(1)
    expect(audio.contexts[0]!.sources[0]!.stopCalls).toBe(1)

    await clickPreview('试听 原位音效')
    expect(button('停止试听 原位音效')).toBeDefined()
    expect(log.loads).toEqual([
      ['sound.hit', hitSha],
      ['sound.heal', healSha],
    ])
    expect(audio.contexts[0]!.sources[1]!.starts).toEqual([0])
    expect(log.disposes).toBe(0)
  })

  test('载入 中换绑定值：旧请求作废（放行后不置 playing、不调 play），再试听新资源成功', async () => {
    const wav = encodeWavPcm16(HIT_SAMPLES)
    const sha = await sha256Hex(wav)
    const path = `assets/authored/${sha}.wav`
    const blank = await buildBlankProject('project-audio-gated')
    const catalogValue = blank['assets/index.json']
    if (typeof catalogValue !== 'object' || catalogValue === null)
      throw new Error('blank 种子缺资源 catalog')
    const catalog = catalogValue as AssetCatalogV1
    catalog.assets['sound.gated'] = {
      kind: 'sound',
      path,
      mediaType: 'audio/wav',
      bytes: wav.byteLength,
      sha256: sha,
      label: '闸门音效',
      origin: { kind: 'authored', ref: 'gated.wav' },
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
    const session = new EditSession(state)
    const base: Base = {
      session,
      source: gated.source,
      reader: createEditorAssetReader(gated.source, () => session.getState()),
    }
    const healSha = await seedSound(base, 'sound.fresh', '治疗音效', encodeWavPcm16(HEAL_SAMPLES))
    const audio = installAudioContextPort()
    const log: TransportLog = { loads: [], plays: 0, stops: 0, disposes: 0 }
    const shared = {
      label: '原位音效',
      kind: 'sound' as const,
      reader: base.reader,
      createTransport: recordingTransportFactory(log),
    }

    const gate = gated.gate(path)
    await act(async () => {
      root!.render(previewButton({ ...shared, asset: 'sound.gated', cacheKey: sha }))
      await flushChain()
    })
    const stopsAfterMount = log.stops
    await act(async () => {
      button('试听 原位音效').click()
      await Promise.resolve()
    })
    expect(button('停止试听 原位音效').getAttribute('aria-busy')).toBe('true')
    await waitForReact(() => expect(gated.calls).toContain(path))
    expect(gated.completed).not.toContain(path)

    await act(async () => {
      root!.render(previewButton({ ...shared, asset: 'sound.fresh', cacheKey: healSha }))
      await flushChain()
    })
    expect(button('试听 原位音效')).toBeDefined()
    expect(log.stops).toBe(stopsAfterMount + 1)

    await act(async () => {
      gate.resolve()
      await flushChain()
    })
    expect(button('试听 原位音效')).toBeDefined()
    expect(log.plays).toBe(0)
    expect(audio.contexts[0]!.sources).toHaveLength(0)

    await clickPreview('试听 原位音效')
    expect(button('停止试听 原位音效')).toBeDefined()
    expect(log.loads).toEqual([
      ['sound.gated', sha],
      ['sound.fresh', healSha],
    ])
    expect(audio.contexts[0]!.sources[0]!.starts).toEqual([0])
    expect(log.disposes).toBe(0)
  })

  test('播放中卸载：stop 真实源、释放所有权、microtask 后 dispose 硬件端口', async () => {
    const base = await legalBase('project-audio-unmount')
    const hitSha = await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    const audio = installAudioContextPort()
    const log: TransportLog = { loads: [], plays: 0, stops: 0, disposes: 0 }
    await act(async () => {
      root!.render(
        previewButton({
          asset: 'sound.hit',
          label: '命中音效',
          kind: 'sound',
          cacheKey: hitSha,
          reader: base.reader,
          createTransport: recordingTransportFactory(log),
        }),
      )
      await Promise.resolve()
    })
    await clickPreview('试听 命中音效')
    expect(button('停止试听 命中音效')).toBeDefined()
    const context = audio.contexts[0]!
    expect(context.sources[0]!.starts).toEqual([0])

    const current = root
    root = undefined
    await act(async () => {
      current!.unmount()
      await flushChain()
    })
    expect(context.sources[0]!.stopCalls).toBe(1)
    expect(context.closeCalls).toBe(1)
    expect(log.disposes).toBe(1)

    // 卸载已释放所有权：外部接管不再触碰已销毁 transport。
    const foreign = { stop: vi.fn() }
    await act(async () => {
      claimEditorAudioPreview(foreign)
    })
    expect(foreign.stop).not.toHaveBeenCalled()
    expect(context.sources[0]!.stopCalls).toBe(1)
    expect(context.closeCalls).toBe(1)
  })
})

describe('项目槽位 MIDI 无输出端口时的播放失败', () => {
  beforeAll(async () => {
    // 预热真实解析器的动态 import（spessasynth_core 冷加载超过默认轮询窗口）。
    await analyzeMidiBytes(THEME_MIDI.slice().buffer)
  })

  test('MIDI play 被真实降级拒绝：释放 owner、transport.stop、可读错误、回 idle', async () => {
    const base = await legalBase('project-audio-midi-fail')
    const themeSha = await seedMusic(base, 'music.theme', '主题音乐', THEME_MIDI)
    const log: TransportLog = { loads: [], plays: 0, stops: 0, disposes: 0 }
    // 等待真实后端结算，保持 React 更新在 act 内。
    let settlePlay: () => void = () => {}
    const playSettled = new Promise<void>((resolve) => {
      settlePlay = resolve
    })
    const createTransport = recordingTransportFactory(log, { onPlaySettled: () => settlePlay() })
    await act(async () => {
      root!.render(
        previewButton({
          asset: 'music.theme',
          label: '主题音乐',
          kind: 'music',
          cacheKey: themeSha,
          reader: base.reader,
          createTransport,
        }),
      )
      await Promise.resolve()
    })
    const stopsAfterMount = log.stops
    await act(async () => {
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        button('试听 主题音乐').click()
        await Promise.race([
          playSettled,
          new Promise((resolve) => {
            timer = setTimeout(resolve, 1000)
          }),
        ])
      } finally {
        clearTimeout(timer)
      }
    })
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('当前浏览器不支持 MIDI 试听。')
    expect(button('试听 主题音乐')).toBeDefined()
    expect(log.loads).toEqual([['music.theme', themeSha]])
    expect(log.plays).toBe(1)
    // 失败路径的 catch 恰好多一次 stop（mount 期幂等复位之外的唯一一次）。
    expect(log.stops).toBe(stopsAfterMount + 1)

    // 失败路径已释放 owner：外部接管不得再触发该 transport.stop。
    const foreign = { stop: vi.fn() }
    await act(async () => {
      claimEditorAudioPreview(foreign)
    })
    expect(foreign.stop).not.toHaveBeenCalled()
    expect(log.stops).toBe(stopsAfterMount + 1)
  })
})
