/**
 * EDITOR-HISTORY-ORDER-1 · glm-editor-history-workflows r1 · P01–P20 配对工作流正式回归。
 *
 * GLM冻结树取证经Codex适配：直接使用当前项目历史Owner，保留20项编号。
 * 真实 EditSession/ScriptEditSession/EditorHistoryCoordinator/命令与正式 loader/序列化；
 * fixture 内置本文件（blank seed + 内存源），不 mock 协调器/会话/身份策略。
 */

import {
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadProjectMap,
} from '@type-pal/reforge'
import { expect, test, vi } from 'vitest'
import rootSource from '../main.tsx?raw'
import appSource from '../ui/App.tsx?raw'
import itemSource from '../ui/ItemTab.tsx?raw'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import {
  AddEntityCommand,
  AddSceneCommand,
  DeleteEntityCommand,
  DeleteSceneCommand,
  DuplicateSceneCommand,
  UpdateItemCommand,
} from './commands.js'
import { type Command, EditSession } from './edit-session.js'
import { EditorHistoryCoordinator } from './editor-history-coordinator.js'
import { createCanonicalPlacedEntity, createPlacedEntity } from './entity-placement.js'
import { serializeProjectWithMapCopies, toEditorState } from './project-io.js'
import {
  collectCurrentProjectReferenceIndex,
  createCurrentProjectReferenceIndexProvider,
} from './project-reference-adapters.js'
import {
  AddItemPrivateScriptCommand,
  AddSceneDefinitionCommand,
  AddSceneEntityDefinitionCommand,
  DeleteItemPrivateScriptCommand,
  DeleteSceneDefinitionCommand,
  DeleteSceneEntityDefinitionCommand,
  DuplicateSceneDefinitionCommand,
  ScriptEditSession,
  SetItemPrivateScriptBodyCommand,
} from './script-editor.js'
import { mergeEditorProjectionWithCurrentAuthorState } from './script-editor-projection.js'
import { buildBlankProject } from './seed.js'

// ───────── 共用 fixture/harness ─────────

const WAIT = (): { kind: 'wait'; ms: number }[] => [{ kind: 'wait', ms: 1 }]

async function blankRig() {
  const files = await buildBlankProject('glm-paired-wf')
  files['content/items.json'] = [
    {
      id: 'glm-item',
      name: '配对工作流物品',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: { target: 'scene', consuming: true, effects: [] },
    },
  ]
  const get = (rel: string) => {
    if (!Object.hasOwn(files, rel)) throw new DOMException(rel, 'NotFoundError')
    return files[rel]
  }
  const source = {
    async readText(rel: string) {
      const x = get(rel)
      return typeof x === 'string' ? x : JSON.stringify(x)
    },
    async readJson(rel: string) {
      return JSON.parse(await this.readText(rel))
    },
    async readBytes(rel: string) {
      const x = get(rel)
      return x instanceof ArrayBuffer
        ? x.slice(0)
        : new TextEncoder().encode(typeof x === 'string' ? x : JSON.stringify(x)).buffer
    },
    async urlFor() {
      throw new Error('Memory fixture forbids external URLs')
    },
  }
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const main = new EditSession(toEditorState(project, scenes, {}, {}, []), {
    loadMap: (_mapId, path) => loadProjectMap(project.assetBase, path),
  })
  const script = new ScriptEditSession({
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  })
  const coordinator = new EditorHistoryCoordinator(main, script)
  return { files, source, main, script, coordinator }
}

type Rig = Awaited<ReturnType<typeof blankRig>>

