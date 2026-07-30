import { describe, expect, test } from 'vitest'
import { buildP2ScriptMigrationIR } from './p2-transform.js'
import {
  getPalTestCoreFixture,
  getPalTestCurrentV10Fixture,
  getPalTestGeneratedFixture,
  hasPalTestFixture,
} from './pal-test-fixture.js'
import { digestR13ContentSnapshot } from './source-instruction-disposition.js'
import { stableJsonSha256 } from './stable-json.js'

describe.skipIf(!hasPalTestFixture())('R13-5 historical enemy parent authority', () => {
  test('历史 parent 精确重放 frozen P0、31 条旧债与 8 处 boss overlay', () => {
    const historical = getPalTestCoreFixture()
    const raw = historical.rawMigration
    const file = (path: string) => {
      const value = raw.files.get(path)
      if (value === undefined) throw new Error(`historical pin 缺 ${path}`)
      return value
    }
    expect(historical.currentAudit).toEqual(historical.frozenAudit)
    expect(historical.currentAudit.digest).toBe(
      'dd42217c87ece120140dd302e735460cc48b2570fd993e2c35d614bbc0303004',
    )
    expect(historical.rawMigration.report.enemies?.pendingScripts).toHaveLength(12)
    expect(
      historical.rawMigration.report.enemies?.pendingScripts.reduce(
        (total, owner) => total + owner.notes.length,
        0,
      ),
    ).toBe(31)
    expect(historical.rawMigration.report.enemies).not.toHaveProperty('hookSources')
    expect(historical.rawMigration.report.bossOverlay).toEqual({
      attached: 8,
      clearedEnemies: ['enemy-435', 'enemy-454', 'enemy-478', 'enemy-485', 'enemy-496'],
    })
    expect(digestR13ContentSnapshot(raw)).toBe(
      '8df37da1242882ff1ff1e5732b0f2077fa6692e6323cabceb9d2c91f02345010',
    )
    expect(
      stableJsonSha256({
        snapshot: digestR13ContentSnapshot(raw),
        report: raw.report.rawContent,
        projection: raw.report.rawProjection,
      }),
    ).toBe('82786cee6ba88298c52835869096092c4d86f92f9f838f2db82f733225be8cd5')
    expect(stableJsonSha256(raw.report.rawProjection.enemies)).toBe(
      '3e51488efce61a20d1c942ec7d592c3eb5eb48955d9c857ee400653ed75205c8',
    )
    expect(stableJsonSha256(file('content/enemies.json'))).toBe(
      '28917ea42cb7bc8ca90dcb9268f7c3badbcc3ad1996db9f91d55a33a2ea3a119',
    )
    expect(stableJsonSha256(raw.report.rawProjection.skills)).toBe(
      '4f3c99d5e5f312c8f4c2ba78cff7c3988bb4b4d62017de66295420ad1a984300',
    )
    expect(stableJsonSha256(file('content/skills.json'))).toBe(
      '0aabffe36ebe42266904ad3f114252ab051d5a8e244f838f6bd77f83564ef937',
    )
    expect(stableJsonSha256(file('content/locale.json'))).toBe(
      '68c3bdd2c9de93befd8d7743ac456b2e64d6b5210358cc0f42545678fd7ef5b4',
    )
    expect(stableJsonSha256(raw.report.enemies)).toBe(
      '21172b923c81d06a35487b804c08900e39e5b1153a83981cb28396573824f91e',
    )
    expect(stableJsonSha256(raw.report.audit)).toBe(
      '665a6fa01ab73e0c35f1ea6765bb3ff75f84ff85d2f1738ec4480b16143a9307',
    )
    expect(stableJsonSha256(JSON.parse(JSON.stringify(raw.report.spriteActions)) as unknown)).toBe(
      'd25674c6b1270b9f9e64f57906ce92c59bd2c2a0b2ef033265e7c70488592902',
    )
    expect(stableJsonSha256(file('content/scripts/index.json'))).toBe(
      '9aa0b92d1839ee5155ea2ead54c0ef6241f159035906190614fb6e6702ab7d84',
    )

    const bossPaths = [
      'content/scripts/chunks/scene/s003.json',
      'content/scripts/chunks/scene/s021.json',
      'content/scripts/chunks/scene/s086.json',
      'content/scripts/chunks/scene/s093.json',
      'content/scripts/chunks/scene/s106.json',
      'content/scripts/chunks/scene/s138.json',
      'content/scripts/index.json',
    ] as const
    expect(stableJsonSha256(bossPaths.map((path) => ({ path, value: file(path) })))).toBe(
      '6f4b74711b94809d5249f8e66b6d14a0008140dbca654f13f0011ff897ba8624',
    )

    const oldCastClosure = [
      ...new Set(
        raw.report.rawProjection.enemies.flatMap((enemy) =>
          (enemy.ai.rules ?? []).flatMap((rule) =>
            rule.do.kind === 'cast' ? [Number(rule.do.skillId)] : [],
          ),
        ),
      ),
    ].sort((left, right) => left - right)
    expect(oldCastClosure).toHaveLength(49)
    expect(stableJsonSha256(oldCastClosure)).toBe(
      'f27a3023019822247c3f938bbb4d6b2d16486af3d96c0328f2ea1dd339de01ae',
    )

    const oldIndirectEdges: Array<{
      source: string
      target: string
      kind: 'transform' | 'summon'
    }> = []
    for (const enemy of raw.report.rawProjection.enemies) {
      for (const rule of enemy.ai.rules ?? []) {
        if (rule.do.kind === 'transform')
          oldIndirectEdges.push({
            source: enemy.id,
            target: rule.do.enemyId,
            kind: 'transform',
          })
        else if (rule.do.kind === 'summon')
          oldIndirectEdges.push({
            source: enemy.id,
            target: rule.do.enemyId ?? enemy.id,
            kind: 'summon',
          })
      }
    }
    oldIndirectEdges.sort(
      (left, right) =>
        left.source.localeCompare(right.source) ||
        left.target.localeCompare(right.target) ||
        left.kind.localeCompare(right.kind),
    )
    expect({
      transforms: oldIndirectEdges.filter(({ kind }) => kind === 'transform').length,
      summons: oldIndirectEdges.filter(({ kind }) => kind === 'summon').length,
      total: oldIndirectEdges.length,
    }).toEqual({ transforms: 4, summons: 22, total: 26 })
    expect(stableJsonSha256(oldIndirectEdges)).toBe(
      '0ebf8905b83c9103e75f87a62ecf34e22d4b2553180bd93b7be5f96466da6b10',
    )
  }, 120_000)

  test('current v10 使用独立源快照，不能误喂冻结 P2 parent', () => {
    const historical = getPalTestCoreFixture()
    const current = getPalTestCurrentV10Fixture()
    expect(current.sources).not.toBe(historical.sources)
    expect(current.sources.migrate.commands).not.toBe(historical.sources.migrate.commands)
    expect(current.audit.digest).toBe(
      '8fe4ad1c6dffe273ddbdf5c06a504c34c0e06110dc9bb4696551e908c960a88a',
    )
    expect(current.migration.report.enemies?.pendingScripts).toEqual([])
    expect(current.migration.report.enemies?.hookSources).toHaveLength(44)
    expect(current.migration.report.bossOverlay).toEqual({
      attached: 0,
      clearedEnemies: [],
    })
    expect(() =>
      buildP2ScriptMigrationIR({
        migration: current.migration,
        currentAudit: current.audit,
        frozenAudit: historical.frozenAudit,
      }),
    ).toThrow('P2 current audit differs from frozen P0')
  }, 120_000)

  test('完整 P2 → P7 → r13-confirm 链仍逐层重放发布父层', () => {
    const { generated } = getPalTestGeneratedFixture()
    expect(digestR13ContentSnapshot(generated.r13ConfirmParentSnapshot)).toBe(
      '00e1d1893060745856e6f8ea756261ad57b19c2d6294e854bcd2b0a30faf8c14',
    )
    expect(digestR13ContentSnapshot(generated.r13ConfirmSuccessorSnapshot)).toBe(
      'e019cdc22754b60a12580a77f1a2efa8ec6df9356611058455df5d49e755ae32',
    )
    expect(digestR13ContentSnapshot(generated.snapshot)).toBe(
      'f4b1a1e8be9a2a902e70e88f838b3fa03e433b97f6f802a86ccac3ee822158a2',
    )
    expect(generated.confirmEvidence.digest).toBe(
      '57022d9efa05a970386ba8cef51f787c13a6c488f8d4665a5d5fe623de6f87f7',
    )
    expect(
      stableJsonSha256(generated.r13ConfirmSuccessorSnapshot.files.get('content/locale.json')!),
    ).toBe('27527a116033074fed52c937d484bc15a09cb2120b0929dd16eac83ba41ee22d')
  }, 180_000)
})
