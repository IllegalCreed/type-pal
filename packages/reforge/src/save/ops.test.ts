import { emptyWorldScriptState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { makeTestWorld } from '../test-fixtures.js'
import {
  buildMeta,
  buildPayload,
  normalizePayload,
  resolveLegacyFollowerSpriteId,
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
    expect(p.version).toBe(SAVE_VERSION)
    expect(p.projectId).toBe('demo')
    expect(p.contentVersion).toBe(1)
    expect(p.world).toBe(w)
    expect(p.position).toEqual({ sceneId: 's', pos, facing: 'down' })
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
    expect(normalized.version).toBe(SAVE_VERSION)
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
