import { describe, expect, test } from 'vitest'
import { type SceneDef, validateScenesV5 } from './index.js'
import {
  ProjectScriptV4V5UpgradeError,
  projectLocalScriptV4ToV5,
} from './project-script-v5-upgrade.js'

function scene(pages: NonNullable<SceneDef['entities'][number]['pages']>): SceneDef {
  return {
    id: 'start',
    mapId: 'start',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'guide',
        pos: { col: 1, row: 1, height: 0 },
        sprite: 'guide',
        facing: 'down',
        pages,
      },
    ],
  }
}

describe('project-local script v4 -> v5 projection', () => {
  test('唯一单页/单段投影为稳定 default/main，并生成存档地址与 cursor alias', () => {
    const result = projectLocalScriptV4ToV5({
      projectId: 'local',
      scenes: [
        scene([
          {
            trigger: {
              on: 'interact',
              stages: [
                {
                  body: [
                    { kind: 'setEntityState', entity: 'guide', state: 2 },
                    {
                      kind: 'branch',
                      cond: { kind: 'entityInScene', entity: 'guide' },
                      then: [{ kind: 'takeEntity', entity: 'guide' }],
                    },
                  ],
                },
              ],
            },
          },
        ]),
      ],
      items: [],
      scriptChunks: {},
    })
    validateScenesV5(result.scenes)
    const projectedScene = result.scenes[0]
    const entity = projectedScene?.entities[0]
    if (!entity) throw new Error('projection 缺实体')
    expect(entity.initialPage).toBe('default')
    expect(entity.pages?.[0]).toMatchObject({
      id: 'default',
      trigger: 'default',
      triggerActivation: { on: 'interact' },
    })
    expect(entity.behaviors?.trigger?.default?.flow).toMatchObject({
      kind: 'stages',
      initial: 'main',
      stages: [
        {
          id: 'main',
          body: [
            {
              kind: 'setEntityState',
              target: { scene: 'start', entity: 'guide' },
              state: 2,
            },
            {
              kind: 'branch',
              cond: {
                kind: 'entityInScene',
                target: { scene: 'start', entity: 'guide' },
              },
              then: [
                {
                  kind: 'takeEntity',
                  target: { scene: 'start', entity: 'guide' },
                },
              ],
            },
          ],
        },
      ],
    })
    expect(result.legacyEntities).toEqual([
      {
        legacyId: 'guide',
        mode: 'single',
        target: { scene: 'start', entity: 'guide' },
      },
    ])
    expect(result.legacyCursors).toEqual([
      {
        legacyKey: 'guide',
        mode: 'single',
        target: {
          legacyStageCount: 1,
          target: {
            kind: 'entity-behavior',
            sceneId: 'start',
            entityId: 'guide',
            channel: 'trigger',
            behaviorId: 'default',
          },
          indices: [{ index: 0, cursor: { kind: 'stage', stage: 'main' } }],
        },
      },
    ])
  })

  test('多页不按数组下标猜稳定 id，返回可操作迁移报告', () => {
    expect(() =>
      projectLocalScriptV4ToV5({
        projectId: 'local',
        scenes: [scene([{}, {}])],
        items: [],
        scriptChunks: {},
      }),
    ).toThrow(ProjectScriptV4V5UpgradeError)
    try {
      projectLocalScriptV4ToV5({
        projectId: 'local',
        scenes: [scene([{}, {}])],
        items: [],
        scriptChunks: {},
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectScriptV4V5UpgradeError)
      expect((error as ProjectScriptV4V5UpgradeError).report.issues[0]).toMatchObject({
        resolution: 'name-pages',
        owner: 'entity:start/guide',
      })
    }
  })

  test('作者命名多页/多段并确认 cursor 广播后生成稳定 canonical identity', () => {
    const pagePath = 'content/scenes/start.json#/entities/guide/pages'
    const firstStages = `${pagePath}/0/trigger/stages`
    const result = projectLocalScriptV4ToV5({
      projectId: 'local',
      scenes: [
        scene([
          {
            state: 0,
            trigger: {
              on: 'interact',
              stages: [
                { body: [{ kind: 'setFlag', flag: 'first', value: true }], next: 'advance' },
                { body: [{ kind: 'setFlag', flag: 'second', value: true }] },
              ],
            },
          },
          {
            state: 1,
            trigger: {
              on: 'touch',
              stages: [{ body: [{ kind: 'setFlag', flag: 'alternate', value: true }] }],
            },
          },
        ]),
      ],
      items: [],
      scriptChunks: {},
      resolutions: [
        {
          kind: 'name-pages',
          path: pagePath,
          initialPageId: 'idle',
          pages: [
            {
              pageId: 'idle',
              label: '待机',
              triggerBehaviorId: 'talk',
              triggerLabel: '交谈',
            },
            {
              pageId: 'alert',
              label: '警戒',
              triggerBehaviorId: 'warn',
              triggerLabel: '警告',
            },
          ],
        },
        {
          kind: 'name-stages',
          path: firstStages,
          stages: [{ stageId: 'greet' }, { stageId: 'repeat' }],
        },
        {
          kind: 'resolve-legacy-cursor-alias',
          path: 'save-alias/cursors/guide',
          mode: 'broadcast-v4',
        },
      ],
    })

    validateScenesV5(result.scenes)
    const entity = result.scenes[0]!.entities[0]!
    expect(entity.initialPage).toBe('idle')
    expect(entity.pages).toMatchObject([
      { id: 'idle', label: '待机', trigger: 'talk' },
      { id: 'alert', label: '警戒', trigger: 'warn' },
    ])
    expect(entity.behaviors?.trigger?.talk?.flow).toMatchObject({
      kind: 'stages',
      initial: 'greet',
      stages: [{ id: 'greet', next: 'repeat' }, { id: 'repeat' }],
    })
    expect(result.legacyCursors).toEqual([
      expect.objectContaining({
        legacyKey: 'guide',
        mode: 'broadcast-v4',
        targets: expect.arrayContaining([
          expect.objectContaining({
            legacyStageCount: 2,
            indices: [
              { index: 0, cursor: { kind: 'stage', stage: 'greet' } },
              { index: 1, cursor: { kind: 'stage', stage: 'repeat' } },
            ],
          }),
          expect.objectContaining({ legacyStageCount: 1 }),
        ]),
      }),
    ])
  })

  test('作者命名动态场景绑定后生成 hook variant、选择命令与存档 binding 来源', () => {
    const commandPath =
      'content/scenes/start.json#/entities/guide/pages/0/trigger/stages[0].body[0]'
    const result = projectLocalScriptV4ToV5({
      projectId: 'local',
      scenes: [
        scene([
          {
            trigger: {
              on: 'interact',
              stages: [
                {
                  body: [
                    {
                      kind: 'setSceneOnTeleport',
                      scene: 'start',
                      stages: [
                        {
                          body: [{ kind: 'setFlag', flag: 'teleported', value: true }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ]),
      ],
      items: [],
      scriptChunks: {},
      resolutions: [
        {
          kind: 'replace-dynamic-binding',
          path: commandPath,
          id: 'secret-exit',
          label: '秘密出口',
        },
      ],
    })

    validateScenesV5(result.scenes)
    expect(result.scenes[0]?.entities[0]?.behaviors?.trigger?.default?.flow).toMatchObject({
      kind: 'stages',
      stages: [
        {
          body: [
            {
              kind: 'selectSceneHooks',
              scene: 'start',
              selection: {
                onTeleport: { kind: 'use', value: 'secret-exit' },
              },
            },
          ],
        },
      ],
    })
    expect(result.scenes[0]?.hooks?.onTeleport?.variants['secret-exit']).toMatchObject({
      label: '秘密出口',
      flow: {
        kind: 'stages',
        stages: [
          {
            body: [{ kind: 'setFlag', flag: 'teleported', value: true }],
          },
        ],
      },
    })
    expect(result.legacyBindingSources).toEqual([
      {
        sceneId: 'start',
        hook: 'onTeleport',
        binding: [
          {
            body: [{ kind: 'setFlag', flag: 'teleported', value: true }],
          },
        ],
        target: {
          kind: 'scene-hook',
          sceneId: 'start',
          hook: 'onTeleport',
          hookId: 'secret-exit',
        },
      },
    ])
  })
})
