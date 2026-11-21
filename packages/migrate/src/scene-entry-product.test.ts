import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  type AuthorCommand,
  type AuthorScriptFlow,
  type AuthorStagesFlow,
  validateAuthorScenes,
  validateSceneIndex,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const readJson = (rel: string): unknown => JSON.parse(readFileSync(root + rel, 'utf8'))

const sceneIndex = validateSceneIndex(readJson('projects/pal/content/scenes/index.json'))
const scenes = validateAuthorScenes(
  sceneIndex.scenes.map((entry) => readJson(`projects/pal/${entry.path}`)),
)

function visitCommands(
  body: readonly AuthorCommand[],
  visit: (command: AuthorCommand) => void,
): void {
  for (const command of body) {
    visit(command)
    switch (command.kind) {
      case 'branch':
        visitCommands(command.then, visit)
        visitCommands(command.else ?? [], visit)
        break
      case 'loop':
      case 'repeat':
        visitCommands(command.body, visit)
        break
      case 'startBattle':
        visitCommands(command.onLose ?? [], visit)
        visitCommands(command.onFlee ?? [], visit)
        break
      case 'teleportOut':
        visitCommands(command.onFail ?? [], visit)
        break
      case 'confirm':
        visitCommands(command.onYes, visit)
        visitCommands(command.onNo, visit)
        break
    }
  }
}

function flowHasDither(flow: AuthorScriptFlow): boolean {
  // Acquisition stages hold recipe parameters. Authored commands live in staged flows.
  if (flow.kind === 'acquisition') return false
  let found = false
  const visit = (command: AuthorCommand) => {
    if (command.kind === 'ditherScreen') found = true
  }
  for (const stage of flow.stages) {
    visitCommands(stage.entry?.prepare ?? [], visit)
    visitCommands(stage.body, visit)
  }
  return found
}

interface EntrySite {
  targetScene: string
  ownerPath: string
  entry: NonNullable<AuthorStagesFlow['stages'][number]['entry']>
  body: AuthorCommand[]
}

function collectEntrySites(): EntrySite[] {
  const sites: EntrySite[] = []
  for (const scene of scenes)
    for (const [hookId, hook] of Object.entries(scene.hooks?.onEnter?.variants ?? {})) {
      for (const stage of hook.flow.stages)
        if (stage.entry)
          sites.push({
            targetScene: scene.id,
            ownerPath: `${scene.id}/onEnter/${hookId}/${stage.id}`,
            entry: stage.entry,
            body: stage.body,
          })
    }
  return sites
}

const expectedIndependentDitherScenes = [
  's003',
  's011',
  's017',
  's020',
  's058',
  's059',
  's064',
  's138',
  's144',
  's146',
  's147',
  's148',
  's154',
  's163',
  's201',
  's250',
  's252',
  's273',
  's278',
  's281',
]
const expectedNonEarlyOnEnterScenes = ['s142', 's164', 's173', 's203', 's230', 's233', 's251']

