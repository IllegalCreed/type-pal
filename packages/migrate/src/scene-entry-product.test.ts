import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type {
  BaseAuthorCommand,
  BaseSceneEntryPresentation,
  BaseSceneDef,
  BaseScriptFlow,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(root + rel, 'utf8')) as T

const sceneIds = readJson<string[]>('projects/pal/content/scenes/index.json')
const scenes = sceneIds.map((id) => readJson<BaseSceneDef>(`projects/pal/content/scenes/${id}.json`))

function visitCommands(
  body: readonly BaseAuthorCommand[],
  visit: (command: BaseAuthorCommand) => void,
): void {
  for (const command of body) {
    visit(command)
    switch (command.kind) {
      case 'branch':
        visitCommands(command.then, visit)
        visitCommands(command.else ?? [], visit)
        break
      case 'loop':
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
        visitCommands(command.onNo, visit)
        break
    }
  }
}

function visitFlow(flow: BaseScriptFlow, visit: (command: BaseAuthorCommand) => void): void {
  if (flow.kind === 'stages') {
    for (const stage of flow.stages) {
      visitCommands(stage.entry?.prepare ?? [], visit)
      visitCommands(stage.body, visit)
    }
    return
  }
  for (const state of Object.values(flow.machine.states)) {
    visitCommands(state.entry?.prepare ?? [], visit)
    visitCommands(state.body, visit)
  }
}

function flowHasDither(flow: BaseScriptFlow): boolean {
  let found = false
  visitFlow(flow, (command) => {
    if (command.kind === 'ditherScreen') found = true
  })
  return found
}

interface EntrySite {
  targetScene: string
  ownerPath: string
  entry: BaseSceneEntryPresentation
  body: BaseAuthorCommand[]
}

function collectEntrySites(): EntrySite[] {
  const sites: EntrySite[] = []
  for (const scene of scenes)
    for (const [hookId, hook] of Object.entries(scene.hooks?.onEnter?.variants ?? {})) {
      if (hook.flow.kind === 'stages') {
        for (const stage of hook.flow.stages)
          if (stage.entry)
            sites.push({
              targetScene: scene.id,
              ownerPath: `${scene.id}/onEnter/${hookId}/${stage.id}`,
              entry: stage.entry,
              body: stage.body,
            })
        continue
      }
      for (const [stateId, state] of Object.entries(hook.flow.machine.states))
        if (state.entry)
          sites.push({
            targetScene: scene.id,
            ownerPath: `${scene.id}/onEnter/${hookId}/${stateId}`,
            entry: state.entry,
            body: state.body,
          })
    }
  return sites
}

const expectedEntryScenes = [
  's001',
  's018',
  's057',
  's090',
  's151',
  's180',
  's182',
  's196',
  's197',
  's198',
  's200',
]
const expectedIndependentDitherScenes = [
  's003',
  's011',
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
const expectedNonEarlyOnEnterScenes = [
  's140',
  's142',
  's164',
  's169',
  's170',
  's171',
  's173',
  's183',
  's188',
  's203',
  's227',
  's230',
  's233',
  's243',
  's251',
]

describe('X3-1 · PAL 生成产物的显式入场分类', () => {
  test('11 个早期 dither 站点全部提升，含 s182 dynamic hook', () => {
    const sites = collectEntrySites()
    expect(sites.map((site) => site.targetScene).sort()).toEqual(expectedEntryScenes)
    expect(sites.map((site) => site.ownerPath).sort()).toEqual([
      's001/onEnter/default/initial',
      's018/onEnter/default/initial',
      's057/onEnter/default/initial',
      's090/onEnter/default/initial',
      's151/onEnter/default/initial',
      's180/onEnter/default/initial',
      's182/onEnter/legacy-001/initial',
      's196/onEnter/default/initial',
      's197/onEnter/default/initial',
      's198/onEnter/default/initial',
      's200/onEnter/default/initial',
    ])
    for (const { entry } of sites) {
      expect(entry.reveal.kind).toBe('dither')
      expect(entry.prepare.some((command) => command.kind === 'ditherScreen')).toBe(false)
    }
  })

  test('s001 准备参数与呈现后正文边界精确', () => {
    const site = collectEntrySites().find((candidate) => candidate.targetScene === 's001')
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
      expect(flow?.kind, sceneId).toBe('stateMachine')
      if (flow?.kind !== 'stateMachine') continue
      const initial = flow.machine.states.initial
      const afterCheckpoint = flow.machine.states['after-checkpoint']
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
      expect(initial?.next, `${sceneId}/initial.next`).toEqual({
        kind: 'advance',
        state: 'after-checkpoint',
      })
      expect(
        afterCheckpoint?.body.map((command) => command.kind),
        `${sceneId}/after-checkpoint.body`,
      ).toEqual(['playMusic'])
      expect(afterCheckpoint?.next, `${sceneId}/after-checkpoint.next`).toEqual({
        kind: 'stay',
      })
    }
  })

  test('19 个实体独立 dither 与 13 个非早期 onEnter 保持通用命令', () => {
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