/** 双侧完整状态快照：场景/实体/物品私有脚本 + dirty/undo 旗标。 */
function snap(main: EditSession, script: ScriptEditSession) {
  return {
    mainState: main.getState(),
    scriptState: script.getState(),
    mainRedo: main.canRedo(),
    scriptRedo: script.canRedo(),
    versions: [
      main.getVersion(),
      script.getVersion(),
      main.getHistoryVersion(),
      script.getHistoryVersion(),
    ],
    sceneIds: main
      .getState()
      .sceneIndex.scenes.map((a) => a.id)
      .sort(),
    canonicalSceneIds: script
      .getState()
      .scenes.map((s) => s.id)
      .sort(),
    entityIds: main
      .getState()
      .scenes.flatMap((s) => s.entities.map((e) => `${s.id}/${e.id}`))
      .sort(),
    canonicalEntityIds: script
      .getState()
      .scenes.flatMap((s) => s.entities.map((e) => `${s.id}/${e.id}`))
      .sort(),
    privateScripts: script
      .getState()
      .items.flatMap((i) =>
        (i.use?.effects ?? [])
          .filter((e) => e.kind === 'itemPrivateScript')
          .map(() => `${i.id}:use`),
      )
      .sort(),
    itemUseEffects: main
      .getState()
      .items.map((i) => `${i.id}:${i.use?.effects?.length ?? 0}`)
      .sort(),
    mainDirty: main.isDirty(),
    scriptDirty: script.isDirty(),
    mainUndo: main.canUndo(),
    scriptUndo: script.canUndo(),
  }
}

/** 内容层快照：undo 保守保留 dirty 是已确立行为，不纳入内容恢复断言。 */
function content(s: ReturnType<typeof snap>) {
  const {
    mainDirty: _m,
    scriptDirty: _s,
    mainUndo: _u,
    scriptUndo: _r,
    mainRedo: _mr,
    scriptRedo: _sr,
    versions: _v,
    ...rest
  } = s
  return rest
}

/** 以 ItemTab 真实 caller 组合建立 use 私有脚本（正文编辑类用例的前置）。 */
function seedPrivate(rig: Rig, itemId: string) {
  const cur = rig.main.getState().items.find((i) => i.id === itemId)!
  rig.coordinator.dispatch(
    new AddItemPrivateScriptCommand(itemId, '使用脚本'),
    new UpdateItemCommand(itemId, {
      use: {
        ...cur.use!,
        effects: [
          ...cur.use!.effects,
          {
            kind: 'runScript' as const,
            script: { chunk: '__author-item-private-runtime', id: itemId },
          },
        ],
      },
    }),
  )
}

/** 保存合并 + 序列化合法性见证（不写盘）。 */
async function saveLegal(rig: Awaited<ReturnType<typeof blankRig>>) {
  const merged = mergeEditorProjectionWithCurrentAuthorState(
    rig.script.getState(),
    rig.main.getState(),
  )
  await serializeProjectWithMapCopies(merged, rig.source)
  return merged
}

/** P01-P07 通用配对验收：成功 → 一次 undo 双侧内容恢复 → redo → 保存合法。 */
async function expectPairedRoundTrip(
  label: string,
  rig: Rig,
  run: () => { main: Command; script: Parameters<EditorHistoryCoordinator['dispatch']>[0] },
  delta: (before: ReturnType<typeof snap>) => Record<string, unknown>,
) {
  const before = snap(rig.main, rig.script)
  const pair = run()
  rig.coordinator.dispatch(pair.script, pair.main)
  const after = snap(rig.main, rig.script)
  expect(after, `${label}: 成功后双侧同步变化`).toMatchObject(delta(before))
  await expect(saveLegal(rig), `${label}: 保存合法`).resolves.toBeTruthy()
  rig.coordinator.undo()
  expect(content(snap(rig.main, rig.script)), `${label}: 一次 undo 双侧内容恢复`).toEqual(
    content(before),
  )
  rig.coordinator.redo()
  expect(content(snap(rig.main, rig.script)), `${label}: 一次 redo 双侧内容恢复`).toEqual(
    content(after),
  )
}

const bodyOf = (script: ScriptEditSession, itemId: string) => {
  const effect = script
    .getState()
    .items.find((i) => i.id === itemId)!
    .use?.effects.find((e) => e.kind === 'itemPrivateScript')
  return effect?.kind === 'itemPrivateScript' ? effect.script.body : null
}

// ───────── P01–P07 七类真实配对 ─────────

test('P01 配对新建场景：成功/undo/redo 双侧同步 + 保存合法', async () => {
  const rig = await blankRig()
  const blank = structuredClone(rig.script.getState().scenes[0]!)
  blank.id = 'wf-scene-new'
  blank.entities = []
  const dir = rig.main.getState().manifest.content.scenes?.replace(/\/?$/, '/') ?? 'content/scenes/'
  await expectPairedRoundTrip(
    'P01',
    rig,
    () => ({
      script: new AddSceneDefinitionCommand(blank),
      main: new AddSceneCommand(
        { id: 'wf-scene-new', name: 'WF新建', path: `${dir}wf-scene-new.json` },
        blank as never,
      ),
    }),
    (b) => ({
      sceneIds: [...b.sceneIds, 'wf-scene-new'].sort(),
      canonicalSceneIds: [...b.canonicalSceneIds, 'wf-scene-new'].sort(),
    }),
  )
})

