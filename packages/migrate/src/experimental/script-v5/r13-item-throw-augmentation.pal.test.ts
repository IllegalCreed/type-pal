import type { ItemDataV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { SourceCmd } from '../../migrate-content.js'
import { palSoundAssetForSources } from '../../pal-migration.js'
import { getPalTestGeneratedFixture, hasPalTestFixture } from './pal-test-fixture.js'
import {
  assertR13ItemThrowAugmentationEvidence,
  assertR13ItemThrowFinalTargetClosure,
  augmentR13ItemThrows,
  R13_ITEM_THROW_ALL_TARGET_IDS,
  R13_ITEM_THROW_SENTINEL_IDS,
  R13_ITEM_THROW_TRANSITION_IDS,
} from './r13-item-throw-augmentation.js'
import { stableJsonSha256 } from './stable-json.js'

const describePal = hasPalTestFixture() ? describe : describe.skip

function itemsOf(snapshot: ReturnType<typeof getPalTestGeneratedFixture>['generated']['snapshot']) {
  const value = snapshot.files.get('content/items.json')
  if (!Array.isArray(value)) throw new Error('PAL R13 item throw fixture 缺 items')
  return new Map((value as unknown as ItemDataV5[]).map((item) => [item.id, item]))
}

function mutatedThrowCommands(
  fixture: ReturnType<typeof getPalTestGeneratedFixture>,
  itemId: number,
  opcode: number,
  mutate: (operands: number[], address: number) => void,
): SourceCmd[] {
  const item = fixture.sources.migrate.items.find((candidate) => candidate.id === itemId)
  if (!item) throw new Error(`PAL R13 item throw fixture 缺 item ${itemId}`)
  const commands = structuredClone(fixture.sourceCommands)
  for (let address = item.scriptOnThrow; address < commands.length; address++) {
    const command = commands[address]!
    if (command.op === 'end') break
    if (command.op === 'raw' && command.opcode === opcode) {
      const operands = [...(command.operands ?? [])]
      mutate(operands, address)
      command.operands = operands
      return commands
    }
  }
  throw new Error(`PAL R13 item throw fixture ${itemId} 缺 opcode 0x${opcode.toString(16)}`)
}

function rebuildWithCommands(
  fixture: ReturnType<typeof getPalTestGeneratedFixture>,
  sourceCommands: readonly SourceCmd[],
): void {
  augmentR13ItemThrows({
    snapshot: fixture.generated.r13CrossActivationParentSnapshot,
    itemSources: fixture.sources.migrate.items,
    magicSources: fixture.sources.migrate.magic,
    objectMagicSources: fixture.sources.migrate.objectMagics ?? [],
    sourceCommands,
    soundAssetForNum: palSoundAssetForSources(fixture.sources),
  })
}

describePal('R13-3 · PAL 76 个投掷源根 source-backed augmentation', () => {
  test('闭合 58 absent + 1 lossy + 17 exact，并锁定目标/哨兵/分族总账', () => {
    const { generated } = getPalTestGeneratedFixture()
    const evidence = generated.itemThrowEvidence
    expect(evidence.summary).toEqual({
      sourceRoots: 76,
      finalRunnableThrows: 76,
      missing: 0,
      restoredAbsent: 58,
      correctedLossy: 1,
      existingExact: 17,
      allTargets: 11,
      oneTargets: 65,
      sentinelPresentationOnly: 29,
      rootObservations: 59,
      pendingObservations: 48,
      silentEmptyObservations: 10,
      lossyObservations: 1,
      openRootObservations: 0,
      familyCounts: {
        '0x42': 10,
        '0x42-0x28': 11,
        '0x42-0x28-0x5e-0x60': 6,
        '0x42-0x2e-0x21': 6,
        '0x64-0x60': 1,
        '0x42-0x5b': 1,
        '0x42-0x21': 7,
        '0x42-0x28-0x21': 1,
        '0x42-0x39': 1,
        '0x66': 32,
      },
    })
    expect(evidence.roots.map((root) => Number(root.itemId))).toEqual(R13_ITEM_THROW_TRANSITION_IDS)
    expect(
      evidence.roots
        .filter((root) => root.target === 'allEnemies')
        .map((root) => Number(root.itemId)),
    ).toEqual(R13_ITEM_THROW_ALL_TARGET_IDS)
    expect(
      evidence.roots
        .filter((root) => root.sentinelPresentationOnly)
        .map((root) => Number(root.itemId)),
    ).toEqual(R13_ITEM_THROW_SENTINEL_IDS)
    expect(evidence.diagnostics.pendingIds).toHaveLength(48)
    expect(evidence.diagnostics.silentEmptyIds).toEqual([
      '66',
      '67',
      '68',
      '69',
      '70',
      '71',
      '115',
      '142',
      '143',
      '146',
    ])
    expect(evidence.diagnostics.correctedIds).toEqual(['133'])
    expect(evidence.observations).toHaveLength(59)
    expect(
      evidence.observations.filter((observation) => observation.kind === 'pending-throw'),
    ).toHaveLength(48)
    expect(
      evidence.observations.filter((observation) => observation.kind === 'silent-empty-throw'),
    ).toHaveLength(10)
    const lossy = evidence.observations.filter(
      (observation) => observation.kind === 'present-lossy-throw',
    )
    expect(lossy).toHaveLength(1)
    expect(lossy[0]).toMatchObject({
      id: 'item:133:present-lossy-throw',
      itemId: '133',
      sourceRootId: 'global/items/133/scriptOnThrow',
      layers: { raw: 'open', augmented: 'accounted', final: 'accounted' },
    })
    expect(lossy[0]?.rawTargetDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(lossy[0]?.normalizedParentTargetDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(lossy[0]?.successorTargetDigest).toMatch(/^[a-f0-9]{64}$/)
    const rawParent133 = itemsOf(generated.r13CrossActivationParentSnapshot).get('133')?.throw
    expect(lossy[0]?.normalizedParentTargetDigest).toBe(
      stableJsonSha256({ ...structuredClone(rawParent133), target: 'oneEnemy' }),
    )
    expect(lossy[0]?.normalizedParentTargetDigest).not.toBe(lossy[0]?.successorTargetDigest)
    const observedIds = new Set(evidence.observations.map((observation) => observation.itemId))
    expect(
      evidence.roots
        .filter((root) => root.parentDisposition === 'present-exact')
        .some((root) => observedIds.has(root.itemId)),
    ).toBe(false)
    assertR13ItemThrowFinalTargetClosure(generated.snapshot, evidence)
  }, 120_000)

  test('逐族定点保留伤害、状态、毒、阈值、吸血和表现语义', () => {
    const { generated } = getPalTestGeneratedFixture()
    const items = itemsOf(generated.snapshot)
    expect(items.get('116')?.throw).toMatchObject({
      target: 'oneEnemy',
      effects: [{ kind: 'applyPoison', poisonId: '552' }],
      presentation: { kind: 'magic' },
    })
    expect(items.get('126')?.throw).toMatchObject({
      target: 'oneEnemy',
      effects: [
        { kind: 'applyStatus', status: 'paralyzed', turns: 4, onResist: 'stopTarget' },
        { kind: 'fixedDamage', amount: 1 },
      ],
    })
    expect(items.get('133')?.throw).toMatchObject({
      target: 'allEnemies',
      effects: [
        {
          kind: 'magicDamage',
          baseDamage: 150,
          element: 'poison',
          strength: { kind: 'fixed', value: 0 },
        },
        { kind: 'applyPoison', poisonId: '551' },
      ],
      presentation: { kind: 'magic' },
    })
    expect(items.get('134')?.throw).toMatchObject({
      target: 'allEnemies',
      effects: [{ kind: 'killIfHpAtMost', percent: 5 }],
    })
    expect(items.get('158')?.throw).toMatchObject({
      target: 'oneEnemy',
      effects: [{ kind: 'damageAndHealCaster', damage: 180, heal: 180 }],
      presentation: { kind: 'magic' },
    })
    expect(items.get('163')?.throw).toMatchObject({
      target: 'oneEnemy',
      effects: [
        {
          kind: 'magicDamage',
          baseDamage: 40,
          strength: {
            kind: 'casterAttack',
            bonus: 160,
            multiplier: { kind: 'uniformInt', min: 0, max: 3 },
          },
        },
      ],
      presentation: { kind: 'magic' },
    })
  })

  test('三件鞭类保留专用鞭影 19，其余 0x66 武器保留铜钱镖轨迹 31', () => {
    const { generated } = getPalTestGeneratedFixture()
    const items = itemsOf(generated.snapshot)
    const effectSprite = (itemId: string): number | undefined => {
      const presentation = items.get(itemId)?.throw?.presentation
      return presentation?.kind === 'magic' ? presentation.animation.effectSprite : undefined
    }

    expect(['163', '164', '165'].map(effectSprite)).toEqual([19, 19, 19])
    expect(Array.from({ length: 29 }, (_, index) => String(index + 166)).map(effectSprite)).toEqual(
      Array.from({ length: 29 }, () => 31),
    )
  })

  test('successor 不反向修改 R13-2 parent 的 18 个 historical throw', () => {
    const { generated } = getPalTestGeneratedFixture()
    const parent = itemsOf(generated.r13CrossActivationParentSnapshot)
    const successor = itemsOf(generated.snapshot)
    expect([...parent.values()].filter((item) => item.throw)).toHaveLength(18)
    expect([...successor.values()].filter((item) => item.throw)).toHaveLength(76)
    expect(parent.get('133')?.throw).not.toHaveProperty('target')
    expect(parent.get('133')?.throw?.effects).toEqual([{ kind: 'applyPoison', poisonId: '551' }])
  })

  test.each([
    {
      label: '0x42 显式目标覆盖',
      itemId: 133,
      opcode: 0x42,
      mutate: (operands: number[]) => {
        operands[2] = 1
      },
      error: /0x42 含显式目标覆盖/,
    },
    {
      label: '0x2e 失败跳转落入玩法指令',
      itemId: 126,
      opcode: 0x2e,
      mutate: (operands: number[], address: number) => {
        operands[2] = address + 1
      },
      error: /0x2e 失败跳转.*非终止表现指令/,
    },
    {
      label: '0x64 失败跳转落入处决指令',
      itemId: 134,
      opcode: 0x64,
      mutate: (operands: number[], address: number) => {
        operands[1] = address + 1
      },
      error: /0x64 失败跳转.*非终止表现指令/,
    },
    {
      label: '0x5e 配对毒与 PoisonDef 不一致',
      itemId: 122,
      opcode: 0x5e,
      mutate: (operands: number[]) => {
        operands[0] = 551
      },
      error: /0x5e 配对毒.*lethalWith.*不一致/,
    },
    {
      label: '0x5e 失败臂未直接终止',
      itemId: 122,
      opcode: 0x5e,
      mutate: (operands: number[], address: number) => {
        operands[1] = address + 1
      },
      error: /0x5e 失败臂必须直接终止/,
    },
  ])('源操作数漂移 $label 时 fail-closed', ({ itemId, opcode, mutate, error }) => {
    const fixture = getPalTestGeneratedFixture()
    const commands = mutatedThrowCommands(fixture, itemId, opcode, mutate)
    expect(() => rebuildWithCommands(fixture, commands)).toThrow(error)
  })

  test.each([
    { itemId: 126, opcode: 0x2e, feedback: '攻击无效' },
    { itemId: 134, opcode: 0x64, feedback: '无任何效果' },
  ])('item $itemId 的失败提示 "$feedback" 漂移时 fail-closed', ({ itemId, opcode }) => {
    const fixture = getPalTestGeneratedFixture()
    const commands = structuredClone(fixture.sourceCommands)
    const item = fixture.sources.migrate.items.find((candidate) => candidate.id === itemId)
    if (!item) throw new Error(`PAL R13 item throw fixture 缺 item ${itemId}`)
    const row = commands.find(
      (command, address) =>
        address >= item.scriptOnThrow && command.op === 'raw' && command.opcode === opcode,
    )
    if (!row || row.op !== 'raw') throw new Error(`PAL R13 item throw fixture ${itemId} 缺失败跳转`)
    const target = row.operands?.[opcode === 0x2e ? 2 : 1]
    if (!target || commands[target + 1]?.op !== 'showDialog')
      throw new Error(`PAL R13 item throw fixture ${itemId} 缺失败提示`)
    commands[target + 1] = { ...commands[target + 1]!, text: '漂移后的提示' }
    expect(() => rebuildWithCommands(fixture, commands)).toThrow(/失败提示漂移/)
  })

  test('自洽重签 disposition observation 漂移仍被结构守恒拒绝', () => {
    const evidence = structuredClone(getPalTestGeneratedFixture().generated.itemThrowEvidence)
    evidence.observations[0]!.sourceRootId = 'global/items/ghost/scriptOnThrow'
    const { digest: _digest, ...body } = evidence
    evidence.digest = stableJsonSha256(body)
    expect(() => assertR13ItemThrowAugmentationEvidence(evidence)).toThrow(
      /disposition observation.*与 root 漂移/,
    )
  })
})
