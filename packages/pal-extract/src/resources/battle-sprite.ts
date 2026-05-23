/**
 * 战斗 sprite 提取 —— 类比 M2 `extractCharacterSprites`(MGO.MKF)。
 *
 * 数据源真值(reference/sdlpal/battle.c:856 `PAL_LoadBattleSprites`):
 *   - **队员战斗 sprite**:`f.mkf`,chunk = `PAL_GetPlayerBattleSprite(playerRole)`
 *     底层 = `PlayerRoles.rgwSpriteNumInBattle[i]`(我们 `PlayerRole.spriteNumInBattle`)
 *   - **敌方战斗 sprite**:`abc.mkf`(**非 f.mkf**),chunk = `OBJECT_ENEMY.wEnemyID`
 *     反查 enemies.json:`enemy.id == wEnemyID`(parsers/enemies.ts 注释证实)
 *
 * chunk YJ2 解压由 caller 负责(同 M2 `extractCharacterSprites` 拿
 * **已解压**字节);本函数只负责拼 RLE 帧。
 *
 * 解析复用 `parseSpriteChunk` + `framesToOut`(M2 已 verified;RLE 编码同源)。
 */
import { framesToOut, parseSpriteChunk, type SpriteFrameOut } from './sprite.js'

export interface BattleSpriteOut {
  battleSpriteId: number
  kind: 'enemy' | 'player'
  frames: SpriteFrameOut[]
}

/**
 * 从战斗 sprite chunk map 提取一组 sprite 的全部帧。
 *
 * 调用方负责按 `kind` 从正确 MKF 读 + YJ2 解压 chunk:
 *   - kind='player' → F.MKF chunk[spriteNumInBattle]
 *   - kind='enemy'  → ABC.MKF chunk[wEnemyID == enemies.json 中的 id]
 *
 * @param ids       要提取的 sprite id 集合,每个含 kind
 * @param chunks    Map<`${kind}:${id}`, 已解压 sprite chunk 字节>
 *                  (kind/id 复合键,避免不同 MKF 同 id chunk 冲突)
 */
export function extractBattleSprites(
  ids: Array<{ id: number; kind: 'enemy' | 'player' }>,
  chunks: Map<string, Uint8Array>,
): BattleSpriteOut[] {
  const result: BattleSpriteOut[] = []
  for (const { id, kind } of ids) {
    const key = `${kind}:${id}`
    const chunk = chunks.get(key)
    if (!chunk) {
      console.warn(`[pal-extract] battle sprite ${id} (${kind}) chunk 缺,skip`)
      continue
    }
    const frames = parseSpriteChunk(chunk)
    result.push({ battleSpriteId: id, kind, frames: framesToOut(frames) })
  }
  return result
}
