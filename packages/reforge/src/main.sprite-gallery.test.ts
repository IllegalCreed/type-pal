// @vitest-environment jsdom
import { expect, test, vi } from 'vitest'
import { installShellHost } from './__tests__/runtime-shell/dom-host.js'
import { scenarioProject } from './__tests__/runtime-shell/scenarios.js'
import { expectDefined } from './defined.js'

test('sprite gallery labels a failed asset without drawing its sprite or starting a world frame', async () => {
  const host = await installShellHost('?gallery')
  try {
    const fixture = await scenarioProject()
    const catalogEntry = expectDefined(fixture.project.assetResolver.catalog.assets.sprite)
    fixture.binaries.set(catalogEntry.path, new TextEncoder().encode('not an RLE chunk'))
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await (await import('./main.js')).bootGame(fixture.project, {
      kind: 'project',
      projectId: 'shell-project',
    })
    const presented = host.draws.filter(({ canvas }) => canvas.id === 'screen')
    expect(
      presented.filter(({ method }) => method === 'fillText').map(({ args }) => args[0]),
    ).toContain('sprite')
    expect(presented.some(({ method }) => method === 'drawImage')).toBe(false)
    expect(log).toHaveBeenCalledExactlyOnceWith(
      '[reforge] sprite gallery 1 catalog assets rendered',
    )
    expect(host.frames.size).toBe(0)
  } finally {
    await host.close()
  }
})
