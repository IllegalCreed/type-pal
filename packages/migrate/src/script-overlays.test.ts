import type { SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { applyPalScriptOverlays } from './script-overlays.js'

describe('PAL 脚本 overlay', () => {
  test('按语义锚点补李大娘三段移动与退场状态，不依赖命令下标', () => {
    const scene: SceneDef = {
      id: 's001',
      map: { reuseOriginalMap: 1 },
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
      onEnter: [
        {
          body: [
            { kind: 'setEntityState', entity: 'e10', state: 2 },
            { kind: 'wait', ms: 1 },
            { kind: 'dialog', line: { text: 'dlg.1369' } },
            { kind: 'wait', ms: 1 },
            { kind: 'setEntityFacing', entity: 'e10', facing: 'up' },
            { kind: 'dialog', line: { text: 'dlg.1371' } },
            { kind: 'wait', ms: 1 },
            { kind: 'moveParty', to: { col: 1, row: 1, height: 0 }, speed: 'slow' },
          ],
        },
      ],
    }
    const body = applyPalScriptOverlays([scene])[0]!.onEnter![0]!.body
    expect(body.filter((command) => command.kind === 'moveEntity')).toHaveLength(3)
    expect(
      body.some((command) => command.kind === 'setEntityState' && command.entity === 'e3'),
    ).toBe(true)
    expect(
      body.some(
        (command) =>
          command.kind === 'setEntityState' && command.entity === 'e10' && command.state === 0,
      ),
    ).toBe(true)
    expect(scene.onEnter![0]!.body).toHaveLength(8)
  })
})
