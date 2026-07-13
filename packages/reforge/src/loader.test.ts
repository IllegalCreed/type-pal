import type { LoadedManifest } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { FileSource } from './file-source.js'
import { assembleProject, loadProjectFrom, loadSceneDef } from './loader.js'

const manifest: LoadedManifest = {
  id: 'demo',
  name: '鬼界·民居(验证 demo)',
  contentVersion: 1,
  entryScene: 'guijie-minju',
  content: {},
  assets: {
    root: 'assets',
    maps: 'maps',
    tilesets: 'tilesets',
    sprites: 'sprites',
    palettes: 'palettes',
  },
  startWorld: {
    party: ['li-xiaoyao'],
    money: 0,
    learnedSkills: { 'li-xiaoyao': ['296'] },
    inventory: [],
  },
}

// C0:characters → actors(battler 包住战斗数据)
const actorsJson = [
  {
    id: 'li-xiaoyao',
    name: 'name.li-xiaoyao',
    spriteId: 'li-xiaoyao',
    battler: {
      baseStats: {
        level: 1,
        hp: 150,
        maxHP: 150,
        mp: 100,
        maxMP: 100,
        attack: 33,
        defense: 32,
        magicAttack: 20,
        speed: 28,
        luck: 32,
      },
      initialEquipment: { weapon: '166' },
      initialMagic: ['296'],
    },
  },
  { id: 'youhun', name: 'name.youhun', spriteId: 'ghost' },
]
const scenesJson = [
  {
    id: 'guijie-minju',
    map: { reuseOriginalMap: 56, room: { col: 26, row: 34, cols: 22, rows: 25 } },
    entry: { pos: { col: 90, row: 14, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'wandering-ghost',
        pos: { col: 92, row: 12, height: 0 },
        actor: 'youhun',
        facing: 'down',
        collide: true,
        interact: 'ghost-hearsay',
      },
    ],
    dialogues: [],
  },
]
const skillsJson = {
  skills: [
    {
      id: '296',
      name: '气疗术',
      desc: 'x',
      cost: { mp: 6 },
      usableOutsideBattle: true,
      target: 'oneAlly',
      effects: [{ kind: 'healHp', amount: 75 }],
      animation: { effectSprite: 27 },
    },
  ],
  levelUp: { 'li-xiaoyao': [{ level: 7, skillId: '349' }] },
}
const itemsJson = [
  { id: '166', name: '木剑', desc: 'x', icon: 56, buyPrice: 50, sellPrice: 25, sellable: true },
]
const localeJson = { 'menu.status': '状态' }
const spritesJson = [
  { id: 'ghost', spriteNum: 16, label: '游魂', layout: { kind: 'directional', framesPerDir: 3 } },
]
const baseJsons = {
  actors: actorsJson,
  sceneIds: ['guijie-minju'],
  entryScene: scenesJson[0],
  skills: skillsJson,
  items: itemsJson,
  locale: localeJson,
}

describe('assembleProject(纯核)', () => {
  test('组装:sceneIds 清单 + 入口场景 + actorsById/skills/items Record + locale + manifest', () => {
    const p = assembleProject(manifest, baseJsons)
    expect(p.manifest.id).toBe('demo')
    expect(p.sceneIds).toEqual(['guijie-minju'])
    expect(p.projectRoot).toBe('projects/demo')
    expect(p.entryScene?.id).toBe('guijie-minju') // 入口场景已载入(其余懒加载)
    expect(p.actorsById['li-xiaoyao']?.battler?.baseStats.attack).toBe(33)
    expect(p.actorsById.youhun?.spriteId).toBe('ghost') // 无 battler 的 NPC 也在表
    expect(p.skills['296']?.name).toBe('气疗术')
    expect(p.levelUp['li-xiaoyao']).toEqual([{ level: 7, skillId: '349' }])
    expect(p.items['166']?.name).toBe('木剑')
    expect(p.locale['menu.status']).toBe('状态')
  })
  test('入口场景 id 与 manifest 不符 → throw;不在 index → throw', () => {
    expect(() => assembleProject({ ...manifest, entryScene: 'nope' }, baseJsons)).toThrow(
      '入口场景',
    )
    expect(() => assembleProject(manifest, { ...baseJsons, sceneIds: ['other'] })).toThrow(
      '不在 scenes/index.json',
    )
  })
  test('sceneIds 非 string[] → throw', () => {
    expect(() => assembleProject(manifest, { ...baseJsons, sceneIds: [1] })).toThrow('string[]')
  })
  test('guard 拦截:items 缺 id → throw', () => {
    expect(() => assembleProject(manifest, { ...baseJsons, items: [{ name: 'x' }] })).toThrow('id')
  })
  test('guard 拦截:actors 缺 spriteId → throw(C0)', () => {
    expect(() =>
      assembleProject(manifest, { ...baseJsons, actors: [{ id: 'a', name: 'n' }] }),
    ).toThrow('spriteId')
  })
  test('sprites 可选:不传 → spritesById 为空 {}(向后兼容)', () => {
    const p = assembleProject(manifest, baseJsons)
    expect(p.spritesById).toEqual({})
  })
  test('sprites 传入 → 按 id 索引到 spritesById(含 layout)', () => {
    const p = assembleProject(manifest, { ...baseJsons, sprites: spritesJson })
    expect(p.spritesById.ghost?.spriteNum).toBe(16)
    expect(p.spritesById.ghost?.layout).toEqual({ kind: 'directional', framesPerDir: 3 })
  })
  test('poisons 可选:不传 → poisonsById 空;传入 → 按 id 索引(P2)', () => {
    expect(assembleProject(manifest, baseJsons).poisonsById).toEqual({})
    const p = assembleProject(manifest, {
      ...baseJsons,
      poisons: [
        { id: 551, name: '赤毒', curability: 'common', color: 16, playerTicks: [{ hpDelta: -7 }] },
      ],
    })
    expect(p.poisonsById[551]?.curability).toBe('common')
    expect(p.poisonsById[551]?.playerTicks?.[0]?.hpDelta).toBe(-7)
  })

  test('ambiences 可选:不传 → 空(setAmbience no-op);传入 → 原序数组(W6)', () => {
    expect(assembleProject(manifest, baseJsons).ambiences).toEqual([])
    const p = assembleProject(manifest, {
      ...baseJsons,
      ambiences: [
        { id: 'day', name: '白天', tint: [255, 255, 255] },
        { id: 'night', name: '夜晚', tint: [117, 229, 255] },
      ],
    })
    expect(p.ambiences.map((a) => a.id)).toEqual(['day', 'night'])
    expect(p.ambiences[1]?.tint).toEqual([117, 229, 255])
  })
})

