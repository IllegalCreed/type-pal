# Codex定点复核：f4236474

2026-09-25，基于ac91bd56。**counter，仅剩P5图漏一条已核运行时边；其它R3-1～R3-3残项通过。**
不改GLM报告语义、不改产品/测试/基线、不标done；保持draft。无需重拍、重跑全仓或新增研究。

## 本轮通过

- 增量恰5份GLM报告；产品/scripts、GLM JSON及旧Codex反证零diff。已核22源码hash/17图证据沿用，不重做。
- node逐ID对账**38/38**：各报告编号及分类与机账一致；P4-002已同义为covered/门归属，V1四条与机账同义、无005。
- V1两条旧risk已改为合同确认；P5测试分项326/110/158/37/28/36/7=702；P6扩大纯函数/全管线写入结论已撤回。
- P4表已分开pump、终态1220–1224与performAction1565–1573的清理。
- summary固定增量范围1e4e3382..1410916e、子shell测试命令、根目录Biome以及21/12/5输出注释均已纠正。
- 原GLM JSON Biome exit0；check:docs PASS（20工具测试、0issues）。
  日志`/tmp/codex-arch-f423-biome.log`、`/tmp/codex-arch-f423-docs-initial.log`。

## 唯一残项：P5-GRAPH-1

`p5-phase1-core.md:23–38`声称“15条runtime边全图”，展开合并写法后只有**14条七节点内部边**。
缺少：**battle-opcodes → equip-effect**。这是原15边清单中的边，不是本轮新增范围。

直接证据：`packages/game/src/core/battle/battle-opcodes.ts:18–24`导入
getPlayerAttackStrength/getPlayerDefense/getPlayerDexterity/getPlayerMagicStrength/getPlayerPoisonResistance。
它是值导入，不是type-only，也不属于图中另列的环外节点。其余14条与本席r1冻结机账完全一致，无多余内部边。
只读图对账：`/tmp/codex-arch-f423-reconcile.json`；既有完整集合在`codex-intake-evidence.json`的
`mechanical.runtimeEdgesWithinComponent`，不要求重新分析SCC。

完成条件只需在图中补下面这条（建议紧邻battle-opcodes→event-system），并复核图展开后的集合恰等于已核15边：

```text
battle-opcodes ──R──> equip-effect (:18-24 getPlayerAttackStrength/getPlayerDefense/getPlayerDexterity/getPlayerMagicStrength/getPlayerPoisonResistance)
```

本轮没有其它阻断。Kimi本队列豁免；无Kimi提示词。

## 下一位Agent提示词（GLM）

```text
在 /Users/zhangxu/illegal/type-pal-glm-architecture 同步codex/glm-architecture-support-r1。
读ARCH-SUPPORT-GLM-1卡最新Codex席位和docs/testing/glm-architecture-support/codex-f423-review.md。
f4236474仅余P5-GRAPH-1：P5全图漏battle-opcodes→equip-effect（源码18–24）；补这一条，
展开后与codex-intake-evidence.json既有15边集合核对。其它残项已过，不再改写/重做。
仅改本人报告，保留Codex反证，不改产品/测试/基线/任务状态，不标done、不代签；提交后交Codex。
无Kimi提示词。
```
