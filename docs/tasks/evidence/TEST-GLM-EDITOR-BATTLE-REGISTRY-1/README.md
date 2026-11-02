# TEST-GLM-EDITOR-BATTLE-REGISTRY-1 证据索引

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-EDITOR-BATTLE-REGISTRY-1 的证据索引：本卡已归档，测试与证据已由 Codex 集成 main；交付物仅为三份 Editor 合同测试。

## 证据身份

- 三份合同测试：BattleSpriteLibrary.glm-battle-registry.test.tsx（BR-01 注册证明门、BR-02 缺失字节回落）、SpriteFrameDeletion.glm-battle-registry.test.ts（BR-04 删帧规划守卫）、EnemyTeamTab.glm-battle-registry.test.tsx（BR-05 宿主深链同步）。

## 来源与输入

- （历史时点）定向证据见 directed.raw；排重、合法输入、真实 caller/oracle 与放弃分支举证保留在归档任务卡和三份测试文件头部。

## 断言与业务 oracle

- 四枚反控三态原始输出见 counterproof.json 与 mutation-logs/；仓库根可重放：node docs/ops/evidence/TEST-GLM-EDITOR-BATTLE-REGISTRY-1/run-counterproof.mjs。

## 结果

- 已集成 main（卡归档）；本卡不以覆盖率或例数作为验收指标。

## 限制与复核

- 短索引页：无逐合同细节，排重/边界举证在归档任务卡；重放入口如上。

## 历史范围

- TEST-GLM-EDITOR-BATTLE-REGISTRY-1 证据索引（三测试+四针）；固定源 revision 6855e6945bb0…。

## 原始结论

- BR-01/02/04/05 四合同交付并集成 main。

## 当时证据

- directed.raw/counterproof.json/mutation-logs 链接在 quote 保全。

## 当前有效性

historical。已归档集成。

## 继任文档

当前结论归归档任务卡。

## 原文保全

固定 source revision `6855e6945bb015df4674dc64ad7410f56702ceee`，source SHA `eb8d15361d81cb357a8c599fa46d78e85a234c35e3749878fecf691491dd197f`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-EDITOR-BATTLE-REGISTRY-1 证据索引
>
> 本卡已归档，测试与证据已由 Codex 集成 main。交付物仅为三份 Editor 合同测试：
>
> - `packages/editor/src/ui/BattleSpriteLibrary.glm-battle-registry.test.tsx`（BR-01 注册证明门、BR-02 缺失字节回落）
> - `packages/editor/src/ui/SpriteFrameDeletion.glm-battle-registry.test.ts`（BR-04 删帧规划守卫）
> - `packages/editor/src/ui/EnemyTeamTab.glm-battle-registry.test.tsx`（BR-05 宿主深链同步）
>
> 定向证据见 [directed.raw](directed.raw)，四枚反控的三态原始输出见 [counterproof.json](counterproof.json) 与 [mutation-logs/](mutation-logs/)。
> 仓库根目录可重放：
>
> ```text
> node docs/ops/evidence/TEST-GLM-EDITOR-BATTLE-REGISTRY-1/run-counterproof.mjs
> ```
>
> 本卡不以覆盖率或例数作为验收指标；排重、合法输入、真实 caller/oracle 与放弃分支举证保留在归档任务卡和三份测试文件头部。
>
<!-- original-source-quote:end -->
