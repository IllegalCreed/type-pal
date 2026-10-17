# Pre-94 47–52 波次质量门证据

Status: rework（2026-10-18 撤回统一门通过与收口信用）

## 当前裁定

`f544b9b94` 的“pnpm check 通过/波次收口”缺少完整未裁剪原件、按来源统计的诊断计数和零诊断结论，不能满足 AGENTS 的 error/warning/info 清零门。**撤回统一门通过与收口；不可据此合 main。** 后续55–67切片沿用本回执的质量门信用一并撤回，逐文件/定向结果仍按各自原始证据核定。

[审计回执](receipt-audit/audit.json)定位原提交、四次原生 CommandExecution、UTC时间、command/cwd/exit、持久化片段 SHA 和限制。已恢复四份执行记录与对应输出gzip，**这些是会话持久化片段，不是完整未裁剪日志**。`check` 记录明确含 `command output truncated for persistence`；没有诊断字符串不能推定诊断为0。其他执行的输出完整性也未被认证，不把退出码或数值汇总升级为统一验收。

C10 的完整原件已重核 SHA，并重数624条 act、243条环境告警（其回执另有321 stderr块/1表单告警）；它证明的是 C10，不是本波次的精确计数。本波次 act/环境/stderr 计数保持 unknown，不填写0，也不虚构与C10相同。

原覆盖率生成/退役审计的数值历史和 baseline 字节保留；本次没有重跑全仓/coverage，没有修改baseline或放宽规则。未来稳定大模块收尾须一次保留完整stdout/stderr、执行身份与诊断分项计数，再单独裁定。缺失的当轮原件不能用后跑日志补签。

## 原回执（历史，已撤回通过/收口信用）

原28行精确字节与SHA另存 [original-readme.md.gz](receipt-audit/original-readme.md.gz)。以下保持当时报告和数值，含“通过”的文字均非当前有效验收：

> # Pre-94 47–52 波次质量门证据
>
> 日期：2026-10-18
> 分支：`codex/code-quality-3y`
> 基点：`d17749bdc`（52 draw-shop 复审提交）
>
> 本波次收口 47–52 的低成本逐包回归和一次官方覆盖率窗口；没有把 card `partial` 提升为 `accept/done`，也没有改变任何产品、schema/save、公共接口或高风险机制结论。
>
> ## 已运行命令与结果
>
> - `VITEST_MAX_WORKERS=1 pnpm check`：通过。docs 工具、coverage/quality/E2E/script-governance 工具全绿；content 149 files/1498 tests、shared 16/128、game 321/3620、pal-extract 73/437、reforge 359/8964、editor 631/4943、migrate 96/739；最终 `lint-zero` 为 5002 files，0 errors / 0 warnings / 0 infos。
> - `VITEST_MAX_WORKERS=1 pnpm coverage:ratchet`：按 fail-closed 规则拒绝，原因是 6 个已存在测试文件的身份计数减少；不是覆盖率回退。拒绝清单：`SpriteResourceViewer.c03-g03`、`SpriteUploadWizard.c03-g07`、`events/annotate.test.ts`、`ball.glm-runtime-resource.test.ts`、`rle.glm-o.test.ts`、`rng.test.ts`。
> - `VITEST_MAX_WORKERS=1 node scripts/coverage/run.mjs fast --ratchet --allow-scope-removal`：通过。六项 removal 均命中已有精确退役账（previous/current、identity digest、文件 SHA 和任务卡转移证据），无生产范围删除；官方 runner 更新 `scripts/coverage/baseline.fast.json`，记录 13 项覆盖率提升、10 项范围变化。
> - `TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast`：通过；coverage-tools 75/75，通过主线保护基线核验，未报告覆盖率回退。
> - `node scripts/quality/code-quality-ledger.mjs`（本波次证据写入前）：通过，3311 files；252 closed / 44 review / 3015 pending；semantic review still required。
>
> ## 官方 fast 基线（本次生成）
>
> 总计 737 source files / 19,930 tests：statements 90.02%（71241/79139）、branches 83.71%（51751/61823）、functions 89.64%（13493/15053）、lines 91.90%（63642/69248）。
>
> 包级结果：shared 96.14/93.58/100/97.33，content 96.43/94.11/98.07/97.35，pal-extract 70.09/79.30/80.14/70.05，migrate 90.47/90.77/93.90/90.78，reforge 90.01/82.52/90.04/92.30，game 88.94/79.94/84.77/90.57，editor 90.21/83.49/89.69/92.38（顺序均为 statements/branches/functions/lines）。
>
> ## 未关闭与风险
>
> - 47–52 对应任务卡仍为 `partial`；文件级 ledger 结论沿用逐文件证据，不因整仓门通过而批量关闭。
> - `packages/game/src/present/menu/inventory-list-pixels.grok-r1.test.ts` 与 `shop-preview-pixels.grok-r1.test.ts` 的直接像素测试仍分别有 `document is not defined` 环境诊断，保留 `review`，未改环境、未跳过、未静音。
> - `packages/game/src/present/menu/draw-magic.ts` 仍为 `review`：SDLPal `PlayerInfoBox` 的毒/状态视觉与当前实现存在高风险边界，已由 `GAME-MAGIC-PLAYERINFO-STATUS-1` 单独停线等待裁决。
> - 下一批继续从 pre-94 的 pending 中选不与活跃任务重叠的最小切片；不把 94–102 或后续卡提前纳入本波次。
