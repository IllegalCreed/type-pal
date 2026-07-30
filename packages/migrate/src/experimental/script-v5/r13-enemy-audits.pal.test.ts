import { validateEnemies } from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import {
  getPalTestCurrentV10Fixture,
  getPalTestGeneratedFixture,
  hasPalTestFixture,
} from './pal-test-fixture.js'
import {
  assertR13EnemyScriptFinalTargetClosure,
  augmentR13EnemyScriptsAfterConfirm,
  R13_ENEMY_SCRIPT_LOCALE_DELTA,
  R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST,
} from './r13-enemy-script-augmentation.js'
import {
  assertR13EnemySourceDispositionFromPal,
  buildR13EnemySourceDispositionFromPal,
} from './r13-enemy-source-disposition.js'
import {
  assertR13RuntimeCapabilityAuditV3,
  auditR13RuntimeCapabilitiesV3,
} from './runtime-capability-audit-v3.js'
import { digestR13ContentSnapshot } from './source-instruction-disposition.js'
import { stableJsonSha256 } from './stable-json.js'

function currentEnemySnapshot(): {
  generated: ReturnType<typeof getPalTestGeneratedFixture>
  current: ReturnType<typeof getPalTestCurrentV10Fixture>
  final: MigrationSnapshot
} {
  const generated = getPalTestGeneratedFixture()
  const current = getPalTestCurrentV10Fixture()
  const enemies = current.migration.files.get('content/enemies.json')
  if (!enemies) throw new Error('R13-5 PAL enemy audit: current enemies 缺失')
  const files = new Map(generated.generated.snapshot.files)
  files.set('content/enemies.json', structuredClone(enemies))
  return {
    generated,
    current,
    final: {
      files,
      managedFiles: new Set(generated.generated.snapshot.managedFiles),
    },
  }
}

describe.skipIf(!hasPalTestFixture())('R13-5 PAL full-path enemy audits', () => {
  let fixture: ReturnType<typeof currentEnemySnapshot>

  beforeAll(() => {
    fixture = currentEnemySnapshot()
  })

  test('完整 PAL 敌人数据通过 source disposition 与 runtime capability v3', () => {
    const { current, final } = fixture
    const enemies = validateEnemies(final.files.get('content/enemies.json'))
    expect(enemies.filter((enemy) => enemy.ai.resistanceToSorcery === 10)).toHaveLength(30)

    const dispositionArgs = {
      sources: current.sources,
      migration: current.migration,
      final,
    }
    const disposition = buildR13EnemySourceDispositionFromPal(dispositionArgs)
    assertR13EnemySourceDispositionFromPal(disposition, dispositionArgs)

    const capabilities = auditR13RuntimeCapabilitiesV3(final)
    assertR13RuntimeCapabilityAuditV3(capabilities, final)
    expect(capabilities.issues).toEqual([])
    expect(capabilities.inventory.enemies).toBe(153)
  }, 120_000)

  test('successor 只替换 enemies、增加五个 locale 键并删除八份旧遭遇演出', () => {
    const { generated, current } = fixture
    const augmentation = augmentR13EnemyScriptsAfterConfirm({
      parent: generated.generated.snapshot,
      historicalMigration: generated.migration,
      currentSources: current.sources,
      currentMigration: current.migration,
    })
    expect(augmentation.evidence.summary).toEqual({
      enemies: 153,
      resistanceTenEnemies: 30,
      localeAdded: 5,
      localeDeleted: 0,
      localeChanged: 0,
      encounterChoreographyRemoved: 8,
      changedScenes: 6,
      changedFiles: 8,
    })
    expect(augmentation.evidence.files.changedPaths).toEqual([
      'content/enemies.json',
      'content/locale.json',
      'content/scenes/s003.json',
      'content/scenes/s021.json',
      'content/scenes/s086.json',
      'content/scenes/s093.json',
      'content/scenes/s106.json',
      'content/scenes/s138.json',
    ])
    expect(augmentation.evidence.localeDelta).toEqual(R13_ENEMY_SCRIPT_LOCALE_DELTA)
    expect(augmentation.evidence.encounterCleanup).toHaveLength(8)
    expect(augmentation.enemySourceDisposition.summary).toMatchObject({
      totalSites: 39,
      cursorTraceStates: 25,
      cursorTraceEdges: 26,
    })
    expect(augmentation.runtimeCapability.issues).toEqual([])
    expect(stableJsonSha256(augmentation.snapshot.files.get('content/skills.json'))).toBe(
      stableJsonSha256(generated.generated.snapshot.files.get('content/skills.json')),
    )
    expect(digestR13ContentSnapshot(generated.generated.snapshot)).toBe(
      R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST,
    )
    assertR13EnemyScriptFinalTargetClosure(augmentation.snapshot, augmentation.evidence)
  }, 120_000)
})
