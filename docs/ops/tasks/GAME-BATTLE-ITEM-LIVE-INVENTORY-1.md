# GAME-BATTLE-ITEM-LIVE-INVENTORY-1 — 物品脚本后的库存与标志所有权

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「GAME-BATTLE-ITEM-LIVE-INVENTORY-1 — 物品脚本后的库存与标志所有权」的任务归属与历史边界。原目标见原文(摘录:Capability: battle item script lifetime Reviewer: Codex Visual Verification Timing: N/A（库存数值；不改页面）);本页治理不重开已终态任务。

## 范围

原卡含章节[GAME-BATTLE-ITEM-LIVE-INVENTORY-1 — 物品脚本后的库存与标志所有权、已证事实与机制停止线、可审阅方案与准入、交接、2026-10-26 当前批准与build准入],共2个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源3337B(SHA ce447671d047);原卡前提按原时点保留。当前存活入口:[game-boundary-candidates.json](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/game-boundary-candidates.json) [game-boundary-native.json.gz](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/game-boundary-native.json.gz)。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;GAME-BATTLE-ITEM-LIVE-INVENTORY-1 — 物品脚本后的库存与标志所有权的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文2个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[game-boundary-candidates.json](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/game-boundary-candidates.json) [game-boundary-native.json.gz](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/game-boundary-native.json.gz)。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3337B / SHA-256 ce447671d0475057acfaa2ce436b3d6061a2fb9643d59468a8fe3c00b4158d80；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# GAME-BATTLE-ITEM-LIVE-INVENTORY-1 — 物品脚本后的库存与标志所有权

Status: done
Phase: phase1
Capability: battle item script lifetime
Coding Owner: Codex（单一实现写入者）
Reviewer: Codex
Visual Verification Timing: N/A（库存数值；不改页面）
Branch: codex/code-quality-94-102

## 已证事实与机制停止线

[两业务红与来源](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/game-boundary-candidates.json)、[正式三用例源/原生结果/完整raw](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/game-boundary-native.json.gz)。真实startBattle创建状态，真实runScript执行合法小脚本，完整Win OBJECT由现有owner播种，非mock runner：

- 去掉当前物品库存再补回两个，performItem仍扣旧对象，结果2而非应剩1。
- 0x90清掉当前物品Consuming标志后，performItem仍读静态flags，结果0而非应剩1。
- 普通最后一次使用保留count0条目仍绿，作为不得改变的TS既有库存表示。

SDLPal fight.c::kBattleActionUseItem在脚本后读活wFlags并按id调用PAL_AddItemToInventory；script.c::0x90允许写目标OBJECT字。普通原盘剧情是否遇到两角点未证；没有声称通过Save导入复现。当前只改新增专测，产品item.ts未改。

## 可审阅方案与准入

待用户：脚本后重新查当前库存和活OBJECT消耗标志，再扣本次使用；保留正常零数量行、role目标映射、脚本返回指针和存档格式。仅item.ts、新专测及本卡/父证据，先已存两指定AssertionError再实现。与bus纯重构分提交，全部52稳定后才跑统一门/coverage。该机制取舍属于用户在AGENTS保留的停止线，未获准前不实施、不关闭item文件。

## 交接

2026-10-26：正式R2 1绿2指定业务红；最初两例探索源未冻结但raw/native原样保留，不给予正式source字节信用。新测试暂review并单列额外库存，原52分母不变，Codex继续其它独立范围。

## 2026-10-26 当前批准与build准入

用户明确批准按SDLPal脚本后读取当前库存与consuming，普通count0行不改；复用已冻结1绿2业务红。 Codex核当前main未变、单一Owner与隔离治理分支，build allowed。上文待裁决描述保留为历史提案；本轮以此明确答复为准。定向与相邻集中验证，纯清理/行为修复独立提交，全部52稳定后统一门。

2026-10-26 实施：脚本后读取rgObject[itemId].rgwData[6]（无overlay沿静态合同），按id重查当前库存，count>0才扣且保留0行；玩家/敌人归属和script续点不变。既有正式1绿2业务红恢复，两个物品文件11绿/0stderr、game TC0；产品实现与bus纯清理分提交。新阶段全门/发布尚待，未冒称完成。

- 2026-10-26 本地统一门收口：52/52代码接受；全仓20620产品＋721工具／七包TC、lint6137文件0/0/0，完整stderr空；唯一official20185／809全部测试绿、原旧比率拒绝如实保留。按用户既有授权仅pal-extract的死包装与视频CLI保护两文件精确重计，六其它包收益保留；同一报告原policy重放ratchet/protected均exit0，三项精确退役匹配。完整原件与低成本复验见父52证据uniform.json；当前尚未推送/PR/合并，卡面done为代码与本地门，发布以真实GitHub状态另核。
```
<!-- incremental-original-source:end -->