test('P02 配对复制场景：成功/undo/redo 双侧同步 + 保存合法', async () => {
  const rig = await blankRig()
  const sourceId = rig.main.getState().sceneIndex.scenes[0]!.id
  const dir = rig.main.getState().manifest.content.scenes?.replace(/\/?$/, '/') ?? 'content/scenes/'
  await expectPairedRoundTrip(
    'P02',
    rig,
    () => ({
      script: new DuplicateSceneDefinitionCommand(sourceId, 'wf-scene-copy'),
      main: new DuplicateSceneCommand(sourceId, {
        id: 'wf-scene-copy',
        name: 'WF复制',
        path: `${dir}wf-scene-copy.json`,
      }),
    }),
    (b) => ({
      sceneIds: [...b.sceneIds, 'wf-scene-copy'].sort(),
      canonicalSceneIds: [...b.canonicalSceneIds, 'wf-scene-copy'].sort(),
    }),
  )
})

test('P03 配对删除场景：成功/undo/redo 双侧同步 + 保存合法', async () => {
  const rig = await blankRig()
  const blank = structuredClone(rig.script.getState().scenes[0]!)
  blank.id = 'wf-scene-del'
  blank.entities = []
  const dir = rig.main.getState().manifest.content.scenes?.replace(/\/?$/, '/') ?? 'content/scenes/'
  rig.coordinator.dispatch(
    new AddSceneDefinitionCommand(blank),
    new AddSceneCommand(
      { id: 'wf-scene-del', name: '待删', path: `${dir}wf-scene-del.json` },
      blank as never,
    ),
  )
  const before = snap(rig.main, rig.script)
  const mainState = () => rig.main.getState()
  rig.coordinator.dispatch(
    new DeleteSceneDefinitionCommand('wf-scene-del', (next) =>
      collectCurrentProjectReferenceIndex(mainState(), next),
    ),
    new DeleteSceneCommand(
      'wf-scene-del',
      createCurrentProjectReferenceIndexProvider(() => rig.script.getStateSnapshot()),
    ),
  )
  expect(snap(rig.main, rig.script).sceneIds).not.toContain('wf-scene-del')
  await expect(saveLegal(rig)).resolves.toBeTruthy()
  rig.coordinator.undo()
  expect(content(snap(rig.main, rig.script)), 'P03: undo 双侧内容恢复').toEqual(content(before))
  rig.coordinator.redo()
  expect(snap(rig.main, rig.script).sceneIds).not.toContain('wf-scene-del')
})

test('P04 配对新增实体：成功/undo/redo 双侧同步 + 保存合法', async () => {
  const rig = await blankRig()
  const sceneId = rig.main.getState().sceneIndex.scenes[0]!.id
  const pos = { col: 3, row: 4, height: 0 }
  const placement = { mode: 'interact-zone', range: 1 } as const
  const canonical = createCanonicalPlacedEntity('wf-entity', pos, placement)
  const runtime = createPlacedEntity('wf-entity', pos, placement)
  await expectPairedRoundTrip(
    'P04',
    rig,
    () => ({
      script: new AddSceneEntityDefinitionCommand(sceneId, canonical),
      main: new AddEntityCommand(sceneId, runtime),
    }),
    (b) => ({
      entityIds: [...b.entityIds, `${sceneId}/wf-entity`].sort(),
      canonicalEntityIds: [...b.canonicalEntityIds, `${sceneId}/wf-entity`].sort(),
    }),
  )
})

