import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { EnemyDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  mapEnemies,
  mapEnemyTeams,
  type SourceEnemy,
  type SourceEnemyObject,
  type SourceEnemyTeam,
} from '../../migrate-enemies.js'
import { applyPalBossEncounterOverlay } from '../../pal-boss-overlay.js'
import type { SourceCmd } from '../../source-facts.js'
import { emptyTranslateReport, type TranslateCtx } from '../../translate-events.js'
import {
  assertR13EnemySourceDisposition,
  buildR13EnemySourceDisposition,
  R13_ENEMY_LEGACY_DEBT_ORACLE,
  R13_ENEMY_MANDATORY_NON_PENDING_ORACLE,
  R13_ENEMY_REVIEWER_SILENT_ORACLE,
} from './r13-enemy-source-disposition.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const extracted = resolve(repo, 'data/extracted/events/all.json')

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(resolve(repo, relative), 'utf8')) as T
}

function fixture() {
  const commands = readJson<{ segments: { commands: SourceCmd[] }[] }>(
    'data/extracted/events/all.json',
  ).segments.flatMap((segment) => segment.commands)
  const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
  commands.forEach((_, address) => labelAt.set(`L_${address}`, { cmds: commands, idx: address }))
  const context: TranslateCtx = {
    labelAt,
    sourceAddressAt: (source, index) => (source === commands ? index : undefined),
    locale: {},
    report: emptyTranslateReport(),
  }
  const enemyObjects = readJson<SourceEnemyObject[]>('data/extracted/data/enemy-objects.json')
  const migrated = mapEnemies(
    readJson<SourceEnemy[]>('data/extracted/data/enemies.json'),
    enemyObjects,
    context,
  )
  const teams = mapEnemyTeams(
    readJson<SourceEnemyTeam[]>('data/extracted/data/enemy-teams.json'),
    new Set(migrated.enemies.map((enemy) => enemy.id)),
  ).teams
  const hookSources = migrated.report.hookSources
  if (!hookSources) throw new Error('current v10 migration 缺 hookSources')
  const overlay = applyPalBossEncounterOverlay(migrated.enemies, teams, {})
  const args = {
    commands,
    enemyObjects,
    hookSources,
    rawEnemies: migrated.enemies,
    overlayEnemies: overlay.enemies,
    finalEnemies: structuredClone(overlay.enemies) as EnemyDef[],
  }
  const report = buildR13EnemySourceDisposition(args)
  return { migrated, hookSources, overlay, args, report }
}

