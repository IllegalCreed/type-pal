// src/tools/save-io.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBattleLifecycleFixture } from '../core/battle/battle-lifecycle.test-fixtures.js'
import { createInitialGameState, type GameState } from '../core/game-state.js'
import { Save } from '../core/save/api.js'
import { startDialogLine } from '../present/dialog-box.js'
import legacyV1 from './__fixtures__/save-v1-store-v2.json' with { type: 'json' }
import legacyNested from './__fixtures__/save-v1-store-v2-nested.json' with { type: 'json' }
import { parseImportedSave, serializeSave } from './save-io.js'

function saveState(scene: number, cash = 0): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.wNumScene = scene
  gs.dwCash = cash
  return gs
}

afterEach(async () => {
  await Save._clearAllForTest()
  vi.unstubAllGlobals()
})

describe('save-io', () => {
  it('serializeSave:gs → 带版本头的 JSON 字符串', () => {
    const json = serializeSave(saveState(5, 100))
    const obj = JSON.parse(json)
    expect(obj.format).toBe('type-pal-save')
    expect(obj.version).toBe(1)
    expect(obj.gs.wNumScene).toBe(5)
  })
  it('V1往返保留事件游标和对话数据', () => {
    const gs = saveState(9)
    gs.party.x = 160
    gs.party.y = 160
    gs.mode = 'event'
    gs.eventCursor = {
      commands: [{ op: 'showDialog', messageIndex: 5, text: 'hi' }, { op: 'end' }],
      labelMap: { L_0: 0 },
      ip: 0,
      waiting: 'dialog',
    }
    gs.dialogBox = startDialogLine('hi', { style: 'center' })
    gs.currentDialogStyle = 'top'
    const decoded = parseImportedSave(serializeSave(gs))
    expect(decoded.wNumScene).toBe(9)
    expect(decoded.party.x).toBe(160)
    expect(decoded.eventCursor).toEqual({
      commands: [{ op: 'showDialog', messageIndex: 5, text: 'hi' }, { op: 'end' }],
      labelMap: { L_0: 0 },
      ip: 0,
      waiting: 'dialog',
    })
    expect(decoded.dialogBox?.currentLineText).toBe('hi')
    expect(decoded.currentDialogStyle).toBe('top')
  })
  it('parseImportedSave:格式头缺失或不支持时拒绝', () => {
    const legal = JSON.parse(serializeSave(saveState(9)))
    for (const raw of [{}, { ...legal, format: 'x' }]) {
      expect(() => parseImportedSave(JSON.stringify(raw))).toThrow(/格式/)
    }
  })
  it('parseImportedSave:非JSON文本给出解析错误', () => {
    expect(() => parseImportedSave('not json')).toThrow(/不是合法 JSON/)
  })
  it('parseImportedSave:缺必要字段(partyMembers)→ 抛', () => {
    const gs: Partial<GameState> = saveState(1)
    delete gs.partyMembers
    const bad = JSON.stringify({ format: 'type-pal-save', version: 1, gs })
    expect(() => parseImportedSave(bad)).toThrow(/字段/)
  })
  it('parseImportedSave:partyMembers 合法但 wNumScene 缺失或为文本 → 拒绝', () => {
    const missing: Partial<GameState> = saveState(5)
    delete missing.wNumScene
    for (const gs of [missing, { ...saveState(5), wNumScene: '5' }]) {
      const text = JSON.stringify({ format: 'type-pal-save', version: 1, gs })
      expect(() => parseImportedSave(text)).toThrow(/存档缺必要字段/)
    }
  })
  it('parseImportedSave:未知 version → 拒绝，不把未来/旧 envelope 交给 Save API', () => {
    const raw = JSON.parse(serializeSave(saveState(1)))
    raw.version = 2
    expect(() => parseImportedSave(JSON.stringify(raw))).toThrow(/版本/)
  })

  it('现金被改成文本时，在调用真实 Save 写入前拒绝，原槽位与预览保持不变', async () => {
    // 本例核真实内存 Save 门面，不访问浏览器用户的 IndexedDB。
    vi.stubGlobal('indexedDB', undefined)
    await Save.saveSlot(5, saveState(4, 55))
    const originalMeta = await Save.listSlots()
    const damaged = JSON.stringify({
      format: 'type-pal-save',
      version: 1,
      gs: { ...saveState(9, 900), dwCash: 'broken' },
    })

    await expect(async () => {
      await Save.saveSlot(5, parseImportedSave(damaged))
    }).rejects.toThrow(/dwCash/)

    expect(await Save.loadSlot(5)).toMatchObject({ wNumScene: 4, dwCash: 55 })
    expect(await Save.listSlots()).toEqual(originalMeta)
  })

  it('现金数值溢出为 Infinity 时拒绝；正常 V1 的真实 0 保留', () => {
    const legal = serializeSave(saveState(9, 900))
    const overflow = legal.replace('"dwCash":900', '"dwCash":1e400')
    expect(overflow).not.toBe(legal)
    expect(() => parseImportedSave(overflow)).toThrow(/dwCash/)
    expect(parseImportedSave(serializeSave(saveState(9, 0))).dwCash).toBe(0)
  })
})

