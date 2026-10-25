/**
 * M5.6 T10d:PlayerStatus state machine 单测 — sdlpal `uigame.c:1265-1284` 输入路由真值。
 *
 * 覆盖:cursor linear 移动、Menu 直接关、Left/Up underflow 关、Right/Down/Confirm overflow 关。
 */
import { describe, expect, it } from 'vitest'
import {
  createPlayerStatus,
  currentRoleId,
  playerStatusCancel,
  playerStatusNext,
  playerStatusPrev,
} from './player-status.js'

describe('PlayerStatus state machine', () => {
  // 生产队伍使用0..5的角色索引；非顺序队伍让cursor与roleId不能混淆。
  it('createPlayerStatus 拷贝 partyMembers 数组(不共享引用)', () => {
    const src = [0, 1, 2]
    const s = createPlayerStatus(src)
    expect(s.cursor).toBe(0)
    expect(s.done).toBe(false)
    expect(s.partyMembers).toEqual([0, 1, 2])
    expect(s.partyMembers).not.toBe(src)
  })

  it('partyMembers 空 → 立即 done(无可显示成员)', () => {
    const s = createPlayerStatus([])
    expect(s.done).toBe(true)
    expect(currentRoleId(s)).toBeUndefined()
  })

  it('playerStatusNext cursor++,到末尾后 +1 越界 → done(sdlpal uigame.c:1281)', () => {
    const s = createPlayerStatus([2, 0, 4])
    expect(currentRoleId(s)).toBe(2)
    playerStatusNext(s)
    expect(s.cursor).toBe(1)
    expect(currentRoleId(s)).toBe(0)
    playerStatusNext(s)
    expect(currentRoleId(s)).toBe(4)
    playerStatusNext(s)
    expect(s.done).toBe(true)
    expect(currentRoleId(s)).toBeUndefined()
  })

  it('playerStatusPrev cursor--,从 0 再 -- → done(sdlpal uigame.c:1276 cursor<0)', () => {
    const s = createPlayerStatus([4, 1])
    playerStatusNext(s) // cursor=1
    playerStatusPrev(s) // cursor=0
    expect(s.cursor).toBe(0)
    expect(s.done).toBe(false)
    playerStatusPrev(s) // cursor=-1 → done
    expect(s.done).toBe(true)
  })

  it('playerStatusCancel(Menu)直接关 — sdlpal uigame.c:1271 iCurrent=-1', () => {
    const s = createPlayerStatus([4, 2, 0])
    playerStatusCancel(s)
    expect(s.done).toBe(true)
  })

  it('done 后 prev/next 不再 mutate cursor(防 dispatcher 重复触发)', () => {
    const s = createPlayerStatus([1])
    playerStatusNext(s)
    expect(s.done).toBe(true)
    const cursorAfter = s.cursor
    playerStatusNext(s)
    playerStatusPrev(s)
    expect(s.cursor).toBe(cursorAfter)
    expect(s.done).toBe(true)
  })
})
