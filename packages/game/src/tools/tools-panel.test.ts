import { describe, expect, it, vi } from 'vitest'
import {
  makeEnemy,
  makePlayerRole,
  makePlayerRoles,
} from '../core/__tests__/stats/stats-test-fixtures.js'
import { createBattleState } from '../core/battle/battle-state.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../core/game-state.js'
import { createSeedableRng } from '../core/rng.js'
import { createMusicSourceController } from '../shell/music-source.js'
import { setupToolsPanel } from './tools-panel.js'
import {
  makeVolumeController,
  openSystemTab,
  useToolsPanelTestHost,
} from './tools-panel.test-fixtures.js'

const mkDeps = useToolsPanelTestHost()

describe('tools-panel 框架', () => {
  it('战斗页250ms轮询由受控时间推进：变化刷新、相同签名和关闭时不重绘', () => {
    setupToolsPanel(mkDeps())
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    ;[...document.querySelectorAll('.tp-tab')]
      .find((tab) => tab.textContent === '战斗')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const body = document.querySelector('.tp-body')!
    const initial = body.firstChild
    vi.advanceTimersByTime(249)
    expect(body.firstChild).toBe(initial)
    vi.advanceTimersByTime(1)
    expect(body.firstChild).not.toBe(initial)
    const polled = body.firstChild
    vi.advanceTimersByTime(250)
    expect(body.firstChild).toBe(polled)
    ;(document.querySelector('.tp-close') as HTMLElement).click()
    vi.advanceTimersByTime(250)
    expect(body.firstChild).toBe(polled)
  })

  it('setup 挂根节点(默认隐藏) + 唤出按钮 + 6 个左竖 tab + 注入样式', () => {
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

  // 点过 tab 后焦点落在面板内的按钮上,从该按钮派发的 ` keydown 会冒泡经 root 的 stopPropagation(防漏给游戏输入)。
  //   该 stopPropagation 须放行 Backquote,否则切换键到不了 window 监听 → 面板关不掉(user 2026-06-23 报)。
  it('点过 tab 后 ` 仍能关闭面板(焦点在面板内,Backquote 须放行冒泡到 window 切换器)', () => {
    setupToolsPanel(mkDeps())
    const root = document.getElementById('tp-tools-panel')!
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' })) // 开
    expect(root.hidden).toBe(false)
    const tab = document.querySelector('.tp-tab') as HTMLButtonElement
    tab.dispatchEvent(new MouseEvent('click', { bubbles: true })) // 点 tab(焦点落入面板内)
    // 真实场景:焦点在该 tab 按钮上,` 的 keydown 从面板内冒泡 —— 须仍能关闭
    tab.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote', bubbles: true }))
    expect(root.hidden).toBe(true)
  })

  it('× 关闭 + 点 tab 切换 active', () => {
    setupToolsPanel(mkDeps())
    const root = document.getElementById('tp-tools-panel')!
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' })) // 开
    const battleTab = [...document.querySelectorAll('.tp-tab')].find(
      (b) => b.textContent === '战斗',
    )!
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

  it('场景 tab:显示场景号 + 主角坐标', () => {
    const gs = createInitialGameState({ x: 512, y: 256, facing: 'right' })
    gs.wNumScene = 1
    setupToolsPanel(mkDeps({ getGs: () => gs }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' })) // 开;默认 scene tab
    const txt = document.getElementById('tp-tools-panel')!.textContent ?? ''
    expect(txt).toContain('512')
    expect(txt).toContain('256')
    expect(txt).toContain('#1') // 场景号
  })

  it('快捷键 tab:6 分区 + 同键不同义(战斗投掷 / 大世界装备)+ 工具与快存键', () => {
    setupToolsPanel(mkDeps())
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    document.querySelector<HTMLButtonElement>('.tp-tab[data-key="keys"]')!.click()
    const body = document.querySelector('.tp-body')!
    expect([...body.querySelectorAll('.tp-section-title')].map((e) => e.textContent)).toEqual([
      '通用',
      '大世界',
      '战斗',
      '工具',
      '快速存档 / 读档',
      '速通计时器',
    ])
    const sections = new Map<string, { keys: (string | null)[]; description: string | null }[]>()
    let current = ''
    for (const child of body.children) {
      if (child.classList.contains('tp-section-title')) {
        current = child.textContent ?? ''
        sections.set(current, [])
      } else if (child.classList.contains('tp-key-row')) {
        sections.get(current)!.push({
          keys: [...child.querySelectorAll('.tp-kbd')].map((e) => e.textContent),
          description: child.querySelector('.tp-key-desc')!.textContent,
        })
      }
    }
    // Caller约定见输入映射/scene/menu/battle dispatcher；同屏出现两段文字不足以证明接线正确。
    for (const [section, key, description] of [
      ['大世界', 'W', '装备'],
      ['大世界', 'F', '法术'],
      ['战斗', 'W', '投掷物品'],
      ['战斗', 'F', '强行攻击(整队)'],
      ['工具', '`', '打开 / 关闭工具面板'],
      ['快速存档 / 读档', 'F5', '快速存档 → 存档位 1'],
      ['快速存档 / 读档', 'F9', '快速读档 ← 存档位 1'],
      ['速通计时器', 'F8', '暂停 / 恢复(恢复有 3 秒倒计时)'],
      ['速通计时器', 'F4', '重置计时器本局'],
      ['速通计时器', 'F2', '显示 / 隐藏计时器覆盖层'],
    ] as const) {
      expect(sections.get(section)?.find((row) => row.keys.includes(key))?.description).toBe(
        description,
      )
    }
  })

  it('对话 tab:按场景分组(场景名标题) + 倒序(新在上、旧在下) + 搜索过滤', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wNumScene = 1
    gs.dialogHistory = [
      { map: 1, text: '你好' },
      { map: 1, text: '再会' },
      { map: 23, text: '城门见' },
    ]
    setupToolsPanel(mkDeps({ getGs: () => gs }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    ;[...document.querySelectorAll('.tp-tab')]
      .find((b) => b.textContent === '对话')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const groups = [...document.querySelectorAll('.tp-dialog-group')].map((e) => e.textContent)
    expect(groups).toEqual(['苏州城', '盛渔村']) // 倒序:最新(map 23 城门见)在上 → 苏州城段先
    const lines = [...document.querySelectorAll('.tp-dialog-line')].map((e) => e.textContent)
    expect(lines).toEqual(['城门见', '再会', '你好']) // 倒序:新在上、旧在下
    const search = document.querySelector('.tp-input') as HTMLInputElement
    search.value = '城门'
    search.dispatchEvent(new Event('input'))
    const filtered = [...document.querySelectorAll('.tp-dialog-line')].map((e) => e.textContent)
    expect(filtered).toEqual(['城门见'])
  })

  it('系统 tab 音频:音乐 / 音效 / 视频 三条音量滑块', () => {
    setupToolsPanel(mkDeps())
    openSystemTab()
    const labels = [...document.querySelectorAll('.tp-ctrl-label')].map((e) => e.textContent)
    expect(labels).toContain('音乐')
    expect(labels).toContain('音效')
    expect(labels).toContain('视频')
  })

  it('音乐音源选择通过实际控制器记住偏好，加载失败提供重试', async () => {
    let attempts = 0
    const musicSource = createMusicSourceController(
      (source) => ({
        play() {},
        stop() {},
        ready:
          source === 'rix' && ++attempts === 1
            ? Promise.reject(new Error('曲库不可用'))
            : Promise.resolve(),
      }),
      'midi',
    )
    setupToolsPanel(mkDeps({ musicSource }))
    openSystemTab()
    const select = document.querySelector<HTMLSelectElement>('#tp-music-source')!
    expect(select.value).toBe('midi')
    select.value = 'rix'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(localStorage.getItem('tp-music-source')).toBe('rix')
    expect(document.querySelector('#tp-music-source-status')?.textContent).toBe('正在加载音乐…')
    await Promise.resolve()
    expect(document.querySelector('#tp-music-source-status')?.textContent).toContain('曲库不可用')
    expect(document.querySelector<HTMLElement>('#tp-music-source-retry')?.hidden).toBe(false)
    document.querySelector<HTMLButtonElement>('#tp-music-source-retry')!.click()
    await Promise.resolve()
    expect(document.querySelector('#tp-music-source-status')?.textContent).toBe('')
    expect(document.querySelector<HTMLElement>('#tp-music-source-retry')?.hidden).toBe(true)
  })

  it('系统 tab:视频滑块 input → videoVolume.setVolume(0..1)', () => {
    const videoVolume = makeVolumeController()
    setupToolsPanel(mkDeps({ videoVolume }))
    openSystemTab()
    const row = [...document.querySelectorAll('.tp-ctrl-row')].find(
      (r) => r.querySelector('.tp-ctrl-label')?.textContent === '视频',
    )!
    const slider = row.querySelector('input[type=range]') as HTMLInputElement
    slider.value = '40'
    slider.dispatchEvent(new Event('input'))
    expect(videoVolume.setVolume).toHaveBeenCalledWith(0.4)
  })

  it('主静音按钮:一键 静音/恢复 音乐+音效+视频', () => {
    const audioVolume = makeVolumeController()
    const sfxVolume = makeVolumeController()
    const videoVolume = makeVolumeController()
    setupToolsPanel(mkDeps({ audioVolume, sfxVolume, videoVolume }))
    openSystemTab()
    const muteBtn = [...document.querySelectorAll('.tp-btn')].find((b) =>
      b.textContent?.includes('静音'),
    ) as HTMLButtonElement
    expect(muteBtn).toBeTruthy()
    // 第一次点 → 三路全静音
    muteBtn.click()
    expect(audioVolume.setMuted).toHaveBeenCalledWith(true)
    expect(sfxVolume.setMuted).toHaveBeenCalledWith(true)
    expect(videoVolume.setMuted).toHaveBeenCalledWith(true)
    // 再点 → 三路全恢复
    muteBtn.click()
    expect(audioVolume.setMuted).toHaveBeenLastCalledWith(false)
    expect(sfxVolume.setMuted).toHaveBeenLastCalledWith(false)
    expect(videoVolume.setMuted).toHaveBeenLastCalledWith(false)
  })

  it('主静音按钮:初始已静音 → 显示「已静音」态', () => {
    setupToolsPanel(mkDeps({ audioVolume: makeVolumeController(true) }))
    openSystemTab()
    const muteBtn = [...document.querySelectorAll('.tp-btn')].find((b) =>
      b.textContent?.includes('静音'),
    ) as HTMLButtonElement
    expect(muteBtn.textContent).toContain('已静音')
  })

  it('计时器 tab:渲染开关 + 21 个节点最佳时间输入', () => {
    setupToolsPanel(mkDeps())
    // 打开面板
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    // 点"计时器"tab
    const timerTab = [...document.querySelectorAll('.tp-tab')].find(
      (b) => b.textContent === '计时器',
    ) as HTMLButtonElement
    timerTab.click()
    const body = document.querySelector('.tp-body') as HTMLElement
    expect(body.querySelectorAll('.tp-toggle').length).toBe(3) // 三个开关
    expect(body.querySelectorAll('input.tp-input').length).toBe(21) // 21 节点最佳时间输入(input,不含跳转 select)
    // 测试用「跳到节点」控件:1 个 select,含 21 个节点选项
    const sel = body.querySelector('select.tp-input') as HTMLSelectElement
    expect(sel).not.toBeNull()
    expect(sel.querySelectorAll('option').length).toBe(21)
  })

  it('战斗 tab 敌方:每敌显示灵葫值(>0 显数字、=0 显「无」)', () => {
    const battleGs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    battleGs.wNumScene = 1
    battleGs.partyMembers = [0]
    const playerRoles = makePlayerRoles([
      makePlayerRole({ level: 1, hp: 10, maxHP: 10, mp: 0, maxMP: 0 }),
    ])
    hydratePlayerRolesRuntime(battleGs.PlayerRolesRuntime, playerRoles)
    const state = createBattleState({
      gs: battleGs,
      playerRoles,
      enemies: [
        makeEnemy({ id: 144, _name: '火神龙', health: 100, collectValue: 7 }),
        makeEnemy({ id: 1, _name: '史莱姆', health: 100, collectValue: 0 }),
      ],
      field: {
        id: 0,
        screenWave: 0,
        magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
      isBoss: false,
      rng: createSeedableRng(1),
    })
    battleGs.mode = 'battle'
    battleGs.battleState = state
    setupToolsPanel(
      mkDeps({
        getGs: () => battleGs,
        getResources: () => ({ playerRoles, objectPoisons: [], items: [], levelUpExp: [] }),
      }),
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    ;[...document.querySelectorAll('.tp-tab')]
      .find((b) => b.textContent === '战斗')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // 灵葫 chip(.s-collect):火神龙=7、史莱姆=无
    const collectChips = [...document.querySelectorAll('.s-collect')].map((e) => e.textContent)
    expect(collectChips).toEqual(['7', '无'])
    // Exercise the actual battle signature deterministically, rather than incidentally after 250ms.
    vi.advanceTimersByTime(250)
    const body = document.querySelector('.tp-body')!
    const previous = body.firstChild
    state.enemies[0]!.e.health = 77
    vi.advanceTimersByTime(250)
    expect(body.firstChild).not.toBe(previous)
    const enemyUnit = [...body.querySelectorAll('.tp-unit')].find(
      (unit) => unit.querySelector('.tp-unit-name')?.textContent === '火神龙',
    )!
    expect(enemyUnit.querySelector('.tp-unit-hp')?.textContent).toBe('HP 77/100')
    const hpRefreshed = body.firstChild
    state.turn += 1
    vi.advanceTimersByTime(250)
    expect(body.firstChild).not.toBe(hpRefreshed)
    expect(body.textContent).toContain('第 2 回合')
    const refreshed = body.firstChild
    vi.advanceTimersByTime(250)
    expect(body.firstChild).toBe(refreshed)
  })
})
