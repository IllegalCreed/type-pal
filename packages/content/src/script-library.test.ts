import { describe, expect, it } from 'vitest'
import { checkCommands, checkStages, SCENE_ENTRY_PREPARE_SAFETY } from './script.js'
import {
  AUTHORED_SCRIPT_PREFIX,
  checkScriptIndex,
  checkScriptLibrary,
  createScriptIndex,
  deriveScriptChunk,
  getScriptBody,
  isScriptRef,
  normalizeScriptLibrary,
  removeAuthoredScript,
  type ScriptIndexV1,
  stableScriptHash,
  upsertAuthoredScript,
} from './script-library.js'

const shards = { shared: 16, global: { items: 4 } }

describe('script library schema', () => {
  it('按稳定 id 重算 scene/shared/global chunk', () => {
    expect(deriveScriptChunk('scene/s001/on-enter/0', shards)).toBe('scene/s001')
    expect(deriveScriptChunk('shared/L_123/default', shards)).toMatch(/^shared\/c\d{2}$/)
    expect(deriveScriptChunk('global/items/use/i42', shards)).toMatch(/^global\/items\/c\d{2}$/)
    expect(deriveScriptChunk('global/skills/use/s1', shards)).toBeUndefined()
    expect(stableScriptHash('shared/L_123/default')).toBe(stableScriptHash('shared/L_123/default'))
  })

  it('ScriptRef 需要完整 chunk 和稳定 id', () => {
    expect(isScriptRef({ chunk: 'scene/s001', id: 'scene/s001/on-enter/0' })).toBe(true)
    expect(isScriptRef({ chunk: '', id: 'x' })).toBe(false)
  })

  it('index 只接受元数据与有效分桶配置', () => {
    const index: ScriptIndexV1 = {
      version: 1,
      shards,
      chunks: { 'scene/s001': { path: 'chunks/scene/s001.json', bytes: 123 } },
    }
    expect(() => checkScriptIndex(index)).not.toThrow()
    expect(() => checkScriptIndex({ ...index, shards: { ...shards, shared: 0 } })).toThrow(/正整数/)
  })

  it('作者目录只接受 shared/user 稳定 id 与合法 self 契约', () => {
    const index: ScriptIndexV1 = {
      version: 1,
      shards,
      chunks: {},
      library: {
        [`${AUTHORED_SCRIPT_PREFIX}heal-a1b2c3d4`]: {
          name: '旅店休息',
          description: '恢复后播放提示',
          self: 'none',
        },
      },
    }
    expect(() => checkScriptIndex(index)).not.toThrow()
    expect(() =>
      checkScriptIndex({
        ...index,
        library: { 'shared/L_1/default': { name: '伪装内部脚本', self: 'none' } },
      }),
    ).toThrow(/shared\/user/)
    expect(() =>
      checkScriptIndex({
        ...index,
        library: { [`${AUTHORED_SCRIPT_PREFIX}bad`]: { name: '', self: 'sometimes' } },
      }),
    ).toThrow()
  })

  it('归一化保留作者目录并统一重算 imports/bytes/hash', () => {
    const target = `${AUTHORED_SCRIPT_PREFIX}target-a1b2c3d4`
    const caller = `${AUTHORED_SCRIPT_PREFIX}caller-a1b2c3d4`
    const index: ScriptIndexV1 = {
      version: 1,
      shards,
      chunks: {},
      library: {
        [target]: { name: '目标', self: 'none' },
        [caller]: { name: '调用者', self: 'optional' },
      },
    }
    const targetChunk = deriveScriptChunk(target, shards)!
    const callerChunk = deriveScriptChunk(caller, shards)!
    const normalized = normalizeScriptLibrary(index, {
      [targetChunk]: {
        version: 1,
        id: targetChunk,
        scripts: { [target]: [{ kind: 'wait', ms: 40 }] },
      },
      [callerChunk]: {
        version: 1,
        id: callerChunk,
        scripts: {
          [caller]: [{ kind: 'callScript', ref: { chunk: targetChunk, id: target } }],
        },
      },
    })
    expect(normalized.index.library).toEqual(index.library)
    expect(normalized.index.chunks[callerChunk]?.bytes).toBeGreaterThan(0)
    expect(normalized.index.chunks[callerChunk]?.hash).toMatch(/^[0-9a-f]{8}$/)
    if (callerChunk !== targetChunk)
      expect(normalized.chunks[callerChunk]?.imports).toEqual([targetChunk])
    expect(() => checkScriptLibrary(normalized.index, normalized.chunks)).not.toThrow()
  })

  it('作者脚本可初始化、更新、定位和删除且不留空 chunk', () => {
    const id = `${AUTHORED_SCRIPT_PREFIX}demo-a1b2c3d4`
    const empty = { index: createScriptIndex(), chunks: {} }
    const created = upsertAuthoredScript(
      empty.index,
      empty.chunks,
      id,
      {
        name: '演示',
        self: 'required',
      },
      [{ kind: 'wait', ms: 100 }],
    )
    expect(getScriptBody(created.index, created.chunks, id)).toEqual([{ kind: 'wait', ms: 100 }])
    const updated = upsertAuthoredScript(
      created.index,
      created.chunks,
      id,
      {
        name: '演示改名',
        self: 'required',
      },
      [{ kind: 'wait', ms: 200 }],
    )
    expect(updated.index.library?.[id]?.name).toBe('演示改名')
    expect(getScriptBody(updated.index, updated.chunks, id)).toEqual([{ kind: 'wait', ms: 200 }])
    const removed = removeAuthoredScript(updated.index, updated.chunks, id)
    expect(removed.index.library).toBeUndefined()
    expect(Object.keys(removed.chunks)).toEqual([])
    expect(Object.keys(removed.index.chunks)).toEqual([])
  })

  it('完整校验拒绝有元数据无 body 和作者 body 放错 chunk', () => {
    const id = `${AUTHORED_SCRIPT_PREFIX}bad-a1b2c3d4`
    const index: ScriptIndexV1 = {
      version: 1,
      shards,
      chunks: {},
      library: { [id]: { name: '缺失', self: 'none' } },
    }
    expect(() => checkScriptLibrary(index, {})).toThrow(/没有脚本体/)
    const wrong = 'shared/c99'
    const chunks = { [wrong]: { version: 1 as const, id: wrong, scripts: { [id]: [] } } }
    const normalized = normalizeScriptLibrary(index, chunks)
    expect(() => checkScriptLibrary(normalized.index, normalized.chunks)).toThrow(/应位于/)
  })

  it('stage 同时支持 inline、call/jump 与 ref 换页', () => {
    expect(() =>
      checkStages(
        [{ body: [{ kind: 'callScript', ref: { chunk: 'scene/s001', id: 'scene/s001/root' } }] }],
        'stages',
      ),
    ).not.toThrow()
    expect(() =>
      checkStages(
        [
          {
            body: [
              {
                kind: 'setEntityAuto',
                entity: 'e1',
                script: { chunk: 'shared/c00', id: 'shared/auto/e1' },
              },
            ],
          },
        ],
        'stages',
      ),
    ).not.toThrow()
    expect(() =>
      checkStages([{ body: [{ kind: 'jumpScript', ref: { chunk: '', id: 'bad' } }] }], 'stages'),
    ).toThrow(/ScriptRef/)
  })

  it('scene entry 只准用于 onEnter，prepare 复用穷尽能力目录', () => {
    const entryStage = {
      entry: {
        prepare: [
          { kind: 'playMusic' as const, asset: 'music.pal.031' },
          {
            kind: 'teleportParty' as const,
            pos: { col: 59, row: -23, height: 0 },
          },
        ],
        reveal: {
          kind: 'dither' as const,
          ms: 2160,
          source: 'previousPresentedFrame' as const,
        },
      },
      body: [{ kind: 'dialog' as const, cue: { rows: [{ text: 'after' }] } }],
    }
    expect(() =>
      checkStages([entryStage], 'scene.onEnter', { allowSceneEntry: true }),
    ).not.toThrow()
    expect(() => checkStages([entryStage], 'entity.trigger')).toThrow(/只允许出现在场景 onEnter/)
    expect(SCENE_ENTRY_PREPARE_SAFETY.playMusic).toBe('safe')
    expect(SCENE_ENTRY_PREPARE_SAFETY.wait).toBe('blocked')
    expect(() =>
      checkStages(
        [
          {
            ...entryStage,
            entry: { ...entryStage.entry, prepare: [{ kind: 'wait', ms: 1 }] },
          },
        ],
        'scene.onEnter',
        { allowSceneEntry: true },
      ),
    ).toThrow(/wait 不允许在隐藏目标画面时执行/)
  })

  it('scene entry reveal 参数 fail-loud，普通旧 stage 仍兼容', () => {
    expect(() =>
      checkStages([{ body: [] }], 'legacy.onEnter', { allowSceneEntry: true }),
    ).not.toThrow()
    expect(() =>
      checkStages(
        [
          {
            entry: {
              prepare: [],
              reveal: { kind: 'dither', ms: -1, source: 'previousPresentedFrame' },
            },
            body: [],
          },
        ],
        'scene.onEnter',
        { allowSceneEntry: true },
      ),
    ).toThrow(/非负有限数/)
  })

  it('拒绝旧工程的 unmigrated 节点并提示重新迁移', () => {
    expect(() =>
      checkCommands([{ kind: 'unmigrated', opcode: 0x78, operands: [0, 0, 0] }], 'legacy-script'),
    ).toThrow(/旧工程产物,请用迁移器重新生成/)
  })

  it('过场命令只接受稳定 AssetId，并拒绝退役的 playRng', () => {
    expect(() =>
      checkCommands(
        [
          { kind: 'playVideo', asset: 'video.pal.001' },
          {
            kind: 'playFrameAnimation',
            asset: 'frame-animation.pal.003',
            startFrame: 2,
            endFrame: 8,
            frameRate: 25,
          },
        ],
        'script',
      ),
    ).not.toThrow()
    expect(() =>
      checkCommands([{ kind: 'playRng', chunkIdx: 3, speed: 25 }], 'legacy-script'),
    ).toThrow(/未知命令/)
    expect(() =>
      checkCommands(
        [{ kind: 'playFrameAnimation', asset: 'frame-animation.pal.003', endFrame: -1 }],
        'script',
      ),
    ).toThrow(/非负整数/)
  })

  it('playSound 只接受稳定 AssetId，并拒绝旧 soundId', () => {
    expect(() =>
      checkCommands([{ kind: 'playSound', asset: 'sound.pal.045' }], 'script'),
    ).not.toThrow()
    expect(() => checkCommands([{ kind: 'playSound', soundId: 45 }], 'legacy-script')).toThrow(
      /soundId.*已退役/,
    )
    expect(() => checkCommands([{ kind: 'playSound', asset: '' }], 'script')).toThrow(
      /期望非空 AssetId/,
    )
  })

  it('对话与持久形象只接受立绘 AssetId，拒绝旧数字字段', () => {
    expect(() =>
      checkCommands(
        [
          {
            kind: 'dialog',
            cue: {
              rows: [{ text: 'dlg.test' }],
              portrait: { asset: 'portrait.pal.001', side: 'left' },
            },
          },
          {
            kind: 'setActorAppearance',
            actor: 'li-xiaoyao',
            portrait: 'portrait.pal.002',
          },
        ],
        'script',
      ),
    ).not.toThrow()
    expect(() =>
      checkCommands(
        [
          {
            kind: 'dialog',
            cue: { rows: [{ text: 'dlg.test' }], portrait: { icon: 1, side: 'left' } },
          },
        ],
        'legacy-script',
      ),
    ).toThrow(/portrait\.icon.*已退役/)
    expect(() =>
      checkCommands(
        [{ kind: 'setActorAppearance', actor: 'li-xiaoyao', portrait: 2 }],
        'legacy-script',
      ),
    ).toThrow(/portrait.*AssetId/)
  })

  it('loadScene 只允许默认、命名落点、显式坐标三种互斥目标', () => {
    expect(() => checkCommands([{ kind: 'loadScene', scene: 's001' }], 'script')).not.toThrow()
    expect(() =>
      checkCommands([{ kind: 'loadScene', scene: 's001', entryId: 'pal-entry-a1' }], 'script'),
    ).not.toThrow()
    expect(() =>
      checkCommands(
        [{ kind: 'loadScene', scene: 's001', pos: { col: 1, row: 2, height: 0 } }],
        'script',
      ),
    ).not.toThrow()
    expect(() =>
      checkCommands(
        [
          {
            kind: 'loadScene',
            scene: 's001',
            entryId: 'pal-entry-a1',
            pos: { col: 1, row: 2, height: 0 },
          },
        ],
        'script',
      ),
    ).toThrow(/entryId 与 pos 不能同时存在/)
    expect(() =>
      checkCommands([{ kind: 'loadScene', scene: 's001', entryId: '' }], 'script'),
    ).toThrow(/非空命名落点 id/)
  })
})
