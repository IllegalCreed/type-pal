/**
 * SAVE-PREFLIGHT-1 真实调用链回归（先红后绿）。
 *
 * 通过 AST 抽出 main.ts 的原函数体（doLoad/quickLoad/restorePayload/prepare/commit 等），
 * 只替换场景/资产 I/O、canvas 与自动脚本边界——与只读审计探针
 * docs/ops/audits/pre-e2e/probe-reforge-restore.mjs 同一技术；探针保持历史证据不动，
 * 本文件断言修复后的正确行为，替代其发布门禁角色。
 *
 * 返工轮（R1–R4）新增：三阶段旧失败提示不覆盖新成功（读/normalize/prepare）、
 * 稀疏 inventory 在链路层被拒、toast 短文案限长。
 */

import * as content from '@type-pal/content'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'
import { clearRestoredWorldActorConditions } from '../actor-condition-lifecycle.js'
import { AsyncIntentController, asyncIntentAbortError } from '../async-intent.js'
import { collectSceneSoundAssets } from '../audio/sfx-readiness.js'
import { expectDefined } from '../defined.js'
import { seedFormationTrail } from '../follower.js'
import mainSource from '../main.ts?raw'
import { Canvas2DRenderer } from '../render.js'
import { projectedWorldScriptScratch, refreshSceneViewBindings } from '../runtime-project-view.js'
import {
  assertSceneSwitchDependenciesCurrent,
  captureSceneSwitchDependencies,
} from '../scene-switch-transaction.js'
import { resolveSceneSpawn } from '../scene-transition.js'
import { normalizeCurrentSave, preflightCurrentSave } from './current-codec.js'
import { CurrentSaveStructureError } from './current-structure.js'
import { buildCurrentSavePayload, resolveRestoredMusic } from './ops.js'
import { MemorySaveStore } from './store.js'

