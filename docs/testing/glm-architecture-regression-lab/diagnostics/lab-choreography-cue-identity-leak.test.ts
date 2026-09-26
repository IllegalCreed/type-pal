/**
 * ARCH-REGRESSION-LAB-GLM-1 · reproduced-defect 诊断（R10-1，交 Codex 产品修复）：
 * startBattle.choreography 跨模块边漏传校验选项（author-script-core.ts:712 调
 * checkBattleChoreography 未传 options），导致 author-script.ts:111 注入的
 * checkAuthorDialogueCue（dialog cue 必须带 identity）到不了 choreography 路径：
 *   - 直接 dialog cue 缺 identity → checkAuthorCommands 拒绝（正控行，当前通过）；
 *   - 同一 cue 放进 startBattle.choreography → **被接受**（产品缺陷，下行断言当前失败）。
 * 本诊断按「应有行为」书写并保持失败，直至 Codex 完成产品修复；不得改预期放行。
 * 复跑：npx vitest run --config docs/testing/glm-architecture-regression-lab/configs/diagnostics.vitest.mts
 */

import { checkAuthorCommands } from '@type-pal/content'
import { expect, test } from 'vitest'

const battleWithCue = (cue: unknown) => [
  {
    kind: 'startBattle',
    enemyTeamId: 'team-1',
    choreography: [{ at: 'battleStart', body: [{ kind: 'dialog', cue }] }],
  },
]

test('[reproduced-defect] 直接 dialog cue 缺 identity 被拒（正控：identity 规则生效）', () => {
  expect(() =>
    checkAuthorCommands([{ kind: 'dialog', cue: { rows: [{ text: 'probe' }] } }], 'probe.direct'),
  ).toThrowError(/identity/)
})

test('[reproduced-defect] 同一 cue 经 startBattle.choreography 应同样被拒（当前产品漏检 → 本断言失败）', () => {
  expect(() =>
    checkAuthorCommands(battleWithCue({ rows: [{ text: 'probe' }] }), 'probe.choreo'),
  ).toThrowError(/identity/)
})

test('[reproduced-defect] 补合法 identity 后两路都应通过（缺陷修复不收紧合法域）', () => {
  const cue = { identity: { kind: 'narration' }, rows: [{ text: 'probe' }] }
  expect(() => checkAuthorCommands([{ kind: 'dialog', cue }], 'probe.direct.ok')).not.toThrow()
  expect(() => checkAuthorCommands(battleWithCue(cue), 'probe.choreo.ok')).not.toThrow()
})
