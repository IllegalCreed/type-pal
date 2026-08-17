import {
  buildEntityLifecycleReferenceIndexV13,
  buildWorldV16,
  type EntityLifecycleReferenceIndexV13,
  type WorldStateV16,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { SupersedingFadeDriver } from './fade-driver.js'
import type { FileSource } from './file-source.js'
import type { LoadedProjectV13Core } from './loader-v13.js'
import { loadAllScenesV16, loadProjectV16From, loadSceneDefV16 } from './loader-v16.js'
import { normalizePayloadV16, preflightSaveMigrationV16 } from './save/migration-v16.js'
import { buildPayloadV8Content16 } from './save/ops.js'
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

function withJsonOverride(source: FileSource, path: string, value: unknown): FileSource {
  return {
    ...source,
    readJson: async <T>(candidate: string) =>
      candidate === path ? (structuredClone(value) as T) : source.readJson<T>(candidate),
  }
}

type LoadedPalProject = Awaited<ReturnType<typeof loadProjectV16From>>
type LoadedPalScene = Awaited<ReturnType<typeof loadSceneDefV16>>

function runtimeCore(project: LoadedPalProject): LoadedProjectV13Core {
  return {
    ...project,
    manifest: { ...project.manifest, contentVersion: 13 },
  } as unknown as LoadedProjectV13Core
}

function freshWorld(project: LoadedPalProject): WorldStateV16 {
  return buildWorldV16(project.manifest.startWorld, project.actorsById, project.worldVariables)
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
    scene: (sceneId) => loadSceneDefV16(project, sceneId),
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

test('正式 PAL contentVersion 16 工程通过 loader、历史 sidecar 验签与全场景校验', async () => {
  const project = await loadProjectV16From(projectFileSource('pal'))
  const scenes = await loadAllScenesV16(project)

  expect(project.manifest.contentVersion).toBe(16)
  expect(project.manifest.minimumSaveVersion).toBe(8)
  expect(project.entryScene.id).toBe('s000')
  expect(scenes).toHaveLength(294)
  expect(Object.keys(project.migrationRegistry)).toEqual(['script-v4-v5'])
  expect(Object.keys(project.sharedScripts)).toHaveLength(0)
  expect(project.worldVariables).toEqual({})
})

test('content16 loader 要求变量表路径并复用严格 registry validator', async () => {
  const source = projectFileSource('demo')
  const manifest = await source.readJson<Record<string, unknown>>('manifest.json')
  const content = { ...(manifest.content as Record<string, unknown>) }
  delete content.worldVariables
  await expect(
    loadProjectV16From(withJsonOverride(source, 'manifest.json', { ...manifest, content })),
  ).rejects.toThrow(/manifest 缺 worldVariables/)

  await expect(
    loadProjectV16From(
      withJsonOverride(source, 'content/world-variables.json', {
        'sys:screenWave': {
          kind: 'number',
          name: '内部屏波',
          description: '',
          initial: 0,
        },
      }),
    ),
  ).rejects.toThrow(/sys:/)
})

test('content16 registry 只初始化新世界，不进入存档 metadata', async () => {
  const source = projectFileSource('demo')
  const project = await loadProjectV16From(
    withJsonOverride(source, 'content/world-variables.json', {
      'quest.open': { kind: 'flag', name: '任务开启', description: '', initial: true },
      reputation: { kind: 'number', name: '声望', description: '', initial: 7 },
    }),
  )
  const world = freshWorld(project)
  expect(world.script?.flags['quest.open']).toBe(true)
  expect(world.script?.vars.reputation).toBe(7)
  const payload = buildPayloadV8Content16(
    world,
    { sceneId: project.entryScene.id, pos: project.entryScene.entry.pos, facing: 'down' },
    project.manifest.id,
  )
  expect(payload).not.toHaveProperty('worldVariables')
  expect(payload.world.script?.flags['quest.open']).toBe(true)
})

test('PAL s048 进场演出恢复亮屏、保存完成步骤，读档重进不重播', async () => {
  const project = await loadProjectV16From(projectFileSource('pal'))
  const scenes = await loadAllScenesV16(project)
  const lifecycleReferences = buildEntityLifecycleReferenceIndexV13(scenes)
  const scene = await loadSceneDefV16(project, 's048')
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

  const payload = buildPayloadV8Content16(
    world,
    {
      sceneId: scene.id,
      pos: scene.entry.pos,
      facing: scene.entry.facing,
    },
    project.manifest.id,
  )
  const resolver = await preflightSaveMigrationV16({
    manifest: project.manifest,
    payload,
  })
  const restored = normalizePayloadV16(payload, resolver, lifecycleReferences)
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
  const project = await loadProjectV16From(projectFileSource('pal'))
  const scenes = await loadAllScenesV16(project)
  const lifecycleReferences = buildEntityLifecycleReferenceIndexV13(scenes)
  const scene = await loadSceneDefV16(project, 's110')
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
])('仓库 HTTP fixture $id 已同步为 canonical content 16', async ({ id, entry, scenes: count }) => {
  const project = await loadProjectV16From(projectFileSource(id))
  const scenes = await loadAllScenesV16(project)

  expect(project.manifest).toMatchObject({
    id,
    contentVersion: 16,
    minimumSaveVersion: 8,
    entryScene: entry,
  })
  expect(scenes).toHaveLength(count)
  expect(Object.keys(project.migrationRegistry)).toEqual([])
})
