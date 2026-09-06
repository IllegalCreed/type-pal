// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const probes = vi.hoisted(() => ({
  boot: vi.fn(),
  load: vi.fn(),
  record: vi.fn(),
  permission: vi.fn(),
}))
vi.mock('@type-pal/reforge', () => ({ bootGame: probes.boot }))
vi.mock('./core/load-play-project.js', () => ({ loadPlayProject: probes.load }))
vi.mock('./core/handle-store.js', () => ({
  loadWorkspaceRecord: probes.record,
  ensurePermission: probes.permission,
}))

const W = '11111111-1111-4111-8111-111111111111'
const handle = { name: 'isolated-test-directory' }
const loaded = { manifest: { id: 'pal' } }
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  document.body.innerHTML =
    '<div id="gate" hidden><button id="gate-btn">授权</button><p id="gate-hint"></p></div>'
  probes.boot.mockResolvedValue(undefined)
  probes.load.mockResolvedValue(loaded)
  probes.record.mockResolvedValue({ workspaceId: W, projectId: 'pal', handle })
  probes.permission.mockResolvedValue('granted')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})
async function open(query: string) {
  history.replaceState(null, '', `/play.html?${query}`)
  await import('./play.js')
}
async function expectFailure(text: string) {
  await vi.waitFor(() => expect(document.getElementById('gate-hint')?.textContent).toContain(text))
  expect(document.getElementById('gate')?.hidden).toBe(false)
  expect(probes.boot).not.toHaveBeenCalled()
}

describe('real editor play entry identity wiring', () => {
  test('explicit manual HTTP uses the loaded canonical project identity, not a folder alias', async () => {
    await open('project=folder-alias&scene=s001&pos=1,2')
    await vi.waitFor(() =>
      expect(probes.boot).toHaveBeenCalledWith(loaded, { kind: 'project', projectId: 'pal' }),
    )
    expect(probes.load).toHaveBeenCalledWith('folder-alias')
    expect(probes.record).not.toHaveBeenCalled()
    expect(probes.permission).not.toHaveBeenCalled()
    expect(location.search).toContain('scene=s001&pos=1,2')
  })
  test('an unbound editor workspace loads HTTP but keeps its workspace save identity', async () => {
    await open(`project=pal&save-workspace=${W}&battle=0`)
    await vi.waitFor(() =>
      expect(probes.boot).toHaveBeenCalledWith(loaded, {
        kind: 'workspace',
        projectId: 'pal',
        workspaceId: W,
      }),
    )
    expect(probes.load).toHaveBeenCalledWith('pal')
    expect(probes.record).not.toHaveBeenCalled()
  })
  test('a bound workspace loads only its FSA handle and retains the same save identity', async () => {
    await open(`project=pal&workspace=${W}`)
    await vi.waitFor(() =>
      expect(probes.boot).toHaveBeenCalledWith(loaded, {
        kind: 'workspace',
        projectId: 'pal',
        workspaceId: W,
      }),
    )
    expect(probes.load).toHaveBeenCalledWith('', handle)
    expect(probes.permission).toHaveBeenCalledWith(handle, { withRequest: false })
  })
  test('permission prompts do not load content or boot before a user grant', async () => {
    probes.permission.mockResolvedValueOnce('prompt').mockResolvedValueOnce('granted')
    await open(`project=pal&workspace=${W}`)
    await vi.waitFor(() => expect(document.getElementById('gate')?.hidden).toBe(false))
    expect(probes.load).not.toHaveBeenCalled()
    document.getElementById('gate-btn')?.click()
    await vi.waitFor(() =>
      expect(probes.boot).toHaveBeenCalledWith(loaded, {
        kind: 'workspace',
        projectId: 'pal',
        workspaceId: W,
      }),
    )
    expect(probes.permission).toHaveBeenLastCalledWith(handle, { withRequest: true })
  })
  test('denied permission keeps the gate usable and never falls back to HTTP', async () => {
    probes.permission.mockResolvedValue('denied')
    await open(`project=pal&workspace=${W}`)
    await vi.waitFor(() => expect(document.getElementById('gate')?.hidden).toBe(false))
    document.getElementById('gate-btn')?.click()
    await expectFailure('未授权')
    expect(probes.load).not.toHaveBeenCalled()
  })
  test.each([
    '',
    'project=pal&workspace=',
    `project=pal&workspace=${W}&save-workspace=${W}`,
    'project=pal&project=other',
  ])('invalid identity %s fails before any resource access', async (query) => {
    await open(query)
    await expectFailure(
      query === ''
        ? '项目标识'
        : query.includes('workspace=&') || query.endsWith('workspace=')
          ? '工作区标识'
          : query.includes('save-workspace')
            ? '同时'
            : '重复',
    )
    expect(probes.load).not.toHaveBeenCalled()
    expect(probes.record).not.toHaveBeenCalled()
  })
  test.each([
    [null, '句柄已失效'],
    [{ workspaceId: W, projectId: 'other', handle }, '项目 id'],
    [{ workspaceId: '22222222-2222-4222-8222-222222222222', projectId: 'pal', handle }, '请求身份'],
  ])('bad record cannot fall back to HTTP (%j)', async (record, message) => {
    probes.record.mockResolvedValue(record)
    await open(`project=pal&workspace=${W}`)
    await expectFailure(String(message))
    expect(probes.load).not.toHaveBeenCalled()
  })
  test('local manifest mismatch refuses boot even after a successful handle lookup', async () => {
    probes.load.mockResolvedValue({ manifest: { id: 'other' } })
    await open(`project=pal&workspace=${W}`)
    await expectFailure('manifest 项目 id')
    expect(probes.load).toHaveBeenCalledWith('', handle)
  })
  test('a post-grant loader failure remains visible instead of reporting a successful boot', async () => {
    probes.permission.mockResolvedValueOnce('prompt').mockResolvedValueOnce('granted')
    probes.load.mockRejectedValue(new Error('read failed'))
    await open(`project=pal&workspace=${W}`)
    await vi.waitFor(() => expect(document.getElementById('gate')?.hidden).toBe(false))
    document.getElementById('gate-btn')?.click()
    await expectFailure('read failed')
  })
})
