// Q10 r20（Q-NEXT1-01～14 有限批）· CLI 全局脚本入口接线（items/spells/enemyObjects/
// objectPlayers 四类 OBJECT hook → entryIps → disasm/roundtrip/annotate → sliceByScene → 落盘）。
//
// 排重 basis：旧三份 CLI 文件（cli-isolated/battle-assets/font-lookup）的 OBJECT 表全部
// 来自全零全局 hook 构造——旧 CLI 只证 shared 为空的跳过路径，从未证明十二个实际
// caller 字段接到 entryIps 并产出 shared 输出。items.boundaries 字段映射、spells.boundaries
// 玩家 4/6 字节映射、slice.test/boundaries 的 global 归 shared 为单元/纯算法旧证，不重领。
// 本批新信用仅为 CLI 实际接线（源码 cli.ts:225-269 收集 → :272-282 落盘）。
// 期望来自已核字段布局（parsers/_utils.ts）与独立四指令小程序，不复制 disasm/slice 算法。
// 反控：本批五个代表产品变异由 Codex 独立阶段统一实采（见 next-batch 协议），此处不伪造。
import { spawn } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, expect, test } from 'vitest'
import {
  buildGlobalEntryRawInputs,
  GLOBAL_ENTRY_MSG_TEXT,
  type GlobalEntryHook,
} from './__tests__/glm-q/cli-global-entry-inputs.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REAL_PACKAGE = resolve(HERE, '..')

// ── 布局常量（parsers/_utils.ts 已核真值；fixture 侧独立复写，不 import 产品内部）──
const ITEM_OBJ_START = 61
const SPELL_OBJ_START = 296
const ENEMY_OBJ_START = 398
const PLAYER_OBJ_START = 36

/** 独立四指令小程序的期望全量命令（all.json；与 Codex 正控同构）。 */
const ALL_COMMANDS = [
  { op: 'giveItem', itemId: 61, count: 1, _item: 'ITEMNAME' },
  { op: 'showDialog', messageIndex: 0, text: GLOBAL_ENTRY_MSG_TEXT, label: 'L_1' },
  { op: 'end', label: 'L_2' },
  { op: 'end', label: 'L_3' },
]

const SCENE_ENTRY_COMMANDS = [
  { op: 'showDialog', messageIndex: 0, text: GLOBAL_ENTRY_MSG_TEXT, label: 'L_1' },
  { op: 'end', label: 'L_2' },
]

interface RunResult {
  exitCode: number | null
  stdout: string
  stderr: string
}

function runCli(tree: string): Promise<RunResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(
      process.execPath,
      [join(REAL_PACKAGE, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'src/cli.ts'],
      {
        cwd: join(tree, 'packages', 'pal-extract'),
        env: { ...process.env, NODE_COMPILE_CACHE: '' },
      },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('close', (exitCode) => resolvePromise({ exitCode, stdout, stderr }))
  })
}

const trees: string[] = []
afterAll(() => {
  for (const tree of trees) rmSync(tree, { recursive: true, force: true })
})

interface EntryRun {
  result: RunResult
  out(rel: string): string
  readJson(rel: string): unknown
}

async function runEntry(hooks: GlobalEntryHook[]): Promise<EntryRun> {
  const tree = mkdtempSync(join(tmpdir(), 'glm-q-cli-ge-'))
  const pkgDir = join(tree, 'packages', 'pal-extract')
  mkdirSync(pkgDir, { recursive: true })
  cpSync(join(REAL_PACKAGE, 'src'), join(pkgDir, 'src'), { recursive: true })
  cpSync(join(REAL_PACKAGE, 'package.json'), join(pkgDir, 'package.json'))
  symlinkSync(join(REAL_PACKAGE, 'node_modules'), join(pkgDir, 'node_modules'), 'dir')
  const rawDir = join(tree, 'data', 'raw')
  mkdirSync(rawDir, { recursive: true })
  for (const [name, bytes] of Object.entries(buildGlobalEntryRawInputs(hooks))) {
    writeFileSync(join(rawDir, name), bytes)
  }
  mkdirSync(join(rawDir, 'Musics'), { recursive: true })
  trees.push(tree)
  const result = await runCli(tree)
  const out = (rel: string) => join(tree, 'data', 'extracted', rel)
  return {
    result,
    out,
    readJson: (rel: string) => JSON.parse(readFileSync(out(rel), 'utf8')),
  }
}

