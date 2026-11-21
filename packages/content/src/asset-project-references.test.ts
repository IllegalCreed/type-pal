import { describe, expect, test } from 'vitest'
import { audioProjectAssetFixture } from './__tests__/asset-catalog-fixtures.js'
import { heroActor } from './__tests__/item-world-fixtures.js'
import { createEnemyReferenceProject } from './__tests__/reference-project.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  collectAssetReferences,
  groupAssetReferencesBySite,
  validateAssetCatalog,
  validateAssetReferenceClosure,
  validateManifestAssetConfig,
} from './asset.js'
import type { AuthorEnemyDef } from './author-enemy.js'
import type { AuthorSceneDef } from './author-scene.js'
import { type AuthorCommand, resolveAuthorDialogueTree } from './author-script.js'
import type { SkillData } from './skill.js'
import { validateTilesets } from './tileset.js'
import { validateActors, validateItems, validateSkills, validateStartWorld } from './validate.js'
import {
  validateAuthorEnemies,
  validateAuthorScenes,
  validateAuthorSharedScripts,
} from './validate-author.js'

const hash = 'a'.repeat(64)
test('collects and validates portraits from both casualty branches', () => {
  const hero = heroActor()
  const actors = validateActors([
    {
      ...hero,
      battler: {
        ...hero.battler,
        casualty: {
          friendDeath: {
            gates: [
              {
                chance: 75,
                branch: {
                  lines: [
                    {
                      text: 'dlg.casualty.first',
                      style: 'bottom',
                      portrait: { asset: 'portrait.hero.shocked', side: 'right' },
                    },
                    { text: 'dlg.casualty.narration', style: 'narration' },
                  ],
                  effects: [],
                },
              },
            ],
            fallback: {
              lines: [
                {
                  text: 'dlg.casualty.reply',
                  style: 'top',
                  portrait: { asset: 'portrait.hero.concerned', side: 'left' },
                },
              ],
              effects: [],
            },
          },
        },
      },
    },
  ])
  const references = collectAssetReferences({ actors })
  const gatedPath = 'actors[0].battler.casualty.friendDeath.gates[0].branch.lines[0].portrait.asset'
  const fallbackPath = 'actors[0].battler.casualty.friendDeath.fallback.lines[0].portrait.asset'
  const use = { expectedKind: 'portrait', site: 'actor:hero:casualty' }
  const origin = { kind: 'actor', id: 'hero', section: 'portraits' }
  expect(references).toEqual([
    { ...use, asset: 'portrait.hero.shocked', where: gatedPath, origin },
    { ...use, asset: 'portrait.hero.concerned', where: fallbackPath, origin },
  ])
  const portrait = {
    kind: 'portrait',
    mediaType: 'image/png',
    bytes: 3,
    sha256: hash,
    origin: { kind: 'authored' },
  }
  const portraits = validateAssetCatalog({
    version: 1,
    assets: {
      'portrait.hero.shocked': { ...portrait, path: 'assets/authored/shocked.png' },
      'portrait.hero.concerned': { ...portrait, path: 'assets/authored/concerned.png' },
    },
  })
  expect(validateAssetReferenceClosure(portraits, references)).toEqual([])

  const invalidReferences = validateAssetCatalog({
    version: 1,
    assets: {
      'portrait.hero.concerned': {
        kind: 'sound',
        path: 'assets/authored/concern.wav',
        mediaType: 'audio/wav',
        bytes: 3,
        sha256: hash,
        origin: { kind: 'authored' },
      },
    },
  })
  expect(validateAssetReferenceClosure(invalidReferences, references)).toEqual([
    {
      severity: 'error',
      code: 'missing-asset',
      where: gatedPath,
      message: 'AssetId "portrait.hero.shocked" 不在 catalog',
    },
    {
      severity: 'error',
      code: 'kind-mismatch',
      where: fallbackPath,
      message: 'AssetId "portrait.hero.concerned" 期望 portrait，实际 sound',
    },
  ])
})

function sceneWithArrival(id: string, body: AuthorCommand[]) {
  const scene = {
    id,
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    hooks: {
      onEnter: {
        initial: 'intro',
        variants: {
          intro: {
            label: '进场',
            order: 0,
            flow: { kind: 'stages', initial: 'arrival', stages: [{ id: 'arrival', body }] },
          },
        },
      },
    },
  } satisfies AuthorSceneDef
  validateAuthorScenes([scene])
  return scene
}

