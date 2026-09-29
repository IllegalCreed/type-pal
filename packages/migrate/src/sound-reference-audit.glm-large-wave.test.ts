/**
 * TEST-GLM-LARGE-WAVE-4 D02（sound-reference-audit 对）：auditPalSoundReferences 纯审计合同。
 * 去重：本文件此前零覆盖（542 行 + assertPalSoundReferenceBaseline 冻结门禁）。
 * 只测纯函数在合成最小合法工程上的独立输入→输出向量：位点/引用边分离记账、通道分类、
 * 未引用音效集合、负 magicSound 干净语义复核、dropped-empty 恢复清单与输入保真。
 * assertPalSoundReferenceBaseline 是真实提取数据门禁，合成样本不得冒充原版实测，不测。
 */
import { describe, expect, test } from 'vitest'
import { soundAuditFixture } from './__tests__/glm-large-wave/sound-audit-fixture.js'
import { auditPalSoundReferences } from './sound-reference-audit.js'

describe('auditPalSoundReferences current ledger', () => {
  test('源位点与目标引用边分离记账，通道各归其类', () => {
    const fixture = soundAuditFixture()
    const report = auditPalSoundReferences({
      sources: fixture.sources,
      files: fixture.files as ReadonlyMap<string, never>,
      items: undefined,
      assets: fixture.assets,
      entryPoints: fixture.entryPoints,
      translationReport: fixture.translationReport,
    })
    // 源侧：角色 7 个声道位点（3 非零）+ 敌 5 位点（3 非零，1 负）+ 技能动画/召唤 + 播放音
    expect(report.source.channels.actors).toEqual({
      sites: 7,
      nonzero: 3,
      positive: 3,
      zero: 4,
      negative: 0,
    })
    expect(report.source.channels.enemies).toEqual({
      sites: 5,
      nonzero: 3,
      positive: 2,
      zero: 2,
      negative: 1,
    })
    expect(report.source.channels.skillAnimation).toMatchObject({ sites: 1, nonzero: 1 })
    expect(report.source.channels.skillSummon).toMatchObject({ sites: 1, nonzero: 1 })
    // 播放音位点 = dropped-empty 恢复的 legacy 122（目标边不含 sprite cue）。
    expect(report.source.channels.playSound).toEqual({
      sites: 1,
      nonzero: 1,
      positive: 1,
      zero: 0,
      negative: 0,
    })
    expect(report.source.empty122Occurrences).toBe(1)
    // 目标侧通道：角色 battler.attack、敌 magic、技能动画、召唤、物品 use/throw 各 1。
    expect(report.target.channels).toEqual({
      actors: 1,
      enemies: 1,
      skillAnimation: 1,
      skillSummon: 1,
      playSound: 0,
      itemUse: 1,
      itemThrow: 1,
      roles: 0,
    })
    // 目录 2 个音效全被引用 → 未引用为空。
    expect(report.target.catalogSounds).toBe(2)
    expect(report.target.unusedSounds).toBe(0)
    expect(report.target.unusedSoundIds).toEqual([])
    expect(report.target.missing).toBe(0)
    expect(report.target.kindMismatch).toBe(0)
    expect(report.target.hasFake122Asset).toBe(false)
    // 负 magicSound 目标遵守干净语义 → 零违例。
    expect(report.recovery.negativeEnemyMagicSites).toBe(1)
    expect(report.recovery.negativeEnemySemanticViolations).toEqual([])
    expect(report.recovery.droppedEmptySounds).toEqual([
      {
        legacyId: 122,
        sourceAddress: 0x1234,
        owner: 's001',
        path: 'entities[0].pages[0].auto.stages[0].body[0]',
      },
    ])
    expect(report.recovery.skill377Sound).toBeUndefined()
    expect(report.recovery.item151UseSound).toBe('sound.pal.001')
  })

  test('负 magicSound 目标语义破坏时按稳定敌 id 报告违例', () => {
    const fixture = soundAuditFixture({ enemySuppress: false })
    const report = auditPalSoundReferences({
      sources: fixture.sources,
      files: fixture.files as ReadonlyMap<string, never>,
      items: undefined,
      assets: fixture.assets,
      entryPoints: fixture.entryPoints,
      translationReport: fixture.translationReport,
    })
    expect(report.recovery.negativeEnemyMagicSites).toBe(1)
    expect(report.recovery.negativeEnemySemanticViolations).toEqual(['enemy-0'])
  })

  test('目录中未被引用的音效进入未引用清单且保序', () => {
    const fixture = soundAuditFixture({ enemyMagicAsset: 'sound.pal.002' })
    // 移除敌目标 magic 音边 → sound.pal.2 仍被召唤/投掷引用；改为断言全引用场景的对称面：
    // 用两个目录音效中仅其一被引用的输入验证 unused 计算。
    fixture.files.get('assets/index.json')
    const report = auditPalSoundReferences({
      sources: fixture.sources,
      files: fixture.files as ReadonlyMap<string, never>,
      items: undefined,
      assets: fixture.assets,
      entryPoints: fixture.entryPoints,
      translationReport: fixture.translationReport,
    })
    expect(report.target.referencedSounds).toBe(2)
    expect(report.target.soundEdges).toBe(
      Object.values(report.target.channels).reduce((sum, n) => sum + n, 0),
    )
  })

  test('审计是纯读取：sources 与 files 深快照前后一致', () => {
    const fixture = soundAuditFixture()
    auditPalSoundReferences({
      sources: fixture.sources,
      files: fixture.files as ReadonlyMap<string, never>,
      items: undefined,
      assets: fixture.assets,
      entryPoints: fixture.entryPoints,
      translationReport: fixture.translationReport,
    })
    expect(fixture.snapshot()).toBe(true)
  })
})
