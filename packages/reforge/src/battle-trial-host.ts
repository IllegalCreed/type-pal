/** Isolated real BattleSession host. Deliberately has no dependency on save stores or world boot. */
import { lookupText } from '@type-pal/content'
import { createBgmPlayer } from './audio/bgm.js'
import { SfxPlayer } from './audio/sfx.js'
import { collectTurnActionSounds } from './audio/sfx-readiness.js'
import type { BattleSession } from './battle/battle-session.js'
import { finishBattleWorldState } from './battle/battle-world-result.js'
import { abortableTrial, prepareBattleTrialAssets, trialAbortError } from './battle-trial-assets.js'
import { type BattleTrialConfig, parseBattleTrialConfig } from './battle-trial-config.js'
import { createBattleTrialSession } from './battle-trial-session.js'
import { DialogBox } from './dialog/dialog-box.js'
import { assertEngineChromeComplete } from './engine-chrome/registry.js'
import { GameplayClock } from './gameplay-clock.js'
import type { LoadedCurrentProject } from './project-loader.js'

export interface BattleTrialHostOptions {
  signal: AbortSignal
  sourceToken: string
  revision: string
  withReadLock?: <T>(read: () => Promise<T>) => Promise<T>
  onRestart: () => void
  onResult?: (result: string) => void
}