describe('project asset references', () => {
  test('collects static images and runtime portraits at their respective locations', () => {
    const refs = collectAssetReferences({
      actors: validateActors([
        {
          id: 'li-xiaoyao',
          name: 'name.li-xiaoyao',
          spriteId: 'sprite.li-xiaoyao',
          portraits: {
            default: 'portrait.pal.001',
            expressions: { hurt: 'portrait.pal.002' },
          },
          face: 'face.pal.li-xiaoyao',
        },
      ]),
      scenes: [
        sceneWithArrival('s', [
          {
            kind: 'dialog',
            cue: {
              rows: [{ text: 'dlg.test' }],
              identity: { kind: 'unbound', portrait: { asset: 'portrait.pal.003', side: 'left' } },
            },
          },
          {
            kind: 'setActorAppearance',
            actor: 'li-xiaoyao',
            portrait: 'portrait.pal.004',
          },
        ]),
      ],
      items: [
        {
          id: '1',
          name: 'item.1.name',
          desc: [],
          icon: 'item-icon.pal.001',
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
        },
      ],
      battleFields: [
        {
          id: 6,
          background: 'battle-background.pal.006',
          screenWave: 0,
          magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        },
      ],
      worlds: [
        {
          party: [
            {
              id: 'li-xiaoyao',
              template: 'li-xiaoyao',
              level: 1,
              exp: 0,
              hp: 1,
              maxHP: 1,
              mp: 1,
              maxMP: 1,
              attack: 1,
              defense: 1,
              magicAttack: 1,
              speed: 1,
              luck: 1,
              equipment: {},
              tags: [],
              appearance: { portrait: 'portrait.pal.005' },
            },
          ],
          reserve: [
            {
              id: 'zhao-linger',
              template: 'zhao-linger',
              level: 1,
              exp: 0,
              hp: 1,
              maxHP: 1,
              mp: 1,
              maxMP: 1,
              attack: 1,
              defense: 1,
              magicAttack: 1,
              speed: 1,
              luck: 1,
              equipment: {},
              tags: [],
              appearance: { portrait: 'portrait.pal.006' },
            },
          ],
          money: 0,
          learnedSkills: {},
          inventory: [],
        },
      ],
    })
    expect(refs.map(({ asset, expectedKind }) => [asset, expectedKind])).toEqual([
      ['portrait.pal.003', 'portrait'],
      ['portrait.pal.004', 'portrait'],
      ['portrait.pal.001', 'portrait'],
      ['portrait.pal.002', 'portrait'],
      ['face.pal.li-xiaoyao', 'face'],
      ['item-icon.pal.001', 'item-icon'],
      ['battle-background.pal.006', 'battle-background'],
      ['portrait.pal.005', 'portrait'],
      ['portrait.pal.006', 'portrait'],
    ])
    expect(refs).toContainEqual({
      asset: 'portrait.pal.002',
      expectedKind: 'portrait',
      where: 'actors[0].portraits.expressions["hurt"]',
      site: 'actor:li-xiaoyao:portraits',
      origin: { kind: 'actor', id: 'li-xiaoyao', section: 'portraits' },
    })
    expect(refs).toContainEqual({
      asset: 'portrait.pal.006',
      expectedKind: 'portrait',
      where: 'worlds[0].reserve[0].appearance.portrait',
      site: 'world:0:character:zhao-linger:appearance',
      origin: { kind: 'runtime-world' },
    })
  })

  test('collects asset references from installed roles, scene commands and combat definitions', () => {
    const actor = heroActor()
    if (!actor.battler) throw new Error('fixture actor has no combat definition')
    const actors = validateActors([
      {
        ...actor,
        id: 'li-xiaoyao',
        battler: {
          ...actor.battler,
          sounds: { attack: 'sound.pal.045', weapon: 'sound.pal.029' },
        },
      },
    ])
    const { enemy } = createEnemyReferenceProject({
      id: 'enemy-1',
      sounds: { magic: 'sound.pal.174', suppressMagicEffectSound: true },
      choreography: [{ at: 'battleStart', body: [{ kind: 'playSound', asset: 'sound.pal.029' }] }],
    })
    const enemies = [enemy]
    const skills: SkillData[] = [
      {
        id: '377',
        name: 'skill.377.name',
        desc: 'skill.377.desc',
        cost: {},
        usableOutsideBattle: false,
        target: 'allEnemies',
        effects: [
          { kind: 'damage', power: 1, elemental: 0 },
          { kind: 'summon', battleSprite: 'player-summon-11', sound: 'sound.pal.301' },
        ],
        animation: { effectSprite: 1, sound: 'sound.pal.174' },
        execution: {
          player: {
            effects: [
              {
                kind: 'summon',
                battleSprite: 'player-summon-11',
                sound: 'sound.pal.045',
              },
            ],
            animation: { effectSprite: 2, sound: 'sound.pal.029' },
          },
        },
      },
    ]
    const items = validateItems([
      {
        id: '151',
        name: 'item.151.name',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'healHp', amount: 20 }],
          sound: 'sound.pal.045',
        },
        throw: {
          target: 'oneEnemy',
          effects: [{ kind: 'fixedDamage', amount: 1 }],
          presentation: {
            kind: 'magic',
            animation: { effectSprite: 1, sound: 'sound.pal.301' },
          },
        },
      },
    ])
    const scene = {
      ...sceneWithArrival('s', [
        { kind: 'playMusic', asset: 'music.pal.003' },
        {
          kind: 'startBattle',
          enemyTeamId: 'team-1',
          music: 'music.pal.037',
          onLose: [
            { kind: 'playMusic', asset: 'music.missing' },
            { kind: 'playVideo', asset: 'video.pal.001' },
            {
              kind: 'playFrameAnimation',
              asset: 'frame-animation.pal.003',
              startFrame: 2,
              endFrame: 8,
            },
            { kind: 'quitToTitle', videos: ['video.pal.004'] },
            { kind: 'playSound', asset: 'sound.pal.029' },
          ],
        },
      ]),
      music: 'music.pal.002',
      battleMusic: null,
    }
    const startWorld = { party: ['li-xiaoyao'], money: 0, inventory: [] }
    validateStartWorld(startWorld)
    const onLosePath = 'scenes[0].hooks.onEnter.variants["intro"].flow.stages[0].body[1].onLose'
    const arrivalOrigin = { kind: 'scene-hook', sceneId: 's', slot: 'onEnter', hookId: 'intro' }
    const { catalog, assets } = audioProjectAssetFixture()
    const refs = collectAssetReferences({
      assets: validateManifestAssetConfig(assets, validateAssetCatalog(catalog)),
      entryPoints: [
        {
          id: 'new-game',
          label: '新的故事',
          scene: 's',
          introVideo: 'video.pal.001',
          startWorld,
        },
      ],
      scenes: [scene],
      actors,
      enemies,
      items,
      skills: validateSkills({ skills, levelUp: {} }).skills,
    })
    expect(refs.map((ref) => ref.asset)).toEqual(
      expect.arrayContaining([
        'soundfont.default',
        'music.pal.037',
        'music.pal.002',
        'music.pal.003',
        'music.pal.004',
        'color.project-standard',
        'video.pal.001',
        'video.pal.004',
        'frame-animation.pal.003',
        'music.missing',
        'sound.pal.029',
        'sound.pal.045',
        'sound.pal.174',
        'sound.pal.301',
      ]),
    )
    expect(refs).toContainEqual({
      asset: 'music.pal.004',
      expectedKind: 'music',
      where: 'manifest.assets.roles.audio.openingMenuMusic',
      site: 'manifest.assets.roles.audio.openingMenuMusic',
      origin: { kind: 'manifest-role', role: 'audio.openingMenuMusic' },
    })
    expect(refs).toContainEqual({
      asset: 'video.pal.001',
      expectedKind: 'video',
      where: 'entryPoints[0].introVideo',
      site: 'entryPoint:new-game:introVideo',
      origin: { kind: 'entry-point', id: 'new-game' },
    })
    expect(refs).toContainEqual({
      asset: 'video.pal.001',
      expectedKind: 'video',
      where: `${onLosePath}[1].asset`,
      site: 'scene:s:hook:onEnter:intro',
      origin: arrivalOrigin,
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.029',
      expectedKind: 'sound',
      where: `${onLosePath}[4].asset`,
      site: 'scene:s:hook:onEnter:intro',
      origin: arrivalOrigin,
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.045',
      expectedKind: 'sound',
      where: 'actors[0].battler.sounds.attack',
      site: 'actor:li-xiaoyao:sounds',
      origin: { kind: 'actor', id: 'li-xiaoyao', section: 'sounds' },
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.174',
      expectedKind: 'sound',
      where: 'enemies[0].sounds.magic',
      site: 'enemy:enemy-1:sounds',
      origin: { kind: 'enemy', id: 'enemy-1', section: 'sounds' },
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.174',
      expectedKind: 'sound',
      where: 'skills[0].animation.sound',
      site: 'skill:377:animation',
      origin: { kind: 'skill', id: '377', side: 'base', section: 'animation' },
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.301',
      expectedKind: 'sound',
      where: 'skills[0].effects[1].sound',
      site: 'skill:377:effects',
      origin: { kind: 'skill', id: '377', side: 'base', section: 'effects' },
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.029',
      expectedKind: 'sound',
      where: 'skills[0].execution.player.animation.sound',
      site: 'skill:377:execution:player:animation',
      origin: { kind: 'skill', id: '377', side: 'player', section: 'animation' },
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.045',
      expectedKind: 'sound',
      where: 'skills[0].execution.player.effects[0].sound',
      site: 'skill:377:execution:player:effects',
      origin: { kind: 'skill', id: '377', side: 'player', section: 'effects' },
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.045',
      expectedKind: 'sound',
      where: 'items[0].use.sound',
      site: 'item:151:use',
      origin: { kind: 'item', id: '151', section: 'use' },
    })
    expect(refs).toContainEqual({
      asset: 'sound.pal.301',
      expectedKind: 'sound',
      where: 'items[0].throw.presentation.animation.sound',
      site: 'item:151:throw',
      origin: { kind: 'item', id: '151', section: 'throw' },
    })
    expect(refs).toContainEqual({
      asset: 'video.pal.004',
      expectedKind: 'video',
      where: `${onLosePath}[3].videos[0]`,
      site: 'scene:s:hook:onEnter:intro',
      origin: arrivalOrigin,
    })
    expect(refs).toContainEqual({
      asset: 'frame-animation.pal.003',
      expectedKind: 'frame-animation',
      where: `${onLosePath}[2].asset`,
      site: 'scene:s:hook:onEnter:intro',
      origin: arrivalOrigin,
    })
  })

  test('locates each sprite binary and its action sound cue', () => {
    const refs = collectAssetReferences({
      sprites: [
        {
          id: 'hero',
          asset: 'sprite.pal.002',
          label: '主角',
          layout: { kind: 'static' },
          poses: {
            'forge/loop': {
              label: '打铁',
              steps: [
                { frame: 0, durationMs: 100 },
                {
                  frame: 1,
                  durationMs: 80,
                  cues: [{ kind: 'sound', asset: 'sound.pal.135' }],
                },
              ],
              loopFrom: 0,
            },
          },
        },
        {
          id: 'hero-alt-layout',
          asset: 'sprite.pal.002',
          label: '主角另一布局',
          layout: { kind: 'directional', framesPerDir: 3 },
        },
      ],
    })
    expect(refs).toEqual([
      {
        asset: 'sprite.pal.002',
        expectedKind: 'sprite',
        where: 'sprites[0].asset',
        site: 'sprite:hero:asset',
        origin: { kind: 'world-sprite', id: 'hero' },
      },
      {
        asset: 'sound.pal.135',
        expectedKind: 'sound',
        where: 'sprites[0].poses["forge/loop"].steps[1].cues[0].asset',
        site: 'sprite:hero:action:forge/loop',
        origin: { kind: 'world-sprite-action', spriteId: 'hero', actionId: 'forge/loop' },
      },
      {
        asset: 'sprite.pal.002',
        expectedKind: 'sprite',
        where: 'sprites[1].asset',
        site: 'sprite:hero-alt-layout:asset',
        origin: { kind: 'world-sprite', id: 'hero-alt-layout' },
      },
    ])
  })

  test('groups repeated frame animations within one shared script, keeping a second script separate', () => {
    const sharedScripts = validateAuthorSharedScripts({
      'shared/user/first': {
        name: '第一段',
        self: 'none',
        body: [
          { kind: 'playFrameAnimation', asset: 'frame-animation.pal.003', startFrame: 0 },
          { kind: 'wait', ms: 1 },
          { kind: 'playFrameAnimation', asset: 'frame-animation.pal.003', startFrame: 2 },
        ],
      },
      'shared/user/second': {
        name: '第二段',
        self: 'none',
        body: [{ kind: 'playFrameAnimation', asset: 'frame-animation.pal.003', startFrame: 4 }],
      },
    })
    const references = collectAssetReferences({ sharedScripts })
    expect(references.map(({ where }) => where)).toEqual([
      'sharedScripts["shared/user/first"].body[0].asset',
      'sharedScripts["shared/user/first"].body[2].asset',
      'sharedScripts["shared/user/second"].body[0].asset',
    ])
    expect(
      groupAssetReferencesBySite(references).map(({ asset, site, occurrences }) => [
        asset,
        site,
        occurrences,
      ]),
    ).toEqual([
      ['frame-animation.pal.003', 'sharedScript:shared/user/first', 2],
      ['frame-animation.pal.003', 'sharedScript:shared/user/second', 1],
    ])
  })
})

