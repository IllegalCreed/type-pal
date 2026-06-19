// checkpoints.ts —— 21 个速通节点定义 + 香蕉树(反作弊/中场休息)配置。
//   场景号/敌人id/物品id 已对齐我方 extracted 数据(spec §4.5)。
//   ⚠坐标全部抄自 PalTimer(98柔情),但**须 +PARTYOFFSET(160,112) 换算**:PalTimer 读原版**视口**坐标,
//     我们 gs.party.x/y 是**世界坐标 = 视口 + PARTYOFFSET**(2026-06-19 查 PalTimer 源 `仙剑98柔情.cs` +
//     香蕉处实测坐实:站位 (1280,720) − PalTimer 视口 (1120,608) = 正好 (160,112))。地图边缘点(见石碑)
//     偏移>160 且各点不一(spec §4.1),已标 ⚠、须实跑读 gs.party 核(spec §4.4 Task 12 未竟)。
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
  { id: 'stele', name: '见石碑', defaultBestMs: t(0, 6, 5), detector: atAnySpot(19, [[1856, 496], [1840, 488]]) }, // PalTimer视口(1696,384)/(1680,376)+PARTYOFFSET ⚠地图边缘,X偏移或>160,须实跑核
  { id: 'kungfu', name: '学功夫', defaultBestMs: t(0, 11, 13), detector: bgmIs(86) }, // ⊙BGM
  { id: 'boat', name: '上船', defaultBestMs: t(0, 18, 37), detector: atSpot(6, 1232, 1192) }, // PalTimer视口(1072,1080)+PARTYOFFSET
  { id: 'exit-lin', name: '出林家堡', defaultBestMs: t(0, 24, 53), detector: leaveScene(40) },
  { id: 'exit-yinlong', name: '出隐龙窟', defaultBestMs: t(0, 30, 46), detector: leaveScene(49) },
  { id: 'biohazard', name: '生化危机', defaultBestMs: t(0, 37, 56), detector: atSpot(62, 1312, 1376) }, // PalTimer视口(1152,1264)+PARTYOFFSET
  { id: 'boss-guijiang', name: '过鬼将军', defaultBestMs: t(0, 43, 25), detector: bossWon(75) },
  { id: 'boss-chigui', name: '过赤鬼王', defaultBestMs: t(0, 47, 45), detector: bossWon(76) },
  { id: 'enter-yangzhou', name: '进扬州', defaultBestMs: t(0, 54, 0), detector: enterScene(80) },
  { id: 'exit-yangzhou', name: '出扬州', defaultBestMs: t(1, 1, 53), detector: leaveScene(106) },
  { id: 'exit-trouble', name: '出麻烦洞', defaultBestMs: t(1, 7, 26), detector: leaveScene(107) },
  { id: 'enter-jing', name: '进京城', defaultBestMs: t(1, 9, 32), detector: enterScene(101) },
  { id: 'boss-caiyi', name: '过彩依', defaultBestMs: t(1, 19, 47), detector: caiyiDetector(71) },
  { id: 'enter-tower', name: '进锁妖塔', defaultBestMs: t(1, 25, 33), detector: enterAnyScene([164, 165, 147]) },
  { id: 'sword-pillar', name: '剑柱', defaultBestMs: t(1, 37, 27), detector: atSpot(146, 464, 1160) }, // PalTimer视口(304,1048)+PARTYOFFSET
  { id: 'boss-huolong', name: '拆塔', defaultBestMs: t(1, 44, 22), detector: bossWon(144) },
  { id: 'boss-fenghuang', name: '过凤凰', defaultBestMs: t(1, 54, 11), detector: bossWon(67) },
  { id: 'enter-tenyears', name: '进十年前', defaultBestMs: t(2, 3, 17), detector: enterScene(247) },
  { id: 'water-pearl', name: '水灵珠', defaultBestMs: t(2, 14, 1), detector: hasItem(265) },
  { id: 'pray-rain', name: '祈雨', defaultBestMs: t(2, 27, 8), detector: atSpot(228, 1152, 1040, 32, 16) }, // PalTimer视口(992,928)+PARTYOFFSET
  { id: 'clear', name: '通关', defaultBestMs: t(2, 37, 32), detector: bossWon(149) },
]

/**
 * 圣姑家香蕉树:**站到 3 格之一暂停**,拿香蕉(291)恢复。**照抄 PalTimer 逻辑(精确格、零容差)**。
 * PalTimer `仙剑98柔情.cs:1099` CheckCheatBegin = scene 177 + PositionCheck(精确 ==){(1088,608),(1120,608),
 *   (1120,592)} —— 那是原版**视口**坐标;我们 `party` 是**世界=视口+PARTYOFFSET(160,112)**,故 +offset 换算:
 *   (1088,608)→(1248,720)、(1120,608)→(1280,720)、(1120,592)→(1280,704)。
 * 香蕉树本体(事件对象 EO[16]@scene/176.json 世界 (1264,712)、禁入障碍、人站不上去)就在这 3 个相邻可站格中间;
 *   user 实测捡香蕉站位 (1280,720) = 中间格,精确命中。坐标已知确切 → **不加容错容差**(tol=0,同 PalTimer)。
 */
export const BANANA: BananaConfig = {
  scene: 177,
  cells: [[1248, 720], [1280, 720], [1280, 704]],
  tolX: 0,
  tolY: 0,
  itemId: 291,
}
