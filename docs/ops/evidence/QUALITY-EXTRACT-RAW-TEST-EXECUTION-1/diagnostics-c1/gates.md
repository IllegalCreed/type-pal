# C1检查点静态门

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是C1诊断合同检查点的静态门回执页：记录docs/lint/ledger/diff-check四项静态命令与归档后final波的原始exit/耗时/输出SHA，及collector 15条info的诚实处理轨迹。运行时门与统一三门不在本页通过范围。

## 来源与输入

四项静态命令全部exit0：check:docs 1.246秒（62b86a5862cd…）、lint 2.267秒（cf5fafe679cc…）、code-quality-ledger 1.075秒（282f8a7484b3…）、git diff --check 0.024秒（空输出，空串哈希e3b0c442…）。归档后final波：docs 1.279秒（6ffc774cb92a…）、lint 2.465秒（0f587f13f75f…）、ledger 1.12秒（282f8a7484b3…，与首跑同SHA）。

## 断言与业务 oracle

check:docs实测docs域1360 Markdown/7344 local links/443 cards，48工具测试与phase184/content570零问题；lint实测4465文件0 errors/0 warnings/0 infos（final波4466文件仍全0）；ledger实测3289 inventory/209 closed/223 review/2857 pending、0文件关闭。collector初检biome exit0但带15条useTemplate info——按零诊断硬门不算通过（initialPass=false），仅对新增retirement-proof.mjs修模板字面量后重跑覆盖，原始非零记录保留不回写。运行时面完整extract 431仍2 stderr块。

## 结果

静态门全绿但C1不通过统一零诊断验收：runtimeDiagnosticsZero=false，fullCheck/officialRatchet/protectedFast未新跑，mergeAllowed=false、不合main。

## 限制与复核

本页为历史时点回执，未重跑任何命令；exit0带info不外推为通过；三门未跑不记通过。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1842B / SHA-256 6660b312305290c516ad825afecebbfe869571e5ba39e4523df3b86ea73003d7；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# C1检查点静态门

cwd: /Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal

53定向/shared126/typecheck/71工具通过，C1局部V8计数不变。完整extract431仍2stderr块，不通过统一零诊断；全仓check/official ratchet/protected fast未新跑，不合main。静态回执待执行后补录。

| 原命令 | exit | 秒 | raw SHA256 |
|---|---|---|---|
| `pnpm check:docs` | 0 | 1.246 | 62b86a5862cda7ce431167696ac478ee99d35190c46ca2e988346285f56d8d2b |
| `pnpm lint` | 0 | 2.267 | cf5fafe679cc88154e0407ef11a99cf6478acdd962111c3ae60c3d6bf4e6f249 |
| `node scripts/quality/code-quality-ledger.mjs` | 0 | 1.075 | 282f8a7484b37625dc596f3d2d4309b581708e616bf7a40dc863605f9b7a42a8 |
| `git diff --check` | 0 | 0.024 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

同名raw.gz保留原件。docs1360 Markdown/7344 local links/443cards，48工具测试及phase184/content570零问题；lint4465文件error/warning/info全0。ledger实际3289 inventory/209closed/223review/2857pending；0文件关闭。初检collector的15infos是历史未通过记录，已修并由本轮零诊断硬门覆盖，不回写成初检通过。

最终归档后 `pnpm check:docs`：exit0、1.279秒；raw SHA256 6ffc774cb92aff5f89a706c8c564549ee8f5ec8c4f11ba542d5cf332ef0fa22d，见final-docs.raw.gz。

最终归档后 `pnpm lint`：exit0、2.465秒；raw SHA256 0f587f13f75fae715cb1f9fe7b7c49aaba34023b4dbb26d9db4119b2f4605068，见final-lint-zero.raw.gz。

最终归档后 `node scripts/quality/code-quality-ledger.mjs`：exit0、1.12秒；raw SHA256 282f8a7484b37625dc596f3d2d4309b581708e616bf7a40dc863605f9b7a42a8，见final-ledger.raw.gz。

最终lint4466文件，0 errors/0 warnings/0 infos；最终ledger保持3289/209/223/2857。原始非零info记录保留，当前未运行的全仓三门不记通过。
```
<!-- incremental-original-source:end -->
