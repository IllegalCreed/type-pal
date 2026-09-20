/** Valid, generated non-PAL project shared by workflow tests and the isolated browser smoke run. */
import type {
  ActorDef,
  AssetCatalogV1,
  BattleSpriteDef,
  CurrentManifest,
  EnemyDef,
  ItemData,
  SkillData,
} from '@type-pal/content'
import { palMagicEffectSpriteAssetId } from '@type-pal/content'
import {
  compressGzip,
  encodeSpriteChunk,
  type FileSource,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { emptyBattleSimulatorLibrary } from '../battle-simulator-library.js'
import { emptyTrialMember, emptyTrialPlan } from '../battle-simulator-state.js'
import { toEditorState } from '../project-io.js'
import { buildBlankProject } from '../seed.js'

export async function battleTrialProjectFiles() {
  const files = await buildBlankProject('simulator-smoke')
  const manifest = files['manifest.json'] as CurrentManifest
  const actors = files['content/actors.json'] as ActorDef[]
  const hero = actors[0]!
  hero.battler!.baseStats.maxMP = 40
  hero.battler!.baseStats.mp = 40
  hero.battler!.baseStats.speed = 60
  for (let i = 2; i <= 5; i++)
    actors.push({ ...structuredClone(hero), id: `ally-${i}`, name: `name.ally-${i}` })
  const locale = files['content/locale.json'] as Record<string, string>
  for (let i = 2; i <= 5; i++) locale[`name.ally-${i}`] = `队员${i}`
  locale['name.dummy'] = '练习对手'
  const sprites = files['content/battle-sprites.json'] as BattleSpriteDef[]
  sprites.push({
    id: 'dummy-fighter',
    label: '练习对手形象',
    asset: sprites[0]!.asset,
    profile: {
      kind: 'enemy',
      idle: { start: 0, count: 1 },
      attack: { start: 2, count: 2 },
      magic: { start: 1, count: 1 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 1,
    },
  })
  const skill: SkillData = {
    id: 'trial-spark',
    name: '试炼术',
    desc: '测试用单体技能',
    cost: { mp: 2 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 50, elemental: 0 }],
    animation: { effectSprite: 0 },
  }
  const effectPath = 'assets/generated/effects/trial.rle'
  const effect = await compressGzip(
    encodeSpriteChunk(
      Array.from({ length: 3 }, () => ({
        width: 8,
        height: 8,
        pixels: new Uint8Array(64).fill(10),
        opaque: new Uint8Array(64).fill(1),
      })),
    ),
  )
  const effectBytes = new ArrayBuffer(effect.byteLength)
  new Uint8Array(effectBytes).set(effect)
  files[effectPath] = effectBytes
  const effectHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', effectBytes))]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
  ;(files['assets/index.json'] as AssetCatalogV1).assets[palMagicEffectSpriteAssetId(0)] = {
    kind: 'effect-sprite',
    path: effectPath,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: effect.byteLength,
    sha256: effectHash,
    label: '试炼术占位特效',
    origin: { kind: 'generated' },
  }
  files['content/skills.json'] = { skills: [skill], levelUp: {} }
  const item: ItemData = {
    id: 'trial-herb',
    name: 'trial.herb',
    desc: [],
    buyPrice: 10,
    sellPrice: 5,
    sellable: true,
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 25 }] },
    throw: { target: 'oneEnemy', effects: [{ kind: 'fixedDamage', amount: 30 }] },
  }
  const sword: ItemData = {
    id: 'trial-sword',
    name: 'trial.sword',
    desc: [],
    buyPrice: 10,
    sellPrice: 5,
    sellable: true,
    equip: {
      slot: 'weapon',
      equipableBy: actors.map((a) => a.id),
      effects: [{ kind: 'statBonus', stat: 'attack', delta: 7 }],
    },
  }
  files['content/items.json'] = [item, sword]
  locale['trial.herb'] = '练习药'
  locale['trial.sword'] = '练习剑'
  const enemy: EnemyDef = {
    id: 'dummy',
    name: 'name.dummy',
    battleSprite: 'dummy-fighter',
    yPosOffset: 0,
    stats: {
      health: 20,
      level: 1,
      exp: 4,
      cash: 3,
      attackStrength: 2,
      magicStrength: 0,
      defense: 0,
      dexterity: 1,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
  }
  manifest.content.enemies = 'content/enemies.json'
  manifest.content.enemyTeams = 'content/enemy-teams.json'
  manifest.content.battleFields = 'content/battle-fields.json'
  files['content/enemies.json'] = [enemy]
  files['content/enemy-teams.json'] = [{ id: 'practice', slots: ['dummy', null, null, null, null] }]
  files['content/battle-fields.json'] = [
    {
      id: 0,
      name: '练习场（黑底）',
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
  ]
  // Guard the actual complete project through the formal loader before it is used as a fixture.
  const source = fixtureSource(files)
  const project = await loadCurrentProjectFrom(source)
  const state = toEditorState(project, [project.authorContent.entryScene], {}, {}, [])
  const library = emptyBattleSimulatorLibrary(),
    plan = emptyTrialPlan(state)
  const member = emptyTrialMember('hero')
  member.mp = { kind: 'value', value: 20 }
  plan.party = { kind: 'inline', config: { members: [member] } }
  plan.enemies = { kind: 'inline', config: { kind: 'team', teamId: 'practice' } }
  plan.bag = { kind: 'inline', config: { items: [{ itemId: item.id, quantity: 3 }] } }
  plan.music = { kind: 'silent' }
  plan.money = 100
  library.plans.push({
    id: 'basic',
    name: '基础试打',
    description: '真实战斗、独立临时状态',
    config: plan,
  })
  files['editor/battle-simulator.json'] = library
  return files
}
export function fixtureSource(files: Record<string, unknown>): FileSource {
  const readBytes = async (path: string) => {
    if (!Object.hasOwn(files, path)) throw new DOMException(path, 'NotFoundError')
    const value = files[path]
    return value instanceof ArrayBuffer
      ? value.slice(0)
      : new TextEncoder().encode(
          typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
        ).buffer
  }
  return {
    readBytes,
    readText: async (path) => new TextDecoder().decode(await readBytes(path)),
    readJson: async <T>(path: string) =>
      JSON.parse(new TextDecoder().decode(await readBytes(path))) as T,
    urlFor: async () => {
      throw new Error('fixture forbids URL IO')
    },
  }
}
