/** Pure catalog plus a separate complete project/IO host for resource-preparation contracts. */

import {
  type ActorDef,
  type AssetCatalogV1,
  type AssetKind,
  type CurrentManifest,
  type EnemyDef,
  type ItemData,
  type ItemDataMap,
  palMagicEffectSpriteAssetId,
  type SkillData,
  validateActors,
  validateAssetCatalog,
  validateBattleFields,
  validateEnemies,
  validateItems,
  validateSkills,
} from '@type-pal/content'
import { vi } from 'vitest'
import { parseBattleTrialConfig, type TrialMember } from '../../battle-trial-config.js'
import type { TrialCatalog } from '../../battle-trial-prepare.js'
import { battleTrialRevision } from '../../battle-trial-prepare.js'
import cursorJson from '../../engine-chrome/assets/dialog-icons-raw.json?raw'
import {
  ENGINE_CHROME,
  ENGINE_CHROME_UI_SLOTS,
  engineChromeUiUrl,
} from '../../engine-chrome/registry.js'
import { sha256Bytes } from '../../hash.js'
import { compressGzip, encodeSpriteChunk } from '../../index.js'
import { loadCurrentProjectFrom } from '../../project-loader.js'
import { assertProjectSaveReadable } from '../../project-save-state.js'
import { dProjectFiles, memoryFileSource } from '../glm-runtime-contract-fixtures.js'

