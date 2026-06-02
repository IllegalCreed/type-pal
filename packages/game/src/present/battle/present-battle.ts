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
import type { IndexedImage } from '../../assets/png.js'
import type { BattleState, SummonFrameState } from '../../core/battle/battle-state.js'
import { getBattleLiveRoles } from '../../core/battle/battle-system.js'
import type { BusEntry } from '../../core/command-bus.js'
import type { GameState } from '../../core/game-state.js'
import type { GlyphTable } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'
import { type BattleBgAsset, drawBattleBg } from './draw-battle-bg.js'
import { applyScreenWave } from '../screen-wave.js'
import { type DialogBoxDrawCtx, drawDialogBox } from '../dialog-box.js'
import { drawBattleEffectOverlay, drawBattleMagicOverlay } from './draw-battle-effect.js'
import { FloatingNumsLayer } from './draw-battle-num.js'
import {
  blitFrame,
  computeEnemyAnchor,
  computePlayerAnchor,
  drawBattleSprites,
  type SpriteAsset,
} from './draw-battle-sprites.js'
import { drawBattleUI } from './draw-battle-ui.js'
import { drawBattleSettlement } from './draw-battle-settlement.js'
import { renderText } from '../font.js'

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
  /**
   * D17b:SPRITEUI(DATA.MKF chunk 9)全 frame —— 伤害数字弹幕用 drawNumber(UI sprite
   * 数字帧 1:1,对照 sdlpal `PAL_BattleUIUpdate` → `PAL_DrawNumber`)。缺省则数字不画。
   */
  uiSpriteFrames?: IndexedImage[]
  /**
   * D17a:lpEffectSprite(DATA.MKF chunk 10)全 frame —— 物理攻击命中特效 overlay 用
   * (state.battleAnim.overlay.spriteChunk=10,frameIdx 取帧)。缺省则 overlay 不画
   * (loader 注入留后续叶子)。
   */
  effectSprite?: SpriteAsset
  /**
   * D17:FIRE.MKF magic sprite 表 —— 法术特效 overlay 用(kind='magic',
   * key = chunk index = magic.effect)。state.battleAnim.overlays[].spriteChunk 取 chunk,
   * frameIdx 取帧。缺省则法术 overlay 不画(loader 注入)。
   */
  magicSprites?: Map<number, SpriteAsset>
  /**
   * 战斗内对话(scriptOnReady / scriptOnTurnStart 的 0xFFFF showDialog)渲染资源 —— 复用大世界
   * dialog 渲染(portraitFrames / iconFrames),drawDialogBox 用。缺省则对话框只画文字 + 边框(无头像)。
   */
  dialogAssets?: DialogBoxDrawCtx
  /**
   * 毒 OBJECT 头像染色表(id→{level,color})—— PAL_PlayerInfoBox 中毒/死亡头像 mono 重染用
   * (uibattle.c:114-162)。缺省则头像恒满色(无中毒变色)。由 bootstrap/dev-panel 从 objectPoisons 构建。
   */
  objectPoisons?: Map<number, { level: number; color: number }>
}

/**
 * 战斗 Present —— 持有跨帧状态(目前只有 FloatingNumsLayer)。
 * 一帧装配:`draw(fb, gs, state, commands, assets, currentFrame)`;
 * 战斗结束时调 `clearFloatingNums()` 避免下次战斗看到上次残留。
 */
