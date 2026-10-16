# TEST-GLM-NEW-G-1 · Codex 独立审核 r1

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 64bd3b936eb8fdd0943deba5e476d032a30c1830；本轮 R75。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- TEST-GLM-NEW-G-1 · Codex 独立审核 r1：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `c348c073c90aa1dc1ce430d8bae58a6d14fd732b497da6bc2591465acb37b1b2`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-NEW-G-1 · Codex 独立审核 r1
>
> 日期：2026-09-29。候选 `codex/glm-new-g-r1` HEAD
> `07140f7596798c7687322eba83b110fcec0d033a`，相对派发基点 `2948810f`。
> 结论：**rework，未合 main，未运行官方 ratchet/受保护 fast**。
>
> ## 已独立验证
>
> - 候选工作树干净，产品/旧测试/依赖/官方基线最终未改；12 个冻结目标各有
>   同目录新测试。Codex 定向复跑 **12 文件、47/47 passed**，Reforge typecheck
>   零诊断，diff check 干净。
> - 四张隔离 battle-trial 截图 SHA256 与 `wave-G/visual-evidence.json` 一致；
>   Codex 实际看图确认试打画面与停止恢复按钮/状态。该证据不证明主场景 E2E。
> - 派发版 `verify-targets.mjs` 会把交付后的新测试误判路径占用，属 Codex
>   脚本缺陷，已在 main `10a5d601` 修复，不归责 GLM。
>
> ## 必须返工
>
> 1. 完整 `pnpm lint` **失败：7 errors**，位于 `wave-G/browser-host/{drive.mjs,main.ts}`
>    的 import/格式、`needle-judge.mjs` 格式、`needle-verdicts.json` 与
>    `vitest-results.json` 格式。局部 12 个新测 Biome 0 不等于全仓零诊断。
>    按原规则修至完整 0/0/0，不加 ignore/降规则。
> 2. `render.glm-next-wave.test.ts:103/117` 和
>    `world-scene-presentation.glm-next-wave.test.ts:58` 仍有三处
>    `as unknown as CanvasRenderingContext2D`。卡面明确禁双强转；“旧测试同型”
>    不是本卡豁免。改用真正可类型化的 Canvas 端口/测试宿主，不以另一层不安全
>    强转或规则排除掩盖。
> 3. `wave-G/needle-judge.mjs:83–156` 直接 `writeFileSync` 改四个正式生产源码
>    再还原，越过本 wave 产品只读白名单；进程中断也可能留下突变。
>    它用 `-t` 过滤，其它测试 skipped，却在注释中把 skipped 称正常；
>    `matchingRun` 只核 fullName 不核**绝对 test file**，不核实际执行总数，
>    还复用固定 `/tmp/.../needle-last.json`，缺新鲜性和错文件防护。
>    改为隔离副本/loader 注入，不写正式生产路径；判据须同时核基线 exit0、
>    注入恰 exit1、唯一实际失败、绝对 file/fullName、执行数、无混错/skip/
>    timeout/零执行/exit2 与产品 hash 不变；给同一判据的反例自测并重跑四针。
> 4. `screen-fx.glm-next-wave.test.ts:62–90` 将“同 srcTag 换 source 返回旧缓存”
>    和“同缓存实例改变 w/h 却保留旧尺寸”钉为正合同。生产调用方
>    `battle-session.ts:2299–2322` 用 `srcTag` 表示背景身份，且固定 320×200；
>    两种输入没有现行消费者依据，尤其旧缓存可能是缺陷而非期望。
>    保留可证的 wave/shift 轴；这两例须给直接合法调用锚与政策证据，
>    否则移除并登记未证，不为覆盖率冻结陈旧结果。
> 5. 视觉回执的 9 条 404 console error 只记录通用文本，未记录请求 URL；
>    不能据此断言全是 `.type-pal/save-state.json` 的预期 NotFound。
>    补记录每条失败 URL/status 与对应 `readProjectSaveState` 的处理，
>    无法归因者标视觉 console 未证。候选还改了 GLM 只读的共享
>    `docs/testing/archive/legacy/batches/glm-new-waves/README.md` 导航；请恢复，Codex 在集成时负责索引。
>
> 回执固定本候选及返工候选完整 SHA，更新新鲜 file/fullName/status、反控和视觉
> 证据；只改 Wave G 原白名单，不碰产品、旧测、共享配置/基线或其它分支。
> 复跑定向+相邻、Reforge typecheck、完整 lint 0/0/0、docs/diff 后交 Codex 再审。
>
<!-- original-source-quote:end -->
