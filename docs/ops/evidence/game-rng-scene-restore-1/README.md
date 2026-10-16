# 酒剑仙传功后场景恢复证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- 酒剑仙传功后场景恢复证据 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 0384131f1380168f539b97997958338723896c2a5fb914b1b7c48b7bfe66749b。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 381cab90f8d6cc26171bd4bc8c2b025c15bc6f36；本轮 R70。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- 酒剑仙传功后场景恢复证据：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `381cab90f8d6cc26171bd4bc8c2b025c15bc6f36`，source SHA `0384131f1380168f539b97997958338723896c2a5fb914b1b7c48b7bfe66749b`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # 酒剑仙传功后场景恢复证据
>
> 上级：[任务证据](../README.md)。任务：[GAME-RNG-SCENE-RESTORE-1](../../archive/tasks/done/GAME-RNG-SCENE-RESTORE-1.md)。
>
> 2026-10-14，基点 `646c8097034e4bd30a3ebde86cd61d46a2382e8a`，候选源文件 hash 见
> [manifest](evidence-manifest.json.raw)。这是第一阶段诊断/修复证据，不替代合法剧情存档的完整 E2E。
> 用户授权的合并、CI 与阿里云部署已完成，发布源码 `588790383ac4f8692019acd7f94dc292b0acd640`；线上复验见下方回执。
>
> ## 复现与画面
>
> - [旧实现记录](before-browser.json.raw)：新 Chrome profile，`http://localhost:6005/?skip-intro=1&dev-scene=11`，
>   仅将人物摆到酒剑仙身边；原生 proximity 触发 `L_2205`，真实资产/播放器/完整传功脚本继续执行。
>   2260 redraw 后 rngFrameActive 仍真，2261 普通对话将 dialogPlayingRNG 置真。
> - [修复后记录](after-complete-browser.json.raw)：相同入口，2260 清标记/备份，2263 显示庙内跪拜；
>   全段结束仍为 scene 12、explore，三项保持状态均已清。
> - 操作脚本原件：[reproduce.mjs.raw](reproduce.mjs.raw)。这是调试定位，不把摆放坐标冒充合法路线检查点。
>
> | 修复前 | 修复后 |
> |---|---|
> | ![动画末帧遮住场景](before-dialog.png) | ![山神庙与跪拜恢复](after-complete-dialog.png) |
>
> [演出结束仍在庙内的画面](after-complete-completed.png)。三个截图已由 Codex 查看；两个浏览器报告的 pageerror 均为空。
>
> ## 回归与独立反证
>
> - 初版 3 用例：[red.json.raw](red.json.raw)，两个普通 redraw 分支均在背景像素断言得到 173、期望 0；
>   结局保持通过。对应初版测试保存为 [red-test.ts.raw](red-test.ts.raw)，不混称最终 4 用例的执行集合。
> - 最终 [4 用例报告](final-regression.json.raw)：普通 redraw 的延时/淡入路径各一；已有正文/无正文的
>   RNG 保持路径各一，后续普通样式仍继承保持。实际 interpreter 与 present 执行，替身仅控制媒体 IO 完成。
> - [隔离反控回执](guard-counter-report.json.raw)：4 绿 → 去掉 guard、无条件清理 → 恰无正文保持用例业务断言红 → 4 绿。
>   原生报告：[baseline](guard-baseline.json.raw)、[mutant](guard-mutant.json.raw)、[restored](guard-restored.json.raw)。
>   执行集合一致，命令/cwd/exit/signal/源与测试 hash 完整；原工作树 hash 未变，临时树已精确删除。
>   [运行器原件](check-guard.py.raw)保留唯一变更针，非正式产品工具。
> - 既有求雨普通对话保持合同由 `event-system.test.ts` 保留，不再复制相同用例。
>
> ## 质量与范围
>
> - 最终整包：[原生 JSON 压缩原件](game-final.json.gz)，312 文件 / **3523 测试通过**，0 失败/跳过；
>   解压即 Vitest 原始报告。第一轮 [3522 项记录](game-suite.log.gz)对应补 guard 用例前，保留原始计数。
> - [typecheck](typecheck.log.gz) 通过；[lint](lint.log.raw) 3995 文件、0 error / warning / info。
> - [额外生产 build](build.log.gz)成功；649.68 kB 主包触发一条 >500 kB 的体积提示。
>   原始提示如实保留。用户授权发布后静态拆分音频依赖，主包381.03 kB/audio268.03 kB，
>   [最终 build](build-split.log.raw)零告警，默认阈值保持。
> - 未改第二阶段、生成资产和部署脚本；未发送 issue 回复。覆盖率由官方 ratchet 和严格 CI 实测；已发布生产，初次失败保留在历史回执中。
> - 原始 20 个 PlayRNG caller 的独立静态核验支持当前窄修。普通 RNG 背景对话之后再 redraw 的合成序列
>   仍涉及现有双重保持语义，不纳入本次“进入对话前 redraw”的修复承诺。
>
> ## 发布前生产包检查
>
> - [发布前核对](deploy-preflight.json.raw)：版权声明提交 `fd2c64522` 已在祖先链；线上资源清单和本地字节一致，
>   仅发布 app。独立审查另核线上 SW、worklet、soundfont 均与当前 public 字节相同。
> - [拆包后实跑](preview-split-smoke.json.raw)：页面无未捕获异常，点击进入后正常客栈画面、MIDI 有非零输出。
>   [游戏画面](preview-game.png)、[667×375 版权声明](preview-loading-small.png)均已看图；隐私提示在临时测试 profile 中选择拒绝。
> - 额外离线缓存诊断未通过：[拆包前单包对照](preview-single-baseline-smoke.json.raw)同样没有 `/assets/`
>   缓存条目、离线 fetch 失败。两个生产包使用同一 SW 与测试流程，说明不是新增 audio chunk 的特有回归。
>   [诊断脚本](preview-cache-diagnostic.mjs.raw)和失败原件保留；不把启动/音频通过混称离线通过。
>   既有 SW 资源缓存问题不在本次 RNG 修复范围内，尚未修复；离线冷启动原本也不受支持。
>
> ## 全仓门与 CI 历史回执
>
> - [本地门汇总](local-gates.json.raw)：七包 20229 项；初次整仓命令并非 exit 0。
>   [默认并发失败](check-all.log.gz)、[限制并发复跑](check-all-bounded.log.gz)原件保留。
>   提取器 10 项 CLI 超时在复跑中通过；编辑器 AST 审计单项[原生复核](adoption-recheck.json.raw)
>   11.58s 通过，同一 15s 门限。
> - [迁移包检查](migrate-check.log.gz)738/739 通过、一项 120s 超时；
>   [同一合同隔离复核](migrate-recheck.json.raw)61.18s 通过，未改超时或断言。
>   汇总代表各包执行与精确复核，不代表对全部 20229 项测试合同重新做语义审计。
> - [首轮 CI 失败](ci-first-failure.log.gz)：新测试 tracked 后账本计数差 1；已同步机器总数/待核数，
>   保持 verified 229 不变，[质量工具复核](quality-ledger-recheck.log.gz)37/37。
> - [第二轮 CI 失败](ci-second-failure.log.gz)：源码 `5116cd5b`，19820 项 fast 执行通过、指标无下降；
>   严格门正确拒绝未登记的 game 新增 4 用例及执行 digest。后续必须官方 ratchet 和严格 CI 闭合。
>   [CI 原生汇总](ci-second-summary.json.gz)与[只读比对](ci-second-analysis.json.raw)：
>   范围仅新增 1 测试文件/4 项及 game execution digest，无移除，6 项指标提升。
> - [官方 ratchet 原生日志](coverage-ratchet.log.gz)及[原生汇总](coverage-ratchet-summary.json.gz)：
>   19820 项/731 生产文件，exit 0；与 GitHub 原生实测所有整数一致。基线更新后仍须严格 CI 放行。
>
> ## 正式发布回执
>
> - [GitHub CI 原生回执](ci-release.json.raw)：发布源码的文档与 Coverage ratchet 均 success。
> - 归档提交前[文档门](docs-release-closeout.log.gz)通过，[lint](lint-release-closeout.log.gz)3995 文件零诊断。
> - [部署日志](deploy.log.gz)：沿用现有 app 发布流程，旧应用保留供回退；没有重同步未变化的原版资源。
> - [远端文件核对](remote-verification.json.raw)和[远端原始清单](remote-manifest.json.raw)：全部应用文件与本地构建一致。
> - macOS tar 的 10 个 AppleDouble 附带文件导致[首次清单比对不一致](remote-verification-before-cleanup.json.raw)；
>   [首次原始清单](remote-manifest-before-cleanup.json.raw)和[精确清理回执](remote-metadata-cleanup.json.raw)保留。
>   最终 8 项一致，[旧版与 extracted 链接核对](remote-rollback.log.gz)通过；原始 tar 提示未隐藏。
> - [HTTPS 核对](online-verification.json.raw)：首页、SW、主包、音频包逐字节一致；版权声明存在。
> - [真实线上 Chrome](production-smoke.json.raw)：在线启动、游戏画面、MIDI 非零输出通过；页面异常和在线请求失败为 0。
>   已查看[桌面加载页](production-loading.png)、[小屏版权声明](production-loading-small.png)、[游戏画面](production-game.png)。
> - [浏览器运行器](production-smoke.mjs.raw)、[HTTPS 核对脚本](verify-online.py.raw)、[远端清单脚本](remote-manifest.py.raw)留原件。
>   线上普通离线 fetch 成功，但 JS 的 CacheStorage 条目仍为空（数据条目 601 项、存储可用）；
>   不据此宣称 SW 脚本缓存已修复。本地拆包前后对照的离线失败记录仍保留，冷启动未验证。
>
<!-- original-source-quote:end -->