test('P05 配对删除实体：成功/undo/redo 双侧同步 + 保存合法', async () => {
  const rig = await blankRig()
  const sceneId = rig.main.getState().sceneIndex.scenes[0]!.id
  const pos = { col: 1, row: 1, height: 0 }
  const placement = { mode: 'interact-zone', range: 1 } as const
  const canonical = createCanonicalPlacedEntity('wf-entity-del', pos, placement)
  const runtime = createPlacedEntity('wf-entity-del', pos, placement)
  rig.coordinator.dispatch(
    new AddSceneEntityDefinitionCommand(sceneId, canonical),
    new AddEntityCommand(sceneId, runtime),
  )
  const before = snap(rig.main, rig.script)
  const provider = createCurrentProjectReferenceIndexProvider(() => rig.script.getStateSnapshot())
  rig.coordinator.dispatch(
    new DeleteSceneEntityDefinitionCommand(sceneId, 'wf-entity-del'),
    new DeleteEntityCommand(sceneId, 'wf-entity-del', provider),
  )
  expect(snap(rig.main, rig.script).entityIds).not.toContain(`${sceneId}/wf-entity-del`)
  await expect(saveLegal(rig)).resolves.toBeTruthy()
  rig.coordinator.undo()
  expect(content(snap(rig.main, rig.script)), 'P05: undo 双侧内容恢复').toEqual(content(before))
  rig.coordinator.redo()
  expect(snap(rig.main, rig.script).entityIds).not.toContain(`${sceneId}/wf-entity-del`)
})

test('P06 配对新增物品私有脚本：成功/undo/redo 双侧同步 + 保存合法', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  await expectPairedRoundTrip(
    'P06',
    rig,
    () => {
      const current = rig.main.getState().items.find((i) => i.id === itemId)!
      return {
        script: new AddItemPrivateScriptCommand(itemId, 'WF使用脚本'),
        main: new UpdateItemCommand(itemId, {
          use: {
            ...current.use!,
            effects: [
              ...current.use!.effects,
              {
                kind: 'runScript' as const,
                script: { chunk: '__author-item-private-runtime', id: itemId },
              },
            ],
          },
        }),
      }
    },
    (b) => ({ privateScripts: [...b.privateScripts, `${itemId}:use`].sort() }),
  )
})

test('P07 配对删除物品私有脚本：成功/undo/redo 双侧同步 + 保存合法', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  seedPrivate(rig, itemId)
  const before = snap(rig.main, rig.script)
  const withScript = rig.main.getState().items.find((i) => i.id === itemId)!
  const next = {
    ...withScript.use!,
    effects: withScript.use!.effects.filter(
      (e) =>
        !(
          e.kind === 'runScript' &&
          e.script.chunk === '__author-item-private-runtime' &&
          e.script.id === itemId
        ),
    ),
  }
  rig.coordinator.dispatch(
    new DeleteItemPrivateScriptCommand(itemId, 'use', 'use'),
    new UpdateItemCommand(itemId, { use: next }),
  )
  expect(snap(rig.main, rig.script).privateScripts).toEqual([])
  await expect(saveLegal(rig)).resolves.toBeTruthy()
  rig.coordinator.undo()
  expect(content(snap(rig.main, rig.script)), 'P07: undo 双侧内容恢复').toEqual(content(before))
  rig.coordinator.redo()
  expect(snap(rig.main, rig.script).privateScripts).toEqual([])
})

// ───────── P08–P11 交错矩阵 ─────────

test('P08 pair→main→script：undo/redo 严格按提交顺序，不得先拆 pair 脚本半边', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  const pair = () => {
    const cur = rig.main.getState().items.find((i) => i.id === itemId)!
    return {
      script: new AddItemPrivateScriptCommand(itemId, 'P08'),
      main: new UpdateItemCommand(itemId, {
        buyPrice: 10,
        use: {
          ...cur.use!,
          effects: [
            ...cur.use!.effects,
            {
              kind: 'runScript' as const,
              script: { chunk: '__author-item-private-runtime', id: itemId },
            },
          ],
        },
      }),
    }
  }
  const p = pair()
  rig.coordinator.dispatch(p.script, p.main)
  rig.main.dispatch(new UpdateItemCommand(itemId, { buyPrice: 20 }))
  rig.script.dispatch(new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, WAIT()))
  const u = () => ({
    price: rig.main.getState().items.find((i) => i.id === itemId)!.buyPrice,
    body: bodyOf(rig.script, itemId),
  })
  const s0 = u()
  rig.coordinator.undo()
  const s1 = u()
  rig.coordinator.undo()
  const s2 = u()
  rig.coordinator.undo()
  const s3 = u()
  expect([s1, s2, s3], 'P08 交错严格逆序').toEqual([
    { price: 20, body: [] },
    { price: 10, body: [] },
    { price: 0, body: null },
  ])
  rig.coordinator.redo()
  rig.coordinator.redo()
  rig.coordinator.redo()
  expect(u(), 'P08 redo 到底恢复全部').toEqual(s0)
})

