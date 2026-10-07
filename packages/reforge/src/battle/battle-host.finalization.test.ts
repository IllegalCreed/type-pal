// @vitest-environment jsdom
/**
 * TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1：宿主终局流（battle-host.ts，BF-08..BF-10）。
 * 排重：battle-host.test.ts 16 例覆盖宿主生命周期（提交原子性/失效拒绝/取消/恢复竞态/
 * 就绪去重），无 defeat 与 playerFled 终局分配、无胜利曲经验门与 boss 旗传递合同；
 * battle-finalization.world-result.test.ts BF-01..BF-07 覆盖 settle/finish 纯函数层。
 * 本文件以真实装配（真 prepare + 真 BattleHost + 真 settle/finish 端口接线）合同化
 * 宿主层终局编排；装配与收尾纪律见
 * ../__tests__/battle-finalization-reliability/battle-finalization-host-harness.ts。
 *
 * CI 37560425624 / 37585132871：BF-08/BF-09 曾在 untilActive 以固定 100 轮事件循环
 * 轮数作 IO 同步原语而随机红（同次运行中走同一 prepare 链、用 vi.waitFor 的
 * battle-host.test.ts 16 例全绿）。现一律条件 + 默认期限同步。
 */
import { expect, test } from 'vitest'
import {
  foeWith,
  hostHarness,
} from '../__tests__/battle-finalization-reliability/battle-finalization-host-harness.js'

test('BF-08 宿主战败终局：无结算无战后脚本、恢复场景音但不还原音乐、HP 写回 0', async () => {
  const h = await hostHarness({ enemy: foeWith({ health: 5000, attackStrength: 200 }) })
  try {
    const op = h.observe(h.host.start('encounter', { auto: true }))
    await h.untilActive()
    await h.pumpUntilSettled(op)
    expect(op.state.result).toBe('defeat')
    // 终局分配：defeat 不触发 settleVictory、不跑 onDefeated 战后脚本、不还原大世界音乐。
    // 序列每项都是公开端口事件：exitFrame=退出步进模式、music:stop=进场静音、publish/clear=
    // 会话发布/释放（同续原子）、write:defeat=世界写回、restore=场景音恢复；无尾随
    // music:stop 即 defeat 分支跳过 restoreMusic（battle-host.ts finishEncounter）。
    expect(h.events).toEqual([
      'exitFrame',
      'music:stop',
      'publish',
      'clear',
      'write:defeat',
      'restore',
    ])
    expect(h.world.party[0]!.hp).toBe(0) // finishWorld → writeBackHp lost 分支允许 0
    expect(h.world.money).toBe(50) // 无胜利奖励入账
  } finally {
    await h.close()
  }
})

test('BF-09 胜利曲经验门（exp>0）：options.boss 直传 victory(boss)、胜利曲恰奏一次、奏后归静', async () => {
  const h = await hostHarness({ enemy: foeWith({ exp: 15, cash: 7 }) })
  try {
    const op = h.observe(h.host.start('encounter', { auto: true, boss: true }))
    await h.untilActive()
    await h.pumpUntilSettled(op)
    expect(op.state.result).toBe('victory')
    expect(h.victoryAssets).toEqual([true]) // boss 旗恰一次直达 victory(boss)
    expect(h.plays).toEqual([{ asset: 'victory-boss', loop: false, fadeMs: 300 }])
    expect(h.events.at(-1)).toBe('music:stop') // playedVictory 后大世界静音态仍收 stop
    expect(h.world.money).toBe(50 + 7)
  } finally {
    await h.close()
  }
})

test('BF-09 零经验胜利（exp=0）：经验门关胜利曲零奏、金钱不受经验门影响', async () => {
  const h = await hostHarness({ enemy: foeWith({ exp: 0, cash: 7 }) })
  try {
    const op = h.observe(h.host.start('encounter', { auto: true, boss: true }))
    await h.untilActive()
    await h.pumpUntilSettled(op)
    expect(op.state.result).toBe('victory')
    expect(h.victoryAssets).toEqual([]) // exp=0：经验门关 → 胜利曲回调零触发
    expect(h.plays).toEqual([])
    expect(h.world.money).toBe(50 + 7) // 金钱不受经验门影响
  } finally {
    await h.close()
  }
})

