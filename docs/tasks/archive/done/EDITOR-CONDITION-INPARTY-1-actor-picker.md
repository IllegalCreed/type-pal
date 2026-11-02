# EDITOR-CONDITION-INPARTY-1 — 队伍成员条件选择角色

Status: done
Owner: Codex
Reviewer: Codex（当前委派模式下实现与回归复核）
Phase: phase2
Visual Verification Timing: dev-functional（使用现有弹窗/设计系统控件）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是脚本编辑器“队伍成员”条件缺角色选择控件的窄修历史记录（2026-09-27）：ScriptEditor.tsx:1136 可建立 {kind:'inParty', actorId:'actor'} 草稿而 ConditionEditor:1254-1510 无该条件的角色输入，用户无法把占位角色换成真实工程角色。

## 目标

补上 inParty 条件的角色选择：复用 CanonicalField+DsSelect，选项取 ScriptReferenceCatalog.choices('actor')（script-reference-catalog.ts:59-72）稳定 ID；提交只写稳定 actorId，分支体与其它字段原样保留。

## 范围

- 范围内：ScriptEditor.tsx 与新回归 ScriptEditor.inparty-condition.test.tsx 及本卡/看板/索引。
- 范围外：AuthorCondition schema、保存格式、运行时队伍判定、其它条件类型；对未注册旧值只给清晰失效提示，不静默改草稿。

## 前提与证据

真实弹窗回归从已有合法工程启动并含 ally-2，初始业务红为“队伍成员条件应能选择当前工程的真实角色”——排除“项目无角色”的替代解释，缺口定位在条件控件。诊断日志 /tmp/codex-plus2-inparty-red.log（2026-09-27）。
- 当前状态：done（历史终态）

## 验收

原卡记录：真实弹窗选择 ally-2 只提交一条命令、原 then/else 与输入深快照不变；反控移除 inParty 控件后回归重新业务红；相邻 39/39、编辑器 typecheck 0、完整 check 9833、lint 2276 文件零诊断、官方 ratchet 与保护 76c6f5be 单次严格 fast 9341 通过。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡 Codex 按当前委派模式核 done；属缺失控件修复，不改变条件成立规则。本页治理不重开。

## 历史范围

2026-09-27 准入（用户要求主动补覆盖率背景下的真实弹窗回归发现）与同日实现收口；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：inParty 条件角色选择控件补齐并经业务红转绿收口。原卡全文在下方 quote 保全。

## 当时证据

ScriptEditor.tsx:1136、ConditionEditor:1254-1510、script-reference-catalog.ts:59-72 锚点；红例诊断日志。本页治理未新增执行。

## 当前有效性

historical。控件现行形态以当前编辑器代码为准。

## 继任文档

条件合同以现行 AuthorCondition 与编辑器实现为准；无指定后继卡。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `995c0d0bc338d7233b45d09cee2aeb74181ec9b9dfb7c0100f9e84346f209c64`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # EDITOR-CONDITION-INPARTY-1 — 队伍成员条件选择角色
>
> Status: done
> Owner: Codex
> Reviewer: Codex（当前委派模式下实现与回归复核）
> Phase: phase2
> Visual Verification Timing: dev-functional（使用现有弹窗/设计系统控件）
>
> ## 目标与前提
>
> 用户要求 Codex 主动补覆盖率；真实弹窗回归发现一个现行 UI 缺口。
> `ScriptEditor.tsx:1136` 可建立 `{kind:'inParty', actorId:'actor'}` 草稿，
> `ConditionEditor:1254-1510` 提供条件类型菜单，却没有 `inParty` 的角色输入。
> 项目目录已有 `ScriptReferenceCatalog.choices('actor')`（`script-reference-catalog.ts:59-72`）和
> 其他表单的现行角色选择方式。当前业务上用户选“队伍成员”后无法把占位角色换成真实工程角色。
>
> before → after：该条件在弹窗里只能得到不可编辑的占位角色 → 可选择当前工程的角色，
> 提交后仅写稳定 `actorId`，分支体和其它字段原样保留。原版/第一阶段 N/A：全新作者UI选择器，
> 不重新裁定原版机制；第二阶段现行 `AuthorCondition` 已声明 `inParty.actorId`，无schema变更。
>
> 最强替代解释是角色表本身为空；[真实项目弹窗回归](../../../../../packages/editor/src/ui/ScriptEditor.inparty-condition.test.tsx)
> 从已有合法工程启动并含 `ally-2`，初始业务红为“队伍成员条件应能选择当前工程的真实角色”，
> 故缺口在条件控件，而非项目无角色或测试伪造实体。
>
> ## 范围与验收
>
> 只动 `packages/editor/src/ui/ScriptEditor.tsx`、上述新回归与本卡/看板/索引。
> 复用 `CanonicalField` + `DsSelect`；对未注册旧值给清晰失效提示，但不静默改草稿。
> 实际选择采用 `references.choices('actor')` 的稳定 ID；无选项时保留可解释的空态。
> 不改 `AuthorCondition`、保存格式、运行时队伍判定或其它条件类型。
>
> 初始红后修复：真实弹窗选择 `ally-2`，只提交一条命令且原 then/else 与输入深快照不变；
> 反控移除 `inParty` 控件后这条回归应重新业务红。类型、Biome、相邻条件编辑测试及整批质量门通过后由 Codex 收口。
> 用户可见结果属于缺失控件修复，不改变条件成立规则。
>
> ## 推进记录
>
> - 2026-09-27 Codex：一手源码与真实项目弹窗红例一致；build allowed，诊断日志
>   `/tmp/codex-plus2-inparty-red.log`。实现与验收待完成。
> - 2026-09-27 Codex：复用 `CanonicalField`/`DsSelect`，角色选择取现行 catalog 稳定 ID；
>   原本无效值明确显示但不静默替换。上述回归由业务红转绿，相邻 39/39，编辑器 typecheck 0。
>   统一完整 check 9,833 项、lint 2,276 文件零诊断；官方 ratchet/保护 `76c6f5be` 的单次严格
>   fast 9,341 项通过。本卡按当前模式核 done，未改变作者条件或存档格式。
<!-- original-source-quote:end -->
