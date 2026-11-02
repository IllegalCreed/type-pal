# B10-1 源敌队槽位 census（2026-08-09）

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-19
Template: audit-report-v1 / 1.0.0

本页是 B10-1 源敌队槽位 census 审计的归档回执。census 口径、总数与三份输入 SHA pin 在下方 quote 逐字节保全；本页只做历史边界与模板接入，不授当前实现或 coverage 信用。

## 审计问题

- PAL 源敌队（380 支）的槽位语义化底账，供 [B10-1 任务卡](../done/B10-1-enemy-confused-attack.md) G1/G2 设计复审使用；本文件不授权修改生成产物，也不替代迁移器测试。

## 范围与证据

- 输入三份（SHA-256 全量 pin 于 quote，首 7 位 `a5b1944f`/`4e44f5b4`/`dbd7dc16`）：源敌队 `data/extracted/data/enemy-teams.json`、v11 生成敌队 `projects/pal/content/enemy-teams.json`、敌人定义 `projects/pal/content/enemies.json`。
- 复核逻辑：逐队过滤 `65535`；保留项中的 `0` 计为空槽；递归扫描敌人定义中的 `kind: summon|divide`，再与含空槽队伍交叉。

## 发现

- 总账（单位与条件逐项按原文）：源敌队 380 支、原始条目 380×5=1900；跳过 `65535` 后语义槽 861 = 有效敌槽 757 + `0` 空槽 104（**104 是空槽数，不是零槽队伍数**）；含 `0` 空槽的队伍 68 支；含 `0` 空槽**且至少两名有效敌**的队伍 56 支；含 `0` 空槽**且带 summon/divide 定义**的队伍 20 支；v11 压缩 `members` 总数 757。
- G2 交叉清单逐队列出 20 支含空槽且至少一名有效敌拥有 summon/divide 行为的队伍（槽位按源条目顺序，team-27 至 team-377，quote 全表）。

## 结论

- 复审解释（quote 原文）：`65535` 不占槽、`0` 占语义槽但不生成敌人，故 1900→861；v11 的 757 `members` 只证有效敌数量，不证源 RNG/站位槽位，v12 迁移必须从源重新生成 `Array<string|null>`；summon 只在当前 `wMaxEnemyIndex` 内填空、divide 扫描固定 5 槽并可扩大 `wMaxEnemyIndex`——G2 清单防止实现把两者错误合并成同一个 `spawnIntoSlot` 规则。

## 整改与复核

- B10-1 后续任务以本 census 为 G1/G2 对账底表；复核以三份输入 SHA 重放为准。

## 历史范围

- 2026-08-09 只读 census；固定来源与 source SHA 见下方保全节。

## 原始结论

- 380/1900/861(=757+104)/68/56/20 数字组（含上述单位与交集条件）与 G2 二十队清单为原始结论本体。

## 当时证据

- 三份输入 SHA pin、G2 交叉清单表与复审解释在 quote 保全。

## 当前有效性

- historical。数字随源与过滤口径冻结，不随产品演进自动更新；当前敌队真值以现行 content、schema 与任务卡为准。

## 继任文档

- 当前敌队数据合同与任务卡；目录导航见[历史审计回执](../README.md)。

## 原文保全

