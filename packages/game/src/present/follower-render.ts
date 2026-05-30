/**
 * opcode 0x98 set-follower 的额外跟随者(sdlpal `rgParty[wMaxPartyMemberIndex + i]`,i=1..nFollower)
 * 渲染计算 —— 纯函数,便于按 sdlpal 真值单测。
 *
 * sdlpal 真值(scene.c):
 *  - 统一渲染循环 scene.c:210-226:`for i in 0..maxIdx+nFollower` 各用 PAL_GetPlayerSprite(i) 自己的
 *    sprite 在 rgParty[i].x/y 画 —— 跟随者与队员同一 z-sort 队列。
 *  - **sprite 来源**(res.c:335-348):跟随者 sprite num = `rgParty[maxIdx+i].wPlayerRole` —— 即 0x98
 *    operand **直接当 MGO chunk 号**,**不**走队员的 `rgwSpriteNum[role]` 查表(res.c:325)。故 0x98
 *    operand 是临时同行 NPC 的 sprite chunk(如 scene 102 书生 = chunk 82/83),不在 6 人角色表里。
 *  - 位置 scene.c:737-740(moving):`rgParty[maxIdx+i] = rgTrail[2+i] - viewport`。跟随者直接坐在
 *    **更靠后的 trail 槽**(i 从 1 起 → rgTrail[3]/[4]),**无**队员的左右偏移、**无**障碍回退。
 *  - 帧 scene.c:741-742(moving)/769-770(standing):`rgTrail[2+i].wDirection * 3 + iStepFrameFollower`
 *    / `* 3` —— **恒 3 帧步**,不看角色 rgwWalkFrames(区别于队员的 4/3 判定)。
 *  - iStepFrameFollower scene.c:654-674:由 s_iThisStepFrame(0..3)推 —— 奇步 = 3 - iStepFrameLeader,
 *    偶步 = 0 → 序列 [0,2,0,1](队员 leader 为 [0,1,0,2])。
 */
import type { Facing, TrailEntry } from '../core/game-state.js'

/** sdlpal kDirSouth/West/North/East = 0/1/2/3。 */
const FACING_TO_DIRECTION: Record<Facing, number> = { down: 0, left: 1, up: 2, right: 3 }

/** sdlpal iStepFrameFollower 序列(s_iThisStepFrame 0..3)—— 与 leader [0,1,0,2] 不同。 */
const FOLLOWER_STEP_FRAME = [0, 2, 0, 1] as const

export interface FollowerRenderItem {
  /** world 坐标(= sdlpal rgTrail[2+i],未减 viewport;present 经 pixelToScreen 转屏)。 */
  worldX: number
  worldY: number
  /** sprite 帧下标(dir*3 + step)。 */
  frameIdx: number
  /** 该跟随者 MGO sprite chunk 号(= 0x98 operand 直接当 sprite num,res.c:340,非 role id)。 */
  spriteNum: number
  /** 0-based follower 序号(渲染 id 用)。 */
  followerIndex: number
}

/**
 * 计算 0x98 跟随者渲染项。follower k(0-based)→ trail[3+k](= sdlpal rgTrail[2+(k+1)])。
 * trail 深度不足(刚进场未铺满)→ 跳过该跟随者(走几步铺满后自然出现),不报错。
 */
export function computeFollowerRenderItems(
  trail: readonly TrailEntry[],
  followers: readonly number[] | undefined,
  walking: boolean,
  stepFrame: number,
): FollowerRenderItem[] {
  const out: FollowerRenderItem[] = []
  const fs = followers ?? []
  for (let k = 0; k < fs.length; k++) {
    const t = trail[3 + k]
    if (!t) continue
    const dir = FACING_TO_DIRECTION[t.dir]
    const step = walking ? (FOLLOWER_STEP_FRAME[stepFrame] ?? 0) : 0
    out.push({
      worldX: t.x,
      worldY: t.y,
      frameIdx: dir * 3 + step,
      spriteNum: fs[k]!,
      followerIndex: k,
    })
  }
  return out
}
