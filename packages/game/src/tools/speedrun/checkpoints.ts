// checkpoints.ts —— 21 个速通节点定义 + 香蕉树(反作弊/中场休息)配置。
//   场景号/敌人id/物品id 已对齐我方 extracted 数据(spec §4.5);⊙ 标注的坐标/BGM 需运行时校准(spec §4.4)。
import {
  atAnySpot, atSpot, bgmIs, bossWon, caiyiDetector, enterAnyScene, enterScene, hasItem, leaveScene, type Detector,
} from './detectors.js'

export interface Checkpoint {
  id: string
  name: string
  defaultBestMs: number
  detector: Detector
}

export interface BananaConfig {
  scene: number
  cells: ReadonlyArray<readonly [number, number]>
  tolX: number
  tolY: number
  itemId: number
}

const H = 3_600_000, M = 60_000, S = 1000
const t = (h: number, m: number, s: number): number => h * H + m * M + s * S

export const CHECKPOINTS: readonly Checkpoint[] = [
  { id: 'stele', name: '见石碑', defaultBestMs: t(0, 6, 5), detector: atAnySpot(19, [[1696, 384], [1680, 376]]) }, // ⊙坐标
  { id: 'kungfu', name: '学功夫', defaultBestMs: t(0, 11, 13), detector: bgmIs(86) }, // ⊙BGM
  { id: 'boat', name: '上船', defaultBestMs: t(0, 18, 37), detector: atSpot(6, 1072, 1080) }, // ⊙坐标
  { id: 'exit-lin', name: '出林家堡', defaultBestMs: t(0, 24, 53), detector: leaveScene(40) },
  { id: 'exit-yinlong', name: '出隐龙窟', defaultBestMs: t(0, 30, 46), detector: leaveScene(49) },
  { id: 'biohazard', name: '生化危机', defaultBestMs: t(0, 37, 56), detector: atSpot(62, 1152, 1264) }, // ⊙坐标
  { id: 'boss-guijiang', name: '过鬼将军', defaultBestMs: t(0, 43, 25), detector: bossWon(75) },
  { id: 'boss-chigui', name: '过赤鬼王', defaultBestMs: t(0, 47, 45), detector: bossWon(76) },
  { id: 'enter-yangzhou', name: '进扬州', defaultBestMs: t(0, 54, 0), detector: enterScene(80) },
  { id: 'exit-yangzhou', name: '出扬州', defaultBestMs: t(1, 1, 53), detector: leaveScene(106) },
  { id: 'exit-trouble', name: '出麻烦洞', defaultBestMs: t(1, 7, 26), detector: leaveScene(107) },
  { id: 'enter-jing', name: '进京城', defaultBestMs: t(1, 9, 32), detector: enterScene(101) },
  { id: 'boss-caiyi', name: '过彩依', defaultBestMs: t(1, 19, 47), detector: caiyiDetector(71) },
  { id: 'enter-tower', name: '进锁妖塔', defaultBestMs: t(1, 25, 33), detector: enterAnyScene([164, 165, 147]) },
  { id: 'sword-pillar', name: '剑柱', defaultBestMs: t(1, 37, 27), detector: atSpot(146, 304, 1048) }, // ⊙坐标
  { id: 'boss-huolong', name: '拆塔', defaultBestMs: t(1, 44, 22), detector: bossWon(144) },
  { id: 'boss-fenghuang', name: '过凤凰', defaultBestMs: t(1, 54, 11), detector: bossWon(67) },
  { id: 'enter-tenyears', name: '进十年前', defaultBestMs: t(2, 3, 17), detector: enterScene(247) },
  { id: 'water-pearl', name: '水灵珠', defaultBestMs: t(2, 14, 1), detector: hasItem(265) },
  { id: 'pray-rain', name: '祈雨', defaultBestMs: t(2, 27, 8), detector: atSpot(228, 992, 928, 32, 16) }, // ⊙坐标
  { id: 'clear', name: '通关', defaultBestMs: t(2, 37, 32), detector: bossWon(149) },
]

/** 圣姑家香蕉树:站到 3 格之一暂停,拿香蕉(291)恢复。⊙坐标需运行时校准。 */
export const BANANA: BananaConfig = {
  scene: 177,
  cells: [[1088, 608], [1120, 608], [1120, 592]],
  tolX: 32,
  tolY: 16,
  itemId: 291,
}
