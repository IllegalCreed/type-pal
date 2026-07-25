import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SceneDef, SpriteActionCue, SpriteDef } from '@type-pal/content'
import { EntityActionPlayer } from '@type-pal/reforge/entity-action-player'
import { describe, expect, test } from 'vitest'
import { buildPalMigration } from './pal-migration.js'
import { loadPalMigrationSources } from './pal-migration-io.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const hasExtractedData = existsSync(resolve(repo, 'data/extracted/events/all.json'))

const expectedZones = [
  's003/e63',
  's003/e64',
  's003/e75',
  's004/e114',
  's006/e168',
  's007/e173',
  's016/e220',
  's039/e634',
  's042/e695',
  's056/e940',
  's061/e1179',
  's063/e1206',
  's064/e1221',
  's085/e1623',
  's086/e1634',
  's087/e1645',
  's101/e1848',
  's102/e1881',
  's103/e1907',
  's104/e1928',
  's172/e2863',
  's176/e2930',
  's179/e2956',
  's185/e3110',
  's185/e3114',
  's186/e3137',
  's192/e3305',
  's228/e4059',
  's229/e4131',
  's244/e4330',
] as const

function assertMaterializedActionOracle(migration: ReturnType<typeof buildPalMigration>): void {
  const census = migration.report.spriteActions
  const materialization = migration.report.spriteActionMaterialization
  const sprites = migration.files.get('content/sprites.json') as unknown as SpriteDef[]
  const spriteById = new Map(sprites.map((sprite) => [sprite.id, sprite]))
  const sceneById = new Map(
    (migration.files.get('content/scenes/index.json') as unknown as string[]).map((sceneId) => [
      sceneId,
      migration.files.get(`content/scenes/${sceneId}.json`) as unknown as SceneDef,
    ]),
  )

  expect(materialization).toMatchObject({
    version: 1,
    acceptedInstances: 387,
    changedScenes: 54,
    changedSpriteDefinitions: 32,
    materializedActions: 32,
    removedAutoBindings: 387,
    digest: 'fb60bc5a770ef62a0baf4c8ae482e0e963b3e18a274a4d3520a7c9c3ed017e4f',
  })
  expect(
    sprites.flatMap((sprite) =>
      Object.keys(sprite.poses ?? {}).filter((id) => id.startsWith('pal-auto-v1-')),
    ),
  ).toHaveLength(32)

  for (const instance of census.instances.filter(
    (candidate) => candidate.reasons.length === 0 && candidate.timeline,
  )) {
    const timeline = instance.timeline!
    const scene = sceneById.get(instance.sceneId)
    const entity = scene?.entities.find((candidate) => candidate.id === instance.entityId)
    const page = entity?.pages?.[0]
    if (!page?.animation)
      throw new Error(`oracle: ${instance.sceneId}/${instance.entityId} 缺物化动作绑定`)
    if (page.auto)
      throw new Error(`oracle: ${instance.sceneId}/${instance.entityId} 仍有 page0 auto`)
    if (
      page.animation.sprite !== instance.spriteId ||
      page.animation.loop !== true ||
      (page.animation.startAtMs ?? 0) !== timeline.phaseMs
    )
      throw new Error(
        `oracle: ${instance.sceneId}/${instance.entityId} binding 与 census 相位/精灵不一致`,
      )
    const sprite = spriteById.get(page.animation.sprite)
    const action = sprite?.poses?.[page.animation.action]
    if (!sprite || !action)
      throw new Error(
        `oracle: ${instance.sceneId}/${instance.entityId} 缺 ${page.animation.sprite}/${page.animation.action}`,
      )

    // 旧 runner 已归一的启动段 + 两轮稳态；新播放器逐毫秒采样，比较帧、时间与 cue 边界。
    const expectedSteps = [...timeline.steps, ...timeline.steps.slice(timeline.loopFrom)]
    const totalMs = expectedSteps.reduce((sum, step) => sum + step.durationMs, 0)
    const expectedCues: Array<{ atMs: number; cue: SpriteActionCue }> = []
    let expectedAtMs = 0
    for (const step of expectedSteps) {
      for (const cue of step.cues ?? []) expectedCues.push({ atMs: expectedAtMs, cue })
      expectedAtMs += step.durationMs
    }

    let cueAtMs = 0
    const actualCues: Array<{ atMs: number; cue: SpriteActionCue }> = []
    const player = new EntityActionPlayer((_entity, cue) => {
      actualCues.push({ atMs: cueAtMs, cue })
    })
    player.replaceScene([
      {
        entity: instance.entityId,
        binding: page.animation,
        action,
      },
    ])

    let atMs = 0
    for (const step of expectedSteps) {
      for (let elapsed = 0; elapsed < step.durationMs; elapsed++) {
        const actualFrame = player.frame(instance.entityId)
        if (actualFrame !== step.frame)
          throw new Error(
            `oracle: ${instance.sceneId}/${instance.entityId} t=${atMs}ms frame ${actualFrame} != ${step.frame}`,
          )
        atMs++
        if (atMs < totalMs) {
          cueAtMs = atMs
          player.advance(1)
        }
      }
    }
    const loopStart = timeline.steps[timeline.loopFrom]!
    for (const cue of loopStart.cues ?? []) expectedCues.push({ atMs: totalMs, cue })
    cueAtMs = totalMs
    player.advance(1)
    if (player.frame(instance.entityId) !== loopStart.frame)
      throw new Error(
        `oracle: ${instance.sceneId}/${instance.entityId} 两轮结束未回到 loopFrom frame ${loopStart.frame}`,
      )
    if (JSON.stringify(actualCues) !== JSON.stringify(expectedCues))
      throw new Error(
        `oracle: ${instance.sceneId}/${instance.entityId} cue trace 不等价\nactual=${JSON.stringify(actualCues)}\nexpected=${JSON.stringify(expectedCues)}`,
      )
  }
}