export async function runBattleTrial(
  project: LoadedCurrentProject,
  input: BattleTrialConfig,
  options: BattleTrialHostOptions,
): Promise<void> {
  const config = parseBattleTrialConfig(input)
  const canvas = document.getElementById('screen') as HTMLCanvasElement | null
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) throw new Error('独立试打缺少可用画布')
  assertEngineChromeComplete()
  document.title = `${project.manifest.name} · 独立试打`
  const panel = document.createElement('section')
  panel.className = 'battle-trial-controls'
  const label = document.createElement('p')
  label.textContent = '独立试打 · 不读取或写入正常游戏存档；不运行场景战后剧情'
  const status = document.createElement('p')
  status.setAttribute('role', 'status')
  status.textContent = '正在准备战斗资源…'
  const actions = document.createElement('div')
  const button = (text: string) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = text
    actions.append(b)
    return b
  }
  const stop = button('停止试打'),
    restart = button('重新试打'),
    close = button('关闭本页')
  restart.disabled = true
  panel.append(label, status, actions)
  canvas.before(panel)
  canvas.setAttribute('aria-label', '独立试打；方向键选择，空格或回车确认，Escape返回战斗菜单')
  canvas.tabIndex = 0
  const controller = new AbortController()
  const abort = () => controller.abort()
  options.signal.addEventListener('abort', abort, { once: true })
  window.addEventListener('pagehide', abort, { once: true })
  if (options.signal.aborted) abort()
  let releaseResources = () => {},
    stopAudio = () => {},
    stopped = false,
    frame = 0
  let session: BattleSession | undefined
  let scale = 1
  const pressed = new Set<string>(),
    clock = new GameplayClock()
  const fit = () => {
    scale = Math.max(
      1,
      Math.min(
        4,
        Math.floor(
          Math.min(
            innerWidth / 320,
            (innerHeight - panel.getBoundingClientRect().height - 24) / 200,
          ),
        ),
      ),
    )
    canvas.width = scale * 320
    canvas.height = scale * 200
    canvas.style.width = `${canvas.width}px`
    canvas.style.height = `${canvas.height}px`
  }
  const blur = () => pressed.clear()
  const keys = new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Enter',
    ' ',
    'Escape',
    'F5',
    'F9',
    'a',
    'A',
    'd',
    'D',
    'q',
    'Q',
    'e',
    'E',
    'w',
    'W',
    'r',
    'R',
    'f',
    'F',
  ])
  const keydown = (event: KeyboardEvent) => {
    if (!keys.has(event.key)) return
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('button') &&
      [' ', 'Enter'].includes(event.key)
    )
      return
    event.preventDefault()
    if (event.key === 'F5' || event.key === 'F9') {
      status.textContent = '独立试打不提供存档/读档，本场结果不会保存。'
      return
    }
    if (!event.repeat && session && !stopped) pressed.add(event.key)
  }
  const cleanupRun = () => {
    stopped = true
    cancelAnimationFrame(frame)
    pressed.clear()
    stopAudio()
    window.removeEventListener('keydown', keydown)
    window.removeEventListener('blur', blur)
    window.removeEventListener('resize', fit)
    stop.disabled = true
    restart.disabled = options.signal.aborted
  }
  controller.signal.addEventListener(
    'abort',
    () => {
      session?.cancel()
      cleanupRun()
      releaseResources()
      status.textContent = '试打已取消，本场变化已丢弃。请从编辑器重新开始。'
    },
    { once: true },
  )
  stop.onclick = () => {
    abort()
    status.textContent = '已停止。本场变化已丢弃，可重新试打。'
  }
  restart.onclick = () => {
    try {
      options.onRestart()
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error)
    }
  }
  close.onclick = () => {
    abort()
    window.close()
  }
  fit()
  window.addEventListener('resize', fit)
  window.addEventListener('keydown', keydown)
  window.addEventListener('blur', blur)
  const active = () => {
    if (controller.signal.aborted) throw trialAbortError()
  }
  try {
    const prepare = () =>
      prepareBattleTrialAssets(
        project,
        config,
        options.sourceToken,
        controller.signal,
        options.revision,
      )
    const loaded = await abortableTrial(
      options.withReadLock ? options.withReadLock(prepare) : prepare(),
      controller.signal,
    )
    releaseResources = loaded.dispose
    active()
    const { prepared, assets, baseSounds } = loaded
    const { world, items } = prepared
    const before = structuredClone(world)
    const sfx = new SfxPlayer(loaded.project.assetResolver)
    // Own the first allocation before constructing the second backend: AudioContext can throw.
    stopAudio = () => {
      void sfx.dispose().catch((error) => console.warn('[trial audio dispose]', error))
    }
    const bgm = createBgmPlayer(loaded.project.assetResolver)
    const resume = () => {
      if (!stopped) {
        bgm.resume()
        void sfx.resume().catch((error) => console.warn('[trial audio]', error))
      }
    }
    window.addEventListener('pointerdown', resume, { capture: true })
    window.addEventListener('keydown', resume, { capture: true })
    stopAudio = () => {
      void bgm.dispose().catch((error) => console.warn('[trial music dispose]', error))
      void sfx.dispose().catch((error) => console.warn('[trial audio dispose]', error))
      window.removeEventListener('pointerdown', resume, { capture: true })
      window.removeEventListener('keydown', resume, { capture: true })
    }
    bgm.setEnabled(config.music.kind !== 'silent')
    await abortableTrial(sfx.prepare(baseSounds), controller.signal)
    active()
    const dialogBox = new DialogBox(
      ctx,
      assets.glyphs,
      loaded.cursorFrames,
      loaded.portraits,
      project.locale,
      assets.ui.scroll,
    )
    const actual = createBattleTrialSession(
      prepared,
      project,
      { ...assets, sfx, dialogBox },
      {
        active,
        playMusic: (asset) => {
          active()
          bgm.play(asset)
        },
        stopMusic: () => bgm.stop(),
        prepareTurnSounds: async (snapshot) => {
          active()
          const sounds = collectTurnActionSounds({
            pendingActions: snapshot.actions.values(),
            activePlayerPoisons: snapshot.activePlayerPoisons,
            activeEnemyPoisons: snapshot.activeEnemyPoisons,
            skills: project.skills,
            itemsById: items,
            poisonDefs: project.poisonsById,
          })
          await sfx.prepare(new Set([...baseSounds, ...sounds]))
          active()
        },
        reportReadinessError: (error) => {
          status.textContent = error.message
        },
        onExpReward: () => {
          active()
          const asset =
            project.manifest.assets.roles[
              config.boss ? 'audio.bossVictoryMusic' : 'audio.normalVictoryMusic'
            ]
          if (asset) bgm.play(asset, false)
        },
      },
    )
    session = actual
    const track =
      config.music.kind === 'asset'
        ? config.music.assetId
        : config.music.kind === 'default'
          ? project.manifest.assets.roles['audio.defaultBattleMusic']
          : undefined
    if (track) bgm.play(track)
    status.textContent = prepared.warnings.length
      ? prepared.warnings.map((x) => x.message).join('；')
      : '战斗中 · 按正式规则消耗真气、物品与金钱'
    canvas.focus()
    const tick = (now: number) => {
      if (stopped || controller.signal.aborted) return
      try {
        const clockFrame = clock.advance(now, document.hidden)
        actual.tick(clockFrame.gameplayDt, pressed, clockFrame.gameplayNow)
        pressed.clear()
        actual.render(ctx, scale)
        frame = requestAnimationFrame(tick)
      } catch (error) {
        actual.cancel(error)
      }
    }
    frame = requestAnimationFrame(tick)
    const result = await actual.done
    active()
    finishBattleWorldState(actual, result, world, project)
    cleanupRun()
    releaseResources()
    const outcome = result === 'victory' ? '胜利' : result === 'defeat' ? '失败' : '战斗结束'
    status.textContent =
      `${outcome}；金钱 ${before.money} → ${world.money}；` +
      world.party
        .map(
          (c, i) =>
            `${lookupText(project.actorsById[c.template]?.name ?? c.template, project.locale)} 体力 ${before.party[i]?.hp} → ${c.hp}，真气 ${before.party[i]?.mp} → ${c.mp}`,
        )
        .join('；') +
      '。本场结果不保存。'
    options.onResult?.(outcome)
  } catch (error) {
    cleanupRun()
    releaseResources()
    if (!controller.signal.aborted) {
      status.setAttribute('role', 'alert')
      status.textContent = `试打未完成：${error instanceof Error ? error.message : String(error)}。请返回编辑器检查，或重新试打。`
    }
  } finally {
    options.signal.removeEventListener('abort', abort)
    window.removeEventListener('pagehide', abort)
  }
}
