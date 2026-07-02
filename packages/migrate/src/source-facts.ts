/**
 * 提取数据的共享事实层:SourceCmd 形状 + 原版坐标/方向/数值换算。
 * migrate-content.ts(数据表/场景静态)与 translate-events.ts(脚本翻译)共用,
 * 独立成模块以避免两者互相 import(ESM 环)。真值锚:sdlpal script.c / M2b 实测。
 */
import { pixelToGrid } from '@type-pal/content'

/** 提取的事件指令(events/*.json;具名 op 的专有字段由使用方窄化)。 */
export interface SourceCmd {
  label?: string
  op?: string
  text?: string
  opcode?: number
  operands?: number[]
}

/** 六主角稳定 slug(下标 = 原版 roleId;⚠ 3=巫后 4=阿奴,原版名字指针对调已在解析器修正)。 */
export const ROLE_SLUGS = ['li-xiaoyao', 'zhao-linger', 'lin-yueru', 'wu-hou', 'anu', 'gai-luojiao'] as const

/** 原版 direction 0-3 = 下/左/上/右(kDirSouth/West/North/East;sdlpal palcommon.h)。 */
export const FACING_BY_DIR = ['down', 'left', 'up', 'right'] as const

/** 原版场景号 → 稳定 id(s001;0-based 原版号,当不透明串)。 */
export function sceneSlug(n: number): string {
  return `s${String(n).padStart(3, '0')}`
}

/** setPartyPos(col,row,h) → 世界像素 → 菱形格(px=col*32+h*16, py=row*16+h*8;sdlpal 0x46 真值)。 */
export function partyPosToGrid(col: number, row: number, h: number): { col: number; row: number; height: number } {
  return { ...pixelToGrid(col * 32 + h * 16, row * 16 + h * 8), height: 0 }
}

/** WORD 操作数按 int16 解读(负数金额/状态 -1 等)。 */
export function signExtendI16(v: number): number {
  return v >= 0x8000 ? v - 0x10000 : v
}