describe.skipIf(!existsSync(extracted))('R13-5 enemy source disposition', () => {
  const data = fixture()

  test('冻结 31 个历史 debt，并分列 1 个强制 site 与 7 个 reviewer silent', () => {
    expect(R13_ENEMY_LEGACY_DEBT_ORACLE).toHaveLength(31)
    expect(R13_ENEMY_MANDATORY_NON_PENDING_ORACLE).toHaveLength(1)
    expect(R13_ENEMY_REVIEWER_SILENT_ORACLE).toHaveLength(7)
    assertR13EnemySourceDisposition(data.report, data.args)
    expect(data.report.summary).toEqual({
      legacyDebtSites: 31,
      mandatoryNonPendingSites: 1,
      reviewerSilentSites: 7,
      totalSites: 39,
      cursorTraceOwners: 1,
      cursorTraceStates: 25,
      cursorTraceEdges: 26,
      legacyPendingEnemies: 12,
      legacyPendingRoots: 16,
      legacyPendingExecutionSites: 356,
      byDisposition: { translated: 35, equivalent: 3, unreachable: 1 },
      scriptedEnemies: 54,
      hookOwners: 44,
      hookRoots: 52,
      battleEndRoots: 15,
      totalRoots: 67,
      rawEnemies: 153,
      overlayEnemies: 153,
      finalEnemies: 153,
    })
    expect(data.report.sites.filter((site) => site.scope === 'legacy-debt')).toHaveLength(31)
    expect(
      data.report.sites.find(
        (site) => site.enemyId === 'enemy-435' && site.sourceAddress === 41555,
      ),
    ).toMatchObject({ disposition: 'unreachable', sourceInClosure: false })
    expect(
      data.report.sites.find(
        (site) => site.enemyId === 'enemy-422' && site.sourceAddress === 42634,
      ),
    ).toMatchObject({ disposition: 'equivalent', sourceInClosure: true })
    expect(data.report.legacyPendingRoots).toHaveLength(16)
    expect(
      data.report.legacyPendingRoots.reduce(
        (total, root) => total + root.sourceAddresses.length,
        0,
      ),
    ).toBe(356)
    expect(
      data.report.legacyPendingRoots.find(
        (root) => root.enemyId === 'enemy-519' && root.channel === 'battleEnd',
      ),
    ).toMatchObject({
      rootAddress: 42424,
      sourceAddresses: [42424, 42425, 42426, 42427],
      targetSelectors: ['content/enemies.json#enemy(enemy-519).onDefeated'],
    })
  })

  test('enemy-519 初始成长后保留 25-state 持久游标环', () => {
    const trace = data.report.cursorTraces[0]
    expect(trace).toMatchObject({
      enemyId: 'enemy-519',
      channel: 'turnStart',
      rootAddress: 42237,
      bootstrap: {
        stateRootAddress: 42299,
        terminatorAddress: 42332,
        nextStateRootAddress: 42333,
      },
    })
    expect(trace?.sourceAddresses).toEqual(Array.from({ length: 51 }, (_, index) => 42332 + index))
    expect(trace?.edges).toHaveLength(25)
    expect(
      trace?.edges
        .filter((edge) => edge.bodySourceAddresses.length === 0)
        .map((edge) => edge.stateRootAddress),
    ).toEqual([42339, 42368, 42377])
    expect(
      trace?.edges.find((edge) => edge.stateRootAddress === 42358)?.bodySourceAddresses,
    ).toEqual([42358, 42359, 42360])
    expect(
      trace?.edges.find((edge) => edge.stateRootAddress === 42378)?.bodySourceAddresses,
    ).toEqual([42378, 42379])
    expect(trace?.edges.at(-1)).toMatchObject({
      stateRootAddress: 42381,
      terminatorAddress: 42382,
      nextStateRootAddress: 42333,
    })
    expect(trace?.layers.raw.digest).toBe(trace?.layers.final.digest)
  })

  test('每条可达 hook 源指令都有生成节点映射，473/546/496 均有精确 target', () => {
    for (const owner of data.hookSources)
      for (const hook of Object.values(owner.hooks)) {
        if (!hook) continue
        expect(hook.sourceMappings.map((mapping) => mapping.sourceAddress)).toEqual(
          hook.reachableSourceAddresses,
        )
      }
    for (const [enemyId, sourceAddresses] of [
      ['enemy-473', [42524, 42545, 42554]],
      ['enemy-496', [41432]],
      ['enemy-546', [42953, 43006, 43009, 43012]],
    ] as const) {
      const sites = data.report.sites.filter((site) => site.enemyId === enemyId)
      expect(sites.map((site) => site.sourceAddress).sort((a, b) => a - b)).toEqual(sourceAddresses)
      expect(sites.every((site) => site.targetSelectors.length > 0)).toBe(true)
    }
  })

  test('boss overlay 不再搬走 source-owned hook，raw/overlay/final 三层逐 target 同 digest', () => {
    expect(data.overlay.attached).toBe(0)
    expect(data.overlay.clearedEnemies).toEqual([])
    for (const id of ['enemy-478', 'enemy-485', 'enemy-496']) {
      const raw = data.migrated.enemies.find((enemy) => enemy.id === id)
      const projected = data.overlay.enemies.find((enemy) => enemy.id === id)
      expect(projected?.ai.hooks).toEqual(raw?.ai.hooks)
    }
    for (const site of data.report.sites) {
      expect(site.layers.overlay.digest).toBe(site.layers.raw.digest)
      expect(site.layers.final.digest).toBe(site.layers.raw.digest)
      expect(site.layers.raw.selectors).toEqual(site.targetSelectors)
      expect(site.targetSelectors.every((selector) => !selector.includes('['))).toBe(true)
    }
  })

  test('473 outcome、546 十四臂与 496 两臂均保留稳定 state 结构', () => {
    const enemy473 = data.args.rawEnemies.find((enemy) => enemy.id === 'enemy-473')
    const ready473 = enemy473?.ai.hooks?.ready
    for (const address of [42524, 42545, 42554]) {
      const state = ready473?.states[`state-L_${address}`]
      expect(state?.body[0]).toMatchObject({
        kind: 'effect',
        id: `effect-${address}`,
      })
      expect(state?.next).toMatchObject({
        kind: 'commandOutcome',
        commandId: `effect-${address}`,
        outcome: 'succeeded',
      })
    }

    const enemy546 = data.args.rawEnemies.find((enemy) => enemy.id === 'enemy-546')
    const ready546 = enemy546?.ai.hooks?.ready
    expect(ready546?.states.initial?.next).toEqual({
      kind: 'advance',
      state: 'state-L_42949',
    })
    expect(ready546?.states['state-L_42949']?.next).toEqual({
      kind: 'advance',
      state: 'state-L_42951',
    })
    expect(ready546?.states['state-L_42951']?.next).toEqual({
      kind: 'advance',
      state: 'state-L_42953',
    })
    const random = ready546?.states['state-L_42953']?.next
    expect(random?.kind).toBe('random')
    if (random?.kind !== 'random') throw new Error('fixture 缺 enemy-546 0xA2 random')
    expect(random.choices).toHaveLength(14)
    for (const address of [43006, 43009, 43012])
      expect(ready546?.states[`state-L_${address}`]?.next.kind).toBe('commandOutcome')

    const enemy496 = data.args.rawEnemies.find((enemy) => enemy.id === 'enemy-496')
    const branch496 = enemy496?.ai.hooks?.turnStart?.states.initial?.next
    expect(branch496).toMatchObject({
      kind: 'branch',
      cond: { kind: 'playerInParty', role: 'gai-luojiao' },
      then: { kind: 'continue', state: 'state-L_41473' },
      else: { kind: 'continue', state: 'state-L_41433' },
    })
  })

  test('独立 closure、不可达证明和 overlay state 篡改均 fail-closed', () => {
    const closureDrift = structuredClone(data.args) as typeof data.args
    const source473 = closureDrift.hookSources.find((owner) => owner.id === 'enemy-473')?.hooks
      .ready
    if (!source473) throw new Error('fixture 缺 enemy-473 hook source')
    source473.reachableSourceAddresses.pop()
    expect(() => buildR13EnemySourceDisposition(closureDrift)).toThrow(
      'translator/source census 闭包漂移',
    )

    const reachabilityDrift = structuredClone(data.args) as typeof data.args
    const end41554 = reachabilityDrift.commands[41554]
    if (end41554?.op !== 'end') throw new Error('fixture L_41554 不是 END')
    ;(end41554 as SourceCmd & { advance?: boolean }).advance = true
    expect(() => buildR13EnemySourceDisposition(reachabilityDrift)).toThrow(
      'translator/source census 闭包漂移',
    )

    const overlayDrift = structuredClone(data.args) as typeof data.args
    const state42524 = overlayDrift.overlayEnemies.find((enemy) => enemy.id === 'enemy-473')?.ai
      .hooks?.ready?.states['state-L_42524']
    if (!state42524) throw new Error('fixture 缺 enemy-473 state-L_42524')
    state42524.next = { kind: 'stay' }
    expect(() => buildR13EnemySourceDisposition(overlayDrift)).toThrow(
      'raw/overlay/final target 漂移',
    )
  })

  test('final hook 删除或换臂会 fail-closed，不可只靠 pendingScripts=[] 过门', () => {
    const deleted = structuredClone(data.args) as typeof data.args
    const enemy496 = deleted.finalEnemies.find((enemy) => enemy.id === 'enemy-496')
    if (!enemy496?.ai.hooks) throw new Error('fixture 缺 enemy-496 hook')
    delete enemy496.ai.hooks.turnStart
    expect(() => buildR13EnemySourceDisposition(deleted)).toThrow(
      'enemy-496.ai.hooks.turnStart 不存在',
    )

    const changed = structuredClone(data.args) as typeof data.args
    const enemy547 = changed.finalEnemies.find((enemy) => enemy.id === 'enemy-547')
    const initial = enemy547?.ai.hooks?.ready?.states.initial
    if (!initial) throw new Error('fixture 缺 enemy-547 ready initial')
    initial.next = { kind: 'stay' }
    expect(() => buildR13EnemySourceDisposition(changed)).toThrow('raw/overlay/final target 漂移')

    const randomChanged = structuredClone(data.args) as typeof data.args
    const random = randomChanged.finalEnemies.find((enemy) => enemy.id === 'enemy-546')?.ai.hooks
      ?.ready?.states['state-L_42953']?.next
    if (random?.kind !== 'random') throw new Error('fixture 缺 enemy-546 random')
    random.choices.pop()
    expect(() => buildR13EnemySourceDisposition(randomChanged)).toThrow(
      'raw/overlay/final target 漂移',
    )

    const cursorChanged = structuredClone(data.args) as typeof data.args
    const cursorState = cursorChanged.finalEnemies.find((enemy) => enemy.id === 'enemy-519')?.ai
      .hooks?.turnStart?.states['state-L_42378']
    if (!cursorState) throw new Error('fixture 缺 enemy-519 state-L_42378')
    cursorState.body.pop()
    expect(() => buildR13EnemySourceDisposition(cursorChanged)).toThrow(
      'state-L_42378 body 长度漂移',
    )
  })
})
