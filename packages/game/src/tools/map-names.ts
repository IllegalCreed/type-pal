// 地图中文名(SCENE.mapNum → 地名)。生产工具面板「对话历史分组」+「小地图」共用。
//   仙剑场景名按 mapNum(地图号)而非 wNumScene(场景号)命名:同一 map 的多个 scene 共享地名更稳。
//   表为用户考据,部分覆盖,缺名回退 `地图N`(见 getMapName),宁缺毋滥。
//   当前场景的 mapNum 由 scene-system.getCurrentMapNum() 提供(loadScene 时从 scene JSON 写入)。
const MAP_NAMES: Record<number, string> = {
  1: '余杭镇',
  2: '码头市集',
  3: '仙灵岛码头',
  4: '十里坡',
  5: '山神庙外',
  6: '仙灵岛迷宫',
  7: '仙灵岛入口',
  8: '水月宫外',
  9: '水月宫内',
  10: '余杭镇客栈',
  11: '余杭镇民居',
  12: '余杭镇客栈房间',
  13: '余杭镇民居',
  14: '余杭镇药店',
  18: '苏州码头',
  19: '山神庙内',
  21: '码头铁匠房',
  22: '码头木匠房',
  23: '苏州城',
  25: '仙灵岛迷宫（破解后）',
  38: '苏州城民居',
  119: '仙灵岛桃花林',
}

/** mapNum → 人读地名;缺名回退 `地图N`。 */
export function getMapName(mapNum: number): string {
  return MAP_NAMES[mapNum] ?? `地图${mapNum}`
}

/** 是否有考据地名(缺名时调用方可决定显隐/样式)。 */
export function hasMapName(mapNum: number): boolean {
  return mapNum in MAP_NAMES
}
