// @vitest-environment jsdom
import { test } from 'vitest'
import {
  choose,
  commandForm,
  input,
} from '../../../packages/editor/src/ui/__tests__/command-form-current-fixture.js'

test('loadScene can clear an explicit facing via the keep-current option', async () => {
  const f = await commandForm({
    kind: 'loadScene',
    scene: 'start',
    pos: { col: 2, row: 3, height: 0 },
    facing: 'left',
  })
  await input('col / row / h', 8, 0)
  await choose('朝向', '(保持)')
  await f.finish({ kind: 'loadScene', scene: 'start', pos: { col: 8, row: 3, height: 0 } })
})