test('P09 script→main→pair 反向排列：读取完整双侧状态', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  seedPrivate(rig, itemId)
  rig.script.dispatch(new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, WAIT()))
  rig.main.dispatch(new UpdateItemCommand(itemId, { buyPrice: 30 }))
  const pair = () => {
    const cur = rig.main.getState().items.find((i) => i.id === itemId)!
    return {
      script: new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, [
        { kind: 'wait' as const, ms: 2 },
      ]),
      main: new UpdateItemCommand(itemId, { buyPrice: 40, use: cur.use! }),
    }
  }
  const p = pair()
  rig.coordinator.dispatch(p.script, p.main)
  const full = () => ({
    ...content(snap(rig.main, rig.script)),
    price: rig.main.getState().items.find((i) => i.id === itemId)!.buyPrice,
    body: bodyOf(rig.script, itemId),
  })
  const s0 = full()
  rig.coordinator.undo()
  expect(full().price, 'P09 第一次 undo 撤整笔 pair').toBe(30)
  rig.coordinator.undo()
  expect(full().price, 'P09 第二次撤 main30').toBe(0)
  rig.coordinator.undo()
  expect(full(), 'P09 第三次只撤正文，不撤创建私有脚本的前置事务').toMatchObject({
    price: 0,
    body: [],
    privateScripts: [`${itemId}:use`],
  })
  rig.coordinator.redo()
  rig.coordinator.redo()
  rig.coordinator.redo()
  expect(full(), 'P09 redo 到底').toEqual(s0)
})

test('P10 两笔 pair 连续撤销/重做：身份独立、数据不串', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  seedPrivate(rig, itemId)
  const mkPair = (price: number, ms: number) => {
    const cur = rig.main.getState().items.find((i) => i.id === itemId)!
    return {
      script: new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, [
        { kind: 'wait' as const, ms },
      ]),
      main: new UpdateItemCommand(itemId, { buyPrice: price, use: cur.use! }),
    }
  }
  const one = mkPair(11, 1)
  const two = mkPair(22, 2)
  rig.coordinator.dispatch(one.script, one.main)
  rig.coordinator.dispatch(two.script, two.main)
  const u = () => ({
    price: rig.main.getState().items.find((i) => i.id === itemId)!.buyPrice,
    ms: (bodyOf(rig.script, itemId) as { kind: string; ms: number }[] | null)?.[0]?.ms ?? null,
  })
  expect(u()).toEqual({ price: 22, ms: 2 })
  rig.coordinator.undo()
  expect(u(), 'P10 撤第二笔').toEqual({ price: 11, ms: 1 })
  rig.coordinator.undo()
  expect(u(), 'P10 撤第一笔回到空正文的seed状态').toEqual({ price: 0, ms: null })
  rig.coordinator.redo()
  rig.coordinator.redo()
  expect(u(), 'P10 重做到底').toEqual({ price: 22, ms: 2 })
})

test('P11 pair 之间插入普通编辑：撤销到边界/重做到底无内容残留', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  seedPrivate(rig, itemId)
  const mkPair = (price: number) => {
    const cur = rig.main.getState().items.find((i) => i.id === itemId)!
    return {
      script: new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, WAIT()),
      main: new UpdateItemCommand(itemId, { buyPrice: price, use: cur.use! }),
    }
  }
  const a = mkPair(50)
  rig.coordinator.dispatch(a.script, a.main)
  rig.main.dispatch(new UpdateItemCommand(itemId, { buyPrice: 51 }))
  rig.script.dispatch(
    new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, [{ kind: 'wait' as const, ms: 5 }]),
  )
  const b = mkPair(60)
  rig.coordinator.dispatch(b.script, b.main)
  const before = content(snap(rig.main, rig.script))
  for (let i = 0; i < 10; i++) rig.coordinator.undo()
  const bottom = snap(rig.main, rig.script)
  expect(rig.main.getState().items[0]!.buyPrice).toBe(0)
  expect(bottom.mainUndo, 'P11 撤到边界').toBe(false)
  expect(bottom.scriptUndo, 'P11 撤到边界(脚本侧)').toBe(false)
  expect(bodyOf(rig.script, itemId), 'P11 撤到边界后私有脚本内容也回到初始（seed 撤空）').toBeNull()
  for (let i = 0; i < 10; i++) rig.coordinator.redo()
  expect(content(snap(rig.main, rig.script)), 'P11 重做到底恢复全部内容').toEqual(before)
})

