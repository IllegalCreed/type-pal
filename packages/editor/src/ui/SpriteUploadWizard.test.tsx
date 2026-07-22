// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { SpriteUploadWizard } from './SpriteUploadWizard.js'

const reforgeMocks = vi.hoisted(() => ({
  compressGzip: vi.fn(),
  sliceAtlasGrid: vi.fn(),
}))

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@type-pal/reforge')>()
  return {
    ...actual,
    loadStandardPalette: vi.fn(async () => ({})),
    sliceAtlasGrid: reforgeMocks.sliceAtlasGrid,
    quantizeToRleFrame: vi.fn(() => ({ width: 1, height: 1 })),
    encodeSpriteChunk: vi.fn(() => new Uint8Array([1])),
    compressGzip: reforgeMocks.compressGzip,
    bakeFrame: vi.fn(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      return canvas
    }),
  }
})

vi.mock('../core/binary-signature.js', () => ({
  sha256Hex: vi.fn(async () => 'a'.repeat(64)),
}))

let root: Root
let host: HTMLDivElement
let restoreGetContext: ReturnType<typeof vi.spyOn>
let restoreToDataUrl: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  restoreGetContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      }) as never,
  )
  restoreToDataUrl = vi
    .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockReturnValue('data:image/png;base64,AA==')
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: vi.fn(async () => ({ width: 1, height: 1, close: vi.fn() })),
  })
  reforgeMocks.sliceAtlasGrid
    .mockReset()
    .mockImplementation(
      (_rgba: Uint8Array, width: number, height: number, frameWidth: number, frameHeight: number) =>
        Array.from({ length: (width / frameWidth) * (height / frameHeight) }, () => ({
          rgba: new Uint8Array(frameWidth * frameHeight * 4),
          width: frameWidth,
          height: frameHeight,
        })),
    )
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  restoreGetContext.mockRestore()
  restoreToDataUrl.mockRestore()
  Reflect.deleteProperty(globalThis, 'createImageBitmap')
  reforgeMocks.compressGzip.mockReset()
  reforgeMocks.sliceAtlasGrid.mockReset()
})

describe('SpriteUploadWizard', () => {
  test('默认定格用途也能一次导入多帧源容器', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: vi.fn(async () => ({ width: 4, height: 1, close: vi.fn() })),
    })
    await act(async () =>
      root.render(
        <SpriteUploadWizard
          sprites={[]}
          assetBase={{} as never}
          session={{} as never}
          onDone={vi.fn()}
        />,
      ),
    )
    const staticKind = [
      ...host.querySelectorAll<HTMLButtonElement>('.sprite-upload-kind-options button'),
    ].find((button) => button.textContent?.includes('默认定格'))!
    await act(async () => staticKind.click())
    const fileInput = host.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [new File([new Uint8Array([1])], 'candle.png', { type: 'image/png' })],
    })
    await act(async () => {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const cols = host.querySelector<HTMLInputElement>('.sprite-source-grid-fields input')!
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(cols, '4')
      cols.dispatchEvent(new Event('input', { bubbles: true }))
      cols.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(host.textContent).toContain('4×1 帧')
    expect(host.textContent).toContain('初始用途仍默认显示 #0')
    expect(reforgeMocks.sliceAtlasGrid).toHaveBeenLastCalledWith(expect.any(Uint8Array), 4, 1, 1, 1)
  })

  test('入库期间锁住重复提交和取消，完成后只写入一次', async () => {
    let finishCompression: ((bytes: Uint8Array) => void) | undefined
    reforgeMocks.compressGzip.mockImplementation(
      () =>
        new Promise<Uint8Array>((resolve) => {
          finishCompression = resolve
        }),
    )
    const dispatch = vi.fn()
    const onDone = vi.fn()
    const session = {
      getState: () => ({ assetCatalog: { version: 1, assets: {} } }),
      dispatch,
    }
    await act(async () =>
      root.render(
        <SpriteUploadWizard
          sprites={[]}
          assetBase={{} as never}
          session={session as never}
          onDone={onDone}
        />,
      ),
    )
    const staticKind = [
      ...host.querySelectorAll<HTMLButtonElement>('.sprite-upload-kind-options button'),
    ].find((button) => button.textContent?.includes('默认定格'))!
    await act(async () => staticKind.click())

    const fileInput = host.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [new File([new Uint8Array([1])], 'hero.png', { type: 'image/png' })],
    })
    await act(async () => {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const submit = host.querySelector<HTMLButtonElement>('.sprite-upload-submit')!
    const cancel = host.querySelector<HTMLButtonElement>('.sprite-upload-cancel')!
    expect(submit.disabled).toBe(false)
    await act(async () => {
      submit.click()
      submit.click()
      await Promise.resolve()
    })

    expect(reforgeMocks.compressGzip).toHaveBeenCalledTimes(1)
    expect(submit.disabled).toBe(true)
    expect(cancel.disabled).toBe(true)
    expect(host.querySelector('.sprite-upload-wizard')?.getAttribute('aria-busy')).toBe('true')
    cancel.click()
    expect(onDone).not.toHaveBeenCalled()

    await act(async () => {
      finishCompression?.(new Uint8Array([1, 2, 3]))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith('hero')
  })
})
