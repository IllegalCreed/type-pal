/** 当前地图号单一存储；场景加载和历史对话读取共用。 */
// 当前场景所属地图号(SCENE.mapNum)。场景名按 map 而非 wNumScene 命名(同 map 的多个 scene
// 共享地名更稳),由 loadScene / 成功的map-only替换写入;event-system 历史对话捕获经 getCurrentMapNum 读它。
let _currentMapNum = 0

export function getCurrentMapNum(): number {
  return _currentMapNum
}

/** 场景装载或map-only替换完整就绪后写入；历史/工具地图名共享此身份。 */
export function setCurrentMapNum(n: number): void {
  _currentMapNum = n
}
