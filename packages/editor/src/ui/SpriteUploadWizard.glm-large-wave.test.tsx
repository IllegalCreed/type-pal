// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A05（wizard 对）：行走图动作帧行的网格推导合同。
 * 去重：SpriteUploadWizard.test 已证多帧导入与入库锁；selection 测试已证在途换选/草稿
 * 竞态与同内容去重。本文件只补未被覆盖的动作帧行：rows=4+K 参与整除推导，切帧读数与
 * 缩略图数量随之变化，整除失败时显式报错且缩略图消失，回退后恢复。
 * 切分使用真实 sliceAtlasGrid；仅画布 2d、量化与 gzip 属测试宿主替身（与既有测试同界）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { spyCanvas2dPort } from '../__tests__/glm-large-wave/canvas-2d-port.js'
import { EditSession } from '../core/edit-session.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { SpriteUploadWizard } from './SpriteUploadWizard.js'

let legal: Awaited<ReturnType<typeof loadLegalUiProject>>

const reforgeMocks = vi.hoisted(() => ({
  quantizeToRleFrame: vi.fn(() => ({ width: 1, height: 1 })),
  bakeFrame: vi.fn(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas
  }),
}))

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@type-pal/reforge')>()
  return {
    ...actual,
    loadStandardPalette: vi.fn(async () => ({})),
    quantizeToRleFrame: reforgeMocks.quantizeToRleFrame,
    bakeFrame: reforgeMocks.bakeFrame,
  }
})

const WIDTH = 64
const HEIGHT = 20

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  await stubNodeTestHost()
  legal ??= await loadLegalUiProject('glm-large-wave-wizard')
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  spyCanvas2dPort({
    getImageData: vi.fn(() => {
      const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4)
      for (let index = 3; index < data.length; index += 4) data[index] = 255
      return { data, width: WIDTH, height: HEIGHT }
    }),
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AA==')
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: vi.fn(async () => ({ width: WIDTH, height: HEIGHT, close: vi.fn() })),
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'createImageBitmap')
})

async function pickSource(): Promise<void> {
  const fileInput = host.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(fileInput, 'files', {
    configurable: true,
    value: [new File([new Uint8Array([1, 2, 3])], 'walk-sheet.png', { type: 'image/png' })],
  })
  await act(async () => {
    fileInput.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await act(async () => {})
  // 默认每向 3 帧与 64px 宽不整除；先用合法 2 帧进入网格态。
  await setNumber('sprite-upload-frames-per-direction', 2)
}

async function setNumber(id: string, value: number): Promise<void> {
  const input = host.querySelector<HTMLInputElement>(`#${id}`)!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const readout = (): string =>
  [...host.querySelectorAll('.sprite-upload-readout')].map((node) => node.textContent).join(' ')
const thumbCount = (): number => host.querySelectorAll('.tile-cell').length

describe('A05 动作帧行网格推导', () => {
  test('默认行走图按 4 行切分，动作帧行参与整除与切帧读数', async () => {
    await act(async () =>
      root.render(
        <SpriteUploadWizard
          sprites={[]}
          assetBase={legal.assetBase}
          session={new EditSession(legal.state)}
          onDone={vi.fn()}
        />,
      ),
    )
    await pickSource()
    expect(readout()).toContain('2×4 帧 · 每帧 32×5')
    expect(thumbCount()).toBe(8)
    await setNumber('sprite-upload-action-rows', 1)
    expect(readout()).toContain('2×5 帧 · 每帧 32×4')
    expect(thumbCount()).toBe(10)
  })

  test('动作帧行导致整除失败时显式报错并撤下缩略图，回退后恢复', async () => {
    await act(async () =>
      root.render(
        <SpriteUploadWizard
          sprites={[]}
          assetBase={legal.assetBase}
          session={new EditSession(legal.state)}
          onDone={vi.fn()}
        />,
      ),
    )
    await pickSource()
    expect(readout()).toContain('2×4 帧 · 每帧 32×5')
    // 20px 高无法被 4+2 行整除 → 网格失效
    await setNumber('sprite-upload-action-rows', 2)
    expect(host.querySelector('.err')?.textContent).toContain('图片尺寸无法按当前行列切分')
    expect(thumbCount()).toBe(0)
    await setNumber('sprite-upload-action-rows', 1)
    expect(host.querySelector('.err')).toBeNull()
    expect(thumbCount()).toBe(10)
  })
})
