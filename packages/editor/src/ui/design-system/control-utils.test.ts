import { expect, test } from 'vitest'
import { classes, describedBy } from './control-utils.js'

test('class composition preserves the base, variant, and caller class in order', () => {
  expect(classes('ds-button', false, 'ds-button--danger', undefined, null, 'extra')).toBe(
    'ds-button ds-button--danger extra',
  )
})

test('description IDs keep both caller and field help and omit an empty relation', () => {
  expect(describedBy(undefined, 'size-guide', '', 'field-1-description')).toBe(
    'size-guide field-1-description',
  )
  expect(describedBy(undefined, '')).toBeUndefined()
})
