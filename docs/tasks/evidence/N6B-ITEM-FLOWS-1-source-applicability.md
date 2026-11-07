# 四类取物 content23 的来源适用性核验

Status: recorded
Owner: Codex
Last reviewed: 2026-11-07
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

固定前置接受态为 `0973c2c25795fd2aacf78daedebb8d8f2a5113fc`。它包含已刊 010 与普通宝箱开盖候选及各自原始记录。本次实现见 [N6b 任务](../cards/N6B-ITEM-FLOWS-1.md)，产品内容切换到 content23，存档世界布局仍为 SAVE12。

## 来源与输入

本次从真实检查诊断回查 catalog、配对 evidence 和 Markdown metadata，共 22 个既有条目、32 个条目/来源组合、每份配对 41 条来源引用。有限名单由 [来源桥接器](../../../scripts/docs/testing-acquisition-source-bridge.mjs)固定，不能由候选 manifest 扩大。

| 来源变化 | 实际核对与适用边界 |
| --- | --- |
| `character.ts` | 仅 content 常量 22→23，最低存档版本仍为 12；原执行版本保留。007、009 的精确版本锚点随该常量改变。 |
| 002、003、006 的前驱校验 | 只将合法 Reforge 当前内容版本改为 23；保存字节、同引擎、位置、库存、路线和实际恢复判据保持。 |
| 008、009 的 producer | 原路线中取物结束后只增加原生保存快照采集，不增加行走或交互；异步保存必须完成后才能记录字节。 |
| `s016.json` | 仅 e233 换成拾取参数；e212、e213 的池塘剧情完整子树保持。相关实体身份锚点仍指向原作者。 |
| `battle-session.ts` | 仅对话行读取改用显式奖励行呈现；三个既有接线范围的完整字节及行为未改。 |
| `pal-story-corrections.test.ts` | 首段测试导入变更使行号移动；声明和原业务断言未改。 |
| `command-form-contract.ts` | 增加作者 `grantReward` 表单接线；原桥接函数范围保持。新取物表单的验证另属本任务。 |

逐条旧/新 SHA、行范围、原锚点及相应源码片段由本任务证据包中的 `source-rebinding.json` 保全。原件可从固定 Git 来源复算；全文件摘要改变不等于声明范围的所有业务都已重新执行。

## 断言与业务 oracle

新桥接先按固定前置 Git 字节核原维护、阶段发布及普通宝箱来源层，再核此次有限来源变化。每组恰追加一条 history，`previousSourceRefs` 保留实际改变的全部旧引用及原顺序。当前 SHA、范围和锚点必须在真实文件中成立；未准入路径、重复/缺失成员、错误版本锚点、旧历史重写、附件或候选篡改均拒绝。

战斗会话与指令表单两个既有 source-contract claim 内，合计四个现有 `path:lines` 指针随相应 sourceRef 的真实行范围同步。桥接先精确核原指针唯一位置和新指针，再反向恢复；claim ID、result、文字及其它 evidence 指针保持，不能借移动来源修改判据或授予执行信用。

## 结果

catalog、配对 evidence 与 Markdown metadata 同步这次来源及历史。原条目的状态、成员、角色、候选、版本、合法输入说明、执行、附件和旧 history 保留原值；claim 仅移动上述四个声明来源指针。该层只记录新源码对原测试合同的适用性；四类取物的当前游戏、存读及编辑器结果使用 [N6b 任务](../cards/N6B-ITEM-FLOWS-1.md)的新原件。

## 限制与复核

旧 runtime/E2E 结论仍只属于其原候选和版本。此次源码变化涉及的取物行为不能借本回执继承旧运行信用。新的产品判断、完整战斗、其他剧情及用户视觉接受均按各自实际证据记录。
