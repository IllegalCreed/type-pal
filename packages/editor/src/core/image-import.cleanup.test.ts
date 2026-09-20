import { afterEach, describe, expect, test, vi } from 'vitest'
import { minimalPng, pngFile } from './__tests__/glm-import-codec-fixtures.js'
import { prepareAuthoredImage } from './image-import.js'

const palette = Array.from({ length: 256 }, (_, index) => [index, index, index] as const)

function host(failAt?: number, fault: 'null' | 'throw' | 'read' = 'null', stage?: string) {
  const close = vi.fn()
  const error = new Error(`injected ${stage ?? fault}`)
  const trap = (at: string) => {
    if (stage === at) throw error
  }
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => {
      trap('decode')
      return { width: 320, height: 200, close }
    }),
  )
  let encodes = 0
  let puts = 0
  vi.stubGlobal('document', {
    createElement: () => {
      trap('canvas')
      return {
        width: 0,
        height: 0,
        getContext: () => {
          trap('context')
          return stage === 'no-context'
            ? null
            : {
                drawImage() {
                  trap('draw')
                },
                getImageData: () => {
                  trap('pixels')
                  return { data: new Uint8ClampedArray(320 * 200 * 4) }
                },
                createImageData: () => ({ data: new Uint8ClampedArray(320 * 200 * 4) }),
                putImageData() {
                  puts++
                  trap(`put-${puts}`)
                },
              }
        },
        toBlob(callback: (value: Blob | null) => void) {
          encodes += 1
          if (encodes === failAt && fault === 'throw') throw error
          const blob = new Blob([minimalPng(320, 200)], { type: 'image/png' })
          if (encodes === failAt && fault === 'read')
            vi.spyOn(blob, 'arrayBuffer').mockRejectedValue(error)
          callback(encodes === failAt && fault === 'null' ? null : blob)
        },
      }
    },
  })
  return { close, error, encodes: () => encodes }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('static image bitmap ownership', () => {
  test('successful two-image encoding releases exactly once and retains output', async () => {
    const h = host()
    const result = await prepareAuthoredImage(
      pngFile('background.png', 320, 200),
      'battle-background',
      palette,
    )
    expect(h.encodes()).toBe(2)
    expect(h.close).toHaveBeenCalledTimes(1)
    expect(new Uint8Array(result.bytes)).toEqual(new Uint8Array(minimalPng(320, 200)))
    expect(new Uint8Array(result.effectPreviewBytes!)).toEqual(new Uint8Array(result.bytes))
  })

  test.each([
    1, 2,
  ])('encoder failure at output %i releases exactly once and preserves error', async (failAt) => {
    const h = host(failAt)
    await expect(
      prepareAuthoredImage(pngFile('background.png', 320, 200), 'battle-background', palette),
    ).rejects.toThrow('浏览器无法编码 PNG')
    expect(h.encodes()).toBe(failAt)
    expect(h.close).toHaveBeenCalledTimes(1)
  })
  test.each([
    ['throw', 1],
    ['throw', 2],
    ['read', 1],
    ['read', 2],
  ] as const)('%s failure at output %i keeps the original error and releases', async (fault, at) => {
    const h = host(at, fault)
    await expect(
      prepareAuthoredImage(pngFile('background.png', 320, 200), 'battle-background', palette),
    ).rejects.toBe(h.error)
    expect(h.encodes()).toBe(at)
    expect(h.close).toHaveBeenCalledTimes(1)
  })
  test.each([
    'canvas',
    'context',
    'draw',
    'pixels',
    'put-1',
    'put-2',
  ])('%s host failure releases the bitmap once', async (stage) => {
    const h = host(undefined, 'null', stage)
    await expect(
      prepareAuthoredImage(pngFile('background.png', 320, 200), 'battle-background', palette),
    ).rejects.toBe(h.error)
    expect(h.close).toHaveBeenCalledTimes(1)
  })
  test.each([
    'missing-palette',
    'bad-palette',
    'no-context',
  ])('%s rejection does not double-close', async (stage) => {
    const h = host(undefined, 'null', stage)
    const colors =
      stage === 'missing-palette'
        ? undefined
        : stage === 'bad-palette'
          ? palette.slice(0, 2)
          : palette
    await expect(
      prepareAuthoredImage(pngFile('background.png', 320, 200), 'battle-background', colors),
    ).rejects.toThrow(
      stage === 'no-context' ? '无法创建' : stage === 'bad-palette' ? '256' : '缺项目',
    )
    expect(h.close).toHaveBeenCalledTimes(1)
  })
  test('portrait bypass and digest failure both release before hashing', async () => {
    const h = host()
    const source = pngFile('portrait.png', 320, 200)
    const result = await prepareAuthoredImage(source, 'portrait')
    expect(result.effectPreviewBytes).toBeUndefined()
    expect(h.encodes()).toBe(0)
    expect(h.close).toHaveBeenCalledTimes(1)
    const error = new Error('digest unavailable')
    vi.spyOn(crypto.subtle, 'digest').mockImplementation(async () => {
      expect(h.close).toHaveBeenCalledTimes(2)
      throw error
    })
    await expect(prepareAuthoredImage(source, 'portrait')).rejects.toBe(error)
    expect(h.close).toHaveBeenCalledTimes(2)
  })
  test('decode rejection never attempts to close an unacquired bitmap', async () => {
    const h = host(undefined, 'null', 'decode')
    await expect(
      prepareAuthoredImage(pngFile('background.png', 320, 200), 'battle-background', palette),
    ).rejects.toThrow('background.png: PNG 解码失败；injected decode')
    expect(h.close).not.toHaveBeenCalled()
    expect(h.encodes()).toBe(0)
  })
})
