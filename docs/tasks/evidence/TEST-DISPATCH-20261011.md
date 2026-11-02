# TEST dispatch 2026-10-11

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: plan-status-v1 / 1.0.0

本页是 2026-10-11 的测试派发记录：在 dispatch base/source 冻结 `9aa3bed89` 上开出三个有限、互不重叠的 GLM 残差包（draft 卡），并声明既有候选的接收状态。

## 目标与时间范围

- 2026-10-11 派发；冻结基点 `9aa3bed892728f17c70d2f86d1fe07db10a718b8`（官方 fast 基线：729 源码文件、19,789 测试、分支 51060/61181=83.46%）。
- main 上既有未提交 entity-state 草稿文件有意不动；既有 `TEST-GLM-GAME-TURN-BOUNDARIES-1` 保持 review 候选——其 15 合同证据未接收，待原生 raw/identity 与合法输入复核。

## 里程碑

- `TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1`：仅 ControlCommandForm 资源/商店/共享自身合同。
- `TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1`：仅 ItemUseEffectEditor 残差合法失败/修复/引用合同。
- `TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1`：仅 MenuBox 已接收资源/状态轴之外的公开布局/派发合同。
- 三包均允许零新增合同，测试文件白名单互斥；贡献者须冻结源 hash、对既有 fullName 排重、在所列范围停止。

## 当前状态

- historical：派发时点记录。三包后续实际交付/验收见各自证据目录与 Codex 接收记录；本页不追认其结果。

## 阻塞与决策

- 无派发阻塞。约束决策：Codex 执行独立验收与当前 HEAD 质量/CI 门；候选未合并不计官方覆盖（合并后重测）。

## 下一步

- （历史时点）贡献者在各自白名单内交付；Codex 集成后统一结算覆盖率。本页无继任执行动作。

## 历史范围

- 2026-10-11 测试派发记录（三残差包准入）；固定源 revision 6855e6945bb0…。

## 原始结论

- 三包互斥白名单+零新增允许+冻结/排重/停止纪律；turn-boundaries 15 合同保持未接收。

## 当时证据

- 派发基线 fast 数字与包清单在 quote 保全。

## 当前有效性

historical。派发条件以当时冻结源为准，不授权当前执行。

## 继任文档

当前结论归三张残差卡各自的证据目录与 Codex 接收记录。

## 原文保全

固定 source revision `6855e6945bb015df4674dc64ad7410f56702ceee`，source SHA `e067ed21a2b3a6989ed7e83bbd97e8a8ed12ba1c59357fd46fd721f47520c2d2`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST dispatch 2026-10-11
>
> Dispatch base/source freeze: `9aa3bed892728f17c70d2f86d1fe07db10a718b8` (official fast baseline: 729 source files, 19,789 tests, branches 51060/61181 = 83.46%). Existing uncommitted entity-state draft files on main are intentionally untouched. Existing `TEST-GLM-GAME-TURN-BOUNDARIES-1` remains a review candidate; its 15-contract evidence is not accepted pending native raw/identity and legal-input recheck.
>
> Three finite, non-overlapping GLM packages are opened as draft cards:
>
> 1. `TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1`: ControlCommandForm resource/shop/shared-self contracts only.
> 2. `TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1`: ItemUseEffectEditor residual legal failure/repair/reference contracts only.
> 3. `TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1`: MenuBox public layout/dispatch contracts outside accepted resource and status axes.
>
> All packages permit zero new contracts and have exclusive test-file whitelists. Contributors must freeze source hash, deduplicate against existing fullNames, and stop at the listed scope. Codex performs independent acceptance and current-HEAD quality/CI gates; no candidate is official coverage until merged and remeasured.
>
<!-- original-source-quote:end -->
