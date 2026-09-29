// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A06（FireEffectPreview 对）：播放控制与音效准备门。
 * 去重：preview-cache-boundaries 已证帧加载缓存、SHA/调色板失效、在途换选与失败恢复。
 * 本文件只补播放面：无音效时播放/暂停切换与倍速选择；配了音效但准备失败时错误可见
 * 且不进入播放（音效准备必须发生在用户手势中的合同）；闸门未释放时不得出现画布。
 * 资源走真实 fixture 字节与真实解码器；画布 2d 属测试宿主替身。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { spyCanvas2dPort } from '../__tests__/glm-large-wave/canvas-2d-port.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { deferred, previewCacheFixture } from './__tests__/preview-cache-fixture.js'
import { FireEffectPreview } from './FireEffectPreview.js'

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  await stubNodeTestHost()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  spyCanvas2dPort({
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: vi.fn(),
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mountFire(
  anim: { effectSprite: number; speed?: number; fireDelay?: number; sound?: string },
  chunk: number,
): Promise<ReturnType<typeof previewCacheFixture> extends Promise<infer T> ? T : never> {
  const fixture = await previewCacheFixture(`glw-fire-${chunk}`, chunk, [240, 20, 20])
  await act(async () =>
    root.render(
      <FireEffectPreview assetBase={fixture.base} assetReader={fixture.reader} anim={anim} />,
    ),
  )
  await vi.waitFor(async () => {
    await act(async () => {})
    expect(host.querySelector('canvas')).not.toBeNull()
  })
  return fixture
}

const playButton = (): HTMLButtonElement =>
  ([...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.getAttribute('aria-label') === '播放 FIRE 特效预览',
  ) ??
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.getAttribute('aria-label') === '暂停 FIRE 特效预览',
    ))!

test('无音效特效可播放/暂停并切换倍速，figcaption 标注帧数与实速', async () => {
  await mountFire({ effectSprite: 4201, speed: 1 }, 4201)
  const caption = host.querySelector('figcaption')!
  expect(caption.textContent).toContain('1 帧')
  expect(caption.textContent).toContain('实速 60ms/帧')
  expect(playButton().getAttribute('aria-label')).toBe('播放 FIRE 特效预览')
  await act(async () => playButton().click())
  expect(playButton().getAttribute('aria-label')).toBe('暂停 FIRE 特效预览')
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="FIRE 特效预览倍速"]')!
  await act(async () => trigger.click())
  const quarter = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (option) => option.textContent === '0.25×',
  )!
  await act(async () => quarter.click())
  expect(trigger.textContent).toContain('0.25×')
  expect(playButton().getAttribute('aria-label')).toBe('暂停 FIRE 特效预览')
  await act(async () => playButton().click())
  expect(playButton().getAttribute('aria-label')).toBe('播放 FIRE 特效预览')
})

test('音效准备失败时错误可见且不进入播放', async () => {
  await mountFire({ effectSprite: 4202, sound: 'sfx-glw-missing' }, 4202)
  await act(async () => playButton().click())
  await vi.waitFor(async () => {
    await act(async () => {})
    expect(host.querySelector('.cf-err')?.textContent).toBeTruthy()
  })
  expect(playButton().getAttribute('aria-label')).toBe('播放 FIRE 特效预览')
})

test('真实 fire 字节读取失败时给出失败态且无画布', async () => {
  const fixture = await previewCacheFixture('glw-fire-fail', 4301, [20, 90, 240])
  fixture.faults.add(fixture.firePath)
  await act(async () =>
    root.render(
      <FireEffectPreview
        assetBase={fixture.base}
        assetReader={fixture.reader}
        anim={{ effectSprite: 4301 }}
      />,
    ),
  )
  await vi.waitFor(async () => {
    await act(async () => {})
    expect(host.textContent).toContain('无法加载 FIRE #4301')
  })
  expect(host.querySelector('canvas')).toBeNull()
})

test('闸门未释放时保持加载态不出现画布，释放后真实解码完成挂载', async () => {
  const fixture = await previewCacheFixture('glw-fire-gate', 4401, [20, 90, 240])
  const entered = deferred<void>(),
    release = deferred<void>()
  fixture.gates.set(fixture.firePath, { entered, release })
  const rendered = Promise.resolve(
    act(async () => {
      root.render(
        <FireEffectPreview
          assetBase={fixture.base}
          assetReader={fixture.reader}
          anim={{ effectSprite: 4401 }}
        />,
      )
    }),
  ).catch(() => undefined)
  await entered.promise
  await act(async () => {})
  expect(host.querySelector('canvas')).toBeNull()
  expect(host.textContent).toContain('正在加载 FIRE #4401')
  await act(async () => {
    release.resolve()
    await rendered
  })
  await vi.waitFor(async () => {
    await act(async () => {})
    expect(host.querySelector('canvas')).not.toBeNull()
  })
})