// ───────── P12 caller 对账（真实入口，非相似命令名） ─────────

test('P12 七处配对 caller 的实际 Command 组合与顺序逐条对账（源码快照断言）', async () => {
  const app = appSource
  const item = itemSource
  const expectCaller = (src: string, anchor: string, order: [string, string]) => {
    const at = src.indexOf(anchor)
    expect(at, `P12 缺少 caller: ${anchor.slice(0, 40)}`).toBeGreaterThanOrEqual(0)
    const window = src.slice(at, at + 900)
    const i1 = window.indexOf(`new ${order[0]}`)
    const i2 = window.indexOf(`new ${order[1]}`)
    expect(i1, `${order[0]} 应出现在 ${anchor.slice(0, 24)} 处`).toBeGreaterThanOrEqual(0)
    expect(i2, `${order[1]} 应出现在 ${anchor.slice(0, 24)} 处`).toBeGreaterThanOrEqual(0)
    expect(
      i1,
      `脚本侧 ${order[0]} 必须先于主侧 ${order[1]}（dispatch(script, main) 顺序）`,
    ).toBeLessThan(i2)
  }
  expectCaller(app, 'new AddSceneDefinitionCommand(blank)', [
    'AddSceneDefinitionCommand',
    'AddSceneCommand',
  ])
  expectCaller(app, 'new DuplicateSceneDefinitionCommand', [
    'DuplicateSceneDefinitionCommand',
    'DuplicateSceneCommand',
  ])
  expectCaller(app, 'new DeleteSceneDefinitionCommand', [
    'DeleteSceneDefinitionCommand',
    'DeleteSceneCommand',
  ])
  expectCaller(app, 'new AddSceneEntityDefinitionCommand', [
    'AddSceneEntityDefinitionCommand',
    'AddEntityCommand',
  ])
  expectCaller(app, 'new DeleteSceneEntityDefinitionCommand', [
    'DeleteSceneEntityDefinitionCommand',
    'DeleteEntityCommand',
  ])
  expectCaller(item, 'new AddItemPrivateScriptCommand', [
    'AddItemPrivateScriptCommand',
    'UpdateItemCommand',
  ])
  expectCaller(item, 'new DeleteItemPrivateScriptCommand', [
    'DeleteItemPrivateScriptCommand',
    'UpdateItemCommand',
  ])
})

// ───────── P13–P15 分支清 redo / no-op ─────────

test('P13 main 成功新分支清掉 script redo；session.redo 不能复活孤儿', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  seedPrivate(rig, itemId)
  rig.script.dispatch(new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, WAIT()))
  rig.script.undo()
  expect(rig.script.canRedo()).toBe(true)
  rig.main.dispatch(new UpdateItemCommand(itemId, { buyPrice: 99 }))
  const before = snap(rig.main, rig.script)
  expect(rig.script.canRedo()).toBe(false)
  expect(rig.main.canRedo()).toBe(false)
  expect(rig.script.redo()).toBe(false)
  expect(snap(rig.main, rig.script)).toEqual(before)
})

test('P14 script 成功新分支清掉 main redo（对称）', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  seedPrivate(rig, itemId)
  rig.main.dispatch(new UpdateItemCommand(itemId, { buyPrice: 7 }))
  rig.main.undo()
  expect(rig.main.canRedo()).toBe(true)
  rig.script.dispatch(new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, WAIT()))
  const before = snap(rig.main, rig.script)
  expect(rig.main.canRedo()).toBe(false)
  expect(rig.script.canRedo()).toBe(false)
  expect(rig.main.redo()).toBe(false)
  expect(snap(rig.main, rig.script)).toEqual(before)
})

