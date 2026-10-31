/** Real CLI OBJECT-hook collection: four caller families, aliasing and scene ownership. */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import {
  buildGlobalEntryRawInputs,
  ENEMY_REFERENCE_STATS,
  GLOBAL_ENTRY_MSG_TEXT,
  type GlobalEntryHook,
} from './__tests__/cli-global-entry-inputs.js'
import { type CliRunResult, createCliTestHost } from './__tests__/cli-host.js'

// ── 布局常量（parsers/_utils.ts 已核真值；fixture 侧独立复写，不 import 产品内部）──
const ITEM_OBJ_START = 61

const SPELL_OBJ_START = 296

const ENEMY_OBJ_START = 398

const PLAYER_OBJ_START = 36

/** 独立四指令小程序的期望全量命令（all.json）。 */
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

const cliHost = createCliTestHost('cli-global-entries-')

interface EntryRun {
  result: CliRunResult
  readJson(rel: string): unknown
}

async function runEntry(hooks: GlobalEntryHook[]): Promise<EntryRun> {
  const tree = cliHost.createTree()
  const rawDir = join(tree, 'data', 'raw')
  writeFileSync(join(rawDir, 'mus.mkf'), new Uint8Array([8, 0, 0, 0, 8, 0, 0, 0]))
  for (const [name, bytes] of Object.entries(buildGlobalEntryRawInputs(hooks))) {
    writeFileSync(join(rawDir, name), bytes)
  }
  mkdirSync(join(rawDir, 'Musics'), { recursive: true })
  const result = await cliHost.runCli(tree, ['--faithful'])
  const out = (rel: string) => join(tree, 'data', 'extracted', rel)
  return {
    result,
    readJson: (rel: string) => JSON.parse(readFileSync(out(rel), 'utf8')),
  }
}

function expectPipelineOk(r: EntryRun, entryCount: number): void {
  expect(r.result.exitCode).toBe(0)
  expect(r.result.stderr).toBe('[pal-extract] unifont-cn.bdf 缺,跳过 font\n')
  expect(r.result.stdout).toContain('events round-trip OK')
  expect(r.result.stdout).toContain('done. output →')
  expect(r.result.stdout).toContain(
    `events written: 1 scenes + shared(含 ${entryCount} item/spell/enemyObj script entries)` +
      '+ objects + all(4 全局命令)',
  )
}

// ── JSON IO 守卫（unknown经真实值断言收窄）──
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function numField(rec: unknown, field: string): number {
  if (!isRecord(rec) || !(field in rec)) {
    throw new Error(`记录缺字段 ${field}（非记录或键不存在）`)
  }
  const v = rec[field]
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`字段 ${field} 非有限数值: ${String(v)}`)
  }
  return v
}

function findById(arr: unknown, key: string, want: number): unknown {
  if (!Array.isArray(arr)) throw new Error(`非数组（${key} 查找失败）`)
  const hit = arr.find((e) => isRecord(e) && numField(e, key) === want)
  if (hit === undefined) throw new Error(`未找到 ${key}=${want}`)
  return hit
}

function allCommandsOf(r: EntryRun): unknown {
  const all = r.readJson('events/all.json')
  if (!isRecord(all) || !Array.isArray(all.segments)) throw new Error('all.json 缺 segments 数组')
  const seg0 = all.segments[0]
  if (!isRecord(seg0) || !Array.isArray(seg0.commands)) throw new Error('all.json 段 0 缺 commands')
  return seg0.commands
}

/** all.json 全量命令（含目标完整 label）与 scene 片段（hook 目标不被错误复制进 scene）。 */
function expectAllAndScene(r: EntryRun, sceneCommands: unknown[]): void {
  expect(allCommandsOf(r)).toEqual(ALL_COMMANDS)
  expect(r.readJson('events/scene-000.json')).toEqual({
    scene: 0,
    segments: [{ name: 'scene-0.entries', commands: sceneCommands }],
  })
}

function expectShared(r: EntryRun, commands: unknown[]): void {
  const shared = r.readJson('events/shared.json')
  expect(shared).toEqual({ segments: [{ name: 'shared', commands }] })
}

/** 四 hook 表目标记录（unknown；字段经 numField 真值守卫读取，不做类型跳板）。 */
interface HookTables {
  item61: unknown
  spell296: unknown
  enemy398: unknown
  player36: unknown
}

