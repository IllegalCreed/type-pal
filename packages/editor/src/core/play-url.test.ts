import { describe, expect, test } from 'vitest'
import { playProjectQuery } from './play-url.js'

describe('playProjectQuery', () => {
  test('keeps HTTP dev explicit and addresses local projects by workspace identity', () => {
    expect(playProjectQuery('pal')).toBe('project=pal')
    expect(playProjectQuery('pal', 'workspace / one')).toBe(
      'project=pal&workspace=workspace%20%2F%20one',
    )
  })
})
