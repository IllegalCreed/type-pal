# QUALITY-MIGRATION-MERGE-OWN-JSON-1 — 三方合并 JSON 字段所有权

Status: review
Owner: Codex
Coding Owner: Codex
Reviewer: Codex（单 Agent）
Phase: phase2
Capability: A7
Visual Verification Timing: N/A（纯 JSON 规划）
Branch: codex/code-quality-94-102

## 目标与范围

核定三方合并只读取对象实际拥有的 JSON 字段，正常保留 `constructor`、`__proto__` 等名字。范围限 `migration-merge.ts` 与正式专测；不改磁盘格式、schema、生成物或游戏存档。发现时只读复现；本轮已按用户裁决窄修，代码接受、统一门待父窗口。

## 前提真值门

| 维度 | 当前证据与范围 |
|---|---|
| primary | `MigrationJson` 接受字符串键 JSON 对象；`createMigrationPlan` 对每个托管正文调用 `mergeManagedFile`。对象字段有无与字段值分开表示，冲突应保存三侧快照。 |
| 修复前实现 | `mergeObject` 用 `in` 判断字段存在，将继承属性也读成输入；结果用普通赋值，`__proto__` 触发 setter，未成为自己的 JSON 字段。 |
| 复现 | 基线 `{}`、作者 `{"constructor":"author"}`、迁移 `{"constructor":"upstream"}` 抛 DataCloneError。作者 `{"__proto__":{"safe":true}}` 与迁移 `{other:1}` 合并只剩 other；真实 plan 的 writes/target 同样漏字段且无冲突。 |
| 边界 | 都是合法泛型 JSON；尚未证明当前完整 PAL 工程或普通发布含这些键。未证明全局原型污染、磁盘覆盖或数据泄漏，不作此类扩大结论。 |

最强替代解释：发布器和内容 schema 的实际键域可能排除这些名字，因此一般工程未受影响；这不改变低层合并合同可复现的输入缺口。若合同明确禁止这些键且在入口读取前拒绝，则须重新裁定处理位置。

## 上下文与证据

[父窗口](QUALITY-PENDING-100-3.md)、[八维质量](../code-quality.md)、[证据入口](../evidence/QUALITY-PENDING-100-3/README.md)。`merge/observe.mts` 及完整 stdout/stderr/执行身份归父窗口原件；纯函数观察不写真实工程。私有 primitive 死分支清理与此行为修复独立，不将清理后的全绿当作缺陷已修。

## 验收与停止线

用户若批准，先以正式入口失败断言锁定：缺席与存在、双方冲突快照、结果 own key/正文与正常原型；再修自有字段判断及安全结果定义，运行相邻规划回归。不得以 reject 全部特殊键取代保留合法字段，不扩大公共接口，不把只读 probe 冒称正式业务红例。

## 获批前交接

2026-10-29：Codex 单 Owner，只读复现已完成。行为裁决已提请，尚未收到答复；状态 draft，不授 build，不关闭实现文件。其它不依赖裁决的测试质量与私有重构继续，重型门留父窗口。


## 用户裁决与本轮准入

2026-10-29 用户明确裁决：“批准按真实 JSON 字段修复（推荐）”。Codex build allowed，单一Coding Owner仍为Codex，同一治理分支；54路径WIP检查点逐项匹配，fetch成功、与main为0/0。先补正式业务失败回归，再仅修本卡行为边界；原始只读probe不继承红例信用。另一项获批修复分别冻结，先前纯重构检查点保留，磁盘格式/生成物/存档与公共签名不变。定向/相邻与TC留本片收尾，重型门留父窗口。


## 本轮代码验收

2026-10-29：两项批准共6条正式AssertionError红例，原31条保持绿；红绿spec字节完全一致，纯重构／JSON字段／资源路径三个源码检查点独立保存。本卡代码接受，Status review等父窗口统一门；未执行真实迁移、写生成物或改资源/存档/公共签名。

5条JSON红例覆盖constructor新增冲突/单侧枚举/删除冲突、__proto__自有data property与正常结果原型、真实plan的target/writes/summary。实现用own-key Set、hasOwn三侧读取和data-property定义；JSON检查点36绿，仅另卡资源红例仍失败。未使用键黑名单，不改变输入原型，不声称修复全局污染。

最终主测37绿、16相邻文件215绿、migrate TC0，完整default+json/stdout/stderr见[父窗口原件](../evidence/QUALITY-PENDING-100-3/README.md)的merge-approved命名空间。默认快检保留旧私有重构/反控身份，并逐项核当前获批差异，不重复全文或旧变异；重型check/coverage/protected及提交推送合并仍集中到稳定窗口。
