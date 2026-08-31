import type { PoisonDef, ShopDef } from '@type-pal/content'

export interface SourceObjectPoison {
  id: number
  level: number
  color: number
  playerScript: number
  enemyScript: number
}

export interface SourceStore {
  id: number
  items: number[]
}

const fixedTicks = (hpDelta: number) => [{ hpDelta }]

/**
 * PAL 毒脚本已经按一阶段实测与反汇编结论数据化。颜色仍从提取表读取，
 * 其余字段是受测试保护的迁移 overlay，不依赖当前工程产物。
 */
export function migratePalPoisons(source: readonly SourceObjectPoison[]): PoisonDef[] {
  const byId = new Map(source.map((poison) => [poison.id, poison]))
  const color = (id: number): number => {
    const hit = byId.get(id)
    if (!hit) throw new Error(`毒提取表缺 id ${id}`)
    return hit.color
  }
  return [
    {
      id: 551,
      name: '赤毒',
      curability: 'common',
      color: color(551),
      playerTicks: fixedTicks(-7),
      enemyTicks: fixedTicks(-7),
    },
    {
      id: 552,
      name: '尸毒',
      curability: 'common',
      color: color(552),
      playerTicks: fixedTicks(-12),
      enemyTicks: fixedTicks(-12),
    },
    {
      id: 553,
      name: '瘴毒',
      curability: 'common',
      color: color(553),
      playerTicks: fixedTicks(-20),
      enemyTicks: fixedTicks(-20),
    },
    {
      id: 554,
      name: '毒丝',
      curability: 'common',
      color: color(554),
      playerTicks: fixedTicks(-32),
      enemyTicks: fixedTicks(-32),
    },
    {
      id: 555,
      name: '三尸蛊毒',
      curability: 'severe',
      color: color(555),
      playerTicks: [
        { hpDelta: 0 },
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -3 },
        { hpDelta: -200, selfCure: true },
      ],
      enemyTicks: [{ hpDelta: -111 }, { hpDelta: -222 }, { hpDelta: -333, selfCure: true }],
      lethalWith: 558,
      counters: 557,
    },
    {
      id: 556,
      name: '鹤顶红',
      curability: 'severe',
      color: color(556),
      playerTicks: fixedTicks(-50),
      enemyTicks: fixedTicks(-100),
      lethalWith: 557,
      counters: 558,
    },
    {
      id: 557,
      name: '孔雀胆',
      curability: 'severe',
      color: color(557),
      playerTicks: fixedTicks(-50),
      enemyTicks: fixedTicks(-100),
      lethalWith: 556,
      counters: 560,
    },
    {
      id: 558,
      name: '血海棠',
      curability: 'severe',
      color: color(558),
      playerTicks: fixedTicks(-50),
      enemyTicks: fixedTicks(-100),
      lethalWith: 555,
      counters: 559,
    },
    {
      id: 559,
      name: '断肠草',
      curability: 'severe',
      color: color(559),
      playerTicks: fixedTicks(-50),
      enemyTicks: fixedTicks(-100),
      lethalWith: 560,
      counters: 555,
    },
    {
      id: 560,
      name: '金蚕蛊毒',
      curability: 'severe',
      color: color(560),
      playerTicks: fixedTicks(-50),
      enemyTicks: fixedTicks(-100),
      lethalWith: 559,
      counters: 556,
    },
    {
      id: 137,
      name: '无影毒',
      curability: 'incurable',
      color: color(137),
      enemyTicks: [{ halveHp: 1000, selfCure: true }],
    },
    {
      id: 561,
      name: '食妖虫附',
      curability: 'incurable',
      color: color(561),
      enemyTicks: [
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -3 },
        { hpDelta: -4 },
        { hpDelta: -5 },
        { hpDelta: -6 },
        { hpDelta: -7 },
        { hpDelta: -8, grantItem: '145', selfCure: true },
      ],
    },
    {
      id: 562,
      name: '碧血蚕附',
      curability: 'incurable',
      color: color(562),
      enemyTicks: [
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -3 },
        { hpDelta: -4 },
        { hpDelta: -5 },
        { hpDelta: -6 },
        { hpDelta: -7 },
        { hpDelta: -8, grantItem: '149', selfCure: true },
      ],
    },
  ]
}

export function migratePalShops(stores: readonly SourceStore[]): ShopDef[] {
  return stores
    .filter((store) => store.id !== 0)
    .map((store) => ({ id: store.id, items: store.items.map(String) }))
}
