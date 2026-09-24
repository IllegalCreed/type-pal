import { type SkillData, validateSkills } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  installTrialChromeHost,
  readyTrialFixture,
} from '../__tests__/coverage-wave2/b-trial-catalog.js'
import { prepareBattleTrialAssets } from '../battle-trial-assets.js'
import { battleTrialRevision } from '../battle-trial-prepare.js'
import { loadCurrentProjectFrom } from '../project-loader.js'
import { collectBattleSkillFireChunks } from './battle-sprite-readiness.js'

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
  expect(collectBattleSkillFireChunks(input)).toEqual(new Set([0, 7]))
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
