# AUDIT-GROK-WRITE-PLAN-SIX-1 — 六条写入计划合同短审

Status: build
Owner: Grok（只写独占六行审查报告）
Reviewer: Codex（独立接收）
Phase: ops
Capability: ops / contract-dedup
Visual Verification Timing: N/A（不做视觉）

## 目标与硬边界

用户2026-10-02报告额度约剩1/3；只派六条现有合同排重，不再开大量补测。
对GLM O固定候选write-plan域提供六行真实源码/旧断言账，最多两页，交付一次即停。
**不新增测试、不跑反控/全包/coverage/官方门，不修改O的代码/证据/状态**。
这不是重开Grok已accept的400例，也不将读审授权变成migration/schema/资产管线实施授权。

## 固定路由与白名单

- O候选源：`a295f42c09cb8c6272849adb7d86c96beb16040f`，对象真实，不等于O已accept。
- 审查content20/SAVE8冻结候选的合同，不冒称当前main（content21/SAVE10）已实施或覆盖；
  本卡只读、无版本兼容/迁移实施授权。
- 工作树：`/Users/zhangxu/.codex/worktrees/grok-write-plan-audit-small/type-pal`。
- 分支：`codex/grok-write-plan-audit-small-r1`，Codex已从上述候选预建；不是O树，不用旧400树。
- 唯一提交白名单：`docs/testing/grok-write-plan-six-report.md`。
- 原派发/生产冻结只读记录：`8b3ca062953b17a12178f8d1a9e36657971234b1` /
  `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`；不扩写入Owner或替O修卡。

任务卡/最新审核从审核树`/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal`读取：
[O卡](TEST-GLM-WAVE-O-1-supply-validation-tenfold.md)、
[最新独立结论](../../testing/glm-tenfold-triple/codex-opqc-r12-review-20261002.md)。
仅参考其中已裁决的project-io六条，**本任务是另六条write-plan，不重复那个旧审计**。

## 指定六条（不扩量）

固定候选`packages/migrate/src/migration-write-plan.glm-o.test.ts`前六个test：

1. 工程写按scenes/index最后排序；map内容走专用序列化（:76）。
2. 写入目标未纳入规划快照fail-loud（:108）。
3. 托管文件缺原始字节hash，hash/files不一致fail-loud（:119）。
4. 删除计划规划hash，正文缺失时expectedPreviousHash=null（:135）。
5. 退役资源按path排序并带expectedSha256（:158）。
6. 退役资源路径越界/sha非法fail-loud（:177）。

只读范围：该新测、`migration-write-plan.ts`、旧`.test.ts`/`.boundaries.test.ts`/
`.glm-next-wave.test.ts`、`__tests__/planned-changes-fixture.ts`、
`migration-baseline.ts`必要序列化片段、`scripts/migrate-content.mts`实际caller片段；≤八个直接源/测试。
不要通读全部485/400/700合同，不查浏览器，不运行迁移含dry-run或extract。

## 前提与需要独立核的内容

Codex已直接确认`:21`公开buildMigrationTransactionChanges，plannedHash管理/hash守卫、
project排序/序列化及retirement守卫；生产caller在`packages/migrate/scripts/migrate-content.mts:116`。
旧next-wave确有“未纳入规划快照”“缺原始字节hash”合同，旧boundaries有排序/退役指纹，
旧test有非法path/sha；这些是排重线索，**不是提前替六条签结论**。
该子卡只做文档事实核查，不准入迁移实施，不裁决新的数据真值，before→after仅证据增加。
反证：新例有合法且旧matcher未覆盖的不同条件/必要oracle，则精确指出；不能凭同名函数/关键词判重复。
同样不能用改数字/文件名/没有旧“直测”标题就判新增。

## 交付

报告放testing根目录，不创建证据子目录/README，不要求修改共享导航。一个六行表：新fullName/源码条件行/实际caller与合法构造/旧Git blob+fullName+matcher行/
新oracle与差异/`new-axis | existing-proof | unreachable | pending`结论。
mixed例逐子轴分开，别整例草率全新/全旧；无合法构造或旧证不足写pending及下一条需要的证据。
附最多三条总体建议；不会填的行如实留待核，不标humanVerified、不伪造SHA/行号。
只报告、不代改O contracts；Codex收件后与O最新返工去重，不把过时样本重开为新counter。
无需安装依赖/执行业务测试；仅可docs check/diff check，报告commit/push完整40位SHA后停止。

## 当前模式推进

- Codex：固定范围、前提/旧证入口与单一报告Owner已核，**build allowed仅独占报告**。
- Grok：pending；旧400例accept保持，此卡独立、无新产品/测试写授权。
- Codex报告独立accept：pending；O原卡rework和正式质量/覆盖结算权不转交。

## 下一位Grok提示词

```text
接手AUDIT-GROK-WRITE-PLAN-SIX-1，你是唯一短审报告Owner，当前build仅报告。只审六条，≤两页，交付一次即停；不新增测试、不反控/全包/coverage/浏览器/迁移。工作树/Users/zhangxu/.codex/worktrees/grok-write-plan-audit-small/type-pal，分支codex/grok-write-plan-audit-small-r1，固定O源a295f42c09cb8c6272849adb7d86c96beb16040f。先从审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal读docs/ops/tasks/AUDIT-GROK-WRITE-PLAN-SIX-1.md及O卡/最新独立报告，只按该卡指定migration-write-plan.glm-o.test.ts前六test，读实际产品条件、migrate-content.mts caller、旧test/boundaries/next-wave与必要fixture，最多八个直接文件。交六行：真实新fullName/源码条件/caller合法输入/旧blob-fullName-matcher行/精确新oracle差异/new-axis或existing-proof或unreachable或pending；mixed按子轴，不凭关键词或换数字裁新。缺证写pending，不伪造行号/SHA、不标自动humanVerified。仅docs/testing/grok-write-plan-six-report.md可提交，放testing根不创建新子目录/README；GLM O树/代码/证据/共享卡及全部产品/旧测/配置/baseline/真实数据只读；不用已accept旧400树，不改O配额/状态。docs/diff轻门后commit/push完整SHA并停止，不合main、不done、不官方门、不清树；旧400accept保持，Codex独立接收后决定如何供O续批参考。
```
