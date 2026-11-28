# REFORGE-SAVE-SCENE-REFERENCES-1 — 保存现场按真实实体记录验证引用

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-28
Template: task-card-v1 / 1.0.0

## 目标

保存现场的坐标与自动操作归属以真实场景和实体记录为准。合法同名实体缺少同步记录时，普通对象的继承属性可能绕过当前存档验证。

## 范围

读档 codec 对场景地址、实体坐标、自动游标、步态、移动和动作归属的已登记记录查找。以现行 SAVE12 约束和已有场景实体地址合同裁定。

## 前提与证据

[存档读档边界](../../phase2/specs/save-system.md#当前读档边界)与[场景实体地址验收](REFORGE-ENTITY-ADDRESS-WRITES-1.md#定向验收)。先用真实作者场景校验、SAVE12 builder 与当前 resolver 确认词法合法性和 codec 行为。

## 验收

真实存在的同名坐标仍被接受。缺坐标或缺自动来源的现场以现行错误原因拒收。实现前保存可证伪的正式反例，复验相邻恢复入口。

## 状态与交接

随 [游标等义比较](REFORGE-SAVE-CURSOR-IDENTITY-1.md) 的全文件复核发现。先定向取证。

2026-11-28 Codex build allowed。真实场景校验接受同名实体。四条 codec 业务反例已分别证实缺坐标、缺移动 owner、缺步态 owner、缺动作 owner 时的误判。现行真实登记规则已明确，本片按该规则补足读档查找，不新增格式或实体名限制。与游标比较同一写入 Owner，范围仅 codec、专测和相关回执。

## 本轮验收

场景与实体现场查找使用共享实际条目读取函数。四项正式失败反例恢复为拒收，已登记同名项的正例接受。相邻恢复和现场续接检查随 [读档游标定向验收](REFORGE-SAVE-CURSOR-IDENTITY-1.md#本轮验收)执行。未证明普通玩法会生成缺项的现场。