固定源 revision `81d01fa9993b38f0905ed7a54fc9a0b1c73f8fa5`，source SHA `6961c437cabdaf0095d0e433683dc18e80c47859b588b2a498862e0823c66d7b`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # B10-1 源敌队槽位 census（2026-08-09）
>
> 只读审计证据，供 [B10-1 任务卡](../tasks/done/B10-1-enemy-confused-attack.md) 的 G1/G2
> 设计复审使用。本文件不授权修改生成产物，也不替代迁移器测试。
>
> ## 输入与可复现命令
>
> - 源敌队：`data/extracted/data/enemy-teams.json`
> - v11 生成敌队：`projects/pal/content/enemy-teams.json`
> - 敌人定义：`projects/pal/content/enemies.json`
> - 复核逻辑：逐队过滤 `65535`；保留项中的 `0` 计为空槽；递归扫描敌人定义中的
>   `kind: summon|divide`，再与含空槽队伍交叉。
>
> ```sh
> node --input-type=module <<'NODE'
> // 读取上述三个 JSON，按任务卡 G1/G2 规则统计；不得写回文件。
> NODE
> ```
>
> ## 总账
>
> | 指标 | 数值 |
> |---|---:|
> | 源敌队 | 380 |
> | 原始条目（380×5） | 1900 |
> | 跳过 `65535` 后的语义槽 | 861 |
> | `0` 空槽 | 104 |
> | 有效敌槽 | 757 |
> | 含 `0` 空槽的队伍 | 68 |
> | 含 `0` 且至少两名有效敌的队伍 | 56 |
> | v11 压缩 `members` 总数 | 757 |
> | 含空槽且带 `summon`/`divide` 定义的队伍 | 20 |
>
> 输入 SHA-256（用于后续 seal/重放绑定）：
>
> - `data/extracted/data/enemy-teams.json`: `a5b1944fe17dfb8a44efbfea06b22183e0e2f1d3c15e86b94eb02302b2d5b6fa`
> - `projects/pal/content/enemy-teams.json`（v11 parent）:
>   `4e44f5b46b92943af33453840917087523cb7e12926d0056f6e13ca82e6fce7d`
> - `projects/pal/content/enemies.json`:
>   `dbd7dc16aa2ba938d1afc253aa515b7e34f631b67eac5392b5b3d1c3402c8f5`
>
> ## G2 交叉清单
>
> 下列是含空槽且至少一名有效敌拥有 `summon` 或 `divide` 行为的队伍；槽位按源条目顺序，
> 数字为 enemy object index。
>
> | 队伍 | 源语义槽 | 行为 |
> |---|---|---|
> | team-27 | `[0,473,0]` | enemy-473 summon |
> | team-35 | `[0,524,0]` | enemy-524 summon |
> | team-44 | `[0,469,0,0,0]` | enemy-469 summon |
> | team-64 | `[0,409,0,0,0]` | enemy-409 summon |
> | team-65 | `[409,407,0,0,0]` | enemy-409 summon |
> | team-66 | `[407,409,407,0,0]` | enemy-409 summon |
> | team-84 | `[0,445,0]` | enemy-445 divide |
> | team-87 | `[0,445,427]` | enemy-445 divide |
> | team-174 | `[441,0,421,0,0]` | enemy-421 summon |
> | team-175 | `[0,0,421,0,0]` | enemy-421 summon |
> | team-188 | `[0,519,0]` | enemy-519 summon |
> | team-221 | `[0,474,0]` | enemy-474 summon |
> | team-267 | `[0,522,0,0,0]` | enemy-522 summon |
> | team-268 | `[0,0,523,0,0]` | enemy-523 summon |
> | team-290 | `[522,0,0,0,522]` | enemy-522 summon（两实例） |
> | team-295 | `[0,420,0,0,0]` | enemy-420 summon |
> | team-303 | `[445,445,0,0,0]` | enemy-445 divide（两实例） |
> | team-304 | `[439,0,445]` | enemy-445 divide |
> | team-313 | `[0,546,0]` | enemy-546 summon |
> | team-377 | `[469,0,470]` | enemy-469 summon |
>
> ## 复审解释
>
> - `65535` 不占槽；`0` 占语义槽但不生成敌人。因此 1900 → 861，而不是把 1900 个
>   条目都当作 5 槽 runtime 队列。
> - v11 的 757 个 `members` 只能证明有效敌数量，不能证明源 RNG/站位槽位；v12 迁移必须
>   从源重新生成 `Array<string|null>`。
> - summon 只在当前 `wMaxEnemyIndex` 内填空；divide 扫描固定 5 槽并可扩大 `wMaxEnemyIndex`。
>   G2 清单用于防止实现把两者错误合并成同一个 `spawnIntoSlot` 规则。
<!-- original-source-quote:end -->