export function trialActor(maxHP = 100, maxMP = 50, initialMagic = ['fire']): ActorDef {
  return {
    id: 'hero',
    name: 'name.hero',
    spriteId: 'sprite.hero',
    battler: {
      baseStats: {
        level: 1,
        hp: maxHP,
        maxHP,
        mp: maxMP,
        maxMP,
        attack: 10,
        defense: 5,
        magicAttack: 8,
        speed: 3,
        luck: 2,
      },
      initialEquipment: {},
      initialMagic,
      battleSprite: 'battle.hero',
    },
  }
}
export function trialMember(overrides: Partial<TrialMember> = {}): TrialMember {
  return {
    actorId: 'hero',
    stats: {},
    equipment: {},
    skills: { kind: 'inherit' },
    hp: { kind: 'full' },
    mp: { kind: 'full' },
    ...overrides,
  }
}
export function trialConfig(members = [trialMember()], extra: Record<string, unknown> = {}) {
  return parseBattleTrialConfig({
    party: { members },
    enemies: { kind: 'team', teamId: 'wolves' },
    bag: { items: [] },
    fieldId: 0,
    music: { kind: 'default' },
    money: 0,
    auto: false,
    boss: false,
    ...extra,
  })
}
export function trialCatalogFixture(): TrialCatalog & { items: ItemDataMap } {
  const skill = (id: string): SkillData => ({
    id,
    name: `skill.${id}`,
    desc: '',
    cost: { mp: 2 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 10, elemental: 0 }],
    animation: { effectSprite: 0 },
  })
  const item = (
    id: string,
    effects: NonNullable<ItemData['equip']>['effects'],
    equipableBy = ['hero'],
  ): ItemData => ({
    id,
    name: `item.${id}`,
    desc: [],
    buyPrice: 1,
    sellPrice: 0,
    sellable: true,
    equip: { slot: 'weapon', equipableBy, effects },
  })
  const enemy: EnemyDef = {
    id: 'slime',
    name: 'enemy.slime',
    battleSprite: 'battle.slime',
    yPosOffset: 0,
    stats: {
      health: 20,
      level: 1,
      exp: 1,
      cash: 1,
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
  const value: TrialCatalog & { items: ItemDataMap } = {
    actorsById: { hero: trialActor(), other: { ...trialActor(), id: 'other', name: 'name.other' } },
    skills: { fire: skill('fire'), ice: skill('ice') },
    items: {
      sword: item('sword', []),
      cursed: item('cursed', [], ['other']),
      maxpool: item('maxpool', [{ kind: 'maxPool', pool: 'hp', delta: 10 }]),
      ghostSkill: item('ghostSkill', [{ kind: 'grantSkill', skillId: 'fire' }]),
    },
    enemiesById: { slime: enemy },
    enemyTeamsById: {
      wolves: { id: 'wolves', slots: ['slime', null, null, null, null] },
      empty: { id: 'empty', slots: [null, null, null, null, null] },
    },
    battleFields: [
      { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
    ],
    assetCatalog: { version: 1, assets: {} },
  }
  validateActors(Object.values(value.actorsById))
  validateSkills({ skills: Object.values(value.skills), levelUp: {} })
  validateEnemies(Object.values(value.enemiesById))
  validateItems(Object.values(value.items))
  validateBattleFields(value.battleFields)
  validateAssetCatalog(value.assetCatalog)
  // This partial catalog has no image/manifest tables; its role is pure diagnostics, not resource readiness.
  // Each negative reference is introduced in the consuming test after this valid baseline.
  return value
}

async function readyFiles(): Promise<Record<string, unknown>> {
  const files = dProjectFiles({ sceneIds: ['s001'] }),
    manifest = files['manifest.json'] as CurrentManifest
  manifest.content.enemies = 'content/enemies.json'
  manifest.content.enemyTeams = 'content/enemy-teams.json'
  manifest.content.battleFields = 'content/battle-fields.json'
  manifest.assets.roles = { 'visual.standardColorTable': 'color.wave2' }
  const catalog: AssetCatalogV1 = { version: 1, assets: {} }
  files['assets/index.json'] = catalog
  const add = async (
    id: string,
    kind: AssetKind,
    path: string,
    bytes: Uint8Array,
    mediaType = 'application/vnd.type-pal.rle',
  ) => {
    files[path] = bytes.slice().buffer
    catalog.assets[id] = {
      kind,
      path,
      mediaType,
      bytes: bytes.byteLength,
      sha256: await sha256Bytes(bytes),
      origin: { kind: 'generated' },
    }
  }
  const frames = encodeSpriteChunk(
    Array.from({ length: 11 }, () => ({
      width: 1,
      height: 1,
      pixels: new Uint8Array([1]),
      opaque: new Uint8Array([1]),
    })),
  )
  const compressed = await compressGzip(frames)
  await add('sprite.hero', 'sprite', 'assets/generated/hero.rle', compressed)
  await add('battle.hero', 'battle-sprite', 'assets/generated/fighter.rle', compressed)
  await add(
    palMagicEffectSpriteAssetId(0),
    'effect-sprite',
    'assets/generated/fire.rle',
    compressed,
  )
  const tile = encodeSpriteChunk([
    {
      width: 32,
      height: 15,
      pixels: new Uint8Array(480).fill(1),
      opaque: new Uint8Array(480).fill(1),
    },
  ])
  await add('tiles.wave2', 'tileset', 'assets/generated/tiles.rle', await compressGzip(tile))
  await add(
    'color.wave2',
    'color-table',
    'assets/generated/palette.json',
    new TextEncoder().encode(
      JSON.stringify({
        colors: Array.from({ length: 256 }, (_, value) => [value, value, value]),
        cycles: [],
      }),
    ),
    'application/json',
  )
  files['content/actors.json'] = [trialActor(100, 40, [])]
  files['content/sprites.json'] = [
    { id: 'sprite.hero', label: 'Hero', asset: 'sprite.hero', layout: { kind: 'static' } },
  ]
  files['content/tilesets.json'] = [
    { id: 'tiles', name: 'Tiles', category: 'fixture', asset: 'tiles.wave2' },
  ]
  files['content/maps/map-001.json'] = {
    version: 4,
    width: 1,
    height: 1,
    tilesetRefs: ['tiles'],
    layers: [{ id: 'floor', name: 'Floor', tiles: [[0], [0]], sources: [[0], [0]] }],
    collision: [[0], [0]],
  }
  files['content/battle-sprites.json'] = [
    {
      id: 'battle.hero',
      label: 'Hero fighter',
      asset: 'battle.hero',
      profile: {
        kind: 'player-fighter',
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
          steal: 10,
        },
        castEffectBase: 0,
        attackEffectBase: 0,
      },
    },
    {
      id: 'battle.slime',
      label: 'Enemy',
      asset: 'battle.hero',
      profile: {
        kind: 'enemy',
        idle: { start: 0, count: 1 },
        magic: { start: 1, count: 1 },
        attack: { start: 2, count: 1 },
        idleTicksPerFrame: 1,
        actTicksPerFrame: 0,
      },
    },
  ]
  const data = trialCatalogFixture()
  files['content/enemies.json'] = Object.values(data.enemiesById)
  files['content/enemy-teams.json'] = [data.enemyTeamsById.wolves]
  files['content/battle-fields.json'] = data.battleFields
  files['content/items.json'] = []
  files['content/skills.json'] = {
    skills: [{ ...data.skills.fire, id: 'trial-spark', name: 'skill.spark' }],
    levelUp: {},
  }
  files['content/locale.json'] = {
    'name.hero': 'Hero',
    'enemy.slime': 'Slime',
    'skill.spark': 'Spark',
  }
  return files
}

const pngBytes = (base64: string) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
// Valid PNG samples from engine chrome num/1.png and num/2.png. Distinct bytes separate ownership.
const chromePng = () =>
  pngBytes(
    'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAICAYAAAAx8TU7AAAAO0lEQVR4AW3BURUAUQRAwUsbAVQRUhUBxLE+9zhvRlhdOSzzYIl25XCoeXApIBzKg/IgXTn8mAcCDMcHXOMNDOadqmUAAAAASUVORK5CYII=',
  )
const facePng = () =>
  pngBytes(
    'iVBORw0KGgoAAAANSUhEUgAAAAYAAAAICAYAAADaxo44AAAAU0lEQVR4AW3BgQnEUAhEwbdwzViArVikrViA5RgDHy6EzKgrhwfzYEnAcHQlN/PgB4i/4RBHVw7LPFgSqyuHZR4ssdSVwzIPljjUlcOLeSBg+HABNMkaCQrXisYAAAAASUVORK5CYII=',
  )

export async function readyTrialFixture() {
  const files = await readyFiles()
  // A real bundled PNG, not generated/malformed bytes. It is not drawn by these nonvisual tests.
  const faceBytes = facePng()
  const faceHash = await sha256Bytes(faceBytes),
    facePath = 'assets/generated/wave2-face.png'
  files[facePath] = faceBytes.slice().buffer
  const hero = (files['content/actors.json'] as ActorDef[]).find((actor) => actor.id === 'hero')
  if (!hero) throw new Error('fixture hero missing')
  hero.face = 'face.wave2'
  ;(files['assets/index.json'] as AssetCatalogV1).assets['face.wave2'] = {
    kind: 'face',
    path: facePath,
    mediaType: 'image/png',
    bytes: faceBytes.byteLength,
    sha256: faceHash,
    origin: { kind: 'generated' },
  }
  const original = memoryFileSource(files),
    binaryReads: string[] = []
  const hooks: { read?: (path: string) => void | Promise<void> } = {}
  const source = {
    ...original,
    readBytes: async (path: string) => {
      binaryReads.push(path)
      await hooks.read?.(path)
      return original.readBytes(path)
    },
  }
  const project = await loadCurrentProjectFrom(source)
  const config = trialConfig([trialMember({ mp: { kind: 'value', value: 20 } })], {
    money: 100,
    music: { kind: 'silent' },
  })
  const member = config.party.members[0]
  if (!member) throw new Error('fixture party missing')
  member.skills = { kind: 'replace', ids: ['trial-spark'] }
  const token = await assertProjectSaveReadable(source),
    revision = await battleTrialRevision(project)
  binaryReads.length = 0
  return { files, project, config, token, revision, binaryReads, hooks, faceHash, facePath }
}

/** Browser IO boundary only: valid small chrome responses, PNG IHDR dimensions and close tracking.
 * This does not claim pixel decoding, drawing, layout or visual acceptance. */
export function installTrialChromeHost(faceHash: string, onFaceCreated?: () => void) {
  const resources = new Map<string, Uint8Array>([
    [
      ENGINE_CHROME.fontBdf,
      new TextEncoder().encode(
        'STARTFONT 2.1\nFONT fixture\nSIZE 8 75 75\nFONTBOUNDINGBOX 8 8 0 0\nSTARTPROPERTIES 2\nFONT_ASCENT 8\nFONT_DESCENT 0\nENDPROPERTIES\nCHARS 1\nSTARTCHAR U+0041\nENCODING 65\nSWIDTH 500 0\nDWIDTH 8 0\nBBX 8 8 0 0\nBITMAP\n00\n18\n24\n42\n7E\n42\n42\n00\nENDCHAR\nENDFONT\n',
      ),
    ],
    [ENGINE_CHROME.dialogCursor, new TextEncoder().encode(cursorJson)],
  ])
  for (const slot of ENGINE_CHROME_UI_SLOTS) resources.set(engineChromeUiUrl(slot), chromePng())
  const bitmaps: {
    width: number
    height: number
    close: ReturnType<typeof vi.fn>
    face: boolean
  }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input),
        bytes = resources.get(url)
      if (!bytes) throw new Error(`unexpected chrome URL ${url}`)
      return new Response(bytes.slice().buffer)
    }),
  )
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async (blob: Blob) => {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      if (
        bytes.length < 24 ||
        bytes[0] !== 137 ||
        bytes[1] !== 80 ||
        bytes[2] !== 78 ||
        bytes[3] !== 71
      )
        throw new Error('fixture bitmap host requires real PNG bytes')
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const face = (await sha256Bytes(bytes)) === faceHash
      const bitmap = { width: view.getUint32(16), height: view.getUint32(20), close: vi.fn(), face }
      bitmaps.push(bitmap)
      if (face) onFaceCreated?.()
      return bitmap
    }),
  )
  return { bitmaps, restore: () => vi.unstubAllGlobals() }
}
