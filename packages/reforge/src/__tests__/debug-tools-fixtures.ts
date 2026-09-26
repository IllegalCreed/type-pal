import {
  type AuthorSceneDef,
  type AuthorScriptFlow,
  buildEntityLifecycleReferenceIndex,
  buildWorld,
  type CurrentManifest,
  type RuntimeSceneDef,
} from '@type-pal/content'
import { vi } from 'vitest'
import {
  type DebugMotionSnapshot,
  type DebugToolsContext,
  installDebugTools,
} from '../debug-tools.js'
import { loadCurrentProjectFrom } from '../project-loader.js'
import type { RuntimeLeafCommand } from '../runtime-script-compiler.js'
import { type ProjectScriptHostOptions, ScriptProjectRuntime } from '../runtime-script-project.js'
import { enemyProfile, wfEnemy, wfHealItem } from './battle-workflows/catalog.js'
import { projectData, shellProject, shellScene } from './runtime-shell/project.js'

const flow = (flag: string): AuthorScriptFlow => ({
  kind: 'stages',
  initial: 'first',
  stages: [{ id: 'first', body: [{ kind: 'setFlag', flag, value: true }] }],
})
const hook = (flag: string) => ({
  initial: 'main',
  variants: { main: { label: flag, order: 0, flow: flow(flag) } },
})
const disposers: Array<() => void> = []
export function cleanupDebug() {
  for (const dispose of disposers.splice(0)) dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
}
export const drain = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
export function element<T extends Element = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`missing DOM control: ${selector}`)
  return found
}
export const field = (label: string) => element<HTMLInputElement>(`[aria-label="${label}"]`)
export function button(text: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === text,
  )
  if (!found) throw new Error(`missing button: ${text}`)
  return found
}
export function command(text: string) {
  field('调试命令').value = text
  field('调试命令').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}
export function selectActor(id = 'hero') {
  element<HTMLInputElement>(`.tpd-option input[value="${id}"]`).click()
}
export function status() {
  return element('[role="status"]').textContent
}
export function trigger(prefix: string) {
  const found = [...document.querySelectorAll<HTMLButtonElement>('.tpd-trigger-button')].find((b) =>
    b.textContent?.startsWith(prefix),
  )
  if (!found) throw new Error(`missing trigger ${prefix}`)
  return found
}

