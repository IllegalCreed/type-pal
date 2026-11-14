import { type AssetId, type EnemyDef, lookupText, type WorldState } from '@type-pal/content'
import { AsyncIntentController, asyncIntentAbortError } from '../async-intent.js'
import { BATTLE_MUSIC_TRANSITION_MS, type BgmPlayer } from '../audio/bgm.js'
import {
  type BattleLaunchOptions,
  type BattleLaunchPreparation,
  isBattleAbort,
} from './battle-launch-preparation.js'
import type { BattleResult } from './battle-result.js'
import { BattleSession } from './battle-session.js'
import type { SettlementScreen } from './settlement.js'

export interface WorldBattlePresentation {
  showEntry(session: BattleSession): Promise<void>
  abortEntry(): void
  fadeOnVictory: boolean
}

export interface BattleHostPorts {
  readWorld(): WorldState
  exitFrameStep(): void
  /** Captures the script owner's epoch and returns a read-only assertion for this launch. */
  captureScriptOwner(team: string): () => void
  settleVictory(session: BattleSession, playVictory: () => void): SettlementScreen[]
  finishWorld(session: BattleSession, result: BattleResult): void
  /** 仅原生大世界战败流程持有该回调，用于接续最后一帧。 */
  worldDefeatFrameCapture?(signal: AbortSignal): (() => void) | undefined
  worldPresentation?(signal: AbortSignal): WorldBattlePresentation | undefined
  presentVictory?(
    owner: AbortSignal,
    signal: AbortSignal,
    finish: () => Promise<void>,
  ): Promise<void>
  runDefeated(
    definitions: readonly EnemyDef[],
    signal: AbortSignal,
    assertCurrent: () => void,
  ): Promise<void>
  recoverVictory?(): void
  restoreSceneSounds(): Promise<void>
  publishDebug(session: BattleSession | null): void
  reportReadiness(team: string, stage: string, error: Error, fatal: boolean): void
  reportRestoreFailure(error: unknown): void
}
export interface BattleHostMusic {
  bgm: Pick<BgmPlayer, 'play' | 'stop' | 'prepare'>
  victory(boss: boolean): AssetId
  locale: Record<string, string>
}

