/** 提取的事件指令(events/*.json;具名 op 的专有字段由使用方窄化)。 */
export interface SourceCmd {
  label?: string
  op?: string
  text?: string
  opcode?: number
  operands?: number[]
}

/** 六主角稳定 slug(下标 = 原版 roleId;⚠ 3=巫后 4=阿奴,原版名字指针对调已在解析器修正)。 */
export const ROLE_SLUGS = [
  'li-xiaoyao',
  'zhao-linger',
  'lin-yueru',
  'wu-hou',
  'anu',
  'gai-luojiao',
] as const

/**
 * roleId -> DATA.MKF chunk 9 的真实 player-face frame。
 *
 * `LPCSPRITE` 是字节指针(`reference/sdlpal/palcommon.h:28`)；`PAL_SpriteGetFrame`
 * 在 `reference/sdlpal/palcommon.c:848-851` 先执行 `iFrameNum <<= 1`，再读
 * bytes[2N]/bytes[2N+1] 组成 word[N]，随后 `<< 1` 得到 RLE 字节偏移，不是
 * word[N + 1]。`ui.h:116` / `uibattle.c:155-160` 以 48 + roleId 取帧。
 * 仅 48..52 是真实头像；roleId 5 对应 frame 53 的 3×4 全透明槽，因此不入表。
 */
export const PAL_PLAYER_FACE_FRAME_BY_ROLE_ID = Object.freeze([48, 49, 50, 51, 52] as const)

/** 原版场景号是稳定的不透明资源 id。 */
export function sceneSlug(n: number): string {
  return `s${String(n).padStart(3, '0')}`
}
