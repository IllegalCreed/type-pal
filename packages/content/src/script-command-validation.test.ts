import { describe, expect, it } from 'vitest'
import { expectAcceptsUnchanged, expectRejectUnchanged } from './__tests__/validation-assertions.js'
import {
  checkCommands,
  checkEntityPages,
  checkStages,
  SCENE_ENTRY_PREPARE_SAFETY,
} from './script.js'

const checkProjected = (commands: unknown) => checkCommands(commands, 'script')

describe('projected timing and presentation fields', () => {
  it('preserves explicit RGB channels at both palette endpoints', () => {
    expectAcceptsUnchanged(checkProjected, [
      { kind: 'fade', dir: 'out', ms: 320, color: [0, 128, 255] },
    ])
  })

  it.each([
    { sample: 'alpha channel', color: [0, 128, 255, 255] },
    { sample: 'string channel', color: [0, '128', 255] },
    { sample: 'fractional channel', color: [0, 1.5, 255] },
    { sample: 'negative channel', color: [-1, 128, 255] },
    { sample: 'overflowing channel', color: [0, 128, 256] },
  ])('reports an invalid $sample at the RGB field', ({ color }) => {
    expectRejectUnchanged(
      checkProjected,
      [{ kind: 'fade', dir: 'out', ms: 320, color }],
      'script[0].color: 期望 black|red|三个 0–255 的 RGB 整数',
    )
  })

  it('rejects a same-frame pan that cannot advance on that frame', () => {
    const pan = { kind: 'cameraPan', dx: 4, dy: 2, frames: 1, startImmediately: true }
    expectAcceptsUnchanged(checkProjected, [pan])
    expectRejectUnchanged(
      checkProjected,
      [{ ...pan, startImmediately: false }],
      'script[0].startImmediately: 期望 true',
    )
    for (const frames of [0, '2', 1.5]) {
      expectRejectUnchanged(
        checkProjected,
        [{ ...pan, frames }],
        'script[0].frames: 同帧起步至少需要一步',
      )
    }
  })

  it('validates the optional arrival pose and sound without modifying the fallback branch', () => {
    const command = {
      kind: 'teleportOut',
      gatherParty: true,
      arrivalSound: 'sound.arrival',
      onFail: [{ kind: 'wait', ms: 40 }],
    }
    expectAcceptsUnchanged(checkProjected, [command])
    expectRejectUnchanged(
      checkProjected,
      [{ ...command, gatherParty: 1 }],
      'script[0].gatherParty: 期望 boolean',
    )
    for (const arrivalSound of ['', 45]) {
      expectRejectUnchanged(
        checkProjected,
        [{ ...command, arrivalSound }],
        'script[0].arrivalSound: 期望非空 AssetId',
      )
    }
  })
})

describe('projected script command validation', () => {
  it('auto stages 递归拒绝 loadScene，trigger stages 仍允许剧情切场', () => {
    expect(() =>
      checkEntityPages(
        [
          {
            auto: {
              stages: [
                {
                  body: [
                    {
                      kind: 'branch',
                      then: [{ kind: 'loadScene', scene: 's002' }],
                    },
                  ],
                },
              ],
            },
          },
        ],
        'entity.pages',
      ),
    ).toThrow(/auto 脚本禁止 loadScene/)
    expect(() =>
      checkEntityPages(
        [
          {
            trigger: {
              on: 'interact',
              stages: [{ body: [{ kind: 'loadScene', scene: 's002' }] }],
            },
          },
        ],
        'entity.pages',
      ),
    ).not.toThrow()
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
    expect(SCENE_ENTRY_PREPARE_SAFETY.wait).toBe('safe')
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
    ).not.toThrow()
  })

  it('scene entry reveal rejects negative time while an ordinary stage can omit entry', () => {
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

  it('setFollowers 只接受稳定 SpriteDef.id，拒绝旧数字精灵号', () => {
    expect(() =>
      checkCommands([{ kind: 'setFollowers', sprites: ['sprite-82'] }], 'script'),
    ).not.toThrow()
    expect(() => checkCommands([{ kind: 'setFollowers', sprites: [82] }], 'legacy-script')).toThrow(
      /期望非空 SpriteDef\.id/,
    )
    expect(() =>
      checkCommands(
        [{ kind: 'setFollowers', sprites: ['sprite-1', 'sprite-2', 'sprite-3'] }],
        'script',
      ),
    ).toThrow(/最多允许 2/)
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

  it('loadScene 支持默认、命名落点、显式坐标和原地切场', () => {
    expect(() =>
      checkCommands([{ kind: 'loadScene', scene: 's001', pos: 'current' }], 'script'),
    ).not.toThrow()
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

  it('loadScene 支持有证据的过渡 profile，hold/reveal 必须有 token', () => {
    expect(() =>
      checkCommands(
        [
          {
            kind: 'loadScene',
            scene: 's001',
            transition: { kind: 'modern', outMs: 260, inMs: 260, color: 'black' },
          },
          { kind: 'holdScreen', color: 'black', token: 'fbp-1' },
          { kind: 'revealScreen', token: 'fbp-1' },
        ],
        'script',
      ),
    ).not.toThrow()
    expect(() =>
      checkCommands([{ kind: 'holdScreen', color: 'black', token: '' }], 'script'),
    ).toThrow('token')
    expect(() =>
      checkCommands(
        [
          {
            kind: 'loadScene',
            scene: 's001',
            transition: { kind: 'modern', outMs: 300, inMs: 260, color: 'black' },
          },
        ],
        'script',
      ),
    ).toThrow('modern')
  })

  it('动作命令与页默认绑定 fail-loud，循环动作不能等待', () => {
    expect(() =>
      checkCommands(
        [
          {
            kind: 'playEntityAction',
            entity: 'e1',
            sprite: 'sprite-8',
            action: 'idle',
            loop: false,
            startAtMs: 200,
          },
          { kind: 'stopEntityAction', entity: 'e1', reset: true },
        ],
        'script',
      ),
    ).not.toThrow()
    expect(() =>
      checkCommands(
        [
          {
            kind: 'playEntityAction',
            entity: 'e1',
            sprite: 'sprite-8',
            action: 'idle',
            loop: true,
            wait: true,
          },
        ],
        'script',
      ),
    ).toThrow(/循环动作不得 wait/)
    expect(() => checkCommands([{ kind: 'stopEntityAction', entity: 'e1' }], 'script')).toThrow(
      /reset: 期望 boolean/,
    )

    expect(() =>
      checkEntityPages(
        [
          {
            animation: { sprite: 'sprite-8', action: 'idle', loop: true, startAtMs: 100 },
          },
        ],
        'entity.pages',
      ),
    ).not.toThrow()
    expect(() =>
      checkEntityPages(
        [
          {
            animation: { sprite: 'sprite-8', action: 'idle', loop: true, index: 0 },
          },
        ],
        'entity.pages',
      ),
    ).toThrow(/index: 未知字段/)
  })
})