test('enemy hook channels and defeat commands keep their exact resource locations', () => {
  const {
    enemy: { name, battleSprite, yPosOffset, stats },
  } = createEnemyReferenceProject()
  const enemy = {
    id: 'enemy-hook',
    name,
    battleSprite,
    yPosOffset,
    stats,
    sounds: {},
    ai: {
      resistanceToSorcery: 0,
      hooks: {
        ready: {
          initial: 'ready',
          states: {
            ready: {
              body: [
                { kind: 'playSound', asset: 'sound.hook.ready' },
                {
                  kind: 'dialog',
                  cue: {
                    rows: [{ text: 'dlg.enemy.ready' }],
                    identity: {
                      kind: 'unbound',
                      portrait: { asset: 'portrait.hook.ready', side: 'left' },
                    },
                  },
                },
              ],
              next: { kind: 'stay' },
            },
          },
        },
        turnStart: {
          initial: 'turn',
          states: {
            turn: {
              body: [{ kind: 'playMusic', asset: 'music.hook.turn' }],
              next: { kind: 'stay' },
            },
          },
        },
      },
    },
    onDefeated: [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'won', is: true },
        then: [{ kind: 'playSound', asset: 'sound.enemy.defeated' }],
      },
    ],
  } satisfies AuthorEnemyDef

  const enemies = resolveAuthorDialogueTree(validateAuthorEnemies([enemy]), {}, 'enemies')
  const references = collectAssetReferences({ enemies })
  expect(references).toHaveLength(4)
  expect(references).toEqual(
    expect.arrayContaining([
      {
        asset: 'sound.hook.ready',
        expectedKind: 'sound',
        where: 'enemies[0].ai.hooks.ready.states.ready.body[0].asset',
        site: 'enemy:enemy-hook:hook:ready',
        origin: { kind: 'enemy', id: 'enemy-hook', section: 'hook-ready' },
      },
      {
        asset: 'portrait.hook.ready',
        expectedKind: 'portrait',
        where: 'enemies[0].ai.hooks.ready.states.ready.body[1].cue.portrait.asset',
        site: 'enemy:enemy-hook:hook:ready',
        origin: { kind: 'enemy', id: 'enemy-hook', section: 'hook-ready' },
      },
      {
        asset: 'music.hook.turn',
        expectedKind: 'music',
        where: 'enemies[0].ai.hooks.turnStart.states.turn.body[0].asset',
        site: 'enemy:enemy-hook:hook:turnStart',
        origin: { kind: 'enemy', id: 'enemy-hook', section: 'hook-turnStart' },
      },
      {
        asset: 'sound.enemy.defeated',
        expectedKind: 'sound',
        where: 'enemies[0].onDefeated[0].then[0].asset',
        site: 'enemy:enemy-hook:onDefeated',
        origin: { kind: 'enemy', id: 'enemy-hook', section: 'onDefeated' },
      },
    ]),
  )
})

