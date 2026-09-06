import { describe, expect, test } from 'vitest'
import { type EditorPlayIdentity, parsePlayProjectLocation, playProjectQuery } from './play-url.js'

const W = '11111111-1111-4111-8111-111111111111'

describe('playProjectQuery', () => {
  test('HTTP and local content keep the same save identity while changing transport', () => {
    const base = { projectId: 'pal', workspaceId: W }
    expect(playProjectQuery({ ...base, source: 'local' })).toBe(`project=pal&workspace=${W}`)
    expect(playProjectQuery({ ...base, source: 'http' })).toBe(`project=pal&save-workspace=${W}`)
    expect(
      parsePlayProjectLocation(new URLSearchParams(playProjectQuery({ ...base, source: 'local' }))),
    ).toEqual({ source: 'local', projectId: 'pal', workspaceId: W })
    expect(
      parsePlayProjectLocation(new URLSearchParams(playProjectQuery({ ...base, source: 'http' }))),
    ).toEqual({ source: 'http', projectId: 'pal', saveWorkspaceId: W })
  })
  test('manual HTTP stays explicit, exact project ids are URL encoded, unrelated parameters survive', () => {
    expect(parsePlayProjectLocation(new URLSearchParams('project=pal&scene=s001&pos=1,2'))).toEqual(
      { source: 'http', projectId: 'pal' },
    )
    const query = playProjectQuery({ projectId: 'A / 中文', workspaceId: W, source: 'http' })
    expect(query).toBe(`project=A%20%2F%20%E4%B8%AD%E6%96%87&save-workspace=${W}`)
    expect(parsePlayProjectLocation(new URLSearchParams(query)).projectId).toBe('A / 中文')
  })
  test.each([
    '',
    'project=',
    'project=%20',
    'project=pal&project=pal',
    'project=pal&workspace=',
    'project=pal&save-workspace=',
    'project=pal&workspace=bad',
    'project=pal&save-workspace=bad',
    `project=pal&workspace=${W}&workspace=${W}`,
    `project=pal&save-workspace=${W}&save-workspace=${W}`,
    `project=pal&workspace=${W}&save-workspace=${W}`,
  ])('rejects invalid or ambiguous identity before loading: %s', (query) => {
    expect(() => parsePlayProjectLocation(new URLSearchParams(query))).toThrow()
  })
  test.each([
    undefined,
    { projectId: '', workspaceId: W, source: 'http' },
    { projectId: 'p', workspaceId: 'bad', source: 'http' },
    { projectId: 'p', workspaceId: W, source: 'unknown' },
  ])('a missing/invalid editor identity cannot become a bare HTTP URL %#', (identity) => {
    expect(() => playProjectQuery(identity as EditorPlayIdentity)).toThrow('身份')
  })
})