test('BF-10 宿主逃跑终局：playerFled 不结算不跑战后脚本、金钱零变化、场景音恢复', async () => {
  const h = await hostHarness({
    enemy: foeWith({}),
    heroOverrides: (actor) => {
      actor.battler!.baseStats.luck = 100 // fleeRate 100 ≥ 任意 roll
    },
  })
  try {
    const op = h.observe(h.host.start('encounter'))
    await h.untilActive()
    h.host.active!.tick(100, new Set(['q'])) // 真实指令菜单提交逃跑（q=逃跑项）
    await h.pumpUntilSettled(op)
    expect(op.state.result).toBe('playerFled')
    expect(h.events).toEqual([
      'exitFrame',
      'music:stop',
      'publish',
      'clear',
      'write:playerFled',
      'restore',
      'music:stop',
    ])
    expect(h.world.money).toBe(50) // 逃跑零奖励零扣减
  } finally {
    await h.close()
  }
})

test('BF-H1 正常收尾：start Promise 兑现后关闭——active 槽清空、spy/global/DOM 复原', async () => {
  const h = await hostHarness({ enemy: foeWith({ exp: 0 }) })
  let op: Awaited<ReturnType<typeof h.observe>> | undefined
  try {
    op = h.observe(h.host.start('encounter', { auto: true }))
    await h.untilActive()
    await h.pumpUntilSettled(op)
  } finally {
    await h.close()
  }
  expect(op!.state).toEqual({ settled: true, result: 'victory' }) // 本次 start Promise 已消费
  expect(h.host.active).toBeNull() // 会话槽已释放
  expect(globalThis.fetch).toBe(h.restoreProbe.fetch) // stub 的全局按身份复原
  expect(document.getElementById('screen')).toBeNull() // DOM 已复原
})

test('BF-H2 准备拒绝收尾：真实精灵 IO 拒绝被消费、零端口副作用、spy/global/DOM 复原', async () => {
  const h = await hostHarness({ enemy: foeWith({}) })
  h.failSpriteRead() // 真实外部 IO 故障（非业务 mock）：fighter.rle 读取 NotFoundError
  let op: Awaited<ReturnType<typeof h.observe>> | undefined
  try {
    op = h.observe(h.host.start('encounter'))
    await op.consumed // prepare 真实拒绝兑现
  } finally {
    await h.close()
  }
  expect(op!.state.settled).toBe(true) // 拒绝已被消费，无未处理拒绝
  expect(op!.state.error).toBeTruthy()
  expect(h.events).toEqual(['exitFrame']) // 未建会话：零音乐/发布/写回副作用
  expect(h.world.money).toBe(50)
  expect(globalThis.fetch).toBe(h.restoreProbe.fetch)
  expect(document.getElementById('screen')).toBeNull()
})

test('BF-H3 断言提前失败收尾：IO 受持期断言红后关闭——start Promise 消费、持定 IO 释放、复原', async () => {
  const h = await hostHarness({ enemy: foeWith({}) })
  const hold = h.blockSpriteRead() // 真实外部 IO 持定：prepare 停在精灵读处
  const op = h.observe(h.host.start('encounter'))
  let earlyFailure: unknown
  try {
    // CI 同形：断言在 prepare 仍在途时失败（active 不可能建立 → 必然红）
    await h.until(() => hold.entered() > 0)
    expect(h.host.active).not.toBeNull()
  } catch (error) {
    earlyFailure = error
  } finally {
    await h.close()
  }
  expect(String((earlyFailure as Error)?.message)).toContain('expected null not to be null')
  expect(op.state).toMatchObject({ settled: true, error: { name: 'AbortError' } }) // 关闭消费了本次 start
  expect(hold.entered()).toBeGreaterThan(0) // 持定的 IO 确已进入并被放行
  expect(globalThis.fetch).toBe(h.restoreProbe.fetch)
  expect(document.getElementById('screen')).toBeNull()
})

test('BF-H4 取消收尾：会话中段取消后关闭——start Promise 以 AbortError 消费、active 槽清空、复原', async () => {
  const h = await hostHarness({ enemy: foeWith({ exp: 0 }) })
  const op = h.observe(h.host.start('encounter', { auto: true }))
  try {
    await h.untilActive()
    h.host.cancel() // 会话存活期取消
    await op.consumed
  } finally {
    await h.close()
  }
  expect(op.state).toMatchObject({ settled: true, error: { name: 'AbortError' } })
  expect(h.host.active).toBeNull()
  expect(globalThis.fetch).toBe(h.restoreProbe.fetch)
  expect(document.getElementById('screen')).toBeNull()
})
