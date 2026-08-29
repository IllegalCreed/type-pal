import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

describe('enemy defeated wording boundary', () => {
  test('敌队不得回流裸命令计数，玩家败北仍保留“战败处理”', () => {
    const teamSource = readFileSync(new URL('./EnemyTeamTab.tsx', import.meta.url), 'utf8')
    const hostileSource = readFileSync(
      new URL('../core/world-variable-references.ts', import.meta.url),
      'utf8',
    )

    expect(teamSource).not.toMatch(/onDefeated\??\.length/)
    expect(teamSource).not.toContain('战败指令')
    expect(hostileSource).toContain('战败处理')
  })
})