test('author scene visits can retain only static music when command traversal is delegated', () => {
  const scene = sceneWithArrival('scene-hook', [{ kind: 'playVideo', asset: 'video.scene-hook' }])

  expect(collectAssetReferences({ scenes: [scene] })).toContainEqual({
    asset: 'video.scene-hook',
    expectedKind: 'video',
    where: 'scenes[0].hooks.onEnter.variants["intro"].flow.stages[0].body[0].asset',
    site: 'scene:scene-hook:hook:onEnter:intro',
    origin: { kind: 'scene-hook', sceneId: 'scene-hook', slot: 'onEnter', hookId: 'intro' },
  })
  expect(
    collectAssetReferences({
      scenes: [{ ...scene, music: 'music.scene' }],
      includeCanonicalAuthorCommands: false,
    }),
  ).toEqual([
    {
      asset: 'music.scene',
      expectedKind: 'music',
      where: 'scenes[0].music',
      site: 'scenes[0].music',
      origin: { kind: 'scene', id: 'scene-hook', section: 'music' },
    },
  ])
})

test('uses the tileset asset id without treating the tileset id as a path', () => {
  const catalog = validateAssetCatalog({
    version: 1,
    assets: {
      'tileset.grass': {
        kind: 'tileset',
        path: 'assets/authored/grass.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: 8,
        sha256: 'a'.repeat(64),
        origin: { kind: 'authored' },
      },
    },
  })
  const source = {
    tilesets: validateTilesets(
      [{ id: 'grass', name: '草地', category: 'outdoor', asset: 'tileset.grass' }],
      catalog,
    ),
  }
  const before = deepSnapshot(source)
  expect(collectAssetReferences(source)).toEqual([
    {
      asset: 'tileset.grass',
      expectedKind: 'tileset',
      where: 'tilesets[0].asset',
      site: 'tileset:grass:asset',
      origin: { kind: 'tileset', id: 'grass' },
    },
  ])
  expect(source).toEqual(before)
})
