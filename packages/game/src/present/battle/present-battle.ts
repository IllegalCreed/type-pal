/**
 * 战斗一帧装配(M3 T28)。
 *
 * Phase E 收口:消费 PresentCommand → 画 bg → sprite → 数字弹幕 → UI overlay。
 * BattleAssets 由 dev panel(T29)或 bootstrap 注入。
 *
 * 命令消费(M3 简版):
 *   - `showDamageNum`     → FloatingNumsLayer.emit(数字弹幕)
 *   - `playEnemyAttack`   /  `playPlayerAttack` / `playMagicAnim`
 *     / `flashEnemy` / `flashPlayer` / `playEnemyDeath`
 *     / `showBattleMessage` —— M3 不画动画,本 task 跳过(M5 真补)
 *   - `showBattleUI` —— state 本身由 battle-system 改写到 state.uiState,
 *     Present 层不消费此 cmd 修改 state。
 *   - `showDialogBox` / `clearDialogBox` —— 战斗模式下不画对话框,跳过。
 *
 * 绘制顺序(对照 sdlpal `battle.c::PAL_BattleMakeScene`):
 *   1. 战斗背景(底)
 *   2. 我方 + 敌方精灵
 *   3. 数字弹幕(在精灵之上)
 *   4. UI overlay(主菜单 / 二级菜单 / 目标光标 / HP/MP 状态栏)
 *
 * 不在本 task 做(留 M5):
 *   - 精灵动画切帧(idle frame 循环、攻击 frame、魔法 cast frame)
 *   - 闪屏 / 敌人 flash 红色
 *   - 战斗消息单行 banner
 *   - 死亡淡出
 */

import type { EnemyPosTable, Item, PlayerRoles, Spell } from '@type-pal/shared'
import type { BattleState } from '../../core/battle/battle-state.js'
import type { BusEntry } from '../../core/command-bus.js'
import type { GameState } from '../../core/game-state.js'
import type { Framebuffer } from '../framebuffer.js'
import type { GlyphTable } from '../font.js'
import { type BattleBgAsset, drawBattleBg } from './draw-battle-bg.js'
import { FloatingNumsLayer } from './draw-battle-num.js'
import { drawBattleSprites, type SpriteAsset } from './draw-battle-sprites.js'
import { drawBattleUI } from './draw-battle-ui.js'

export interface BattleAssets {
  /** sprite key 规约见 draw-battle-sprites:`player-${spriteNumInBattle}` / `enemy-${enemy.id}`。 */
  battleSprites: Map<string, SpriteAsset>
  /** key = BattleField.id;M3 dev fixture 用 id 0。 */
  battleBgs: Map<number, BattleBgAsset>
  playerRoles: PlayerRoles
  spells: Spell[]
  items: Item[]
  /** M3.5:ENEMYPOS table 真值(DATA.MKF chunk 13)— drawBattleSprites enemy 位置。 */
  enemyPos?: EnemyPosTable
  /** M4 P4.T3: Unifont glyph table(启动时 loadGlyphs 注入,缺省则战斗文字渲染为 tofu)。 */
  glyphs?: GlyphTable
}

/**
 * 战斗 Present —— 持有跨帧状态(目前只有 FloatingNumsLayer)。
 * 一帧装配:`draw(fb, gs, state, commands, assets, currentFrame)`;
 * 战斗结束时调 `clearFloatingNums()` 避免下次战斗看到上次残留。
 */
export class BattlePresent {
  private readonly floatingNums = new FloatingNumsLayer()

  /**
   * 画一帧战斗画面 + drain 战斗命令到弹幕层。
   *
   * @param fb           屏幕 framebuffer(320×200 索引)
   * @param gs           GameState(itemMenu 读 inventory)
   * @param state        BattleState(uiState / uiCursor / players / enemies 等)
   * @param commands     bus.drain() 一次性给本帧的命令列表
   * @param assets       战斗专用资源(sprites / bgs / 表)
   * @param currentFrame 当前 tick 帧号(gs.frameNum),用于 floating nums 寿命
   */
  draw(
    fb: Framebuffer,
    gs: GameState,
    state: BattleState,
    commands: BusEntry[],
    assets: BattleAssets,
    currentFrame: number,
  ): void {
    // 1. 消费战斗命令(M3 简版:只 showDamageNum;其他命令 M5 真补)
    for (const { cmd } of commands) {
      if (cmd.op === 'showDamageNum') {
        this.floatingNums.emit({
          x: cmd.x,
          y: cmd.y,
          value: cmd.value,
          color: cmd.color,
          currentFrame,
        })
      }
      // 其他 op(playEnemyAttack / playMagicAnim / flashEnemy / showBattleMessage
      // / playEnemyDeath / showBattleUI / showDialogBox / clearDialogBox 等)M3 简版跳过
    }

    // 2. 战斗背景(M3 dev fixture 用 BattleField.id=0;实际 id 由 state.field.id 提供)
    const bg = assets.battleBgs.get(state.field.id)
    if (bg) drawBattleBg(fb, bg)

    // 3. 双方精灵(死亡的不画;sprite 缺资源跳过)
    drawBattleSprites(fb, state, assets.battleSprites, assets.playerRoles, assets.enemyPos, currentFrame)

    // 4. 数字弹幕(在精灵之上;过期数字自动清理)
    this.floatingNums.draw(fb, currentFrame, assets.glyphs)

    // 5. UI overlay(主菜单 / 二级菜单 / 目标光标 / HP/MP 状态栏)
    drawBattleUI(fb, state, assets.playerRoles, assets.spells, assets.items, gs, assets.glyphs)
  }

  /** 战斗结束时清空数字弹幕,避免下次战斗看到上次残留。 */
  clearFloatingNums(): void {
    this.floatingNums.clear()
  }
}
