# TEST-GLM-LARGE-WAVE-4 · D 批回执（迁移纯映射与诊断）

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-LARGE-WAVE-4 D 批回执（迁移纯映射与诊断；r1 本批 623aa49c、R2 031b3e47、R3 本次推送）：新增 sound-reference-audit 4 项+pal-migration-io 5 项+白名单 fixture；9/9 passed；migrate tsc 0 诊断+新文件 Biome 全零+check.mjs PASS+diff 干净；未运行真实迁移/提取/烘焙/发布。

## Scope

- 每组处置：D01 translate-events（7 专项套件绑定/分支/折叠/位移/注册表/状态）+translate-enemy-hook-flow（6 专项 cfg/对白/特效/错误/成长/媒体）existing-proof；D02 pal-sprite-action-census（12 例+真实数据门）existing-proof、**sound-reference-audit 新增 4**（此前零覆盖 542 行+冻结基线门：源位点与目标引用边分离记账角色 7 声道/敌 5 声道/技能动画/召唤/播放音位点+目标 8 通道分类+目录 2 音效全引用、负 magicSound 干净语义破坏按稳定敌 id 违例、soundEdges=通道和一致性、纯读取深快照不变；assertPalSoundReferenceBaseline 是真实提取数据门禁合成样本不冒充原版实测）；D03 script-library-audit（3 套件 7 例 294 场景三重 10x/ref 完整/enemy v10 分流/作者单列/缺 chunk 精确报告/嵌套失败臂 orphan）+script-graph（5 例 0x07 双臂/0x6D/0xA2/0x08 恢复点/auto 自环、Tarjan SCC、delayed goto、四类入口根去重）existing-proof；D04 migration-merge（22+8 三方真值表/稳定 id/poses/add-add/delete-modify/identityMaps 失效）+migration-plan（15+8 精确 target/writes/deletes/冲突零写盘/深快照）existing-proof；D05 pal-authored-overlays+scene-entry-normalize（4 例坐标收敛/稳定命名/id 域/前缀散列碰撞 fail-loud）existing-proof；D06 migration-transaction existing-proof、**pal-migration-io 新增 5**（此前零覆盖：mkdtemp 合成树四道 fail-loud 守卫逐轴——场景 295 计数/s294 精确空 stub/s000-s293 非正 mapNum/地图 223 计数+守卫先于资产装载顺序；不读真实 PAL 工程）。

## Execution and assertions

- **业务反控 2 枚全 VALID：目标通道计数断言改错（源位点与目标引用边分离记账）与场景计数守卫消息改错（295 偏离精确计数）——恰 exit1、AssertionError、唯一失败、产品 hash 不变；R2 重跑（judge 解析带**：unit；项目标签的 FAIL 行）R3 完整失败名精确相等重跑。

## Results

- 原时点 D 批新增 sound-reference-audit 4 项与 pal-migration-io 5 项，9/9 passed；migrate typecheck 与改动文件 Biome 零诊断。两枚反控有效；真实数据门禁和资产装载成功路径仍未证。本页未复跑。

## Evidence

- 未证项：assertPalSoundReferenceBaseline（真实数据冻结门禁）不在合成输入上测试其数字随 data/extracted 漂移由生产迁移入口触发属 Codex 管辖真实数据门；loadPalMigrationSources 的 loadPalAssets 资产装载段（合成树不构造完整资产文件）守卫后资产装载错误仅证「非四类守卫消息」未证成功路径。
- 证据路径：本回执正文（quote 保全）；batch-d-directed.json 逐条 file/fullName/status 在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| D 批回执 | 2026-09-29 | 9 项新增+11 组处置+2 反控 | 交 Codex（后续 accept） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-large-wave 的 D 批回执；固定来源与 source SHA 见下方保全节。

## 原始结论

D 批 9 项新增（sound-audit 4 此前零覆盖+io 守卫 5 零覆盖）+11 组 existing-proof 依据；2 反控三轮判据演进；两条未证如实（真实数据门禁/资产装载成功路径）。

## 当时证据

处置表、反控与未证项在 quote 保全。

## 当前有效性

historical。回执按候选时点；整包由 R3 accept 集成。

## 继任文档

当前结论归 TEST-GLM-LARGE-WAVE-4 完成卡。

## 原文保全

固定源 revision `b9af6517a6298e0fb247b97a3b653294d6b45fa2`，source SHA `4fd417be6291c4156fbc037bed2069269edcca1a1b4ee7bff29780e8fde1ff7c`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。