function readHookTables(r: EntryRun): HookTables {
  const items = r.readJson('data/items.json')
  const spells = r.readJson('data/spells.json')
  const enemyObjects = r.readJson('data/enemy-objects.json')
  const objectPlayers = r.readJson('data/object-players.json')
  expect(items).toHaveLength(234)
  expect(objectPlayers).toHaveLength(6)
  return {
    item61: findById(items, 'id', ITEM_OBJ_START),
    spell296: findById(spells, 'id', SPELL_OBJ_START),
    enemy398: findById(enemyObjects, 'objectIndex', ENEMY_OBJ_START),
    player36: findById(objectPlayers, 'id', PLAYER_OBJ_START),
  }
}

const ITEM_HOOK_FIELDS = ['scriptOnUse', 'scriptOnEquip', 'scriptOnThrow', 'scriptDesc'] as const

const SPELL_HOOK_FIELDS = ['scriptOnUse', 'scriptOnSuccess', 'scriptDesc'] as const

const ENEMY_HOOK_FIELDS = ['scriptOnTurnStart', 'scriptOnBattleEnd', 'scriptOnReady'] as const

const PLAYER_HOOK_FIELDS = ['scriptOnFriendDeath', 'scriptOnDying'] as const

/**
 * 敌引用落表：enemyId 直接作 index（parseEnemies id=index、sdlpal
 * fight.c:516 不减一）——引用 id=1 必须命中 enemies[1] 真实记录且字段与 fixture
 * 植入值一致；不是只改长度答案。
 */
function expectEnemyReferenceLanded(r: EntryRun): void {
  const enemies = r.readJson('data/enemies.json')
  if (!Array.isArray(enemies)) throw new Error('enemies.json 非数组')
  expect(enemies).toHaveLength(2) // index0 placeholder + index1 被引用记录
  const referenced = findById(enemies, 'id', 1) // 引用 id 确实落表
  expect(numField(referenced, 'health')).toBe(ENEMY_REFERENCE_STATS.health)
  expect(numField(referenced, 'exp')).toBe(ENEMY_REFERENCE_STATS.exp)
  expect(numField(referenced, 'cash')).toBe(ENEMY_REFERENCE_STATS.cash)
  expect(numField(referenced, 'level')).toBe(ENEMY_REFERENCE_STATS.level)
  const placeholder = findById(enemies, 'id', 0)
  expect(numField(placeholder, 'health')).toBe(0) // index0 为 placeholder
}

