/** 显式场景跳转的资源装载与状态发布；调用方负责同步呈现资源。
 * bootstrap的正常剧情重载有独立装配路径，不由此函数接管。
 */
import type { SceneAssetsCache } from '../assets/loader.js'
import { resolveScriptLabel, runEnterScript } from './event-system.js'
import {
  type Facing,
  type GameState,
  hydrateNpcStaticDefaults,
  npcFromEventObject,
  PARTYOFFSET_X,
  PARTYOFFSET_Y,
  sliceSceneEventObjects,
} from './game-state.js'
import { setSceneContext } from './scene-context.js'
import { setCurrentMapNum } from './scene-identity.js'

export interface LoadSceneInput {
  gs: GameState
  sceneId: number
  assets: SceneAssetsCache
  /** 可选 party 起点(像素坐标)—— 不传则 party 位置 / facing 都不动(facing 单字段也可选)。 */
  partyStart?: { x: number; y: number; facing?: Facing }
}

/**
 * Scene 切换(D33 lazy + D34 dev shortcut)。
 *
 * 1. SceneAssetsCache lazy fetch 新 scene 资源(同 scene 重复切不重复 fetch)
 * 2. 重置 gs.npcs(走 npcFromEventObject)
 * 3. 跑 scene onEnter 脚本,接入 setBattlefield / music / object state 等进场副作用
 * 4. 可选 partyStart 覆写 party 起点(并把 camera 跟到 party,用于 dev shortcut / manual jump)
 *
 * sceneId 是资源 dump 下标(0-based);sdlpal `wNumScene` 是 1-based,因此写入 sceneId+1。
 * tilemap 等渲染所需资源由调用方自行从 SceneAssetsCache 取(M3.5 T16+ dev panel 串接)。
 */
export async function loadScene(input: LoadSceneInput): Promise<void> {
  const { gs, sceneId, assets, partyStart } = input
  const sceneAssets = await assets.loadScene(sceneId)
  const wNumScene = sceneId + 1

  // 传 labelMap → autoLabel 解 ip 写入 autoCursor;sceneCommands/sceneLabelMap 写 gs
  gs.wNumScene = wNumScene
  gs.sceneCommands = sceneAssets.eventCommands
  gs.sceneLabelMap = sceneAssets.labelMap
  gs.gameOverActive = false // 死亡读档 → 新场景 → 清 game-over 演出标记
  gs.deathHoldActive = false // 同清过渡帧 hold(残留会冻住新场景渲染);死亡演出退出点
  // 0x38 归隐脱出:缓存当前场景 base onTeleport 全局 entry(onTeleportLabel L_<n>→n;无则 0)。
  gs.sceneOnTeleportEntry = sceneAssets.onTeleportLabel
    ? (resolveScriptLabel(sceneAssets.onTeleportLabel)?.ip ?? 0)
    : 0
  gs.npcs =
    sliceSceneEventObjects(gs, wNumScene) ??
    sceneAssets.eventObjects.map((eo) => npcFromEventObject(eo, sceneAssets.labelMap))
  hydrateNpcStaticDefaults(gs.npcs, sceneAssets.eventObjects)

  // 资源完成后发布当前探索上下文；脚本入口仍解析全局命令表。
  setSceneContext({
    tilemap: sceneAssets.tilemap,
    eventCommands: sceneAssets.eventCommands,
    labelMap: sceneAssets.labelMap,
  })
  setCurrentMapNum(sceneAssets.mapNum) // 场景名按 map 命名:历史对话捕获用 getCurrentMapNum 读它

  // 先执行onEnter的全部同步副作用；显式跳转落点最后覆盖位置和镜头。
  if (sceneAssets.onEnterLabel) {
    const ip = resolveScriptLabel(sceneAssets.onEnterLabel)?.ip // P2#5:onEnterLabel = L_<global> → 全局 ip
    if (ip !== undefined) {
      runEnterScript(gs, undefined, undefined, ip) // P2#5:默认全局数组
    }
  }
  if (partyStart) {
    gs.party = {
      x: partyStart.x,
      y: partyStart.y,
      facing: partyStart.facing ?? gs.party.facing,
    }
    gs.camera = { x: partyStart.x - PARTYOFFSET_X, y: partyStart.y - PARTYOFFSET_Y }
  }
}
