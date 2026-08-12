import type { DialogueCue } from '@type-pal/content'

/**
 * 战败红屏文案是无框的居中剧情字，不是 narration/reward-gain 单行卷轴。
 *
 * 上下空行对应 PAL 死亡段里的 `$00` / `$02` 控制行：正文落在逻辑坐标
 * y=58 / 76（center 起点 40，行距 18），并一次显示、只等一次确认。
 */
export function createGameOverDialogueCue(): DialogueCue {
  return {
    slot: 'center',
    rows: [
      { text: '', speed: 0 },
      { text: 'gameover.1', speed: 0 },
      { text: 'gameover.2', speed: 0 },
      { text: '', speed: 0 },
    ],
  }
}
