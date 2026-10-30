/**
 * Core → Present 单向命令通道(02 架构 + D15)。
 * Core 系统在 tick 内 emit;shell 在 tick 末 drain 后分发给音频/画面消费者。
 * 队列只传实际音画意图；脚本对白和法术动画由状态/时间线各自持有。
 */

export type PresentCommand =
  // M3 战斗 UI 命令(T15)
  /**
   * 战斗单行消息条(sdlpal 逃跑失败 label 31 等)。present 在固定位置显示 text 一段时间
   * (durationMs 缺省 ~800ms)。CLASSIC 偷取真值走对话;逃跑失败走 PAL_BattleDelay wObjectID-label。
   */
  | { op: 'showBattleMessage'; text: string; durationMs?: number; pos?: { x: number; y: number } }
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
  | { op: 'playEnemyAttack'; enemyIdx: number; targetPlayerIdx: number }
  | { op: 'playPlayerAttack'; playerIdx: number; targetEnemyIdx: number }
  | { op: 'playEnemyDeath'; enemyIdx: number }
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
  cmd: PresentCommand
}

export interface CommandBus {
  emit(cmd: PresentCommand): void
  drain(): BusEntry[]
}

export function createCommandBus(): CommandBus {
  let queue: BusEntry[] = []

  return {
    emit(cmd) {
      queue.push({ cmd })
    },
    drain() {
      const out = queue
      queue = []
      return out
    },
  }
}
