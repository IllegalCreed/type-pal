import { FRAME_MS_EXPLORE } from '@type-pal/shared'

/**
 * 把启动文案造出来 —— 抽成纯函数方便 vitest 在 node 环境断言。
 */
export function renderBootMessage(): string {
  return `M0 OK · ${FRAME_MS_EXPLORE}ms/frame`
}

/**
 * 浏览器入口 —— 仅在浏览器执行(测试时不会进这条分支)。
 */
if (typeof document !== 'undefined') {
  const canvas = document.getElementById('screen')
  if (canvas instanceof HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#222'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#fff'
      ctx.font = '14px monospace'
      ctx.fillText(renderBootMessage(), 16, 28)
    }
  }
}