export class BattlePresent {
  private readonly floatingNums = new FloatingNumsLayer()
  /** 战斗单行消息条(偷取"获得 X" / 逃跑失败);currentFrame >= expiryFrame 时消失。 */
  private battleMsg: { text: string, expiryFrame: number } | undefined
  /** 召唤 crossfade(PAL_BattleFadeScene)用:上一帧渲染快照(fade 起手 = 对侧"from"场景)。 */
  private lastFrameBuf: Uint8Array | undefined
  /** 召唤 crossfade 累积态(from 逐步 dither 逼近 to,显示此 buf);+ 已应用到第几步。 */
  private summonFadeBuf: Uint8Array | undefined
  private summonFadeApplied = -1

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
        // D17b:逻辑 target → 屏幕坐标(与精灵共用 computeEnemyAnchor/computePlayerAnchor,杜绝漂移)。
        // sdlpal `fight.c:640-708` 真值 offset(基于精灵底锚 pos):
        //   enemy:     x = anchor.x - 9, y = max(anchor.y - 115, 10)
        //   player HP: x = anchor.x - 9, y = max(anchor.y - 75, 10)
        //   player MP: x = anchor.x - 9, y = max(anchor.y - 67, 10)  (cyan)
        // 再经 PAL_BattleUIShowNum(`uibattle.c:1801`)x -= 15 → 最终 x = anchor.x - 24。
        const anchor =
          cmd.target.kind === 'enemy'
            ? computeEnemyAnchor(state, cmd.target.idx, assets.enemyPos)
            : computePlayerAnchor(state, cmd.target.idx)
        if (anchor) {
          const x = anchor.x - 24
          let yOff: number
          if (cmd.target.kind === 'enemy') yOff = 115
          else yOff = cmd.color === 'cyan' ? 67 : 75 // cyan = MP(-67),HP(-75)
          const y = Math.max(anchor.y - yOff, 10)
          this.floatingNums.emit({ x, y, value: cmd.value, color: cmd.color, currentFrame })
        }
      }
      else if (cmd.op === 'showBattleMessage') {
        // 战斗单行消息条(偷取"获得 X" / 逃跑失败);显示 durationMs(缺省 800ms,battle tick 40ms/帧)。
        const frames = Math.ceil((cmd.durationMs ?? 800) / 40)
        this.battleMsg = { text: cmd.text, expiryFrame: currentFrame + frames }
      }
      // 其他 op(playEnemyAttack / playMagicAnim / flashEnemy / playEnemyDeath / showBattleUI
      // / showDialogBox / clearDialogBox 等)M3 简版跳过
    }

    // 召唤演出(state.battleAnim.summon):in/loop 期画召唤神替换队员 + 背景染色;out 期(淡出)正常画队员。
    //   crossfade(淡入/淡出)在本帧 UI 画完后统一处理(applySummonFade)。
    const summon = state.battleAnim?.summon
    const summonGodMode = summon !== undefined && summon.fadeDir !== 'out'

    // 2. 战斗背景(召唤期按 sBackgroundColorShift 染色,battle.c:62-76)
    const bg = assets.battleBgs.get(state.field.id)
    if (bg) drawBattleBg(fb, bg, summonGodMode ? summon.bgColorShift : 0)

    // 2.1 W4 keepEffect:烙进背景的魔法精灵(persistentBgBlits)— 画在 bg 上、精灵之下(对齐 sdlpal
    //     lpBackground 永久 blit,fight.c:2757-2762)。每帧重画(战斗结束随 BattleState 清)。
    for (const blit of state.persistentBgBlits ?? []) {
      drawBattleMagicOverlay(fb, { kind: 'magic', ...blit }, assets.magicSprites)
    }

    // 战斗实时 roles(伤害/死亡写于此;死员据此画倒下帧)。无战斗资源(单测/兜底)→ static 基线。
    //   修"起立":精灵 + UI 都读 live,死员 hp==0 → 倒下帧 2(draw-battle-sprites)/ HP 条显实时血。
    const liveRoles = getBattleLiveRoles(gs) ?? assets.playerRoles

    // 3. 双方精灵(死员画倒下帧 2;召唤 god 模式隐队员)
    drawBattleSprites(
      fb,
      state,
      assets.battleSprites,
      liveRoles,
      assets.enemyPos,
      currentFrame,
      summonGodMode, // 召唤神出场 → 隐队员
    )

    // 3.1 召唤神精灵(替换队员;battle.c:163-212/386-405 lpSummonSprite!=NULL)。pos = posSummon 底中锚。
    if (summonGodMode) {
      const god = assets.battleSprites.get(summon.spriteKey)
      const frame = god?.frames[summon.frame] ?? god?.frames[0]
      if (frame) blitFrame(fb, frame, summon.pos.x, summon.pos.y)
    }

    // 3.5 D17a/D17:战斗动画 overlay(物理攻击命中特效 / 法术 FIRE.MKF sprite),sprite 之上 UI 之下。
    //     applyAnimFrame 写当前帧的 overlay(单数,effect)+ overlays(复数,magic AttackAll 三落点)。
    //     两者可并存(理论上不会同帧),都画;magic overlays 逐个 blit。
    if (state.battleAnim?.overlay) {
      const ov = state.battleAnim.overlay
      if (ov.kind === 'magic') drawBattleMagicOverlay(fb, ov, assets.magicSprites)
      else drawBattleEffectOverlay(fb, ov, assets.effectSprite)
    }
    if (state.battleAnim?.overlays) {
      for (const ov of state.battleAnim.overlays) {
        if (ov.kind === 'magic') drawBattleMagicOverlay(fb, ov, assets.magicSprites)
        else drawBattleEffectOverlay(fb, ov, assets.effectSprite)
      }
    }

    // 3.95 W4 屏波(wWave,fight.c:2667/2895):攻击魔法动画帧带 screenWave → 扭曲场景层(bg+精灵+特效),
    //   **UI 之前**应用(对齐 sdlpal PAL_BattleMakeScene 内 PAL_ApplyWave;UI 随后画在扭曲后的场景上不被卷入)。
    //   transient:每帧用临时 {wScreenWave, sWaveProgression:0},不写 gs 存档字段。
    const animFrame = state.battleAnim?.frames[state.battleAnim.idx]
    if (animFrame?.screenWave && animFrame.screenWave > 0) {
      applyScreenWave(fb.indices, { wScreenWave: animFrame.screenWave, sWaveProgression: 0 })
    }

    // 3.9 召唤 crossfade(PAL_BattleFadeScene)—— **在 UI/对话之前**对**场景层**(bg+精灵+召唤神+特效)做
    //   dither 渐变;UI 随后画在渐变后的场景上(对齐 sdlpal battle.c:665-671 PAL_BattleFadeScene 后
    //   PAL_BattleUIUpdate 重画 UI,fade 期 UI 始终清晰不被卷进渐变)。非 fade 帧只快照场景供下次 fade 起手。
    this.applySummonFade(fb, state.battleAnim?.summon, state.battleAnim?.hasSummonFade ?? false)

    // 4. 数字弹幕(在精灵之上;过期数字自动清理)。D17b:用 UI sprite 数字帧(drawNumber)。
    this.floatingNums.draw(fb, currentFrame, assets.uiSpriteFrames)

    // 5. UI overlay(4 图标主菜单 / 杂项盒 / 物品二级 / 法术物品网格 / target 箭头 / HP/MP 状态栏)
    drawBattleUI(
      fb, state, liveRoles, assets.spells, assets.items, gs, assets.glyphs,
      assets.uiSpriteFrames, assets.enemyPos, assets.objectPoisons,
    )

    // 5.5 战斗单行消息条(偷取"获得 X" / 逃跑失败)—— sdlpal 逃跑失败 label 31 @(130,75) 色15。
    //   (CLASSIC 偷取真值走对话,此处统一消息条近似;currentFrame 过期自动消失。)
    if (this.battleMsg) {
      if (currentFrame < this.battleMsg.expiryFrame && assets.glyphs)
        renderText(fb, this.battleMsg.text, 130, 75, 15, assets.glyphs, true)
      else if (currentFrame >= this.battleMsg.expiryFrame)
        this.battleMsg = undefined
    }

    // 6. 战斗内对话框(scriptOnReady / scriptOnTurnStart 0xFFFF showDialog)——
    //    复用大世界 gs.dialogBox 渲染,**覆于战斗场景之上**(sdlpal text.c:1687 box 不擦底,
    //    战斗精灵仍可见)。tickBattleDialog hold 期间填充 gs.dialogBox;战斗结束 finalizeBattle 清。
    // 上下同屏共存:先画反位置的冻结框(dialogBoxKept,如林月如 top),再画活动框(如李逍遥 bottom)。
    //   sdlpal upper/lower 两框同屏共存(PAL_StartDialog 不擦旧框);present 画两次即可。
    if (gs.dialogBoxKept) {
      drawDialogBox(fb, gs.dialogBoxKept, assets.glyphs, {
        ...assets.dialogAssets,
        uiSpriteFrames: assets.uiSpriteFrames,
      })
    }
    if (gs.dialogBox) {
      drawDialogBox(fb, gs.dialogBox, assets.glyphs, {
        ...assets.dialogAssets,
        uiSpriteFrames: assets.uiSpriteFrames,
      })
    }

    // 7. D11b 胜利结算演出(PAL_BattleWon 多屏)—— settlement active 时叠当前一屏 box 于战斗场景上。
    const settlement = state.settlement
    if (settlement && settlement.index < settlement.screens.length) {
      drawBattleSettlement({
        fb,
        screen: settlement.screens[settlement.index]!,
        uiSpriteFrames: assets.uiSpriteFrames,
        glyphs: assets.glyphs,
      })
    }
  }

  /**
   * 召唤 crossfade —— port sdlpal PAL_BattleFadeScene(battle.c:608-682)的 rgIndex stride-6 dither blend。
   * fade 起手快照"from"场景(上一帧),逐步把低 nibble dither 逼近本帧渲染的"to"场景,显示累积态。
   * 高 nibble(调色板块)立即切换,低 nibble(亮度)渐变 → PAL 特征淡变。
   */
  private applySummonFade(fb: Framebuffer, summon: SummonFrameState | undefined, hasSummonFade: boolean): void {
    const current = fb.indices as Uint8Array
    if (!summon || summon.fadeStep === undefined) {
      // 非 fade 帧:仅召唤动画期快照本帧场景(下次 fade 起手的 "from");非召唤动画不快照(省 64KB/帧 memcpy)。
      if (hasSummonFade) {
        if (!this.lastFrameBuf || this.lastFrameBuf.length !== current.length) this.lastFrameBuf = new Uint8Array(current.length)
        this.lastFrameBuf.set(current)
      }
      this.summonFadeBuf = undefined
      this.summonFadeApplied = -1
      return
    }
    const rgIndex = [0, 3, 1, 5, 2, 4] as const
    // fade 起手:morphing buf = 上一帧快照("from")。
    if (summon.fadeStep === 0 || !this.summonFadeBuf || this.summonFadeBuf.length !== current.length) {
      this.summonFadeBuf = new Uint8Array(this.lastFrameBuf && this.lastFrameBuf.length === current.length ? this.lastFrameBuf : current)
      this.summonFadeApplied = -1
    }
    const buf = this.summonFadeBuf
    // 应用 dither 步 (applied+1 .. fadeStep):累积把 buf 的低 nibble 逼近 current("to",battle.c:639-661)。
    for (let s = this.summonFadeApplied + 1; s <= summon.fadeStep; s++) {
      const outerI = Math.floor(s / 6)
      const phaseOffset = rgIndex[s % 6]!
      for (let k = phaseOffset; k < current.length; k += 6) {
        const a = current[k]!
        let b = buf[k]!
        if (outerI > 0) {
          const aLow = a & 0x0F
          const bLow = b & 0x0F
          if (aLow > bLow) b++
          else if (aLow < bLow) b--
        }
        buf[k] = ((a & 0xF0) | (b & 0x0F)) & 0xFF
      }
    }
    this.summonFadeApplied = summon.fadeStep
    current.set(buf) // 显示累积态(from 渐变到 to)
  }

  /** 战斗结束时清空数字弹幕 + 消息条,避免下次战斗看到上次残留。 */
  clearFloatingNums(): void {
    this.floatingNums.clear()
    this.battleMsg = undefined
  }
}