describe('PAL 作者工程的显式入场分类', () => {
  test('精确核对作者 onEnter 的显式入场位置与呈现类型', () => {
    const sites = collectEntrySites()
    const locations = sites
      .map(({ ownerPath, entry }) => `${ownerPath} ${entry.reveal.kind}`)
      .sort()
    expect(locations).toEqual([
      's001/onEnter/c8-731fd69bc3f4/stage-1 fade',
      's001/onEnter/default/initial dither',
      's003/onEnter/miao-ambush-arrival/initial fade',
      's018/onEnter/default/initial dither',
      's034/onEnter/default/initial fade',
      's037/onEnter/legacy-002/initial cut',
      's057/onEnter/default/initial dither',
      's066/onEnter/default/initial fade',
      's077/onEnter/default/initial fade',
      's081/onEnter/legacy-001/initial cut',
      's090/onEnter/default/initial dither',
      's101/onEnter/legacy-001/initial fade',
      's103/onEnter/after-revisit/initial fade',
      's106/onEnter/legacy-001/initial fade',
      's110/onEnter/legacy-001/initial cut',
      's117/onEnter/legacy-001/initial fade',
      's118/onEnter/legacy-001/initial fade',
      's140/onEnter/default/initial fade',
      's145/onEnter/legacy-001/initial fade',
      's149/onEnter/default/initial cut',
      's150/onEnter/default/initial fade',
      's151/onEnter/default/initial dither',
      's153/onEnter/default/initial cut',
      's169/onEnter/default/initial fade',
      's169/onEnter/default/legacy-002 dither',
      's170/onEnter/default/initial dither',
      's171/onEnter/default/initial dither',
      's180/onEnter/default/initial dither',
      's182/onEnter/legacy-001/initial dither',
      's183/onEnter/default/initial fade',
      's188/onEnter/default/initial fade',
      's196/onEnter/default/initial dither',
      's197/onEnter/default/initial dither',
      's198/onEnter/default/initial dither',
      's200/onEnter/default/initial dither',
      's227/onEnter/default/initial fade',
      's227/onEnter/default/legacy-002 fade',
      's231/onEnter/default/initial fade',
      's243/onEnter/default/initial cut',
      's244/onEnter/default/initial fade',
      's245/onEnter/default/initial fade',
      's268/onEnter/c8-e8b842591a52/stage-1 cut',
      's273/onEnter/c8-440a584eee79/stage-1 fade',
    ])
    for (const { entry } of sites) {
      expect(entry.prepare.some((command) => command.kind === 'ditherScreen')).toBe(false)
    }
  })

  test('s001 准备参数与呈现后正文边界精确', () => {
    const site = collectEntrySites().find(
      (candidate) => candidate.ownerPath === 's001/onEnter/default/initial',
    )
    expect(site?.entry).toEqual({
      prepare: [
        { kind: 'playMusic', asset: 'music.pal.031' },
        { kind: 'teleportParty', pos: { col: 59, row: -23, height: 0 } },
      ],
      reveal: { kind: 'dither', ms: 2160, source: 'previousPresentedFrame' },
    })
    expect(site?.body[0]?.kind).toBe('dialog')
    expect(site?.body.some((command) => command.kind === 'ditherScreen')).toBe(false)
  })

  test('R13 checkpoint 重建只保留一次 scene entry，正文从 reveal 后继续', () => {
    const expected = [
      {
        sceneId: 's057',
        prepareKinds: ['teleportParty'],
        bodyKinds: ['selectEntityBehavior', 'dialog', 'playMusic'],
      },
      {
        sceneId: 's180',
        prepareKinds: ['stopMusic', 'playSound'],
        bodyKinds: ['dialog', 'playMusic'],
      },
    ] as const
    for (const { sceneId, prepareKinds, bodyKinds } of expected) {
      const scene = scenes.find((candidate) => candidate.id === sceneId)
      const flow = scene?.hooks?.onEnter?.variants.default?.flow
      expect(flow?.kind, sceneId).toBe('stages')
      if (flow?.kind !== 'stages') throw new Error(`${sceneId}: expected ordinary author steps`)
      expect(flow.initial, sceneId).toBe('initial')
      expect(
        flow.stages.map((stage) => stage.id),
        sceneId,
      ).toEqual(['initial', 'after-checkpoint'])
      const initial = flow.stages.find((stage) => stage.id === 'initial')
      const afterCheckpoint = flow.stages.find((stage) => stage.id === 'after-checkpoint')
      expect(initial?.entry, sceneId).toMatchObject({
        reveal: { kind: 'dither', ms: 2160, source: 'previousPresentedFrame' },
      })
      expect(
        initial?.entry?.prepare.map((command) => command.kind),
        `${sceneId}/entry.prepare`,
      ).toEqual(prepareKinds)
      expect(
        initial?.body.map((command) => command.kind),
        `${sceneId}/initial.body`,
      ).toEqual(bodyKinds)
      expect(initial?.next, `${sceneId}/initial.next`).toBe('after-checkpoint')
      expect(
        afterCheckpoint?.body.map((command) => command.kind),
        `${sceneId}/after-checkpoint.body`,
      ).toEqual(['playMusic'])
      expect(afterCheckpoint?.entry, `${sceneId}/after-checkpoint.entry`).toBeUndefined()
      expect(afterCheckpoint?.next, `${sceneId}/after-checkpoint.next`).toBeUndefined()
    }
  })

  test('实体独立 dither 与无显式入场的 onEnter 保持通用命令', () => {
    const independent = scenes
      .filter((scene) =>
        scene.entities.some((entity) =>
          [entity.behaviors?.trigger, entity.behaviors?.auto].some((channel) =>
            Object.values(channel ?? {}).some((behavior) => flowHasDither(behavior.flow)),
          ),
        ),
      )
      .map((scene) => scene.id)
      .sort()
    const entryScenes = new Set(collectEntrySites().map((site) => site.targetScene))
    const nonEarlyOnEnter = scenes
      .filter(
        (scene) =>
          !entryScenes.has(scene.id) &&
          Object.values(scene.hooks?.onEnter?.variants ?? {}).some((hook) =>
            flowHasDither(hook.flow),
          ),
      )
      .map((scene) => scene.id)
      .sort()

    expect(independent).toEqual(expectedIndependentDitherScenes)
    expect(nonEarlyOnEnter).toEqual(expectedNonEarlyOnEnterScenes)
  })
})
