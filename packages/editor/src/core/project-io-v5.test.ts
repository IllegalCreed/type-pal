import {
  emptyWorldScriptStateV5,
  type ProjectManifest,
  type ProjectMigrationSidecarV1,
  type SceneDefV5,
} from '@type-pal/content'
import {
  assembleProjectV5,
  type LoadedProjectV5,
  legacyProjectShellFromV5,
  legacySceneFromV5,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { toEditorState } from './project-io.js'
import {
  mergeLegacyEditorShellIntoV5,
  projectActiveScriptEditorStateV5,
  serializeProjectV5,
  serializeProjectV5WithCopies,
  toEditorStateV5,
} from './project-io-v5.js'

const scene: SceneDefV5 = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [
    {
      id: 'e1',
      sprite: 'npc',
      pos: { col: 1, row: 1, height: 0 },
      initialPage: 'default',
      pages: [{ id: 'default', label: '默认', trigger: 'talk' }],
      behaviors: {
        trigger: {
          talk: {
            label: '交谈',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [{ id: 'start', body: [] }],
            },
          },
        },
      },
      hostile: {
        team: 1,
        onLose: [{ kind: 'setFlag', flag: 'battle-lost', value: true }],
      },
    },
  ],
}

function manifest(over: Partial<ProjectManifest<10>> = {}): ProjectManifest<10> {
  return {
    id: 'demo',
    name: 'Demo',
    contentVersion: 10,
    minimumSaveVersion: 8,
    entryScene: 's001',
    content: {
      actors: 'content/actors.json',
      scenes: 'content/scenes/',
      skills: 'content/skills.json',
      items: 'content/items.json',
      locale: 'content/locale.json',
      sprites: 'content/sprites.json',
      battleSprites: 'content/battle-sprites.json',
      tilesets: 'content/tilesets.json',
      maps: 'content/maps/index.json',
      sharedScripts: 'content/shared-scripts.json',
    },
    assets: { catalog: 'assets/index.json', roles: {} },
    startWorld: {
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [],
    },
    ...over,
  }
}

const item = {
  id: 'private',
  name: '剧情物品',
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  use: {
    target: 'scene' as const,
    consuming: true,
    effects: [
      {
        kind: 'itemPrivateScript' as const,
        script: {
          id: 'use' as const,
          label: '使用',
          body: [{ kind: 'setFlag' as const, flag: 'used', value: true }],
        },
      },
    ],
  },
}

const battlerActor = {
  id: 'hero',
  name: 'name.hero',
  spriteId: 'hero-sprite',
  battler: {
    battleSprite: 'fighter-base',
    baseStats: {
      level: 1,
      hp: 100,
      maxHP: 100,
      mp: 20,
      maxMP: 20,
      attack: 10,
      defense: 10,
      magicAttack: 10,
      speed: 10,
      luck: 10,
    },
    initialEquipment: {},
    initialMagic: [],
  },
}

const fighterSprite = {
  id: 'fighter-base',
  label: '主角战斗形象',
  asset: 'battle-sprite.hero',
  profile: {
    kind: 'player-fighter' as const,
    frames: {
      idle: 0,
      dying: 1,
      dead: 2,
      defend: 3,
      hurt: 4,
      preMagic: 5,
      magic: 6,
      attackWindup: 7,
      attackRush: 8,
      attackStrike: 9,
    },
    castEffectBase: 15,
    attackEffectBase: 0,
  },
}

const appearanceItem = {
  id: 'appearance',
  name: '形象武器',
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  equip: {
    slot: 'weapon' as const,
    equipableBy: ['hero'],
    effects: [{ kind: 'battleSprite' as const, byActor: { hero: 'fighter-base' } }],
  },
}

const jsons = {
  actors: [],
  sceneIds: ['s001'],
  entryScene: scene,
  skills: { skills: [], levelUp: {} },
  items: [item],
  locale: {},
  sprites: [],
  battleSprites: [],
  tilesets: [],
  maps: {
    version: 1,
    maps: [
      {
        id: 'map-001',
        name: '地图',
        path: 'content/maps/map-001.json',
      },
    ],
  },
  sharedScripts: {
    'shared/user/demo': {
      name: '公共演出',
      self: 'none' as const,
      body: [{ kind: 'setFlag' as const, flag: 'shared', value: true }],
    },
  },
  assetCatalog: { version: 1, assets: {} },
}

