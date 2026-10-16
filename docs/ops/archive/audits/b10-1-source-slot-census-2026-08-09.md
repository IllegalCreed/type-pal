# B10-1 源敌队槽位 census（2026-08-09）

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: audit-report-v1 / 1.0.0

本页按正文语义迁移为 audit-report。原始日期、结论、数字、冲突和未知项保留；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 审计问题

- B10-1 源敌队槽位 census（2026-08-09）：完整读取 77 行/3238 字节；按正文确定为 audit-report / audit-report-v1，历史材料保留原结论和日期。
- 历史问题域：只读审计证据与 B10-1 G1/G2 使用边界

## 范围与证据

- 固定源 revision `81d01fa9993b38f0905ed7a54fc9a0b1c73f8fa5`，源 SHA `6961c437cabdaf0095d0e433683dc18e80c47859b588b2a498862e0823c66d7b`，全文 77 行 / 3238 bytes。
- 证据范围：dated historical audit/index; static content only; current claims require a new source-backed record
- 原始入口与依赖：当前 document-registry.json 与 20261004-structured-content-ops-01.json, 后继任务卡/测试 catalog（按正文引用）

## 发现

| 历史域 | 具体观察 | 当前边界 |
|---|---|---|
| 1 | 只读审计证据与 B10-1 G1/G2 使用边界 | dated historical only |
| 2 | 三份输入 JSON 与不可写复现命令 | dated historical only |
| 3 | 380 源敌队 / 1900 原始条目 / 861 语义槽 / 757 有效敌槽 / 104 空槽等总账 | dated historical only |
| 4 | 20 支含空槽且带 summon/divide 定义的队伍交叉清单 | dated historical only |
| 5 | 65535 与 0 的槽位解释、v11 只保留有效成员、v12 应保留 Array<string|null> 的复审说明 | dated historical only |

## 结论

B10-1 源敌队槽位 census（2026-08-09）：完整读取 77 行/3238 字节；按正文确定为 audit-report / audit-report-v1，历史材料保留原结论和日期。

- 原文状态 `historical` 保持；历史 census 未在当前树重跑，输入 SHA 与 v12 迁移目标需要当前候选重新绑定

## 整改与复核

- 下一步：保留历史原始 census；若用于当前迁移，重跑三份输入并把结果接入当前 canonical 证据。
- 未决与停止线：- 历史 census 未在当前树重跑，输入 SHA 与 v12 迁移目标需要当前候选重新绑定
- 仅静态源/生成数据核对；不证明 runtime、敌人 summon/divide、站位或 RNG 行为
- 后继入口：当前 document-registry.json 与 20261004-structured-content-ops-01.json, 后继任务卡/测试 catalog（按正文引用）

## 历史范围

- 源文件属于日期化历史材料；固定来源 `81d01fa9993b38f0905ed7a54fc9a0b1c73f8fa5`，本轮只做文档结构与语义迁移。

## 原始结论

B10-1 源敌队槽位 census（2026-08-09）：完整读取 77 行/3238 字节；按正文确定为 audit-report / audit-report-v1，历史材料保留原结论和日期。

## 当时证据

- dated historical audit/index; static content only; current claims require a new source-backed record；原始链接、表格和命令在下方 quote 中逐行保留。

## 当前有效性

historical。历史 census 未在当前树重跑，输入 SHA 与 v12 迁移目标需要当前候选重新绑定

## 继任文档

保留历史原始 census；若用于当前迁移，重跑三份输入并把结果接入当前 canonical 证据。

## 原文保全

固定源 SHA `6961c437cabdaf0095d0e433683dc18e80c47859b588b2a498862e0823c66d7b`；以下只增加 quote 前缀，逆回读得到相同 UTF-8 字节。
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
