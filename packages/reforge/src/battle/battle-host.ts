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

export interface BattleHostPorts {
  readWorld(): WorldState
  exitFrameStep(): void
  /** Captures the script owner's epoch and returns a read-only assertion for this launch. */
  captureScriptOwner(team: string): () => void
  settleVictory(session: BattleSession, playVictory: () => void): SettlementScreen[]
  finishWorld(session: BattleSession, result: BattleResult): void
  runDefeated(
    definitions: readonly EnemyDef[],
    signal: AbortSignal,
    assertCurrent: () => void,
  ): Promise<void>
  restoreSceneSounds(): Promise<void>
  publishDebug(session: BattleSession | null): void
  reportReadiness(team: string, stage: string, error: Error, fatal: boolean): void
  reportRestoreFailure(error: unknown): void
}
export interface BattleHostMusic {
  bgm: Pick<BgmPlayer, 'play' | 'stop'>
  victory(boss: boolean): AssetId
  locale: Record<string, string>
}

/** Sole owner of launch identity, active battle and its cleanup. Never owns the frame loop. */
export class BattleHost {
  #active: BattleSession | null = null
  #launch = new AsyncIntentController()
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
  }
  async start(
    team: string,
    options?: BattleLaunchOptions,
    runnerSignal?: AbortSignal,
  ): Promise<BattleResult> {
    this.assertRunner(runnerSignal, team)
    this.ports.exitFrameStep()
    const token = this.#launch.begin()
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
    const prepared = await this.preparation.prepare(
      team,
      options,
      signal,
      assertCurrent,
      (id, stage, error, fatal) => this.report(id, stage, error, fatal),
    )
    assertCurrent()
    let playedVictory = false
    const restoreMusic = () => {
      if (prepared.battleTrack === undefined && !playedVictory) return
      const persistent = this.ports.readWorld().audio?.currentMusic
      if (persistent === null) this.music.bgm.stop(BATTLE_MUSIC_TRANSITION_MS)
      else if (persistent) this.music.bgm.play(persistent, true, BATTLE_MUSIC_TRANSITION_MS)
    }
    if (prepared.battleTrack === null) this.music.bgm.stop(BATTLE_MUSIC_TRANSITION_MS)
    else this.music.bgm.play(prepared.battleTrack, true, BATTLE_MUSIC_TRANSITION_MS)
    const { sessionAssets, sessionOptions } = prepared.commit()
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
        playMusic: (asset) => this.music.bgm.play(asset),
        stopMusic: () => this.music.bgm.stop(),
        buildSettlement: () => {
          assertCurrent()
          return this.ports.settleVictory(session, () => {
            this.music.bgm.play(
              this.music.victory(!!options?.boss),
              false,
              BATTLE_MUSIC_TRANSITION_MS,
            )
            playedVictory = true
          })
        },
      },
    )
    this.#active = session
    const result = await this.awaitSession(session, signal, assertCurrent, restoreMusic)
    assertCurrent()
    this.ports.finishWorld(session, result)
    await this.finishEncounter(session, result, signal, assertCurrent, restoreMusic)
    return result
  }

  private async awaitSession(
    session: BattleSession,
    signal: AbortSignal,
    assertCurrent: () => void,
    restoreMusic: () => void,
  ): Promise<BattleResult> {
    const abort = () => {
      if (this.#active === session) session.cancel()
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    this.ports.publishDebug(session)
    try {
      return await session.done
    } catch (error) {
      if (!isBattleAbort(error)) {
        await this.ports
          .restoreSceneSounds()
          .catch((error) => this.ports.reportRestoreFailure(error))
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
  }

  private async finishEncounter(
    session: BattleSession,
    result: BattleResult,
    signal: AbortSignal,
    assertCurrent: () => void,
    restoreMusic: () => void,
  ) {
    let failed = false
    let failure: unknown
    try {
      if (result === 'victory')
        await this.ports.runDefeated(session.enemySlotDefs(), signal, assertCurrent)
    } catch (error) {
      if (isBattleAbort(error)) throw error
      failed = true
      failure = error
    }
    await this.ports.restoreSceneSounds()
    assertCurrent()
    if (result !== 'defeat') restoreMusic()
    if (failed) throw failure
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
