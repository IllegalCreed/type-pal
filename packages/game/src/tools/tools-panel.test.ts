import { beforeEach, describe, expect, it } from 'vitest'
import { setupToolsPanel, type ToolsPanelDeps } from './tools-panel.js'
import { __resetSpeedrunForTest } from './speedrun/index.js'

function mkDeps(over: Partial<ToolsPanelDeps> = {}): ToolsPanelDeps {
  return {
    getGs: () =>
      ({
        mode: 'explore',
        wNumScene: 1,
        party: { x: 0, y: 0, facing: 'down' },
        camera: { x: 0, y: 0 },
        partyMembers: [0],
        menuStack: [],
        dialogHistory: [],
      }) as never,
    getResources: () => ({ playerRoles: { roles: [] }, objectPoisons: [], items: [] }) as never,
    displayScale: { getPercent: () => 100, setPercent: () => {}, toggleFullscreen: () => {} },
    audioVolume: { getVolume: () => 0.8, setVolume: () => {}, isMuted: () => false, setMuted: () => {} },
    sfxVolume: { getVolume: () => 0.8, setVolume: () => {}, isMuted: () => false, setMuted: () => {} },
    saveSlot: async () => {},
    loadSlot: async () => null,
    ...over,
  }
}

describe('tools-panel 框架', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.getElementById('tp-tools-style')?.remove()
    __resetSpeedrunForTest()
  })

  it('setup 挂根节点(默认隐藏) + 唤出印钮 + 6 个左竖 tab + 注入样式', () => {
    setupToolsPanel(mkDeps())
    const root = document.getElementById('tp-tools-panel')
    expect(root).not.toBeNull()
    expect(root!.hidden).toBe(true)
    expect(document.getElementById('tp-tools-launcher')).not.toBeNull()
    expect(document.getElementById('tp-tools-style')).not.toBeNull()
    expect(document.querySelectorAll('.tp-tab').length).toBe(6)
  })

  it('反引号 toggle 显隐', () => {
    setupToolsPanel(mkDeps())
    const root = document.getElementById('tp-tools-panel')!
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    expect(root.hidden).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    expect(root.hidden).toBe(true)
  })

  it('× 关闭 + 点 tab 切换 active', () => {
    setupToolsPanel(mkDeps())
    const root = document.getElementById('tp-tools-panel')!
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' })) // 开
    const battleTab = [...document.querySelectorAll('.tp-tab')].find((b) => b.textContent === '战斗')!
    battleTab.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(battleTab.classList.contains('tp-tab-active')).toBe(true)
    ;(document.querySelector('.tp-close') as HTMLElement).click()
    expect(root.hidden).toBe(true)
  })

  it('幂等:重复 setup 不重复挂', () => {
    setupToolsPanel(mkDeps())
    setupToolsPanel(mkDeps())
    expect(document.querySelectorAll('#tp-tools-panel').length).toBe(1)
  })

  it('场景 tab:显示场景名 + 主角坐标', () => {
    setupToolsPanel(
      mkDeps({
        getGs: () =>
          ({
            mode: 'explore',
            wNumScene: 1,
            party: { x: 512, y: 256, facing: 'right' },
            camera: { x: 0, y: 0 },
            partyMembers: [0],
            menuStack: [],
            dialogHistory: [],
          }) as never,
      }),
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' })) // 开;默认 scene tab
    const txt = document.getElementById('tp-tools-panel')!.textContent ?? ''
    expect(txt).toContain('512')
    expect(txt).toContain('256')
    expect(txt).toContain('#1') // 场景号
  })

  it('快捷键 tab:5 分区 + 同键不同义(战斗投掷 / 大世界装备)+ 工具与快存键', () => {
    setupToolsPanel(mkDeps())
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    ;[...document.querySelectorAll('.tp-tab')]
      .find((b) => b.textContent === '快捷键')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const txt = document.getElementById('tp-tools-panel')!.textContent ?? ''
    for (const s of ['通用', '大世界', '战斗', '工具', '快速存档 / 读档']) expect(txt).toContain(s)
    // W/F 在战斗与大世界含义不同,两套都列出(原版真值)
    expect(txt).toContain('投掷物品') // 战斗 W
    expect(txt).toContain('装备') // 大世界 W
    expect(txt).toContain('强行攻击(整队)') // 战斗 F
    expect(txt).toContain('法术') // 大世界 F
    const caps = [...document.querySelectorAll('.tp-kbd')].map((e) => e.textContent)
    expect(caps).toContain('`') // 工具面板开关
    expect(caps).toContain('F5') // 快存
    expect(caps).toContain('F9') // 快读
  })

  it('对话 tab:按场景分组(场景名标题) + 正序 + 搜索过滤', () => {
    setupToolsPanel(
      mkDeps({
        getGs: () =>
          ({
            mode: 'explore',
            wNumScene: 1,
            party: { x: 0, y: 0, facing: 'down' },
            camera: { x: 0, y: 0 },
            partyMembers: [0],
            menuStack: [],
            dialogHistory: [
              { map: 1, text: '你好' },
              { map: 1, text: '再会' },
              { map: 23, text: '城门见' },
            ],
          }) as never,
      }),
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    ;[...document.querySelectorAll('.tp-tab')]
      .find((b) => b.textContent === '对话')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const groups = [...document.querySelectorAll('.tp-dialog-group')].map((e) => e.textContent)
    expect(groups).toContain('盛渔村') // map 1
    expect(groups).toContain('苏州城') // map 23
    const lines = [...document.querySelectorAll('.tp-dialog-line')].map((e) => e.textContent)
    expect(lines).toEqual(['你好', '再会', '城门见']) // 正序
    const search = document.querySelector('.tp-input') as HTMLInputElement
    search.value = '城门'
    search.dispatchEvent(new Event('input'))
    const filtered = [...document.querySelectorAll('.tp-dialog-line')].map((e) => e.textContent)
    expect(filtered).toEqual(['城门见'])
  })

  it('计时器 tab:渲染开关 + 21 个节点最佳时间输入', () => {
    setupToolsPanel(mkDeps())
    // 打开面板
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    // 点"计时器"tab
    const timerTab = [...document.querySelectorAll('.tp-tab')].find((b) => b.textContent === '计时器') as HTMLButtonElement
    timerTab.click()
    const body = document.querySelector('.tp-body') as HTMLElement
    expect(body.querySelectorAll('.tp-toggle').length).toBe(3) // 三个开关
    expect(body.querySelectorAll('.tp-input').length).toBe(21) // 21 节点输入
  })
})
