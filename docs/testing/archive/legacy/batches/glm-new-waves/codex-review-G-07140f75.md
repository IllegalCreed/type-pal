# TEST-GLM-NEW-G-1 · Codex 独立审核 r1

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-NEW-G-1 首轮审核（2026-09-29，HEAD 07140f75…033a、基点 2948810f）：**rework，未合 main，未运行官方门**。

## Scope

- 已独立验证：工作树干净、12 冻结目标各有同目录新测；定向 12 文件 47/47、Reforge typecheck 零诊断；四张截图 SHA 一致实际看图（试打/停止恢复）；派发校验器缺陷已在 main 修复不归责 GLM。

## Execution and assertions

- **返工 1-2**：完整 lint 失败 7 errors（browser-host drive.mjs/main.ts import+格式、needle-judge 格式、两 JSON 格式）——局部 12 新测 Biome 0 不等于全仓零诊断；render:103/117 与 world-scene-presentation:58 三处 as unknown as CanvasRenderingContext2D——卡面禁双强转「旧测试同型」不是豁免；改真正可类型化 Canvas 端口不以另一层强转或规则排除掩盖
- **返工 3**：needle-judge:83-156 直接 writeFileSync 改四个正式生产源码再还原越过产品只读白名单（进程中断可能留突变）；-t 过滤其它 skipped 却注释称正常；matchingRun 只核 fullName 不核绝对 test file/执行总数；复用固定 /tmp needle-last.json 缺新鲜性；改隔离副本/loader 注入不写正式生产路径；判据核基线 exit0/注入恰 exit1/唯一失败/绝对 file-fullName/执行数/无混错-skip-timeout-零执行-exit2/产品 hash；同一判据反例自测+重跑四针
- **返工 4**：screen-fx:62-90 把「同 srcTag 换 source 返回旧缓存」与「同缓存实例改 w/h 保留旧尺寸」钉为正合同——生产 battle-session:2299-2322 用 srcTag 表背景身份且固定 320×200，两输入无现行消费者依据旧缓存可能是缺陷；保留可证 wave/shift 轴；两例须给直接合法调用锚与政策证据否则移除登记未证，不为覆盖率冻结陈旧结果（S15 wave-G 判例：console 标未证+陈旧缓存断言删）
- **返工 5**：视觉回执 9 条 404 console error 只记通用文本未记 URL——不能断言全是 save-state.json 预期 NotFound；补每条失败 URL/status 与 readProjectSaveState 处理，无法归因标未证；候选改了 GLM 只读的共享 README 导航请恢复，Codex 集成时负责索引

## Results

- 返工回执固定本候选及返工候选完整 SHA、新鲜 file/fullName/status；只改 Wave G 原白名单；复跑定向+相邻+typecheck+完整 lint 0/0/0+docs/diff。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r1 审核 | 2026-09-29 | lint 7 错+双强转+写盘 runner+陈旧断言+console URL | rework | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-new-waves 的 Wave G r1 审核回执；固定来源与 source SHA 见下方保全节。

## 原始结论

rework 五项：lint 7 错+三处双强转+runner 直接写生产源（越只读白名单）+两条陈旧缓存断言无消费者依据+console 未记 URL；共享 README 越界恢复。

## 当时证据

五项返工在 quote 保全。

## 当前有效性

historical。rework 由 r2 accept 闭合。

## 继任文档

当前结论归 Wave G r2 验收回执。

## 原文保全

固定源 revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `c348c073c90aa1dc1ce430d8bae58a6d14fd732b497da6bc2591465acb37b1b2`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
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
