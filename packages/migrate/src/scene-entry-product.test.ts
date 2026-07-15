import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type {
  Command,
  SceneDef,
  ScriptChunkV1,
  ScriptIndexV1,
  ScriptStage,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(root + rel, 'utf8')) as T

const sceneIds = readJson<string[]>('projects/pal/content/scenes/index.json')
const scenes = sceneIds.map((id) => readJson<SceneDef>(`projects/pal/content/scenes/${id}.json`))
const scriptIndex = readJson<ScriptIndexV1>('projects/pal/content/scripts/index.json')
const chunks = Object.values(scriptIndex.chunks).map((meta) =>
  readJson<ScriptChunkV1>(`projects/pal/content/scripts/${meta.path}`),
)

function visitCommands(body: readonly Command[], visit: (command: Command) => void): void {
  for (const command of body) {
    visit(command)
    switch (command.kind) {
      case 'branch':
        visitCommands(command.then, visit)
        if (command.else) visitCommands(command.else, visit)
        break
      case 'startBattle':
        if (command.onLose) visitCommands(command.onLose, visit)
        if (command.onFlee) visitCommands(command.onFlee, visit)
        break
      case 'teleportOut':
        if (command.onFail) visitCommands(command.onFail, visit)
        break
      case 'confirm':
        visitCommands(command.onNo, visit)
        break
      case 'setEntityAuto':
      case 'setEntityTrigger':
      case 'setSceneOnEnter':
      case 'setSceneOnTeleport':
        if (command.stages)
          for (const stage of command.stages) {
            if (stage.entry) visitCommands(stage.entry.prepare, visit)
            visitCommands(stage.body, visit)
          }
        break
    }
  }
}

function stageScriptId(stage: ScriptStage): string {
  const rootCommand = stage.body[0]
  expect(rootCommand?.kind).toBe('callScript')
  return rootCommand?.kind === 'callScript' ? rootCommand.ref.id : '<missing-call-script>'
}

interface EntrySite {
  targetScene: string
  scriptId: string
  stage: ScriptStage
}

function collectEntrySites(): EntrySite[] {
  const sites: EntrySite[] = []
  for (const scene of scenes)
    for (const stage of scene.onEnter ?? [])
      if (stage.entry) sites.push({ targetScene: scene.id, scriptId: stageScriptId(stage), stage })

  for (const chunk of chunks)
    for (const body of Object.values(chunk.scripts))
      visitCommands(body, (command) => {
        if (command.kind !== 'setSceneOnEnter' || !command.stages) return
        for (const stage of command.stages)
          if (stage.entry)
            sites.push({
              targetScene: command.scene,
              scriptId: stageScriptId(stage),
              stage,
            })
      })
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
  's233',
  's251',
]

describe('X3-1 · PAL 生成产物的显式入场分类', () => {
  test('11 个早期 dither 站点全部提升，含 s182 override', () => {
    const sites = collectEntrySites()
    expect(sites.map((site) => site.targetScene).sort()).toEqual(expectedEntryScenes)
    expect(sites.map((site) => site.scriptId).sort()).toEqual([
      'scene/s001/root/on-enter/stage-0',
      'scene/s018/root/on-enter/stage-0',
      'scene/s057/root/on-enter/stage-0',
      'scene/s090/root/on-enter/stage-0',
      'scene/s151/root/on-enter/stage-0',
      'scene/s180/root/on-enter/stage-0',
      'scene/s182/override/on-enter/L-27448/stage-0',
      'scene/s196/root/on-enter/stage-0',
      'scene/s197/root/on-enter/stage-0',
      'scene/s198/root/on-enter/stage-0',
      'scene/s200/root/on-enter/stage-0',
    ])
    for (const { stage } of sites) {
      expect(stage.entry?.reveal.kind).toBe('dither')
      expect(stage.entry?.prepare.some((command) => command.kind === 'ditherScreen')).toBe(false)
    }
  })

  test('s001 准备参数与呈现后正文边界精确', () => {
    const site = collectEntrySites().find((candidate) => candidate.targetScene === 's001')
    expect(site?.stage.entry).toEqual({
      prepare: [
        { kind: 'playMusic', asset: 'music.pal.031' },
        { kind: 'teleportParty', pos: { col: 59, row: -23, height: 0 } },
      ],
      reveal: { kind: 'dither', ms: 2160, source: 'previousPresentedFrame' },
    })
    const chunk = chunks.find((candidate) => candidate.id === 'scene/s001')
    const body = chunk?.scripts['scene/s001/root/on-enter/stage-0']
    expect(body?.[0]?.kind).toBe('dialog')
    expect(body?.some((command) => command.kind === 'ditherScreen')).toBe(false)
  })

  test('17 个独立 dither 与 13 个非早期 onEnter 保持通用命令', () => {
    const ditherScriptIds: string[] = []
    for (const chunk of chunks)
      for (const [scriptId, body] of Object.entries(chunk.scripts)) {
        let found = false
        visitCommands(body, (command) => {
          if (command.kind === 'ditherScreen') found = true
        })
        if (found) ditherScriptIds.push(scriptId)
      }

    const entryScenes = new Set(collectEntrySites().map((site) => site.targetScene))
    const sceneOf = (scriptId: string): string => scriptId.match(/^scene\/(s\d+)\//)?.[1] ?? ''
    const independent = [
      ...new Set(
        ditherScriptIds.filter((scriptId) => !scriptId.includes('/on-enter/')).map(sceneOf),
      ),
    ].sort()
    const nonEarlyOnEnter = [
      ...new Set(
        ditherScriptIds
          .filter((scriptId) => scriptId.includes('/on-enter/'))
          .map(sceneOf)
          .filter((sceneId) => !entryScenes.has(sceneId)),
      ),
    ].sort()

    expect(independent).toEqual(expectedIndependentDitherScenes)
    expect(nonEarlyOnEnter).toEqual(expectedNonEarlyOnEnterScenes)
  })
})