<!-- original-source-quote:start -->
> # TEST-GLM-LARGE-WAVE-4 · D 批回执（迁移纯映射与诊断）
>
> - 候选 SHA（r1 本批完整提交）：`623aa49c10bda493a640a07f9a3028f760538180`；
>   R2 返工完整候选：`031b3e479e18bf1add1d5b559716172cfb7c031f`；R3 窄返工候选：本次推送提交（完整 SHA 见推送输出与最终回执）。
> - 逐条 file/fullName/status：[batch-d-directed.json](batch-d-directed.json)（9/9 passed）
> - 新增文件：`packages/migrate/src/sound-reference-audit.glm-large-wave.test.ts`（4）+
>   `packages/migrate/src/pal-migration-io.glm-large-wave.test.ts`（5）+
>   白名单 fixture `packages/migrate/src/__tests__/glm-large-wave/sound-audit-fixture.ts`。
> - 门禁：migrate `tsc --noEmit` 0 诊断；新增文件 Biome error/warning/info 全零；
>   `node scripts/docs/check.mjs` PASS；`git diff --check` 干净。未运行真实迁移/提取/烘焙/发布。
>
> ## 每组处置（旧测去重结论）
>
> | 组 | 源文件 | 处置 | 依据 |
> |---|---|---|---|
> | D01 | translate-events.ts | existing-proof | 7 个专项套件（test/bindings/branches/folds/motion/registry/state）覆盖当前 opcode→作者命令的绑定、分支、折叠、位移、注册表与状态轴 |
> | D01 | translate-enemy-hook-flow.ts | existing-proof | 6 个专项套件（cfg/dialog/effects/errors/growth/media）覆盖敌人 hook 流的 CFG、对白、特效、错误、成长与媒体轴 |
> | D02 | pal-sprite-action-census.ts | existing-proof | `pal-sprite-action-census.test.ts` 12 例（合成场景/脚本/精灵动作清点全轴）+ `.pal.test.ts` 真实数据门 |
> | D02 | sound-reference-audit.ts | **新增 4 测试** | 此前**零覆盖**（542 行 + 冻结基线门）。新增：源位点与目标引用边分离记账（角色 7 声道/敌 5 声道/技能动画/召唤/播放音位点向量 + 目标 8 通道分类 + 目录 2 音效全引用）、负 magicSound 干净语义破坏→按稳定敌 id 违例、soundEdges=通道和一致性、纯读取深快照不变。`assertPalSoundReferenceBaseline` 是真实提取数据门禁，合成样本不冒充原版实测，不测 |
> | D03 | script-library-audit.ts | existing-proof | 3 套件 7 例（294 场景三重 10x/ref 完整/上限、enemy v10 分流、作者脚本单列统计、缺 chunk 精确报告、嵌套战斗失败臂 orphan、hook/choreography/defeat 域保留） |
> | D03 | script-graph.ts | existing-proof | 5 例：0x07 双臂/0x6D 双绑定/0xA2 多目标/0x08 恢复点/auto 自环、Tarjan SCC、delayed goto/reset、binding 边归属、四类入口全局根去重 |
> | D04 | migration-merge.ts | existing-proof | 22+8 例：三方真值表、稳定 id 数组/poses 合并、add/add、delete-modify、identityMaps 失效等 |
> | D04 | migration-plan.ts | existing-proof | 15+8 例：ours/theirs/base 精确 target/writes/deletes、冲突零写盘、字节比较、深快照输入保真 |
> | D05 | pal-authored-overlays.ts | existing-proof | `pal-authored-overlays.test.ts` + boundaries 覆盖已存在 overlay 仅改目标、非目标保全 |
> | D05 | scene-entry-normalize.ts | existing-proof | 4 例：坐标收敛与稳定命名落点复用、id 域仅由目标场景+完整坐标决定、前缀散列碰撞 fail-loud、缺失目标场景立即失败 |
> | D06 | migration-transaction.ts | existing-proof | `migration-transaction.test.ts` + boundaries 覆盖 journal/失败重试语义 |
> | D06 | pal-migration-io.ts | **新增 5 测试** | 此前**零覆盖**。新增 mkdtemp 合成树上的四道 fail-loud 守卫逐轴触发（场景 295 计数、s294 精确空 stub、s000-s293 非正 mapNum、地图 223 计数）+ 守卫先于资产装载的顺序证明。不读真实 PAL 工程 |
>
> ## 业务反控（共用 judge，2 枚全 VALID）
>
> | 针 | fullName | 结果 |
> |---|---|---|
> | 目标通道计数断言改错 | auditPalSoundReferences current ledger > 源位点与目标引用边分离记账，通道各归其类 | 恰 exit1、AssertionError、唯一失败、产品 hash 不变 |
> | 场景计数守卫消息断言改错 | loadPalMigrationSources source-tree guards > 场景源数量偏离 295 时停止迁移并给出精确计数 | 同上 |
>
> ## 视觉
>
> D/E 为纯函数审计与 IO 守卫，按卡不造视觉。
>
> ## 未证项汇总
>
> - `assertPalSoundReferenceBaseline`（真实数据冻结门禁）不在合成输入上测试；其数字随真实
>   `data/extracted` 漂移时由生产迁移入口触发，属 Codex 管辖的真实数据门。
> - `loadPalMigrationSources` 的 `loadPalAssets` 资产装载段（合成树不构造完整资产文件）：
>   守卫后的资产装载错误仅在第五测试中证明「非四类守卫消息」，未证其成功路径。
>
> > R2（返工）：D1/D2 针已按 R2 严格判据重跑 VALID（judge 现解析带 `|unit|` 项目标签的 FAIL 行）。
>
> > R3（窄返工，R2 候选 `031b3e479e18bf1add1d5b559716172cfb7c031f` 之后）：本批代表针改用完整失败名精确相等重跑 VALID；judge 所有 INVALID/异常路径先清理临时针再退出，selftest 逐例断言无临时针遗留。
>
<!-- original-source-quote:end -->
