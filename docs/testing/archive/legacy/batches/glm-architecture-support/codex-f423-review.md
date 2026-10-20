# Codex定点复核：f4236474

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 ARCH-SUPPORT-GLM-1 定点复核（2026-09-25，基于 ac91bd56，候选 f4236474）：**counter，仅剩 P5 图漏一条已核运行时边；其它 R3-1～R3-3 残项通过**。不改 GLM 报告语义/产品/测试/基线；保持 draft；无需重拍、重跑全仓或新增研究。

## Scope

- 本轮通过：增量恰 5 份 GLM 报告（产品/scripts/GLM JSON 及旧 Codex 反证零 diff）；node 逐 ID 对账 38/38；V1 两条旧 risk 改合同确认；P5 分项 326/110/158/37/28/36/7=702；P4 表分开 pump/终态 1220-1224 与 performAction 1565-1573；summary 增量范围/子 shell 命令/Biome/21-12-5 注释纠正；GLM JSON Biome exit0+check:docs PASS。

## Execution and assertions

- **唯一残项 P5-GRAPH-1**：p5-phase1-core.md:23-38 声称「15 条 runtime 边全图」，展开合并写法后只有 14 条七节点内部边；缺 battle-opcodes → equip-effect（battle-opcodes.ts:18-24 值导入 getPlayerAttackStrength/getPlayerDefense/getPlayerDexterity/getPlayerMagicStrength/getPlayerPoisonResistance——非 type-only 非环外节点）；完成条件：补该条（建议紧邻 battle-opcodes→event-system），展开后集合恰等于已核 15 边（既有集合在 codex-intake-evidence.json 的 mechanical.runtimeEdgesWithinComponent，不要求重新分析 SCC）

## Results

- 其余 14 条与本席 r1 冻结机账完全一致无多余内部边；只读图对账 /tmp/codex-arch-f423-reconcile.json；Kimi 本队列豁免；GLM 提示词全文在 quote。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 定点复核 | 2026-09-25 | 38/38 对账+单边残项 | counter（仅 P5-GRAPH-1） | r3 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-architecture-support 的 f423 定点复核回执；固定来源与 source SHA 见下方保全节。

## 原始结论

counter 仅一条：P5 全图漏 battle-opcodes→equip-effect（:18-24 值导入）；补齐后与 15 边清单核对即可。

## 当时证据

本轮通过与唯一残项锚点在 quote 保全。

## 当前有效性

historical。counter 由后续轮次闭合。

## 继任文档

当前结论归 ARCH-SUPPORT-GLM-1 任务卡。

## 原文保全

固定源 revision `5cd599bd28c6aaa67d61e00479bb5379099b9157`，source SHA `0c8a9636bdd92cac490348c39b607b63570f0222597d81c8231021a9fc58244a`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # Codex定点复核：f4236474
>
> 2026-09-25，基于ac91bd56。**counter，仅剩P5图漏一条已核运行时边；其它R3-1～R3-3残项通过。**
> 不改GLM报告语义、不改产品/测试/基线、不标done；保持draft。无需重拍、重跑全仓或新增研究。
>
> ## 本轮通过
>
> - 增量恰5份GLM报告；产品/scripts、GLM JSON及旧Codex反证零diff。已核22源码hash/17图证据沿用，不重做。
> - node逐ID对账**38/38**：各报告编号及分类与机账一致；P4-002已同义为covered/门归属，V1四条与机账同义、无005。
> - V1两条旧risk已改为合同确认；P5测试分项326/110/158/37/28/36/7=702；P6扩大纯函数/全管线写入结论已撤回。
> - P4表已分开pump、终态1220–1224与performAction1565–1573的清理。
> - summary固定增量范围1e4e3382..1410916e、子shell测试命令、根目录Biome以及21/12/5输出注释均已纠正。
> - 原GLM JSON Biome exit0；check:docs PASS（20工具测试、0issues）。
>   日志`/tmp/codex-arch-f423-biome.log`、`/tmp/codex-arch-f423-docs-initial.log`。
>
> ## 唯一残项：P5-GRAPH-1
>
> `p5-phase1-core.md:23–38`声称“15条runtime边全图”，展开合并写法后只有**14条七节点内部边**。
> 缺少：**battle-opcodes → equip-effect**。这是原15边清单中的边，不是本轮新增范围。
>
> 直接证据：`packages/game/src/core/battle/battle-opcodes.ts:18–24`导入
> getPlayerAttackStrength/getPlayerDefense/getPlayerDexterity/getPlayerMagicStrength/getPlayerPoisonResistance。
> 它是值导入，不是type-only，也不属于图中另列的环外节点。其余14条与本席r1冻结机账完全一致，无多余内部边。
> 只读图对账：`/tmp/codex-arch-f423-reconcile.json`；既有完整集合在`codex-intake-evidence.json`的
> `mechanical.runtimeEdgesWithinComponent`，不要求重新分析SCC。
>
> 完成条件只需在图中补下面这条（建议紧邻battle-opcodes→event-system），并复核图展开后的集合恰等于已核15边：
>
> ```text
> battle-opcodes ──R──> equip-effect (:18-24 getPlayerAttackStrength/getPlayerDefense/getPlayerDexterity/getPlayerMagicStrength/getPlayerPoisonResistance)
> ```
>
> 本轮没有其它阻断。Kimi本队列豁免；无Kimi提示词。
>
> ## 下一位Agent提示词（GLM）
>
> ```text
> 在 /Users/zhangxu/illegal/type-pal-glm-architecture 同步codex/glm-architecture-support-r1。
> 读ARCH-SUPPORT-GLM-1卡最新Codex席位和docs/testing/archive/legacy/batches/glm-architecture-support/codex-f423-review.md。
> f4236474仅余P5-GRAPH-1：P5全图漏battle-opcodes→equip-effect（源码18–24）；补这一条，
> 展开后与codex-intake-evidence.json既有15边集合核对。其它残项已过，不再改写/重做。
> 仅改本人报告，保留Codex反证，不改产品/测试/基线/任务状态，不标done、不代签；提交后交Codex。
> 无Kimi提示词。
> ```
>
<!-- original-source-quote:end -->