/** 内存 FileSource:按 rel → 预置 JSON 值;缺则抛 404(素材二进制本测不涉)。 */
function memSource(files: Record<string, unknown>): FileSource {
  return {
    async readText(rel) {
      return JSON.stringify(files[rel])
    },
    async readJson<T>(rel: string) {
      if (!(rel in files)) throw new Error(`memSource 404 ${rel}`)
      return files[rel] as T
    },
    async readBytes() {
      throw new Error('memSource.readBytes 不涉本测')
    },
    async urlFor(rel) {
      return rel
    },
  }
}

describe('loadProjectFrom(经 FileSource)', () => {
  const files: Record<string, unknown> = {
    'manifest.json': {
      ...manifest,
      content: {
        actors: 'content/actors.json',
        skills: 'content/skills.json',
        items: 'content/items.json',
        locale: 'content/locale.json',
      },
    },
    'content/actors.json': actorsJson,
    'content/skills.json': skillsJson,
    'content/items.json': itemsJson,
    'content/locale.json': localeJson,
    'content/scenes/index.json': ['guijie-minju'],
    'content/scenes/guijie-minju.json': scenesJson[0],
  }

  test('读 manifest + 内容 + 入口场景 → LoadedProject(带 source)', async () => {
    const p = await loadProjectFrom(memSource(files))
    expect(p.entryScene.id).toBe('guijie-minju')
    expect(p.sceneIds).toEqual(['guijie-minju'])
    expect(p.actorsById['li-xiaoyao']).toBeDefined()
    expect(p.source).toBeDefined()
  })

  test('loadSceneDef 经 project.source 读单场景', async () => {
    const p = await loadProjectFrom(memSource(files))
    const scene = await loadSceneDef(p, 'guijie-minju')
    expect(scene.id).toBe('guijie-minju')
  })

  test('scripts 启动只读 index，目标 chunk 到 resolve 时才按需读取', async () => {
    const scriptId = 'scene/guijie-minju/on-enter/0'
    const scriptFiles = {
      ...files,
      'manifest.json': {
        ...(files['manifest.json'] as LoadedManifest),
        content: {
          ...(files['manifest.json'] as LoadedManifest).content,
          scripts: 'content/scripts/',
        },
      },
      'content/scripts/index.json': {
        version: 1,
        shards: { shared: 1, global: {} },
        chunks: {
          'scene/guijie-minju': { path: 'chunks/scene/guijie-minju.json', bytes: 100 },
        },
      },
      'content/scripts/chunks/scene/guijie-minju.json': {
        version: 1,
        id: 'scene/guijie-minju',
        scripts: { [scriptId]: [{ kind: 'playSound', soundId: 1 }] },
      },
    }
    const reads: string[] = []
    const source = memSource(scriptFiles)
    const tracked: FileSource = {
      ...source,
      async readJson<T>(rel: string, signal?: AbortSignal) {
        reads.push(rel)
        return source.readJson<T>(rel, signal)
      },
    }
    const p = await loadProjectFrom(tracked)
    expect(p.scriptStore).toBeDefined()
    expect(reads).toContain('content/scripts/index.json')
    expect(reads).not.toContain('content/scripts/chunks/scene/guijie-minju.json')
    const lease = await p.scriptStore!.resolve(
      { chunk: 'scene/guijie-minju', id: scriptId },
      new AbortController().signal,
    )
    expect(lease.body).toHaveLength(1)
    expect(reads).toContain('content/scripts/chunks/scene/guijie-minju.json')
    lease.release()
  })
})