const source = mainSource
const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const names = new Set([
  'isAbortError',
  'assertRunnerActive',
  'awaitRunner',
  'replaceCanonicalScript',
  'syncRuntimeScriptScratch',
  'replaceWorld',
  'requireSpriteDef',
  'prepareSceneSounds',
  'runnableStages',
  'sceneScriptBinding',
  'bindingSceneEntry',
  'prepareSceneSwitch',
  'assertSceneSwitchPlanCurrent',
  'commitSceneSwitch',
  'switchScene',
  'abortScript',
  'currentWorldSnapshot',
  'captureCurrentSavePayload',
  'payloadBelongsToProject',
  'normalizeStoredPayload',
  'restorePayload',
  'doLoad',
  'quickLoad',
  'syncAmbience',
  'refreshCurrentCanonicalBindings',
  'applyWorldEntityGatesToScene',
  'applyWorldEntityPositionToScene',
  'applyWorldToScene',
])
const found = new Map<string, string>()
function walk(node: ts.Node): void {
  if (
    (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
    node.name &&
    ts.isIdentifier(node.name) &&
    names.has(node.name.text)
  ) {
    if (found.has(node.name.text)) throw new Error(`ambiguous original function ${node.name.text}`)
    found.set(
      node.name.text,
      ts.isFunctionDeclaration(node) ? node.getText(ast) : `const ${node.getText(ast)};`,
    )
  }
  ts.forEachChild(node, walk)
}
walk(ast)
for (const name of names) {
  if (!found.has(name)) throw new Error(`missing original function ${name}`)
}
const body = ts.transpileModule([...found.values()].join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText
const factory = new Function(
  'env',
  `with(env) { ${body}; return {doLoad, quickLoad, restorePayload, replaceWorld, captureCurrentSavePayload, switchScene}; }`,
)

const actor = {
  id: 'hero',
  name: 'name.hero',
  spriteId: 'sprite.hero',
  battler: {
    baseStats: {
      level: 1,
      hp: 10,
      maxHP: 10,
      mp: 5,
      maxMP: 5,
      attack: 1,
      defense: 1,
      magicAttack: 1,
      speed: 1,
      luck: 1,
    },
    initialEquipment: {},
    initialMagic: [],
    battleSprite: 'battle.hero',
  },
}

const makeWorld = () =>
  content.buildWorld({ party: ['hero'], money: 100, inventory: [] }, { hero: actor })
type Payload = ReturnType<typeof makePayload>
const makePayload = () => ({
  version: 8 as const,
  contentVersion: 20 as const,
  projectId: 'audit',
  world: makeWorld(),
  position: { sceneId: 'saved-scene', pos: { col: 2, row: 3, height: 0 }, facing: 'down' as const },
})
const sceneDef = (id: string) => ({
  id,
  mapId: `map.${id}`,
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
  entities: [],
})

function harness(raw: unknown, overrides: Record<string, unknown> = {}) {
  const events: string[] = []
  const toasts: string[] = []
  const oldAbort = new AbortController()
  const world = makeWorld()
  ;(world.script as { flags: Record<string, unknown> }).flags.live = true
  const canonicalScript = world.script
  const project = {
    manifest: { id: 'audit', name: 'audit', contentVersion: 20, minimumSaveVersion: 8 },
    actorsById: { hero: actor },
    spritesById: { 'sprite.hero': { id: 'sprite.hero', asset: 'sprite.asset' } },
    items: {},
    ambiences: [],
    assetResolver: {},
    sharedScripts: {},
    sceneIds: ['saved-scene'],
  }
  const cache = new Map([
    ['saved-scene', sceneDef('saved-scene')],
    ['new-scene', sceneDef('new-scene')],
    ['old-save', sceneDef('old-save')],
    ['new-save', sceneDef('new-save')],
  ])
  const empty = () => {}
  const env: Record<string, unknown> = {
    ...content,
    normalizeCurrentSave,
    preflightCurrentSave,
    CurrentSaveStructureError,
    buildCurrentSavePayload,
    resolveRestoredMusic,
    AsyncIntentController,
    asyncIntentAbortError,
    captureSceneSwitchDependencies,
    assertSceneSwitchDependenciesCurrent,
    resolveSceneSpawn,
    clearRestoredWorldActorConditions,
    projectedWorldScriptScratch,
    refreshSceneViewBindings,
    seedFormationTrail,
    Canvas2DRenderer,
    collectSceneSoundAssets,
    expectDefined,
    project,
    inputProject: project,
    canonicalProject: project,
    world,
    canonicalScript,
    scene: sceneDef('live-scene'),
    runtimeScript: projectedWorldScriptScratch(canonicalScript!, 'live-scene'),
    actorSpriteOverrides: new Map(),
    worldMutationIntent: new AsyncIntentController(),
    sceneSwitchIntent: new AsyncIntentController(),
    loadIntent: new AsyncIntentController(),
    battleLaunchIntent: new AsyncIntentController(),
    saveStore: { getPayload: async () => structuredClone(raw) },
    getLifecycleReferences: async () =>
      content.buildEntityLifecycleReferenceIndex([{ id: 'saved-scene', entities: [] }]),
    getSceneDef: async (id: string) => {
      events.push(`prepare:${id}`)
      if (!cache.has(id)) cache.set(id, sceneDef(id))
      return structuredClone(cache.get(id))
    },
    getCanonicalScene: async (id: string) => cache.get(id),
    canonicalSceneCache: cache,
    getMapAssets: async () => ({ map: { width: 10, height: 10 }, tilesets: new Map() }),
    getStandardPalette: async () => ({ colors: [] }),
    spriteCache: {
      load: async () => ({ frames: [] }),
      get: () => ({ frames: [] }),
      prune: () => events.push('prune'),
    },
    sfx: { prepare: async () => {} },
    bgm: { stop: () => events.push('bgm-stop'), play: () => events.push('bgm-play') },
    ctx: {},
    console: { warn: () => {} },
    showToast: (text: string) => toasts.push(text),
    entityStaticBaseline: new Map(),
    entityActions: { replaceScene: empty },
    map: null,
    tiles: null,
    palette: null,
    renderer: null,
    waveRenderer: null,
    entitySpriteDefs: new Map(),
    room: null,
    viewMinX: 0,
    viewMinY: 0,
    viewMaxX: 0,
    viewMaxY: 0,
    TILE_W: 32,
    TILE_H: 16,
    player: { pos: { col: 0, row: 0, height: 0 } },
    facing: 'down',
    partyLayer: 0,
    walking: false,
    stepFrame: 0,
    trail: [],
    followerFrozen: [],
    followerPos: [],
    followerAuth: new Map(),
    worldMoveAcc: 0,
    updateCamera: () => events.push('camera'),
    resetFrameAnimationPresentation: empty,
    ambienceShown: null,
    ambienceFx: null,
    invalidatePendingScriptMutations: () => events.push('invalidate-script'),
    activeBattle: null,
    scriptAbort: oldAbort,
    itemUseAbort: null,
    runner: { running: true },
    runnerTriggerOwnerId: null,
    inlineTriggerOwners: new Map(),
    pendingOnEnter: null,
    pendingTouchTrigger: { clear: empty },
    preserveClosedDialogFrame: false,
    scriptConfirmModal: { cancelAll: empty },
    resumeScriptExecutionGates: empty,
    presentation: { cancelAll: empty },
    dismountParty: empty,
    releaseAllAuthority: empty,
    timers: [],
    screenHold: { cancel: empty },
    ditherTransition: { cancel: empty },
    sceneEntrySession: { cancel: empty },
    entityFrameOverride: new Map(),
    partyGesture: null,
    partyMove: null,
    stopAutoRunners: () => events.push('stop-auto'),
    startAutoRunners: () => events.push('start-auto'),
    ...overrides,
  }
  return { env, api: factory(env), oldAbort, events, toasts }
}

function corrupted(mutate: (p: Payload) => void): unknown {
  const raw = makePayload()
  ;(raw.world.script as { flags: Record<string, unknown> }).flags.saved = true
  mutate(raw)
  return raw
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function savedFlag(env: Record<string, unknown>): unknown {
  return (env.world as { script?: { flags: Record<string, unknown> } }).script?.flags.saved
}

describe('SAVE-PREFLIGHT-1 真实调用链（AST 抽取 main.ts 原函数体）', () => {
  test('合法载荷：loaded、世界替换、完整提交事件序列', async () => {
    const h = harness(corrupted(() => {}))
    const result = await h.api.doLoad('quick')
    expect(result).toBe('loaded')
    expect(savedFlag(h.env)).toBe(true)
    expect(h.events).toEqual([
      'prepare:saved-scene',
      'invalidate-script',
      'stop-auto',
      'prune',
      'camera',
      'bgm-stop',
      'start-auto',
    ])
  })

  test.each([
    [
      'money=字符串',
      (p: Payload) => {
        p.world.money = 'not-money' as unknown as number
      },
      /money/,
    ],
    [
      'party=null',
      (p: Payload) => {
        p.world.party = null as unknown as Payload['world']['party']
      },
      /party|队伍/,
    ],
    [
      'position=null',
      (p: Payload) => {
        p.position = null as unknown as Payload['position']
      },
      /position/,
    ],
    [
      'facing=sideways',
      (p: Payload) => {
        p.position.facing = 'sideways' as unknown as 'down'
      },
      /facing|朝向|存档损坏/,
    ],
    [
      'R3：inventory 稀疏空洞（new Array(1)）',
      (p: Payload) => {
        p.world.inventory = new Array(1) as unknown as Payload['world']['inventory']
      },
      /inventory|存档损坏/,
    ],
  ])('坏载荷 %s：提交前拒绝、稳定文案、零活动态污染', async (_name, mutate, messagePattern) => {
    const h = harness(corrupted(mutate))
    const result = await h.api.doLoad('quick')
    expect(result).toBe('rejected')
    expect(h.toasts.length).toBeGreaterThan(0)
    expect(h.toasts[h.toasts.length - 1]).toMatch(messagePattern)
    // 不得以引擎原文充当稳定文案
    expect(h.toasts[h.toasts.length - 1]).not.toMatch(/Cannot read properties|TypeError/)
    expect(h.oldAbort.signal.aborted).toBe(false)
    expect(savedFlag(h.env)).toBeUndefined()
    expect((h.env.scene as { id: string }).id).toBe('live-scene')
    expect(h.events).not.toContain('stop-auto')
    expect(h.events).not.toContain('invalidate-script')
  })

  test('R3 链路层：稀疏 inventory 拒绝后世界保持旧态，合法 shopBuy 仍正常', async () => {
    const h = harness(
      corrupted((p) => {
        p.world.inventory = new Array(1) as unknown as Payload['world']['inventory']
      }),
    )
    expect(await h.api.doLoad('quick')).toBe('rejected')
    expect(savedFlag(h.env)).toBeUndefined()
    const bought = content.shopBuy(h.env.world as never, 'herb', {
      herb: { id: 'herb', name: 'herb', desc: [], buyPrice: 10, sellPrice: 5, sellable: true },
    } as never)
    expect(bought && Number.isFinite(bought.money)).toBe(true)
  })

  test('R4：结构错误的 toast 为限长短文案（≤30 字符、不含长路径）', async () => {
    const h = harness(
      corrupted((p) => {
        p.world.party[0]!.hiddenExp = { luck: { exp: Number.NaN, level: 1 } } as never
      }),
    )
    expect(await h.api.doLoad('quick')).toBe('rejected')
    const toast = h.toasts[h.toasts.length - 1]!
    expect(toast).toMatch(/^存档损坏：/)
    expect(toast.length).toBeLessThanOrEqual(30)
    expect(toast).not.toContain('载荷')
    expect(toast).not.toContain('party[0]')
  })

  test('position=null 不再暴露裸 TypeError 文案（探针历史记录的稳定化）', async () => {
    const h = harness(
      corrupted((p) => {
        p.position = null as unknown as Payload['position']
      }),
    )
    expect(await h.api.doLoad('quick')).toBe('rejected')
    expect(h.toasts[h.toasts.length - 1]).not.toMatch(/reading 'sceneId'/)
  })

  test('空数组队伍：保留「队伍为空」具体提示，quickLoad 不得用「无快速存档」覆盖', async () => {
    const h = harness(
      corrupted((p) => {
        p.world.party = []
      }),
    )
    await h.api.quickLoad()
    // 现行文案带槽前缀（restorePayload 的 `${where}: 存档队伍为空`）；关键是不被「无快速存档」覆盖。
    expect(h.toasts).toEqual(['存档槽 quick: 存档队伍为空'])
  })

  test('F9 形态（void quickLoad()）坏槽：quickLoad 不 reject、稳定提示可见', async () => {
    const h = harness(
      corrupted((p) => {
        p.world.party = null as unknown as Payload['world']['party']
      }),
    )
    // 若 doLoad/quickLoad 抛错，此处 await 会 reject——等价于 F9 dispatch 的 unhandledRejection。
    await expect(h.api.quickLoad()).resolves.toBeUndefined()
    expect(h.toasts.length).toBeGreaterThan(0)
    expect(h.toasts[h.toasts.length - 1]).not.toMatch(/Cannot read properties/)
  })

  test('较新读档胜出：旧请求静默让位，最终世界/场景为新载荷', async () => {
    const h = harness(null)
    const entered = deferred<void>()
    const gate = deferred<void>()
    ;(h.env.saveStore as { getPayload: (slot: string) => Promise<unknown> }).getPayload = async (
      slot,
    ) => {
      const p = makePayload()
      ;(p.world.script as { flags: Record<string, unknown> }).flags.saved = true
      p.position.sceneId = slot === 'old' ? 'old-save' : 'new-save'
      p.world.money = slot === 'old' ? 111 : 222
      return p
    }
    ;(h.env.getMapAssets as (id: string) => Promise<unknown>) = async (id) => {
      if (id === 'map.old-save') {
        entered.resolve()
        await gate.promise
      }
      return { map: { width: 10, height: 10 }, tilesets: new Map() }
    }
    const old = h.api.doLoad('old')
    await entered.promise
    const newer = await h.api.doLoad('new')
    gate.resolve()
    expect(await old).toBe('rejected')
    expect(newer).toBe('loaded')
    expect((h.env.world as { money: number }).money).toBe(222)
    expect((h.env.scene as { id: string }).id).toBe('new-save')
  })

  describe('R2：旧失败提示不覆盖新成功（读 / normalize / prepare 三阶段）', () => {
    async function lateFailureHarness(
      phase: 'read' | 'normalize' | 'prepare',
    ): Promise<{ toasts: string[]; newResult: unknown; oldResult: unknown }> {
      const h = harness(null)
      const gate = deferred<void>()
      // 新请求走 quickLoad（只有它对 loaded 显示「已读取快速存档」成功提示），槽位固定为 'quick'。
      if (phase === 'read') {
        ;(h.env.saveStore as { getPayload: (slot: string) => Promise<unknown> }).getPayload =
          async (slot) => {
            if (slot === 'old') {
              await gate.promise
              throw new Error('late-read-failure')
            }
            const p = makePayload()
            ;(p.world.script as { flags: Record<string, unknown> }).flags.saved = true
            p.world.money = 222
            return p
          }
      } else if (phase === 'normalize') {
        ;(h.env.saveStore as { getPayload: (slot: string) => Promise<unknown> }).getPayload =
          async (slot) => {
            if (slot === 'old') {
              await gate.promise
              const bad = makePayload()
              ;(bad.world.script as { flags: Record<string, unknown> }).flags.saved = true
              bad.world.money = 'late-normalize-failure' as unknown as number
              return bad
            }
            const p = makePayload()
            ;(p.world.script as { flags: Record<string, unknown> }).flags.saved = true
            p.world.money = 222
            return p
          }
      } else {
        // prepare 阶段：old 的 getMapAssets 挂起，等 new 完成后再抛场景错误。
        ;(h.env.saveStore as { getPayload: (slot: string) => Promise<unknown> }).getPayload =
          async (slot) => {
            const p = makePayload()
            ;(p.world.script as { flags: Record<string, unknown> }).flags.saved = true
            p.position.sceneId = slot === 'old' ? 'old-save' : 'new-save'
            p.world.money = slot === 'old' ? 111 : 222
            return p
          }
        let firstOld = true
        ;(h.env.getMapAssets as (id: string) => Promise<unknown>) = async (id) => {
          if (id === 'map.old-save' && firstOld) {
            firstOld = false
            await gate.promise
            throw new Error('late-prepare-failure')
          }
          return { map: { width: 10, height: 10 }, tilesets: new Map() }
        }
      }
      const old = h.api.doLoad('old')
      if (phase === 'prepare') {
        // 等 old 进入 prepare（其 getMapAssets 被调用）再启动 new
        await new Promise((resolve) => setTimeout(resolve, 30))
      }
      const newer = await h.api.quickLoad()
      gate.resolve()
      const oldResult = await old
      return { toasts: h.toasts, newResult: newer, oldResult }
    }

    test('旧读取失败（晚到）不覆盖新成功提示', async () => {
      const { toasts, newResult, oldResult } = await lateFailureHarness('read')
      expect(newResult).toBeUndefined()
      expect(oldResult).toBe('rejected')
      expect(toasts).toEqual(['已读取快速存档'])
    })

    test('旧 normalize 失败（晚到）不覆盖新成功提示', async () => {
      const { toasts, newResult, oldResult } = await lateFailureHarness('normalize')
      expect(newResult).toBeUndefined()
      expect(oldResult).toBe('rejected')
      expect(toasts).toEqual(['已读取快速存档'])
    })

    test('旧 prepare 失败（晚到）不覆盖新成功提示', async () => {
      const { toasts, newResult, oldResult } = await lateFailureHarness('prepare')
      expect(newResult).toBeUndefined()
      expect(oldResult).toBe('rejected')
      expect(toasts).toEqual(['已读取快速存档'])
    })
  })

  test('prepare 中调用方取消：AbortError 上抛、live 世界与旧脚本保留', async () => {
    const h = harness(corrupted(() => {}))
    const entered = deferred<void>()
    const gate = deferred<void>()
    const controller = new AbortController()
    ;(h.env.getMapAssets as (id: string) => Promise<unknown>) = async () => {
      entered.resolve()
      await gate.promise
      return { map: { width: 10, height: 10 }, tilesets: new Map() }
    }
    const loading = h.api.doLoad('quick', controller.signal).then(
      (value: unknown) => ({ value }),
      (error: Error) => ({ name: error.name }),
    )
    await entered.promise
    controller.abort()
    gate.resolve()
    const result = await loading
    expect(result).toEqual({ name: 'AbortError' })
    const liveWorld = h.env.world as { script?: { flags: Record<string, unknown> } }
    expect(liveWorld.script?.flags.live).toBe(true)
    expect(h.oldAbort.signal.aborted).toBe(false)
  })

  test('合法载荷带有限分数坐标：guard 不取整、不移动输入坐标', async () => {
    const raw = corrupted(() => {}) as Payload
    raw.position.pos = { col: 3.25, row: -1.5, height: 0 }
    const h = harness(raw)
    expect(await h.api.doLoad('quick')).toBe('loaded')
    const player = h.env.player as { pos: { col: number } }
    expect(player.pos.col).toBe(3.25)
  })

  test('读档后真实 shopBuy 不再得到 NaN（B-04 money 污染链闭合）', async () => {
    const h = harness(corrupted(() => {}))
    expect(await h.api.doLoad('quick')).toBe('loaded')
    const bought = content.shopBuy(h.env.world as never, 'herb', {
      herb: {
        id: 'herb',
        name: 'herb',
        desc: [],
        buyPrice: 10,
        sellPrice: 5,
        sellable: true,
      },
    } as never)
    expect(bought && Number.isFinite(bought.money)).toBe(true)
  })
})

// 与探针一致的边界集合引用（保持 harness 环境完整性）。
void MemorySaveStore
void buildCurrentSavePayload
