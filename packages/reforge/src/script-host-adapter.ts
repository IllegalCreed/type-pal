import type { EntityAddress, SceneSpawn } from '@type-pal/content'
import type { BaseRuntimeLeafCommand } from './script-compiler-core.js'
import type { ScriptHost } from './script-runner.js'
import type { ScriptRuntimeContext } from './script-runner-core.js'

export interface ScriptHostAdapterOptions {
  currentSceneId(): string
}

function activeEntity(
  target: EntityAddress | undefined,
  options: ScriptHostAdapterOptions,
): string | undefined {
  return target?.scene === options.currentSceneId() ? target.entity : undefined
}

/**
 * 把 current leaf 的画面/音频/战斗外壳副作用交给现有 ScriptHost。
 * canonical world-state 已由 BaseProjectScriptRuntimeHost 先行处理；这里不持有第二份真值。
 */
export async function executeScriptHostEffect(
  host: ScriptHost,
  command: BaseRuntimeLeafCommand,
  context: Readonly<ScriptRuntimeContext>,
  signal: AbortSignal,
  options: ScriptHostAdapterOptions,
): Promise<void> {
  switch (command.kind) {
    case 'dialog':
      await host.dialog(command.cue, signal)
      return
    case 'clearDialog':
      host.clearDialog()
      return
    case 'fade':
      await host.fade(command.dir, command.ms ?? 300, command.color, signal)
      return
    case 'ditherScreen':
      await host.ditherScreen(command.ms ?? 720, signal)
      return
    case 'chasePlayer': {
      const entity = activeEntity(context.self, options)
      if (entity)
        await host.chaseStep(
          entity,
          command.range ?? 8,
          command.speed ?? 4,
          command.floating ?? false,
          signal,
        )
      return
    }
    case 'vanishEntity': {
      const entity = activeEntity(command.target ?? context.self, options)
      if (entity) host.vanishEntity(entity, command.seconds ?? 2)
      return
    }
    case 'loadLastSave':
      await host.loadLastSave(signal)
      return
    case 'gameOver':
      await host.gameOver(signal)
      return
    case 'wait':
      await host.wait(command.ms, signal)
      return
    case 'teleportParty':
      host.teleportParty(command.pos, command.facing)
      return
    case 'loadScene':
      {
        const spawn = {
          ...(command.entryId !== undefined ? { entryId: command.entryId } : {}),
          ...(command.pos !== undefined ? { pos: command.pos } : {}),
          ...(command.facing !== undefined ? { facing: command.facing } : {}),
        } as SceneSpawn
        if (command.transition === undefined) await host.loadScene(command.scene, spawn, signal)
        else await host.loadScene(command.scene, spawn, signal, command.transition)
      }
      return
    case 'setPartyFacing':
      host.setPartyFacing(command.facing, command.gesture, command.member)
      return
    case 'setActorSprite':
      await host.setActorSprite(command.actor, command.sprite, signal)
      return
    case 'setActorAppearance':
      await host.setActorAppearance?.(
        command.actor,
        {
          ...(command.spriteId !== undefined ? { spriteId: command.spriteId } : {}),
          ...(command.portrait !== undefined ? { portrait: command.portrait } : {}),
          ...(command.battleSprite !== undefined ? { battleSprite: command.battleSprite } : {}),
        },
        signal,
      )
      return
    case 'fleeBattle':
      host.fleeBattle()
      return
    case 'setEntityState': {
      const entity = activeEntity(command.target, options)
      if (entity) host.setEntityState(entity, command.state)
      return
    }
    case 'setMultiEntityState': {
      const entity = command.targets
        .map((target) => activeEntity(target, options))
        .find((candidate): candidate is string => candidate !== undefined)
      if (entity) host.setEntityState(entity, command.state)
      return
    }
    case 'setEntityPos': {
      const entity = activeEntity(command.target, options)
      if (entity) host.setEntityPos?.(entity, command.pos)
      return
    }
    case 'setEntityPosRelParty': {
      const entity = activeEntity(command.target, options)
      if (entity) host.setEntityPosRelParty?.(entity, command.dcol, command.drow)
      return
    }
    case 'shakeScreen':
      host.shakeScreen?.(command.frames, command.level)
      return
    case 'setScreenWave':
    case 'setEntityLayer':
    case 'setFlag':
    case 'setVar':
    case 'addVar':
    case 'selectEntityBehavior':
    case 'selectEntityPage':
    case 'setEntityTriggerActivation':
    case 'selectSceneHooks':
      return
    case 'increaseHpMp':
      host.increaseHpMp?.(command.delta, command.pools ?? 'both')
      return
    case 'revivePartyAll':
      host.revivePartyAll?.(command.tenths)
      return
    case 'learnSkill':
      host.learnSkill?.(command.role, command.skill)
      return
    case 'unequip':
      host.unequipRole?.(command.role, command.slot)
      return
    case 'toggleDayNight':
      host.toggleDayNight?.(command.ms)
      return
    case 'setFollowers':
      await host.setFollowers([...command.sprites], signal)
      return
    case 'setSceneMapOverride':
      if (command.scene === undefined && host.reloadMap) await host.reloadMap(command.mapId, signal)
      return
    case 'halveMoney': {
      const money = host.query.money()
      host.giveMoney(-(money - Math.floor(money / 2)))
      return
    }
    case 'setEntityFacing': {
      const entity = activeEntity(command.target, options)
      if (entity) host.setEntityFacing(entity, command.facing)
      return
    }
    case 'setEntityFrame': {
      const entity = activeEntity(command.target, options)
      if (entity) host.setEntityFrame(entity, command.frame)
      return
    }
    case 'playEntityAction': {
      const entity = activeEntity(command.target, options)
      if (!entity) return
      const pending = host.playEntityAction(
        entity,
        {
          sprite: command.sprite,
          action: command.action,
          loop: command.loop,
          ...(command.startAtMs !== undefined ? { startAtMs: command.startAtMs } : {}),
        },
        signal,
      )
      if (command.wait ?? !command.loop) await pending
      else
        void pending.catch((error: unknown) => {
          if (signal.aborted) return
          host.report(
            `playEntityAction(${entity},${command.sprite},${command.action}) 后台播放失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
        })
      return
    }
    case 'stopEntityAction': {
      const entity = activeEntity(command.target, options)
      if (entity) host.stopEntityAction(entity, command.reset)
      return
    }
    case 'giveItem':
      await host.giveItem(command.itemId, command.count ?? 1, signal)
      return
    case 'loseItem':
      host.loseItem(command.itemId, command.count ?? 1)
      return
    case 'giveMoney':
      host.giveMoney(command.delta)
      return
    case 'playSound':
      host.playSound(command.asset)
      return
    case 'playMusic':
      host.playMusic(command.asset)
      return
    case 'stopMusic':
      host.stopMusic()
      return
    case 'setAmbience':
      host.setAmbience(command.ambience)
      return
    case 'takeEntity': {
      const entity = activeEntity(command.target, options)
      if (entity) host.takeEntity(entity)
      return
    }
    case 'releaseEntity': {
      if (!command.target) host.releaseEntity()
      else {
        const entity = activeEntity(command.target, options)
        if (entity) host.releaseEntity(entity)
      }
      return
    }
    case 'mountParty': {
      const entity = activeEntity(command.target, options)
      if (entity) host.mountParty(entity, command.dx ?? 0, command.dy ?? 0)
      return
    }
    case 'unmountParty':
      host.unmountParty()
      return
    case 'ride': {
      const entity = activeEntity(command.target, options)
      if (entity) await host.ride(entity, command.to, command.speed, signal)
      return
    }
    case 'setParty':
      await host.setParty([...command.members], signal)
      return
    case 'applyActorCondition':
      await host.applyActorCondition(command.actor, command.condition, signal)
      return
    case 'clearActorCondition':
      await host.clearActorCondition(command.actor, command.condition, signal)
      return
    case 'quitToTitle':
      await host.quitToTitle?.(command.videos, signal)
      return
    case 'moveEntity': {
      const entity = activeEntity(command.target, options)
      if (entity) await host.moveEntity(entity, command.to, command.speed, signal)
      return
    }
    case 'stepEntity': {
      const entity = activeEntity(command.target, options)
      if (entity) host.stepEntity(entity, command.dir)
      return
    }
    case 'animEntity': {
      const entity = activeEntity(command.target, options)
      if (entity) host.animEntity(entity)
      return
    }
    case 'nudgeEntity': {
      const entity = activeEntity(command.target, options)
      if (entity) host.nudgeEntity(entity, command.dx, command.dy)
      return
    }
    case 'moveParty':
      await host.moveParty(command.to, command.speed, signal)
      return
    case 'nudgeParty':
      host.nudgeParty(command.dx, command.dy, command.layer ?? 0)
      return
    case 'playVideo':
      await host.playVideo(command.asset, signal)
      return
    case 'playFrameAnimation':
      await host.playFrameAnimation(
        command.asset,
        {
          frameRate: command.frameRate,
          startFrame: command.startFrame,
          endFrame: command.endFrame,
        },
        signal,
      )
      return
    case 'openShop':
      await host.openShop(command.shop, command.mode, signal)
      return
    case 'cameraPan':
      await host.cameraPan(command.dx, command.dy, command.frames, signal)
      return
    case 'cameraSnap':
      host.cameraSnap(command.to)
      return
    case 'endBattle':
      throw new Error('ScriptProjectRuntime: endBattle 只能用于战斗演出脚本')
    case 'holdScreen':
      if (!host.holdScreen) throw new Error('ScriptProjectRuntime: 宿主未实现 holdScreen')
      await host.holdScreen(command.color, command.token, signal)
      return
    case 'revealScreen':
      if (!host.revealScreen) throw new Error('ScriptProjectRuntime: 宿主未实现 revealScreen')
      await host.revealScreen(command.token, signal)
      return
    default: {
      const unhandled: never = command
      throw new Error(
        `ScriptProjectRuntime: 未实现 leaf ${(unhandled as BaseRuntimeLeafCommand).kind}`,
      )
    }
  }
}
