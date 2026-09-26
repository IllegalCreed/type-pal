import { describe, expect, test } from 'vitest'
import { classes, describedBy } from './control-utils.js'

describe('U00 shared control utilities', () => {
  test('joins truthy class tokens and drops empty describedBy ids', () => {
    expect(classes('ds-button', false, 'ds-button--danger', undefined, 'extra')).toBe(
      'ds-button ds-button--danger extra',
    )
    expect(describedBy(undefined, 'field-1-description', '')).toBe('field-1-description')
    expect(describedBy(undefined, '')).toBeUndefined()
  })
})
