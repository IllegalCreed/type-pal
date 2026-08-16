import {
  buildEntityLifecycleReferenceIndexV13,
  buildWorldV13,
  type EntityLifecycleReferenceIndexV13,
  type WorldStateV13,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { SupersedingFadeDriver } from './fade-driver.js'
import type { FileSource } from './file-source.js'
import type { LoadedProjectV13Core } from './loader-v13.js'
import { loadAllScenesV14, loadProjectV14From, loadSceneDefV14 } from './loader-v14.js'
import { normalizePayloadV14, preflightSaveMigrationV14 } from './save/migration-v14.js'
import { buildPayloadV8Content14 } from './save/ops.js'
import type { ProjectScriptHostOptionsV13 } from './script-project-v13.js'
import { ScriptProjectRuntimeV13 } from './script-project-v13.js'

const projectJson = import.meta.glob('../../../projects/{pal,demo,e2e-own}/**/*.json', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

function projectFileSource(projectId: string): FileSource {
  const readText = async (path: string): Promise<string> => {
    const key = `../../../projects/${projectId}/${path}`
    const value = projectJson[key]
    if (value === undefined) throw new Error(`fixture JSON 不存在：${key}`)
    return value
  }
  const readBytes = async (path: string): Promise<ArrayBuffer> => {
    return new TextEncoder().encode(await readText(path)).buffer
  }
  return {
    readText,
    readJson: async <T>(path: string) => JSON.parse(await readText(path)) as T,
    readBytes,
    urlFor: async (path) => `fixture://${projectId}/${path}`,
  }
}

type LoadedPalProject = Awaited<ReturnType<typeof loadProjectV14From>>
type LoadedPalScene = Awaited<ReturnType<typeof loadSceneDefV14>>

function runtimeCore(project: LoadedPalProject): LoadedProjectV13Core {
  return {
    ...project,
    manifest: { ...project.manifest, contentVersion: 13 },
  } as unknown as LoadedProjectV13Core
}

function freshWorld(project: LoadedPalProject): WorldStateV13 {
  return buildWorldV13(project.manifest.startWorld, project.actorsById)
}

function recordingHost(
  project: LoadedPalProject,
  scene: LoadedPalScene,
  lifecycleReferences: EntityLifecycleReferenceIndexV13,
  events: string[],
  fade: SupersedingFadeDriver,
): ProjectScriptHostOptionsV13 {
  let now = 0
  return {
    executeEffect: async (command, _context, signal) => {
      if (command.kind === 'fade') {
        const ms = command.ms ?? 300
        events.push(`fade:${command.dir}:${ms}`)
        const done = fade.begin(command.dir === 'out' ? 1 : 0, now, ms, signal)
        now += ms
        fade.advance(now)
        await done
      } else if (command.kind === 'wait') events.push(`wait:${command.ms}`)
      else if (command.kind === 'clearDialog') events.push('clearDialog')
      else if (command.kind === 'dialog')
        events.push(`dialog:${command.cue.rows.map((row) => row.text).join(',')}`)
    },
    lifecycleReferences,
    scene: (sceneId) => loadSceneDefV14(project, sceneId),
    currentSceneId: () => scene.id,
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 0,
      inParty: () => false,
      entityInScene: (target) => target.scene === scene.id,
      facingEntity: () => false,
    },
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
    revealSceneEntry: async () => {},
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
  }
}

test('正式 PAL contentVersion 14 工程通过 loader、历史 sidecar 验签与全场景校验', async () => {
  const project = await loadProjectV14From(projectFileSource('pal'))
  const scenes = await loadAllScenesV14(project)

  expect(project.manifest.contentVersion).toBe(14)
  expect(project.manifest.minimumSaveVersion).toBe(8)
  expect(project.entryScene.id).toBe('s000')
  expect(scenes).toHaveLength(294)
  expect(Object.keys(project.migrationRegistry)).toEqual(['script-v4-v5'])
  expect(Object.keys(project.sharedScripts)).toHaveLength(0)
})

test('PAL s048 进场演出恢复亮屏、保存完成步骤，读档重进不重播', async () => {
  const project = await loadProjectV14From(projectFileSource('pal'))
  const scenes = await loadAllScenesV14(project)
  const lifecycleReferences = buildEntityLifecycleReferenceIndexV13(scenes)
  const scene = await loadSceneDefV14(project, 's048')
  const world = freshWorld(project)

  const firstEvents: string[] = []
  const firstFade = new SupersedingFadeDriver()
  const runtime = new ScriptProjectRuntimeV13(
    runtimeCore(project),
    world,
    'c'.repeat(64),
    recordingHost(project, scene, lifecycleReferences, firstEvents, firstFade),
  )
  await expect(
    runtime.runSceneHook(scene, 'onEnter', {
      signal: new AbortController().signal,
    }),
  ).resolves.toBe(true)

  const fadeOut = firstEvents.indexOf('fade:out:1600')
  const fadeIn = firstEvents.indexOf('fade:in:600')
  const redrawWait = firstEvents.indexOf('wait:120')
  const resumedDialogue = firstEvents.indexOf('dialog:dlg.3813')
  expect(fadeOut).toBeGreaterThanOrEqual(0)
  expect(fadeIn).toBeGreaterThan(fadeOut)
  expect(redrawWait).toBeGreaterThan(fadeIn)
  expect(resumedDialogue).toBeGreaterThan(redrawWait)
  expect(firstFade.value).toBe(0)
  expect(world.script?.behaviors.scenes?.s048?.onEnter?.cursor).toEqual({
    hook: 'default',
    at: { kind: 'stage', stage: 'completed' },
  })

  const payload = buildPayloadV8Content14(
    world,
    {
      sceneId: scene.id,
      pos: scene.entry.pos,
      facing: scene.entry.facing,
    },
    project.manifest.id,
  )
  const resolver = await preflightSaveMigrationV14({
    manifest: project.manifest,
    payload,
  })
  const restored = normalizePayloadV14(payload, resolver, lifecycleReferences)
  const secondEvents: string[] = []
  const secondFade = new SupersedingFadeDriver()
  const restoredRuntime = new ScriptProjectRuntimeV13(
    runtimeCore(project),
    restored.world,
    'c'.repeat(64),
    recordingHost(project, scene, lifecycleReferences, secondEvents, secondFade),
  )
  await expect(
    restoredRuntime.runSceneHook(scene, 'onEnter', {
      signal: new AbortController().signal,
    }),
  ).resolves.toBe(true)

  expect(secondEvents).toEqual([])
  expect(secondFade.value).toBe(0)
  expect(restored.world.script?.behaviors.scenes?.s048?.onEnter?.cursor).toEqual({
    hook: 'default',
    at: { kind: 'stage', stage: 'completed' },
  })
})

test('PAL s110 的逐帧重画先等待一帧再淡入，并保留剩余 27 帧', async () => {
  const project = await loadProjectV14From(projectFileSource('pal'))
  const scenes = await loadAllScenesV14(project)
  const lifecycleReferences = buildEntityLifecycleReferenceIndexV13(scenes)
  const scene = await loadSceneDefV14(project, 's110')
  const behavior = scene.entities.find((entity) => entity.id === 'e2061')?.behaviors?.trigger
    ?.default
  if (!behavior || behavior.flow.kind !== 'stages') throw new Error('s110/e2061/default 缺 stages')
  const flow = behavior.flow
  const stage = flow.stages.find((candidate) => candidate.id === flow.initial)
  if (!stage) throw new Error('s110/e2061/default 缺初始步骤')
  const fadeOut = stage.body.findIndex(
    (command) => command.kind === 'fade' && command.dir === 'out',
  )
  const resumedDialogue = stage.body.findIndex(
    (command) =>
      command.kind === 'dialog' && command.cue.rows.some((row) => row.text === 'dlg.5865'),
  )
  if (fadeOut < 0 || resumedDialogue < 0) throw new Error('s110 淡入区间锚点缺失')

  const world = freshWorld(project)
  const events: string[] = []
  const fade = new SupersedingFadeDriver()
  const runtime = new ScriptProjectRuntimeV13(
    runtimeCore(project),
    world,
    'c'.repeat(64),
    recordingHost(project, scene, lifecycleReferences, events, fade),
  )
  await runtime.runCommands(stage.body.slice(fadeOut, resumedDialogue + 1), {
    signal: new AbortController().signal,
  })

  expect(events).toEqual([
    'fade:out:1600',
    'clearDialog',
    'wait:40',
    'fade:in:600',
    'wait:1080',
    'dialog:dlg.5865,dlg.5866,dlg.5867',
  ])
  expect(fade.value).toBe(0)
})

test.each([
  { id: 'demo', entry: 'guijie-minju', scenes: 1 },
  { id: 'e2e-own', entry: 'start', scenes: 1 },
])('仓库 HTTP fixture $id 已同步为 canonical content 14', async ({ id, entry, scenes: count }) => {
  const project = await loadProjectV14From(projectFileSource(id))
  const scenes = await loadAllScenesV14(project)

  expect(project.manifest).toMatchObject({
    id,
    contentVersion: 14,
    minimumSaveVersion: 8,
    entryScene: entry,
  })
  expect(scenes).toHaveLength(count)
  expect(Object.keys(project.migrationRegistry)).toEqual([])
})
