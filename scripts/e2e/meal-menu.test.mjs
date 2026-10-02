import assert from 'node:assert/strict'
import test from 'node:test'
import { nextMealMenuKey } from './meal-menu.mjs'

test('004 menu decisions follow actual node identity and actual wine cursor', () => {
  assert.equal(nextMealMenuKey({ active: false }, 'reforge'), 'Escape')
  assert.equal(
    nextMealMenuKey(
      { active: true, levels: [{ ids: ['status', 'magic', 'item', 'system'], cursor: 0 }] },
      'reforge',
    ),
    'ArrowDown',
  )
  assert.equal(
    nextMealMenuKey(
      { active: true, levels: [{ ids: ['status', 'magic', 'item', 'system'], cursor: 2 }] },
      'reforge',
    ),
    'Enter',
  )
  assert.equal(
    nextMealMenuKey({ active: true, levels: [{ ids: ['equip', 'use'], cursor: 1 }] }, 'reforge'),
    'Enter',
  )
  assert.equal(
    nextMealMenuKey(
      { active: true, panel: 'use', phase: 'pick-item', itemIds: ['61', '272'], cursor: 0 },
      'reforge',
    ),
    'ArrowRight',
  )
  assert.equal(
    nextMealMenuKey(
      { active: true, panel: 'use', phase: 'pick-item', itemIds: ['61', '272'], cursor: 1 },
      'reforge',
    ),
    null,
  )
  assert.equal(
    nextMealMenuKey(
      { active: true, kind: 'inventory', phase: 'list', itemIds: ['272', '61'], cursor: 0 },
      'game',
    ),
    null,
  )
})
test('004 menu refuses unknown panels, missing wine, target picker and invalid cursor', () => {
  for (const state of [
    { active: true, panel: 'magic' },
    { active: true, panel: 'use', phase: 'pick-item', itemIds: ['61'], cursor: 0 },
    { active: true, panel: 'use', phase: 'pick-target', itemIds: ['272'], cursor: 0 },
    { active: true, panel: 'use', phase: 'pick-item', itemIds: ['272'], cursor: 5 },
    { active: true, levels: [{ ids: ['x'], cursor: 0 }] },
  ])
    assert.throws(() => nextMealMenuKey(state, 'reforge'))
})
