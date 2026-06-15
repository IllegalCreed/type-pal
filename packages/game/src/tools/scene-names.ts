// 场景中文名(wNumScene → 地名)。生产工具面板「对话历史分组」+「小地图」共用。
//   名表复用 dev/fixtures/scene-names.json(三信号交叉考据:startBattle teamId ∩ BOSS_ROSTER /
//   对白佐证 / 同 mapNum 兄弟场景一致)。部分覆盖(~33 主要剧情点),缺名回退 `场景N`,宁缺毋滥。
//   key base 假设 = gs.wNumScene(1-based,= sceneIndex0-based + 1,见 bootstrap "wNumScene = SCENE_ID + 1");
//   Task 8 浏览器走到余杭镇核对 wNumScene↔名一致(若差 1 调 offset)。
const SCENE_NAMES: Record<number, string> = {
  1: '余杭镇',
  2: '余杭镇',
  15: '草妖通道',
  20: '余杭镇',
  21: '苏州城门',
  32: '林家堡',
  41: '隐龙窟',
  47: '隐龙窟',
  58: '玉佛寺',
  65: '将军冢',
  66: '将军冢',
  67: '石长老埋伏',
  86: '扬州',
  93: '扬州',
  138: '毒娘子洞',
  139: '黑蜘蛛洞',
  140: '毒娘子洞',
  141: '黑蜘蛛洞',
  144: '锁妖塔·七星磐龙柱',
  147: '锁妖塔·七星剑',
  148: '锁妖塔·天鬼皇',
  149: '锁妖塔',
  169: '余杭镇',
  171: '苏州城门',
  181: '桃源村',
  185: '神木林',
  193: '林家堡',
  196: '苏州城门',
  201: '麒麟洞',
  215: '圣姑家',
  235: '麒麟洞',
  256: '南诏王宫·牢房',
  278: '南诏王宫·巫王殿',
  281: '南诏王宫·拜月',
}

/** wNumScene → 人读地名;缺名回退 `场景N`。 */
export function getSceneName(wNumScene: number): string {
  return SCENE_NAMES[wNumScene] ?? `场景${wNumScene}`
}

/** 是否有考据地名(缺名时调用方可决定显隐/样式)。 */
export function hasSceneName(wNumScene: number): boolean {
  return wNumScene in SCENE_NAMES
}