function expectPipelineOk(r: EntryRun, entryCount: number): void {
  expect(r.result.exitCode).toBe(0)
  expect(r.result.stdout).toContain('events round-trip OK')
  expect(r.result.stdout).toContain('done. output →')
  expect(r.result.stdout).toContain(
    `events written: 1 scenes + shared(含 ${entryCount} item/spell/enemyObj script entries)` +
      '+ objects + all(4 全局命令)',
  )
}

/** all.json 全量命令（含目标完整 label）与 scene 片段（hook 目标不被错误复制进 scene）。 */
function expectAllAndScene(r: EntryRun, sceneCommands: unknown[]): void {
  const all = r.readJson('events/all.json') as { segments: Array<{ commands: unknown[] }> }
  expect(all.segments[0]!.commands).toEqual(ALL_COMMANDS)
  const scene = r.readJson('events/scene-000.json')
  expect(scene).toEqual({
    scene: 0,
    segments: [{ name: 'scene-0.entries', commands: sceneCommands }],
  })
}

function expectShared(r: EntryRun, commands: unknown[]): void {
  const shared = r.readJson('events/shared.json')
  expect(shared).toEqual({ segments: [{ name: 'shared', commands }] })
}

interface HookTables {
  item61: Record<string, number>
  spell296: Record<string, number>
  enemy398: Record<string, number>
  player36: Record<string, number>
}

function readHookTables(r: EntryRun): HookTables {
  const items = r.readJson('data/items.json') as Array<{ id: number }>
  const spells = r.readJson('data/spells.json') as Array<{ id: number }>
  const enemyObjects = r.readJson('data/enemy-objects.json') as Array<{ objectIndex: number }>
  const objectPlayers = r.readJson('data/object-players.json') as Array<{ id: number }>
  expect(items).toHaveLength(234)
  expect(spells.find((s) => s.id === SPELL_OBJ_START)).toBeDefined()
  expect(enemyObjects.find((e) => e.objectIndex === ENEMY_OBJ_START)).toBeDefined()
  expect(objectPlayers).toHaveLength(6)
  return {
    item61: items.find((i) => i.id === ITEM_OBJ_START) as unknown as Record<string, number>,
    spell296: spells.find((s) => s.id === SPELL_OBJ_START) as unknown as Record<string, number>,
    enemy398: enemyObjects.find((e) => e.objectIndex === ENEMY_OBJ_START) as unknown as Record<
      string,
      number
    >,
    player36: objectPlayers.find((p) => p.id === PLAYER_OBJ_START) as unknown as Record<
      string,
      number
    >,
  }
}

const ITEM_HOOK_FIELDS = ['scriptOnUse', 'scriptOnEquip', 'scriptOnThrow', 'scriptDesc'] as const
const SPELL_HOOK_FIELDS = ['scriptOnUse', 'scriptOnSuccess', 'scriptDesc'] as const
const ENEMY_HOOK_FIELDS = ['scriptOnTurnStart', 'scriptOnBattleEnd', 'scriptOnReady'] as const
const PLAYER_HOOK_FIELDS = ['scriptOnFriendDeath', 'scriptOnDying'] as const

/**
 * 单 hook 合同核心断言：data 表目标字段=3、其余全部 hook（四表十二字段）为 0、
 * enemy 引用完整（enemyId=1 对应 DATA chunk1 唯一敌）、敌 cases 另证 enemies.json 落表。
 */
