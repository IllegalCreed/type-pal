# B10-1 源敌队槽位 census（2026-08-09）

只读审计证据，供 [B10-1 任务卡](../tasks/done/B10-1-enemy-confused-attack.md) 的 G1/G2
设计复审使用。本文件不授权修改生成产物，也不替代迁移器测试。

## 输入与可复现命令

- 源敌队：`data/extracted/data/enemy-teams.json`
- v11 生成敌队：`projects/pal/content/enemy-teams.json`
- 敌人定义：`projects/pal/content/enemies.json`
- 复核逻辑：逐队过滤 `65535`；保留项中的 `0` 计为空槽；递归扫描敌人定义中的
  `kind: summon|divide`，再与含空槽队伍交叉。

```sh
node --input-type=module <<'NODE'
// 读取上述三个 JSON，按任务卡 G1/G2 规则统计；不得写回文件。
NODE
```

## 总账

| 指标 | 数值 |
|---|---:|
| 源敌队 | 380 |
| 原始条目（380×5） | 1900 |
| 跳过 `65535` 后的语义槽 | 861 |
| `0` 空槽 | 104 |
| 有效敌槽 | 757 |
| 含 `0` 空槽的队伍 | 68 |
| 含 `0` 且至少两名有效敌的队伍 | 56 |
| v11 压缩 `members` 总数 | 757 |
| 含空槽且带 `summon`/`divide` 定义的队伍 | 20 |

输入 SHA-256（用于后续 seal/重放绑定）：

- `data/extracted/data/enemy-teams.json`: `a5b1944fe17dfb8a44efbfea06b22183e0e2f1d3c15e86b94eb02302b2d5b6fa`
- `projects/pal/content/enemy-teams.json`（v11 parent）:
  `4e44f5b46b92943af33453840917087523cb7e12926d0056f6e13ca82e6fce7d`
- `projects/pal/content/enemies.json`:
  `dbd7dc16aa2ba938d1afc253aa515b7e34f631b67eac5392b5b3d1c3402c8f5`

## G2 交叉清单

下列是含空槽且至少一名有效敌拥有 `summon` 或 `divide` 行为的队伍；槽位按源条目顺序，
数字为 enemy object index。

| 队伍 | 源语义槽 | 行为 |
|---|---|---|
| team-27 | `[0,473,0]` | enemy-473 summon |
| team-35 | `[0,524,0]` | enemy-524 summon |
| team-44 | `[0,469,0,0,0]` | enemy-469 summon |
| team-64 | `[0,409,0,0,0]` | enemy-409 summon |
| team-65 | `[409,407,0,0,0]` | enemy-409 summon |
| team-66 | `[407,409,407,0,0]` | enemy-409 summon |
| team-84 | `[0,445,0]` | enemy-445 divide |
| team-87 | `[0,445,427]` | enemy-445 divide |
| team-174 | `[441,0,421,0,0]` | enemy-421 summon |
| team-175 | `[0,0,421,0,0]` | enemy-421 summon |
| team-188 | `[0,519,0]` | enemy-519 summon |
| team-221 | `[0,474,0]` | enemy-474 summon |
| team-267 | `[0,522,0,0,0]` | enemy-522 summon |
| team-268 | `[0,0,523,0,0]` | enemy-523 summon |
| team-290 | `[522,0,0,0,522]` | enemy-522 summon（两实例） |
| team-295 | `[0,420,0,0,0]` | enemy-420 summon |
| team-303 | `[445,445,0,0,0]` | enemy-445 divide（两实例） |
| team-304 | `[439,0,445]` | enemy-445 divide |
| team-313 | `[0,546,0]` | enemy-546 summon |
| team-377 | `[469,0,470]` | enemy-469 summon |

## 复审解释

- `65535` 不占槽；`0` 占语义槽但不生成敌人。因此 1900 → 861，而不是把 1900 个
  条目都当作 5 槽 runtime 队列。
- v11 的 757 个 `members` 只能证明有效敌数量，不能证明源 RNG/站位槽位；v12 迁移必须
  从源重新生成 `Array<string|null>`。
- summon 只在当前 `wMaxEnemyIndex` 内填空；divide 扫描固定 5 槽并可扩大 `wMaxEnemyIndex`。
  G2 清单用于防止实现把两者错误合并成同一个 `spawnIntoSlot` 规则。