describe('V1 stored-data structure', () => {
  // Each payload starts with the real current constructor and corrupts one field/shape.
  const original = saveState(9, 900)
  const cases = [
    {
      name: 'party direction',
      field: 'party',
      gs: { ...original, party: { ...original.party, facing: 'sideways' } },
    },
    {
      name: 'party member element',
      field: 'partyMembers',
      gs: { ...original, partyMembers: ['0'] },
    },
    {
      name: 'inventory count',
      field: 'inventory',
      gs: { ...original, inventory: [{ itemId: 105, count: '3' }] },
    },
    {
      name: 'runtime HP element',
      field: 'PlayerRolesRuntime',
      gs: {
        ...original,
        PlayerRolesRuntime: { ...original.PlayerRolesRuntime, rgwHP: ['150', 0, 0, 0, 0, 0] },
      },
    },
    {
      name: 'runtime role row length',
      field: 'PlayerRolesRuntime',
      gs: {
        ...original,
        PlayerRolesRuntime: {
          ...original.PlayerRolesRuntime,
          rgwHP: original.PlayerRolesRuntime.rgwHP.slice(0, 5),
        },
      },
    },
    {
      name: 'OBJECT word row length',
      field: 'rgObject',
      gs: { ...original, rgObject: { 1: { rgwData: [0, 0, 0, 0, 0, 0] } } },
    },
    {
      name: 'inherited command discriminator',
      field: 'sceneCommands',
      gs: { ...original, sceneCommands: [{ op: 'constructor' }] },
    },
    {
      name: 'native byte object range',
      field: 'rngDialogBackup',
      gs: { ...original, rngDialogBackup: { 0: 0, 1: 256 } },
    },
    {
      name: 'loader prototype write',
      field: '__proto__',
      gs: { ...original, ['__proto__']: { unowned: true } },
    },
  ]
  it.each(cases)('rejects damaged $name', ({ gs, field }) => {
    const text = JSON.stringify({ format: 'type-pal-save', version: 1, gs })
    expect(() => parseImportedSave(text)).toThrow(new RegExp(field))
  })

  it('rejects a nonfinite nested HP value from a valid JSON numeric literal', () => {
    const legal = serializeSave(saveState(9, 900))
    const damaged = legal.replace('"rgwHP":[0,0,0,0,0,0]', '"rgwHP":[1e400,0,0,0,0,0]')
    expect(damaged).not.toBe(legal)
    expect(() => parseImportedSave(damaged)).toThrow(/PlayerRolesRuntime/)
  })

  it('preserves a frozen store-v2 snapshot exported as V1 without adding later runtime fields', async () => {
    // Generated from the complete 6b58f9e84 constructor, then the actual V1 writer.
    // This is a structural compatibility fixture, not a played-game or hydration oracle.
    vi.stubGlobal('indexedDB', undefined)
    const parsed = parseImportedSave(JSON.stringify(legacyV1))
    expect(parsed).toEqual(legacyV1.gs)
    expect(parsed.dwCash).toBe(55)
    expect(Object.hasOwn(parsed, 'nowMs')).toBe(false)
    expect(Object.hasOwn(parsed.PlayerRolesRuntime, 'rgwSpriteNum')).toBe(false)
    await Save.saveSlot(5, parsed)
    const loaded = await Save.loadSlot(5)
    if (loaded === null) throw new Error('Expected imported legacy slot 5')
    expect(JSON.parse(serializeSave(loaded)).gs).toEqual(legacyV1.gs)
  })

  it('preserves native JSON data shapes without manufacturing Map/RNG methods', () => {
    const { gs } = createBattleLifecycleFixture({ partyMembers: [0, 1] })
    gs.rngDialogBackup = new Uint8Array([0, 255])
    // The renderer writes follower slots; native JSON turns the unused leader hole into null.
    gs.followerFrozenOffset[1] = { dx: 16, dy: 8, dir: 'down' }
    gs.sceneCommands = [{ op: 'sequence', steps: [{ op: 'raw', opcode: 0, operands: [0, 0, 0] }] }]
    const parsed = parseImportedSave(serializeSave(gs))
    expect(parsed.battleState?.phase).toBe('preBattle')
    expect(parsed.battleState?.players).toHaveLength(2)
    expect(parsed.battleState?.enemies).toHaveLength(1)
    expect(parsed.battleState?.pendingActions).toEqual({})
    expect(parsed.battleState?.rng).toEqual({})
    expect(parsed.rngDialogBackup).toEqual({ 0: 0, 1: 255 })
    expect(parsed.followerFrozenOffset).toEqual([null, { dx: 16, dy: 8, dir: 'down' }])
    expect(parsed.sceneCommands).toEqual([
      { op: 'sequence', steps: [{ op: 'raw', opcode: 0, operands: [0, 0, 0] }] },
    ])
  })

  it('rejects an unknown battle phase in an otherwise actual startBattle snapshot', () => {
    const { gs, state } = createBattleLifecycleFixture()
    const text = JSON.stringify({
      format: 'type-pal-save',
      version: 1,
      gs: { ...gs, battleState: { ...state, phase: 'unknown' } },
    })
    expect(() => parseImportedSave(text)).toThrow(/battleState/)
  })
})

