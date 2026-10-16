# TEST-GLM-NEW-H-1 · Codex r1 返工候选验收

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 64bd3b936eb8fdd0943deba5e476d032a30c1830；本轮 R75。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- TEST-GLM-NEW-H-1 · Codex r1 返工候选验收：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `a5e4718eea1b3f252b0f1b5c41dcb80afd928b2f880b3d06aa975912ef25c4f3`；下方 quote 可逆回原始 UTF-8 字节。
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