test('P15 返回原 state 的 main no-op 不清全局 redo', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  seedPrivate(rig, itemId)
  rig.script.dispatch(new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, WAIT()))
  rig.script.undo()
  expect(rig.script.canRedo()).toBe(true)
  const noop: Command = { label: '同态 no-op', apply: (s) => s, invert: (s) => s }
  const pushed = rig.main.dispatch(noop)
  expect(pushed, 'P15: 返回同一 state 的 no-op 不入栈').toBe(false)
  expect(rig.script.canRedo(), 'P15: no-op 后 script redo 保留').toBe(true)
})

// ───────── P16–P17 失败与通知边界 ─────────

test('P16 第一/第二参与者 apply 失败：双侧状态/dirty/可撤销与后续操作保持（真实 Command 包故障门）', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  seedPrivate(rig, itemId)
  rig.main.markSaved()
  rig.script.markSaved()
  const before = snap(rig.main, rig.script)
  const goodScript = new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, WAIT())
  const failMain = new UpdateItemCommand(itemId, { buyPrice: 77 })
  const origApply = failMain.apply.bind(failMain)
  failMain.apply = () => {
    throw new Error('P16 第二参与者失败')
  }
  expect(() => rig.coordinator.dispatch(goodScript, failMain)).toThrow('P16 第二参与者失败')
  failMain.apply = origApply
  expect(snap(rig.main, rig.script), 'P16 第二参与者失败后双侧保持').toEqual(before)
  rig.coordinator.dispatch(goodScript, failMain)
  expect(rig.main.getState().items[0]!.buyPrice).toBe(77)
  expect(bodyOf(rig.script, itemId)).toEqual(WAIT())
  const afterRetry = snap(rig.main, rig.script)
  const failScript = new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, WAIT())
  const scriptApply = failScript.apply.bind(failScript)
  failScript.apply = () => {
    throw new Error('P16 第一参与者失败')
  }
  const nextMain = new UpdateItemCommand(itemId, { buyPrice: 99 })
  expect(() => rig.coordinator.dispatch(failScript, nextMain)).toThrow('P16 第一参与者失败')
  expect(snap(rig.main, rig.script)).toEqual(afterRetry)
  failScript.apply = scriptApply
  rig.coordinator.dispatch(failScript, nextMain)
  expect(rig.main.getState().items[0]!.buyPrice).toBe(99)
  expect(bodyOf(rig.script, itemId)).toEqual(WAIT())
})

test('P17 同步订阅在 pair 成功时只观察到完整结果；失败时不看到半状态', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  seedPrivate(rig, itemId)
  const seen: { side: string; price: number; body: unknown }[] = []
  for (const [side, session] of [
    ['main', rig.main],
    ['script', rig.script],
  ] as const) {
    session.subscribe(() =>
      seen.push({
        side,
        price: rig.main.getState().items[0]!.buyPrice,
        body: bodyOf(rig.script, itemId),
      }),
    )
  }
  const cur = rig.main.getState().items.find((i) => i.id === itemId)!
  rig.coordinator.dispatch(
    new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, [{ kind: 'wait' as const, ms: 6 }]),
    new UpdateItemCommand(itemId, { buyPrice: 66, use: cur.use! }),
  )
  expect(new Set(seen.map((s) => s.side))).toEqual(new Set(['main', 'script']))
  for (const observed of seen)
    expect(observed).toMatchObject({ price: 66, body: [{ kind: 'wait', ms: 6 }] })
  seen.length = 0
  const failMain = new UpdateItemCommand(itemId, { buyPrice: 55 })
  failMain.apply = () => {
    throw new Error('P17 失败注入')
  }
  expect(() =>
    rig.coordinator.dispatch(
      new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, [{ kind: 'wait' as const, ms: 3 }]),
      failMain,
    ),
  ).toThrow('P17 失败注入')
  expect(seen, '失败不得发布任何观察者通知').toEqual([])
})

// ───────── P18 markSaved / hydrate 分栏 ─────────

