# EDITOR-CONDITION-INPARTY-1 — 队伍成员条件选择角色

Status: done
Owner: Codex
Reviewer: Codex（当前委派模式下实现与回归复核）
Phase: phase2
Visual Verification Timing: dev-functional（使用现有弹窗/设计系统控件）

## 目标与前提

用户要求 Codex 主动补覆盖率；真实弹窗回归发现一个现行 UI 缺口。
`ScriptEditor.tsx:1136` 可建立 `{kind:'inParty', actorId:'actor'}` 草稿，
`ConditionEditor:1254-1510` 提供条件类型菜单，却没有 `inParty` 的角色输入。
项目目录已有 `ScriptReferenceCatalog.choices('actor')`（`script-reference-catalog.ts:59-72`）和
其他表单的现行角色选择方式。当前业务上用户选“队伍成员”后无法把占位角色换成真实工程角色。

before → after：该条件在弹窗里只能得到不可编辑的占位角色 → 可选择当前工程的角色，
提交后仅写稳定 `actorId`，分支体和其它字段原样保留。原版/第一阶段 N/A：全新作者UI选择器，
不重新裁定原版机制；第二阶段现行 `AuthorCondition` 已声明 `inParty.actorId`，无schema变更。

最强替代解释是角色表本身为空；[真实项目弹窗回归](../../../../../packages/editor/src/ui/ScriptEditor.inparty-condition.test.tsx)
从已有合法工程启动并含 `ally-2`，初始业务红为“队伍成员条件应能选择当前工程的真实角色”，
故缺口在条件控件，而非项目无角色或测试伪造实体。

## 范围与验收

只动 `packages/editor/src/ui/ScriptEditor.tsx`、上述新回归与本卡/看板/索引。
复用 `CanonicalField` + `DsSelect`；对未注册旧值给清晰失效提示，但不静默改草稿。
实际选择采用 `references.choices('actor')` 的稳定 ID；无选项时保留可解释的空态。
不改 `AuthorCondition`、保存格式、运行时队伍判定或其它条件类型。

初始红后修复：真实弹窗选择 `ally-2`，只提交一条命令且原 then/else 与输入深快照不变；
反控移除 `inParty` 控件后这条回归应重新业务红。类型、Biome、相邻条件编辑测试及整批质量门通过后由 Codex 收口。
用户可见结果属于缺失控件修复，不改变条件成立规则。

## 推进记录

- 2026-09-27 Codex：一手源码与真实项目弹窗红例一致；build allowed，诊断日志
  `/tmp/codex-plus2-inparty-red.log`。实现与验收待完成。
- 2026-09-27 Codex：复用 `CanonicalField`/`DsSelect`，角色选择取现行 catalog 稳定 ID；
  原本无效值明确显示但不静默替换。上述回归由业务红转绿，相邻 39/39，编辑器 typecheck 0。
  统一完整 check 9,833 项、lint 2,276 文件零诊断；官方 ratchet/保护 `76c6f5be` 的单次严格
  fast 9,341 项通过。本卡按当前模式核 done，未改变作者条件或存档格式。
