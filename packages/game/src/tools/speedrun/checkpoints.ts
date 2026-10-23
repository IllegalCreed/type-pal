// 21 个速通节点与香蕉树配置；稳定 ID 用于计时/持久化，显示名可以本地化。
// 下方坐标沿用历史 PalTimer(98柔情)视口 + (160,112) 的换算记录；地图边缘不能据此推定已校准。
// docs/phase1/plans/2026-06-18-speedrun-timer-design.md §4.4 所列坐标/BGM/入口仍待运行核验，
// 静态配置测试不证明路线已跑通；香蕉三格的历史站位记录也不外推为其它节点的证据。

import { localize } from '../../localization/language.js'
import {
  atAnySpot,
  atSpot,
  bgmIs,
  bossWon,
  caiyiDetector,
  type Detector,
  enterAnyScene,
  enterScene,
  hasItem,
  leaveScene,
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

const ENGLISH_CHECKPOINT_NAMES: Readonly<Record<string, string>> = {
  stele: 'Read stele',
  kungfu: 'Learn swordplay',
  boat: 'Board boat',
  'exit-lin': 'Leave Lin mansion',
  'exit-yinlong': 'Leave Hidden Dragon Cave',
  biohazard: 'Zombie outbreak',
  'boss-guijiang': 'Ghost General',
  'boss-chigui': 'Scarlet Ghost King',
  'enter-yangzhou': 'Enter Yangzhou',
  'exit-yangzhou': 'Leave Yangzhou',
  'exit-trouble': 'Leave Trouble Cave',
  'enter-jing': 'Enter capital',
  'boss-caiyi': 'Caiyi',
  'enter-tower': 'Enter Demon Tower',
  'sword-pillar': 'Sword pillar',
  'boss-huolong': 'Destroy tower',
  'boss-fenghuang': 'Phoenix',
  'enter-tenyears': 'Ten years ago',
  'water-pearl': 'Water Orb',
  'pray-rain': 'Pray for rain',
  clear: 'Finish game',
}

/** Localized display only; checkpoint IDs, detectors and persisted times stay unchanged. */
export function checkpointName(checkpoint: Pick<Checkpoint, 'id' | 'name'>): string {
  return localize(checkpoint.name, ENGLISH_CHECKPOINT_NAMES[checkpoint.id] ?? checkpoint.name)
}

const H = 3_600_000,
  M = 60_000,
  S = 1000
const t = (h: number, m: number, s: number): number => h * H + m * M + s * S

export const CHECKPOINTS: readonly Checkpoint[] = [
  {
    id: 'stele',
    name: '见石碑',
    defaultBestMs: t(0, 6, 5),
    detector: atAnySpot(19, [
      [1856, 496],
      [1840, 488],
    ]),
  }, // PalTimer视口(1696,384)/(1680,376)+PARTYOFFSET ⚠地图边缘,X偏移或>160,须实跑核
  { id: 'kungfu', name: '学功夫', defaultBestMs: t(0, 11, 13), detector: bgmIs(86) }, // ⊙BGM
  { id: 'boat', name: '上船', defaultBestMs: t(0, 18, 37), detector: atSpot(6, 1232, 1192) }, // PalTimer视口(1072,1080)+PARTYOFFSET
  { id: 'exit-lin', name: '出林家堡', defaultBestMs: t(0, 24, 53), detector: leaveScene(40) },
  { id: 'exit-yinlong', name: '出隐龙窟', defaultBestMs: t(0, 30, 46), detector: leaveScene(49) },
  {
    id: 'biohazard',
    name: '生化危机',
    defaultBestMs: t(0, 37, 56),
    detector: atSpot(62, 1312, 1376),
  }, // PalTimer视口(1152,1264)+PARTYOFFSET
  { id: 'boss-guijiang', name: '过鬼将军', defaultBestMs: t(0, 43, 25), detector: bossWon(75) },
  { id: 'boss-chigui', name: '过赤鬼王', defaultBestMs: t(0, 47, 45), detector: bossWon(76) },
  { id: 'enter-yangzhou', name: '进扬州', defaultBestMs: t(0, 54, 0), detector: enterScene(80) },
  { id: 'exit-yangzhou', name: '出扬州', defaultBestMs: t(1, 1, 53), detector: leaveScene(106) },
  { id: 'exit-trouble', name: '出麻烦洞', defaultBestMs: t(1, 7, 26), detector: leaveScene(107) },
  { id: 'enter-jing', name: '进京城', defaultBestMs: t(1, 9, 32), detector: enterScene(101) },
  { id: 'boss-caiyi', name: '过彩依', defaultBestMs: t(1, 19, 47), detector: caiyiDetector(71) },
  {
    id: 'enter-tower',
    name: '进锁妖塔',
    defaultBestMs: t(1, 25, 33),
    detector: enterAnyScene([164, 165, 147]),
  },
  {
    id: 'sword-pillar',
    name: '剑柱',
    defaultBestMs: t(1, 37, 27),
    detector: atSpot(146, 464, 1160),
  }, // PalTimer视口(304,1048)+PARTYOFFSET
  { id: 'boss-huolong', name: '拆塔', defaultBestMs: t(1, 44, 22), detector: bossWon(144) },
  { id: 'boss-fenghuang', name: '过凤凰', defaultBestMs: t(1, 54, 11), detector: bossWon(67) },
  { id: 'enter-tenyears', name: '进十年前', defaultBestMs: t(2, 3, 17), detector: enterScene(247) },
  { id: 'water-pearl', name: '水灵珠', defaultBestMs: t(2, 14, 1), detector: hasItem(265) },
  {
    id: 'pray-rain',
    name: '祈雨',
    defaultBestMs: t(2, 27, 8),
    detector: atSpot(228, 1152, 1040, 32, 16),
  }, // PalTimer视口(992,928)+PARTYOFFSET
  { id: 'clear', name: '通关', defaultBestMs: t(2, 37, 32), detector: bossWon(149) },
]

/**
 * 香蕉树配置沿用精确三格/零容差；站格暂停，拿香蕉(291)恢复。以下为历史换算记录，本轮未实跑复核。
 * 历史 PalTimer CheckCheatBegin 记录（源版本未冻结）：scene 177 + PositionCheck(精确 ==){(1088,608),(1120,608),
 *   (1120,592)} —— 那是原版**视口**坐标;我们 `party` 是**世界=视口+PARTYOFFSET(160,112)**,故 +offset 换算:
 *   (1088,608)→(1248,720)、(1120,608)→(1280,720)、(1120,592)→(1280,704)。
 * 香蕉树本体(事件对象 EO[16]@scene/176.json 世界 (1264,712)、禁入障碍、人站不上去)就在这 3 个相邻可站格中间;
 *   历史用户记录的捡香蕉站位 (1280,720) = 中间格，因此保留既有零容差(tol=0)，不凭静态测试改点。
 */
export const BANANA: BananaConfig = {
  scene: 177,
  cells: [
    [1248, 720],
    [1280, 720],
    [1280, 704],
  ],
  tolX: 0,
  tolY: 0,
  itemId: 291,
}
