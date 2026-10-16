# EDITOR-CONDITION-INPARTY-1 — 队伍成员条件选择角色

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `bb7b1d24e9e517e09730282b104ce51b4204cb0b`；本轮为 2026-10-17 R42。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `995c0d0bc338d7233b45d09cee2aeb74181ec9b9dfb7c0100f9e84346f209c64`；下方 quote 可逆回原始 UTF-8 字节。
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
