import { emptyWorldScriptState, emptyWorldScriptStateV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { makeTestWorld } from '../test-fixtures.js'
import {
  buildMeta,
  buildPayload,
  buildPayloadV6,
  buildPayloadV8,
  LEGACY_SAVE_ENVELOPE_VERSION,
  normalizePayload,
  normalizePayloadV4Envelope,
  resolveLegacyFollowerSpriteId,
  resolveLegacyPlayerBattleSpriteId,
  resolveRestoredMusic,
} from './ops.js'
import { SAVE_VERSION } from './types.js'

describe('save ops（纯）', () => {
  test('buildMeta：队伍名+等级快照、kind、注入 now', () => {
    const w = makeTestWorld()
    const m = buildMeta('m01', w, '鬼界·民居', (c) => `名:${c.template}`, 999)
    expect(m).toEqual({
      slotId: 'm01',
      kind: 'manual',
      party: w.party.map((c) => ({ name: `名:${c.template}`, level: c.level })),
      mapName: '鬼界·民居',
      savedAt: 999,
    })
  })
  test('buildPayload：version + projectId/contentVersion + world + position', () => {
    const w = makeTestWorld()
    const pos = { col: 1, row: 2, height: 0 }
    const p = buildPayload(w, { sceneId: 's', pos, facing: 'down' }, 'demo', 1)
    expect(p.version).toBe(LEGACY_SAVE_ENVELOPE_VERSION)
    expect(p.projectId).toBe('demo')
    expect(p.contentVersion).toBe(1)
    expect(p.world).toBe(w)
    expect(p.position).toEqual({ sceneId: 's', pos, facing: 'down' })
  })
  test('buildPayloadV6：历史 canonical 构造器字节固定写出 6/6 epoch', () => {
    const world = { ...makeTestWorld(), script: emptyWorldScriptStateV5() }
    const position = {
      sceneId: 's',
      pos: { col: 1, row: 2, height: 0 },
      facing: 'down' as const,
    }
    const payload = buildPayloadV6(world, position, 'demo')
    expect(payload).toEqual({
      version: 6,
      contentVersion: 6,
      projectId: 'demo',
      world,
      position,
    })
    expect(payload.world).toBe(world)
  })
  test('buildPayloadV8：当前 canonical 存档固定写出 SAVE8/content9', () => {
    const world = { ...makeTestWorld(), script: emptyWorldScriptStateV5() }
    const position = {
      sceneId: 's',
      pos: { col: 1, row: 2, height: 0 },
      facing: 'down' as const,
    }
    const payload = buildPayloadV8(world, position, 'demo')
    expect(payload).toEqual({
      version: 8,
      contentVersion: 9,
      projectId: 'demo',
      world,
      position,
    })
    expect(payload.world).toBe(world)
  })
  test('normalizePayload:结构补默认(旧档缺容器字段/新增 luck)不动既有值', () => {
    const w = makeTestWorld()
    const p = buildPayload(
      w,
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'demo',
      1,
    )
    // 模拟"引擎加字段前的旧档":抹掉后加字段(结构演进,非数值污染)
    const c = p.world.party[0]! as unknown as Record<string, unknown>
    delete c.hiddenExp
    delete c.tags
    delete c.luck
    const beforeHp = p.world.party[0]!.hp
    const n = normalizePayload(p)
    expect(n.world.party[0]!.hiddenExp).toEqual({})
    expect(n.world.party[0]!.tags).toEqual([])
    expect(n.world.party[0]!.luck).toBe(0)
    expect(n.world.party[0]!.hp).toBe(beforeHp) // 既有值不动(不做旧档数值复原)
  })
  test('旧 envelope 专用链固定停在 v4，不跟当前 SAVE 常量漂移', () => {
    const p = buildPayload(
      makeTestWorld(),
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'demo',
      4,
    )
    p.version = 1
    expect(normalizePayloadV4Envelope(p).version).toBe(4)
  })
  test('normalizePayload:格式新于引擎 → 抛(宁拒不猜)', () => {
    const w = makeTestWorld()
    const p = buildPayload(
      w,
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'demo',
      1,
    )
    p.version = SAVE_VERSION + 1
    expect(() => normalizePayload(p)).toThrow(/新于引擎/)
  })
  test('normalizePayload:v1 party/reserve 数字立绘一次性升级，0 清除且二次幂等', () => {
    const p = buildPayload(
      makeTestWorld(),
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      3,
    )
    p.version = 1
    p.world.reserve = [structuredClone(p.world.party[0]!)]
    ;(p.world.party[0]!.appearance as unknown) = { portrait: 8 }
    ;(p.world.reserve[0]!.appearance as unknown) = { portrait: 0 }
    const normalized = normalizePayload(p, {
      where: '存档槽 m03',
      legacyPortraitAsset: (legacy) => `portrait.pal.${String(legacy).padStart(3, '0')}`,
      validatePortraitAsset: (asset) => {
        if (asset !== 'portrait.pal.008') throw new Error('missing portrait')
      },
    })
    expect(normalized.version).toBe(LEGACY_SAVE_ENVELOPE_VERSION)
    expect(normalized.world.party[0]?.appearance?.portrait).toBe('portrait.pal.008')
    expect(normalized.world.reserve?.[0]?.appearance).toBeUndefined()
    expect(
      normalizePayload(normalized, {
        where: '存档槽 m03',
        validatePortraitAsset: (asset) => {
          if (asset !== 'portrait.pal.008') throw new Error('missing portrait')
        },
      }),
    ).toBe(normalized)
  })

  test('normalizePayload:非 PAL 数字立绘须注入唯一映射，失败含存档位置', () => {
    const make = () => {
      const p = buildPayload(
        makeTestWorld(),
        { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
        'authored',
        3,
      )
      p.version = 1
      ;(p.world.party[0]!.appearance as unknown) = { portrait: 9 }
      return p
    }
    expect(() => normalizePayload(make(), { where: 'URL /save/old.json' })).toThrow(
      /URL \/save\/old\.json.*数字立绘 9 无 AssetId 转换规则/,
    )
    expect(() =>
      normalizePayload(make(), { where: '存档槽 quick', legacyPortraitAsset: () => undefined }),
    ).toThrow(/存档槽 quick.*缺少唯一 AssetId 映射/)
    expect(
      normalizePayload(make(), {
        legacyPortraitAsset: (legacy) => `portrait.authored.${legacy}`,
      }).world.party[0]?.appearance?.portrait,
    ).toBe('portrait.authored.9')
  })

  test('normalizePayload:已是 AssetId 原样保留，非法负数拒绝且不提前升版本', () => {
    const current = buildPayload(
      makeTestWorld(),
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'authored',
      3,
    )
    current.world.party[0]!.appearance = { portrait: 'portrait.authored.hero' }
    expect(normalizePayload(current).world.party[0]?.appearance?.portrait).toBe(
      'portrait.authored.hero',
    )

    const invalid = structuredClone(current)
    invalid.version = 1
    ;(invalid.world.party[0]!.appearance as unknown) = { portrait: -1 }
    expect(() => normalizePayload(invalid, { where: '存档槽 auto' })).toThrow(
      /存档槽 auto.*非负整数/,
    )
    expect(invalid.version).toBe(1)
  })

  test('normalizePayload:当前工程 catalog 同时验证旧映射与新 AssetId', () => {
    const legacy = buildPayload(
      makeTestWorld(),
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      3,
    )
    legacy.version = 1
    ;(legacy.world.party[0]!.appearance as unknown) = { portrait: 20 }
    expect(() =>
      normalizePayload(legacy, {
        where: '存档槽 m20',
        legacyPortraitAsset: (value) => `portrait.pal.${String(value).padStart(3, '0')}`,
        validatePortraitAsset: () => {
          throw new Error('AssetId 不在 catalog')
        },
      }),
    ).toThrow(/映射到 "portrait\.pal\.020".*不在 catalog/)

    const current = buildPayload(
      makeTestWorld(),
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      3,
    )
    current.world.party[0]!.appearance = { portrait: 'face.pal.li-xiaoyao' }
    expect(() =>
      normalizePayload(current, {
        where: '存档槽 quick',
        validatePortraitAsset: () => {
          throw new Error('期望 portrait，实际 face')
        },
      }),
    ).toThrow(/face\.pal\.li-xiaoyao.*期望 portrait/)
  })

  test('normalizePayload:v2 数字 followers 原子升级为 SpriteDef.id，零槽过滤且字符串幂等', () => {
    const make = () => {
      const payload = buildPayload(
        makeTestWorld(),
        { sceneId: 's102', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
        'pal',
        3,
      )
      payload.version = 2
      payload.world.script = emptyWorldScriptState()
      return payload
    }
    const numeric = make()
    ;(numeric.world.script!.followers as unknown) = [82, 0]
    expect(
      normalizePayload(numeric, {
        where: '存档槽 m08',
        legacyFollowerSpriteId: (value) => (value === 82 ? 'sprite-82' : undefined),
        validateFollowerSpriteId: (id) => {
          if (id !== 'sprite-82') throw new Error('missing')
        },
      }).world.script?.followers,
    ).toEqual(['sprite-82'])

    const cleared = make()
    ;(cleared.world.script!.followers as unknown) = [0, 0]
    expect(
      normalizePayload(cleared, { legacyFollowerSpriteId: () => undefined }).world.script
        ?.followers,
    ).toBeUndefined()

    const stable = make()
    stable.world.script!.followers = ['sprite-82']
    expect(
      normalizePayload(stable, { validateFollowerSpriteId: () => undefined }).world.script
        ?.followers,
    ).toEqual(['sprite-82'])
  })

  test('normalizePayload:followers 的 v3 数字、混合、歧义和超长均 fail-loud 且不改原数组/版本', () => {
    const make = (version: number, followers: unknown[]) => {
      const payload = buildPayload(
        makeTestWorld(),
        { sceneId: 's102', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
        'pal',
        3,
      )
      payload.version = version
      payload.world.script = emptyWorldScriptState()
      ;(payload.world.script.followers as unknown) = followers
      return payload
    }
    const v3 = make(3, [82])
    expect(() => normalizePayload(v3, { where: '存档槽 quick' })).toThrow(
      /world\.script\.followers.*v3.*拒绝数字/,
    )
    expect(v3.version).toBe(3)
    expect(v3.world.script?.followers).toEqual([82])

    expect(() => normalizePayload(make(2, [82, 'sprite-82']))).toThrow(/不允许.*混合/)
    expect(() => normalizePayload(make(2, [82, 83, 84]))).toThrow(/最多允许 2/)
    const missing = make(2, [82])
    const missingCharacter = missing.world.party[0]! as unknown as Record<string, unknown>
    delete missingCharacter.tags
    delete missingCharacter.hiddenExp
    delete missingCharacter.luck
    ;(missing.world as unknown as Record<string, unknown>).money = undefined
    const beforeMissing = structuredClone(missing)
    expect(() =>
      normalizePayload(missing, {
        where: 'URL /save/old.json',
        legacyFollowerSpriteId: () => undefined,
      }),
    ).toThrow(/URL \/save\/old\.json.*followers\[0\].*缺少唯一 SpriteDef\.id 映射/)
    expect(missing).toEqual(beforeMissing)
  })
  test('旧 follower resolver 只按 PAL AssetId 唯一反查，并冻结 directional/3 语义', () => {
    const directional = { kind: 'directional' as const, framesPerDir: 3 }
    expect(
      resolveLegacyFollowerSpriteId(
        {
          follower: { id: 'follower', asset: 'sprite.pal.082', label: 'f', layout: directional },
          fake: { id: 'sprite-82', asset: 'sprite.pal.999', label: 'fake', layout: directional },
        },
        82,
      ),
    ).toBe('follower')
    expect(
      resolveLegacyFollowerSpriteId(
        {
          custom: {
            id: 'custom',
            asset: 'sprite.authored.legacy-900.custom',
            label: 'custom',
            layout: directional,
          },
        },
        900,
      ),
    ).toBe('custom')
    expect(
      resolveLegacyFollowerSpriteId(
        {
          a: { id: 'a', asset: 'sprite.pal.002', label: 'a', layout: directional },
          b: { id: 'b', asset: 'sprite.pal.002', label: 'b', layout: directional },
        },
        2,
      ),
    ).toBeUndefined()
    expect(
      resolveLegacyFollowerSpriteId(
        { still: { id: 'still', asset: 'sprite.pal.082', label: 's', layout: { kind: 'static' } } },
        82,
      ),
    ).toBeUndefined()
  })

  test.each([
    1, 2, 3,
  ])('normalizePayload:v%i party/reserve 数字战斗外观原子升级为 BattleSpriteDef.id 且二次幂等', (version) => {
    const payload = buildPayload(
      makeTestWorld(),
      { sceneId: 's102', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      3,
    )
    payload.version = version
    payload.world.reserve = [structuredClone(payload.world.party[0]!)]
    payload.world.party[0]!.appearance = { battleSprite: 0 as unknown as string }
    payload.world.reserve[0]!.appearance = { battleSprite: 9 as unknown as string }
    const options = {
      where: `存档 v${version}`,
      legacyPlayerBattleSpriteId: (legacy: number) =>
        legacy === 0
          ? 'battle-sprite.pal.player-000.fighter'
          : legacy === 9
            ? 'battle-sprite.pal.player-009.fighter'
            : undefined,
      validatePlayerBattleSpriteId: (id: string) => {
        if (!id.endsWith('.fighter')) throw new Error('非 player-fighter')
      },
    }

    expect(normalizePayload(payload, options)).toBe(payload)
    expect(payload.version).toBe(LEGACY_SAVE_ENVELOPE_VERSION)
    expect(payload.world.party[0]?.appearance?.battleSprite).toBe(
      'battle-sprite.pal.player-000.fighter',
    )
    expect(payload.world.reserve[0]?.appearance?.battleSprite).toBe(
      'battle-sprite.pal.player-009.fighter',
    )
    expect(normalizePayload(payload, options)).toBe(payload)
  })

  test('normalizePayload:v4 数字、旧档混合类型、缺失映射和错误 profile 均 fail-loud 且原子', () => {
    const make = (version: number, party: unknown, reserve?: unknown) => {
      const payload = buildPayload(
        makeTestWorld(),
        { sceneId: 's102', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
        'pal',
        3,
      )
      payload.version = version
      payload.world.party[0]!.appearance = { battleSprite: party as string }
      if (reserve !== undefined) {
        payload.world.reserve = [structuredClone(payload.world.party[0]!)]
        payload.world.reserve[0]!.appearance = { battleSprite: reserve as string }
      }
      return payload
    }

    const currentNumeric = make(4, 0)
    const currentNumericBefore = structuredClone(currentNumeric)
    expect(() => normalizePayload(currentNumeric, { where: '存档槽 quick' })).toThrow(
      /world\.party\[0\]\.appearance\.battleSprite.*v4.*拒绝数字/,
    )
    expect(currentNumeric).toEqual(currentNumericBefore)

    expect(() => normalizePayload(make(3, 0, 'battle-sprite.hero'))).toThrow(
      /battleSprite.*不允许数字与定义 id 混合/,
    )
    expect(() => normalizePayload(make(3, 7), { where: 'URL old-save.json' })).toThrow(
      /URL old-save\.json.*数字战斗精灵 7 无定义 id 转换规则/,
    )

    const wrongProfile = make(3, 7)
    const wrongProfileBefore = structuredClone(wrongProfile)
    expect(() =>
      normalizePayload(wrongProfile, {
        legacyPlayerBattleSpriteId: () => 'battle-sprite.enemy-007',
        validatePlayerBattleSpriteId: () => {
          throw new Error('期望 player-fighter，实际 enemy')
        },
      }),
    ).toThrow(/battle-sprite\.enemy-007.*期望 player-fighter，实际 enemy/)
    expect(wrongProfile).toEqual(wrongProfileBefore)
  })

  test('normalizePayload:v4 字符串战斗外观须经当前工程闭包验证', () => {
    const payload = buildPayload(
      makeTestWorld(),
      { sceneId: 's102', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'authored',
      3,
    )
    payload.world.party[0]!.appearance = { battleSprite: 'battle-sprite.authored.hero' }
    expect(
      normalizePayload(payload, {
        validatePlayerBattleSpriteId: (id) => {
          if (id !== 'battle-sprite.authored.hero') throw new Error('missing')
        },
      }).world.party[0]?.appearance?.battleSprite,
    ).toBe('battle-sprite.authored.hero')

    const unvalidated = structuredClone(payload)
    const before = structuredClone(unvalidated)
    expect(() => normalizePayload(unvalidated)).toThrow(/缺少当前工程 player-fighter 定义闭包/)
    expect(unvalidated).toEqual(before)
  })

  test('normalizePayload:reserve 晚失败也不会提交 party 映射或前置容器默认', () => {
    const payload = buildPayload(
      makeTestWorld(),
      { sceneId: 's102', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      3,
    )
    payload.version = 3
    payload.world.reserve = [structuredClone(payload.world.party[0]!)]
    payload.world.party[0]!.appearance = { battleSprite: 0 as unknown as string }
    payload.world.reserve[0]!.appearance = { battleSprite: 9 as unknown as string }
    const party = payload.world.party[0]! as unknown as Record<string, unknown>
    delete party.tags
    delete party.hiddenExp
    delete party.luck
    ;(payload.world as unknown as Record<string, unknown>).money = undefined
    const before = structuredClone(payload)

    expect(() =>
      normalizePayload(payload, {
        legacyPlayerBattleSpriteId: (legacy) => `fighter-${legacy}`,
        validatePlayerBattleSpriteId: (id) => {
          if (id === 'fighter-9') throw new Error('reserve profile 实际 summon')
        },
      }),
    ).toThrow(/world\.reserve\[0\].*reserve profile 实际 summon/)
    expect(payload).toEqual(before)
    expect(payload.version).toBe(3)
  })

  test('旧 player battle resolver 只按 player 通道唯一 AssetId 反查，0 合法且歧义拒绝', () => {
    const fighter = {
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
      castEffectBase: 0,
      attackEffectBase: 0,
    }
    const enemy = {
      kind: 'enemy' as const,
      idle: { start: 0, count: 1 },
      magic: { start: 1, count: 0 },
      attack: { start: 1, count: 0 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 0,
    }
    expect(
      resolveLegacyPlayerBattleSpriteId(
        {
          hero: {
            id: 'hero',
            label: 'hero',
            asset: 'battle-sprite.pal.player.000',
            profile: fighter,
          },
        },
        0,
      ),
    ).toBe('hero')
    expect(
      resolveLegacyPlayerBattleSpriteId(
        {
          player: {
            id: 'player',
            label: 'player',
            asset: 'battle-sprite.pal.player.001',
            profile: fighter,
          },
          sameNumberEnemyChannel: {
            id: 'sameNumberEnemyChannel',
            label: 'enemy',
            asset: 'battle-sprite.pal.enemy.001',
            profile: enemy,
          },
        },
        1,
      ),
    ).toBe('player')
    expect(
      resolveLegacyPlayerBattleSpriteId(
        {
          a: { id: 'a', label: 'a', asset: 'battle-sprite.pal.player.001', profile: fighter },
          b: { id: 'b', label: 'b', asset: 'battle-sprite.pal.player.001', profile: fighter },
        },
        1,
      ),
    ).toBeUndefined()
    expect(resolveLegacyPlayerBattleSpriteId({}, -1)).toBeUndefined()
    expect(resolveLegacyPlayerBattleSpriteId({}, 1.5)).toBeUndefined()
  })
  test('读档音乐三态不继承旧活动世界：存档优先，其次场景，双缺省明确停止', () => {
    expect(resolveRestoredMusic('music.saved', 'music.scene')).toEqual({
      currentMusic: 'music.saved',
      action: 'play',
    })
    expect(resolveRestoredMusic(null, 'music.scene')).toEqual({
      currentMusic: null,
      action: 'stop',
    })
    expect(resolveRestoredMusic(undefined, 'music.scene')).toEqual({
      currentMusic: 'music.scene',
      action: 'play',
    })
    expect(resolveRestoredMusic(undefined, null)).toEqual({
      currentMusic: null,
      action: 'stop',
    })
    expect(resolveRestoredMusic(undefined, undefined)).toEqual({
      currentMusic: undefined,
      action: 'stop',
    })
  })
  test('normalizePayload:新版稳定地图覆写原样保留', () => {
    const p = buildPayload(
      makeTestWorld(),
      { sceneId: 's230', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      2,
    )
    p.world.script = {
      flags: {},
      vars: {},
      entityState: {},
      entityStage: {},
      mapOverride: { s230: 'map-056' },
    }
    expect(normalizePayload(p).world.script?.mapOverride).toEqual({ s230: 'map-056' })
  })
  test('normalizePayload:旧数字地图覆写明确拒绝，不猜成稳定地图 ID', () => {
    const p = buildPayload(
      makeTestWorld(),
      { sceneId: 's230', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      1,
    )
    p.world.script = {
      flags: {},
      vars: {},
      entityState: {},
      entityStage: {},
      mapOverride: { s230: 'map-056' },
    }
    ;(p.world.script.mapOverride as unknown as Record<string, unknown>).s230 = 56
    expect(() => normalizePayload(p)).toThrow(
      /旧存档 world\.script\.mapOverride\[s230\].*数字地图编号 56/,
    )
  })

  test('normalizePayload:旧 onTeleport 逐场景归一化到 sceneScriptOverrides', () => {
    const p = buildPayload(
      makeTestWorld(),
      { sceneId: 's059', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      1,
    )
    p.world.script = {
      flags: {},
      vars: {},
      entityState: {},
      entityStage: {},
      mapOverride: { s059: 'map-024' },
    }
    const raw = p.world.script as unknown as Record<string, unknown>
    raw.onTeleport = { s059: [{ body: [{ kind: 'clearDialog' }] }] }

    const normalized = normalizePayload(p).world.script!
    expect(normalized.sceneScriptOverrides?.s059?.onTeleport).toEqual([
      { body: [{ kind: 'clearDialog' }] },
    ])
    expect(normalized).not.toHaveProperty('onTeleport')
    expect(normalized.mapOverride).toEqual({ s059: 'map-024' })
  })

  test('normalizePayload:null tombstone 经 JSON 往返仍显式禁用双槽', () => {
    const p = buildPayload(
      makeTestWorld(),
      { sceneId: 's172', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      1,
    )
    p.world.script = {
      flags: {},
      vars: {},
      entityState: {},
      entityStage: {},
      sceneScriptOverrides: { s172: { onEnter: null, onTeleport: null } },
    }
    const parsed = JSON.parse(JSON.stringify(p)) as typeof p

    expect(normalizePayload(parsed).world.script?.sceneScriptOverrides?.s172).toEqual({
      onEnter: null,
      onTeleport: null,
    })
  })

  test('normalizePayload:旧 onTeleport 异型与新覆写未知槽均明确拒绝', () => {
    const old = buildPayload(
      makeTestWorld(),
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      1,
    )
    old.world.script = { flags: {}, vars: {}, entityState: {}, entityStage: {} }
    ;(old.world.script as unknown as Record<string, unknown>).onTeleport = { s059: 11870 }
    expect(() => normalizePayload(old)).toThrow(/onTeleport\[s059\].*ScriptStage/)

    const current = buildPayload(
      makeTestWorld(),
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      1,
    )
    current.world.script = {
      flags: {},
      vars: {},
      entityState: {},
      entityStage: {},
      sceneScriptOverrides: { s059: { onEnter: null } },
    }
    ;(current.world.script.sceneScriptOverrides!.s059 as unknown as Record<string, unknown>).map =
      'map-024'
    expect(() => normalizePayload(current)).toThrow(/未知槽 map/)
  })
})
