import { type SkillData, validateEnemies, validateSkills } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { realFrame, wfEnemy } from '../__tests__/battle-workflows/catalog.js'
import {
  installTrialChromeHost,
  readyTrialFixture,
} from '../__tests__/coverage-wave2/b-trial-catalog.js'
import { prepareBattleTrialAssets } from '../battle-trial-assets.js'
import { battleTrialRevision } from '../battle-trial-prepare.js'
import { loadCurrentProjectFrom } from '../project-loader.js'
import {
  battleFireChunks,
  collectBattleSkillFireUses,
  prepareBattleFireSprites,
} from './battle-fire-readiness.js'
import { collectBattleEnemyDependencies } from './enemy-closure.js'

function skill(id: string, chunk: number): SkillData {
  return {
    id,
    name: id,
    desc: '',
    cost: { mp: 2 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 10, elemental: 0 }],
    animation: { effectSprite: chunk },
  }
}

test('checks each playback of one shared sheet, using one pass for a friendly normal spell', async () => {
  const animation = { effectSprite: 0, speed: -4, effectTimes: 1024 }
  const heal: SkillData = {
    ...skill('heal', 0),
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 10 }],
    animation,
  }
  const strike = { ...skill('strike', 0), animation }
  validateSkills({ skills: [heal, strike], levelUp: {} })
  const input = {
    cooperativeSkillIds: [],
    reachableEnemySkillIds: [],
    skillsById: { heal, strike },
  }
  const loaded = { frames: [realFrame()], anchorX: 0, anchorY: 0 }
  const read = vi.fn(async () => loaded)
  const healing = collectBattleSkillFireUses({ ...input, playerSkillIds: [['heal']] })
  await expect(prepareBattleFireSprites(healing, read)).resolves.toEqual({ 0: loaded })
  read.mockClear()
  const both = collectBattleSkillFireUses({ ...input, playerSkillIds: [['heal', 'strike']] })
  await expect(prepareBattleFireSprites(both, read)).rejects.toThrow(
    '技能 "strike" 的玩家特效: 1025 帧超过 1024 帧',
  )
  expect(read).toHaveBeenCalledExactlyOnceWith(0)
})

test('includes enemy FIRE overrides from AI rules, both fallbacks, and hook summons', () => {
  const caster = wfEnemy('caster', {}, { sounds: {} })
  caster.ai.rules = [{ at: 'act', do: { kind: 'cast', skillId: 'rule' } }]
  caster.ai.fallback = { action: { kind: 'cast', skillId: 'fallback' }, chancePercent: 20 }
  caster.ai.hooks = {
    ready: {
      initial: 'ready',
      states: {
        ready: {
          body: [
            {
              kind: 'effect',
              id: 'summon-caster',
              effect: { kind: 'summon', enemyId: 'summoned', count: 1 },
            },
            {
              kind: 'setFallback',
              fallback: {
                action: { kind: 'cast', skillId: 'hook-fallback' },
                chancePercent: 30,
              },
            },
          ],
          next: { kind: 'stay' },
        },
      },
    },
  }
  const summoned = wfEnemy('summoned', {}, { sounds: {} })
  summoned.ai.rules = [{ at: 'act', do: { kind: 'cast', skillId: 'summoned-skill' } }]
  const enemies = validateEnemies([caster, summoned])
  const { skills } = validateSkills({
    skills: ['rule', 'fallback', 'hook-fallback', 'summoned-skill'].map((id, index) => ({
      ...skill(id, index + 1),
      execution: { enemy: { animation: { effectSprite: index + 13 } } },
    })),
    levelUp: {},
  })

  const { skillIds: reachableEnemySkillIds } = collectBattleEnemyDependencies(
    [caster],
    Object.fromEntries(enemies.map((enemy) => [enemy.id, enemy])),
  )
  expect(reachableEnemySkillIds).toEqual(['rule', 'fallback', 'hook-fallback', 'summoned-skill'])
  expect(
    battleFireChunks(
      collectBattleSkillFireUses({
        playerSkillIds: [],
        cooperativeSkillIds: [],
        reachableEnemySkillIds,
        skillsById: Object.fromEntries(skills.map((definition) => [definition.id, definition])),
      }),
    ),
  ).toEqual(new Set([13, 14, 15, 16]))
})

test.each([
  'player',
  'cooperative',
  'enemy',
] as const)('%s FIRE closure excludes only the resolved no-effect marker, preserves zero and real chunks', (route) => {
  const side = route === 'enemy' ? 'enemy' : 'player'
  const other = side === 'enemy' ? 'player' : 'enemy'
  const off = skill('override-off', 9)
  off.execution = {
    [side]: { animation: { effectSprite: 65535 } },
    [other]: { animation: { effectSprite: 11 } },
  }
  const on = skill('override-on', 65535)
  on.execution = { [side]: { animation: { effectSprite: 0 } } }
  const definitions = [skill('none', 65535), skill('zero', 0), skill('normal', 7), off, on]
  validateSkills({ skills: definitions, levelUp: {} })
  const ids = definitions.map((entry) => entry.id)
  const input = {
    playerSkillIds: route === 'player' ? [ids] : [],
    cooperativeSkillIds: route === 'cooperative' ? ids : [],
    reachableEnemySkillIds: route === 'enemy' ? ids : [],
    skillsById: Object.fromEntries(definitions.map((entry) => [entry.id, entry])),
  }
  const before = structuredClone(input)
  expect(battleFireChunks(collectBattleSkillFireUses(input))).toEqual(new Set([0, 7]))
  expect(input).toEqual(before)
})

test.each([
  0, 65535, 12345,
])('real trial readiness treats effect %i as zero asset, no bitmap, or a genuine missing asset', async (chunk) => {
  const fixture = await readyTrialFixture()
  const data = { skills: [skill('trial-spark', chunk)], levelUp: {} }
  validateSkills(data)
  fixture.files['content/skills.json'] = data
  const project = await loadCurrentProjectFrom(fixture.project.source)
  const revision = await battleTrialRevision(project)
  const before = structuredClone(fixture.files)
  const host = installTrialChromeHost(fixture.faceHash)
  let ready: Awaited<ReturnType<typeof prepareBattleTrialAssets>> | undefined
  try {
    const pending = prepareBattleTrialAssets(
      project,
      fixture.config,
      fixture.token,
      new AbortController().signal,
      revision,
    )
    if (chunk === 12345) {
      await expect(pending).rejects.toThrow('effect-sprite.pal.magic.12345')
    } else {
      ready = await pending
      expect(ready.prepared.players[0]?.skills).toEqual(['trial-spark'])
      expect(Object.keys(ready.assets.fireSprites)).toEqual(chunk === 0 ? ['0'] : [])
      if (chunk === 0) expect(ready.assets.fireSprites[0]?.frames.length).toBeGreaterThan(0)
    }
    expect(fixture.files).toEqual(before)
  } finally {
    ready?.dispose()
    host.restore()
  }
})
