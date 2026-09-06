// Historical diagnosis only: transform one test file in memory; never rewrite production modules.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import config from '../../../../packages/editor/vite.config.ts'

const target = fileURLToPath(
  new URL('../../../../packages/editor/src/ui/design-system/reorder.test.tsx', import.meta.url),
)
const flush = process.env.COV_DET_TIMING === 'flush'
export default {
  ...config,
  root: fileURLToPath(new URL('../../../../packages/editor/', import.meta.url)),
  plugins: [
    {
      name: 'temporary-reorder-test-frame-boundary',
      enforce: 'pre' as const,
      load(id: string) {
        if (id !== target) return
        let source = readFileSync(target, 'utf8')
        const harness = `
const __covFrames = new Map<number, FrameRequestCallback>()
let __covFrameId = 0
beforeEach(() => {
  __covFrames.clear()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++__covFrameId
    __covFrames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { __covFrames.delete(id) })
})
afterEach(() => { __covFrames.clear(); vi.unstubAllGlobals() })
`
        const suite = "describe('DsReorderCollection', () => {"
        if (source.split(suite).length !== 2) throw new Error('Expected unique suite')
        source = source.replace(suite, harness + suite)
        const needle = `    expect(handle.getAttribute('data-dragging')).toBe('true')

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerup', { x: 40, y: 110, pointerType }))`
        if (source.split(needle).length !== 2) throw new Error('Expected unique pointer phase')
        const inserted = `    expect(handle.getAttribute('data-dragging')).toBe('true')
    if (${flush} && pointerType === 'mouse') {
      expect(__covFrames.size).toBe(1)
      const callbacks = [...__covFrames.values()]
      __covFrames.clear()
      await act(async () => { for (const callback of callbacks) callback(16) })
      expect(onReorder).not.toHaveBeenCalled()
      expect(handle.getAttribute('data-dragging')).toBe('true')
    }

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerup', { x: 40, y: 110, pointerType }))`
        return source.replace(needle, inserted)
      },
    },
    ...config.plugins,
  ],
}
