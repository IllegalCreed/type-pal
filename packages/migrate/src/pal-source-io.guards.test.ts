import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { loadPalContentSupplySources } from './pal-content-supply-io.js'

let repo = ''

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'glw-pal-io-'))
})

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
})

const SCENES = 295
const TILEMAPS = 223

function sceneJson(id: number, mapNum = id + 1): object {
  if (id === 294) return { sceneId: 294, mapNum: 0, eventObjects: [] }
  return { sceneId: id, mapNum, eventObjects: [] }
}

/** 组装合成提取树；可注入各守卫的破坏点。 */
function buildTree(
  options: { scenes?: number; breakStub?: boolean; zeroMapNum?: boolean; tilemaps?: number } = {},
): void {
  for (const rel of [
    'data/extracted/data/scene',
    'data/extracted/data/tilemap',
    'data/extracted/events',
  ])
    mkdirSync(join(repo, rel), { recursive: true })
  const write = (rel: string, value: unknown): void =>
    writeFileSync(join(repo, rel), JSON.stringify(value))
  write('data/extracted/events/all.json', { segments: [{ commands: [] }] })
  write('data/extracted/data/player-roles.json', { roles: [] })
  for (const rel of [
    'data/extracted/data/level-up-exp.json',
    'data/extracted/data/items.json',
    'data/extracted/data/object-players.json',
    'data/extracted/data/stores.json',
  ])
    write(rel, [])
  write('data/extracted/data/music-manifest.json', { midi: [] })
  const sceneCount = options.scenes ?? SCENES
  for (let id = 0; id < sceneCount; id++) {
    if (id === 294 && options.breakStub)
      write(`data/extracted/data/scene/${id}.json`, {
        sceneId: 294,
        mapNum: 0,
        eventObjects: [{ stale: true }],
      })
    else if (id === 0 && options.zeroMapNum)
      write(`data/extracted/data/scene/${id}.json`, sceneJson(id, 0))
    else write(`data/extracted/data/scene/${id}.json`, sceneJson(id))
  }
  const tilemapCount = options.tilemaps ?? TILEMAPS
  for (let num = 0; num < tilemapCount; num++)
    write(`data/extracted/data/tilemap/${num}.json`, { layers: [] })
}

function loadError(): Error {
  try {
    loadPalContentSupplySources(repo)
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error))
  }
  throw new Error('loadPalContentSupplySources unexpectedly succeeded')
}

describe('loadPalContentSupplySources source-tree guards', () => {
  test('场景源数量偏离 295 时停止迁移并给出精确计数', () => {
    buildTree({ scenes: SCENES - 1 })
    expect(loadError().message).toBe('PAL 场景源期望 295 个，收到 294')
  })

  test('s294 不再是精确空 stub 时停止迁移', () => {
    buildTree({ breakStub: true })
    expect(loadError().message).toBe('s294 不再是精确空 stub；停止迁移并重新审计场景全集')
  })

  test('s000-s293 出现非正 mapNum 时停止迁移', () => {
    buildTree({ zeroMapNum: true })
    expect(loadError().message).toBe('s000-s293 出现非正 mapNum；停止迁移')
  })

  test('地图源数量偏离 223 时停止迁移', () => {
    buildTree({ tilemaps: TILEMAPS - 1 })
    expect(loadError().message).toBe('PAL 地图源期望 223 张，收到 222')
  })

  test('场景与地图守卫全部通过后才进入资产装载（守卫先于资产 IO）', () => {
    buildTree()
    const message = loadError().message
    expect(message).not.toContain('期望 295')
    expect(message).not.toContain('精确空 stub')
    expect(message).not.toContain('非正 mapNum')
    expect(message).not.toContain('期望 223 张')
    expect(message.length).toBeGreaterThan(0)
  })
})
