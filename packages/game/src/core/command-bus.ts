/**
 * Core → Present 单向命令通道(02 架构 + D15)。
 * M2 同步语义:Core 系统在 tick 内 emit、tick 末 Present 一把 drain。
 * 异步回执机制(complete cmdId)接口留下,M3 转场 / 视频时激活。
 */

import type { DialogBoxStyle } from '@type-pal/shared'

export type PresentCommand =
  | { op: 'showDialogBox'; text: string; style: DialogBoxStyle }
  | { op: 'clearDialogBox' }
  // M3 战斗 UI 命令(T15)
  /**
   * 战斗单行消息条(sdlpal 偷取"获得 X" 800ms / 逃跑失败 label 31)。present 在固定位置显示 text 一段时间
   * (durationMs 缺省 ~800ms)。CLASSIC 偷取真值走对话、逃跑失败走 PAL_BattleDelay wObjectID-label;ts 统一近似。
   */
  | { op: 'showBattleMessage'; text: string; durationMs?: number }
  /**
   * 战斗数字弹幕(HP/MP 变化)。逻辑 target(present 层解析屏幕坐标,杜绝漂移)。
   *
   * sdlpal 真值颜色(`fight.c:602-716 PAL_BattleDisplayStatChange`,sDamage=newHP-oldHP):
   *   - blue   = 掉血(受伤;sDamage<0 → value=oldHP-newHP)  `fight.c:648-651,678-681`
   *   - yellow = 回血(治疗;sDamage>0 → value=newHP-oldHP)  `fight.c:652-655,682-685`
   *   - cyan   = 回 MP(仅上升;`fight.c:706-709`)
   *  (旧注释 'yellow=伤害, blue=治疗' 与真值正好相反 — 已修正。)
   */
  | {
      op: 'showDamageNum'
      target: { kind: 'enemy' | 'player'; idx: number }
      value: number
      color: 'yellow' | 'blue' | 'cyan'
    }
  | { op: 'flashEnemy'; enemyIdx: number; durationMs: number }
  | { op: 'flashPlayer'; playerIdx: number; durationMs: number }
  | { op: 'playEnemyAttack'; enemyIdx: number; targetPlayerIdx: number }
  | { op: 'playPlayerAttack'; playerIdx: number; targetEnemyIdx: number }
  | {
      op: 'playMagicAnim'
      magicId: number
      casterType: 'enemy' | 'player'
      casterIdx: number
      targetType: 'enemy' | 'player'
      targetIdx: number | 'all'
    }
  | { op: 'playEnemyDeath'; enemyIdx: number }
  | { op: 'showBattleUI'; state: 'mainMenu' | 'magicMenu' | 'itemMenu' | 'targetSelect' | 'hidden' }
  // M6 音频意图(core 发,shell AudioManager Web Audio 消费;core 不碰 Web Audio):
  /** SFX 一次性播放(sdlpal `AUDIO_PlaySound(num)`,script.c:1708 0x47 / 战斗攻击受击 / 菜单)。soundId = SOUNDS.MKF chunk。 */
  | { op: 'playSound'; soundId: number }
  /**
   * BGM 播放(sdlpal `AUDIO_PlayMusic(num, loop, fade)`,script.c:1647 0x43 / 3032 CD / 战斗起手)。
   * musicId = Musics/{NNN}.mid track;loop = op1!=1(0x43 真值);fadeMs = 淡入毫秒(0x43 op1==3 → 3000)。
   */
  | { op: 'playMusic'; musicId: number; loop: boolean; fadeMs: number }
  /** 停 BGM(sdlpal `AUDIO_PlayMusic(0, FALSE, fade)`,script.c:2219 0x45 / 0x77 战斗停乐)。fadeMs = 淡出毫秒。 */
  | { op: 'stopMusic'; fadeMs: number }

export interface BusEntry {
  cmdId: number
  cmd: PresentCommand
}

export interface CommandBus {
  emit(cmd: PresentCommand): number
  drain(): BusEntry[]
  complete(cmdId: number): void
}

export function createCommandBus(): CommandBus {
  let queue: BusEntry[] = []
  let nextId = 1

  return {
    emit(cmd) {
      const cmdId = nextId++
      queue.push({ cmdId, cmd })
      return cmdId
    },
    drain() {
      const out = queue
      queue = []
      return out
    },
    complete(_cmdId) {
      // TODO(M3): 把异步资源跟 cmdId 关联,完成时调此回调;M2 内同步语义不需要。
    },
  }
}