function sidecar(): ProjectMigrationSidecarV1 {
  return {
    version: 1,
    projectId: 'demo',
    transitionId: 'script-v4-v5',
    fromContentVersion: 4,
    toContentVersion: 5,
    sourceAuditDigest: 'a'.repeat(64),
    provenance: {
      kind: 'project-local',
      transformDigest: 'a'.repeat(64),
    },
    legacyBindings: [],
    legacyCursors: [],
    legacyEntities: [],
    lineagePlans: { pages: [], stages: [] },
    localAllocations: [],
    targetClosures: [],
    digest: 'a'.repeat(64),
  }
}

describe('canonical v5 editor project IO', () => {
  test('round-trips scenes, inline item scripts, and the canonical shared library', () => {
    const project = assembleProjectV5(manifest(), jsons)
    const state = toEditorStateV5(project, [scene])
    const output = serializeProjectV5(state)
    expect(output['content/scenes/index.json']).toEqual(['s001'])
    expect(output['content/scenes/s001.json']).toEqual(scene)
    expect(output['content/items.json']).toEqual([item])
    expect(output['content/shared-scripts.json']).toEqual(jsons.sharedScripts)
    expect(output['manifest.json']).toEqual(manifest())
    expect(Object.keys(output).some((path) => path.startsWith('content/scripts/'))).toBe(false)
  })

  test('round-trips per-actor battle sprite mappings and rejects a dangling mapping on save', () => {
    const fixture = {
      ...jsons,
      actors: [battlerActor],
      items: [item, appearanceItem],
      battleSprites: [fighterSprite],
      assetCatalog: {
        version: 1 as const,
        assets: {
          'battle-sprite.hero': {
            kind: 'battle-sprite' as const,
            path: 'assets/generated/battle-sprites/hero.rle',
            mediaType: 'application/vnd.type-pal.rle',
            bytes: 0,
            sha256: 'a'.repeat(64),
            label: '主角战斗形象',
            origin: { kind: 'generated' as const },
          },
        },
      },
    }
    const state = toEditorStateV5(assembleProjectV5(manifest(), fixture), [scene])
    const output = serializeProjectV5(state)
    expect(output['content/items.json']).toEqual([item, appearanceItem])

    const reopened = assembleProjectV5(manifest(), {
      ...fixture,
      items: output['content/items.json'],
    })
    expect(reopened.items.appearance?.equip?.effects).toEqual([
      { kind: 'battleSprite', byActor: { hero: 'fighter-base' } },
    ])

    const effect = state.items[1]?.equip?.effects[0]
    if (!effect || effect.kind !== 'battleSprite') throw new Error('测试夹具缺 battleSprite')
    effect.byActor = { missing: 'fighter-base' }
    expect(() => serializeProjectV5(state)).toThrow(/missing.*不在 actors/)
  })

  test('rejects a canonical script that points at a missing item', () => {
    const project = assembleProjectV5(manifest(), jsons)
    const state = toEditorStateV5(project, [scene])
    state.sharedScripts['shared/user/demo']!.body = [
      { kind: 'giveItem', itemId: 'missing', count: 1 },
    ]

    expect(() => serializeProjectV5(state)).toThrow(
      /sharedScripts\.shared\/user\/demo\.body\[0\]\.itemId: 引用的物品 "missing"/,
    )
  })

  test('copies every verified migration blob byte-for-byte and rejects parsed projection edits', () => {
    const migration = sidecar()
    const bytes = new TextEncoder().encode(`{"not":"reformatted","projectId":"demo"}\n`)
    const descriptor = {
      version: 1 as const,
      fromContentVersion: 4 as const,
      toContentVersion: 5 as const,
      path: 'content/migrations/script-v4-v5-save.json' as const,
      sha256: 'b'.repeat(64),
    }
    const projectManifest = manifest({
      migrations: { 'script-v4-v5': descriptor },
    })
    const project = assembleProjectV5(projectManifest, jsons, {
      'script-v4-v5': {
        id: 'script-v4-v5',
        descriptor,
        bytes,
        sidecar: migration,
      },
    })
    const state = toEditorStateV5(project, [scene])
    bytes.fill(0)
    const output = serializeProjectV5(state)
    expect(
      new Uint8Array(output['content/migrations/script-v4-v5-save.json'] as ArrayBuffer),
    ).toEqual(new TextEncoder().encode(`{"not":"reformatted","projectId":"demo"}\n`))

    ;(state.migrationSidecars as ProjectMigrationSidecarV1[])[0]!.projectId = 'tampered'
    expect(() => serializeProjectV5(state)).toThrow(/只读投影已被修改/)
  })

  test('copies unloaded maps and assets without parsing or losing binary bytes', async () => {
    const project = assembleProjectV5(manifest(), jsons)
    const state = toEditorStateV5(project, [scene])
    state.assetCatalog = {
      version: 1,
      assets: {
        authored: {
          kind: 'sound',
          path: 'assets/authored/sound.wav',
          mediaType: 'audio/wav',
          bytes: 3,
          sha256: 'c'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    }
    const output = await serializeProjectV5WithCopies(
      state,
      {
        async readText(path) {
          expect(path).toBe('content/maps/map-001.json')
          return '{"map":"raw"}\n'
        },
        async readBytes(path) {
          expect(path).toBe('assets/authored/sound.wav')
          return Uint8Array.from([1, 2, 3]).buffer
        },
      },
      { includeAssetCopies: true },
    )
    expect(output['content/maps/map-001.json']).toBe('{"map":"raw"}\n')
    expect(new Uint8Array(output['assets/authored/sound.wav'] as ArrayBuffer)).toEqual(
      Uint8Array.from([1, 2, 3]),
    )
    expect(Object.keys(output).at(-1)).toBe('manifest.json')
  })

  test('merges ordinary shell edits without persisting runtime script placeholders', () => {
    const project = assembleProjectV5(manifest(), jsons)
    const canonical = toEditorStateV5(project, [scene])
    canonical.scenes[0]!.entities[0]!.behaviors!.trigger!.talk!.label = 'canonical 交谈'
    canonical.scenes[0]!.entities[0]!.hostile!.onLose = [
      { kind: 'setFlag', flag: 'canonical-battle-lost', value: true },
    ]
    const privateEffect = canonical.items[0]!.use!.effects[0]!
    if (privateEffect.kind !== 'itemPrivateScript') throw new Error('fixture 不是私有脚本')
    privateEffect.script.body = [{ kind: 'setFlag', flag: 'canonical-edited', value: true }]

    const world = emptyWorldScriptStateV5()
    const shellProject = legacyProjectShellFromV5(project as unknown as LoadedProjectV5, world)
    const shell = toEditorState(shellProject, [legacySceneFromV5(scene, world)])
    shell.manifest = {
      ...shell.manifest,
      name: 'Renamed',
    }
    shell.scenes[0]!.entities[0]!.pos.col = 9
    shell.scenes[0]!.entities[0]!.pages![0]!.animation = {
      sprite: 'npc',
      action: 'idle',
      loop: true,
    }
    shell.scenes[0]!.onEnter = [{ body: [{ kind: 'setFlag', flag: 'legacy', value: true }] }]
    shell.scenes[0]!.entities[0]!.hostile!.onLose = []
    shell.items[0]!.name = '已改名物品'

    const merged = mergeLegacyEditorShellIntoV5(canonical, shell)
    expect(merged.manifest).toMatchObject({
      contentVersion: 10,
      minimumSaveVersion: 8,
      name: 'Renamed',
    })
    expect(merged.scenes[0]!.entities[0]).toMatchObject({
      pos: { col: 9 },
      behaviors: { trigger: { talk: { label: 'canonical 交谈' } } },
      hostile: {
        onLose: [{ kind: 'setFlag', flag: 'canonical-battle-lost', value: true }],
      },
      pages: [
        {
          id: 'default',
          animation: { sprite: 'npc', action: 'idle', loop: true },
        },
      ],
    })
    expect(merged.scenes[0]!.hooks).toBeUndefined()
    expect(merged.items[0]).toMatchObject({
      name: '已改名物品',
      use: {
        effects: [
          {
            kind: 'itemPrivateScript',
            script: {
              body: [{ kind: 'setFlag', flag: 'canonical-edited', value: true }],
            },
          },
        ],
      },
    })
    expect(() => serializeProjectV5(merged)).not.toThrow()

    const shellWithoutPrivate = structuredClone(shell)
    shellWithoutPrivate.items[0]!.use!.effects = []
    const active = projectActiveScriptEditorStateV5(canonical, shellWithoutPrivate.items)
    expect(active.items[0]!.use!.effects).toEqual([])
    expect(active.scenes[0]!.entities[0]!.behaviors).toEqual(
      canonical.scenes[0]!.entities[0]!.behaviors,
    )

    const savedWithoutPrivate = mergeLegacyEditorShellIntoV5(canonical, shellWithoutPrivate)
    expect(savedWithoutPrivate.items[0]!.use!.effects).toEqual([])
    expect(savedWithoutPrivate.scenes[0]!.entities[0]!.behaviors).toEqual(
      canonical.scenes[0]!.entities[0]!.behaviors,
    )
    expect(() => serializeProjectV5(savedWithoutPrivate)).not.toThrow()
  })
})