/**
 * 单 hook 合同核心断言：data 表目标字段=3、其余全部 hook（四表十二字段）为 0、
 * 敌 cases 的 enemyId=1 直接索引落 enemies[1] 真实记录。
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
      expect(numField(t[table], f)).toBe(table === expected.table && f === expected.field ? 3 : 0)
    }
  }
  if (expected.table === 'enemy398') {
    expect(numField(t.enemy398, 'enemyId')).toBe(1) // 直接索引引用（不减一）
    expect(numField(t.enemy398, 'resistanceToSorcery')).toBe(0)
    expectEnemyReferenceLanded(r)
  } else {
    expect(numField(t.enemy398, 'enemyId')).toBe(0)
  }
}

afterAll(cliHost.disposeAll)
describe('item hooks', () => {
  // ── 前十二：每条仅一个 hook 非零（OBJECT 表目标字段=3 → entryIps → shared 恰 L_3）──

  test('item.use entry', async () => {
    const r = await runEntry([{ objectId: ITEM_OBJ_START, fieldOff: 4, value: 3 }])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'item61', field: 'scriptOnUse' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })

  test('item.equip entry', async () => {
    const r = await runEntry([{ objectId: ITEM_OBJ_START, fieldOff: 6, value: 3 }])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'item61', field: 'scriptOnEquip' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })

  test('item.throw entry', async () => {
    const r = await runEntry([{ objectId: ITEM_OBJ_START, fieldOff: 8, value: 3 }])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'item61', field: 'scriptOnThrow' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })

  test('item.desc entry', async () => {
    const r = await runEntry([{ objectId: ITEM_OBJ_START, fieldOff: 10, value: 3 }])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'item61', field: 'scriptDesc' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })
})

describe('spell hooks', () => {
  test('spell.use entry', async () => {
    const r = await runEntry([{ objectId: SPELL_OBJ_START, fieldOff: 6, value: 3 }])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'spell296', field: 'scriptOnUse' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })

  test('spell.success entry', async () => {
    const r = await runEntry([{ objectId: SPELL_OBJ_START, fieldOff: 4, value: 3 }])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'spell296', field: 'scriptOnSuccess' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })

  test('spell.desc entry', async () => {
    const r = await runEntry([{ objectId: SPELL_OBJ_START, fieldOff: 10, value: 3 }])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'spell296', field: 'scriptDesc' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })
})

describe('enemy hooks', () => {
  test('enemy.turnStart entry', async () => {
    const r = await runEntry([
      { objectId: ENEMY_OBJ_START, fieldOff: 0, value: 1 }, // 完整合法敌引用
      { objectId: ENEMY_OBJ_START, fieldOff: 4, value: 3 },
    ])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'enemy398', field: 'scriptOnTurnStart' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })

  test('enemy.battleEnd entry', async () => {
    const r = await runEntry([
      { objectId: ENEMY_OBJ_START, fieldOff: 0, value: 1 },
      { objectId: ENEMY_OBJ_START, fieldOff: 6, value: 3 },
    ])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'enemy398', field: 'scriptOnBattleEnd' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })

  test('enemy.ready entry', async () => {
    const r = await runEntry([
      { objectId: ENEMY_OBJ_START, fieldOff: 0, value: 1 },
      { objectId: ENEMY_OBJ_START, fieldOff: 8, value: 3 },
    ])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'enemy398', field: 'scriptOnReady' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })
})

describe('player hooks', () => {
  test('player.friendDeath entry', async () => {
    const r = await runEntry([{ objectId: PLAYER_OBJ_START, fieldOff: 4, value: 3 }])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'player36', field: 'scriptOnFriendDeath' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })

  test('player.dying entry', async () => {
    const r = await runEntry([{ objectId: PLAYER_OBJ_START, fieldOff: 6, value: 3 }])
    expectPipelineOk(r, 1)
    expectSingleHook(r, { table: 'player36', field: 'scriptOnDying' })
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS)
    expectShared(r, [{ op: 'end', label: 'L_3' }])
  })
})

describe('shared aliases', () => {
  // ── 两组合合同 ──

  test('shared entry alias', async () => {
    // item.use 与 player.dying 同一合法 ip：完整接线后 labels/shared 不重复
    const r = await runEntry([
      { objectId: ITEM_OBJ_START, fieldOff: 4, value: 3 },
      { objectId: PLAYER_OBJ_START, fieldOff: 6, value: 3 },
    ])
    expectPipelineOk(r, 2) // 两个 globalScriptEntries push 都计入 stdout 计数
    const t = readHookTables(r)
    expect(numField(t.item61, 'scriptOnUse')).toBe(3)
    expect(numField(t.player36, 'scriptOnDying')).toBe(3)
    // 除这两个别名 hook 外其余全零
    expect(numField(t.item61, 'scriptOnEquip')).toBe(0)
    expect(numField(t.item61, 'scriptOnThrow')).toBe(0)
    expect(numField(t.item61, 'scriptDesc')).toBe(0)
    expect(numField(t.spell296, 'scriptOnUse')).toBe(0)
    expect(numField(t.spell296, 'scriptOnSuccess')).toBe(0)
    expect(numField(t.spell296, 'scriptDesc')).toBe(0)
    expect(numField(t.enemy398, 'scriptOnTurnStart')).toBe(0)
    expect(numField(t.enemy398, 'scriptOnBattleEnd')).toBe(0)
    expect(numField(t.enemy398, 'scriptOnReady')).toBe(0)
    expect(numField(t.player36, 'scriptOnFriendDeath')).toBe(0)
    expectAllAndScene(r, SCENE_ENTRY_COMMANDS) // L_3 在 all 中恰一次（label 去重）
    expectShared(r, [{ op: 'end', label: 'L_3' }]) // shared 不重复（Set 归属）
  })
})

describe('scene and global overlap', () => {
  test('scene global overlap', async () => {
    // enemy.ready 与 scene 入口同一合法 ip（ip1）：global 命中强制归 shared、scene 不复制
    const r = await runEntry([
      { objectId: ENEMY_OBJ_START, fieldOff: 0, value: 1 },
      { objectId: ENEMY_OBJ_START, fieldOff: 8, value: 1 }, // = scene scriptOnEnter 同 ip
    ])
    expectPipelineOk(r, 1)
    const t = readHookTables(r)
    expect(numField(t.enemy398, 'scriptOnReady')).toBe(1)
    expect(numField(t.enemy398, 'scriptOnTurnStart')).toBe(0)
    expect(numField(t.enemy398, 'scriptOnBattleEnd')).toBe(0)
    expect(numField(t.enemy398, 'enemyId')).toBe(1)
    expectEnemyReferenceLanded(r) // 直接索引引用落表（字段对应 fixture 植入值）
    expect(numField(t.item61, 'scriptOnUse')).toBe(0)
    expect(numField(t.spell296, 'scriptOnUse')).toBe(0)
    expect(numField(t.player36, 'scriptOnFriendDeath')).toBe(0)
    // all：ip3 无 hook 指向 → 不打 L_3 标签（标签只属入口/跳转目标）
    expect(allCommandsOf(r)).toEqual([
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
})
