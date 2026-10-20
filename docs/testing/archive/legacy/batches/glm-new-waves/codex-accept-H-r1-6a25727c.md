# TEST-GLM-NEW-H-1 · Codex r1 返工候选验收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-NEW-H-1 r1 返工验收（2026-09-29，HEAD 6a25727c…7ee8、返工提交 6e9fe6e0…8bfa）：**代码/证据候选 accept；尚未集成 main，任务保持 review，官方门未运行，不标 done**。

## Scope

- 相对首轮仅改 Wave H 专属 harness、H02 新测与 JSON/反控脚本；产品/旧测/配置基线未改。

## Execution and assertions

- **复跑**：完整 lint 2644 文件 0/0/0；game typecheck 零诊断+docs 零 issue；新增定向 12 文件 48/48；battle-opcodes/actions 相邻 247/247；GLM 回执另记录相邻 25 文件 789/789（统一全仓待集成门）；H02 recordingRng(...,trace) 与 runScript 回调事件发生时写同一数组，精确断言 rng:range(0,3)→script:scriptOnUse@9→rng:next 不再事后拼接两份日志，与一手 fight.c:4719-4775 顺序相符
- **runner**：counter-run.mjs 改 packages/game/node_modules/.glm-counter-H/<id>/ 隔离副本经 Vite resolveId 注入，正式生产源只读（不再瞬态修改产品再 checkout）；Codex 审核 runner 与四枚回执：基线 exit0/针 exit1/预期红绿集合/实际执行数/无 skip-todo-timeout/产品源前后 SHA 一致/Git 干净；反控 runner 本次未在原候选重跑以免重写已提交证据 JSON；统一集成前可在隔离副本复建
- **登记**：receipt.json 固定首轮候选与返工提交完整 SHA；最终 HEAD 由本回执固定避免自引用；baseDamage≤0 自动防御 RNG 序、physicalResistance=0 疑点仍为未证登记不随测试候选宣布产品结论

## Results

- 后续：选择性集成+统一三门；未过门不标 done。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r1 返工验收 | 2026-09-29 | 定向 48/48+相邻 247+lint 0/0/0+隔离 runner | accept（候选级 review 保持） | 首轮 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-new-waves 的 Wave H r1 验收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

accept：H02 事件时序单数组断言+隔离副本 runner（不再瞬态改产品）；两产品疑点保持未证。

## 当时证据

复跑数字与 runner 细节在 quote 保全。

## 当前有效性

historical。accept 指当时候选。

## 继任文档

当前结论归 A-J 并集集成回执与任务卡。

## 原文保全

固定源 revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `a5e4718eea1b3f252b0f1b5c41dcb80afd928b2f880b3d06aa975912ef25c4f3`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-NEW-H-1 · Codex r1 返工候选验收
>
> 日期：2026-09-29。分支最终 HEAD
> `6a25727ccc0806640f444c01e271207094207ee8`；测试/证据返工提交
> `6e9fe6e01eb69bb243712c0720941e88dc3c8bfa`，HEAD 仅再钉回执 SHA。
> 结论：**代码/证据候选 accept；尚未集成 main，任务保持 review，官方统一
> 质量/覆盖门未运行，不标 done**。
>
> - 相对首轮候选仅改 Wave H 专属 harness、H02 新测与 wave-H JSON/反控脚本。
>   产品源码、旧测试、共享配置/基线未改，候选工作树干净、diff check 干净。
> - Codex 复跑完整 lint：2644 文件，0 error/0 warning/0 info；game
>   typecheck 零诊断、docs check 零 issue；新增定向 12 文件、48/48 通过，
>   battle-opcodes/actions 两个关键相邻旧测 247/247 通过。GLM 回执另记录
>   相邻 25 文件 789/789，统一全仓测试仍待 main 集成门。
> - H02 的 `recordingRng(..., trace)` 与 `runScript` 回调在事件发生时写同一
>   数组，新测精确断言 `rng:range(0,3)` → `script:scriptOnUse@9` →
>   `rng:next`，不再事后拼接两份日志；与一手 `fight.c:4719–4775` 顺序相符。
> - `counter-run.mjs` 已改为 `packages/game/node_modules/.glm-counter-H/<id>/`
>   隔离副本，经 Vite resolveId 注入；正式生产源只读。Codex 审核 runner
>   与四枚回执：基线 exit0、针 exit1、预期 red/green 集合、实际执行数、
>   无 skip/todo/timeout、产品源前后 SHA256 一致、候选 Git 干净。
>   它不再依赖瞬态修改产品再 checkout。反控 runner 本次未在原候选上重跑，
>   以免重写其已提交证据 JSON；统一集成前仍可在隔离副本复建。
> - `receipt.json` 固定首轮候选与返工工作提交的完整 SHA；最终 HEAD 由本
>   审核回执固定，避免提交文件自引用。baseDamage≤0 自动防御 RNG 序、
>   physicalResistance=0 等疑点仍是未证登记，不随本测试候选宣布产品结论。
>
> 后续：与其它已接收 wave 选择性集成，统一串行 `pnpm check` → 官方 ratchet →
> 受保护 fast。正式覆盖收益仅按 main 并集实测；未过这些门前不标 done/
> 不清理工作树。
>
<!-- original-source-quote:end -->