/** Complete source tables go through the current loader, not a cast partial project. */
export async function debugHarness(
  options: { noFields?: boolean; noTeams?: boolean; wait?: ProjectScriptHostOptions['wait'] } = {},
) {
  // JSDOM Blob lacks stream(); use Node's standard Blob with Node Response/CompressionStream.
  const nodeBufferModule = 'node:buffer'
  const native: { Blob: typeof Blob } = await import(nodeBufferModule)
  vi.stubGlobal('Blob', native.Blob)
  const scene: AuthorSceneDef = {
    ...shellScene('a'),
    hooks: { onEnter: hook('entered'), onTeleport: hook('teleported') },
    entities: [
      {
        id: 'zone',
        zone: true,
        pos: { col: 3, row: 3, height: 0 },
        behaviors: {
          trigger: { touch: { label: 'Touch', order: 0, flow: flow('triggered') } },
          auto: { pulse: { label: 'Pulse', order: 0, flow: flow('auto') } },
        },
        initialPage: 'open',
        pages: [
          {
            id: 'open',
            label: 'Open',
            trigger: 'touch',
            auto: 'pulse',
            triggerActivation: { on: 'interact', range: 2 },
          },
        ],
      },
      { id: 'blank', zone: true, pos: { col: 1, row: 1, height: 0 } },
    ],
  }
  const fixture = await shellProject({ first: scene })
  const manifest: CurrentManifest = structuredClone(fixture.project.manifest)
  manifest.content.enemies = 'content/enemies.json'
  manifest.content.enemyTeams = 'content/enemy-teams.json'
  manifest.content.battleFields = 'content/battle-fields.json'
  fixture.files['manifest.json'] = manifest
  fixture.files['content/enemies.json'] = [
    wfEnemy('slime', {}, { sounds: {}, battleSprite: 'enemy' }),
  ]
  fixture.files['content/enemy-teams.json'] = options.noTeams
    ? []
    : [{ id: 'team', slots: ['slime', null] }]
  fixture.files['content/battle-fields.json'] = options.noFields
    ? []
    : [{ id: 7, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } }]
  fixture.files['content/battle-sprites.json'] = [
    ...Object.values(fixture.project.battleSpritesById),
    { id: 'enemy', label: 'Enemy', asset: 'fighter', profile: enemyProfile('enemy') },
  ]
  fixture.files['content/items.json'] = [wfHealItem('tonic'), wfHealItem('elixir')]
  fixture.files['content/shared-scripts.json'] = {
    mark: { name: 'Mark', self: 'none', body: [{ kind: 'setFlag', flag: 'shared', value: true }] },
    hold: {
      name: 'Hold',
      self: 'none',
      body: [
        { kind: 'wait', ms: 40 },
        { kind: 'setFlag', flag: 'afterWait', value: true },
      ],
    },
  }
  const project = await loadCurrentProjectFrom(fixture.source)
  const projectBefore = structuredClone(projectData(project))
  const entry = project.manifest.entryPoints.find((e) => e.id === project.manifest.defaultEntryId)
  if (!entry) throw new Error('loader fixture lost its default entry')
  const world = buildWorld(entry.startWorld, project.actorsById)
  const effects: RuntimeLeafCommand[] = []
  const state: {
    scene: RuntimeSceneDef | undefined
    busy: boolean
    runner: boolean
    dialog: boolean
    motion: DebugMotionSnapshot
  } = {
    scene: project.entryScene,
    busy: false,
    runner: false,
    dialog: false,
    motion: {
      scene: 'a',
      worldTick: 1,
      player: {
        id: 'hero',
        template: 'hero',
        pos: { col: 2, row: 2, height: 0 },
        facing: 'down',
        walking: false,
        authority: { kind: 'world' },
        authorityEpoch: 0,
      },
      followers: [],
      extraFollowers: [],
      entities: [],
      pendingTouch: false,
      pendingChase: [],
      hostileBusy: false,
      runnerActive: false,
    },
  }
  const runtime = new ScriptProjectRuntime(project, world, 'a'.repeat(64), {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([project.entryScene]),
    executeEffect: async (c, _context, signal) => {
      effects.push(structuredClone(c))
      if (c.kind === 'wait') await options.wait?.(c.ms, signal)
    },
    scene: () => project.entryScene,
    currentSceneId: () => 'a',
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => false,
      money: () => world.money,
      inParty: (id) => world.party.some((c) => c.template === id),
      entityInScene: () => true,
      facingEntity: () => false,
    },
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: options.wait ?? (async () => {}),
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
  })
  const signals: AbortSignal[] = [],
    operations: Promise<unknown>[] = []
  const startBattle = vi.fn<DebugToolsContext['startBattleDev']>(async () => 'victory')
  const buildPreset = vi.fn<DebugToolsContext['buildPresetParty']>((party, seedStats) => {
    const w = buildWorld({ party, seedStats, money: 0, inventory: [] }, project.actorsById)
    return { party: w.party, learnedSkills: w.learnedSkills }
  })
  const setParty = vi.fn<DebugToolsContext['setParty']>()
  const grantSkill = vi.fn<DebugToolsContext['grantSkill']>()
  const requestStep = vi.fn(),
    reset = vi.fn()
  const ctx: DebugToolsContext = {
    world: () => world,
    motionState: () => structuredClone(state.motion),
    sceneId: () => 'a',
    scene: () => state.scene,
    canonicalProject: project,
    runtime: () => runtime,
    runnerBusy: () => state.runner,
    dialogBusy: () => state.dialog,
    presentationBusy: () => state.busy,
    runDetached(signal, invoke) {
      signals.push(signal)
      const pending = Promise.resolve().then(() => {
        signal.throwIfAborted()
        return invoke(runtime, signal)
      })
      operations.push(pending)
      return pending
    },
    startBattleDev: startBattle,
    buildPresetParty: buildPreset,
    setParty,
    grantSkill,
    frameStep: {
      active: false,
      setActive(active) {
        this.active = active
      },
      requestStep,
      reset,
    },
    layers: { collision: false, triggers: true },
    showToast: vi.fn(),
  }
  const dispose = installDebugTools(ctx)
  disposers.push(dispose)
  return {
    ctx,
    project,
    projectBefore,
    world,
    runtime,
    effects,
    state,
    signals,
    operations,
    startBattle,
    buildPreset,
    setParty,
    grantSkill,
    requestStep,
    reset,
    dispose,
    async settle() {
      await Promise.allSettled(operations)
      await drain()
    },
  }
}
