import { localize, subscribeLanguage } from './language.js'

/** Mount before network startup so the saved language also covers the initial loading UI. */
export function localizeStaticShell(): () => void {
  const render = (): void => {
    if (typeof document === 'undefined') return
    document.title = localize('仙剑奇侠传 · type-pal', 'Chinese Paladin · type-pal')
    const labels = [
      ['boot-loading-title', '仙剑奇侠传', 'Chinese Paladin'],
      ['boot-loading-sub', 'type-pal · 浏览器复刻', 'type-pal · Browser remake'],
      ['boot-loading-enter-btn', '▶ 进入游戏', '▶ Enter game'],
      [
        'boot-loading-hint',
        '越过虚线即可进入;竞速玩家可等满 100%(进游戏后零网络卡顿)',
        'Enter after the dashed line, or wait for 100% to cache all game resources.',
      ],
    ] as const
    for (const [id, chinese, english] of labels) {
      const element = document.getElementById(id)
      if (element) element.textContent = localize(chinese, english)
    }
    // Progress controllers own this node after their first update.
    const status = document.getElementById('boot-loading-status')
    if (status?.dataset.initial === 'true') status.textContent = localize('正在加载…', 'Loading…')
  }
  render()
  return subscribeLanguage(render)
}