describe.skipIf(!hasExtractedData)('PAL sprite action census golden', () => {
  test('从只读提取源冻结首批准入、拒绝分类、动作去重和关键样本', () => {
    const sources = loadPalMigrationSources(repo)
    const firstMigration = buildPalMigration(sources)
    const first = firstMigration.report.spriteActions
    const second = buildPalMigration(sources).report.spriteActions

    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
    expect(first.version).toBe(2)
    expect(first.summary).toEqual({
      page0Auto: 1374,
      directSprite: 1344,
      actorSource: 0,
      noVisualSource: 30,
      provenBeforeIncomingWrites: 484,
      rejectedByExternalWrites: 97,
      acceptedInstances: 387,
      acceptedSpriteDefinitions: 32,
      exactActions: 36,
      steadyCycleFamilies: 32,
      finiteIntroInstances: 4,
    })
    expect(first.reasonCounts).toEqual({
      'non-static-layout': 700,
      'external-write': 97,
      'no-visual-source': 30,
      'conditional-branch': 10,
      'state-or-visibility': 31,
      'random-branch': 286,
      movement: 309,
      'set-auto-or-trigger': 11,
      'facing-change': 138,
      'mixed-frame-mode': 38,
      'no-visible-action': 1,
      'cross-entity': 4,
      'stop-script': 131,
      'finite-intro': 4,
    })
    expect(first.primaryReasonCounts).toEqual({
      'non-static-layout': 700,
      'external-write': 97,
      'no-visual-source': 30,
      'conditional-branch': 10,
      'random-branch': 119,
      'no-visible-action': 1,
      'state-or-visibility': 1,
      'cross-entity': 1,
      movement: 24,
      'finite-intro': 4,
    })
    expect(first.externalWriteCategoryCounts).toEqual({
      'trigger-binding': 9,
      state: 48,
      facing: 12,
      frame: 14,
      'auto-binding': 13,
      motion: 44,
      position: 1,
    })
    expect(first.digests).toEqual({
      acceptedSites: 'b6ee586cefe9a5b0762279f39892ab141247fcf761f279466f648b45f87c528b',
      rejections: '393d97ab05161c96a4aa28f11d95838455a01d8fe7fdcf1d9aa276b7da347c67',
      actions: 'a6dd0657ff7476d2c37021277540c92cdc43df888f16d712c87e40d3e7585c69',
    })

    const zones = first.instances.filter((instance) => instance.source === 'zone')
    expect(zones.map((instance) => `${instance.sceneId}/${instance.entityId}`)).toEqual(
      expectedZones,
    )
    expect(zones.every((instance) => instance.reasons.join() === 'no-visual-source')).toBe(true)

    expect(
      first.instances
        .filter(
          (instance) =>
            (instance.sceneId === 's005' && instance.entityId === 'e116') ||
            (instance.sceneId === 's036' && ['e604', 'e605', 'e606'].includes(instance.entityId)),
        )
        .map(({ sceneId, entityId, reasons }) => [sceneId, entityId, reasons]),
    ).toEqual([
      ['s005', 'e116', ['external-write']],
      ['s036', 'e604', ['external-write']],
      ['s036', 'e605', ['external-write']],
      ['s036', 'e606', ['external-write']],
    ])
    expect(
      first.instances
        .filter((instance) => instance.timeline?.behavior === 'finite-intro')
        .map(({ sceneId, entityId, reasons }) => [sceneId, entityId, reasons]),
    ).toEqual([
      ['s130', 'e2276', ['finite-intro']],
      ['s130', 'e2278', ['finite-intro']],
      ['s130', 'e2280', ['finite-intro']],
      ['s203', 'e3425', ['finite-intro']],
    ])
    expect(
      first.instances.find(
        (instance) => instance.sceneId === 's013' && instance.entityId === 'e199',
      )?.reasons,
    ).toEqual(['no-visible-action'])

    const sprite8 = first.instances.filter((instance) => instance.spriteId === 'sprite-8')
    expect(sprite8).toHaveLength(53)
    expect(sprite8.every((instance) => instance.reasons.length === 0)).toBe(true)
    expect(
      [...new Set(sprite8.map((instance) => instance.timeline?.exactTimelineKey))].length,
    ).toBe(3)
    expect([...new Set(sprite8.map((instance) => instance.timeline?.steadyCycleKey))].length).toBe(
      1,
    )
    expect(
      [0, 200, 400].map((phase) => [
        phase,
        sprite8.filter((instance) => instance.timeline?.phaseMs === phase).length,
      ]),
    ).toEqual([
      [0, 20],
      [200, 15],
      [400, 18],
    ])

    const sprite96 = first.instances.filter((instance) => instance.spriteId === 'sprite-96')
    expect(sprite96.map(({ sceneId, entityId, reasons }) => [sceneId, entityId, reasons])).toEqual([
      ['s012', 'e197', ['external-write']],
      ['s275', 'e4732', []],
    ])
    expect(sprite96[1]?.timeline).toMatchObject({
      loopFrom: 1,
      durationMs: 1980,
      cycleDurationMs: 1880,
      steps: [
        { frame: 0, durationMs: 100 },
        { frame: 0, durationMs: 380 },
        { frame: 1, durationMs: 460 },
        { frame: 2, durationMs: 100 },
        {
          frame: 2,
          durationMs: 380,
          cues: [{ kind: 'sound', asset: 'sound.pal.135' }],
        },
        { frame: 3, durationMs: 560 },
      ],
    })

    expect(
      first.instances
        .filter((instance) => instance.spriteId === 'sprite-35')
        .map(({ sceneId, entityId, reasons }) => [sceneId, entityId, reasons]),
    ).toEqual([
      ['s004', 'e82', ['external-write']],
      ['s048', 'e795', ['external-write']],
      ['s267', 'e4669', []],
    ])
    expect(
      first.instances
        .filter((instance) => instance.spriteId === 'sprite-72')
        .every((instance) => instance.reasons.includes('random-branch')),
    ).toBe(true)
    expect(
      first.instances
        .filter((instance) => instance.spriteId === 'sprite-490')
        .every(
          (instance) =>
            instance.reasons.includes('random-branch') && instance.reasons.includes('stop-script'),
        ),
    ).toBe(true)
    assertMaterializedActionOracle(firstMigration)
  }, 120_000)
})
