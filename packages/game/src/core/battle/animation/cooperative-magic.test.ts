/** Contributor formation, spell sequence and return to standing positions. Data-level contracts; not browser or visual acceptance. */
import { describe, expect, it } from 'vitest'
import { buildCoopMagicTimeline } from '../anim-timeline.js'

const FRAME_MS = 40 // SDLPal battle.h: BATTLE_FPS=25.

describe('buildCoopMagicTimeline (协力合击,fight.c:3856-4107 CLASSIC)', () => {
  // 3 人队全 healthy,casterIdx=0;原位 caster(240,170)/p1(280,150)/p2(300,130)。
  // magic: effect chunk 5,type normal,target enemy idx0 pos(160,80);n=8。
  const coopMagic = {
    effect: 5,
    type: 'normal' as const,
    speed: 5,
    fireDelay: 2,
    effectTimes: 1,
    shake: 0,
    xOffset: 0,
    yOffset: 0,
  }
  const frames = buildCoopMagicTimeline({
    casterIdx: 0,
    partySize: 3,
    contributorIdxs: [0, 1, 2],
    originalPositions: [
      { x: 240, y: 170 },
      { x: 280, y: 150 },
      { x: 300, y: 130 },
    ],
    magic: coopMagic,
    n: 8,
    targetIdx: 0,
    targetEnemyPos: { x: 160, y: 80 },
    hurtEnemies: [{ idx: 0, pos: { x: 160, y: 80 } }],
    damageNums: [{ target: { kind: 'enemy', idx: 0 }, value: 123, color: 'blue' }],
  })

  it('Phase1 滑入:前 6 帧把 3 贡献者插值移向 COOP_POS {208,157}/{234,170}/{260,183}', () => {
    // 第 6 帧(index 5,i=6):caster→COOP_POS[0]=(208,157),p1→[1]=(234,170),p2→[2]=(260,183)。
    const f6 = frames[5]!
    expect(f6.durationMs).toBe(FRAME_MS) // Delay(1)
    const caster = f6.fighters!.find((d) => d.idx === 0 && d.side === 'player')!
    expect(caster.pos).toEqual({ x: 208, y: 157 })
    const p1 = f6.fighters!.find((d) => d.idx === 1)!
    expect(p1.pos).toEqual({ x: 234, y: 170 })
    const p2 = f6.fighters!.find((d) => d.idx === 2)!
    expect(p2.pos).toEqual({ x: 260, y: 183 })
  })

  it('Phase2 贡献者(非发起者)逐个摆施法帧5,Delay(3)', () => {
    // Phase1 占 6 帧;接着 2 个非发起贡献者(slot 2→1 倒序)各一帧 frame5。
    const f7 = frames[6]!
    expect(f7.durationMs).toBe(3 * FRAME_MS)
    expect(f7.fighters).toEqual([{ side: 'player', idx: 2, currentFrame: 5 }])
    const f8 = frames[7]!
    expect(f8.fighters).toEqual([{ side: 'player', idx: 1, currentFrame: 5 }])
  })

  it('Phase3/4 发起者闪白(colorShift6,frame5,Delay5)→ frame6 复色(Delay3)', () => {
    const f9 = frames[8]!
    expect(f9.durationMs).toBe(5 * FRAME_MS)
    expect(f9.fighters).toEqual([{ side: 'player', idx: 0, iColorShift: 6, currentFrame: 5 }])
    const f10 = frames[9]!
    expect(f10.durationMs).toBe(3 * FRAME_MS)
    expect(f10.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 6, iColorShift: 0 }])
  })

  it('Phase6 PostMagic 第一帧带伤害数字,不等 Phase7 滑回结束', () => {
    const numIdx = frames.findIndex((f) => (f.damageNums?.length ?? 0) > 0)
    const postIdx = frames.findIndex((f) =>
      f.fighters?.some((d) => d.side === 'enemy' && d.idx === 0),
    )
    expect(numIdx).toBe(postIdx)
    expect(frames[numIdx]!.damageNums).toEqual([
      { target: { kind: 'enemy', idx: 0 }, value: 123, color: 'blue' },
    ])
    const slideBackIdx = frames.findIndex((f) =>
      f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 0),
    )
    expect(slideBackIdx).toBeGreaterThan(numIdx)
  })

  it('Phase5 OffMagic:含 magic chunk overlay(法术效果,casterIdx=-1 不切发起者帧6)', () => {
    // OffMagic 帧带 overlays kind=magic spriteChunk=5。l=(8-2)*1+8+0=14 帧。
    const offStart = 10
    // L14:OffMagic 首帧是前置 Delay(1)(无 overlay);特效从 offStart+1 起
    expect(frames[offStart]!.overlays).toBeUndefined()
    const offFrame = frames[offStart + 1]!
    expect(offFrame.overlays?.[0]?.kind).toBe('magic')
    expect(offFrame.overlays?.[0]?.spriteChunk).toBe(5)
    // casterIdx=-1 → 无 i==fireDelay 的 caster frame6 切换(fight.c:2677-2680 gated);i==fireDelay=2 → offStart+1+2
    const fireDelayFrame = frames[offStart + 3]!
    expect(fireDelayFrame.fighters ?? []).toEqual([])
  })

  it('Phase7 滑回:末 6 帧贡献者回原位 frame0,最后一帧 caster 回 (240,170)', () => {
    const last = frames[frames.length - 1]!
    expect(last.durationMs).toBe(FRAME_MS)
    const caster = last.fighters!.find((d) => d.idx === 0)!
    expect(caster.currentFrame).toBe(0)
    expect(caster.pos).toEqual({ x: 240, y: 170 }) // i=6 → 全回原位
  })
})