function expectSingleHook(
  r: EntryRun,
  expected: { table: 'item61' | 'spell296' | 'enemy398' | 'player36'; field: string },
): void {
  const t = readHookTables(r)
  for (const [table, fields] of [
    ['item61', ITEM_HOOK_FIELDS],
    ['spell296', SPELL_HOOK_FIELDS],
    ['enemy398', ENEMY_HOOK_FIELDS],
    ['player36', PLAYER_HOOK_FIELDS],
  ] as const) {
    for (const f of fields) {
      expect(t[table][f]).toBe(table === expected.table && f === expected.field ? 3 : 0)
    }
  }
  if (expected.table === 'enemy398') {
    expect(t.enemy398.enemyId).toBe(1) // 完整合法引用：1-based 指 DATA chunk1 唯一敌
    expect(t.enemy398.resistanceToSorcery).toBe(0)
    const enemies = r.readJson('data/enemies.json') as unknown[]
    expect(enemies).toHaveLength(1)
  } else {
    expect(t.enemy398.enemyId).toBe(0)
  }
}

// ── 前十二：每条仅一个 hook 非零（OBJECT 表目标字段=3 → entryIps → shared 恰 L_3）──

test('Q-NEXT1-01 item.use entry', async () => {
  const r = await runEntry([{ objectId: ITEM_OBJ_START, fieldOff: 4, value: 3 }])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'item61', field: 'scriptOnUse' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-02 item.equip entry', async () => {
  const r = await runEntry([{ objectId: ITEM_OBJ_START, fieldOff: 6, value: 3 }])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'item61', field: 'scriptOnEquip' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-03 item.throw entry', async () => {
  const r = await runEntry([{ objectId: ITEM_OBJ_START, fieldOff: 8, value: 3 }])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'item61', field: 'scriptOnThrow' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-04 item.desc entry', async () => {
  const r = await runEntry([{ objectId: ITEM_OBJ_START, fieldOff: 10, value: 3 }])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'item61', field: 'scriptDesc' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-05 spell.use entry', async () => {
  const r = await runEntry([{ objectId: SPELL_OBJ_START, fieldOff: 6, value: 3 }])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'spell296', field: 'scriptOnUse' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-06 spell.success entry', async () => {
  const r = await runEntry([{ objectId: SPELL_OBJ_START, fieldOff: 4, value: 3 }])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'spell296', field: 'scriptOnSuccess' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-07 spell.desc entry', async () => {
  const r = await runEntry([{ objectId: SPELL_OBJ_START, fieldOff: 10, value: 3 }])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'spell296', field: 'scriptDesc' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-08 enemy.turnStart entry', async () => {
  const r = await runEntry([
    { objectId: ENEMY_OBJ_START, fieldOff: 0, value: 1 }, // 完整合法敌引用
    { objectId: ENEMY_OBJ_START, fieldOff: 4, value: 3 },
  ])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'enemy398', field: 'scriptOnTurnStart' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-09 enemy.battleEnd entry', async () => {
  const r = await runEntry([
    { objectId: ENEMY_OBJ_START, fieldOff: 0, value: 1 },
    { objectId: ENEMY_OBJ_START, fieldOff: 6, value: 3 },
  ])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'enemy398', field: 'scriptOnBattleEnd' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-10 enemy.ready entry', async () => {
  const r = await runEntry([
    { objectId: ENEMY_OBJ_START, fieldOff: 0, value: 1 },
    { objectId: ENEMY_OBJ_START, fieldOff: 8, value: 3 },
  ])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'enemy398', field: 'scriptOnReady' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-11 player.friendDeath entry', async () => {
  const r = await runEntry([{ objectId: PLAYER_OBJ_START, fieldOff: 4, value: 3 }])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'player36', field: 'scriptOnFriendDeath' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

test('Q-NEXT1-12 player.dying entry', async () => {
  const r = await runEntry([{ objectId: PLAYER_OBJ_START, fieldOff: 6, value: 3 }])
  expectPipelineOk(r, 1)
  expectSingleHook(r, { table: 'player36', field: 'scriptOnDying' })
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
  expectShared(r, [{ op: 'end', label: 'L_3' }])
})

// ── 两组合合同 ──

test('Q-NEXT1-13 shared entry alias', async () => {
  // item.use 与 player.dying 同一合法 ip：完整接线后 labels/shared 不重复
  const r = await runEntry([
    { objectId: ITEM_OBJ_START, fieldOff: 4, value: 3 },
    { objectId: PLAYER_OBJ_START, fieldOff: 6, value: 3 },
  ])
  expectPipelineOk(r, 2) // 两个 globalScriptEntries push 都计入 stdout 计数
  const t = readHookTables(r)
  expect(t.item61.scriptOnUse).toBe(3)
  expect(t.player36.scriptOnDying).toBe(3)
  // 除这两个别名 hook 外其余全零
  expect(t.item61.scriptOnEquip).toBe(0)
  expect(t.item61.scriptOnThrow).toBe(0)
  expect(t.item61.scriptDesc).toBe(0)
  expect(t.spell296.scriptOnUse).toBe(0)
  expect(t.spell296.scriptOnSuccess).toBe(0)
  expect(t.spell296.scriptDesc).toBe(0)
  expect(t.enemy398.scriptOnTurnStart).toBe(0)
  expect(t.enemy398.scriptOnBattleEnd).toBe(0)
  expect(t.enemy398.scriptOnReady).toBe(0)
  expect(t.player36.scriptOnFriendDeath).toBe(0)
  expectAllAndScene(r, SCENE_ENTRY_COMMANDS) // L_3 在 all 中恰一次（label 去重）
  expectShared(r, [{ op: 'end', label: 'L_3' }]) // shared 不重复（Set 归属）
})

test('Q-NEXT1-14 scene global overlap', async () => {
  // enemy.ready 与 scene 入口同一合法 ip（ip1）：global 命中强制归 shared、scene 不复制
  const r = await runEntry([
    { objectId: ENEMY_OBJ_START, fieldOff: 0, value: 1 },
    { objectId: ENEMY_OBJ_START, fieldOff: 8, value: 1 }, // = scene scriptOnEnter 同 ip
  ])
  expectPipelineOk(r, 1)
  const t = readHookTables(r)
  expect(t.enemy398.scriptOnReady).toBe(1)
  expect(t.enemy398.scriptOnTurnStart).toBe(0)
  expect(t.enemy398.scriptOnBattleEnd).toBe(0)
  expect(t.enemy398.enemyId).toBe(1)
  expect(t.item61.scriptOnUse).toBe(0)
  expect(t.spell296.scriptOnUse).toBe(0)
  expect(t.player36.scriptOnFriendDeath).toBe(0)
  // all：ip3 无 hook 指向 → 不打 L_3 标签（标签只属入口/跳转目标）
  const all = r.readJson('events/all.json') as { segments: Array<{ commands: unknown[] }> }
  expect(all.segments[0]!.commands).toEqual([
    { op: 'giveItem', itemId: 61, count: 1, _item: 'ITEMNAME' },
    { op: 'showDialog', messageIndex: 0, text: GLOBAL_ENTRY_MSG_TEXT, label: 'L_1' },
    { op: 'end', label: 'L_2' },
    { op: 'end' },
  ])
  const scene = r.readJson('events/scene-000.json')
  expect(scene).toEqual({
    scene: 0,
    segments: [{ name: 'scene-0.entries', commands: [] }],
  }) // scene-0 不再含 L_1/L_2（强制 shared，不复制）
  expectShared(r, SCENE_ENTRY_COMMANDS) // 归 shared：BFS 从 ip1 = showDialog→plain end
})