/** Sole owner of launch identity, active battle and its cleanup. Never owns the frame loop. */
export class BattleHost {
  #active: BattleSession | null = null
  #launch = new AsyncIntentController()
  #victoryPresentation: AbortController | null = null
  #entryPresentation?: WorldBattlePresentation
  #reported = new Set<string>()
  constructor(
    private readonly preparation: Pick<BattleLaunchPreparation, 'prepare'>,
    private readonly ports: BattleHostPorts,
    private readonly music: BattleHostMusic,
  ) {}
  get active(): BattleSession | null {
    return this.#active
  }
  cancel(): void {
    this.#launch.invalidate()
    this.#active?.cancel()
    this.#victoryPresentation?.abort()
    this.#entryPresentation?.abortEntry()
  }
  async start(
    team: string,
    options?: BattleLaunchOptions,
    runnerSignal?: AbortSignal,
  ): Promise<BattleResult> {
    this.assertRunner(runnerSignal, team)
    this.ports.exitFrameStep()
    const token = this.#launch.begin()
    this.#victoryPresentation?.abort()
    this.#entryPresentation?.abortEntry()
    const assertScript = this.ports.captureScriptOwner(team)
    const world = this.ports.readWorld()
    // DEV/hostile launches without a runner must not borrow the main script's signal.
    const signal = runnerSignal ?? new AbortController().signal
    const assertCurrent = () => {
      this.assertRunner(signal, team)
      this.#launch.assertCurrent(token, `${team} 战斗启动意图已失效`)
      assertScript()
      if (this.ports.readWorld() !== world)
        throw asyncIntentAbortError(`${team} 战斗启动所属世界已失效`)
    }
    const worldPresentation = this.ports.worldPresentation?.(signal)
    if (worldPresentation) {
      this.#entryPresentation = worldPresentation
      this.music.bgm.stop()
    }
    try {
      return await this.launch(team, options, signal, assertCurrent, worldPresentation)
    } catch (error) {
      if (worldPresentation && this.#entryPresentation === worldPresentation) {
        assertCurrent()
        this.restoreWorldMusic()
      }
      throw error
    } finally {
      if (this.#entryPresentation === worldPresentation) this.#entryPresentation = undefined
    }
  }

  private async launch(
    team: string,
    options: BattleLaunchOptions | undefined,
    signal: AbortSignal,
    assertCurrent: () => void,
    worldPresentation: WorldBattlePresentation | undefined,
  ): Promise<BattleResult> {
    let pendingMusic: Promise<() => void> | undefined
    const prepared = await scriptWorkIO(
      this.preparation.prepare(
        team,
        options,
        signal,
        assertCurrent,
        (id, stage, error, fatal) => this.report(id, stage, error, fatal),
        worldPresentation
          ? (asset) => {
              pendingMusic = this.music.bgm.prepare(asset, signal)
            }
          : undefined,
      ),
      signal,
    )
    assertCurrent()
    let playedVictory = false
    const restoreMusic = () => {
      if (worldPresentation) this.restoreWorldMusic()
      else if (prepared.battleTrack !== undefined || playedVictory) {
        const persistent = this.ports.readWorld().audio?.currentMusic
        if (persistent === null) this.music.bgm.stop(BATTLE_MUSIC_TRANSITION_MS)
        else if (persistent) this.music.bgm.play(persistent, true, BATTLE_MUSIC_TRANSITION_MS)
      }
    }
    const playBattleMusic = (fadeMs: number) => {
      if (prepared.battleTrack === null) this.music.bgm.stop(fadeMs)
      else this.music.bgm.play(prepared.battleTrack, true, fadeMs)
    }
    if (!worldPresentation) playBattleMusic(BATTLE_MUSIC_TRANSITION_MS)
    const { sessionAssets, sessionOptions } = prepared.commit()
    const captureDefeatFrame = this.ports.worldDefeatFrameCapture?.(signal)
    const session: BattleSession = new BattleSession(
      prepared.players,
      prepared.enemySlots,
      sessionAssets,
      (id) => {
        const c = this.ports.readWorld().party.find((x) => x.id === id)
        return c ? lookupText(`name.${c.template}`, this.music.locale) : id
      },
      Math.random,
      {
        ...sessionOptions,
        ...(worldPresentation ? { worldSettlement: { boss: options?.boss === true } } : {}),
        handoffDefeat: captureDefeatFrame !== undefined,
        playMusic: (asset) => this.music.bgm.play(asset),
        stopMusic: () => this.music.bgm.stop(),
        buildSettlement: () => {
          assertCurrent()
          return this.ports.settleVictory(session, () => {
            this.music.bgm.play(
              this.music.victory(!!options?.boss),
              false,
              worldPresentation ? 0 : BATTLE_MUSIC_TRANSITION_MS,
            )
            playedVictory = true
          })
        },
      },
    )
    const presentation = worldPresentation && {
      enter: async () => {
        try {
          // A cold MIDI read may finish after the other resources. Keep the held world
          // until both are ready rather than exposing the menu before playback.
          const playPrepared = pendingMusic ? await scriptWorkIO(pendingMusic, signal) : undefined
          assertCurrent()
          await worldPresentation.showEntry(session)
          assertCurrent()
          if (playPrepared) playPrepared()
          else playBattleMusic(0)
          this.#active = session
        } finally {
          if (this.#entryPresentation === worldPresentation) this.#entryPresentation = undefined
        }
      },
      fadeOnVictory: worldPresentation.fadeOnVictory,
    }
    if (!presentation) this.#active = session
    return await this.awaitSession(
      session,
      signal,
      assertCurrent,
      restoreMusic,
      captureDefeatFrame,
      presentation,
    )
  }

  private restoreWorldMusic(): void {
    const track = this.ports.readWorld().audio?.currentMusic
    if (track) this.music.bgm.play(track)
    else this.music.bgm.stop()
  }

  private async awaitSession(
    session: BattleSession,
    signal: AbortSignal,
    assertCurrent: () => void,
    restoreMusic: () => void,
    captureDefeatFrame: (() => void) | undefined,
    presentation?: { enter(): Promise<void>; fadeOnVictory: boolean },
  ): Promise<BattleResult> {
    const abort = () => {
      if (!published || this.#active === session) session.cancel()
    }
    let published = false
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    let result: BattleResult
    try {
      if (presentation) {
        // A replacement can cancel the session before command input is enabled.
        void session.done.catch(() => undefined)
        await presentation.enter()
      }
      this.ports.publishDebug(session)
      published = true
      result = await scriptWorkWait<BattleResult>(signal, (resolve, reject) => {
        void session.done.then(resolve, reject)
      })
      if (result === 'defeat') {
        assertCurrent()
        captureDefeatFrame?.()
      }
    } catch (error) {
      if (presentation && !published) session.cancel(error)
      if (!isBattleAbort(error)) {
        await scriptWorkIO(this.ports.restoreSceneSounds(), signal).catch((error) =>
          this.ports.reportRestoreFailure(error),
        )
        assertCurrent()
        restoreMusic()
      }
      throw error
    } finally {
      signal.removeEventListener('abort', abort)
      // A late old session must never clear the newer active instance.
      if (this.#active === session) {
        this.ports.publishDebug(null)
        this.#active = null
      }
    }
    // Releasing the active slot and committing results share the same continuation.
    // An extra await between these operations would expose an uncommitted world to other work.
    assertCurrent()
    this.ports.finishWorld(session, result)
    await this.finishEncounter(
      session,
      result,
      signal,
      assertCurrent,
      restoreMusic,
      presentation?.fadeOnVictory === true,
    )
    return result
  }

  private async finishEncounter(
    session: BattleSession,
    result: BattleResult,
    signal: AbortSignal,
    assertCurrent: () => void,
    restoreMusic: () => void,
    fadeOnVictory: boolean,
  ) {
    const definitions = result === 'victory' ? session.enemySlotDefs() : []
    const finish = async (scriptSignal: AbortSignal): Promise<void> => {
      let failure: { error: unknown } | undefined
      if (result === 'victory') {
        try {
          await this.ports.runDefeated(definitions, scriptSignal, assertCurrent)
        } catch (error) {
          if (isBattleAbort(error)) throw error
          failure = { error }
        }
        assertCurrent()
        this.ports.recoverVictory?.()
      }
      await scriptWorkIO(this.ports.restoreSceneSounds(), scriptSignal)
      assertCurrent()
      if (result !== 'defeat') restoreMusic()
      if (failure) throw failure.error
    }
    if (
      result === 'victory' &&
      this.ports.presentVictory &&
      (fadeOnVictory || definitions.some((def) => def.onDefeated?.length))
    ) {
      const controller = new AbortController()
      this.#victoryPresentation = controller
      // The battle no longer owns input, but replacement or a parent abort still cancels its scripts.
      const scriptSignal = AbortSignal.any([signal, controller.signal])
      try {
        await this.ports.presentVictory(signal, scriptSignal, () => finish(scriptSignal))
      } finally {
        if (this.#victoryPresentation === controller) this.#victoryPresentation = null
      }
    } else {
      await finish(signal)
    }
  }
  private assertRunner(signal: AbortSignal | undefined, team: string) {
    if (signal?.aborted) throw asyncIntentAbortError(`${team} 战斗所属 runner 已取消`)
  }
  private report(team: string, stage: string, error: Error, fatal: boolean) {
    const key = `${team}:${error.name}:${error.message}`
    if (this.#reported.has(key)) return
    this.#reported.add(key)
    this.ports.reportReadiness(team, stage, error, fatal)
  }
}

import { scriptWorkIO, scriptWorkWait } from '../script-work-queue.js'
