// @vitest-environment jsdom

import { buildBlankProjectMap } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, test } from 'vitest'
import mapModeSource from './MapMode.tsx?raw'
import { useMapStampStructureSession } from './map-stamp-structure-session.js'

let current: ReturnType<typeof useMapStampStructureSession> | undefined
let root: ReturnType<typeof createRoot> | undefined

function Harness() {
  current = useMapStampStructureSession()
  return null
}

async function mount() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  root = createRoot(document.createElement('div'))
  await act(async () => root!.render(<Harness />))
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  root = undefined
  current = undefined
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false
})

describe('map stamp structure session ownership', () => {
  test('MapMode delegates the destructive snapshot and return-focus resource', () => {
    expect(mapModeSource.match(/useMapStampStructureSession\(\)/g)).toHaveLength(1)
    expect(mapModeSource).not.toMatch(/useState<StampStructureIntent>|useRef<HTMLElement \| null>/)
    expect(mapModeSource).toContain('returnFocusRef: stampStructureReturnFocusRef')
    expect(mapModeSource).not.toContain('stampStructureReturnFocusRef.current =')
  })

  test('open captures one map revision, impact list and focus target', async () => {
    await mount()
    const map = buildBlankProjectMap(2, 2, 'tiles')
    const button = document.createElement('button')
    act(() =>
      current!.open(
        {
          operation: { kind: 'remove-layer', layerId: 'floor' },
          mapRevision: 3,
          map,
          placementIds: ['p1'],
        },
        button,
      ),
    )
    expect(current!.intent).toMatchObject({ mapRevision: 3, map, placementIds: ['p1'] })
    expect(current!.returnFocusRef.current).toBe(button)
  })

  test('refresh replaces only the stale snapshot while preserving the requested operation', async () => {
    await mount()
    const before = buildBlankProjectMap(2, 2, 'tiles')
    const after = buildBlankProjectMap(3, 2, 'tiles')
    act(() =>
      current!.open(
        {
          operation: { kind: 'resize', width: 4, height: 4 },
          mapRevision: 1,
          map: before,
          placementIds: ['p1'],
        },
        document.body,
      ),
    )
    act(() => current!.refresh({ mapRevision: 2, map: after, placementIds: ['p2', 'p3'] }))
    expect(current!.intent).toEqual({
      operation: { kind: 'resize', width: 4, height: 4 },
      mapRevision: 2,
      map: after,
      placementIds: ['p2', 'p3'],
    })
  })

  test('close keeps the fallback focus resource until reset releases the whole session', async () => {
    await mount()
    const button = document.createElement('button')
    act(() =>
      current!.open(
        {
          operation: { kind: 'remove-layer', layerId: 'floor' },
          mapRevision: 1,
          map: buildBlankProjectMap(2, 2, 'tiles'),
          placementIds: ['p1'],
        },
        button,
      ),
    )
    act(() => current!.close())
    expect(current!.intent).toBeUndefined()
    expect(current!.returnFocusRef.current).toBe(button)
    act(() => current!.reset())
    expect(current!.returnFocusRef.current).toBeNull()
  })
})
