import { describe, expect, test } from 'vitest'
import type { MigrationJson } from './pal-migration.js'
import { applyPalR13SixBLoadSceneTransitions } from './pal-r13-six-b-load-scene.js'

const transition = {
  kind: 'source',
  outMs: 1200,
  inMs: 600,
  color: 'black',
  evidenceId: 'pal-load-scene-123',
}

describe('PAL R13-6B loadScene baseline overlay', () => {
  test('只给 structural path 与目标均一致的命令增加 profile，输入保持不变', () => {
    const publishedScene = {
      id: 's001',
      hooks: { onEnter: [{ body: [{ kind: 'loadScene', scene: 's002' }] }] },
    }
    const rawScene = {
      id: 's001',
      hooks: {
        onEnter: [{ body: [{ kind: 'loadScene', scene: 's002', transition }] }],
      },
    }
    const result = applyPalR13SixBLoadSceneTransitions(
      new Map<string, MigrationJson>([
        ['content/scenes/s001.json', publishedScene as unknown as MigrationJson],
      ]),
      new Map<string, MigrationJson>([
        ['content/scenes/s001.json', rawScene as unknown as MigrationJson],
      ]),
    )
    expect(result.files.get('content/scenes/s001.json')).toEqual(rawScene)
    expect(result.dispositions).toEqual([
      expect.objectContaining({ status: 'applied', evidenceId: 'pal-load-scene-123' }),
    ])
    expect(publishedScene).not.toHaveProperty('hooks.onEnter.0.body.0.transition')
  })

  test('把已内联的 scene chunk profile 映射到 canonical entity flow，而不是复制 chunk 文件', () => {
    const publishedScene = {
      id: 's001',
      entities: [
        {
          id: 'e7',
          behaviors: {
            trigger: {
              default: {
                flow: {
                  kind: 'stages',
                  stages: [
                    {
                      id: 'initial',
                      body: [
                        { kind: 'wait', ms: 1 },
                        { kind: 'loadScene', scene: 's002' },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    }
    const rawChunk = {
      version: 1,
      id: 'scene/s001',
      scripts: {
        'scene/s001/root/entity-e7/page-0/trigger/stage-0': [
          { kind: 'wait', ms: 1 },
          { kind: 'loadScene', scene: 's002', transition },
        ],
      },
    }
    const result = applyPalR13SixBLoadSceneTransitions(
      new Map<string, MigrationJson>([
        ['content/scenes/s001.json', publishedScene as unknown as MigrationJson],
      ]),
      new Map<string, MigrationJson>([
        ['content/scripts/chunks/scene/s001.json', rawChunk as unknown as MigrationJson],
      ]),
    )
    expect(result.dispositions).toEqual([
      expect.objectContaining({
        scenePath: 'content/scenes/s001.json',
        commandPath: 'entities/0/behaviors/trigger/default/flow/stages/0/body/1',
        status: 'applied',
      }),
    ])
    expect(result.files.get('content/scenes/s001.json')).toMatchObject({
      entities: [
        {
          behaviors: {
            trigger: { default: { flow: { stages: [{ body: [{}, { transition }] }] } } },
          },
        },
      ],
    })
    expect(result.files.has('content/scripts/chunks/scene/s001.json')).toBe(false)
  })

  test('结构已被历史发布改写时记录 skipped，不覆盖场景；已投影时幂等', () => {
    const applied = {
      id: 's001',
      hooks: {
        onEnter: [{ body: [{ kind: 'loadScene', scene: 's002', transition }] }],
      },
    }
    const raw = new Map([['content/scenes/s001.json', structuredClone(applied)]])
    const replay = applyPalR13SixBLoadSceneTransitions(
      new Map([['content/scenes/s001.json', applied]]),
      raw,
    )
    expect(replay.dispositions[0]?.status).toBe('already')

    const published = new Map<string, MigrationJson>([
      ['content/scenes/s001.json', applied],
      [
        'content/scenes/s002.json',
        { id: 's002', hooks: { onEnter: [{ body: [{ kind: 'wait', ms: 10 }] }] } },
      ],
    ] as Array<[string, MigrationJson]>)
    const source = new Map<string, MigrationJson>([
      ['content/scenes/s001.json', structuredClone(applied)],
      [
        'content/scenes/s002.json',
        {
          id: 's002',
          hooks: {
            onEnter: [{ body: [{ kind: 'loadScene', scene: 's003', transition }] }],
          },
        },
      ],
    ] as Array<[string, MigrationJson]>)
    const mismatch = applyPalR13SixBLoadSceneTransitions(published, source)
    expect(mismatch.dispositions).toContainEqual(
      expect.objectContaining({
        scenePath: 'content/scenes/s002.json',
        status: 'skipped',
        reason: 'target-command-mismatch',
      }),
    )
  })
})