describe('existing nonempty store-v2 representations', () => {
  const kinds: Array<'dialog' | 'battle'> = ['dialog', 'battle']
  it.each(
    kinds,
  )('preserves the actual historical %s producer and JSON-fallback Save output', (kind) => {
    // Frozen modules and real memory JSON fallback produced these deltas;no old engine/default is restored.
    const text = JSON.stringify({
      ...legacyV1,
      gs: { ...legacyV1.gs, ...legacyNested.common, ...legacyNested[kind] },
    })
    expect(() => parseImportedSave(text)).not.toThrow()
    const decoded = parseImportedSave(text)
    if (kind === 'dialog') {
      expect(decoded.dialogBox?.currentLineText).toBe('旧存档对话')
      expect(Object.hasOwn(decoded.dialogBox ?? {}, 'dialogLineCount')).toBe(false)
    } else {
      expect(decoded.battleState?.players[0]?.status.haste).toBe(false)
      expect(decoded.battleState?.enemies[0]?.status.slow).toBe(false)
      expect(Object.hasOwn(decoded.battleState ?? {}, 'menuState')).toBe(false)
    }
    expect(decoded.PlayerRolesRuntime).toEqual(legacyNested.common.PlayerRolesRuntime)
  })
})

describe('fixed player-role index domain', () => {
  it.each([-1, 0.5, 6])('rejects party role %s outside the six integral role slots', (role) => {
    const text = JSON.stringify({
      format: 'type-pal-save',
      version: 1,
      gs: { ...saveState(9), partyMembers: [role] },
    })
    expect(() => parseImportedSave(text)).toThrow(/partyMembers/)
  })

  it('rejects a corrupt battle-local role id even when the saved party is valid', () => {
    const { gs, state } = createBattleLifecycleFixture()
    const text = JSON.stringify({
      format: 'type-pal-save',
      version: 1,
      gs: {
        ...gs,
        battleState: {
          ...state,
          players: state.players.map((player) => ({ ...player, roleId: 6 })),
        },
      },
    })
    expect(() => parseImportedSave(text)).toThrow(/battleState/)
  })

  it('keeps the highest real role slot in an actual battle producer', () => {
    const { gs } = createBattleLifecycleFixture({ partyMembers: [5] })
    const decoded = parseImportedSave(serializeSave(gs))
    expect(decoded.partyMembers).toEqual([5])
    expect(decoded.battleState?.players[0]?.roleId).toBe(5)
  })
})

describe('saved experience remainder domain', () => {
  it('rejects corrupt experience in every pool before replacing the real slot or its preview', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await Save.saveSlot(5, saveState(4, 55))
    const originalMeta = await Save.listSlots()
    const damaged: Array<{ pool: keyof GameState['Exp']; role: number; value: number }> = [
      { pool: 'rgPrimaryExp', role: 0, value: Number.MAX_VALUE },
      { pool: 'rgHealthExp', role: 1, value: -1 },
      { pool: 'rgMagicExp', role: 2, value: 0.5 },
      { pool: 'rgAttackExp', role: 3, value: 65536 },
      { pool: 'rgMagicPowerExp', role: 4, value: Number.MAX_VALUE },
      { pool: 'rgDefenseExp', role: 5, value: -1 },
      { pool: 'rgDexterityExp', role: 0, value: 0.5 },
      { pool: 'rgFleeExp', role: 5, value: 65536 },
    ]
    for (const { pool, role, value } of damaged) {
      const gs = saveState(9, 900)
      gs.Exp[pool][role]!.wExp = value
      await expect
        .soft(async () => {
          await Save.saveSlot(5, parseImportedSave(serializeSave(gs)))
        }, `${pool}[${role}].wExp=${value}`)
        .rejects.toThrow(/Exp/)
    }
    expect(await Save.loadSlot(5)).toMatchObject({ wNumScene: 4, dwCash: 55 })
    expect(await Save.listSlots()).toEqual(originalMeta)
  })

  it('preserves both WORD endpoints in all six roles and leaves grown attributes unchanged', () => {
    const gs = saveState(9)
    for (const row of Object.values(gs.Exp)) {
      for (const [role, entry] of row.entries()) entry.wExp = role % 2 === 0 ? 0 : 65535
    }
    gs.PlayerRolesRuntime.rgwAttackStrength[0] = 65536
    const decoded = parseImportedSave(serializeSave(gs))
    for (const row of Object.values(decoded.Exp)) {
      expect(row.map((entry) => entry.wExp)).toEqual([0, 65535, 0, 65535, 0, 65535])
    }
    expect(decoded.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(65536)
  })
})
