# Codex定点复核：f4236474

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 5cd599bd28c6aaa67d61e00479bb5379099b9157；本轮 R73。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- Codex定点复核：f4236474：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `5cd599bd28c6aaa67d61e00479bb5379099b9157`，source SHA `0c8a9636bdd92cac490348c39b607b63570f0222597d81c8231021a9fc58244a`；下方 quote 可逆回原始 UTF-8 字节。
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