test('P18 markSaved 不改全局顺序；map hydrate 与普通通知分栏', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  const listener = vi.fn()
  rig.main.subscribe(listener)
  rig.main.dispatch(new UpdateItemCommand(itemId, { buyPrice: 5 }))
  const callsBefore = listener.mock.calls.length
  rig.main.markSaved()
  expect(listener.mock.calls.length, 'P18: markSaved 走通知版本').toBeGreaterThan(callsBefore)
  const hv = rig.main.getHistoryVersion()
  rig.main.markSaved()
  expect(rig.main.getHistoryVersion(), 'P18: markSaved 不递增 historyVersion').toBe(hv)
  const mapId = rig.main.getState().scenes[0]!.mapId
  const beforeHv = rig.main.getHistoryVersion()
  await rig.main.ensureMapLoaded(mapId)
  expect(rig.main.getHistoryVersion(), 'P18: hydrate 不递增 historyVersion').toBe(beforeHv)
  expect(rig.main.getState().maps[mapId], 'P18: hydrate 后地图已载入').toBeTruthy()
})

// ───────── P19 真实保存重开闭环 ─────────

test('P19 真实 seed→loader→pair 编辑/undo/redo→保存序列化→重开核两侧作者内容', async () => {
  const rig = await blankRig()
  const itemId = rig.main.getState().items[0]!.id
  const cur = rig.main.getState().items.find((i) => i.id === itemId)!
  rig.coordinator.dispatch(
    new AddItemPrivateScriptCommand(itemId, 'P19使用脚本'),
    new UpdateItemCommand(itemId, {
      buyPrice: 123,
      use: {
        ...cur.use!,
        effects: [
          ...cur.use!.effects,
          {
            kind: 'runScript' as const,
            script: { chunk: '__author-item-private-runtime', id: itemId },
          },
        ],
      },
    }),
  )
  rig.script.dispatch(
    new SetItemPrivateScriptBodyCommand(itemId, 'use', 0, [{ kind: 'wait' as const, ms: 9 }]),
  )
  const state = () => ({
    price: rig.main.getState().items[0]!.buyPrice,
    body: bodyOf(rig.script, itemId),
  })
  expect(rig.coordinator.undo()).toBe(true)
  expect(state()).toEqual({ price: 123, body: [] })
  expect(rig.coordinator.undo()).toBe(true)
  expect(state()).toEqual({ price: 0, body: null })
  expect(rig.coordinator.redo()).toBe(true)
  expect(state()).toEqual({ price: 123, body: [] })
  expect(rig.coordinator.redo()).toBe(true)
  expect(state()).toEqual({ price: 123, body: [{ kind: 'wait', ms: 9 }] })
  const merged = mergeEditorProjectionWithCurrentAuthorState(
    rig.script.getState(),
    rig.main.getState(),
  )
  const outputs = await serializeProjectWithMapCopies(merged, rig.source)
  const disk = memoryAuthorDirectory(rig.files as Record<string, unknown>)
  for (const [path, value] of Object.entries(outputs)) disk.set(path, value)
  const reopened = await loadCurrentProjectFrom(fsaSource(disk.dir))
  const reopenedScenes = await loadAllAuthorScenes(reopened)
  const reopenedItem = reopened.authorContent.items.find((i) => i.id === itemId)!
  expect(reopenedItem.buyPrice, 'P19: 重开核主侧作者内容').toBe(123)
  const reopenedScript = new ScriptEditSession({
    scenes: reopenedScenes,
    items: reopened.authorContent.items,
    sharedScripts: reopened.authorContent.sharedScripts,
  })
  expect(bodyOf(reopenedScript, itemId), 'P19: 重开核脚本侧作者内容').toEqual([
    { kind: 'wait', ms: 9 },
  ])
})

// ───────── P20 caller census（具名，不自行决定新 API） ─────────

test('P20 配对caller数量与Root成组装配的静态入口标记（不据此证明任意命令无复用）', () => {
  expect(
    (`${appSource}\n${itemSource}`.match(/historyCoordinator[.]dispatch[(]/g) ?? []).length,
  ).toBe(10) // + item create/copy/delete, now paired canonical + shell transactions.
  expect(rootSource).toMatch(/new EditSession[(]/)
  expect(rootSource).toMatch(/new ScriptEditSession[(]/)
  expect(rootSource).toMatch(/new EditorHistoryCoordinator[(]/)
  expect(appSource.includes('historyOwnerRef')).toBe(false)
})
